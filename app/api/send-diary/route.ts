import { NextRequest, NextResponse } from 'next/server';
import { checkSessionPayment, isValidSessionId, markPdfEmailed, CHAT_FP_RE } from '@/lib/payments';
import { brevoEnabled, sendEmail } from '@/lib/brevo';
import { emailDiary } from '@/lib/email-templates';

// Manda el diario en PDF (una versión ligera que genera el navegador) al correo con el que se pagó.
// Nunca a otro correo: así no sirve para mandar nada a terceros. Máximo 3 envíos por pago.
// El PDF no se guarda: pasa por aquí y por Brevo, que lo entrega.
const MAX_BYTES = 4_000_000; // Vercel acepta ~4,5 MB por petición
const MAX_SENDS = 3;

export async function POST(req: NextRequest) {
  const sessionId = req.headers.get('x-session-id');
  const chatFp = req.headers.get('x-chat-fp') || '';
  if (!isValidSessionId(sessionId)) return NextResponse.json({ ok: false, error: 'invalid' }, { status: 400 });
  if (!brevoEnabled()) return NextResponse.json({ ok: false, error: 'not_configured' }, { status: 503 });

  const buf = Buffer.from(await req.arrayBuffer());
  if (buf.length > MAX_BYTES) return NextResponse.json({ ok: false, error: 'too_large' }, { status: 413 });
  if (buf.length < 1000 || buf.subarray(0, 5).toString('latin1') !== '%PDF-') return NextResponse.json({ ok: false, error: 'not_pdf' }, { status: 400 });

  const check = await checkSessionPayment(sessionId, { fresh: true });
  if (check.reason === 'error') return NextResponse.json({ ok: false, error: 'server_error' }, { status: 503 });
  if (!check.paid) return NextResponse.json({ ok: false, error: 'not_paid' }, { status: 402 });
  // El PDF tiene que ser del chat con el que se pagó (las compras antiguas no tienen huella)
  if (check.chatFp && (!CHAT_FP_RE.test(chatFp) || chatFp !== check.chatFp)) return NextResponse.json({ ok: false, error: 'wrong_chat' }, { status: 403 });
  if ((check.pdfEmails || 0) >= MAX_SENDS) return NextResponse.json({ ok: false, error: 'limit' }, { status: 429 });
  if (!check.email) return NextResponse.json({ ok: false, error: 'no_email' }, { status: 400 });

  const name = (req.headers.get('x-file-name') || 'diario-yalosabia.pdf').replace(/[^a-z0-9.-]/gi, '').slice(0, 60) || 'diario-yalosabia.pdf';
  try {
    const e = emailDiary();
    await sendEmail(check.email, e.subject, e.html, 'diario-pdf', [{ name: name.endsWith('.pdf') ? name : name + '.pdf', content: buf.toString('base64') }]);
    await markPdfEmailed(sessionId, check).catch(err => console.warn('[send-diary] contador:', err instanceof Error ? err.message : err));
    return NextResponse.json({ ok: true, to: maskEmail(check.email) });
  } catch (err: unknown) {
    console.error('[send-diary]', err instanceof Error ? err.message : err);
    return NextResponse.json({ ok: false, error: 'server_error' }, { status: 500 });
  }
}

// «ja***@gmail.com»: la web lo enseña sin devolver el correo completo
function maskEmail(email: string) {
  const [user, domain] = email.split('@');
  return (user.slice(0, 2) + '***@' + (domain || '')).slice(0, 80);
}
