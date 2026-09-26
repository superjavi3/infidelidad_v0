import { createHash } from 'crypto';

// API de conversiones de Meta: manda la compra desde el servidor, además del píxel del navegador,
// para que Meta la vea aunque el píxel falle (bloqueadores, Safari, la pestaña se cierra).
// Solo se usa si la persona aceptó «todas» las cookies (igual que el píxel) y si existe META_CAPI_TOKEN.
// Meta junta el evento del navegador y el del servidor por event_id (= id de la sesión de Stripe).
const PIXEL_ID = process.env.META_PIXEL_ID || '1580141019940219'; // «Market data», el de la campaña
const API_VERSION = 'v21.0';

const sha256 = (s: string) => createHash('sha256').update(s.trim().toLowerCase(), 'utf8').digest('hex');

export function capiEnabled() {
  return !!process.env.META_CAPI_TOKEN;
}

export async function sendPurchase(p: {
  eventId: string;
  email?: string;
  value: number;
  currency: string;
  ip?: string | null;
  userAgent?: string | null;
  fbp?: string | null;
  fbc?: string | null;
  url?: string;
}) {
  const token = process.env.META_CAPI_TOKEN;
  if (!token) return;
  const userData: Record<string, unknown> = {};
  if (p.email) userData.em = [sha256(p.email)];
  if (p.ip) userData.client_ip_address = p.ip;
  if (p.userAgent) userData.client_user_agent = p.userAgent;
  if (p.fbp) userData.fbp = p.fbp;
  if (p.fbc) userData.fbc = p.fbc;

  const body = {
    data: [{
      event_name: 'Purchase',
      event_time: Math.floor(Date.now() / 1000),
      event_id: p.eventId,
      action_source: 'website',
      event_source_url: p.url || 'https://www.yalosabia.com/',
      user_data: userData,
      custom_data: { value: p.value, currency: p.currency.toUpperCase(), content_name: 'premium' },
    }],
    ...(process.env.META_CAPI_TEST_CODE ? { test_event_code: process.env.META_CAPI_TEST_CODE } : {}),
  };

  try {
    const res = await fetch(`https://graph.facebook.com/${API_VERSION}/${PIXEL_ID}/events?access_token=${encodeURIComponent(token)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) console.warn('[capi] Meta respondió', res.status, (await res.text()).slice(0, 300));
  } catch (err: unknown) {
    console.warn('[capi] no se pudo enviar:', err instanceof Error ? err.message : err);
  }
}
