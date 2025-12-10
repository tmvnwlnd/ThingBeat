'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { convertWebMToWav } from '@/lib/audioConvert';

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

export default function BeatPage() {
  const params = useParams();
  const router = useRouter();
  const beatId = params.beatId as string;

  const [beat, setBeat] = useState<Beat | null>(null);
  const [nextBeatId, setNextBeatId] = useState<string | null>(null);
  const [prevBeatId, setPrevBeatId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    fetchBeat();
  }, [beatId]);

  const fetchBeat = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/community/beat/${beatId}`);

      if (!response.ok) {
        throw new Error('Beat not found');
      }

      const data = await response.json();
      setBeat(data.beat);
      setNextBeatId(data.nextBeatId);
      setPrevBeatId(data.prevBeatId);
      setError(null);
    } catch (err) {
      console.error('Error fetching beat:', err);
      setError(err instanceof Error ? err.message : 'Failed to load beat');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!beat) return;

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
  }, [beat]);

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

  const handleDownload = async () => {
    if (!beat) return;

    try {
      // Fetch the WebM file from Supabase
      console.log('Fetching recording...');
      const response = await fetch(beat.audio_url);
      const webmBlob = await response.blob();

      // Convert to WAV
      console.log('Converting WebM to WAV...');
      const wavBlob = await convertWebMToWav(webmBlob);
      console.log('Conversion complete!');

      // Download WAV
      const url = URL.createObjectURL(wavBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${beat.beat_name.replace(/\s+/g, '_')}_by_${beat.user_name.replace(/\s+/g, '_')}.wav`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download and convert:', error);
      alert('Failed to download recording. Please try again.');
    }
  };

  const handleNext = () => {
    if (nextBeatId) {
      router.push(`/community/${nextBeatId}`);
    }
  };

  const handlePrev = () => {
    if (prevBeatId) {
      router.push(`/community/${prevBeatId}`);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-thingbeat-blue flex items-center justify-center">
        <p className="text-thingbeat-white text-xl">Loading...</p>
      </div>
    );
  }

  if (error || !beat) {
    return (
      <div className="min-h-screen bg-thingbeat-blue flex flex-col items-center justify-center gap-6">
        <p className="text-thingbeat-white text-xl">{error || 'Beat not found'}</p>
        <Link
          href="/community"
          className="px-6 py-3 border-2 border-thingbeat-white bg-thingbeat-blue text-thingbeat-white hover:bg-thingbeat-white hover:text-thingbeat-blue"
        >
          Back to Gallery
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-thingbeat-blue">
      {/* Header - Same as Community Gallery */}
      <header className="border-b-2 border-thingbeat-white p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="bg-thingbeat-white px-2 py-2 hover:bg-thingbeat-blue"
            >
              <h1 className="text-[24px] font-bold text-thingbeat-blue hover:text-thingbeat-white leading-none">
                Thingbeat
              </h1>
            </Link>
            <Link
              href="/community"
              className="text-2xl font-bold text-thingbeat-white hover:underline"
            >
              Community Gallery
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto p-6">
        <div className="bg-thingbeat-blue border-4 border-thingbeat-white p-6">
          {/* Beat Info Header */}
          <div className="mb-6">
            <h1 className="text-3xl text-thingbeat-white font-bold mb-2">
              {beat.beat_name}
            </h1>
            <p className="text-thingbeat-white text-lg">
              by {beat.user_name}
            </p>
            <div className="flex items-center gap-4 text-thingbeat-white text-sm mt-2">
              <span>{beat.bpm} BPM</span>
              <span>•</span>
              <span>{beat.key}</span>
              <span>•</span>
              <span>{beat.loop_length} bars</span>
              <span>•</span>
              <span>{formatTimestamp(beat.created_at)}</span>
            </div>
          </div>

          {/* 3x3 Snapshot Grid */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {beat.snapshot_urls.map((url, index) => (
              <div
                key={index}
                className="aspect-video border-2 border-thingbeat-white bg-thingbeat-blue"
              >
                {url ? (
                  <img
                    src={url}
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

          {/* Controls */}
          <div className="flex flex-col gap-4">
            {/* Play and Download Buttons */}
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={handlePlayPause}
                className="w-16 h-16 border-2 border-thingbeat-white bg-thingbeat-blue text-thingbeat-white hover:border-4 flex items-center justify-center"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                <img
                  src={isPlaying ? '/icons/pause.svg' : '/icons/play.svg'}
                  alt={isPlaying ? 'Pause' : 'Play'}
                  className="w-10 h-10"
                />
              </button>
              <button
                onClick={handleDownload}
                className="px-6 h-12 border-2 border-thingbeat-white bg-thingbeat-blue text-thingbeat-white hover:bg-thingbeat-white hover:text-thingbeat-blue"
              >
                Download Recording
              </button>
            </div>

            {/* Previous/Next Navigation */}
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={handlePrev}
                disabled={!prevBeatId}
                className="px-6 h-10 border-2 border-thingbeat-white bg-thingbeat-blue text-thingbeat-white hover:bg-thingbeat-white hover:text-thingbeat-blue disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-thingbeat-blue disabled:hover:text-thingbeat-white"
              >
                ← Previous Beat
              </button>
              <button
                onClick={handleNext}
                disabled={!nextBeatId}
                className="px-6 h-10 border-2 border-thingbeat-white bg-thingbeat-blue text-thingbeat-white hover:bg-thingbeat-white hover:text-thingbeat-blue disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-thingbeat-blue disabled:hover:text-thingbeat-white"
              >
                Next Beat →
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
