import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  const diagnostics: Record<string, unknown> = {};

  // Check env vars
  diagnostics.supabaseUrl = process.env.SUPABASE_URL ? 'SET (' + process.env.SUPABASE_URL.substring(0, 30) + '...)' : 'MISSING';
  diagnostics.supabaseAnonKey = process.env.SUPABASE_ANON_KEY ? 'SET (starts with ' + process.env.SUPABASE_ANON_KEY.substring(0, 10) + '...)' : 'MISSING';
  diagnostics.supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET (starts with ' + process.env.SUPABASE_SERVICE_ROLE_KEY.substring(0, 10) + '...)' : 'MISSING';

  // Test query — count rows
  try {
    const { count, error } = await supabaseAdmin
      .from('shared_analyses')
      .select('*', { count: 'exact', head: true });

    diagnostics.queryResult = { count, error: error?.message || null };
  } catch (e: unknown) {
    diagnostics.queryResult = { error: e instanceof Error ? e.message : 'Unknown error' };
  }

  // Test select first row
  try {
    const { data, error } = await supabaseAdmin
      .from('shared_analyses')
      .select('id, score, created_at')
      .limit(3);

    diagnostics.sampleRows = { data, error: error?.message || null };
  } catch (e: unknown) {
    diagnostics.sampleRows = { error: e instanceof Error ? e.message : 'Unknown error' };
  }

  return NextResponse.json(diagnostics);
}
