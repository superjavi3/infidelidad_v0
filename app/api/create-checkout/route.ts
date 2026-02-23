import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY || '';
  console.log('[Stripe] Key prefix:', key.substring(0, 8) + '..., length:', key.length);
  return new Stripe(key);
}

export async function POST(req: NextRequest) {
  try {
    const { email, analysisId } = await req.json();

    if (!email || !analysisId) {
      return NextResponse.json(
        { error: 'Email y analysisId son requeridos' },
        { status: 400 }
      );
    }

    const origin = req.headers.get('origin') || 'https://losabia.mx';
    const stripe = getStripe();

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: email,
      line_items: [
        {
          price_data: {
            currency: 'mxn',
            product_data: {
              name: 'Plan Detective — LoSabía.mx',
              description: 'Análisis profundo de tu conversación de WhatsApp',
            },
            unit_amount: 6900,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${origin}/#results?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/#pricing`,
      metadata: { email, analysisId },
    });

    return NextResponse.json({ url: session.url });
  } catch (error: unknown) {
    console.error('Checkout error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Error creando sesión de pago', details: message },
      { status: 500 }
    );
  }
}
