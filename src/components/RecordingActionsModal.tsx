'use client';

import { useStore } from '@/store/useStore';
import { useEffect, useRef, useState } from 'react';
import * as Tone from 'tone';
import { VolumeSlider } from './VolumeSlider';

export function RecordingActionsModal() {
  const recordingState = useStore((state) => state.recordingState);
  const recordingData = useStore((state) => state.recordingData);
  const clearRecordingData = useStore((state) => state.clearRecordingData);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [buttonRect, setButtonRect] = useState<DOMRect | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const volumeButtonRef = useRef<HTMLButtonElement>(null);

  // Stop main loop when modal opens, resume when closed
  useEffect(() => {
    if (recordingState === 'ready') {
      // Pause the main loop
      if (Tone.Transport.state === 'started') {
        Tone.Transport.pause();
      }

      return () => {
        // Resume main loop when modal closes
        if (Tone.Transport.state === 'paused') {
          Tone.Transport.start();
        }
      };
    }
  }, [recordingState]);

  // Create audio URL from blob and autoplay
  useEffect(() => {
    if (recordingData.recordingBlob && !audioUrlRef.current) {
      const url = URL.createObjectURL(recordingData.recordingBlob);
      audioUrlRef.current = url;

      // Create audio element
      const audio = new Audio(url);
      audio.volume = volume;
      audio.loop = true; // Loop the recording
      audioRef.current = audio;

      // Set up event listeners
      audio.addEventListener('loadedmetadata', () => {
        setDuration(audio.duration);
        // Autoplay when ready
        audio.play().then(() => {
          setIsPlaying(true);
        }).catch((error) => {
          console.error('Autoplay failed:', error);
        });
      });

      audio.addEventListener('timeupdate', () => {
        setCurrentTime(audio.currentTime);
      });

      audio.addEventListener('ended', () => {
        setIsPlaying(false);
        setCurrentTime(0);
      });

      return () => {
        audio.pause();
        audio.src = '';
        if (audioUrlRef.current) {
          URL.revokeObjectURL(audioUrlRef.current);
          audioUrlRef.current = null;
        }
      };
    }
  }, [recordingData.recordingBlob, volume]);

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

  const handleStop = () => {
    if (!audioRef.current) return;
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleRestart = () => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = 0;
    setCurrentTime(0);
    if (!isPlaying) {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return;
    const newTime = parseFloat(e.target.value);
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleDelete = () => {
    clearRecordingData();
  };

  const handleDownload = () => {
    if (!recordingData.zipBlob) return;

    // Download ZIP file
    const url = URL.createObjectURL(recordingData.zipBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `thingbeat_recording_${Date.now()}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // Keep recording for share/delete - just close modal by setting recordingState back to 'idle'
    useStore.getState().setRecordingState('idle');
  };

  const handleShare = () => {
    // TODO: Open submission modal in Phase 3
    console.log('Share button clicked - will open submission modal');
    alert('Share to gallery feature coming in Phase 3!');
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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
        onClick={handleDelete}
      />

      {/* Modal */}
      <div className="relative bg-thingbeat-blue border-4 border-thingbeat-white p-6 w-full max-w-2xl font-['Silkscreen']">
        <h2 className="text-2xl text-thingbeat-white mb-6">Your Recording</h2>

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
                <div className="w-full h-full flex items-center justify-center text-thingbeat-white opacity-30">
                  Empty
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Audio Player */}
        <div className="border-2 border-thingbeat-white p-4 mb-6">
          {/* Play Controls */}
          <div className="flex items-center gap-2 mb-4">
            <button
              onClick={handlePlayPause}
              className="w-12 h-12 border-2 border-thingbeat-white bg-thingbeat-blue text-thingbeat-white hover:bg-thingbeat-white hover:text-thingbeat-blue flex items-center justify-center text-xl"
            >
              {isPlaying ? '⏸️' : '▶️'}
            </button>
            <button
              onClick={handleStop}
              className="w-12 h-12 border-2 border-thingbeat-white bg-thingbeat-blue text-thingbeat-white hover:bg-thingbeat-white hover:text-thingbeat-blue flex items-center justify-center text-xl"
            >
              ⏹️
            </button>
            <button
              onClick={handleRestart}
              className="w-12 h-12 border-2 border-thingbeat-white bg-thingbeat-blue text-thingbeat-white hover:bg-thingbeat-white hover:text-thingbeat-blue flex items-center justify-center text-xl"
            >
              ⏮️
            </button>
          </div>

          {/* Timeline */}
          <div className="mb-2">
            <input
              type="range"
              min="0"
              max={duration || 0}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-2 bg-thingbeat-white appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, white ${
                  (currentTime / duration) * 100
                }%, rgba(255,255,255,0.3) ${(currentTime / duration) * 100}%)`,
              }}
            />
          </div>

          {/* Time Display */}
          <div className="flex justify-between text-thingbeat-white text-sm mb-4">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>

          {/* Volume Control */}
          <div className="flex items-center gap-4">
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
