// Crea o actualiza en Brevo las plantillas de la secuencia «Háganlo luego» (E1 y E2).
// El E0 (el enlace) lo manda /api/lead al momento (lib/brevo.ts). Estas tres las manda la automatización de Brevo:
//   contacto añadido a «Leads web» → esperar 2 días → E1 → 3 días → E2 (el último),
//   comprobando antes de cada correo que el contacto sigue en la lista (quien paga sale sola: markBuyer).
// Uso: node scripts/brevo-plantillas.mjs   (BREVO_API_KEY de .env.local o del entorno)
import { readFileSync } from 'node:fs';
import { SEQUENCE } from '../lib/email-templates.ts';

let key = process.env.BREVO_API_KEY;
if (!key) {
  try { key = (readFileSync('.env.local', 'utf8').match(/^BREVO_API_KEY="?([^"\r\n]+)/m) || [])[1]; } catch {}
}
if (!key) { console.error('Falta BREVO_API_KEY (vercel env pull .env.local)'); process.exit(1); }


const SENDER = { name: 'YaLoSabía', email: 'contacto@yalosabia.com' };
// Diseño y textos: lib/email-templates.ts (el mismo archivo que usa el E0 de /api/lead)
const TEMPLATES = SEQUENCE.map(fn => { const e = fn(); return { templateName: e.name, subject: e.subject, htmlContent: e.html }; });

async function brevo(path, init = {}) {
  const res = await fetch('https://api.brevo.com/v3' + path, {
    ...init,
    headers: { 'api-key': key, 'Content-Type': 'application/json', Accept: 'application/json' },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Brevo ${res.status}: ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : {};
}

// Atributos de contacto que usa /api/lead y markBuyer (si ya existen, Brevo da error y se ignora)
for (const name of ['FUENTE', 'ORIGEN', 'CONSENTIMIENTO', 'COMPRADO']) {
  try { await brevo(`/contacts/attributes/normal/${name}`, { method: 'POST', body: JSON.stringify({ type: 'text' }) }); console.log('atributo creado', name); }
  catch { /* ya existe */ }
}

// Lista «Leads web» (la usa la automatización como disparador; /api/lead la crearía igual con el primer contacto)
const lists = (await brevo('/contacts/lists?limit=50&offset=0')).lists || [];
let list = lists.find(l => l.name === 'Leads web');
if (!list) {
  const folders = (await brevo('/contacts/folders?limit=10&offset=0')).folders || [];
  const folderId = folders[0] ? folders[0].id : (await brevo('/contacts/folders', { method: 'POST', body: JSON.stringify({ name: 'YaLoSabía' }) })).id;
  list = await brevo('/contacts/lists', { method: 'POST', body: JSON.stringify({ name: 'Leads web', folderId }) });
  console.log(`lista creada #${list.id}  Leads web`);
} else console.log(`lista ya existe #${list.id}  Leads web`);

const existing = (await brevo('/smtp/templates?limit=100&offset=0')).templates || [];
for (const t of TEMPLATES) {
  const body = { ...t, sender: SENDER, isActive: true, tag: 'lead-secuencia' };
  const found = existing.find(e => e.name === t.templateName);
  if (found) {
    await brevo(`/smtp/templates/${found.id}`, { method: 'PUT', body: JSON.stringify(body) });
    console.log(`actualizada #${found.id}  ${t.templateName}`);
  } else {
    const r = await brevo('/smtp/templates', { method: 'POST', body: JSON.stringify(body) });
    console.log(`creada     #${r.id}  ${t.templateName}`);
  }
}
