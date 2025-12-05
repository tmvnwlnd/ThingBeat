# ThingBeat Community Gallery - Implementation Plan

## Overview

A community platform where users can share their ThingBeat creations (beats) with others, including audio recordings, snapshots from all 9 cells, user metadata, and playback capabilities.

---

## Feature Breakdown

### 1. Record Button & Recording
**Location**: Header component (replaces Export button)

**Functionality**:
- Single "Record" button triggers recording sequence
- Records 2 full loops using Tone.Recorder
- Captures recording as WebM
- Captures all 9 cell snapshots (dithered blue/white images)
- Opens "Recording Actions" modal after recording completes

**Recording Process** (reuse existing export logic):
1. Wait for next loop start
2. Record 2 loops using Tone.Recorder
3. Store recording blob in memory
4. Collect all cell snapshots
5. Open "Recording Actions" modal

---

### 2. Recording Actions Modal (First Modal)
**Component**: `src/components/RecordingActionsModal.tsx` (new)

**UI Layout**:
```
┌─────────────────────────────────────┐
│  Your Recording                      │
├─────────────────────────────────────┤
│  [3x3 Grid of Cell Snapshots]       │
│                                      │
│  ┌─────────────────────────────┐   │
│  │ 🔊 [Full Audio Controls]    │   │
│  │ ▶️ ⏸️ ⏹️ ⏮️ ⏭️  [Timeline]  │   │
│  │ 🔊────────── 00:15 / 00:30  │   │
│  └─────────────────────────────┘   │
│                                      │
│  What would you like to do?          │
│                                      │
│  [ Delete ]  [ Download ]  [ Share ] │
└─────────────────────────────────────┘
```

**Actions**:
- **Delete**: Close modal and discard recording
- **Download**: Download as ZIP (performance.webm + individual MP3s), then close modal
- **Share to Gallery**: Open submission modal (Modal 2)

**Audio Controls** (styled with ThingBeat theme):
- Play/Pause button
- Stop button
- Restart button
- Timeline/progress bar with seek
- Current time / Total duration
- Volume control

---

### 3. Submission Modal (Second Modal)
**Component**: `src/components/SubmissionModal.tsx` (new)

**UI Layout**:
```
┌─────────────────────────────────────┐
│  Share to Community Gallery          │
├─────────────────────────────────────┤
│  [3x3 Grid of Cell Snapshots]       │
│                                      │
│  Beat Name: [________________]      │
│  Your Name: [________________]      │
│                                      │
│  [ Cancel ]      [ Share Beat ]     │
└─────────────────────────────────────┘
```

**Fields**:
- **3x3 Snapshot Grid**: Display all 9 cell snapshots (read-only preview)
- **Beat Name**: Text input (required, max 50 chars)
- **Your Name**: Text input (required, max 30 chars)
- **Cancel Button**: Go back to Recording Actions modal
- **Share Button**: Upload recording + metadata to backend, show success message, close all modals

**Data Validation**:
- Beat name: 1-50 characters, alphanumeric + spaces/punctuation
- User name: 1-30 characters, alphanumeric + spaces
- Recording: Must have valid audio blob
- Snapshots: At least 1 cell must have generated sound

---

### 4. Community Gallery Page
**Component**: `src/app/community/page.tsx` (new)

**UI Layout**:
```
┌────────────────────────────────────────────┐
│ THINGBEAT COMMUNITY GALLERY                │
├────────────────────────────────────────────┤
│ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐       │
│ │ [3x3]│ │ [3x3]│ │ [3x3]│ │ [3x3]│       │
│ │ Beat │ │ Beat │ │ Beat │ │ Beat │       │
│ │ Name │ │ Name │ │ Name │ │ Name │       │
│ │  By  │ │  By  │ │  By  │ │  By  │       │
│ │ User │ │ User │ │ User │ │ User │       │
│ │  ▶️  │ │  ▶️  │ │  ▶️  │ │  ▶️  │       │
│ └──────┘ └──────┘ └──────┘ └──────┘       │
│                                            │
│ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐       │
│ │ [3x3]│ │ [3x3]│ │ [3x3]│ │ [3x3]│       │
│ │ ...  │ │ ...  │ │ ...  │ │ ...  │       │
│ └──────┘ └──────┘ └──────┘ └──────┘       │
│                                            │
│  [← Prev]  Page 1 of 10  [Next →]         │
└────────────────────────────────────────────┘
```

**Features**:
- **Grid layout**: 4 columns × 6 rows = 24 beats per page
- **Pagination**: Simple prev/next buttons with page counter
- **Ordering**: Latest to oldest (by `created_at DESC`)
- **No filtering**: All approved beats shown
- **No likes**: Simplified engagement
- **Playback**: Click play button to stream audio
- **Responsive**: Adjust grid to 2-3 columns on mobile

**Beat Card Details**:
- 3x3 snapshot grid (small thumbnails, ~150x150px total)
- Beat name (truncated to 2 lines max)
- User name (truncated to 1 line)
- Play button (simple ▶️ icon)
- Timestamp (relative: "2h ago", "3d ago")

---

## Data Model

### Database Schema (PostgreSQL via Supabase)

#### `beats` Table
```sql
CREATE TABLE beats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Metadata
  beat_name VARCHAR(50) NOT NULL,
  user_name VARCHAR(30) NOT NULL,

  -- File references (Supabase Storage URLs)
  audio_url TEXT NOT NULL,

  -- Cell snapshots (array of 9 image URLs)
  snapshot_urls TEXT[] NOT NULL,

  -- Musical settings (for context)
  bpm INTEGER NOT NULL,
  key VARCHAR(10) NOT NULL,
  loop_length INTEGER NOT NULL,

  -- File size tracking (for cleanup)
  total_size_bytes BIGINT NOT NULL
);

-- Index for performance (latest first)
CREATE INDEX idx_beats_created_at ON beats(created_at DESC);
```

**Notes**:
- No `like_count` or `play_count` (simplified - no engagement tracking)
- No `is_flagged` or `is_approved` (manual moderation via Supabase dashboard)
- `total_size_bytes` used for storage cleanup (delete oldest when storage full)

### Supabase Storage Buckets

#### `beat-recordings` Bucket
- **Purpose**: Store audio files (WebM/MP3)
- **Access**: Public read, authenticated write
- **File naming**: `{uuid}.webm` or `{uuid}.mp3`
- **Size limit**: 10MB per file (2-loop recordings ~2-5MB)

#### `beat-snapshots` Bucket
- **Purpose**: Store cell snapshot images
- **Access**: Public read, authenticated write
- **File naming**: `{beat_id}/{cell_id}.jpg`
- **Size limit**: 1MB per image
- **Format**: JPEG, 400x225px (same as Claude API snapshots)

---

## Storage Solution: Supabase Free Tier with Auto-Cleanup

### DECISION: Use Supabase Free Tier

**Rationale**:
1. **All-in-one solution**: Database + Storage in single platform
2. **Zero cost**: 1GB storage on free tier (perfect for temporary gallery)
3. **Best developer experience**: Purpose-built for this exact use case
4. **Auto-cleanup**: Delete oldest beats when storage full (FIFO queue)
5. **No vendor lock-in**: Open-source, can upgrade or self-host if needed

**Free Tier Limits**:
- **Storage**: 1GB (enough for ~200-250 beats)
- **Bandwidth**: 2GB egress per month
- **Database size**: 500MB
- **API requests**: Unlimited

**Auto-Cleanup Strategy** (FIFO - First In, First Out):
1. Before uploading new beat, check current storage usage
2. If storage > 900MB (90% threshold), trigger cleanup
3. Delete oldest beat(s) until storage < 800MB
4. Cleanup deletes:
   - Database record from `beats` table
   - Audio file from `beat-recordings` bucket
   - 9 snapshot images from `beat-snapshots` bucket
5. Log deleted beat IDs for transparency

**Capacity Estimate**:
- Average beat size: 4MB (3MB audio + 1MB snapshots)
- 1GB ÷ 4MB = ~250 beats in gallery at any time
- Oldest beats automatically removed as new ones arrive
- Creates "rolling gallery" of latest community creations

**Implementation**:
- Create `/api/community/cleanup` endpoint
- Called before each upload (or via cron job)
- Query: `SELECT id, total_size_bytes FROM beats ORDER BY created_at ASC LIMIT 10`
- Delete files from storage, then database record
- Continue until storage below threshold

---

## Implementation Phases

### Phase 1: Backend Setup (2-3 days)
**Tasks**:
1. Create Supabase project
2. Set up PostgreSQL database schema (`beats`, `likes` tables)
3. Create storage buckets (`beat-recordings`, `beat-snapshots`)
4. Configure Row Level Security (RLS) policies
5. Install Supabase client SDK: `npm install @supabase/supabase-js @supabase/ssr`
6. Create Supabase client utilities for Next.js 14 App Router:
   - `src/lib/supabase/client.ts` (client-side)
   - `src/lib/supabase/server.ts` (server-side)
   - `src/lib/supabase/middleware.ts` (middleware)

**Files to create**:
- `src/lib/supabase/client.ts`
- `src/lib/supabase/server.ts`
- `.env.local` (add Supabase credentials)

---

### Phase 2: Record Button & Two-Modal Flow (3 days)
**Tasks**:
1. Replace "Export" button with "Record" button in Header
2. Update recording logic to open "Recording Actions" modal when complete
3. Add `recordingState` to Zustand store (idle/waiting/recording/processing/ready)
4. Capture all 9 cell snapshots after recording
5. Store recording blob and snapshots in memory
6. Create `RecordingActionsModal` component:
   - 3x3 snapshot grid display
   - Full audio player (play/pause/stop/seek/volume)
   - Delete, Download, Share buttons
7. Download button triggers ZIP export (existing logic)
8. Share button opens `SubmissionModal`

**Files to modify**:
- `src/components/Header.tsx` (replace Export button with Record)
- `src/store/useStore.ts` (add recording state)

**Files to create**:
- `src/components/RecordingActionsModal.tsx`

**New state**:
```typescript
type RecordingState = 'idle' | 'waiting' | 'recording' | 'processing' | 'ready';

type RecordingData = {
  recordingBlob: Blob | null;
  snapshots: (string | null)[]; // 9 cell snapshots
  zipBlob: Blob | null; // For download option
};
```

---

### Phase 3: Submission Modal (2 days)
**Tasks**:
1. Create `SubmissionModal.tsx` component
2. Build 3x3 snapshot grid display (read-only preview)
3. Create form inputs (beat name, user name)
4. Add form validation
5. Create upload handler (POST to API route)
6. Show upload progress indicator
7. Handle success/error states
8. Cancel button returns to Recording Actions modal

**Files to create**:
- `src/components/SubmissionModal.tsx`

**UI Components**:
- Modal backdrop (fixed overlay)
- 3x3 grid of snapshot thumbnails (120x68px each)
- Text inputs with validation (beat name, user name)
- Submit/cancel buttons
- Loading spinner during upload
- Success/error toast notifications

---

### Phase 4: Upload API Route with Auto-Cleanup (2-3 days)
**Tasks**:
1. Create `/api/community/upload` POST endpoint
2. **Before upload**: Check storage usage and trigger cleanup if needed
3. Receive form data: beat name, user name, audio blob, 9 snapshots
4. Generate unique IDs for file naming
5. Upload audio file to Supabase Storage (`beat-recordings` bucket)
6. Upload 9 snapshot images to Supabase Storage (`beat-snapshots` bucket)
7. Calculate total file size
8. Create database record in `beats` table with metadata + `total_size_bytes`
9. Return success response with beat ID

**Files to create**:
- `src/app/api/community/upload/route.ts`
- `src/lib/supabase/cleanup.ts` (cleanup utility)

**Cleanup Logic** (in upload endpoint):
```typescript
// 1. Check current storage usage
const { data: storageData } = await supabase.storage.getBucket('beat-recordings');
const currentUsage = storageData.size; // bytes

// 2. If > 900MB, delete oldest beats until < 800MB
if (currentUsage > 900 * 1024 * 1024) {
  await cleanupOldestBeats(targetSize: 800 * 1024 * 1024);
}

// 3. Proceed with upload
```

**Endpoint Spec**:
```typescript
// POST /api/community/upload
// Content-Type: multipart/form-data

Request Body:
{
  beatName: string;
  userName: string;
  audioBlob: Blob;
  snapshots: Blob[]; // 9 images
  bpm: number;
  key: string;
  loopLength: number;
}

Response:
{
  success: boolean;
  beatId?: string;
  error?: string;
  cleanedUp?: number; // Number of beats deleted to make space
}
```

---

### Phase 5: Community Gallery Page (2-3 days)
**Tasks**:
1. Create `/community` page route
2. Create `/api/community/beats` GET endpoint (fetch beats list with pagination)
3. Build beat card component (simplified):
   - 3x3 snapshot grid (small)
   - Beat name, user name
   - Play button
   - Timestamp
4. Implement pagination (24 per page, prev/next buttons)
5. Add audio playback in feed (click play to stream)
6. Style with ThingBeat blue/white theme (grid layout)
7. Responsive design (4 cols desktop, 2-3 cols mobile)

**Files to create**:
- `src/app/community/page.tsx`
- `src/components/BeatCard.tsx`
- `src/app/api/community/beats/route.ts`

**API Endpoint Spec**:
```typescript
// GET /api/community/beats?page=1

Response:
{
  beats: Array<{
    id: string;
    beatName: string;
    userName: string;
    audioUrl: string;
    snapshotUrls: string[]; // 9 URLs
    bpm: number;
    key: string;
    loopLength: number;
    createdAt: string; // ISO timestamp
  }>;
  totalPages: number;
  currentPage: number;
  totalBeats: number;
}
```

**Pagination**:
- 24 beats per page
- SQL: `ORDER BY created_at DESC LIMIT 24 OFFSET (page - 1) * 24`
- Simple prev/next buttons (no infinite scroll)
- Page counter: "Page 1 of 10"

---

## File Structure (New Files)

```
src/
├── app/
│   ├── api/
│   │   └── community/
│   │       ├── upload/
│   │       │   └── route.ts        (Upload beat + cleanup logic)
│   │       └── beats/
│   │           └── route.ts        (Fetch beats list with pagination)
│   └── community/
│       └── page.tsx                (Community gallery page)
├── components/
│   ├── RecordingActionsModal.tsx   (First modal: Delete/Download/Share)
│   ├── SubmissionModal.tsx         (Second modal: Beat/user name form)
│   └── BeatCard.tsx                (Beat card for gallery)
├── lib/
│   └── supabase/
│       ├── client.ts               (Supabase client-side helper)
│       ├── server.ts               (Supabase server-side helper)
│       └── cleanup.ts              (Storage cleanup utility)
└── store/
    └── useStore.ts                 (Add recordingState and recordingData)
```

---

## Security Considerations

### Row Level Security (RLS) Policies

#### `beats` Table
```sql
-- Allow public read access to all beats
CREATE POLICY "Public can view all beats"
ON beats FOR SELECT
USING (TRUE);

-- Anyone can insert (for anonymous sharing)
CREATE POLICY "Anyone can create beats"
ON beats FOR INSERT
WITH CHECK (TRUE);

-- No updates allowed (beats are immutable once created)
CREATE POLICY "No updates"
ON beats FOR UPDATE
USING (FALSE);

-- Allow deletion (for cleanup or manual moderation)
CREATE POLICY "Allow deletion"
ON beats FOR DELETE
USING (TRUE);
```

**Notes**:
- No approval system - all beats are public immediately
- Beats are immutable - cannot be edited after upload
- Deletion enabled for auto-cleanup and manual moderation
- You can delete inappropriate beats via Supabase dashboard

### Storage Bucket Policies

#### `beat-recordings` Bucket
```javascript
// Public read, no auth required
{
  "public": true,
  "allowed_mime_types": ["audio/webm", "audio/mp3", "audio/mpeg"],
  "file_size_limit": 10485760, // 10MB
  "allowed_operations": ["SELECT"]
}
```

#### `beat-snapshots` Bucket
```javascript
// Public read, no auth required
{
  "public": true,
  "allowed_mime_types": ["image/jpeg"],
  "file_size_limit": 1048576, // 1MB
  "allowed_operations": ["SELECT"]
}
```

### Rate Limiting
- Implement rate limiting on upload endpoint (max 5 uploads per hour per IP)
- Use Vercel edge config or Redis for rate limit tracking
- Prevent spam and abuse

### Content Moderation
- Add `is_flagged` and `is_approved` flags to `beats` table
- Default `is_approved = TRUE` for initial launch
- Future: Add report button and admin moderation panel
- Consider image scanning API (Cloudflare, AWS Rekognition) for NSFW detection

---

## User Experience Flow

### Share Flow
1. User creates beat with ThingBeat
2. Clicks "Share" button in header
3. App records 2 loops (shows "Waiting..." → "Recording..." states)
4. Recording completes → Modal opens
5. User sees 3x3 grid of their snapshots
6. User plays recording to preview
7. User enters beat name and their name
8. User clicks "Share Beat"
9. App uploads audio + snapshots (shows progress)
10. Success message: "Your beat is now live in the community!"
11. Modal closes, user can navigate to /community to see their beat

### Browse Flow
1. User navigates to /community page
2. Sees grid of community beats (sorted by latest)
3. Clicks play button on any beat
4. Audio plays with waveform visualization
5. User clicks like button (heart icon)
6. Like count increments immediately
7. User scrolls down, more beats load automatically
8. User clicks on beat card → Opens detail page
9. Detail page shows full-size snapshots and metadata

---

## Technical Implementation Details

### Audio Upload Strategy
**Option A: Direct Blob Upload** (Recommended)
- Convert Tone.Recorder blob to File object
- Upload directly to Supabase Storage via client SDK
- Pros: Simple, no intermediate storage
- Cons: User waits for full upload

**Option B: Server-Side Upload**
- Send blob to API route as FormData
- API route uploads to Supabase Storage
- Pros: Can add validation, processing on server
- Cons: More complex, blob transferred twice

**Decision**: Use Option A for simplicity. Upload directly from client to Supabase Storage.

### Image Optimization
- Snapshots already compressed (JPEG 70% quality, 400x225px)
- Create thumbnail versions (120x68px) for gallery grid
- Use Next.js Image component with Supabase CDN URLs
- Consider lazy loading for infinite scroll

### Audio Playback
- Use HTML5 `<audio>` element (simpler than Tone.js for playback)
- Add custom controls styled with ThingBeat theme
- Show waveform using WaveSurfer.js (already in dependencies)
- Implement play/pause/seek functionality

---

## Cost Estimation

### Supabase Pro Plan: $25/month

**Assumptions** (Year 1):
- 1,000 community beats uploaded
- 10,000 page views/month on gallery
- Average beat: 3MB audio + 1MB snapshots (9 images) = 4MB total

**Storage**:
- 1,000 beats × 4MB = 4GB
- Well within 100GB Pro plan limit ✅

**Bandwidth**:
- 10,000 views × 4MB avg download = 40GB/month
- Pro plan includes bandwidth ✅

**Database Requests**:
- Gallery page: ~100 queries/pageview = 1M queries/month
- Unlimited API requests on Pro plan ✅

**Total Cost**: $25/month (fixed, predictable)

**Scaling** (10,000 beats):
- 10,000 beats × 4MB = 40GB storage (still within Pro plan)
- Bandwidth scales linearly (monitoring needed)
- May need Enterprise plan ($599/month) at ~100k beats or high traffic

---

## Future Enhancements

### Phase 8 (Post-MVP):
1. **User Authentication**
   - Sign up with email
   - User profiles with their beat collections
   - Follow system
   - Private/unlisted beats

2. **Comments System**
   - Comment on beats
   - Reply to comments
   - Nested conversation threads

3. **Search & Discovery**
   - Full-text search on beat names
   - Tag system (genre, mood, BPM range)
   - "Trending this week" algorithm
   - Related beats recommendations

4. **Download Functionality**
   - Download beat as MP3 + ZIP (like export)
   - Remix feature (load someone else's beat into editor)

5. **Social Features**
   - Share beat to social media (Twitter, Discord)
   - Embeddable beat player widget
   - QR code for sharing

6. **Admin Panel**
   - Content moderation dashboard
   - Flag inappropriate content
   - Analytics (top beats, engagement metrics)

---

## Testing Plan

### Unit Tests
- API route tests (upload, fetch, like)
- Supabase client utility tests
- Form validation tests

### Integration Tests
- End-to-end share flow
- Upload → Database record → Storage files consistency
- Like system (prevent duplicates)
- Pagination/infinite scroll

### Manual Testing
- Cross-browser compatibility (Chrome, Firefox, Safari)
- Mobile responsiveness
- Audio playback on different devices
- File upload error handling (network failure, file too large)

---

## Rollout Strategy

### Soft Launch
1. Deploy to production with feature flag (hidden link)
2. Share with 10-20 beta users
3. Monitor usage, bugs, performance
4. Gather feedback on UX

### Public Launch
1. Add "Community" link to main navigation
2. Create launch announcement
3. Share on social media, forums
4. Monitor server costs and scale if needed

### Success Metrics
- Number of beats shared (target: 100 in first month)
- Engagement rate (likes, plays per beat)
- Retention (users returning to browse/share)
- Load time (gallery page <2s)
- Upload success rate (>95%)

---

## Timeline Estimate

**Total Development Time**: 11-14 days (~2-3 weeks)

| Phase | Duration | Priority |
|-------|----------|----------|
| Phase 1: Backend Setup | 2-3 days | Critical |
| Phase 2: Record Button & Two-Modal Flow | 3 days | Critical |
| Phase 3: Submission Modal | 2 days | Critical |
| Phase 4: Upload API Route with Auto-Cleanup | 2-3 days | Critical |
| Phase 5: Community Gallery Page | 2-3 days | Critical |

**Total**: 11-14 days (simplified, no likes/filtering/detail pages)

---

## Conclusion

**Recommended Approach**:
1. Use **Supabase Free Tier** for backend (database + storage)
2. Implement in **5 phases** starting with backend setup
3. Launch **complete MVP** with all phases (record, upload, browse)
4. Auto-cleanup maintains rolling gallery of ~250 latest beats
5. Manual moderation via Supabase dashboard if needed

**Key Advantages**:
- **Zero cost**: Free tier with 1GB storage
- **Simple UX**: Single Record button, two-modal flow (Delete/Download/Share)
- **Rolling gallery**: Temporary/ephemeral nature keeps content fresh
- **No auth required**: Anonymous sharing lowers barrier to entry
- **Clean design**: No likes/comments/filtering - just latest beats
- **Easy moderation**: Direct access to Supabase dashboard

**Next Steps**:
1. ✅ User approved simplified plan
2. Create Supabase account and project (free tier)
3. Begin Phase 1: Backend Setup
4. Iterate through phases sequentially
5. Launch MVP in 2-3 weeks
