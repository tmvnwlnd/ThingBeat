'use client';

import { useStore } from '@/store/useStore';
import { useEffect, useRef, useState } from 'react';
import * as Tone from 'tone';
import WaveSurfer from 'wavesurfer.js';
import { VolumeSlider } from './VolumeSlider';
import { convertWebMToWav } from '@/lib/audioConvert';

export function RecordingActionsModal() {
  const recordingState = useStore((state) => state.recordingState);
  const recordingData = useStore((state) => state.recordingData);
  const settings = useStore((state) => state.settings);
  const updateSettings = useStore((state) => state.updateSettings);
  const setShowDeleteConfirm = useStore((state) => state.setShowDeleteConfirm);

  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [buttonRect, setButtonRect] = useState<DOMRect | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const volumeButtonRef = useRef<HTMLButtonElement>(null);
  const waveformRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const previousMuteStateRef = useRef(false);

  // Stop main loop when modal opens, resume when closed
  useEffect(() => {
    if (recordingState === 'ready') {
      // Save current mute state and mute all
      previousMuteStateRef.current = settings.muteAll;
      updateSettings({ muteAll: true });

      // Pause the main loop
      if (Tone.Transport.state === 'started') {
        Tone.Transport.pause();
      }

      return () => {
        // Restore previous mute state
        updateSettings({ muteAll: previousMuteStateRef.current });

        // Resume main loop when modal closes
        if (Tone.Transport.state === 'paused') {
          Tone.Transport.start();
        }
      };
    }
  }, [recordingState]);

  // Create audio URL from blob and autoplay (only when modal is open)
  useEffect(() => {
    // Only create audio when modal is actually showing
    if (recordingState === 'ready' && recordingData.recordingBlob && !audioUrlRef.current) {
      const url = URL.createObjectURL(recordingData.recordingBlob);
      audioUrlRef.current = url;

      // Create audio element
      const audio = new Audio(url);
      audio.volume = volume;
      audio.loop = true; // Loop the recording
      audioRef.current = audio;

      // Autoplay when ready
      audio.play().then(() => {
        setIsPlaying(true);
      }).catch((error) => {
        console.error('Autoplay failed:', error);
      });
    }

    return () => {
      // Cleanup audio when modal closes
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
      }
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
        audioUrlRef.current = null;
      }
      setIsPlaying(false);
    };
  }, [recordingState, recordingData.recordingBlob, volume]);

  // Initialize WaveSurfer for waveform visualization
  useEffect(() => {
    if (!waveformRef.current || !audioUrlRef.current || recordingState !== 'ready') return;

    const wavesurfer = WaveSurfer.create({
      container: waveformRef.current,
      waveColor: '#FFFFFF',
      progressColor: '#FFFFFF',
      cursorWidth: 0,
      barWidth: 2,
      barGap: 4,
      barRadius: 0,
      height: 48,
      barHeight: 1,
      normalize: true,
      interact: false, // Disable scrubbing
      hideScrollbar: true,
      minPxPerSec: 1,
    });

    wavesurfer.load(audioUrlRef.current);
    wavesurferRef.current = wavesurfer;

    return () => {
      wavesurfer.destroy();
      wavesurferRef.current = null;
    };
  }, [audioUrlRef.current, recordingState]);

  // Update volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const handlePlayPause = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleDelete = () => {
    setShowDeleteConfirm(true);
  };

  const handleClose = () => {
    // Stop audio playback when closing modal
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    }
    useStore.getState().setRecordingState('idle');
  };

  const handleDownload = async () => {
    if (!recordingData.recordingBlob) return;

    try {
      // Convert WebM to WAV
      console.log('Converting WebM to WAV...');
      const wavBlob = await convertWebMToWav(recordingData.recordingBlob);
      console.log('Conversion complete!');

      // Download WAV file
      const url = URL.createObjectURL(wavBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `thingbeat_recording_${Date.now()}.wav`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to convert audio:', error);
      alert('Failed to convert recording. Please try again.');
    }

    // Don't close modal - keep it open so user can still share/delete
  };

  const handleShare = () => {
    // Stop audio playback before opening submission modal
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    }
    // Open submission modal
    useStore.getState().setShowSubmissionModal(true);
    // Close this modal
    useStore.getState().setRecordingState('idle');
  };


  // Only show modal when recordingState is 'ready'
  if (recordingState !== 'ready' || !recordingData.recordingBlob) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-70"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative bg-thingbeat-blue border-4 border-thingbeat-white p-6 w-full max-w-2xl font-['Silkscreen']">
        {/* Header with title and close button */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl text-thingbeat-white">Your Recording</h2>
          <button
            onClick={handleClose}
            className="w-8 h-8 border-2 border-thingbeat-white bg-thingbeat-blue text-thingbeat-white hover:border-4 flex items-center justify-center"
            title="Close"
          >
            <img src="/icons/x.svg" alt="Close" className="w-6 h-6" />
          </button>
        </div>

        {/* 3x3 Snapshot Grid */}
        <div className="grid grid-cols-3 gap-2 mb-6">
          {recordingData.snapshots.map((snapshot, index) => (
            <div
              key={index}
              className="aspect-video border-2 border-thingbeat-white bg-thingbeat-blue"
            >
              {snapshot ? (
                <img
                  src={snapshot}
                  alt={`Cell ${index}`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-thingbeat-white">
                  Empty
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Audio Player */}
        <div className="border-2 border-thingbeat-white p-4 mb-6">
          <div className="flex items-center gap-2">
            {/* Play/Pause Button */}
            <button
              onClick={handlePlayPause}
              className="w-12 h-12 border-2 border-thingbeat-white bg-thingbeat-blue text-thingbeat-white hover:border-4 flex items-center justify-center shrink-0"
            >
              <img
                src={isPlaying ? "/icons/pause.svg" : "/icons/play.svg"}
                alt={isPlaying ? "Pause" : "Play"}
                className="w-8 h-8"
              />
            </button>

            {/* Volume Button */}
            <div className="relative shrink-0">
              <button
                ref={volumeButtonRef}
                onClick={() => {
                  const rect = volumeButtonRef.current?.getBoundingClientRect() || null;
                  setButtonRect(rect);
                  setShowVolumeSlider(!showVolumeSlider);
                }}
                className="w-12 h-12 bg-thingbeat-blue border-2 border-thingbeat-white flex items-center justify-center hover:border-4"
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
                  onChange={setVolume}
                  onClose={() => setShowVolumeSlider(false)}
                  buttonRect={buttonRect}
                />
              )}
            </div>

            {/* Waveform */}
            <div ref={waveformRef} className="flex-1 h-12" />
          </div>
        </div>

        {/* Question */}
        <p className="text-thingbeat-white text-center text-lg mb-6">
          What would you like to do?
        </p>

        {/* Action Buttons */}
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={handleDelete}
            className="px-6 h-12 text-lg border-2 border-thingbeat-white bg-thingbeat-blue text-thingbeat-white hover:bg-thingbeat-white hover:text-thingbeat-blue"
          >
            Delete
          </button>
          <button
            onClick={handleDownload}
            className="px-6 h-12 text-lg border-2 border-thingbeat-white bg-thingbeat-blue text-thingbeat-white hover:bg-thingbeat-white hover:text-thingbeat-blue"
          >
            Download
          </button>
          <button
            onClick={handleShare}
            className="px-6 h-12 text-lg border-2 border-thingbeat-white bg-thingbeat-white text-thingbeat-blue hover:bg-thingbeat-blue hover:text-thingbeat-white"
          >
            Share to Gallery
          </button>
        </div>
      </div>

    </div>
  );
}
