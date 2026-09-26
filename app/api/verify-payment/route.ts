import { NextRequest, NextResponse, after } from 'next/server';
import { checkSessionPayment, isValidSessionId } from '@/lib/payments';
import { capiEnabled, sendPurchase } from '@/lib/meta-capi';
import { toMajorUnits } from '@/lib/money';

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

  // amount_total viene en la unidad mínima (centavos en MXN/USD/COP/ARS, unidades en CLP/PYG)
  const currency = check.currency || 'mxn';
  const value = toMajorUnits(check.amountTotal ?? 0, currency);

  // Vuelta de Stripe con cookies aceptadas: la compra también va a Meta desde el servidor (ver lib/meta-capi.ts)
  const q = req.nextUrl.searchParams;
  if (q.get('track') === '1' && capiEnabled()) {
    // Se manda después de responder: el navegador no espera a Meta
    const purchase = {
      eventId: sessionId,
      email: check.email,
      value,
      currency,
      ip: (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || null,
      userAgent: req.headers.get('user-agent'),
      fbp: q.get('fbp'),
      fbc: q.get('fbc'),
      url: req.headers.get('referer') || undefined,
    };
    after(() => sendPurchase(purchase));
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
