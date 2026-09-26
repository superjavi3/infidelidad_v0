import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// La web ya no crea links para compartir. El POST aceptaba HTML de cualquiera y /a/[id] lo pintaba,
// así que se cierra; la lectura se mantiene para que los links antiguos sigan abriendo.
export async function POST() {
  return NextResponse.json({ error: 'Esta función ya no existe' }, { status: 410 });
}

// GET: fetch a shared analysis by id
export async function GET(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'id parameter is required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('shared_analyses')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: 'Analysis not found' },
        { status: 404 }
      );
    }

    // Increment views (fire and forget)
    supabaseAdmin.rpc('increment_views', { analysis_id: id }).then();

    return NextResponse.json({ success: true, analysis: data });
  } catch (error: unknown) {
    console.error('Share GET error:', error);
    return NextResponse.json(
      { error: 'Error fetching analysis' },
      { status: 500 }
    );
  }
}
