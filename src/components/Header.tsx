'use client';

import { useStore } from '@/store/useStore';
import { useEffect, useRef } from 'react';
import * as Tone from 'tone';
import JSZip from 'jszip';

export function Header() {
  const settings = useStore((state) => state.settings);
  const updateSettings = useStore((state) => state.updateSettings);
  const recordingState = useStore((state) => state.recordingState);
  const setRecordingState = useStore((state) => state.setRecordingState);
  const setRecordingData = useStore((state) => state.setRecordingData);
  const cells = useStore((state) => state.cells);

  const recorderRef = useRef<Tone.Recorder | null>(null);

  const keys = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const keyIndex = keys.indexOf(settings.key.split(' ')[0]);
  const isMinor = settings.key.includes('minor');

  // Disable loop length controls after any sound has been generated
  const anySoundsGenerated = cells.some(cell => cell.state === 'ready');

  const incrementLoopLength = () => {
    const lengths = [1, 2, 4, 8, 16];
    const currentIndex = lengths.indexOf(settings.loopLength);
    if (currentIndex < lengths.length - 1) {
      updateSettings({ loopLength: lengths[currentIndex + 1] });
    }
  };

  const decrementLoopLength = () => {
    const lengths = [1, 2, 4, 8, 16];
    const currentIndex = lengths.indexOf(settings.loopLength);
    if (currentIndex > 0) {
      updateSettings({ loopLength: lengths[currentIndex - 1] });
    }
  };

  const incrementBpm = () => {
    if (settings.bpm < 300) {
      updateSettings({ bpm: settings.bpm + 1 });
    }
  };

  const decrementBpm = () => {
    if (settings.bpm > 60) {
      updateSettings({ bpm: settings.bpm - 1 });
    }
  };

  const incrementKey = () => {
    const nextIndex = (keyIndex + 1) % keys.length;
    updateSettings({ key: isMinor ? `${keys[nextIndex]} minor` : keys[nextIndex] });
  };

  const decrementKey = () => {
    const prevIndex = (keyIndex - 1 + keys.length) % keys.length;
    updateSettings({ key: isMinor ? `${keys[prevIndex]} minor` : keys[prevIndex] });
  };

  const setMajor = () => {
    updateSettings({ key: keys[keyIndex] });
  };

  const setMinor = () => {
    updateSettings({ key: `${keys[keyIndex]} minor` });
  };

  const toggleMuteAll = () => {
    updateSettings({ muteAll: !settings.muteAll });
  };

  const handleRecord = async () => {
    if (recordingState !== 'idle') return;

    try {
      // Initialize Tone.js if not started
      if (Tone.Transport.state !== 'started') {
        await Tone.start();
        Tone.Transport.start();
      }

      // Set up recorder
      const recorder = new Tone.Recorder();
      Tone.getDestination().connect(recorder);
      recorderRef.current = recorder;

      // Calculate loop duration in seconds
      const beatsPerBar = 4;
      const totalBeats = settings.loopLength * beatsPerBar;
      const secondsPerBeat = 60 / settings.bpm;
      const loopDuration = totalBeats * secondsPerBeat;
      const recordDuration = loopDuration * 2; // Record 2 loops

      // Wait for the start of the next loop
      setRecordingState('waiting');

      // Calculate time until next loop start
      const currentPosition = Tone.Transport.seconds;
      const timeIntoLoop = currentPosition % loopDuration;
      const timeUntilNextLoop = loopDuration - timeIntoLoop;

      setTimeout(async () => {
        // Start recording at the beginning of the loop
        setRecordingState('recording');
        recorder.start();

        // Stop recording after 2 loops
        setTimeout(async () => {
          setRecordingState('processing');

          // Stop recording
          const recording = await recorder.stop();

          // Create zip file (for download option later)
          const zip = new JSZip();
          zip.file('performance.webm', recording);

          // Add all generated sound files
          const soundsFolder = zip.folder('sounds');
          if (soundsFolder) {
            for (const cell of cells) {
              if (cell.state === 'ready' && cell.audioUrl && cell.category) {
                try {
                  const response = await fetch(cell.audioUrl);
                  const blob = await response.blob();
                  const filename = `cell_${cell.id}_${cell.category}.mp3`;
                  soundsFolder.file(filename, blob);
                } catch (error) {
                  console.error(`Failed to add cell ${cell.id} to zip:`, error);
                }
              }
            }
          }

          const zipBlob = await zip.generateAsync({ type: 'blob' });

          // Capture all 9 cell snapshots
          const snapshots: (string | null)[] = cells.map((cell) => cell.snapshot || null);

          // Store recording data in Zustand
          setRecordingData({
            recordingBlob: recording,
            snapshots,
            zipBlob,
          });

          // Set state to 'ready' which will open the RecordingActionsModal
          setRecordingState('ready');

          // Clean up recorder
          recorder.dispose();
          recorderRef.current = null;
        }, recordDuration * 1000);
      }, timeUntilNextLoop * 1000);
    } catch (error) {
      console.error('Recording failed:', error);
      setRecordingState('idle');
    }
  };

  return (
    <header className="bg-thingbeat-blue border-b-2 border-thingbeat-white p-2">
      <div className="flex items-center justify-between gap-6">
        {/* Left Section */}
        <div className="flex items-center gap-6">
          {/* Logo */}
          <div className="bg-thingbeat-white px-2 py-2.5">
            <h1 className="text-[32px] font-bold text-thingbeat-blue leading-none">Thingbeat</h1>
          </div>

          {/* Loop Length Control */}
          <div className="flex items-center gap-4 p-2">
            <div className="flex items-center gap-4">
              <button
                onClick={decrementLoopLength}
                disabled={anySoundsGenerated}
                className="w-6 h-6 border-2 border-thingbeat-white flex items-center justify-center text-thingbeat-white hover:bg-thingbeat-white hover:text-thingbeat-blue disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-thingbeat-white"
                title={anySoundsGenerated ? "Cannot change bars after generating sounds" : "Decrease bars"}
              >
                <span className="text-sm leading-none">-</span>
              </button>
              <span className="text-[20px] text-thingbeat-white w-4 text-center">{settings.loopLength}</span>
              <button
                onClick={incrementLoopLength}
                disabled={anySoundsGenerated}
                className="w-6 h-6 border-2 border-thingbeat-white flex items-center justify-center text-thingbeat-white hover:bg-thingbeat-white hover:text-thingbeat-blue disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-thingbeat-white"
                title={anySoundsGenerated ? "Cannot change bars after generating sounds" : "Increase bars"}
              >
                <span className="text-sm leading-none">+</span>
              </button>
            </div>
            <span className="text-sm text-thingbeat-white">Bars</span>
          </div>

          {/* BPM Control */}
          <div className="flex items-center gap-4 p-2">
            <div className="flex items-center gap-4">
              <button
                onClick={decrementBpm}
                className="w-6 h-6 border-2 border-thingbeat-white flex items-center justify-center text-thingbeat-white hover:bg-thingbeat-white hover:text-thingbeat-blue"
              >
                <span className="text-sm leading-none">-</span>
              </button>
              <span className="text-[20px] text-thingbeat-white min-w-[43px] text-center">{settings.bpm}</span>
              <button
                onClick={incrementBpm}
                className="w-6 h-6 border-2 border-thingbeat-white flex items-center justify-center text-thingbeat-white hover:bg-thingbeat-white hover:text-thingbeat-blue"
              >
                <span className="text-sm leading-none">+</span>
              </button>
            </div>
            <span className="text-sm text-thingbeat-white">BPM</span>
          </div>

          {/* Key Control */}
          <div className="flex items-center gap-2 p-2">
            <div className="flex items-center gap-4">
              <button
                onClick={decrementKey}
                disabled={anySoundsGenerated}
                className="w-6 h-6 border-2 border-thingbeat-white flex items-center justify-center text-thingbeat-white hover:bg-thingbeat-white hover:text-thingbeat-blue disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-thingbeat-white"
                title={anySoundsGenerated ? "Cannot change key after generating sounds" : "Decrease key"}
              >
                <span className="text-sm leading-none">-</span>
              </button>
              <span className="text-[20px] text-thingbeat-white w-4 text-center">{keys[keyIndex]}</span>
              <button
                onClick={incrementKey}
                disabled={anySoundsGenerated}
                className="w-6 h-6 border-2 border-thingbeat-white flex items-center justify-center text-thingbeat-white hover:bg-thingbeat-white hover:text-thingbeat-blue disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-thingbeat-white"
                title={anySoundsGenerated ? "Cannot change key after generating sounds" : "Increase key"}
              >
                <span className="text-sm leading-none">+</span>
              </button>
            </div>
            <div className="flex">
              <button
                onClick={setMajor}
                disabled={anySoundsGenerated}
                className={`px-1 h-6 text-sm ${
                  !isMinor
                    ? 'bg-thingbeat-white text-thingbeat-blue'
                    : 'bg-thingbeat-blue text-thingbeat-white border-2 border-thingbeat-white'
                } disabled:opacity-30 disabled:cursor-not-allowed`}
                title={anySoundsGenerated ? "Cannot change key after generating sounds" : "Set to major key"}
              >
                Major
              </button>
              <button
                onClick={setMinor}
                disabled={anySoundsGenerated}
                className={`px-1 h-6 text-sm hover:border-3 ${
                  isMinor
                    ? 'bg-thingbeat-white text-thingbeat-blue'
                    : 'bg-thingbeat-blue text-thingbeat-white border-2 border-thingbeat-white'
                } disabled:opacity-30 disabled:cursor-not-allowed`}
                title={anySoundsGenerated ? "Cannot change key after generating sounds" : "Set to minor key"}
              >
                Minor
              </button>
            </div>
          </div>

          {/* Mute Button */}
          <button
            onClick={toggleMuteAll}
            className="w-12 h-12 border-2 border-thingbeat-white flex items-center justify-center hover:border-4"
            title={settings.muteAll ? 'Unmute All' : 'Mute All'}
          >
            <img
              src={settings.muteAll ? '/icons/muted.svg' : '/icons/volume.svg'}
              alt={settings.muteAll ? 'Muted' : 'Volume'}
              className="w-20 h-20"
            />
          </button>
        </div>

        {/* Record Button */}
        <button
          className="px-4 h-12 text-lg border-2 border-thingbeat-white bg-thingbeat-blue text-thingbeat-white hover:bg-thingbeat-white hover:text-thingbeat-blue disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={handleRecord}
          disabled={recordingState !== 'idle'}
        >
          {recordingState === 'idle' && 'Record'}
          {recordingState === 'waiting' && 'Waiting to record...'}
          {recordingState === 'recording' && 'Recording...'}
          {recordingState === 'processing' && 'Processing...'}
          {recordingState === 'ready' && 'Record'}
        </button>
      </div>
    </header>
  );
}
