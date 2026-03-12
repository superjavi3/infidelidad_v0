import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY || '');
}

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get('session_id');

  if (!sessionId) {
    return NextResponse.json(
      { error: 'session_id is required' },
      { status: 400 }
    );
  }

  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.status === 'complete') {
      // amount_total is in smallest currency unit (cents for MXN/USD, whole units for COP/CLP etc.)
      const amountTotal = session.amount_total ?? 0;
      const currency = (session.currency || 'mxn').toLowerCase();
      const zeroDecimal = ['cop', 'ars', 'clp', 'pyg'].includes(currency);
      const value = zeroDecimal ? amountTotal : amountTotal / 100;

      return NextResponse.json({
        paid: true,
        email: session.metadata?.email || session.customer_email || '',
        plan: 'premium',
        value,
        currency,
      });
    }

    return NextResponse.json({ paid: false });
  } catch (error: unknown) {
    console.error('Verify payment error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Error verificando pago', details: message },
      { status: 500 }
    );
  }
}
