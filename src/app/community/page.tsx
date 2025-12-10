'use client';

import { useState, useEffect } from 'react';
import { BeatCard } from '@/components/BeatCard';
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

type BeatsResponse = {
  beats: Beat[];
  totalBeats: number;
  totalPages: number;
  currentPage: number;
  perPage: number;
};

export default function CommunityPage() {
  const [beats, setBeats] = useState<Beat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalBeats, setTotalBeats] = useState(0);

  useEffect(() => {
    fetchBeats(currentPage);
  }, [currentPage]);

  const fetchBeats = async (page: number) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/community/beats?page=${page}`);

      if (!response.ok) {
        throw new Error('Failed to fetch beats');
      }

      const data: BeatsResponse = await response.json();
      setBeats(data.beats);
      setTotalPages(data.totalPages);
      setTotalBeats(data.totalBeats);
    } catch (err) {
      console.error('Error fetching beats:', err);
      setError(err instanceof Error ? err.message : 'Failed to load beats');
    } finally {
      setLoading(false);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-thingbeat-blue">
      {/* Header */}
      <header className="border-b-2 border-thingbeat-white p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="bg-thingbeat-white px-2 py-2 hover:opacity-80 transition-opacity"
            >
              <h1 className="text-[24px] font-bold text-thingbeat-blue leading-none">
                Thingbeat
              </h1>
            </Link>
            <h2 className="text-2xl font-bold text-thingbeat-white">
              Community Gallery
            </h2>
          </div>
          <div className="text-thingbeat-white text-sm">
            {totalBeats} {totalBeats === 1 ? 'beat' : 'beats'}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-4">
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="text-thingbeat-white text-xl">Loading beats...</div>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="text-red-400 text-xl">{error}</div>
            <button
              onClick={() => fetchBeats(currentPage)}
              className="px-6 py-2 border-2 border-thingbeat-white bg-thingbeat-blue text-thingbeat-white hover:bg-thingbeat-white hover:text-thingbeat-blue"
            >
              Try Again
            </button>
          </div>
        )}

        {!loading && !error && beats.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="text-thingbeat-white text-xl">
              No beats yet. Be the first to share!
            </div>
            <Link
              href="/"
              className="px-6 py-2 border-2 border-thingbeat-white bg-thingbeat-white text-thingbeat-blue hover:bg-thingbeat-blue hover:text-thingbeat-white"
            >
              Create a Beat
            </Link>
          </div>
        )}

        {!loading && !error && beats.length > 0 && (
          <>
            {/* Beat Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
              {beats.map((beat) => (
                <BeatCard key={beat.id} beat={beat} />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 py-8">
                <button
                  onClick={handlePrevPage}
                  disabled={currentPage === 1}
                  className="px-6 py-2 border-2 border-thingbeat-white bg-thingbeat-blue text-thingbeat-white hover:bg-thingbeat-white hover:text-thingbeat-blue disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-thingbeat-blue disabled:hover:text-thingbeat-white"
                >
                  ← Prev
                </button>
                <span className="text-thingbeat-white">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages}
                  className="px-6 py-2 border-2 border-thingbeat-white bg-thingbeat-blue text-thingbeat-white hover:bg-thingbeat-white hover:text-thingbeat-blue disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-thingbeat-blue disabled:hover:text-thingbeat-white"
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
