import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { addLead, brevoEnabled, sendEmail, welcomeEmail } from '@/lib/brevo';
import { emailOfferCode } from '@/lib/offer';

// «Háganlo luego»: guarda el correo en Brevo (con consentimiento) y manda al momento el enlace, los pasos
// y un código del 15% de un solo uso (7 días). El código no se devuelve a la web: solo va en el correo.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const clean = (v: unknown) => (typeof v === 'string' ? v.replace(/[^\w.:\- ]/g, '').slice(0, 60) : '');

export async function POST(req: NextRequest) {
  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* vacío */ }
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!EMAIL_RE.test(email) || email.length > 200) return NextResponse.json({ ok: false, error: 'email' }, { status: 400 });
  if (body.consent !== true) return NextResponse.json({ ok: false, error: 'consent' }, { status: 400 });
  if (!brevoEnabled()) return NextResponse.json({ ok: false, error: 'not_configured' }, { status: 503 });

  // Si Stripe falla, el correo sale igual, sin código
  let offer: { code: string; expiresAt: number; percent: number } | null = null;
  if (process.env.STRIPE_SECRET_KEY) {
    try { offer = await emailOfferCode(new Stripe(process.env.STRIPE_SECRET_KEY), email); }
    catch (err: unknown) { console.warn('[lead] sin código:', err instanceof Error ? err.message : err); }
  }
  const expires = offer ? new Date(offer.expiresAt).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', timeZone: 'America/Mexico_City' }) : '';

  try {
    await addLead(email, {
      FUENTE: clean(body.from) || 'web',
      ORIGEN: clean(body.source),
      CONSENTIMIENTO: new Date().toISOString(),
      ...(offer ? { CODIGO: offer.code, CODIGO_CADUCA: expires } : {}),
    });
    const w = welcomeEmail(offer ? { code: offer.code, percent: offer.percent, expires } : null);
    await sendEmail(email, w.subject, w.html, 'lead-e0');
    return NextResponse.json({ ok: true, discount: !!offer });
  } catch (err: unknown) {
    console.error('[lead]', err instanceof Error ? err.message : err);
    return NextResponse.json({ ok: false, error: 'server_error' }, { status: 500 });
  }
}
