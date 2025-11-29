# ThingBeat - Implementation Tasks (Completed)

This document outlines the implementation tasks for ThingBeat. All core features have been completed.

## 1. Setup ✅

- [x] Next.js (TypeScript), Tailwind, Zustand, Tone.js, WaveSurfer.js
- [x] Create .env.local with ANTHROPIC_API_KEY + ELEVENLABS_API_KEY
- [x] Connect repo to GitHub
- [x] Install additional dependencies: JSZip for export functionality

## 2. Camera Grid & Main Layout ✅

- [x] Blue/white color scheme (#2600FF / #FFFFFF)
- [x] One webcam stream → drawn into 9 canvases
- [x] Posterized video/snapshots to blue/white (threshold-based)
- [x] Crisp, instant transitions
- [x] Idle state shows dropdown (category) with random default selection
- [x] Silkscreen font throughout

## 3. Category-First Workflow ✅

- [x] On record button click: freeze snapshot → send to /api/describe → /api/generate-audio
- [x] Loading state with pulsating star sprite GIF
- [x] Replace with sound controls once audio arrives
- [x] Cancel button during generation

## 4. Global Constraints ✅

- [x] Only one Synth across the grid; disable "Synth timbre" in all dropdowns after first is generated
- [x] Only one sound generation at a time (prevent concurrent API calls)
- [x] Drum loops - **NOT YET IMPLEMENTED**: Request half duration from ElevenLabs, play twice at runtime (on backlog)

## 5. Prompts & Sound Generation ✅

- [x] Implement `src/lib/prompt.ts` for category definitions and Claude Vision prompts
- [x] Implement `src/lib/sfx.ts` with `buildSfxRequest` helper
- [x] Category-specific prompts for both Claude and ElevenLabs
- [x] Image compression (400x225 JPEG 70%) to reduce costs
- [x] Two-step pipeline: Claude Vision → ElevenLabs

## 6. Sound Playback (Tone.js) ✅

**Drum Loops**:
- [x] Auto-loop continuously
- [x] Speed multiplier button (1× → 1.5× → 2× → 3× → 4× → 1×)
- [ ] Generate at half length and double (on backlog)

**Drum One-Shots**:
- [x] Map to Q–O keyboard keys (cells 0-8)
- [x] Trigger playback via Player.start()
- [x] Flash cell white for 0.1 seconds
- [x] Show assigned key on trigger button
- [x] Display sample duration

**Synth Timbre**:
- [x] Map keyboard: Z X C V B N M , (white keys), S D G H J (black keys)
- [x] Pitch-shift using playbackRate: 2^(semitones/12) formula
- [x] Create 13 separate players (one per semitone)
- [x] Mini keyboard visual component with press feedback
- [x] Monophonic/Polyphonic mode toggle in header
- [x] Only one synth allowed globally

**Textures**:
- [x] Loop playback continuously (10 seconds)
- [x] No extra controls, volume + delete only

**Lead Line**:
- [x] Play generated motif (8 seconds)
- [x] No extra controls, volume + delete only

**All categories**:
- [x] Sync to Tone.Transport with global BPM
- [x] Global mute functionality

## 7. Header ✅

- [x] Logo + global settings (Key, BPM, Loop length)
- [x] Key: C-B with Major/Minor toggle
- [x] BPM: 60-300 with increment/decrement
- [x] Loop Length: 1, 2, 4, 8, 16 bars
- [x] Mute All button
- [x] Mono Synth checkbox toggle
- [x] Export button

## 8. States & Controls ✅

- [x] Idle state (live video + dropdown + record button)
- [x] Loading state (snapshot + star GIF + cancel button)
- [x] Ready state (snapshot + type-specific controls)
- [x] Error state (basic implementation)
- [x] Waveform visualization (WaveSurfer.js)
- [x] Custom volume slider component
- [x] Delete functionality

## 9. Export ✅

- [x] Export button in header
- [x] Wait for next loop start ("Waiting to record..." state)
- [x] Record 2 full loops ("Recording..." state)
- [x] Create ZIP file containing:
  - [x] performance.webm (2-loop recording)
  - [x] sounds/ folder with individual MP3 files
- [x] Auto-download ZIP file
- [x] Uses Tone.Recorder and JSZip

## Known Issues (See BACKLOG.md)

- Synth monophonic/polyphonic mode switching not fully working
- Star sprite asset (starsprite.gif) returns 404
- Audio generation latency could be optimized
- Drum loop cost optimization (half-length generation) not yet implemented

## File Structure

```
src/
├── app/
│   ├── api/
│   │   ├── describe/route.ts (Claude Vision)
│   │   └── generate-audio/route.ts (ElevenLabs)
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── CameraGrid.tsx
│   ├── Cell.tsx
│   ├── Dropdown.tsx
│   ├── Header.tsx
│   ├── SoundControls.tsx
│   ├── SynthKeyboard.tsx
│   └── VolumeSlider.tsx
├── hooks/
│   └── useWebcam.ts
├── lib/
│   ├── prompt.ts
│   └── sfx.ts
├── store/
│   └── useStore.ts
└── icons/
    ├── delete.svg
    ├── muted.svg
    ├── record.svg
    ├── star.svg
    ├── volume.svg
    └── starsprite.gif
```

## Status

**Core MVP: ✅ COMPLETE**

All basic functionality is implemented and working:
- AI-powered sound generation from webcam snapshots
- 5 sound categories with type-specific controls
- Keyboard-triggered drums and playable synth
- Global settings and controls
- Export functionality with recording

See BACKLOG.md for known issues and future enhancements.
