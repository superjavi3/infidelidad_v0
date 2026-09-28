import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { findRefCode } from '@/lib/ref';

// ¿Vale este código? Lo usa la web para enseñar el precio con descuento (ver lib/ref.ts)
export async function GET(req: NextRequest) {
  try {
    const ref = await findRefCode(new Stripe(process.env.STRIPE_SECRET_KEY || ''), req.nextUrl.searchParams.get('c'));
    return NextResponse.json(
      ref ? { valid: true, code: ref.code, percent: ref.percent, amountOff: ref.amountOff, currency: ref.currency } : { valid: false },
      { headers: { 'Cache-Control': 'public, s-maxage=60' } });
  } catch {
    return NextResponse.json({ valid: false });
  }
}
