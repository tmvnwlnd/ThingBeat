import { NextRequest, NextResponse } from 'next/server';
import { SoundCategory, GlobalMusicSettings } from '@/lib/prompt';
import { buildSfxRequest } from '@/lib/sfx';

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1/sound-generation';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { descriptor, category, settings } = body as {
      descriptor: string; // LLM output from /api/describe
      category: SoundCategory;
      settings: GlobalMusicSettings;
    };

    if (!descriptor || !category || !settings) {
      console.error('❌ Missing descriptor, category, or settings');
      return NextResponse.json(
        { error: 'Missing descriptor, category, or settings' },
        { status: 400 }
      );
    }

    if (!ELEVENLABS_API_KEY) {
      console.error('❌ ElevenLabs API key not configured');
      return NextResponse.json(
        { error: 'ElevenLabs API key not configured' },
        { status: 500 }
      );
    }

    console.log('\n🎵 === /api/generate-audio REQUEST ===');
    console.log('📋 Category:', category);
    console.log('🎨 Descriptor:', descriptor);
    console.log('⚙️  Settings:', JSON.stringify(settings, null, 2));

    // Build the ElevenLabs request using our helper
    const sfxRequest = buildSfxRequest(category, descriptor, settings, {
      output_format: 'mp3_44100_128',
    });

    console.log('\n📤 === ELEVENLABS REQUEST (FULL) ===');
    console.log('URL:', `${ELEVENLABS_API_URL}?output_format=${sfxRequest.queryParams.output_format}`);
    console.log('Headers:');
    console.log('  Content-Type: application/json');
    console.log('  xi-api-key: [REDACTED]');
    console.log('\nRequest Body (sent to ElevenLabs):');
    console.log(JSON.stringify(sfxRequest.body, null, 2));
    console.log('\nFull text prompt sent:');
    console.log(`  "${sfxRequest.body.text}"`);
    console.log('======================================');

    // Build URL with query parameters
    const url = new URL(ELEVENLABS_API_URL);
    Object.entries(sfxRequest.queryParams).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });

    // Call ElevenLabs API
    console.log('\n🔊 Calling ElevenLabs API...');
    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': ELEVENLABS_API_KEY,
      },
      body: JSON.stringify(sfxRequest.body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('\n❌ === ELEVENLABS API ERROR ===');
      console.error('Status:', response.status);
      console.error('Response:', errorText);
      console.error('==============================\n');
      return NextResponse.json(
        { error: `ElevenLabs API error: ${response.status}` },
        { status: response.status }
      );
    }

    console.log('\n📥 === ELEVENLABS RESPONSE ===');
    console.log('✅ Status:', response.status, response.statusText);
    console.log('Content-Type:', response.headers.get('content-type') || 'unknown');

    // ElevenLabs returns audio as binary
    const audioBuffer = await response.arrayBuffer();
    const audioSize = audioBuffer.byteLength;

    console.log('\n📦 Audio file received:');
    console.log('  Format: MP3 (audio/mpeg)');
    console.log('  Size:', audioSize, 'bytes', `(${(audioSize / 1024).toFixed(2)} KB)`);
    console.log('  Document type: Binary audio buffer');

    // Convert to base64 for sending to frontend
    const base64Audio = Buffer.from(audioBuffer).toString('base64');
    const audioDataUrl = `data:audio/mpeg;base64,${base64Audio}`;

    console.log('\n✅ Audio converted to data URL');
    console.log('  Base64 length:', base64Audio.length, 'characters');
    console.log('  Data URL length:', audioDataUrl.length, 'characters');
    console.log('\n🎉 Audio generation complete!');
    console.log('===========================\n');

    return NextResponse.json({
      audioUrl: audioDataUrl,
      category,
      descriptor,
      duration: sfxRequest.body.duration_seconds,
    });
  } catch (error) {
    console.error('\n❌ === ERROR in /api/generate-audio ===');
    console.error(error);
    console.error('=====================================\n');
    return NextResponse.json(
      { error: 'Failed to generate audio' },
      { status: 500 }
    );
  }
}
