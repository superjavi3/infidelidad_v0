// Códigos de descuento para influencers (ver lib/ref.ts). Usa STRIPE_SECRET_KEY (de .env.local o del entorno).
//
//   node scripts/influencer-code.mjs crear SOFI20 sofi.y.tomas [--pct 20] [--comision 50]
//   node scripts/influencer-code.mjs lista
//   node scripts/influencer-code.mjs pausar SOFI20
//
// Crea un código de promoción multiuso en Stripe sobre el cupón YLSINF<pct> (lo crea si no existe) con
// metadata.influencer y metadata.commission_mxn. Su enlace: https://www.yalosabia.com/?c=SOFI20
// (se puede añadir &utm_source=instagram&utm_medium=influencer&utm_campaign=sofi). También se puede escribir
// a mano en la página de pago de Stripe. Ojo: Stripe está en modo live.
import Stripe from 'stripe';
import { readFileSync } from 'fs';

let key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  try { key = (readFileSync('.env.local', 'utf8').match(/^STRIPE_SECRET_KEY="?([^"\r\n]+)/m) || [])[1]; } catch {}
}
if (!key) { console.error('Falta STRIPE_SECRET_KEY (vercel env pull .env.local)'); process.exit(1); }
const stripe = new Stripe(key);

const [cmd, code, influencer, ...rest] = process.argv.slice(2);
const opt = (name, def) => { const i = rest.indexOf('--' + name); return i >= 0 ? Number(rest[i + 1]) : def; };

if (cmd === 'crear') {
  const c = String(code || '').toUpperCase();
  if (!/^[A-Z0-9]{3,20}$/.test(c) || !influencer) { console.error('Uso: crear CODIGO cuenta [--pct 20] [--comision 50]  (código: 3-20 letras/números)'); process.exit(1); }
  const pct = opt('pct', 20), commission = opt('comision', 50);
  const couponId = 'YLSINF' + pct;
  try { await stripe.coupons.retrieve(couponId); }
  catch { await stripe.coupons.create({ id: couponId, percent_off: pct, duration: 'once', name: `Influencer ${pct}%` }); }
  const pc = await stripe.promotionCodes.create({
    promotion: { type: 'coupon', coupon: couponId },
    code: c,
    metadata: { influencer, commission_mxn: String(commission) },
  });
  console.log(`Creado ${pc.code} (${pct}%, comisión MX$${commission}) para ${influencer}`);
  console.log(`Enlace: https://www.yalosabia.com/?c=${pc.code}&utm_source=instagram&utm_medium=influencer&utm_campaign=${encodeURIComponent(influencer)}`);
} else if (cmd === 'lista') {
  for await (const pc of stripe.promotionCodes.list({ limit: 100 })) {
    if (!pc.metadata?.influencer) continue;
    const n = pc.times_redeemed;
    console.log(`${pc.code.padEnd(14)} ${pc.metadata.influencer.padEnd(24)} ${pc.active ? 'activo ' : 'pausado'}  usos: ${n}  comisión: MX$${n * (Number(pc.metadata.commission_mxn) || 0)}`);
  }
  console.log('(usos = pagos con el código; los reembolsos no se restan: míralos en el panel)');
} else if (cmd === 'pausar') {
  const list = await stripe.promotionCodes.list({ code: String(code || '').toUpperCase(), limit: 1 });
  if (!list.data[0]) { console.error('No existe'); process.exit(1); }
  await stripe.promotionCodes.update(list.data[0].id, { active: false });
  console.log('Pausado ' + list.data[0].code);
} else {
  console.error('Uso: crear | lista | pausar  (ver la cabecera del archivo)');
  process.exit(1);
}
