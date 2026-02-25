import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getPricingForCountry } from '../pricing/route';

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY || '');
}

export async function POST(req: NextRequest) {
  try {
    const { email, plan, chatFingerprint } = await req.json();

    if (!email || !plan) {
      return NextResponse.json(
        { error: 'Email y plan son requeridos' },
        { status: 400 }
      );
    }

    if (plan !== 'detective' && plan !== 'obsesivo') {
      return NextResponse.json(
        { error: 'Plan inválido. Usa "detective" o "obsesivo"' },
        { status: 400 }
      );
    }

    const country = req.headers.get('x-vercel-ip-country') || 'US';
    const pricing = getPricingForCountry(country);

    const isObsesivo = plan === 'obsesivo';
    const amount = isObsesivo ? pricing.obsesivo : pricing.detective;
    const currency = pricing.currency;

    const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'https://yalosabia.com';
    const stripe = getStripe();
    const mode = isObsesivo ? 'subscription' : 'payment';

    async function createSession(cur: string, amt: number) {
      const priceData: Stripe.Checkout.SessionCreateParams.LineItem.PriceData = {
        currency: cur,
        product_data: {
          name: isObsesivo ? 'Plan Obsesivo — YaLoSabía' : 'Plan Detective — YaLoSabía',
        },
        unit_amount: amt,
      };

      if (isObsesivo) {
        priceData.recurring = { interval: 'month' };
      }

      return stripe.checkout.sessions.create({
        customer_email: email,
        line_items: [{ price_data: priceData, quantity: 1 }],
        mode,
        success_url: `${origin}/#results?payment=success&session_id={CHECKOUT_SESSION_ID}&plan=${plan}`,
        cancel_url: `${origin}/#pricing`,
        metadata: { plan, country, currency: cur, chatFingerprint: chatFingerprint || '' },
      });
    }

    let session;
    try {
      session = await createSession(currency, amount);
    } catch (err: unknown) {
      // Fallback silencioso a USD si la moneda local no está habilitada en Stripe
      console.warn(`Stripe rejected currency ${currency} for country ${country}, falling back to USD:`, err instanceof Error ? err.message : err);
      const fallback = getPricingForCountry('US');
      const fallbackAmount = isObsesivo ? fallback.obsesivo : fallback.detective;
      session = await createSession('usd', fallbackAmount);
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
