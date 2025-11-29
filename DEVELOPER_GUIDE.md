# ThingBeat Developer Guide

Welcome to ThingBeat! This guide will help you understand the codebase and get started with development.

## Table of Contents
1. [Quick Start](#quick-start)
2. [Project Overview](#project-overview)
3. [Architecture](#architecture)
4. [Key Concepts](#key-concepts)
5. [Component Guide](#component-guide)
6. [State Management](#state-management)
7. [API Routes](#api-routes)
8. [Audio System](#audio-system)
9. [Common Tasks](#common-tasks)
10. [Troubleshooting](#troubleshooting)

---

## Quick Start

### Prerequisites
- Node.js 18+ and npm
- Webcam access
- API keys for Claude (Anthropic) and ElevenLabs

### Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ThingBeat
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**

   Create `.env.local` in the project root:
   ```env
   ANTHROPIC_API_KEY=sk-ant-api...
   ELEVENLABS_API_KEY=sk_...
   ```

4. **Run development server**
   ```bash
   npm run dev
   ```

5. **Open in browser**

   Navigate to `http://localhost:3000`

---

## Project Overview

ThingBeat is an AI-powered sound creation tool that transforms webcam snapshots into playable sounds using Claude Vision and ElevenLabs APIs.

**Core Flow**:
1. User shows object to webcam → posterized video feed
2. User selects sound category and clicks record
3. Snapshot sent to Claude Vision → receives descriptor
4. Descriptor sent to ElevenLabs → receives MP3 audio
5. Audio loaded into Tone.js for playback with type-specific controls

**Tech Stack**:
- **Framework**: Next.js 14 (App Router) with TypeScript
- **Styling**: Tailwind CSS
- **State**: Zustand
- **Audio**: Tone.js + WaveSurfer.js
- **AI**: Anthropic Claude (Vision) + ElevenLabs (Sound Generation)
- **Utilities**: JSZip (exports)

---

## Architecture

### Directory Structure

```
src/
├── app/
│   ├── api/                    # API route handlers
│   │   ├── describe/
│   │   │   └── route.ts       # Claude Vision endpoint
│   │   └── generate-audio/
│   │       └── route.ts       # ElevenLabs endpoint
│   ├── globals.css            # Global styles + Tailwind
│   ├── layout.tsx             # Root layout with font
│   └── page.tsx               # Main app page
│
├── components/                 # React components
│   ├── CameraGrid.tsx         # 3x3 grid container
│   ├── Cell.tsx               # Individual cell with states
│   ├── Dropdown.tsx           # Category selector
│   ├── Header.tsx             # Top bar with controls
│   ├── SoundControls.tsx      # Audio playback UI
│   ├── SynthKeyboard.tsx      # Visual keyboard for synth
│   └── VolumeSlider.tsx       # Custom slider component
│
├── hooks/
│   └── useWebcam.ts           # Webcam access hook
│
├── lib/                        # Utilities and helpers
│   ├── prompt.ts              # Category definitions + prompts
│   └── sfx.ts                 # ElevenLabs request builder
│
└── store/
    └── useStore.ts            # Zustand state management
```

### Data Flow

```
User Action (click record button)
    ↓
Cell.tsx captures snapshot from canvas
    ↓
POST /api/describe (snapshot + category)
    ↓
Claude Vision returns descriptor string
    ↓
POST /api/generate-audio (descriptor + settings)
    ↓
ElevenLabs returns MP3 as base64 data URL
    ↓
Tone.js Player loads and plays audio
    ↓
SoundControls renders type-specific UI
```

---

## Key Concepts

### Sound Categories

ThingBeat supports 5 sound categories, each with unique behavior:

| Category | Duration | Loop | Special Features |
|----------|----------|------|------------------|
| **Drum Loop** | 4s | Yes | Speed multiplier (1×-4×) |
| **Drum One-Shot** | 1.5s | No | Keyboard triggers (Q-O) |
| **Synth Timbre** | 4s | No | Playable keyboard (Z-<), pitch shifting |
| **Texture** | 10s | Yes | Ambient/evolving sound |
| **Lead Line** | 8s | No | Melodic motif |

### Cell States

Each cell can be in one of four states:

- **`idle`**: Live webcam feed with category dropdown
- **`loading`**: Snapshot with pulsating star, "Generating..." text
- **`ready`**: Snapshot with sound controls (varies by category)
- **`error`**: Red background with error message

### Video Processing

- Single webcam stream feeds all 9 cells
- Each cell renders video to its own `<canvas>`
- **Posterization algorithm**:
  ```javascript
  // Convert to grayscale
  const gray = 0.2126 * r + 0.7152 * g + 0.0722 * b;

  // Threshold at 128
  if (gray > 128) {
    // White
    r = g = b = 255;
  } else {
    // ThingBeat Blue (#2600FF)
    r = 38; g = 0; b = 255;
  }
  ```

### Synth Pitch Shifting

The synth creates 13 separate Tone.Players, each pitch-shifted using:

```javascript
playbackRate = Math.pow(2, semitone / 12)
```

This formula creates a chromatic scale:
- semitone 0 = root note (C)
- semitone 1 = C# (2^(1/12) = 1.059)
- semitone 12 = C one octave up (2^(12/12) = 2.0)

---

## Component Guide

### Header.tsx

**Purpose**: Global controls and settings

**Key Functions**:
- `handleExport()`: Initiates recording and ZIP export process
- `toggleSynthMode()`: Switches between mono/poly synth modes
- BPM/Key/Loop Length increment/decrement handlers

**Export Process**:
1. Wait for next loop start (calculated from Tone.Transport position)
2. Record 2 full loops using Tone.Recorder
3. Create ZIP with performance.webm + individual MP3 files
4. Auto-download

### Cell.tsx

**Purpose**: Manages individual cell state and rendering

**Key Logic**:
- Posterization effect in `useEffect` with video frame drawing
- Snapshot capture with canvas downscaling (400x225 JPEG 70%)
- Two-step API call chain: `/api/describe` → `/api/generate-audio`
- Synth constraint enforcement (only one allowed globally)

**Important**: Cells use absolute cellId (0-8) for keyboard mapping.

### SoundControls.tsx

**Purpose**: Type-specific audio playback controls

**Key Features**:
- Conditional rendering based on `category` prop
- Separate player initialization for synth (13 players) vs others (1 player)
- Keyboard event listeners for drum one-shots and synth
- Volume/mute management synced with global state
- WaveSurfer.js waveform visualization

**Synth Mode Switching**:
- Effect on line 168-178 stops all notes when mode changes
- Prevents audio artifacts during mono/poly toggle

### SynthKeyboard.tsx

**Purpose**: Visual representation of synth keyboard

**Layout**:
- Top row: 5 black keys with gaps (S, D, _, G, H, J, _)
- Bottom row: 8 white keys (Z, X, C, V, B, N, M, <)
- Color inverts when key is pressed (tracked via `pressedKeys` Set)

---

## State Management

### Zustand Store (`useStore.ts`)

**Global State**:
```typescript
{
  settings: {
    bpm: number;           // 60-300
    key: string;           // "C" to "B", with " minor" suffix
    loopLength: number;    // 1, 2, 4, 8, or 16 bars
    muteAll: boolean;
    synthMonophonic: boolean;
  },
  cells: CellData[];       // Array of 9 cells
  isGenerating: boolean;   // Prevent concurrent API calls
  hasSynth: boolean;       // Synth constraint flag
  exportState: ExportState; // 'idle' | 'waiting' | 'recording' | 'processing'
  videoStream: MediaStream | null;
}
```

**Cell Data Structure**:
```typescript
{
  id: number;              // 0-8
  state: CellState;        // 'idle' | 'loading' | 'ready' | 'error'
  category: SoundCategory | null;
  snapshot: string | null; // base64 image data
  audioUrl: string | null; // base64 audio data URL
  llmDescriptor: string | null;
  volume: number;          // 0-1
  error: string | null;
}
```

**Key Actions**:
- `updateCell(id, data)`: Partial update of cell
- `resetCell(id)`: Return cell to initial state
- `updateSettings(settings)`: Update global settings
- `setIsGenerating(value)`: Lock/unlock generation
- `setHasSynth(value)`: Track synth constraint

---

## API Routes

### POST /api/describe

**Purpose**: Describe snapshot using Claude Vision

**Request**:
```typescript
{
  imageData: string;  // base64 data URL
  category: SoundCategory;
}
```

**Response**:
```typescript
{
  descriptor: string;  // comma-separated adjectives/nouns
}
```

**Implementation Details**:
- Uses Anthropic SDK with Claude Sonnet 4.5
- Category-specific system prompts defined in `src/lib/prompt.ts`
- Image sent as base64 in message content
- Returns single line of descriptors (max 12 tokens)

### POST /api/generate-audio

**Purpose**: Generate sound using ElevenLabs

**Request**:
```typescript
{
  descriptor: string;
  category: SoundCategory;
  settings: {
    bpm: number;
    key: string;
    loopLength: number;
  };
}
```

**Response**:
```typescript
{
  audioUrl: string;  // base64 data URL (MP3)
}
```

**Implementation Details**:
- Uses ElevenLabs Sound Generation API
- Output format: MP3 44.1kHz 128kbps (query parameter)
- Text prompt built using `buildSfxRequest()` from `src/lib/sfx.ts`
- Returns audio as base64 data URL for immediate playback

---

## Audio System

### Tone.js Integration

**Initialization**:
```javascript
// Must be called on user interaction
await Tone.start();
Tone.Transport.start();
```

**Player Creation**:
```javascript
// Standard player (drum loop, texture, lead line)
const player = new Tone.Player({
  url: audioUrl,
  loop: shouldLoop,
  volume: Tone.gainToDb(volume),
  onload: () => { /* ready callback */ }
}).toDestination();

// Synth player (pitch-shifted)
const player = new Tone.Player({
  url: audioUrl,
  playbackRate: Math.pow(2, semitone / 12),
  // ...
});
```

**Recording**:
```javascript
const recorder = new Tone.Recorder();
Tone.getDestination().connect(recorder);
recorder.start();
// ... wait ...
const blob = await recorder.stop();
```

### WaveSurfer.js

**Configuration**:
```javascript
WaveSurfer.create({
  container: element,
  waveColor: '#FFFFFF',
  progressColor: '#FFFFFF',
  barWidth: 2,
  barGap: 4,
  height: 22,
  normalize: true,
  interact: false,  // Display only, no seeking
});
```

---

## Common Tasks

### Adding a New Sound Category

1. **Update type definition** in `src/lib/prompt.ts`:
   ```typescript
   export const SOUND_CATEGORIES = {
     // ...
     new_category: 'new_category',
   } as const;
   ```

2. **Add prompts** in `src/lib/prompt.ts`:
   ```typescript
   export const CATEGORY_PROMPTS = {
     new_category: {
       system: "...",
       user: "...",
     },
   };
   ```

3. **Add SFX configuration** in `src/lib/sfx.ts`:
   ```typescript
   case 'new_category':
     return {
       text: `new category, ${descriptor}`,
       duration_seconds: 5,
       loop: false,
     };
   ```

4. **Add label** in `src/components/Cell.tsx` and `SoundControls.tsx`:
   ```typescript
   const CATEGORY_LABELS: Record<SoundCategory, string> = {
     new_category: 'New Category',
   };
   ```

5. **Add controls** in `SoundControls.tsx` if category needs special UI

### Modifying Keyboard Mappings

**Drum One-Shots** (`SoundControls.tsx:32`):
```typescript
const DRUM_KEYS = ['Q', 'W', 'E', ...];  // Update array
```

**Synth** (`SoundControls.tsx:36-50`):
```typescript
const SYNTH_KEY_MAP: Record<string, number> = {
  'z': 0,  // Add/modify key-semitone pairs
  // ...
};
```

**SynthKeyboard Visual** (`SynthKeyboard.tsx:8-9`):
```typescript
const WHITE_KEYS = ['z', 'x', ...];  // Must match SYNTH_KEY_MAP
const BLACK_KEYS = ['s', 'd', '', ...];  // '' for gaps
```

### Adjusting Audio Duration

Edit `src/lib/sfx.ts`:
```typescript
export function buildSfxRequest(
  category: SoundCategory,
  descriptor: string,
  settings: GlobalSettings
): SfxRequest {
  switch (category) {
    case 'drum_loop':
      return {
        // ...
        duration_seconds: 8,  // Change from 4 to 8
      };
  }
}
```

### Changing Visual Style

**Colors** - Update `tailwind.config.ts`:
```typescript
colors: {
  'thingbeat-blue': '#2600FF',  // Change hex
  'thingbeat-white': '#FFFFFF',
}
```

**Posterization Threshold** - Edit `src/components/Cell.tsx:65`:
```javascript
if (gray > 128) {  // Adjust threshold (0-255)
```

---

## Troubleshooting

### Webcam Not Working

**Issue**: Black screen in cells

**Solutions**:
1. Check browser permissions (camera access)
2. Ensure HTTPS or localhost (required for getUserMedia)
3. Check console for errors from `useWebcam.ts`
4. Try different browser (Chrome/Edge recommended)

### Audio Not Playing

**Issue**: Generated sound doesn't play

**Solutions**:
1. Check if Tone.Transport is started (requires user interaction)
2. Verify audio URL is valid base64 data URL
3. Check volume slider isn't at 0
4. Check global mute isn't enabled
5. Look for Tone.js errors in console

### API Errors

**Issue**: 401 Unauthorized or 500 errors

**Solutions**:
1. Verify API keys in `.env.local`
2. Restart dev server after changing `.env.local`
3. Check API key validity (not expired/revoked)
4. Check network tab for full error response
5. Review API logs in `/api/describe` or `/api/generate-audio`

### Export Not Working

**Issue**: Export button stuck or doesn't download

**Solutions**:
1. Ensure at least one sound is generated
2. Check if Tone.Transport is running
3. Verify browser allows downloads
4. Check console for ZIP creation errors
5. Try smaller export (fewer cells) to test

### Synth Not Responding

**Issue**: Keyboard keys don't play synth notes

**Solutions**:
1. Verify synth sound was generated successfully
2. Check if input field has focus (blocks keyboard events)
3. Ensure category is exactly `'synth_timbre'`
4. Check if all 13 players initialized in console
5. Verify Tone.Transport is started

---

## Performance Optimization

### Image Compression

Snapshots are compressed before API calls:
- Downscaled to 400×225 (from 640×360)
- JPEG format at 70% quality
- Reduces API costs and latency

**Location**: `src/components/Cell.tsx:103-115`

### Audio Format

ElevenLabs returns MP3 44.1kHz 128kbps:
- Good quality-to-size ratio
- Fast streaming
- Browser-native decode

### Caching Opportunities

**Not yet implemented** - potential improvements:
- Cache Claude descriptors for identical snapshots
- Local storage for generated sounds
- Service worker for offline playback

---

## Useful Commands

```bash
# Development
npm run dev          # Start dev server

# Building
npm run build        # Production build
npm start           # Run production build

# Linting
npm run lint        # Run ESLint

# Dependencies
npm install         # Install all dependencies
npm audit          # Check for vulnerabilities
```

---

## Additional Resources

- **README.md**: Product specification and overview
- **TASKS.md**: Implementation checklist
- **CHANGELOG.md**: Detailed development history
- **BACKLOG.md**: Known issues and future work

- [Next.js Documentation](https://nextjs.org/docs)
- [Tone.js Guide](https://tonejs.github.io/)
- [Zustand Documentation](https://github.com/pmndrs/zustand)
- [Claude API Reference](https://docs.anthropic.com/)
- [ElevenLabs API Docs](https://elevenlabs.io/docs)

---

## Getting Help

When debugging:
1. Check browser console for errors
2. Review network tab for API failures
3. Check Tone.js state: `Tone.Transport.state`
4. Inspect Zustand store: `useStore.getState()`
5. Look for detailed logs from API routes (enabled in development)

If you find bugs or have questions, refer to BACKLOG.md for known issues or create a new issue in the repository.

Happy coding! 🎵
