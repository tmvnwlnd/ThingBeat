'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';

type Beat = {
  id: string;
  beat_name: string;
  user_name: string;
  audio_url: string;
  snapshot_urls: string[];
  bpm: number;
  key: string;
  loop_length: number;
  created_at: string;
};

export function BeatCard({ beat }: { beat: Beat }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Create audio element
    const audio = new Audio(beat.audio_url);
    audio.loop = true;
    audioRef.current = audio;

    audio.addEventListener('ended', () => {
      setIsPlaying(false);
    });

    return () => {
      audio.pause();
      audio.src = '';
    };
  }, [beat.audio_url]);

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

  // Format timestamp as relative time
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <Link href={`/community/${beat.id}`}>
      <div className="bg-thingbeat-blue border-2 border-thingbeat-white p-3 flex flex-col gap-2 cursor-pointer hover:border-4">
        {/* 3x3 Snapshot Grid */}
        <div className="grid grid-cols-3 gap-1">
          {beat.snapshot_urls.map((url, index) => (
            <div
              key={index}
              className="aspect-video border border-thingbeat-white bg-thingbeat-blue"
            >
              {url ? (
                <img
                  src={url}
                  alt={`Cell ${index}`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-thingbeat-white text-[8px]">
                  -
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Beat Info */}
        <div className="flex flex-col gap-1">
          <h3
            className="text-thingbeat-white text-sm font-bold line-clamp-2"
            title={beat.beat_name}
          >
            {beat.beat_name}
          </h3>
          <p
            className="text-thingbeat-white text-xs line-clamp-1"
            title={beat.user_name}
          >
            by {beat.user_name}
          </p>
        </div>

        {/* Metadata */}
        <div className="flex items-center justify-between text-thingbeat-white text-[10px]">
          <span>{beat.bpm} BPM • {beat.key}</span>
          <span>{formatTimestamp(beat.created_at)}</span>
        </div>

        {/* Play Button */}
        <button
          onClick={(e) => {
            e.preventDefault(); // Prevent navigation when clicking play
            handlePlayPause();
          }}
          className="w-full h-10 border-2 border-thingbeat-white bg-thingbeat-blue text-thingbeat-white hover:border-4 flex items-center justify-center"
        >
          <img
            src={isPlaying ? '/icons/pause.svg' : '/icons/play.svg'}
            alt={isPlaying ? 'Pause' : 'Play'}
            className="w-6 h-6"
          />
        </button>
      </div>
    </Link>
  );
}
