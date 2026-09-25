import { NextRequest, NextResponse } from 'next/server';
import { checkSessionPayment, isValidSessionId } from '@/lib/payments';

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

  return NextResponse.json({
    paid: true,
    email: check.email || '',
    plan: 'premium',
    value,
    currency,
  });
}
