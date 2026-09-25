import { NextResponse } from 'next/server';
import { newOffer, offerEnabled } from '@/lib/offer';

// Oferta de bienvenida para un visitante nuevo (ver lib/offer.ts)
export async function POST() {
  if (!offerEnabled()) return NextResponse.json({ enabled: false });
  return NextResponse.json({ enabled: true, ...newOffer() }, { headers: { 'Cache-Control': 'no-store' } });
}
