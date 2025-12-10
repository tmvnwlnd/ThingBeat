/**
 * Audio quantization utilities for ensuring perfect loop sync
 * - Detects first transient (onset) to remove leading silence
 * - Trims or pads audio to exact target duration
 * - Ensures all rhythmic loops stay perfectly in sync
 */

/**
 * Detects the first transient (significant audio event) in an audio buffer
 * @param audioBuffer - The audio buffer to analyze
 * @param threshold - RMS energy threshold for transient detection (0-1, default 0.02)
 * @param windowSize - Number of samples to analyze at once for RMS calculation
 * @returns Time in seconds where the first transient occurs
 */
export function detectFirstTransient(
  audioBuffer: AudioBuffer,
  threshold: number = 0.02,
  windowSize: number = 512
): number {
  const channel = audioBuffer.getChannelData(0); // Use first channel
  const sampleRate = audioBuffer.sampleRate;

  // Calculate RMS (Root Mean Square) energy in sliding windows
  // This is more robust than simple amplitude threshold
  for (let i = 0; i < channel.length - windowSize; i += windowSize / 4) {
    // Calculate RMS for this window
    let sumSquares = 0;
    for (let j = 0; j < windowSize; j++) {
      const sample = channel[i + j];
      sumSquares += sample * sample;
    }
    const rms = Math.sqrt(sumSquares / windowSize);

    // If RMS exceeds threshold, we found the transient
    if (rms > threshold) {
      // Return the time in seconds
      return i / sampleRate;
    }
  }

  // No transient found, start at beginning
  return 0;
}

/**
 * Creates a new audio buffer with exact target duration
 * - Detects and removes leading silence (before first transient)
 * - Pads with silence if audio is too short
 * - Trims if audio is too long
 *
 * @param audioBuffer - Original audio buffer from ElevenLabs
 * @param targetDuration - Exact duration in seconds (based on BPM and loop length)
 * @param detectOnset - Whether to detect and remove leading silence (default true)
 * @returns New AudioBuffer with exact target duration, starting at first transient
 */
export function quantizeAudioBuffer(
  audioBuffer: AudioBuffer,
  targetDuration: number,
  detectOnset: boolean = true
): AudioBuffer {
  const sampleRate = audioBuffer.sampleRate;
  const numberOfChannels = audioBuffer.numberOfChannels;

  // 1. Detect where the audio actually starts (first transient)
  const onsetTime = detectOnset ? detectFirstTransient(audioBuffer) : 0;
  const onsetSample = Math.floor(onsetTime * sampleRate);

  console.log(`🔍 Onset detection: First transient at ${onsetTime.toFixed(3)}s (sample ${onsetSample})`);

  // 2. Calculate target length in samples
  const targetSamples = Math.floor(targetDuration * sampleRate);

  // 3. Calculate how many samples we have after removing leading silence
  const availableSamples = audioBuffer.length - onsetSample;

  console.log(`📏 Target duration: ${targetDuration.toFixed(3)}s (${targetSamples} samples)`);
  console.log(`📏 Available audio after onset: ${(availableSamples / sampleRate).toFixed(3)}s (${availableSamples} samples)`);

  // 4. Create new buffer with exact target length
  const audioContext = new OfflineAudioContext(
    numberOfChannels,
    targetSamples,
    sampleRate
  );

  const newBuffer = audioContext.createBuffer(
    numberOfChannels,
    targetSamples,
    sampleRate
  );

  // 5. Copy audio data, starting from onset
  for (let channel = 0; channel < numberOfChannels; channel++) {
    const originalData = audioBuffer.getChannelData(channel);
    const newData = newBuffer.getChannelData(channel);

    // Copy available samples from onset point
    const samplesToCopy = Math.min(availableSamples, targetSamples);

    for (let i = 0; i < samplesToCopy; i++) {
      newData[i] = originalData[onsetSample + i];
    }

    // If we need padding, remaining samples are already 0 (silence)
    if (availableSamples < targetSamples) {
      const paddingSamples = targetSamples - availableSamples;
      console.log(`➕ Padding with ${(paddingSamples / sampleRate).toFixed(3)}s of silence`);
    } else if (availableSamples > targetSamples) {
      const trimmedSamples = availableSamples - targetSamples;
      console.log(`✂️  Trimming ${(trimmedSamples / sampleRate).toFixed(3)}s from end`);
    }
  }

  console.log(`✅ Quantized buffer: exactly ${targetDuration.toFixed(3)}s`);

  return newBuffer;
}

/**
 * Converts an audio data URL (base64 MP3) to an AudioBuffer
 * @param audioDataUrl - Data URL with base64 encoded audio
 * @returns Promise<AudioBuffer>
 */
export async function dataUrlToAudioBuffer(audioDataUrl: string): Promise<AudioBuffer> {
  // Extract base64 data from data URL
  const base64Data = audioDataUrl.split(',')[1];
  const binaryData = atob(base64Data);

  // Convert to ArrayBuffer
  const arrayBuffer = new ArrayBuffer(binaryData.length);
  const uint8Array = new Uint8Array(arrayBuffer);
  for (let i = 0; i < binaryData.length; i++) {
    uint8Array[i] = binaryData.charCodeAt(i);
  }

  // Decode audio
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  await audioContext.close();

  return audioBuffer;
}

/**
 * Converts an AudioBuffer to a data URL (base64 WAV)
 * @param audioBuffer - The audio buffer to convert
 * @returns Promise<string> Data URL with base64 encoded WAV
 */
export async function audioBufferToDataUrl(audioBuffer: AudioBuffer): Promise<string> {
  // Encode as WAV (same logic as audioConvert.ts)
  const numberOfChannels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const length = audioBuffer.length;

  const bytesPerSample = 2; // 16-bit PCM
  const blockAlign = numberOfChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = length * blockAlign;
  const bufferSize = 44 + dataSize; // WAV header is 44 bytes

  const buffer = new ArrayBuffer(bufferSize);
  const view = new DataView(buffer);

  // Write WAV header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numberOfChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bytesPerSample * 8, true);
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  // Write PCM data
  let offset = 44;
  for (let i = 0; i < length; i++) {
    for (let channel = 0; channel < numberOfChannels; channel++) {
      const sample = audioBuffer.getChannelData(channel)[i];
      const int16 = Math.max(-1, Math.min(1, sample)) * 0x7fff;
      view.setInt16(offset, int16, true);
      offset += 2;
    }
  }

  // Convert to base64 data URL
  const blob = new Blob([buffer], { type: 'audio/wav' });
  return new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });
}

function writeString(view: DataView, offset: number, string: string): void {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}
