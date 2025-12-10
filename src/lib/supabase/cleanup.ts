import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Clean up oldest beats to free storage space
 * Deletes beats (with their files) until storage is below target threshold
 *
 * @param supabase - Supabase client instance
 * @param targetSizeBytes - Target storage size in bytes (default: 800MB)
 * @returns Number of beats deleted
 */
export async function cleanupOldestBeats(
  supabase: SupabaseClient,
  targetSizeBytes: number = 800 * 1024 * 1024 // 800MB default
): Promise<number> {
  let deletedCount = 0;

  try {
    // Get current storage usage
    const { data: bucketData, error: bucketError } = await supabase
      .storage
      .getBucket('beat-recordings');

    if (bucketError) {
      console.error('Error getting bucket info:', bucketError);
      return 0;
    }

    let currentUsage = bucketData?.file_size_limit || 0;
    console.log(`Current storage usage: ${(currentUsage / 1024 / 1024).toFixed(2)}MB`);

    // If we're already below target, no cleanup needed
    if (currentUsage < targetSizeBytes) {
      console.log('Storage below threshold, no cleanup needed');
      return 0;
    }

    console.log(`Storage above threshold (${(targetSizeBytes / 1024 / 1024).toFixed(2)}MB), starting cleanup...`);

    // Get oldest beats until we're below threshold
    while (currentUsage >= targetSizeBytes) {
      // Fetch oldest beat
      const { data: beats, error: fetchError } = await supabase
        .from('beats')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(1);

      if (fetchError || !beats || beats.length === 0) {
        console.log('No more beats to delete');
        break;
      }

      const beat = beats[0];
      console.log(`Deleting beat: ${beat.beat_name} (${beat.id})`);

      // Delete audio file from storage
      const audioPath = beat.audio_url.split('/').pop();
      if (audioPath) {
        const { error: audioDeleteError } = await supabase
          .storage
          .from('beat-recordings')
          .remove([audioPath]);

        if (audioDeleteError) {
          console.error('Error deleting audio file:', audioDeleteError);
        }
      }

      // Delete snapshot images from storage
      for (const snapshotUrl of beat.snapshot_urls) {
        const snapshotPath = snapshotUrl.split('/').slice(-2).join('/'); // Get 'beatId/cellId.jpg'
        if (snapshotPath) {
          const { error: snapshotDeleteError } = await supabase
            .storage
            .from('beat-snapshots')
            .remove([snapshotPath]);

          if (snapshotDeleteError) {
            console.error('Error deleting snapshot:', snapshotDeleteError);
          }
        }
      }

      // Delete database record
      const { error: dbDeleteError } = await supabase
        .from('beats')
        .delete()
        .eq('id', beat.id);

      if (dbDeleteError) {
        console.error('Error deleting beat record:', dbDeleteError);
      } else {
        deletedCount++;
        // Subtract deleted beat's size from current usage
        currentUsage -= beat.total_size_bytes;
        console.log(`Deleted beat ${beat.id}. New usage: ${(currentUsage / 1024 / 1024).toFixed(2)}MB`);
      }
    }

    console.log(`Cleanup complete. Deleted ${deletedCount} beats.`);
    return deletedCount;

  } catch (error) {
    console.error('Cleanup error:', error);
    return deletedCount;
  }
}

/**
 * Get total storage usage across both buckets
 *
 * @param supabase - Supabase client instance
 * @returns Total storage usage in bytes
 */
export async function getTotalStorageUsage(
  supabase: SupabaseClient
): Promise<number> {
  try {
    // Query all beats and sum their total_size_bytes
    const { data: beats, error } = await supabase
      .from('beats')
      .select('total_size_bytes');

    if (error || !beats) {
      console.error('Error getting storage usage:', error);
      return 0;
    }

    const totalBytes = beats.reduce((sum, beat) => sum + (beat.total_size_bytes || 0), 0);
    return totalBytes;
  } catch (error) {
    console.error('Error calculating storage usage:', error);
    return 0;
  }
}
