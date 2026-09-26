import { NextRequest, NextResponse } from 'next/server';
import { createHash, timingSafeEqual } from 'crypto';
import { metaStats, posthogStats, stripeStats } from '@/lib/panel';

// Datos del panel interno (public/panel.html). Protegido con PANEL_KEY (variable de Vercel).
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const hash = (s: string) => createHash('sha256').update(s).digest();

export async function GET(req: NextRequest) {
  const key = process.env.PANEL_KEY;
  const given = req.headers.get('x-panel-key') || '';
  if (!key) return NextResponse.json({ error: 'Falta PANEL_KEY en Vercel' }, { status: 503 });
  if (!timingSafeEqual(hash(given), hash(key))) return NextResponse.json({ error: 'Clave incorrecta' }, { status: 401 });

  const days = Math.max(1, Math.min(90, Number(req.nextUrl.searchParams.get('days')) || 14));
  const safe = async <T,>(fn: () => Promise<T>) => {
    try { return await fn(); } catch (e: unknown) { return { configured: true, error: e instanceof Error ? e.message : String(e) }; }
  };
  const [stripe, posthog, meta] = await Promise.all([safe(() => stripeStats(days)), safe(() => posthogStats(days)), safe(() => metaStats(days))]);
  return NextResponse.json({ days, generatedAt: new Date().toISOString(), stripe, posthog, meta }, { headers: { 'Cache-Control': 'no-store' } });
}
