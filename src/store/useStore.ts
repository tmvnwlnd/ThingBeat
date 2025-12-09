import { create } from 'zustand';
import { SoundCategory } from '@/lib/prompt';

export type CellState = 'idle' | 'loading' | 'ready' | 'error';

export type CellData = {
  id: number;
  state: CellState;
  category: SoundCategory | null;
  snapshot: string | null; // base64 image data
  audioUrl: string | null;
  llmDescriptor: string | null;
  volume: number; // 0-1
  error: string | null;
  originalBPM: number | null; // BPM when sound was generated (for playback rate adjustment)
  originalKey: string | null; // Key when sound was generated (for transposition)
};

type GlobalSettings = {
  bpm: number;
  key: string;
  loopLength: number; // in bars
  muteAll: boolean;
};

export type ExportState = 'idle' | 'waiting' | 'recording' | 'processing';

export type RecordingState = 'idle' | 'waiting' | 'recording' | 'processing' | 'ready';

export type RecordingData = {
  recordingBlob: Blob | null;
  snapshots: (string | null)[]; // 9 cell snapshots (base64)
  zipBlob: Blob | null; // For download option
};

type Store = {
  // Global settings
  settings: GlobalSettings;
  updateSettings: (settings: Partial<GlobalSettings>) => void;

  // Cells (0-8 for 3x3 grid)
  cells: CellData[];
  updateCell: (id: number, data: Partial<CellData>) => void;
  resetCell: (id: number) => void;

  // Generation state
  isGenerating: boolean;
  setIsGenerating: (value: boolean) => void;

  // Synth constraint
  hasSynth: boolean;
  setHasSynth: (value: boolean) => void;

  // Video stream
  videoStream: MediaStream | null;
  setVideoStream: (stream: MediaStream | null) => void;

  // Export state (legacy - keeping for backward compatibility)
  exportState: ExportState;
  setExportState: (state: ExportState) => void;

  // Recording state (new - for Record button with modal flow)
  recordingState: RecordingState;
  setRecordingState: (state: RecordingState) => void;
  recordingData: RecordingData;
  setRecordingData: (data: Partial<RecordingData>) => void;
  clearRecordingData: () => void;
};

const initialCell = (id: number): CellData => ({
  id,
  state: 'idle',
  category: null,
  snapshot: null,
  audioUrl: null,
  llmDescriptor: null,
  volume: 0.8,
  error: null,
  originalBPM: null,
  originalKey: null,
});

export const useStore = create<Store>((set) => ({
  // Global settings
  settings: {
    bpm: 120,
    key: 'C',
    loopLength: 4,
    muteAll: false,
  },
  updateSettings: (newSettings) =>
    set((state) => ({
      settings: { ...state.settings, ...newSettings },
    })),

  // Initialize 9 cells
  cells: Array.from({ length: 9 }, (_, i) => initialCell(i)),

  updateCell: (id, data) =>
    set((state) => ({
      cells: state.cells.map((cell) =>
        cell.id === id ? { ...cell, ...data } : cell
      ),
    })),

  resetCell: (id) =>
    set((state) => ({
      cells: state.cells.map((cell) =>
        cell.id === id ? initialCell(id) : cell
      ),
    })),

  // Generation state
  isGenerating: false,
  setIsGenerating: (value) => set({ isGenerating: value }),

  // Synth constraint
  hasSynth: false,
  setHasSynth: (value) => set({ hasSynth: value }),

  // Video stream
  videoStream: null,
  setVideoStream: (stream) => set({ videoStream: stream }),

  // Export state
  exportState: 'idle',
  setExportState: (state) => set({ exportState: state }),

  // Recording state (new)
  recordingState: 'idle',
  setRecordingState: (state) => set({ recordingState: state }),
  recordingData: {
    recordingBlob: null,
    snapshots: Array(9).fill(null),
    zipBlob: null,
  },
  setRecordingData: (data) =>
    set((state) => {
      const newRecordingData = { ...state.recordingData, ...data };

      // Save to localStorage (convert blobs to data URLs)
      if (typeof window !== 'undefined' && (data.recordingBlob || data.zipBlob)) {
        Promise.all([
          newRecordingData.recordingBlob ? blobToDataURL(newRecordingData.recordingBlob) : Promise.resolve(null),
          newRecordingData.zipBlob ? blobToDataURL(newRecordingData.zipBlob) : Promise.resolve(null),
        ]).then(([recordingDataURL, zipDataURL]) => {
          const dataToStore = {
            recordingDataURL,
            snapshots: newRecordingData.snapshots,
            zipDataURL,
          };
          localStorage.setItem('thingbeat_recording', JSON.stringify(dataToStore));
        }).catch(error => {
          console.error('Failed to save recording to localStorage:', error);
        });
      }

      return { recordingData: newRecordingData };
    }),
  clearRecordingData: () => {
    // Remove from localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('thingbeat_recording');
    }

    set({
      recordingData: {
        recordingBlob: null,
        snapshots: Array(9).fill(null),
        zipBlob: null,
      },
      recordingState: 'idle',
    });
  },
}));

// Helper function to convert Blob to data URL
function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Helper function to convert data URL to Blob
function dataURLToBlob(dataURL: string): Promise<Blob> {
  return fetch(dataURL).then(r => r.blob());
}

// Load recording data from localStorage on initialization
if (typeof window !== 'undefined') {
  const storedRecording = localStorage.getItem('thingbeat_recording');
  if (storedRecording) {
    try {
      const data = JSON.parse(storedRecording);

      // Convert data URLs back to blobs
      Promise.all([
        data.recordingDataURL ? dataURLToBlob(data.recordingDataURL) : null,
        data.zipDataURL ? dataURLToBlob(data.zipDataURL) : null,
      ]).then(([recordingBlob, zipBlob]) => {
        if (recordingBlob) {
          useStore.setState({
            recordingData: {
              recordingBlob,
              snapshots: data.snapshots || Array(9).fill(null),
              zipBlob,
            },
          });
        }
      }).catch(error => {
        console.error('Failed to restore recording from localStorage:', error);
        localStorage.removeItem('thingbeat_recording');
      });
    } catch (error) {
      console.error('Failed to parse stored recording:', error);
      localStorage.removeItem('thingbeat_recording');
    }
  }
}
