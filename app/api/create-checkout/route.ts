import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-01-28.clover',
});

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

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
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
            unit_amount: 6900, // $69 MXN en centavos
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${origin}/#results?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/#pricing`,
      metadata: {
        email,
        analysisId,
      },
    };

    // Add OXXO if available (Stripe supports it for MXN)
    try {
      sessionParams.payment_method_types!.push('oxxo');
    } catch {
      // OXXO not available, continue with card only
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

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
