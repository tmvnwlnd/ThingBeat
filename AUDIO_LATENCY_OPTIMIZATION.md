# Audio Playback Latency Optimization

## Problem

**Current Issue:** Noticeable lag between pressing a keyboard key and hearing the sound, making it impossible to play rhythmically with synths and drums.

**Typical Web Audio Latency:** 10-100ms depending on various factors.

**Target Latency:** <10ms (imperceptible for musical performance)

---

## Root Causes (Identified in Code)

### 1. **Tone.start() on Every Keypress** 🔴 MAJOR ISSUE

**Current Code** (`SoundControls.tsx:294-298`, `343-347`):
```typescript
if (Tone.Transport.state !== 'started') {
  Tone.start().then(() => {
    Tone.Transport.start();
    player.start();
  });
}
```

**Problem:**
- `Tone.start()` resumes the AudioContext (async operation)
- Takes 10-50ms on first press
- Blocks audio playback until promise resolves
- Creates noticeable delay on first keypress after page load or idle

**Solution:** Warm up the AudioContext on app load or first user interaction.

---

### 2. **setState Before Audio Playback** 🟡 MINOR ISSUE

**Current Code** (`SoundControls.tsx:289`, `340-341`):
```typescript
setPressedSynthKeys(prev => new Set(prev).add(key)); // React setState
setIsFlashing(true); // React setState
// ... then play audio
player.start();
```

**Problem:**
- React setState is synchronous but queues a re-render
- Can add 1-5ms delay before audio plays
- Not critical but additive with other issues

**Solution:** Move `setState` calls after `player.start()` or use `requestAnimationFrame`.

---

### 3. **No Audio Buffer Pre-warming** 🟡 MINOR ISSUE

**Problem:**
- Tone.js Players might not be fully "hot" when first triggered
- First few milliseconds can have higher latency

**Solution:** Pre-warm players by scheduling silent playback on load.

---

### 4. **Browser Audio Context Suspension** 🟠 MODERATE ISSUE

**Problem:**
- Browsers suspend AudioContext after ~6 seconds of inactivity to save resources
- Resuming takes 10-30ms
- User experiences delay after brief pause

**Solution:** Keep AudioContext alive with periodic silent ticks.

---

### 5. **Multiple Player Instances (Synth)** 🟢 NOT AN ISSUE (Current Implementation is Good)

**Current:** Creates 13 pre-loaded players for synth (one per semitone)

**Good:** This is actually the correct approach - pre-loading is optimal.

---

## 🎯 Solutions (Priority Order)

### **Priority 1: Pre-initialize AudioContext** ⭐ CRITICAL

**Implementation:**

```typescript
// In a new file: src/lib/audioInit.ts
import * as Tone from 'tone';

let audioInitialized = false;

export const initializeAudio = async () => {
  if (audioInitialized) return;

  try {
    await Tone.start();
    await Tone.Transport.start();
    console.log('✅ Audio context initialized');
    audioInitialized = true;
  } catch (error) {
    console.error('Failed to initialize audio:', error);
  }
};

// Call this on first user interaction (click anywhere on page)
export const warmUpAudio = () => {
  if (!audioInitialized) {
    initializeAudio();
  }
};
```

**In Cell.tsx or App-level:**
```typescript
useEffect(() => {
  const handleFirstInteraction = () => {
    initializeAudio();
    // Remove listener after first interaction
    document.removeEventListener('click', handleFirstInteraction);
    document.removeEventListener('keydown', handleFirstInteraction);
  };

  document.addEventListener('click', handleFirstInteraction);
  document.addEventListener('keydown', handleFirstInteraction);

  return () => {
    document.removeEventListener('click', handleFirstInteraction);
    document.removeEventListener('keydown', handleFirstInteraction);
  };
}, []);
```

**Then in SoundControls.tsx**, remove the conditional check:
```typescript
// BEFORE:
if (Tone.Transport.state !== 'started') {
  Tone.start().then(() => { ... });
} else {
  player.start();
}

// AFTER (assuming AudioContext is pre-initialized):
player.start(); // Instant!
```

**Impact:**
- ✅ Eliminates 10-50ms delay on keypress
- ✅ Makes playback feel instant
- ✅ Consistent latency across all keypresses

---

### **Priority 2: Move setState After Audio Playback**

**Current:**
```typescript
setPressedSynthKeys(prev => new Set(prev).add(key)); // ← Do this AFTER
const player = synthPlayersRef.current.get(semitone);
player.start(); // ← Audio starts late
```

**Optimized:**
```typescript
const player = synthPlayersRef.current.get(semitone);
player.start(); // ← Start audio IMMEDIATELY

// Update visual feedback after (or in rAF)
requestAnimationFrame(() => {
  setPressedSynthKeys(prev => new Set(prev).add(key));
});
```

**Impact:**
- ✅ Shaves off 1-5ms
- ✅ Audio triggers before React re-render

---

### **Priority 3: Pre-warm Audio Buffers**

**After loading audio, "prime" the players:**

```typescript
useEffect(() => {
  if (!audioUrl) return;

  // ... create players ...

  // Pre-warm: Schedule silent playback at time=0 (won't be audible)
  if (category === 'synth_timbre') {
    synthPlayersRef.current.forEach((player) => {
      player.volume.value = -Infinity; // Mute
      player.start('+0.01'); // Trigger in 10ms
      player.stop('+0.02'); // Stop immediately
      player.volume.value = Tone.gainToDb(volume); // Restore volume
    });
  }
}, [audioUrl]);
```

**Impact:**
- ✅ Reduces latency on first playback by ~5-10ms
- ✅ Ensures buffers are "hot"

---

### **Priority 4: Keep AudioContext Alive**

**Prevent browser from suspending AudioContext during idle:**

```typescript
// In audioInit.ts or globally
let keepAliveInterval: number | null = null;

export const startKeepAlive = () => {
  if (keepAliveInterval) return;

  // Create silent oscillator that plays periodically
  const silentOsc = new Tone.Oscillator(20000, 'sine').toDestination(); // 20kHz = inaudible
  silentOsc.volume.value = -100; // Extremely quiet
  silentOsc.start();

  // Pulse every 3 seconds to prevent suspension
  keepAliveInterval = window.setInterval(() => {
    silentOsc.frequency.value = 20000; // Trigger tiny CPU activity
  }, 3000);
};

export const stopKeepAlive = () => {
  if (keepAliveInterval) {
    clearInterval(keepAliveInterval);
    keepAliveInterval = null;
  }
};
```

**Impact:**
- ✅ Prevents AudioContext suspension after inactivity
- ✅ Maintains consistent low latency
- ⚠️ Minor CPU usage (negligible)

---

### **Priority 5: Use Lower-Latency Audio Settings**

**Configure Tone.js for low latency:**

```typescript
// In audioInit.ts
export const initializeAudio = async () => {
  // Set Tone.js latencyHint to 'interactive' (lowest latency mode)
  Tone.context.latencyHint = 'interactive'; // Default is 'interactive', but ensure it
  Tone.context.lookAhead = 0.01; // Look ahead 10ms (default is 0.1s)

  await Tone.start();
  await Tone.Transport.start();

  console.log('✅ Audio initialized with low latency settings');
  console.log('   - Context state:', Tone.context.state);
  console.log('   - Base latency:', Tone.context.baseLatency);
  console.log('   - Output latency:', Tone.context.outputLatency);
};
```

**Impact:**
- ✅ Reduces browser audio buffer size
- ✅ Lower latency but slightly higher CPU usage
- ✅ Typically reduces latency by 5-20ms

---

### **Priority 6: Direct Buffer Playback (Advanced)**

**For ultra-low latency, bypass Tone.Players and use raw Web Audio API:**

```typescript
// This is more complex but gives maximum control
const playAudioBuffer = (buffer: AudioBuffer, semitone: number = 0) => {
  const source = Tone.context.createBufferSource();
  source.buffer = buffer;
  source.playbackRate.value = Math.pow(2, semitone / 12); // Pitch shift
  source.connect(Tone.Destination);
  source.start(Tone.context.currentTime); // Start immediately
};
```

**Impact:**
- ✅ Lowest possible latency (~2-5ms)
- ⚠️ More complex to implement
- ⚠️ Lose some Tone.js conveniences

---

## 📊 Expected Results

### **Before Optimizations:**
- First keypress: **30-100ms** latency
- Subsequent keypresses: **10-30ms** latency
- After idle: **30-100ms** latency (AudioContext suspended)
- **Result:** Feels laggy, can't play rhythmically

### **After Priority 1-3 (Quick Wins):**
- First keypress: **<10ms** latency ✅
- Subsequent keypresses: **<10ms** latency ✅
- After idle: **<10ms** latency ✅
- **Result:** Feels instant, playable!

### **After All Optimizations:**
- All keypresses: **2-5ms** latency ✅
- **Result:** Professional-grade responsiveness

---

## 🛠️ Implementation Checklist

### Phase 1: Critical Fixes (1-2 hours) ⭐
- [ ] Create `src/lib/audioInit.ts` with pre-initialization logic
- [ ] Call `initializeAudio()` on first user interaction
- [ ] Remove `Tone.start()` checks from keyboard handlers
- [ ] Test latency improvement

### Phase 2: Fine-Tuning (30 min)
- [ ] Move `setState` calls after `player.start()`
- [ ] Pre-warm audio buffers after loading
- [ ] Configure `latencyHint` and `lookAhead`

### Phase 3: Keep-Alive (30 min)
- [ ] Implement silent oscillator keep-alive
- [ ] Start keep-alive when first sound loads
- [ ] Test after 10+ seconds of inactivity

### Phase 4: Monitoring
- [ ] Add latency logging for debugging
- [ ] Test on different browsers (Chrome, Firefox, Safari)
- [ ] Test on different devices (desktop, mobile, tablet)

---

## 🧪 Testing Latency

**Quick Test:**
1. Open DevTools console
2. Log timing in keyboard handler:
   ```typescript
   const handleKeyDown = (e: KeyboardEvent) => {
     const t0 = performance.now();
     player.start();
     const t1 = performance.now();
     console.log(`Latency: ${t1 - t0}ms`);
   };
   ```

**Proper Test:**
1. Use `Tone.context.currentTime` for audio-accurate timing
2. Measure time between keydown event and actual audio output (use headphones)
3. Target: <10ms for professional feel

---

## 🌐 Browser Compatibility

**Latency by Browser:**
- **Chrome:** Best (5-10ms with optimizations)
- **Firefox:** Good (10-15ms)
- **Safari:** Variable (10-30ms, sometimes higher)
- **Mobile:** Generally higher (20-50ms due to system audio)

**Web Audio API Support:**
- ✅ Chrome/Edge: Full support
- ✅ Firefox: Full support
- ⚠️ Safari: Supported but quirky (may need extra context resumption)
- ⚠️ Mobile browsers: Supported but higher latency

---

## 💡 Quick Summary

**The #1 issue:** Calling `Tone.start()` on every keypress.

**The #1 solution:** Pre-initialize AudioContext on first user interaction.

**Implementation:** ~1 hour
**Expected improvement:** 30-100ms → <10ms latency

Start with Priority 1, test, then add Priority 2-3 if needed. Priority 4-6 are for perfectionists!
