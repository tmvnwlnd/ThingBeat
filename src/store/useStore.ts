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
};

type GlobalSettings = {
  bpm: number;
  key: string;
  loopLength: number; // in bars
  muteAll: boolean;
  synthMonophonic: boolean; // true = monophonic, false = polyphonic
};

export type ExportState = 'idle' | 'waiting' | 'recording' | 'processing';

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

  // Export state
  exportState: ExportState;
  setExportState: (state: ExportState) => void;
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
});

export const useStore = create<Store>((set) => ({
  // Global settings
  settings: {
    bpm: 120,
    key: 'C',
    loopLength: 4,
    muteAll: false,
    synthMonophonic: false,
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
}));
