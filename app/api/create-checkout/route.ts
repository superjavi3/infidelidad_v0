import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getPricingForCountry } from '../pricing/route';

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY || '');
}

export async function POST(req: NextRequest) {
  try {
    const { email, plan, chatFingerprint, isGift, gifterEmail, recipientEmail } = await req.json();

    if (!email || !plan) {
      return NextResponse.json(
        { error: 'Email y plan son requeridos' },
        { status: 400 }
      );
    }

    if (plan !== 'detective' && plan !== 'obsesivo' && plan !== 'group-completo') {
      return NextResponse.json(
        { error: 'Plan inválido. Usa "detective", "obsesivo" o "group-completo"' },
        { status: 400 }
      );
    }

    if (isGift && (!gifterEmail || !recipientEmail)) {
      return NextResponse.json(
        { error: 'Para regalos se requieren ambos emails' },
        { status: 400 }
      );
    }

    const country = req.headers.get('x-vercel-ip-country') || 'US';
    const pricing = getPricingForCountry(country);

    const isObsesivo = plan === 'obsesivo';
    const isGroupCompleto = plan === 'group-completo';
    const amount = isGroupCompleto ? pricing.groupCompleto : isObsesivo ? pricing.obsesivo : pricing.detective;
    const currency = pricing.currency;

    const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'https://yalosabia.com';
    const stripe = getStripe();
    const mode = isObsesivo ? 'subscription' : 'payment';

    const giftParam = isGift ? '&gift=true' : '';
    const customerEmail = isGift ? gifterEmail : email;
    const sessionMetadata: Record<string, string> = {
      plan,
      country,
      currency: currency,
      chatFingerprint: chatFingerprint || '',
    };
    if (isGift) {
      sessionMetadata.isGift = 'true';
      sessionMetadata.gifterEmail = gifterEmail;
      sessionMetadata.recipientEmail = recipientEmail;
    }

    async function createSession(cur: string, amt: number) {
      const priceData: Stripe.Checkout.SessionCreateParams.LineItem.PriceData = {
        currency: cur,
        product_data: {
          name: isGift
            ? 'Regalo Plan Detective — YaLoSabía'
            : isGroupCompleto ? 'Análisis Completo de Grupo — YaLoSabía'
            : isObsesivo ? 'Plan Obsesivo — YaLoSabía' : 'Plan Detective — YaLoSabía',
        },
        unit_amount: amt,
      };

      if (isObsesivo) {
        priceData.recurring = { interval: 'month' };
      }

      return stripe.checkout.sessions.create({
        customer_email: customerEmail,
        line_items: [{ price_data: priceData, quantity: 1 }],
        mode,
        allow_promotion_codes: true,
        success_url: `${origin}/#results?payment=success&session_id={CHECKOUT_SESSION_ID}&plan=${plan}${giftParam}`,
        cancel_url: `${origin}/#pricing`,
        metadata: { ...sessionMetadata, currency: cur },
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
