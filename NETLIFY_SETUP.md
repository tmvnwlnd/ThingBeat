# Netlify Deployment Setup

This document explains how to configure ThingBeat for deployment on Netlify.

## Required Environment Variables

You must configure the following environment variables in your Netlify site settings:

### 1. Supabase Configuration

Go to **Site settings → Environment variables** in Netlify and add:

```
NEXT_PUBLIC_SUPABASE_URL=https://aorbrandayzanlknndvd.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFvcmJyYW5kYXl6YW5sa25uZHZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUwMzg4NzgsImV4cCI6MjA4MDYxNDg3OH0.Sqn1kYcOaPrC_rOv-dUBziP4oS6Bid7fZpYFsIP45k8
```

### 2. API Keys

Make sure these are also set (should already be in your `.env.local`):

```
ELEVENLABS_API_KEY=your_elevenlabs_api_key
CLAUDE_API_KEY=your_anthropic_api_key
```

## Setting Environment Variables on Netlify

1. Go to your Netlify dashboard
2. Select your ThingBeat site
3. Click **Site settings**
4. Navigate to **Environment variables** in the sidebar
5. Click **Add a variable**
6. Add each variable with its name and value
7. Make sure to select **All scopes** (or at minimum: Production, Deploy Previews, Branch Deploys)
8. Click **Save**

## After Adding Variables

After adding or updating environment variables:

1. Netlify will NOT automatically redeploy
2. You need to trigger a new deploy manually:
   - Go to **Deploys** tab
   - Click **Trigger deploy** → **Deploy site**
3. Or push a new commit to trigger automatic deployment

## Troubleshooting

### Community Gallery Returns 500 Error

If you see a 500 error when accessing `/community`:

1. Check Netlify function logs:
   - Go to **Functions** tab in Netlify
   - Look for errors in the logs

2. Verify environment variables are set:
   - Check that `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are present
   - Make sure there are no extra spaces or quotes

3. Check the logs will show:
   - `❌ NEXT_PUBLIC_SUPABASE_URL is not set` - if URL is missing
   - `❌ NEXT_PUBLIC_SUPABASE_ANON_KEY is not set` - if key is missing
   - `✅ Supabase env vars present` - if everything is configured correctly

### Build Errors

If you encounter build errors:

1. Make sure you're using Node.js 18+ (set in **Site settings → Build & deploy → Environment → Node version**)
2. Clear cache and retry deploy: **Deploys → Trigger deploy → Clear cache and deploy site**

## Supabase Setup

Make sure your Supabase project has:

1. **beats** table created (check COMMUNITY_GALLERY_PLAN.md for schema)
2. **Row Level Security (RLS)** policies set up for public read access
3. **Storage buckets** created:
   - `beat-recordings` (public)
   - `beat-snapshots` (public)

## Next.js Configuration

The project uses:
- Next.js 14+
- App Router (not Pages Router)
- Server-side API routes
- Edge runtime compatible

No additional Netlify configuration should be needed - Netlify automatically detects and deploys Next.js projects.
