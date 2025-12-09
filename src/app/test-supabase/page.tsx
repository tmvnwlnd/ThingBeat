'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function TestSupabasePage() {
  const [status, setStatus] = useState<{
    connected: boolean;
    beatsCount: number | null;
    error: string | null;
    bucketsOk: boolean;
  }>({
    connected: false,
    beatsCount: null,
    error: null,
    bucketsOk: false,
  });

  useEffect(() => {
    async function testConnection() {
      try {
        const supabase = createClient();

        // Test 1: Query beats table
        const { data: beats, error: beatsError } = await supabase
          .from('beats')
          .select('*')
          .limit(10);

        if (beatsError) {
          setStatus({
            connected: false,
            beatsCount: null,
            error: `Database error: ${beatsError.message}`,
            bucketsOk: false,
          });
          return;
        }

        // Test 2: Check storage buckets (try to list files in each bucket)
        let bucketsOk = false;
        let bucketError = '';

        try {
          // Try to list files in beat-recordings bucket
          const { data: recordings, error: recordingsError } = await supabase
            .storage
            .from('beat-recordings')
            .list();

          // Try to list files in beat-snapshots bucket
          const { data: snapshots, error: snapshotsError } = await supabase
            .storage
            .from('beat-snapshots')
            .list();

          if (!recordingsError && !snapshotsError) {
            bucketsOk = true;
          } else {
            bucketError = recordingsError?.message || snapshotsError?.message || '';
          }
        } catch (e) {
          bucketError = e instanceof Error ? e.message : 'Unknown bucket error';
        }

        setStatus({
          connected: true,
          beatsCount: beats?.length || 0,
          error: bucketError || null,
          bucketsOk,
        });
      } catch (error) {
        setStatus({
          connected: false,
          beatsCount: null,
          error: error instanceof Error ? error.message : 'Unknown error',
          bucketsOk: false,
        });
      }
    }

    testConnection();
  }, []);

  return (
    <main className="min-h-screen bg-thingbeat-blue text-thingbeat-white font-['Silkscreen'] p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl mb-8">Supabase Connection Test</h1>

        <div className="border-2 border-thingbeat-white p-6 space-y-4">
          {/* Connection Status */}
          <div className="flex items-center gap-4">
            <div className={`w-4 h-4 ${status.connected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-xl">
              {status.connected ? 'Connected to Supabase' : 'Not connected'}
            </span>
          </div>

          {/* Database Test */}
          <div className="pl-8">
            <p className="text-lg mb-2">Database (beats table):</p>
            {status.error ? (
              <p className="text-red-400">{status.error}</p>
            ) : (
              <p className="text-green-400">
                ✓ Query successful - Found {status.beatsCount} beats
              </p>
            )}
          </div>

          {/* Storage Test */}
          <div className="pl-8">
            <p className="text-lg mb-2">Storage buckets:</p>
            {status.bucketsOk ? (
              <div className="text-green-400">
                <p>✓ beat-recordings bucket found</p>
                <p>✓ beat-snapshots bucket found</p>
              </div>
            ) : (
              <p className="text-red-400">✗ Buckets not found or not accessible</p>
            )}
          </div>

          {/* Environment Variables */}
          <div className="pl-8">
            <p className="text-lg mb-2">Environment variables:</p>
            <p className={`${process.env.NEXT_PUBLIC_SUPABASE_URL ? 'text-green-400' : 'text-red-400'}`}>
              {process.env.NEXT_PUBLIC_SUPABASE_URL ? '✓' : '✗'} NEXT_PUBLIC_SUPABASE_URL
            </p>
            <p className={`${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'text-green-400' : 'text-red-400'}`}>
              {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✓' : '✗'} NEXT_PUBLIC_SUPABASE_ANON_KEY
            </p>
          </div>
        </div>

        <div className="mt-8">
          <a
            href="/"
            className="inline-block px-6 py-3 bg-thingbeat-white text-thingbeat-blue hover:bg-opacity-90 transition-colors"
          >
            ← Back to ThingBeat
          </a>
        </div>
      </div>
    </main>
  );
}
