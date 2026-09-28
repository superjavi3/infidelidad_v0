import Stripe from 'stripe';

// Códigos de influencers: códigos de promoción de Stripe (multiuso) con metadata.influencer.
// Se crean con scripts/influencer-code.mjs. El enlace de cada influencer es yalosabia.com/?c=CODIGO:
// el navegador lo guarda y, al pagar, create-checkout lo aplica y deja ref_code/influencer en la sesión
// para calcular su comisión. Los códigos de la oferta de bienvenida (YLS-XXXXX) no pasan este filtro.
export const REF_RE = /^[A-Z0-9]{3,20}$/;

export type RefCode = { id: string; code: string; influencer: string; percent: number; commission: string };

export async function findRefCode(stripe: Stripe, raw: unknown): Promise<RefCode | null> {
  if (typeof raw !== 'string') return null;
  const code = raw.trim().toUpperCase();
  if (!REF_RE.test(code)) return null;
  const list = await stripe.promotionCodes.list({ code, active: true, limit: 1, expand: ['data.promotion.coupon'] });
  const pc = list.data[0];
  if (!pc || !pc.metadata?.influencer) return null;
  if (pc.max_redemptions != null && pc.times_redeemed >= pc.max_redemptions) return null;
  const coupon = pc.promotion?.coupon;
  const percent = coupon && typeof coupon === 'object' && coupon.valid ? coupon.percent_off ?? 0 : 0;
  if (!percent) return null;
  return { id: pc.id, code, influencer: pc.metadata.influencer, percent, commission: pc.metadata.commission_mxn || '' };
}
