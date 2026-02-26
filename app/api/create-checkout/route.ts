import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getPricingForCountry } from '../pricing/route';

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY || '');
}

export async function POST(req: NextRequest) {
  try {
    const { email, plan } = await req.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email es requerido' },
        { status: 400 }
      );
    }

    // Acepta planes legacy, todos mapean a premium
    const validPlans = ['premium', 'detective', 'obsesivo', 'group-completo'];
    if (plan && !validPlans.includes(plan)) {
      return NextResponse.json(
        { error: 'Plan inválido' },
        { status: 400 }
      );
    }

    const country = req.headers.get('x-vercel-ip-country') || 'US';
    const pricing = getPricingForCountry(country);
    const amount = pricing.premium;
    const currency = pricing.currency;

    const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'https://yalosabia.com';
    const stripe = getStripe();

    async function createSession(cur: string, amt: number) {
      return stripe.checkout.sessions.create({
        customer_email: email,
        line_items: [{
          price_data: {
            currency: cur,
            product_data: {
              name: 'Plan Premium — YaLoSabía',
            },
            unit_amount: amt,
          },
          quantity: 1,
        }],
        mode: 'payment',
        allow_promotion_codes: true,
        success_url: `${origin}/#results?payment=success&session_id={CHECKOUT_SESSION_ID}&plan=premium`,
        cancel_url: `${origin}/#pricing`,
        metadata: {
          plan: 'premium',
          country,
          currency: cur,
        },
      });
    }

    let session;
    try {
      session = await createSession(currency, amount);
    } catch (err: unknown) {
      // Fallback silencioso a USD si la moneda local no está habilitada en Stripe
      console.warn(`Stripe rejected currency ${currency} for country ${country}, falling back to USD:`, err instanceof Error ? err.message : err);
      const fallback = getPricingForCountry('US');
      session = await createSession('usd', fallback.premium);
    }

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
