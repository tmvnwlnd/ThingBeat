import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getTotalStorageUsage, cleanupOldestBeats } from '@/lib/supabase/cleanup';
import { randomUUID } from 'crypto';

export async function POST(request: NextRequest) {
  try {
    console.log('=== Upload API called ===');

    // Parse form data
    const formData = await request.formData();

    const beatName = formData.get('beatName') as string;
    const userName = formData.get('userName') as string;
    const audioBlob = formData.get('audioBlob') as Blob;
    const bpm = parseInt(formData.get('bpm') as string);
    const key = formData.get('key') as string;
    const loopLength = parseInt(formData.get('loopLength') as string);

    console.log('Received data:', {
      beatName,
      userName,
      audioBlobSize: audioBlob?.size,
      audioBlobType: audioBlob?.type,
      bpm,
      key,
      loopLength,
    });

    // Validate required fields
    if (!beatName || !userName || !audioBlob || !bpm || !key || !loopLength) {
      console.error('Missing required fields');
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get snapshots (9 images, some may be null)
    const snapshots: (Blob | null)[] = [];
    for (let i = 0; i < 9; i++) {
      const snapshot = formData.get(`snapshot_${i}`) as Blob | null;
      snapshots.push(snapshot);
    }

    // Create Supabase client
    const supabase = await createClient();
    console.log('Supabase client created');

    // Check storage usage and cleanup if needed
    const currentUsage = await getTotalStorageUsage(supabase);
    console.log(`Current storage usage: ${(currentUsage / 1024 / 1024).toFixed(2)}MB`);
    const CLEANUP_THRESHOLD = 900 * 1024 * 1024; // 900MB

    let cleanedUp = 0;
    if (currentUsage > CLEANUP_THRESHOLD) {
      console.log(`Storage usage (${(currentUsage / 1024 / 1024).toFixed(2)}MB) exceeds threshold. Starting cleanup...`);
      cleanedUp = await cleanupOldestBeats(supabase, 800 * 1024 * 1024); // Target 800MB
      console.log(`Cleaned up ${cleanedUp} beats`);
    }

    // Generate unique beat ID
    const beatId = randomUUID();

    // Upload audio file to beat-recordings bucket
    const audioFileName = `${beatId}.webm`;
    const audioArrayBuffer = await audioBlob.arrayBuffer();
    const audioBuffer = Buffer.from(audioArrayBuffer);

    const { error: audioUploadError } = await supabase.storage
      .from('beat-recordings')
      .upload(audioFileName, audioBuffer, {
        contentType: 'audio/webm',
        cacheControl: '3600',
        upsert: false,
      });

    if (audioUploadError) {
      console.error('Error uploading audio:', audioUploadError);
      console.error('Audio upload details:', {
        fileName: audioFileName,
        bufferSize: audioBuffer.length,
        contentType: 'audio/webm',
      });
      return NextResponse.json(
        { success: false, error: `Failed to upload audio file: ${audioUploadError.message}` },
        { status: 500 }
      );
    }

    // Get public URL for audio file
    const { data: audioUrlData } = supabase.storage
      .from('beat-recordings')
      .getPublicUrl(audioFileName);

    const audioUrl = audioUrlData.publicUrl;

    // Upload snapshot images to beat-snapshots bucket
    const snapshotUrls: string[] = [];
    let totalSnapshotSize = 0;

    for (let i = 0; i < 9; i++) {
      const snapshot = snapshots[i];

      if (snapshot) {
        const snapshotFileName = `${beatId}/${i}.jpg`;
        const snapshotArrayBuffer = await snapshot.arrayBuffer();
        const snapshotBuffer = Buffer.from(snapshotArrayBuffer);
        totalSnapshotSize += snapshotBuffer.length;

        const { error: snapshotUploadError } = await supabase.storage
          .from('beat-snapshots')
          .upload(snapshotFileName, snapshotBuffer, {
            contentType: 'image/jpeg',
            cacheControl: '3600',
            upsert: false,
          });

        if (snapshotUploadError) {
          console.error(`Error uploading snapshot ${i}:`, snapshotUploadError);
          // Continue with other snapshots even if one fails
          snapshotUrls.push('');
          continue;
        }

        // Get public URL for snapshot
        const { data: snapshotUrlData } = supabase.storage
          .from('beat-snapshots')
          .getPublicUrl(snapshotFileName);

        snapshotUrls.push(snapshotUrlData.publicUrl);
      } else {
        // Empty cell, no snapshot
        snapshotUrls.push('');
      }
    }

    // Calculate total size
    const totalSizeBytes = audioBuffer.length + totalSnapshotSize;

    // Create database record
    const { error: dbError } = await supabase
      .from('beats')
      .insert({
        id: beatId,
        beat_name: beatName,
        user_name: userName,
        audio_url: audioUrl,
        snapshot_urls: snapshotUrls,
        bpm,
        key,
        loop_length: loopLength,
        total_size_bytes: totalSizeBytes,
      });

    if (dbError) {
      console.error('Error creating database record:', dbError);

      // Cleanup uploaded files if database insert fails
      await supabase.storage.from('beat-recordings').remove([audioFileName]);
      for (let i = 0; i < 9; i++) {
        if (snapshots[i]) {
          await supabase.storage.from('beat-snapshots').remove([`${beatId}/${i}.jpg`]);
        }
      }

      return NextResponse.json(
        { success: false, error: 'Failed to create database record' },
        { status: 500 }
      );
    }

    console.log(`Successfully uploaded beat: ${beatName} (${beatId})`);
    console.log(`Total size: ${(totalSizeBytes / 1024 / 1024).toFixed(2)}MB`);

    return NextResponse.json({
      success: true,
      beatId,
      cleanedUp,
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
