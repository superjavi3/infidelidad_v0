import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY || '');
}

const PLAN_CONFIG = {
  detective: {
    name: 'Plan Detective — LoSabía.mx',
    description: 'Análisis profundo de tu conversación de WhatsApp',
    amount: 6900,
    mode: 'payment' as const,
  },
  obsesivo: {
    name: 'Plan Obsesivo — LoSabía.mx',
    description: 'Análisis completo + chatbot IA + monitoreo mensual',
    amount: 19900,
    mode: 'subscription' as const,
  },
};

export async function POST(req: NextRequest) {
  try {
    const { email, plan } = await req.json();

    if (!email || !plan) {
      return NextResponse.json(
        { error: 'Email y plan son requeridos' },
        { status: 400 }
      );
    }

    if (!PLAN_CONFIG[plan as keyof typeof PLAN_CONFIG]) {
      return NextResponse.json(
        { error: 'Plan inválido. Usa "detective" o "obsesivo"' },
        { status: 400 }
      );
    }

    const config = PLAN_CONFIG[plan as keyof typeof PLAN_CONFIG];
    const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'https://losabia.mx';
    const stripe = getStripe();

    const priceData: Stripe.Checkout.SessionCreateParams.LineItem.PriceData = {
      currency: 'mxn',
      product_data: {
        name: config.name,
        description: config.description,
      },
      unit_amount: config.amount,
    };

    if (config.mode === 'subscription') {
      priceData.recurring = { interval: 'month' };
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: email,
      line_items: [{ price_data: priceData, quantity: 1 }],
      mode: config.mode,
      success_url: `${origin}/#results?payment=success&session_id={CHECKOUT_SESSION_ID}&plan=${plan}`,
      cancel_url: `${origin}/#pricing`,
      metadata: { email, plan },
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
