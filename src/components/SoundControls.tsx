'use client';

import { useEffect, useRef, useState } from 'react';
import { SoundCategory } from '@/lib/prompt';
import { useStore } from '@/store/useStore';
import * as Tone from 'tone';
import WaveSurfer from 'wavesurfer.js';
import { VolumeSlider } from './VolumeSlider';
import { SynthKeyboard } from './SynthKeyboard';
import { startKeepAlive } from '@/lib/audioInit';
import { dataUrlToAudioBuffer, quantizeAudioBuffer } from '@/lib/audioQuantize';

type SoundControlsProps = {
  cellId: number;
  category: SoundCategory;
  audioUrl: string;
  snapshot: string;
  volume: number;
  onDelete: () => void;
};

const CATEGORY_LABELS: Record<SoundCategory, string> = {
  drum_loop: 'Drum Loop',
  drum_one_shot: 'Drum Sample',
  synth_timbre: 'Synth',
  texture: 'Texture',
  lead_line: 'Melody',
};

// Speed multipliers for drum loop
const SPEED_MULTIPLIERS = [1, 1.5, 2, 3, 4];

// Keyboard mapping for drum one-shots (Q-O keys for cells 0-8)
const DRUM_KEYS = ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O'];

// Keyboard mapping for synth (13 keys = 1 octave)
// Maps keyboard key to semitone offset from root note
const SYNTH_KEY_MAP: Record<string, number> = {
  'z': 0,  // C
  's': 1,  // C#
  'x': 2,  // D
  'd': 3,  // D#
  'c': 4,  // E
  'v': 5,  // F
  'g': 6,  // F#
  'b': 7,  // G
  'h': 8,  // G#
  'n': 9,  // A
  'j': 10, // A#
  'm': 11, // B
  ',': 12, // C (octave)
};

export function SoundControls({
  cellId,
  category,
  audioUrl,
  snapshot,
  volume,
  onDelete,
}: SoundControlsProps) {
  const playerRef = useRef<Tone.Player | null>(null);
  const volumeButtonRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<() => void>();
  const waveformRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const synthPlayersRef = useRef<Map<number, Tone.Player>>(new Map());
  const [isPlaying, setIsPlaying] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [buttonRect, setButtonRect] = useState<DOMRect | null>(null);
  const [speedIndex, setSpeedIndex] = useState(0);
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const [isFlashing, setIsFlashing] = useState(false);
  const [pressedSynthKeys, setPressedSynthKeys] = useState<Set<string>>(new Set());
  const updateCell = useStore((state) => state.updateCell);
  const muteAll = useStore((state) => state.settings.muteAll);
  const settings = useStore((state) => state.settings);
  const cell = useStore((state) => state.cells.find(c => c.id === cellId));

  // Determine if this category should auto-loop
  const shouldLoop = category === 'drum_loop' || category === 'texture' || category === 'lead_line';

  // Calculate BPM playback rate adjustment for rhythm-based categories
  const calculateBPMPlaybackRate = (): number => {
    if (!cell?.originalBPM) return 1.0;
    if (category !== 'drum_loop' && category !== 'lead_line') return 1.0;
    return settings.bpm / cell.originalBPM;
  };

  // Calculate key transposition (semitone shift) using closest path
  const calculateKeyTransposition = (): number => {
    if (!cell?.originalKey) return 0;
    if (category !== 'lead_line' && category !== 'synth_timbre') return 0;

    const keys = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

    // Extract root notes (ignore major/minor)
    const originalRoot = cell.originalKey.split(' ')[0];
    const currentRoot = settings.key.split(' ')[0];

    const originalIndex = keys.indexOf(originalRoot);
    const currentIndex = keys.indexOf(currentRoot);

    if (originalIndex === -1 || currentIndex === -1) return 0;

    // Calculate semitone difference
    let semitones = currentIndex - originalIndex;

    // Find closest path (up or down)
    if (semitones > 6) {
      semitones -= 12; // Go down instead
    } else if (semitones < -6) {
      semitones += 12; // Go up instead
    }

    return semitones;
  };

  const bpmPlaybackRate = calculateBPMPlaybackRate();
  const keyTranspositionSemitones = calculateKeyTransposition();

  // Initialize Tone.js Player
  useEffect(() => {
    if (!audioUrl) return;

    let disposed = false;

    // Determine if we need to quantize (drum_loop and lead_line need exact grid timing)
    const needsQuantization = category === 'drum_loop' || category === 'lead_line';

    // Calculate target duration for quantization
    const targetDuration = needsQuantization && cell?.originalBPM && settings.loopLength
      ? (settings.loopLength * 4 * 60) / cell.originalBPM
      : null;

    // Load and potentially quantize audio
    const loadAudio = async () => {
      // Quantize if needed
      if (needsQuantization && targetDuration) {
        try {
          console.log(`🎯 Quantizing ${category} to ${targetDuration.toFixed(3)}s...`);

          // Convert data URL to AudioBuffer
          const audioBuffer = await dataUrlToAudioBuffer(audioUrl);
          console.log(`📥 Original duration: ${audioBuffer.duration.toFixed(3)}s`);

          // Quantize: remove leading silence, trim/pad to exact duration
          const quantizedBuffer = quantizeAudioBuffer(audioBuffer, targetDuration, true);

          // Check if component was unmounted during async operation
          if (disposed) return;

          // Convert AudioBuffer to Tone.js ToneAudioBuffer
          const toneBuffer = new Tone.ToneAudioBuffer(quantizedBuffer);

          // For rhythmic categories with quantization (drum_loop and lead_line only)
          // Include speed multiplier for drum loops
          const speedMultiplier = category === 'drum_loop' ? SPEED_MULTIPLIERS[speedIndex] : 1;
          const combinedPlaybackRate = bpmPlaybackRate * Math.pow(2, keyTranspositionSemitones / 12) * speedMultiplier;

          const player = new Tone.Player({
            loop: shouldLoop,
            volume: Tone.gainToDb(volume),
            playbackRate: combinedPlaybackRate,
            mute: muteAll,
          }).toDestination();

          player.buffer = toneBuffer;
          playerRef.current = player;

          console.log(`✅ Quantized audio loaded for cell ${cellId}`);
          setAudioDuration(toneBuffer.duration);
          startKeepAlive();

          // Auto-start playback for looping categories (sync to Transport)
          if (shouldLoop) {
            // Calculate loop duration in seconds
            const loopDurationSeconds = (settings.loopLength * 4 * 60) / settings.bpm;

            // Schedule to start at the next bar boundary
            const now = Tone.Transport.seconds;
            const timeIntoLoop = now % loopDurationSeconds;
            const timeUntilNextBar = loopDurationSeconds - timeIntoLoop;

            // Start at next bar
            player.start(`+${timeUntilNextBar}`);
            setIsPlaying(true);
          }

          return; // Don't fall through to non-quantized path

        } catch (error) {
          console.error('❌ Quantization failed, falling back to original audio:', error);
          if (disposed) return;
          // Fall through to use original audio URL
        }
      }

      // Check if component was unmounted
      if (disposed) return;

      // For non-quantized categories OR if quantization failed, use original URL
      // For synth, create 13 players (one for each semitone)
      if (category === 'synth_timbre') {
        Object.values(SYNTH_KEY_MAP).forEach((semitone) => {
          const totalSemitones = semitone + keyTranspositionSemitones;
          const player = new Tone.Player({
            url: audioUrl,
            loop: false,
            volume: Tone.gainToDb(volume),
            playbackRate: Math.pow(2, totalSemitones / 12),
            mute: muteAll,
            onload: () => {
              if (semitone === 0) {
                console.log(`✅ Synth audio loaded for cell ${cellId}`);
                setAudioDuration(player.buffer.duration);
                startKeepAlive();
              }
            },
          }).toDestination();

          synthPlayersRef.current.set(semitone, player);
        });

        return;
      }

      // For other categories, use single player
      // Include speed multiplier for drum loops
      const speedMultiplier = category === 'drum_loop' ? SPEED_MULTIPLIERS[speedIndex] : 1;
      const combinedPlaybackRate = bpmPlaybackRate * Math.pow(2, keyTranspositionSemitones / 12) * speedMultiplier;

      const player = new Tone.Player({
        url: audioUrl,
        loop: shouldLoop,
        volume: Tone.gainToDb(volume),
        playbackRate: combinedPlaybackRate,
        mute: muteAll,
        onload: () => {
          console.log(`✅ Audio loaded for cell ${cellId}`);
          setAudioDuration(player.buffer.duration);
          startKeepAlive();

          // Auto-start playback for looping categories (sync to Transport)
          if (shouldLoop) {
            // Calculate loop duration in seconds
            const loopDurationSeconds = (settings.loopLength * 4 * 60) / settings.bpm;

            // Schedule to start at the next bar boundary
            const now = Tone.Transport.seconds;
            const timeIntoLoop = now % loopDurationSeconds;
            const timeUntilNextBar = loopDurationSeconds - timeIntoLoop;

            // Start at next bar
            player.start(`+${timeUntilNextBar}`);
            setIsPlaying(true);
          }
        },
      }).toDestination();

      playerRef.current = player;
    };

    loadAudio();

    return () => {
      disposed = true;

      if (category === 'synth_timbre') {
        synthPlayersRef.current.forEach((player) => {
          player.stop();
          player.dispose();
        });
        synthPlayersRef.current.clear();
      } else if (playerRef.current) {
        playerRef.current.stop();
        playerRef.current.dispose();
        playerRef.current = null;
      }
    };
  }, [audioUrl, cellId, shouldLoop, category, bpmPlaybackRate, keyTranspositionSemitones, cell?.originalBPM, settings.loopLength, settings.bpm]);

  // Update volume
  useEffect(() => {
    if (category === 'synth_timbre') {
      synthPlayersRef.current.forEach((player) => {
        player.volume.value = Tone.gainToDb(volume);
      });
    } else if (playerRef.current) {
      playerRef.current.volume.value = Tone.gainToDb(volume);
    }
  }, [volume, category]);

  // Update global mute - instant, no stopping/restarting
  useEffect(() => {
    if (category === 'synth_timbre') {
      synthPlayersRef.current.forEach((player) => {
        player.mute = muteAll;
      });
    } else if (playerRef.current) {
      playerRef.current.mute = muteAll;
    }
  }, [muteAll, category]);

  // Initialize WaveSurfer for waveform visualization
  useEffect(() => {
    if (!waveformRef.current || !audioUrl) return;

    const wavesurfer = WaveSurfer.create({
      container: waveformRef.current,
      waveColor: '#FFFFFF',
      progressColor: '#FFFFFF',
      cursorWidth: 0,
      barWidth: 2,
      barGap: 4,
      barRadius: 0,
      height: 22,
      barHeight: 1, // This will be scaled by normalize
      normalize: true,
      interact: false,
      hideScrollbar: true,
      minPxPerSec: 1,
    });

    wavesurfer.load(audioUrl);

    wavesurferRef.current = wavesurfer;

    return () => {
      wavesurfer.destroy();
    };
  }, [audioUrl]);

  // Update playback speed for drum loop at next bar boundary
  useEffect(() => {
    if (!playerRef.current || category !== 'drum_loop') return;

    // Calculate when the next bar starts
    const loopDurationSeconds = (settings.loopLength * 4 * 60) / settings.bpm;
    const now = Tone.Transport.seconds;
    const timeIntoLoop = now % loopDurationSeconds;
    const timeUntilNextBar = loopDurationSeconds - timeIntoLoop;

    // Schedule speed change at next bar
    const timeoutId = setTimeout(() => {
      if (playerRef.current) {
        const newPlaybackRate = SPEED_MULTIPLIERS[speedIndex] * bpmPlaybackRate * Math.pow(2, keyTranspositionSemitones / 12);
        playerRef.current.playbackRate = newPlaybackRate;
      }
    }, timeUntilNextBar * 1000);

    return () => clearTimeout(timeoutId);
  }, [speedIndex, category, settings.loopLength, settings.bpm, bpmPlaybackRate, keyTranspositionSemitones]);

  // Keyboard trigger for drum one-shots
  useEffect(() => {
    if (category !== 'drum_one_shot') return;

    const assignedKey = DRUM_KEYS[cellId];
    if (!assignedKey) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input field
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key.toUpperCase() === assignedKey) {
        triggerRef.current?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [category, cellId]);

  // Keyboard trigger for synth
  useEffect(() => {
    if (category !== 'synth_timbre') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input field
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const key = e.key.toLowerCase();
      const semitone = SYNTH_KEY_MAP[key];

      if (semitone !== undefined) {
        // Prevent key repeat
        if (e.repeat) return;

        // Play the note IMMEDIATELY (AudioContext pre-initialized on first interaction)
        const player = synthPlayersRef.current.get(semitone);
        if (player) {
          player.start();
        }

        // Update visual feedback AFTER audio starts (reduces latency)
        requestAnimationFrame(() => {
          setPressedSynthKeys(prev => new Set(prev).add(key));
        });
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const semitone = SYNTH_KEY_MAP[key];

      if (semitone !== undefined) {
        // Remove from pressed keys for visual feedback
        setPressedSynthKeys(prev => {
          const newSet = new Set(prev);
          newSet.delete(key);
          return newSet;
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [category]);

  const handleVolumeChange = (newVolume: number) => {
    updateCell(cellId, { volume: newVolume });
  };

  const handleSpeedCycle = () => {
    setSpeedIndex((prev) => (prev + 1) % SPEED_MULTIPLIERS.length);
  };

  const handleTrigger = () => {
    if (!playerRef.current) return;

    // Start audio IMMEDIATELY (AudioContext pre-initialized on first interaction)
    playerRef.current.start();

    // Update visual feedback AFTER audio starts (reduces latency)
    requestAnimationFrame(() => {
      setIsFlashing(true);
      setTimeout(() => setIsFlashing(false), 100); // 0.1s flash
    });
  };

  // Store trigger function in ref for keyboard listener
  useEffect(() => {
    triggerRef.current = handleTrigger;
  });

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full h-full bg-thingbeat-blue flex flex-col relative border-2 border-white">
      {/* Snapshot background */}
      <div className="absolute inset-0 pointer-events-none">
        <img src={snapshot} alt="Snapshot" className="w-full h-full object-cover" />
      </div>

      {/* Flash overlay for drum one-shot triggers */}
      {isFlashing && (
        <div className="absolute inset-0 bg-white pointer-events-none z-10" />
      )}

      {/* Bottom control bar */}
      <div className="absolute bottom-0 left-0 right-0 flex gap-[8px] items-center justify-end p-[8px]">
        {/* Speed button for drum_loop */}
        {category === 'drum_loop' && (
          <button
            onClick={handleSpeedCycle}
            className="w-[48px] h-[48px] bg-thingbeat-blue border-2 border-white flex items-center justify-center text-white text-[24px] font-silkscreen hover:bg-white hover:text-thingbeat-blue transition-colors shrink-0"
          >
            {SPEED_MULTIPLIERS[speedIndex]}×
          </button>
        )}

        {/* Trigger button for drum_one_shot */}
        {category === 'drum_one_shot' && (
          <button
            onClick={handleTrigger}
            className="w-[48px] h-[48px] bg-thingbeat-blue border-2 border-white flex items-center justify-center text-white text-[24px] font-silkscreen hover:bg-white hover:text-thingbeat-blue shrink-0"
          >
            {DRUM_KEYS[cellId]}
          </button>
        )}

        {/* Synth keyboard */}
        {category === 'synth_timbre' && (
          <SynthKeyboard pressedKeys={pressedSynthKeys} />
        )}

        {/* Middle section: label + waveform */}
        <div className="flex-1 bg-thingbeat-blue border-2 border-white h-[48px] flex flex-col gap-[2px] justify-center p-[8px] min-w-0">
          {/* Label row */}
          <div className="flex items-center justify-between w-full">
            <span className="text-white text-[14px] font-silkscreen uppercase">
              {CATEGORY_LABELS[category]}
            </span>
            {category === 'drum_one_shot' && audioDuration > 0 && (
              <span className="text-white text-[14px] font-silkscreen">
                {formatDuration(audioDuration)}
              </span>
            )}
          </div>

          {/* Waveform */}
          <div ref={waveformRef} className="h-[22px] w-full px-[4px]" />
        </div>

        {/* Volume button */}
        <div className="relative shrink-0">
          <button
            ref={volumeButtonRef}
            onClick={() => {
              const rect = volumeButtonRef.current?.getBoundingClientRect() || null;
              setButtonRect(rect);
              setShowVolumeSlider(!showVolumeSlider);
            }}
            className="w-[48px] h-[48px] bg-thingbeat-blue border-2 border-white flex items-center justify-center hover:border-4 group"
          >
            <img
              src={volume === 0 ? "/icons/muted.svg" : "/icons/volume.svg"}
              alt={volume === 0 ? "Muted" : "Volume"}
              className="w-20 h-20"
            />
          </button>

          {showVolumeSlider && (
            <VolumeSlider
              volume={volume}
              onChange={handleVolumeChange}
              onClose={() => setShowVolumeSlider(false)}
              buttonRect={buttonRect}
            />
          )}
        </div>

        {/* Delete button */}
        <button
          onClick={onDelete}
          className="w-[48px] h-[48px] bg-thingbeat-blue border-2 border-white flex items-center justify-center hover:border-4 group shrink-0"
        >
          <img
            src="/icons/delete.svg"
            alt="Delete"
            className="w-20 h-20"
          />
        </button>
      </div>
    </div>
  );
}
