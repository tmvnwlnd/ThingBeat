import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { SoundCategory, SYSTEM_PROMPT, buildUserPrompt } from '@/lib/prompt';

export async function POST(request: NextRequest) {
  try {
    // Check API key at runtime
    const apiKey = process.env.CLAUDE_API_KEY;

    if (!apiKey) {
      console.error('❌ CLAUDE_API_KEY not found in environment variables');
      console.error('Available env vars:', Object.keys(process.env).filter(k => k.includes('API')));
      return NextResponse.json(
        { error: 'Claude API key not configured. Please add CLAUDE_API_KEY to .env.local' },
        { status: 500 }
      );
    }

    console.log('✅ API key loaded:', apiKey.substring(0, 10) + '...');

    const anthropic = new Anthropic({
      apiKey: apiKey,
    });
    const body = await request.json();
    const { imageData, category } = body as {
      imageData: string; // base64 data URL
      category: SoundCategory;
    };

    if (!imageData || !category) {
      console.error('❌ Missing imageData or category');
      return NextResponse.json(
        { error: 'Missing imageData or category' },
        { status: 400 }
      );
    }

    console.log('\n🎯 === /api/describe REQUEST ===');
    console.log('📋 Category:', category);

    // Extract base64 data from data URL (remove "data:image/jpeg;base64," or "data:image/png;base64," prefix)
    const base64Data = imageData.split(',')[1];
    if (!base64Data) {
      console.error('❌ Invalid image data format');
      return NextResponse.json(
        { error: 'Invalid image data format' },
        { status: 400 }
      );
    }

    // Determine media type from data URL
    const mediaType = imageData.startsWith('data:image/jpeg') ? 'image/jpeg' : 'image/png';

    console.log('📸 Image data length:', base64Data.length, 'characters');
    console.log('📸 Image format:', mediaType);
    console.log('💰 Estimated tokens: ~', Math.ceil(base64Data.length / 100), '(approximate)');

    // Build category-specific user prompt
    const userPrompt = buildUserPrompt(category);

    console.log('\n📝 === CLAUDE PROMPTS ===');
    console.log('System Prompt:');
    console.log(SYSTEM_PROMPT);
    console.log('\nUser Prompt:');
    console.log(userPrompt);

    // Call Claude API with vision
    console.log('\n🤖 Calling Claude API...');
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
                data: base64Data,
              },
            },
            {
              type: 'text',
              text: userPrompt,
            },
          ],
        },
      ],
    });

    console.log('\n✅ Claude API Response:');
    console.log('Model:', message.model);
    console.log('Stop reason:', message.stop_reason);
    console.log('Usage:', JSON.stringify(message.usage, null, 2));

    // Extract text from response
    const textContent = message.content.find((block) => block.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      console.error('❌ No text response from Claude');
      return NextResponse.json(
        { error: 'No text response from Claude' },
        { status: 500 }
      );
    }

    const descriptor = textContent.text.trim();

    console.log('\n🎨 === CLAUDE DESCRIPTOR ===');
    console.log(descriptor);
    console.log('=========================\n');

    return NextResponse.json({
      descriptor,
      category,
    });
  } catch (error: any) {
    console.error('\n❌ === ERROR in /api/describe ===');
    console.error(error);
    console.error('================================\n');

    // Extract user-friendly error message
    let errorMessage = 'Failed to describe image';

    if (error?.error?.error?.message) {
      // Anthropic API error format
      errorMessage = error.error.error.message;
    } else if (error?.message) {
      errorMessage = error.message;
    }

    return NextResponse.json(
      { error: errorMessage, details: error?.error || error?.message },
      { status: error?.status || 500 }
    );
  }
}
