import { NextRequest, NextResponse } from 'next/server';
import { checkSessionPayment, isValidSessionId } from '@/lib/payments';
import { capiEnabled, sendPurchase } from '@/lib/meta-capi';

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get('session_id');

  if (!isValidSessionId(sessionId)) {
    return NextResponse.json({ paid: false, reason: 'invalid' }, { status: 400 });
  }

  const check = await checkSessionPayment(sessionId);
  if (check.reason === 'error') {
    return NextResponse.json({ paid: false, reason: 'error' }, { status: 503 });
  }
  if (!check.paid) {
    return NextResponse.json({ paid: false, reason: check.reason });
  }

  // amount_total viene en la unidad mínima (centavos en MXN/USD, unidades en COP/CLP…)
  const currency = check.currency || 'mxn';
  const zeroDecimal = ['cop', 'ars', 'clp', 'pyg'].includes(currency);
  const value = zeroDecimal ? check.amountTotal ?? 0 : (check.amountTotal ?? 0) / 100;

  // Vuelta de Stripe con cookies aceptadas: la compra también va a Meta desde el servidor (ver lib/meta-capi.ts)
  const q = req.nextUrl.searchParams;
  if (q.get('track') === '1' && capiEnabled()) {
    await sendPurchase({
      eventId: sessionId,
      email: check.email,
      value,
      currency,
      ip: (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || null,
      userAgent: req.headers.get('user-agent'),
      fbp: q.get('fbp'),
      fbc: q.get('fbc'),
      url: req.headers.get('referer') || undefined,
    });
  }

  return NextResponse.json({
    paid: true,
    email: check.email || '',
    plan: 'premium',
    chatFp: check.chatFp || null,
    value,
    currency,
  });
}
