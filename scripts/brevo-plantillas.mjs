// Crea o actualiza en Brevo las plantillas de la secuencia «Háganlo luego» (E1, E2, E3).
// El E0 (el enlace) lo manda /api/lead al momento (lib/brevo.ts). Estas tres las manda la automatización de Brevo:
//   contacto añadido a «Leads web» → esperar 1 día → E1 → 2 días → E2 → 3 días → E3,
//   comprobando antes de cada correo que el contacto sigue en la lista (quien paga sale sola: markBuyer).
// Uso: node scripts/brevo-plantillas.mjs   (BREVO_API_KEY de .env.local o del entorno)
import { readFileSync } from 'node:fs';

let key = process.env.BREVO_API_KEY;
if (!key) {
  try { key = (readFileSync('.env.local', 'utf8').match(/^BREVO_API_KEY="?([^"\r\n]+)/m) || [])[1]; } catch {}
}
if (!key) { console.error('Falta BREVO_API_KEY (vercel env pull .env.local)'); process.exit(1); }

const SENDER = { name: 'YaLoSabía', email: 'contacto@yalosabia.com' };
const url = (c, extra = '#subir') => `https://www.yalosabia.com/?utm_source=email&utm_medium=lead&utm_campaign=${c}${extra}`;

const layout = (body, cta) => `<!doctype html><html lang="es"><body style="margin:0;padding:0;background:#FFF8F6;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FFF8F6;"><tr><td align="center" style="padding:28px 14px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border:1px solid #EAD0CB;">
<tr><td style="padding:26px 28px 6px;font-family:Georgia,'Times New Roman',serif;font-size:30px;"><span style="color:#C8102E;">YaLo</span><span style="color:#1F3A93;">Sabía</span></td></tr>
<tr><td style="padding:6px 28px 0;font-family:'Courier New',Courier,monospace;font-size:15px;line-height:1.6;color:#3B0A12;">${body}</td></tr>
<tr><td align="center" style="padding:6px 28px 26px;"><a href="${cta.href}" style="display:inline-block;background:#C8102E;color:#FFF4EF;text-decoration:none;font-family:'Courier New',Courier,monospace;font-weight:bold;font-size:15px;letter-spacing:1px;padding:14px 26px;">${cta.label}</a></td></tr>
</table>
<p style="max-width:520px;font-family:'Courier New',Courier,monospace;font-size:11px;line-height:1.5;color:#9A7A80;margin:14px auto 0;">Recibes este correo porque pediste el enlace en yalosabia.com. <a href="{{ unsubscribe }}" style="color:#9A7A80;">Darme de baja</a>.</p>
</td></tr></table></body></html>`;

const p = t => `<p style="margin:0 0 14px;">${t}</p>`;

const TEMPLATES = [
  {
    templateName: 'YLS E1 - Exportar el chat',
    subject: '¿Ya tienen su chat a mano?',
    htmlContent: layout(
      p('Hola:') +
      p('Ayer nos pidieron el enlace para hacer su diario. Por si se quedó pendiente, exportar el chat es más fácil de lo que parece:') +
      p('<b>Android:</b> abran el chat &rsaquo; los tres puntos &rsaquo; Más &rsaquo; Exportar chat &rsaquo; Sin archivos.<br><b>iPhone:</b> abran el chat &rsaquo; toquen el nombre arriba &rsaquo; Exportar chat &rsaquo; Sin archivos.') +
      p('Luego suben ese archivo en la web y en un minuto ven su adelanto: el índice de su relación, cuántos mensajes se han mandado y quién escribe primero. El adelanto es gratis y se hace en su teléfono; su chat no se guarda en ningún servidor.') +
      p(`Si se atoran, aquí está el <a href="${url('e1', '&tutorial=1')}" style="color:#C8102E;">tutorial en video</a> (un minuto).`),
      { href: url('e1'), label: 'VER NUESTRO ADELANTO' }),
  },
  {
    templateName: 'YLS E2 - Lo que trae el diario',
    subject: 'Lo que cabe en 14 páginas',
    htmlContent: layout(
      p('Hola:') +
      p('Les cuento qué trae el diario, para que sepan qué esperar:') +
      p('Cómo empezó todo, con su primer mensaje. Los días que vale la pena recordar. Quién es quién en la relación. Cómo se hablan, cuánto tardan en contestarse y las palabras que más usan. Qué tan compatibles son, las señales a cuidar, si van a durar y unos consejos. Y al final, el mensaje de ustedes que más vale guardar.') +
      `<p style="margin:0 0 14px;text-align:center;"><img src="https://www.yalosabia.com/diario/portada.jpg" width="240" alt="Portada de un diario de ejemplo" style="max-width:60%;height:auto;border:1px solid #EAD0CB;"></p>` +
      p(`Todo sale de sus propios mensajes: cada frase que citamos existe tal cual en su chat. Pueden ver <a href="${url('e2', '#indice')}" style="color:#C8102E;">las 14 páginas de un diario de ejemplo</a> antes de nada.`) +
      p('El adelanto es gratis; el diario completo en PDF cuesta $199 MXN, un solo pago.'),
      { href: url('e2'), label: 'HACER NUESTRO DIARIO' }),
  },
  {
    templateName: 'YLS E3 - Ultima nota',
    subject: 'Una última nota',
    htmlContent: layout(
      p('Hola:') +
      p('Este es el último correo que les mandamos; no queremos llenarles la bandeja.') +
      p('Si algún día les da curiosidad ver su historia contada con sus propios mensajes, el enlace sigue aquí. No es para acusar a nadie ni para juzgar la relación: es para recordar cómo empezaron y ver lo que se dicen sin darse cuenta.') +
      p('Gracias por habernos leído.'),
      { href: url('e3'), label: 'VER NUESTRO ADELANTO' }),
  },
];

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
