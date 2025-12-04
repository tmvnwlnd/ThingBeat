import * as Tone from 'tone';

let audioInitialized = false;

/**
 * Pre-initialize the AudioContext to eliminate latency on first keypress
 * This should be called on first user interaction (click/keydown anywhere on page)
 */
export const initializeAudio = async () => {
  if (audioInitialized) return;

  try {
    // Cast to any to access AudioContext properties not in BaseContext type
    const ctx = Tone.context as any;

    // Configure low-latency settings BEFORE starting
    ctx.latencyHint = 'interactive'; // Lowest latency mode
    ctx.lookAhead = 0.01; // Look ahead 10ms (default is 0.1s)

    await Tone.start();
    await Tone.Transport.start();

    console.log('✅ Audio context initialized with low latency settings');
    console.log('   - Context state:', Tone.context.state);
    console.log('   - Base latency:', ctx.baseLatency);
    console.log('   - Output latency:', ctx.outputLatency);
    console.log('   - Latency hint:', ctx.latencyHint);
    console.log('   - Look ahead:', ctx.lookAhead);

    audioInitialized = true;
  } catch (error) {
    console.error('Failed to initialize audio:', error);
  }
};

/**
 * Check if audio has been initialized
 */
export const isAudioInitialized = () => audioInitialized;

/**
 * Keep AudioContext alive to prevent browser suspension during idle
 * Call this after first sound loads
 */
let keepAliveInterval: number | null = null;
let silentOsc: Tone.Oscillator | null = null;

export const startKeepAlive = () => {
  if (keepAliveInterval || !audioInitialized) return;

  // Create silent oscillator at inaudible frequency
  silentOsc = new Tone.Oscillator(20000, 'sine').toDestination(); // 20kHz = inaudible
  silentOsc.volume.value = -100; // Extremely quiet
  silentOsc.start();

  // Pulse every 3 seconds to prevent suspension
  keepAliveInterval = window.setInterval(() => {
    if (silentOsc) {
      silentOsc.frequency.value = 20000; // Trigger tiny CPU activity
    }
  }, 3000);

  console.log('✅ AudioContext keep-alive started (prevents suspension during idle)');
};

export const stopKeepAlive = () => {
  if (keepAliveInterval) {
    clearInterval(keepAliveInterval);
    keepAliveInterval = null;
  }
  if (silentOsc) {
    silentOsc.stop();
    silentOsc.dispose();
    silentOsc = null;
  }
  console.log('⏹️ AudioContext keep-alive stopped');
};
