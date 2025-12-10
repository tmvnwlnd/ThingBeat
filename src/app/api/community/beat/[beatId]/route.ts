import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { beatId: string } }
) {
  try {
    const { beatId } = params;
    const supabase = await createClient();

    // Fetch the beat by ID
    const { data: beat, error: beatError } = await supabase
      .from('beats')
      .select('*')
      .eq('id', beatId)
      .single();

    if (beatError || !beat) {
      return NextResponse.json(
        { error: 'Beat not found' },
        { status: 404 }
      );
    }

    // Get the created_at of current beat for navigation
    const currentCreatedAt = beat.created_at;

    // Find the next beat (newer, created after current beat)
    const { data: nextBeat } = await supabase
      .from('beats')
      .select('id')
      .gt('created_at', currentCreatedAt)
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    // Find the previous beat (older, created before current beat)
    const { data: prevBeat } = await supabase
      .from('beats')
      .select('id')
      .lt('created_at', currentCreatedAt)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    return NextResponse.json({
      beat,
      nextBeatId: nextBeat?.id || null,
      prevBeatId: prevBeat?.id || null,
    });
  } catch (error) {
    console.error('Error fetching beat:', error);
    return NextResponse.json(
      { error: 'Failed to fetch beat' },
      { status: 500 }
    );
  }
}
