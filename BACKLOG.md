# ThingBeat Backlog

## Known Issues

### 1. Synth Monophonic/Polyphonic Mode Switching
**Priority:** ~~Medium~~ **RESOLVED** ✅
**Description:** ~~The synth mode toggle between monophonic and polyphonic doesn't work correctly after the synth sound has been generated. Switching modes after creation causes the synth to break.~~

**Resolution:** Removed the mono/poly toggle entirely. Synth now operates in polyphonic mode only (multiple notes can play simultaneously). This simplifies the codebase and removes a source of bugs.

**Current Behavior:**
- ✅ Polyphonic mode: Multiple notes can play simultaneously
- ✅ Works reliably with keyboard and QWERTY inputs

---

### 2. Missing Star Sprite Asset
**Priority:** ~~Low~~ **RESOLVED** ✅
**Description:** ~~The loading animation star sprite (`/icons/starsprite.gif`) returns a 404 error in the console.~~

**Resolution:** Added `starsprite.gif` to `public/icons/` directory. Loading animation now displays correctly.

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
**Priority:** ~~Medium~~ **COMPLETED** ✅
**Description:** ~~Currently generating full-length drum loops. Could save costs by generating half the intended duration and looping it.~~

**Status:** Already implemented in MVP! Drum loops are generated at half duration and looped seamlessly on playback.

**Implementation:**
- ✅ Generate drum loops at half duration in `src/lib/sfx.ts:44-45`
- ✅ Auto-loop on playback in `src/components/SoundControls.tsx:77,114`
- ✅ Saves 50% on ElevenLabs API costs for drum loops

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

### 7. Bayer-Matrix Dithering Filter
**Priority:** ~~Medium~~ **COMPLETED** ✅
**Description:** ~~Replace the current posterization effect with a Bayer-matrix dithering filter using the GLSL shader included in the repository.~~

**Status:** Implemented! WebGL shader with 8x8 Bayer matrix dithering now renders all cells.

**Implementation Details**:
- ✅ Converted `fragmentShader.glsl` to WebGL 1.0 compatible GLSL (avoiding integer operations)
- ✅ Implemented 8x8 Bayer matrix dithering algorithm
- ✅ GPU-accelerated WebGL rendering (much faster than 2D canvas pixel manipulation)
- ✅ Block size: 4 pixels (configurable via shader parameter)
- ✅ Pixelation + dithering for true retro aesthetic (no fine detail leaks through)
- ✅ Contrast adjustment: 1.5x (configurable)
- ✅ Maintains ThingBeat blue (38, 0, 255) and white color scheme
- ✅ Raw video capture for Claude API (full-color, not dithered)
- ✅ Dithered version displayed in UI only

**Files Modified**:
- ✅ `src/components/Cell.tsx` - Complete WebGL shader implementation
- ✅ `src/components/CellDithered.tsx` - Test component (can be removed or kept)
- ✅ `src/app/shader-test/page.tsx` - Test page for shader preview

---

### 8. Reverse Button for Textures
**Priority:** Medium
**Description:** Add a reverse button that plays texture sounds backwards for creative ambient effects.

**Current State**: Textures play forward only

**Affected Categories**:
- `texture` - Should have reverse playback option

**Implementation Notes**:
- Add a reverse toggle button in the SoundControls component for texture category
- Use Tone.js `reverse` property on the Player buffer
- Button should toggle between forward and reverse playback
- Visual indicator (icon or text) to show current playback direction
- Reverse should work in combination with volume and mute controls
- Consider auto-restart playback when toggling to hear the effect immediately

**Technical Approach**:
- Option 1: Use `player.reverse = true` in Tone.js (if supported)
- Option 2: Reverse the audio buffer data directly using Web Audio API
- Option 3: Create two players (forward and reverse) and swap between them

**Files to modify**:
- `src/components/SoundControls.tsx` - Add reverse button and playback logic
- `src/store/useStore.ts` - Track reverse state per cell (optional)

**UI Considerations**:
- Place button near play/pause controls for texture cells
- Use a simple icon (arrows pointing left or "REV" text)
- Only visible for texture category

---

### 9. Dynamic BPM Adjustment for Generated Sounds
**Priority:** ~~High~~ **COMPLETED** ✅
**Description:** ~~When BPM is changed after sounds have been generated, automatically speed up or slow down drum loops and melodies to match the new BPM.~~

**Status:** Implemented! BPM changes now automatically adjust playback rate for drum loops and melodies.

**Affected Categories**:
- `drum_loop` - Should adjust playback speed to match new BPM
- `lead_line` - Should adjust playback speed to match new BPM
- Other categories (drum_one_shot, synth_timbre, texture) are not affected by BPM changes

**Implementation Notes**:
- Use Tone.js playback rate manipulation
- Calculate playback rate: `newBPM / originalBPM`
- Store original BPM with each cell when generated
- Apply rate adjustment when BPM changes in global settings
- Ensure loops still sync properly after adjustment

**Files to modify**:
- `src/components/SoundControls.tsx` - Playback logic
- `src/store/useStore.ts` - Track original BPM per cell

---

### 10. Dynamic Key Transposition for Melodies
**Priority:** ~~High~~ **ON HOLD** ⏸️
**Description:** ~~When the key is changed after a melody has been generated, automatically transpose the melody to match the new key.~~

**Status:** Code implemented but UI controls disabled. Key changes are locked after sound generation to prevent interference with BPM adjustments. Transposition logic is ready for future re-enablement if needed.

**Affected Categories**:
- `lead_line` - Transposition implemented (UI-disabled)
- `synth_timbre` - Transposition implemented (UI-disabled)

**Implementation Notes** (Already Done):
- ✅ Calculate semitone difference between old and new key
- ✅ Use Tone.js pitch shifting to transpose sounds
- ✅ Store original key with each cell when generated
- Handle both major and minor keys correctly
- Consider using a key-to-semitone mapping (C=0, C#=1, D=2, etc.)

**Files to modify**:
- `src/components/SoundControls.tsx` - Playback logic for melodies
- `src/store/useStore.ts` - Track original key per cell
- `src/lib/prompt.ts` - May need key parsing utilities

---

### 11. Synth Keyboard Transposition
**Priority:** ~~High~~ **ON HOLD** ⏸️
**Description:** ~~When the key is changed in global settings, transpose the synth keyboard to match the new key.~~

**Status:** Code implemented but UI controls disabled. Key changes are locked after sound generation to prevent interference with BPM adjustments. Transposition logic is ready for future re-enablement if needed.

**Affected Categories**:
- `synth_timbre` - Keyboard transposition implemented (UI-disabled)

**Implementation Notes** (Already Done):
- ✅ Calculate semitone offset from global key setting
- ✅ Adjust all keyboard key mappings by the offset
- ✅ Update the pitch shifting calculation in keyboard handler
- ✅ Store the original key the synth was generated in
- Visual keyboard display could reflect the transposition (future enhancement)

**Files Modified**:
- ✅ `src/components/SoundControls.tsx` - Synth keyboard transposition logic
- ✅ `src/store/useStore.ts` - Track original key per synth cell

---

## Feature Requests

### 1. Background Queue for Sound Generation
**Priority:** Medium
**Description:** Allow users to queue multiple sound generations and continue using the app while sounds are being created.

**Current Behavior:**
- Click cell → App blocks until generation completes (7-14 seconds)
- Cannot interact with other cells during generation
- Must wait for one sound before creating another

**Proposed Behavior:**
- Click cell → Enters "queued" state immediately
- User can continue exploring and playing with other cells
- Process generations one at a time in background
- Visual indicator shows queue progress (e.g., "2 sounds in queue")
- Notification/flash when each sound completes
- Option to cancel queued generations

**Technical Requirements:**
- Queue manager in Zustand store
- Process one generation at a time (avoid parallel API calls)
- Handle queue state (queued, generating, completed, failed)
- Cancel/clear queue functionality
- Persist queue across page refresh (optional)

**UI/UX Considerations:**
- Small badge showing queue position on cells
- Global queue indicator in header ("3 sounds generating...")
- Toast notifications for completion
- Don't overwhelm user with too many simultaneous notifications

**Files to modify**:
- `src/store/useStore.ts` - Queue state management
- `src/components/Cell.tsx` - Queue integration
- `src/components/Header.tsx` - Global queue indicator
- New: `src/lib/generationQueue.ts` - Queue processing logic

**Estimated Scope**: Medium (2-3 days of development)

---

### 2. Community Board for Sharing Jams
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

### 2. MIDI Controller Support
**Priority:** Medium
**Description:** Add support for MIDI controllers to play and control ThingBeat sounds with external hardware.

**Proposed Features**:
- Detect and connect to MIDI devices via Web MIDI API
- Map MIDI notes to trigger sounds (especially for synths and drum one-shots)
- Map MIDI velocity to volume
- MIDI learn for custom key mappings
- Display connected MIDI devices in UI
- Support for MIDI CC (continuous controllers) for volume, effects, etc.
- Configurable MIDI channel selection

**Affected Components**:
- **Synth keyboard**: Play synth sounds with MIDI keyboard
- **Drum one-shots**: Trigger drum hits with MIDI pads/keys
- **Looping sounds**: Start/stop loops with MIDI triggers
- **Volume controls**: Map MIDI CC to cell volumes

**Technical Requirements**:
- Use Web MIDI API (browser support: Chrome, Edge, Opera)
- Handle MIDI device connection/disconnection events
- Store MIDI mappings in local storage or settings
- Add MIDI settings panel to UI
- Consider MIDI clock sync for BPM synchronization

**Implementation Notes**:
- Web MIDI API requires HTTPS
- Not supported in Firefox or Safari (need fallback message)
- Consider using a library like `webmidi.js` for easier MIDI handling
- Map MIDI note 60 (C4) to the synth's root note by default
- Allow custom octave shifting for different MIDI keyboards

**Files to modify/create**:
- New: `src/lib/midi.ts` - MIDI handling logic
- `src/components/SoundControls.tsx` - Add MIDI trigger support
- `src/components/Header.tsx` - MIDI settings/device selector
- `src/store/useStore.ts` - Store MIDI configuration

**Estimated Scope**: Medium (1-2 weeks of development)

---

## Technical Debt

*None currently*
