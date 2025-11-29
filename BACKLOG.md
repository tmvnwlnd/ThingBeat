# ThingBeat Backlog

## Known Issues

### 1. Synth Monophonic/Polyphonic Mode Switching
**Priority:** Medium
**Description:** The synth mode toggle between monophonic and polyphonic doesn't work correctly after the synth sound has been generated. Switching modes after creation causes the synth to break.

**Expected Behavior:**
- Monophonic mode: Only one note at a time, note stops when key is released
- Polyphonic mode: Multiple notes can play simultaneously
- Should be able to switch between modes at any time without breaking the synth

**Current Status:** Partially implemented but not working reliably

---

### 2. Missing Star Sprite Asset
**Priority:** Low
**Description:** The loading animation star sprite (`/icons/starsprite.gif`) returns a 404 error in the console.

**Impact:** Visual only - loading state shows without the animated sprite

**Fix:** Ensure the starsprite.gif file is in the public/icons directory

---

### 3. Audio Generation Latency
**Priority:** High
**Description:** There's noticeable latency when generating sounds through the ElevenLabs API.

**Potential Solutions:**
- Implement caching for similar descriptors
- Add progress indicators
- Optimize image compression before sending to Claude
- Consider using ElevenLabs streaming API if available

---

### 4. Drum Loop Cost Optimization
**Priority:** Medium
**Description:** Currently generating full-length drum loops. Could save costs by generating half the intended duration and looping it.

**Proposed Solution:**
- Generate drum loops at half the intended time (e.g., 2 bars instead of 4)
- Double/loop the audio on the client side to create the full loop
- This reduces ElevenLabs API costs for looping content

**Implementation Notes:**
- Only apply to `drum_loop` category
- May need to adjust duration_seconds calculation in `/src/app/api/generate-audio/route.ts`
- Use Tone.js to seamlessly loop the shorter audio

---

## Enhancements

### 5. Improve LLM Prompts for Better Sound Descriptions
**Priority:** Medium
**Description:** Refine the Claude Vision prompts to generate more accurate and creative sound descriptors.

**Current State**: Prompts work but could be more sophisticated to get better results from ElevenLabs.

**Potential Improvements**:
- Add more examples to the system prompt
- Fine-tune category-specific instructions
- Experiment with different prompt structures
- A/B test prompts to find optimal phrasing
- Consider adding context about desired sound characteristics

**Files to modify**:
- `src/lib/prompt.ts` - Update CATEGORY_PROMPTS

---

### 6. Export Performance as MP3
**Priority:** Medium
**Description:** Change the export format from WebM to MP3 for better compatibility and smaller file size.

**Current State**: Export currently saves performance as `performance.webm`

**Implementation Notes**:
- Tone.Recorder by default outputs WebM
- Need to convert to MP3 client-side or use different recording approach
- Options:
  - Use MediaRecorder API with MP3 codec if supported
  - Convert WebM to MP3 client-side using Web Audio API
  - Render audio offline and encode to MP3
- Consider using a library like lamejs for MP3 encoding

**Files to modify**:
- `src/components/Header.tsx` - handleExport function

---

## Feature Requests

### 1. Community Board for Sharing Jams
**Priority:** High (Big Feature)
**Description:** Create a community platform where users can share their ThingBeat creations with others.

**Proposed Features**:
- Upload and share completed jams (audio + snapshots)
- Browse community creations
- Like/favorite system
- Comment on jams
- User profiles
- Playback directly in browser
- Download others' sounds/performances
- Tag system (genre, mood, style)
- Search and filter functionality

**Technical Requirements**:
- **Backend**: Database for storing jams, users, metadata
  - Consider: Supabase, Firebase, or custom Node.js backend
- **Storage**: Cloud storage for audio files and images
  - Consider: AWS S3, Cloudflare R2, or Firebase Storage
- **Authentication**: User accounts and login
  - Consider: Auth0, Clerk, or Firebase Auth
- **Frontend**: New pages/components
  - Community board page
  - Jam detail page
  - User profile page
  - Upload/share modal

**Implementation Phases**:
1. Backend setup (database, storage, API)
2. User authentication system
3. Upload functionality
4. Community board UI (list view)
5. Jam detail page with playback
6. Social features (likes, comments)
7. Search and filtering
8. User profiles

**Estimated Scope**: Large (2-4 weeks of development)

---

## Technical Debt

*None currently*
