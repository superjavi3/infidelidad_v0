import Stripe from 'stripe';

// Stripe es la única fuente de verdad del acceso: una sesión de Checkout da acceso
// si está pagada y su cargo no se ha reembolsado ni disputado.

export interface PaymentCheck {
  paid: boolean;
  reason?: 'invalid' | 'not_found' | 'unpaid' | 'refunded' | 'disputed' | 'error';
  email?: string;
  amountTotal?: number;
  currency?: string;
}

const SESSION_ID_RE = /^cs_(live|test)_[A-Za-z0-9]{10,}$/;
const CACHE_TTL_MS = 10 * 60 * 1000;
const cache = new Map<string, { at: number; result: PaymentCheck }>();

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY || '');
}

export function isValidSessionId(id: unknown): id is string {
  return typeof id === 'string' && SESSION_ID_RE.test(id);
}

export async function checkSessionPayment(sessionId: unknown, { fresh = false } = {}): Promise<PaymentCheck> {
  if (!isValidSessionId(sessionId)) return { paid: false, reason: 'invalid' };

  const hit = cache.get(sessionId);
  if (!fresh && hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.result;

  let result: PaymentCheck;
  try {
    const session = await getStripe().checkout.sessions.retrieve(sessionId, {
      expand: ['payment_intent.latest_charge'],
    });

    if (session.status !== 'complete' || session.payment_status !== 'paid') {
      result = { paid: false, reason: 'unpaid' };
    } else {
      const pi = session.payment_intent as Stripe.PaymentIntent | null;
      const charge = (pi && typeof pi.latest_charge === 'object' ? pi.latest_charge : null) as Stripe.Charge | null;
      const base = {
        email: session.customer_details?.email || session.customer_email || '',
        amountTotal: session.amount_total ?? 0,
        currency: (session.currency || '').toLowerCase(),
      };
      if (charge && (charge.refunded || charge.amount_refunded > 0)) result = { paid: false, reason: 'refunded', ...base };
      else if (charge && charge.disputed) result = { paid: false, reason: 'disputed', ...base };
      else result = { paid: true, ...base };
    }
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    if (code === 'resource_missing') result = { paid: false, reason: 'not_found' };
    else {
      console.error('checkSessionPayment error:', err instanceof Error ? err.message : err);
      return { paid: false, reason: 'error' }; // no se cachea: puede ser un fallo puntual de Stripe
    }
  }

  cache.set(sessionId, { at: Date.now(), result });
  return result;
}

export function forgetSession(sessionId: string) {
  cache.delete(sessionId);
}
