import { NextRequest, NextResponse } from 'next/server';
import { addLead, brevoEnabled, sendEmail, welcomeEmail } from '@/lib/brevo';

// «Hacerlo luego»: guarda el correo en Brevo (con consentimiento) y manda el primer correo con el enlace
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const clean = (v: unknown) => (typeof v === 'string' ? v.replace(/[^\w.:\- ]/g, '').slice(0, 60) : '');

export async function POST(req: NextRequest) {
  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* vacío */ }
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!EMAIL_RE.test(email) || email.length > 200) return NextResponse.json({ ok: false, error: 'email' }, { status: 400 });
  if (body.consent !== true) return NextResponse.json({ ok: false, error: 'consent' }, { status: 400 });
  if (!brevoEnabled()) return NextResponse.json({ ok: false, error: 'not_configured' }, { status: 503 });
  try {
    await addLead(email, {
      FUENTE: clean(body.from) || 'web',
      ORIGEN: clean(body.source),
      CONSENTIMIENTO: new Date().toISOString(),
    });
    const w = welcomeEmail();
    await sendEmail(email, w.subject, w.html, 'lead-e0');
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    console.error('[lead]', err instanceof Error ? err.message : err);
    return NextResponse.json({ ok: false, error: 'server_error' }, { status: 500 });
  }
}
