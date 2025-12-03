# ThingBeat Performance Optimization Strategies

## Current Architecture

**Sound Generation Pipeline:**
1. User clicks cell → Capture webcam snapshot
2. Send snapshot to Claude API (image → text descriptor)
3. Send descriptor to ElevenLabs API (text → audio)
4. Load audio into Tone.js Player
5. Initialize WaveSurfer waveform visualization

**Bottlenecks:**
- Claude API: ~2-4 seconds
- ElevenLabs API: ~5-10 seconds (varies by duration/complexity)
- Total latency: **7-14 seconds** per sound generation

---

## 🎯 High-Impact Optimizations

### 1. Implement Smart Caching System

**Problem:** Every generation requires 2 API calls, even for similar objects.

**Solution: Multi-level Cache**

```typescript
// Cache structure:
{
  "descriptor_cache": {
    "image_hash_123": {
      category: "drum_loop",
      descriptor: "wood, deep, hollow, resonant",
      timestamp: 1234567890
    }
  },
  "audio_cache": {
    "drum_loop:wood,deep,hollow:120bpm:4bars": {
      audioUrl: "data:audio/mp3;base64,...",
      timestamp: 1234567890
    }
  }
}
```

**Implementation:**
- Hash images (perceptual hash like pHash) to detect similar objects
- Cache Claude descriptors by image hash + category
- Cache audio by descriptor + settings (BPM, key, loop length)
- Use IndexedDB for persistent client-side storage
- Set cache expiry (e.g., 7 days)

**Impact:**
- ✅ **100% speedup** for repeated/similar objects (instant retrieval)
- ✅ Reduces API costs significantly
- ✅ Works offline after first generation

**Files to create:**
- `src/lib/cache.ts` - Caching logic and IndexedDB interface
- `src/lib/imageHash.ts` - Perceptual image hashing

---

### 2. Parallel API Calls (Minor gain, but easy)

**Current:** Sequential calls (Claude → ElevenLabs)

**Optimization:** While not fully parallelizable, we can prepare the ElevenLabs request earlier.

**Impact:** ~0.5s faster (minimal, but free)

---

### 3. Image Optimization

**Current:** Sending 400x225 JPEG at 70% quality

**Optimization:**
- Reduce to 320x180 (still legible for Claude)
- Try 60% quality (test if descriptor quality suffers)
- Consider WebP format (better compression, supported by Claude)

**Impact:**
- ✅ Faster uploads (~30-40% smaller)
- ✅ Lower Claude API costs (charged by image size)
- ⚠️ Must verify descriptor quality doesn't degrade

**Test:** Generate sounds with multiple quality settings and compare results.

---

### 4. Pre-generation on Hover (Speculative Loading)

**Concept:** Start API calls when user hovers over a cell, before clicking.

**Implementation:**
```typescript
const handleCellHover = () => {
  if (hoverTimeout) clearTimeout(hoverTimeout);
  hoverTimeout = setTimeout(() => {
    // Start API calls speculatively
    startGeneration({ speculative: true });
  }, 500); // Wait 500ms to avoid accidental triggers
};
```

**Impact:**
- ✅ Feels instant if user hovers then clicks
- ⚠️ Risk: Wasted API calls if user doesn't click
- 💡 Combine with cache to minimize waste

---

### 5. Progress Indicators & Perceived Performance

**Problem:** 7-14 seconds with no feedback feels longer than it is.

**Solution: Multi-stage Progress**

```
"Analyzing image..." [====-----] 30%
"Generating sound..." [=======--] 70%
"Almost done..." [=========] 95%
"Ready!" [==========] 100%
```

**Psychological Impact:**
- ✅ Makes wait feel ~30% shorter
- ✅ Shows the app is working, not frozen
- ✅ Educational (users see the AI pipeline)

**Enhanced Loading States:**
- Animate the starsprite.gif
- Show which API is currently processing
- Estimated time remaining
- Fun messages: "Teaching AI about wood textures...", "Sculpting soundwaves..."

---

### 6. Background Processing Queue

**Concept:** Allow users to queue multiple generations and continue using the app.

**Implementation:**
- Click cell → Enters "queued" state
- Process generations one at a time in background
- Notification when each completes
- User can continue exploring/playing other cells

**Impact:**
- ✅ Massive UX improvement
- ✅ Feels responsive even with long waits
- ⚠️ More complex state management

---

### 7. Audio Streaming (Future: ElevenLabs Streaming API)

**Current:** Wait for entire audio file before playback.

**Future:** If ElevenLabs adds streaming, play audio as it's generated.

**Impact:**
- ✅ Instant audio preview (first chunks arrive in ~2s)
- ✅ Can decide to regenerate early if sound is wrong

---

### 8. Client-Side Performance

**Canvas Posterization:**
- Currently runs every frame for all 9 cells
- Optimize: Only posterize visible/active cells
- Use OffscreenCanvas for better performance
- Consider WebGL shader for posterization (much faster)

**WaveSurfer:**
- Lazy load: Only render when cell is ready
- Lower waveform resolution for faster rendering
- Consider simpler visualization for performance

**Tone.js:**
- Reuse Tone.Transport (already doing this)
- Pre-load buffers when possible
- Dispose unused players promptly

---

## 🚀 Quick Wins (Easy to Implement)

### Priority 1: Progress Indicators
- **Time:** 1-2 hours
- **Impact:** High (perceived performance)
- **Cost:** Free

### Priority 2: Image Quality Testing
- **Time:** 30 minutes
- **Impact:** Medium (faster uploads, lower costs)
- **Cost:** Free

### Priority 3: Basic Caching (LocalStorage)
- **Time:** 2-3 hours
- **Impact:** Very High (instant for cached sounds)
- **Cost:** Free

---

## 🎯 Advanced Optimizations

### Priority 4: IndexedDB Caching with Image Hashing
- **Time:** 1-2 days
- **Impact:** Very High (robust offline support)
- **Cost:** Free

### Priority 5: Background Queue System
- **Time:** 2-3 days
- **Impact:** High (better UX for power users)
- **Cost:** Free

### Priority 6: Pre-generation on Hover
- **Time:** 1 day
- **Impact:** Medium (feels instant, but risks wasted API calls)
- **Cost:** Potentially higher API costs

---

## 📊 Expected Results

**Before Optimization:**
- Average generation time: 7-14 seconds
- User experience: "Slow, but worth it"

**After Quick Wins (Priority 1-3):**
- Average generation time: 7-14 seconds (same)
- Cached sounds: **Instant** (0.1s)
- User experience: "Feels faster!" (perceived performance)
- API cost reduction: ~20-30% (smaller images + some cache hits)

**After Advanced (Priority 4-6):**
- Average generation time: 5-12 seconds (optimized images)
- Cached sounds: **Instant** (0.1s)
- Cache hit rate: ~40-60% (smart hashing detects similar objects)
- User experience: "Fast and responsive!"
- API cost reduction: ~50-60% (high cache hit rate)

---

## 🛠️ Implementation Roadmap

### Phase 1: Perception (Week 1)
- ✅ Enhanced progress indicators
- ✅ Better loading messages
- ✅ Multi-stage progress bars

### Phase 2: Quick Optimization (Week 2)
- ✅ Test image quality settings
- ✅ Implement basic LocalStorage cache
- ✅ Add cache hit indicators

### Phase 3: Advanced Caching (Week 3-4)
- ✅ Implement perceptual image hashing
- ✅ IndexedDB persistent cache
- ✅ Cache management UI (clear cache, view stats)

### Phase 4: UX Enhancements (Week 5)
- ✅ Background queue system
- ✅ Notifications for completed generations
- ✅ Pre-generation on hover (with cache check)

---

## 🔍 Monitoring & Metrics

**Add Analytics to Track:**
- Average generation time per category
- Cache hit/miss rates
- Image size reduction impact
- User behavior (hover-to-click time, abandoned generations)

**Key Metrics:**
- Time to first sound (TTFS)
- Cache effectiveness
- API cost per user session
- User retention (are slow speeds causing drop-off?)

---

## ⚠️ Trade-offs to Consider

1. **Cache vs. Storage**
   - Pro: Instant retrieval, lower costs
   - Con: Uses ~5-10MB per cached sound (IndexedDB has ~50MB limit in some browsers)
   - Solution: LRU eviction, user-configurable cache size

2. **Image Quality vs. Speed**
   - Pro: Faster uploads, lower costs
   - Con: Risk of degraded sound quality if descriptors are less accurate
   - Solution: A/B test thoroughly before deploying

3. **Pre-generation vs. API Waste**
   - Pro: Feels instant
   - Con: Wasted API calls if user doesn't click
   - Solution: Only pre-generate if cache miss + high hover confidence (e.g., 1s+ hover)

4. **Queue System vs. Complexity**
   - Pro: Great UX for power users
   - Con: More complex state management, potential race conditions
   - Solution: Careful implementation with queue manager and clear UI

---

## 🎬 Conclusion

**The biggest win is caching** - it turns repeated generations from 7-14 seconds to instant. Combined with better progress indicators, ThingBeat will feel much faster even when API calls take the same time.

**Recommended Priority:**
1. Progress indicators (quick, high impact on perception)
2. Basic caching with LocalStorage (medium effort, huge impact)
3. Image optimization testing (quick, measurable improvement)
4. Advanced IndexedDB caching with image hashing (high effort, massive long-term benefit)
5. Background queue (nice-to-have for power users)

Start with #1 and #2 - they'll make the biggest difference with minimal development time.
