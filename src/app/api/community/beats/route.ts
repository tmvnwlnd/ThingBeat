import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const perPage = 24; // 4 cols × 6 rows

    // Validate page number
    if (page < 1) {
      return NextResponse.json(
        { error: 'Invalid page number' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get total count
    const { count, error: countError } = await supabase
      .from('beats')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('Error counting beats:', countError);
      return NextResponse.json(
        { error: 'Failed to count beats' },
        { status: 500 }
      );
    }

    const totalBeats = count || 0;
    const totalPages = Math.ceil(totalBeats / perPage);

    // Fetch beats for current page (latest first)
    const offset = (page - 1) * perPage;
    const { data: beats, error: fetchError } = await supabase
      .from('beats')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + perPage - 1);

    if (fetchError) {
      console.error('Error fetching beats:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch beats' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      beats: beats || [],
      totalBeats,
      totalPages,
      currentPage: page,
      perPage,
    });

  } catch (error) {
    console.error('Beats API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
