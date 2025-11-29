ThingBeat — Product Spec

ThingBeat turns everyday objects shown to your webcam into playable sounds—loops, one-shots, textures, synth timbres, or lead lines—so you can compose beats by interacting with the physical world.

## 1. Core User Flow

**Category first**: Each cell starts live with the webcam feed posterized to blue/white. A dropdown showing a randomly selected category and a record button (white square) are displayed at the bottom of each cell.

The user can change the category via the dropdown, then clicks the record button to capture a snapshot.

The snapshot and chosen category are immediately sent to the backend via a two-step pipeline:

1. **`/api/describe`**: Sends the snapshot to Claude Vision API with a category-specific prompt. Each sound type has its own distinct prompt template for consistent outputs. Returns a descriptor string (comma-separated adjectives/nouns).

2. **`/api/generate-audio`**: Sends the descriptor to ElevenLabs Sound Generation API with the matching prompt template for that sound type. Returns MP3 audio as a base64 data URL.

**Loading state**: The video feed is replaced by the snapshot with a pulsating star GIF overlay and "Generating [Category]..." text with a cancel button in the bottom bar.

**Ready state**: Once audio is ready, the star overlay disappears and the snapshot remains. The UI switches to sound controls, which vary per sound type.

The user can play/manipulate the sound or delete it to return the cell to idle state.

**Constraints**:
- Only one Synth sound is allowed in the entire grid. Once generated, "Synth timbre" is disabled in all other dropdowns.
- Only one sound can be generated at a time. While waiting for generation, no new snapshots can be made until the sound is received from the API.

## 2. Interaction & Controls (Per Type)

**Common to all types**:
- Snapshot thumbnail as background
- Waveform preview (WaveSurfer.js) showing the audio
- Category label displaying the sound type
- Volume button that opens a vertical slider overlay when clicked
- Delete button that removes the sound and resets the cell to idle state

**Drum Loop**:
- Auto-loops continuously
- Speed cycle button (1× → 1.5× → 2× → 3× → 4× → 1×)

**Drum One-Shot**:
- Mapped to Q–O keyboard keys (cells 0-8)
- Trigger button shows the assigned key letter
- Pressing the key or clicking the button triggers playback
- Cell flashes white for 0.1 seconds on trigger
- Duration display shows sample length

**Synth Timbre**:
- Playable with keyboard: white keys Z-< (Z X C V B N M ,) and black keys S D G H J
- Mini keyboard overlay shows which keys are pressed with color inversion
- Pitch-shifted using playbackRate: 2^(semitones/12) formula
- 13 notes total (one octave: C to C)
- Global monophonic/polyphonic mode toggle in header:
  - **Monophonic**: Only one note plays at a time, stops when key is released
  - **Polyphonic**: Multiple notes can play simultaneously
- Only one synth allowed globally

**Texture**:
- Auto-loops continuously
- 10-second evolving ambient sound
- No extra controls beyond volume/delete

**Lead Line**:
- Plays generated melodic motif
- 8-second duration
- No extra controls beyond volume/delete

## 3. Visual Design

**Style**: Techy, straight angles, crisp instant transitions, no rounded corners.

**Color Palette**:
- Deep Blue: `#2600FF` (ThingBeat Blue)
- White: `#FFFFFF`

**Typography**: Silkscreen (Google Font) used throughout the interface.

**Video & Snapshots**: Posterization filter converts webcam feed to two-tone (blue/white) using grayscale threshold at 128. Pixels above threshold become white, below become blue.

**Cell States**:
- **Idle**: Live posterized video feed + category dropdown + record button (white square)
- **Loading**: Frozen snapshot + pulsating star GIF + "Generating [Category]..." text + cancel button
- **Ready**: Snapshot background + type-specific sound controls
- **Error**: Red background with error text (basic implementation)

## 4. Component Breakdown

### Header (`src/components/Header.tsx`)
- **Logo**: "Thingbeat" text with white background
- **Global Settings**:
  - Loop Length: 1, 2, 4, 8, or 16 bars (increment/decrement buttons)
  - BPM: 60-300 (increment/decrement buttons)
  - Key: C through B, Major/Minor toggle
- **Global Controls**:
  - Mute All: Toggle button with icon
  - Mono Synth: Checkbox to toggle monophonic/polyphonic synth mode
  - Export: Button that initiates recording and export process

### CameraGrid (`src/components/CameraGrid.tsx`)
- 3×3 grid layout containing 9 Cell components
- Manages single webcam stream feeding all cells

### Cell (`src/components/Cell.tsx`)
- **Idle State**: Canvas with posterized live video feed + category dropdown + record button
- **Loading State**: Frozen snapshot + pulsating star GIF + generating text + cancel button
- **Ready State**: Renders SoundControls component with snapshot background
- **Error State**: Red background with error message

### SoundControls (`src/components/SoundControls.tsx`)
Renders type-specific controls based on category:
- Common: Waveform (WaveSurfer), label, volume button, delete button
- **Drum Loop**: Speed cycle button
- **Drum One-Shot**: Trigger button with key letter, duration display
- **Synth Timbre**: Mini keyboard overlay (SynthKeyboard component)
- **Texture/Lead Line**: Label and waveform only

### SynthKeyboard (`src/components/SynthKeyboard.tsx`)
- Visual representation of keyboard mapping
- 8 white keys (bottom row) + 5 black keys (top row with gaps)
- Shows pressed state with color inversion

### VolumeSlider (`src/components/VolumeSlider.tsx`)
- Custom vertical slider component
- Renders using React Portal above volume button
- Click outside to close functionality

### Dropdown (`src/components/Dropdown.tsx`)
- Custom category selector
- Disables "Synth timbre" option when synth exists globally

## 5. LLM Prompting

Each sound category uses its own prompt template for both Claude Vision (describe step) and ElevenLabs (generate step).

### Claude Vision Prompts (`/api/describe`)
All categories receive:
- **System Prompt**: Instructs to output ONE LINE of comma-separated nouns/adjectives only, max 12 tokens, ordered by importance
- **User Prompt**: Category-specific instructions

**Category-Specific Prompts**:
- **Drum Loop**: Infer percussive timbre and groove character (not exact rhythm)
- **Drum One-Shot**: Infer timbral identity (material, impact, resonance)
- **Synth Timbre**: Personify the object, describe synthesizer timbre (no rhythm/melody)
- **Texture**: Analyze environment/mood, infer evolving ambient texture (poetic)
- **Lead Line**: Infer melodic character (tone/articulation), include genre term

### ElevenLabs Prompts (`/api/generate-audio`)
Each category combines the descriptor with category-specific metadata:
- **Drum Loop**: `"drum loop, bpm:{BPM}, {descriptor}"` (4 seconds, loop=true)
- **Drum One-Shot**: `"drum one shot, {descriptor}"` (1.5 seconds, loop=false)
- **Synth Timbre**: `"synth, key:{KEY}, {descriptor}"` (4 seconds, loop=false)
- **Texture**: `"texture, {descriptor}"` (10 seconds, loop=true)
- **Lead Line**: `"lead line, key:{KEY}, bpm:{BPM}, {descriptor}"` (8 seconds, loop=false)

## 6. Export Functionality

The Export button in the header initiates a multi-stage recording and export process:

1. **Waiting State**: Calculates time until next loop start based on current BPM and loop length. Button shows "Waiting to record..."

2. **Recording State**: At the start of the next loop, begins recording via Tone.Recorder for exactly 2 full loops. Button shows "Recording..."

3. **Processing State**: After recording completes, creates a ZIP file containing:
   - `performance.webm` - The 2-loop recording of all playing sounds
   - `sounds/` folder - Individual MP3 files for each generated cell sound
     - Named as: `cell_{id}_{category}.mp3`

4. **Download**: Automatically downloads the ZIP file named `thingbeat_export_{timestamp}.zip`

Uses JSZip library for ZIP creation and Tone.Recorder for audio capture.

## 7. Architecture & Tech Stack

**Frontend**:
- Next.js 14 (React framework)
- TypeScript (type safety)
- Tailwind CSS (styling)

**State Management**:
- Zustand (global settings, cell states, export state)

**Audio Engine**:
- Tone.js (playback, looping, pitch shifting, recording)
- WaveSurfer.js (waveform visualization)

**Video Processing**:
- Single `<video>` source from webcam
- Painted into 9 `<canvas>` elements with posterization filter
- Threshold-based conversion: grayscale > 128 → white, ≤ 128 → blue (#2600FF)

**Backend (API Routes)**:
- `/api/describe` → Claude Vision API (Anthropic SDK), category-specific prompts
- `/api/generate-audio` → ElevenLabs Sound Generation API

**Utilities**:
- JSZip (ZIP file creation for exports)

**Development**:
- GitHub repository for version control
- npm for package management
