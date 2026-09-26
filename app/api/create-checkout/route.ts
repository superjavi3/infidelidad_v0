import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getPricingForCountry } from '../pricing/route';
import { CHAT_FP_RE } from '@/lib/payments';
import { offerEnabled, promotionCodeFor, verifyOffer } from '@/lib/offer';

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY || '');
}

export async function POST(req: NextRequest) {
  try {
    const { email, plan, chatFp, offer, src } = await req.json();

    const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (typeof email !== 'string' || email.length > 200 || !EMAIL_RE.test(email.trim())) {
      return NextResponse.json(
        { error: 'Escribe un email válido' },
        { status: 400 }
      );
    }

    // Un pago = un diario: la sesión queda atada a la huella del chat
    if (typeof chatFp !== 'string' || !CHAT_FP_RE.test(chatFp)) {
      return NextResponse.json(
        { error: 'Primero sube el chat: el diario se escribe para una conversación concreta' },
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

    // Oferta de bienvenida: su código de un solo uso, si sigue vigente. Si algo falla, se cobra el precio normal.
    let promotionCode: string | null = null;
    const validOffer = offerEnabled() ? verifyOffer(offer) : null;
    if (validOffer) {
      try {
        promotionCode = await promotionCodeFor(stripe, validOffer);
      } catch (err: unknown) {
        console.warn('[offer] sin descuento:', err instanceof Error ? err.message : err);
      }
    }

    // De dónde llegó (primera visita): queda en la sesión de Stripe para ver qué canal trae ventas
    const clean = (v: unknown) => (typeof v === 'string' ? v.replace(/[^\w.:\- ]/g, '').slice(0, 80) : '');
    const firstVisit = src && typeof src === 'object' ? src : {};
    const attribution = Object.fromEntries(Object.entries({
      src_source: clean(firstVisit.s),
      src_medium: clean(firstVisit.m),
      src_campaign: clean(firstVisit.c),
      src_ad: clean(firstVisit.ad),
      src_referrer: clean(firstVisit.ref),
      src_first_visit: clean(firstVisit.t),
    }).filter(([, v]) => v));

    async function createSession(cur: string, amt: number) {
      return stripe.checkout.sessions.create({
        customer_email: email.trim(),
        line_items: [{
          price_data: {
            currency: cur,
            product_data: {
              name: 'Su diario completo — YaLoSabía',
            },
            unit_amount: amt,
          },
          quantity: 1,
        }],
        mode: 'payment',
        // Stripe no deja combinar un descuento aplicado con el campo para escribir códigos
        ...(promotionCode ? { discounts: [{ promotion_code: promotionCode }] } : { allow_promotion_codes: true }),
        success_url: `${origin}/#results?payment=success&session_id={CHECKOUT_SESSION_ID}&plan=premium`,
        cancel_url: `${origin}/#pricing`,
        metadata: {
          plan: 'premium',
          chat_fp: chatFp,
          country,
          currency: cur,
          ...(promotionCode && validOffer ? { offer_code: validOffer.code } : {}),
          ...attribution,
        },
      });
    }

    let session;
    try {
      session = await createSession(currency, amount);
    } catch (err: unknown) {
      // Solo se cambia a USD si Stripe rechaza la moneda; con cualquier otro error (p. ej. el código de
      // descuento) se reintenta en la misma moneda sin descuento, para no cobrar en dólares a quien paga en pesos.
      const msg = err instanceof Error ? err.message : String(err);
      if (promotionCode && !/currenc/i.test(msg)) {
        console.warn('[checkout] reintento sin descuento:', msg);
        promotionCode = null;
        session = await createSession(currency, amount);
        return NextResponse.json({ url: session.url });
      }
      // Fallback silencioso a USD si la moneda local no está habilitada en Stripe
      console.warn(`Stripe rejected currency ${currency} for country ${country}, falling back to USD:`, err instanceof Error ? err.message : err);
      const fallback = getPricingForCountry('US');
      session = await createSession('usd', fallback.premium);
    }

    return NextResponse.json({ url: session.url });
  } catch (error: unknown) {
    console.error('Checkout error:', error);
    return NextResponse.json(
      { error: 'No se pudo abrir el pago. Inténtalo de nuevo en un momento.' },
      { status: 500 }
    );
  }
}
