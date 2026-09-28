import Stripe from 'stripe';

// Códigos de descuento que la persona trae de fuera: el enlace de un influencer (yalosabia.com/?c=CODIGO)
// o un código escrito a mano en la ventana de pago («¿Tienes un código?»). Vale cualquier código de
// promoción activo de Stripe salvo los de la oferta de bienvenida (YLS-XXXXX, de un solo uso por visitante).
// Los de influencers llevan metadata.influencer y metadata.commission_mxn (scripts/influencer-code.mjs);
// create-checkout guarda ref_code/influencer en la sesión para calcular su comisión.
export const REF_RE = /^[A-Z0-9][A-Z0-9_-]{2,29}$/;

export type RefCode = {
  id: string;
  code: string;
  influencer: string;
  percent: number | null; // % de descuento, o null si el cupón es de importe fijo
  amountOff: number | null; // importe fijo en la unidad mínima de la moneda del cupón
  currency: string | null;
  commission: string;
};

export async function findRefCode(stripe: Stripe, raw: unknown): Promise<RefCode | null> {
  if (typeof raw !== 'string') return null;
  const code = raw.trim().toUpperCase();
  if (!REF_RE.test(code) || code.startsWith('YLS-')) return null;
  const list = await stripe.promotionCodes.list({ code, active: true, limit: 1, expand: ['data.promotion.coupon'] });
  const pc = list.data[0];
  if (!pc) return null;
  if (pc.max_redemptions != null && pc.times_redeemed >= pc.max_redemptions) return null;
  if (pc.expires_at && pc.expires_at * 1000 < Date.now()) return null;
  const coupon = pc.promotion?.coupon;
  if (!coupon || typeof coupon !== 'object' || !coupon.valid) return null;
  if (!coupon.percent_off && !coupon.amount_off) return null;
  return {
    id: pc.id,
    code,
    influencer: pc.metadata?.influencer || '',
    percent: coupon.percent_off ?? null,
    amountOff: coupon.amount_off ?? null,
    currency: coupon.currency ?? null,
    commission: pc.metadata?.commission_mxn || '',
  };
}
