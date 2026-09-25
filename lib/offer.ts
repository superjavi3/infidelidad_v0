import Stripe from 'stripe';
import { createHmac, randomInt, timingSafeEqual } from 'crypto';

// Oferta de bienvenida: 15% durante 30 minutos desde la primera visita, con un código
// de un solo uso por visitante. El servidor firma {código, caducidad}; el código solo se
// crea en Stripe cuando esa persona va a pagar, y Stripe hace cumplir el uso único y la caducidad.
export const OFFER_PERCENT = 15;
export const OFFER_MINUTES = 30;
export const OFFER_COUPON_ID = 'YLS15';
// Para apagar la oferta sin tocar código: OFFER_DISABLED=1 en Vercel
export const offerEnabled = () => process.env.OFFER_DISABLED !== '1';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sin 0/O ni 1/I
const CODE_RE = /^YLS-[A-HJ-NP-Z2-9]{5}$/;

function key() {
  const base = process.env.OFFER_SECRET || process.env.STRIPE_SECRET_KEY || '';
  return createHmac('sha256', 'yalosabia-offer').update(base).digest();
}
const b64 = (s: string) => Buffer.from(s, 'utf8').toString('base64url');
const sign = (payload: string) => createHmac('sha256', key()).update(payload).digest('base64url');

export function newOffer(now = Date.now()) {
  let code = 'YLS-';
  for (let i = 0; i < 5; i++) code += ALPHABET[randomInt(ALPHABET.length)];
  const expiresAt = now + OFFER_MINUTES * 60_000;
  const payload = b64(JSON.stringify({ c: code, e: expiresAt }));
  return { code, expiresAt, percent: OFFER_PERCENT, token: `${payload}.${sign(payload)}` };
}

// Devuelve el código si el token es auténtico y no ha caducado
export function verifyOffer(token: unknown, now = Date.now()): { code: string; expiresAt: number } | null {
  if (typeof token !== 'string' || token.length > 300) return null;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return null;
  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const { c, e } = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (typeof c !== 'string' || !CODE_RE.test(c) || typeof e !== 'number') return null;
    if (e <= now) return null;
    return { code: c, expiresAt: e };
  } catch {
    return null;
  }
}

async function ensureCoupon(stripe: Stripe) {
  try {
    await stripe.coupons.retrieve(OFFER_COUPON_ID);
  } catch {
    await stripe.coupons.create({ id: OFFER_COUPON_ID, percent_off: OFFER_PERCENT, duration: 'once', name: `Oferta de bienvenida ${OFFER_PERCENT}%` });
  }
}

// Código de Stripe de un solo uso para esta oferta (lo reutiliza si ya se creó y sigue sin usarse)
export async function promotionCodeFor(stripe: Stripe, offer: { code: string; expiresAt: number }): Promise<string | null> {
  const existing = await stripe.promotionCodes.list({ code: offer.code, limit: 1 });
  const found = existing.data[0];
  if (found) return found.active && (found.max_redemptions ?? 1) > found.times_redeemed ? found.id : null;
  await ensureCoupon(stripe);
  const created = await stripe.promotionCodes.create({
    promotion: { type: 'coupon', coupon: OFFER_COUPON_ID },
    code: offer.code,
    max_redemptions: 1,
    expires_at: Math.floor(offer.expiresAt / 1000),
    metadata: { source: 'oferta-bienvenida' },
  });
  return created.id;
}
