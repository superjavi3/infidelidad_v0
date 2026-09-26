import Stripe from 'stripe';
import { toMajorUnits } from './money';

// Datos del panel interno (/panel.html). Cada fuente es opcional: si falta su clave, se devuelve
// { configured: false } y el panel lo dice, en vez de romperse.
//   Stripe:  STRIPE_SECRET_KEY (ya existe)
//   PostHog: POSTHOG_PERSONAL_API_KEY (clave personal con permiso de lectura) y POSTHOG_PROJECT_ID
//   Meta:    META_ADS_TOKEN (token con ads_read) y META_AD_ACCOUNT_ID (por defecto la cuenta MVP)

const day = (d: Date) => d.toISOString().slice(0, 10);

export type Sale = { date: string; amount: number; currency: string; source: string; campaign: string; offer: boolean; refunded: boolean };

export async function stripeStats(days: number) {
  if (!process.env.STRIPE_SECRET_KEY) return { configured: false as const };
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const since = Math.floor(Date.now() / 1000) - days * 86400;
  const sales: Sale[] = [];
  let started = 0;
  for await (const s of stripe.checkout.sessions.list({ created: { gte: since }, limit: 100, expand: ['data.payment_intent.latest_charge'] })) {
    started++;
    if (s.payment_status !== 'paid') continue;
    const pi = s.payment_intent as Stripe.PaymentIntent | null;
    const ch = pi && typeof pi.latest_charge === 'object' ? (pi.latest_charge as Stripe.Charge | null) : null;
    sales.push({
      date: day(new Date(s.created * 1000)),
      amount: toMajorUnits(s.amount_total ?? 0, s.currency || 'mxn'),
      currency: (s.currency || 'mxn').toUpperCase(),
      source: s.metadata?.src_source || 'sin dato',
      campaign: s.metadata?.src_campaign || '',
      offer: !!s.metadata?.offer_code,
      refunded: !!(ch && (ch.refunded || ch.amount_refunded > 0 || ch.disputed)),
    });
  }
  return { configured: true as const, checkoutsStarted: started, sales };
}

async function hogql(query: string) {
  const res = await fetch(`https://us.posthog.com/api/projects/${process.env.POSTHOG_PROJECT_ID}/query/`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.POSTHOG_PERSONAL_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: { kind: 'HogQLQuery', query } }),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`PostHog ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return (await res.json()).results as unknown[][];
}

export const FUNNEL = ['$pageview', 'chat_uploaded', 'preview_shown', 'checkout_started', 'purchase'];

export async function posthogStats(days: number) {
  if (!process.env.POSTHOG_PERSONAL_API_KEY || !process.env.POSTHOG_PROJECT_ID) return { configured: false as const };
  const n = Math.max(1, Math.min(365, Math.floor(days)));
  const list = FUNNEL.map(e => `'${e}'`).join(',');
  // Personas únicas por paso y por origen (first_source se guarda desde el 26-sep-2026; antes sale «sin dato»)
  const bySource = await hogql(`
    SELECT event, coalesce(nullIf(properties.first_source, ''), 'sin dato') AS src, count(DISTINCT distinct_id)
    FROM events WHERE timestamp > now() - INTERVAL ${n} DAY AND event IN (${list})
    GROUP BY event, src`);
  const daily = await hogql(`
    SELECT toDate(timestamp) AS d, event, count(DISTINCT distinct_id)
    FROM events WHERE timestamp > now() - INTERVAL ${n} DAY AND event IN (${list})
    GROUP BY d, event ORDER BY d`);
  const devices = await hogql(`
    SELECT coalesce(properties.$device_type, 'otro') AS dev, count(DISTINCT distinct_id)
    FROM events WHERE timestamp > now() - INTERVAL ${n} DAY AND event = '$pageview'
    GROUP BY dev`);
  return {
    configured: true as const,
    bySource: bySource.map(([event, src, users]) => ({ event: String(event), source: String(src), users: Number(users) })),
    daily: daily.map(([d, event, users]) => ({ date: String(d).slice(0, 10), event: String(event), users: Number(users) })),
    devices: devices.map(([dev, users]) => ({ device: String(dev), users: Number(users) })),
  };
}

export async function metaStats(days: number) {
  const token = process.env.META_ADS_TOKEN;
  if (!token) return { configured: false as const };
  const account = process.env.META_AD_ACCOUNT_ID || '788285070542304';
  const until = new Date();
  const since = new Date(Date.now() - (days - 1) * 86400000);
  const params = new URLSearchParams({
    level: 'account',
    time_increment: '1',
    time_range: JSON.stringify({ since: day(since), until: day(until) }),
    fields: 'spend,impressions,reach,inline_link_clicks,actions',
    access_token: token,
  });
  const res = await fetch(`https://graph.facebook.com/v21.0/act_${account}/insights?${params}`, { cache: 'no-store' });
  const j = await res.json();
  if (!res.ok) throw new Error(`Meta ${res.status}: ${j?.error?.message || ''}`);
  type Row = { date_start: string; spend?: string; impressions?: string; inline_link_clicks?: string; actions?: { action_type: string; value: string }[] };
  return {
    configured: true as const,
    daily: (j.data as Row[]).map(r => ({
      date: r.date_start,
      spend: Number(r.spend || 0),
      impressions: Number(r.impressions || 0),
      clicks: Number(r.inline_link_clicks || 0),
      purchases: Number(r.actions?.find(a => a.action_type === 'offsite_conversion.fb_pixel_purchase')?.value || 0),
    })),
  };
}
