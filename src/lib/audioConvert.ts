/**
 * Converts a WebM audio blob to WAV format
 * WAV is universally compatible with QuickTime, Ableton, and all standard audio programs
 * @param webmBlob - The WebM audio blob to convert
 * @returns Promise<Blob> - The converted WAV blob
 */
export async function convertWebMToWav(webmBlob: Blob): Promise<Blob> {
  // Create AudioContext
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

  // Convert blob to ArrayBuffer
  const arrayBuffer = await webmBlob.arrayBuffer();

  // Decode audio data
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

  // Get audio parameters
  const numberOfChannels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const length = audioBuffer.length;

  // Create WAV file
  const wavBuffer = encodeWAV(audioBuffer, numberOfChannels, sampleRate, length);
  const wavBlob = new Blob([wavBuffer], { type: 'audio/wav' });

  // Close AudioContext
  await audioContext.close();

  return wavBlob;
}

/**
 * Encode AudioBuffer to WAV format
 */
function encodeWAV(
  audioBuffer: AudioBuffer,
  numberOfChannels: number,
  sampleRate: number,
  length: number
): ArrayBuffer {
  const bytesPerSample = 2; // 16-bit PCM
  const blockAlign = numberOfChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = length * blockAlign;
  const bufferSize = 44 + dataSize; // WAV header is 44 bytes

  const buffer = new ArrayBuffer(bufferSize);
  const view = new DataView(buffer);

  // Write WAV header
  writeString(view, 0, 'RIFF'); // ChunkID
  view.setUint32(4, 36 + dataSize, true); // ChunkSize
  writeString(view, 8, 'WAVE'); // Format
  writeString(view, 12, 'fmt '); // Subchunk1ID
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
  view.setUint16(22, numberOfChannels, true); // NumChannels
  view.setUint32(24, sampleRate, true); // SampleRate
  view.setUint32(28, byteRate, true); // ByteRate
  view.setUint16(32, blockAlign, true); // BlockAlign
  view.setUint16(34, bytesPerSample * 8, true); // BitsPerSample
  writeString(view, 36, 'data'); // Subchunk2ID
  view.setUint32(40, dataSize, true); // Subchunk2Size

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

  return buffer;
}

/**
 * Write a string to a DataView
 */
function writeString(view: DataView, offset: number, string: string): void {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}
