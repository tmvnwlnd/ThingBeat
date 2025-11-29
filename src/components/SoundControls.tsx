'use client';

import { useEffect, useRef, useState } from 'react';
import { SoundCategory } from '@/lib/prompt';
import { useStore } from '@/store/useStore';
import * as Tone from 'tone';
import WaveSurfer from 'wavesurfer.js';
import { VolumeSlider } from './VolumeSlider';
import { SynthKeyboard } from './SynthKeyboard';

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
  const currentNoteRef = useRef<{ player: Tone.Player; semitone: number } | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [buttonRect, setButtonRect] = useState<DOMRect | null>(null);
  const [speedIndex, setSpeedIndex] = useState(0);
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const [isFlashing, setIsFlashing] = useState(false);
  const [pressedSynthKeys, setPressedSynthKeys] = useState<Set<string>>(new Set());
  const updateCell = useStore((state) => state.updateCell);
  const muteAll = useStore((state) => state.settings.muteAll);
  const synthMonophonic = useStore((state) => state.settings.synthMonophonic);

  // Determine if this category should auto-loop
  const shouldLoop = category === 'drum_loop' || category === 'texture' || category === 'lead_line';

  // Initialize Tone.js Player
  useEffect(() => {
    if (!audioUrl) return;

    // For synth, create 13 players (one for each semitone)
    if (category === 'synth_timbre') {
      Object.values(SYNTH_KEY_MAP).forEach((semitone) => {
        const player = new Tone.Player({
          url: audioUrl,
          loop: false,
          volume: Tone.gainToDb(volume),
          playbackRate: Math.pow(2, semitone / 12), // Pitch shift formula
          onload: () => {
            if (semitone === 0) {
              console.log(`✅ Synth audio loaded for cell ${cellId}`);
              setAudioDuration(player.buffer.duration);
            }
          },
        }).toDestination();

        synthPlayersRef.current.set(semitone, player);
      });

      return () => {
        synthPlayersRef.current.forEach((player) => {
          player.stop();
          player.dispose();
        });
        synthPlayersRef.current.clear();
      };
    }

    // For other categories, use single player
    const player = new Tone.Player({
      url: audioUrl,
      loop: shouldLoop,
      volume: Tone.gainToDb(volume),
      onload: () => {
        console.log(`✅ Audio loaded for cell ${cellId}`);
        setAudioDuration(player.buffer.duration);

        // Auto-start playback for looping categories
        if (shouldLoop) {
          if (Tone.Transport.state !== 'started') {
            Tone.start().then(() => {
              Tone.Transport.start();
              player.start();
              setIsPlaying(true);
            });
          } else {
            player.start();
            setIsPlaying(true);
          }
        }
      },
    }).toDestination();

    playerRef.current = player;

    return () => {
      player.stop();
      player.dispose();
    };
  }, [audioUrl, cellId, shouldLoop, category, volume]);

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

  // Update global mute
  useEffect(() => {
    if (category === 'synth_timbre') {
      synthPlayersRef.current.forEach((player) => {
        player.mute = muteAll;
      });
    } else if (playerRef.current) {
      playerRef.current.mute = muteAll;
    }
  }, [muteAll, category]);

  // Handle synth mode changes (mono/poly switching)
  useEffect(() => {
    if (category !== 'synth_timbre') return;

    // When switching modes, stop all playing notes and reset state
    synthPlayersRef.current.forEach((player) => {
      player.stop();
    });
    currentNoteRef.current = null;
    setPressedSynthKeys(new Set());
  }, [synthMonophonic, category]);

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

  // Update playback speed for drum loop
  useEffect(() => {
    if (playerRef.current && category === 'drum_loop') {
      playerRef.current.playbackRate = SPEED_MULTIPLIERS[speedIndex];
    }
  }, [speedIndex, category]);

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

        // Add to pressed keys for visual feedback
        setPressedSynthKeys(prev => new Set(prev).add(key));

        // If monophonic mode, stop the currently playing note
        if (synthMonophonic && currentNoteRef.current) {
          currentNoteRef.current.player.stop();
        }

        // Play the note
        const player = synthPlayersRef.current.get(semitone);
        if (player) {
          if (Tone.Transport.state !== 'started') {
            Tone.start().then(() => {
              Tone.Transport.start();
              player.start();
              // Store reference for monophonic mode
              if (synthMonophonic) {
                currentNoteRef.current = { player, semitone };
              }
            });
          } else {
            player.start();
            // Store reference for monophonic mode
            if (synthMonophonic) {
              currentNoteRef.current = { player, semitone };
            }
          }
        }
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

        // If monophonic mode, stop the note when key is released
        if (synthMonophonic && currentNoteRef.current?.semitone === semitone) {
          currentNoteRef.current.player.stop();
          currentNoteRef.current = null;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [category, synthMonophonic]);

  const handleVolumeChange = (newVolume: number) => {
    updateCell(cellId, { volume: newVolume });
  };

  const handleSpeedCycle = () => {
    setSpeedIndex((prev) => (prev + 1) % SPEED_MULTIPLIERS.length);
  };

  const handleTrigger = () => {
    if (!playerRef.current) return;

    // Trigger flash animation
    setIsFlashing(true);
    setTimeout(() => setIsFlashing(false), 100); // 0.1s flash

    if (Tone.Transport.state !== 'started') {
      Tone.start().then(() => {
        Tone.Transport.start();
        playerRef.current?.start();
      });
    } else {
      playerRef.current.start();
    }
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
