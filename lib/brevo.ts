// Brevo (correo): guarda los contactos que piden «hacerlo luego» y les manda el primer correo.
// Necesita BREVO_API_KEY en Vercel. La lista «Leads web» se crea sola la primera vez
// (o se usa BREVO_LIST_ID si está definida). Remitente: contacto@yalosabia.com (dominio autenticado en Brevo).
const API = 'https://api.brevo.com/v3';
const LIST_NAME = 'Leads web';
export const SENDER = { name: 'YaLoSabía', email: 'contacto@yalosabia.com' };

export const brevoEnabled = () => !!process.env.BREVO_API_KEY;

async function brevo(path: string, init: RequestInit = {}) {
  const res = await fetch(API + path, {
    ...init,
    headers: { 'api-key': process.env.BREVO_API_KEY || '', 'Content-Type': 'application/json', Accept: 'application/json', ...(init.headers || {}) },
    cache: 'no-store',
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) throw new Error(`Brevo ${res.status}: ${(data && data.message) || text.slice(0, 200)}`);
  return data;
}

let listIdCache: number | null = null;
async function leadsListId(): Promise<number> {
  if (process.env.BREVO_LIST_ID) return Number(process.env.BREVO_LIST_ID);
  if (listIdCache) return listIdCache;
  const lists = await brevo('/contacts/lists?limit=50&offset=0');
  const found = (lists.lists || []).find((l: { name: string; id: number }) => l.name === LIST_NAME);
  if (found) return (listIdCache = found.id);
  const folders = await brevo('/contacts/folders?limit=10&offset=0');
  let folderId = folders.folders && folders.folders[0] && folders.folders[0].id;
  if (!folderId) folderId = (await brevo('/contacts/folders', { method: 'POST', body: JSON.stringify({ name: 'YaLoSabía' }) })).id;
  const created = await brevo('/contacts/lists', { method: 'POST', body: JSON.stringify({ name: LIST_NAME, folderId }) });
  return (listIdCache = created.id);
}

export async function addLead(email: string, attributes: Record<string, string>) {
  const listId = await leadsListId();
  try {
    await brevo('/contacts', { method: 'POST', body: JSON.stringify({ email, listIds: [listId], updateEnabled: true, attributes }) });
  } catch (err: unknown) {
    // Si faltan los atributos en Brevo (se crean con scripts/brevo-plantillas.mjs), se guarda el contacto sin ellos
    if (!/attribute/i.test(err instanceof Error ? err.message : '')) throw err;
    await brevo('/contacts', { method: 'POST', body: JSON.stringify({ email, listIds: [listId], updateEnabled: true }) });
  }
  return listId;
}

export async function sendEmail(to: string, subject: string, html: string, tag: string) {
  await brevo('/smtp/email', { method: 'POST', body: JSON.stringify({ sender: SENDER, to: [{ email: to }], subject, htmlContent: html, tags: [tag] }) });
}

// Primer correo: el enlace y el tutorial. Estilo del diario, sin emojis.
export function welcomeEmail() {
  const u = (c: string, extra = '') => `https://www.yalosabia.com/?utm_source=email&utm_medium=lead&utm_campaign=${c}${extra}`;
  return {
    subject: 'Su diario, cuando tengan un minuto',
    html: `<!doctype html><html lang="es"><body style="margin:0;padding:0;background:#FFF8F6;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FFF8F6;"><tr><td align="center" style="padding:28px 14px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border:1px solid #EAD0CB;">
<tr><td style="padding:26px 28px 6px;font-family:Georgia,'Times New Roman',serif;font-size:30px;color:#3B0A12;"><span style="color:#C8102E;">YaLo</span><span style="color:#1F3A93;">Sabía</span></td></tr>
<tr><td style="padding:6px 28px 0;font-family:'Courier New',Courier,monospace;font-size:15px;line-height:1.6;color:#3B0A12;">
<p style="margin:0 0 14px;">Hola:</p>
<p style="margin:0 0 14px;">Aquí tienen el enlace para hacer el diario de su relación cuando tengan el chat a mano. Son tres pasos y tarda un par de minutos:</p>
<p style="margin:0 0 6px;"><b>1.</b> En WhatsApp, abran su chat.</p>
<p style="margin:0 0 6px;"><b>2.</b> Android: los tres puntos &rsaquo; Más &rsaquo; Exportar chat &rsaquo; Sin archivos. iPhone: toquen el nombre arriba &rsaquo; Exportar chat &rsaquo; Sin archivos.</p>
<p style="margin:0 0 18px;"><b>3.</b> Suban el archivo en yalosabia.com y vean su adelanto gratis.</p>
</td></tr>
<tr><td align="center" style="padding:4px 28px 8px;"><a href="${u('e0', '#subir')}" style="display:inline-block;background:#C8102E;color:#FFF4EF;text-decoration:none;font-family:'Courier New',Courier,monospace;font-weight:bold;font-size:15px;letter-spacing:1px;padding:14px 26px;">HACER NUESTRO DIARIO</a></td></tr>
<tr><td align="center" style="padding:6px 28px 22px;font-family:'Courier New',Courier,monospace;font-size:13px;"><a href="${u('e0', '&tutorial=1')}" style="color:#C8102E;">¿No les queda claro? Vean el tutorial en video (1 minuto)</a></td></tr>
<tr><td style="padding:0 28px 26px;font-family:'Courier New',Courier,monospace;font-size:13px;line-height:1.6;color:#7A4B52;">El adelanto se hace en su teléfono y su chat no se guarda en ningún servidor.</td></tr>
</table>
<p style="max-width:520px;font-family:'Courier New',Courier,monospace;font-size:11px;line-height:1.5;color:#9A7A80;margin:14px auto 0;">Recibes este correo porque pediste el enlace en yalosabia.com. Si no quieres recibir más, responde «baja» a este correo.</p>
</td></tr></table></body></html>`,
  };
}

// Quien paga sale de la lista (la automatización de Brevo deja de mandarle recordatorios).
// Si no estaba (no pidió el correo), Brevo da 404 y no se hace nada.
const buyersDone = new Set<string>();
export async function markBuyer(email: string) {
  const e = (email || '').trim().toLowerCase();
  if (!brevoEnabled() || !e || buyersDone.has(e)) return;
  buyersDone.add(e);
  try {
    const listId = await leadsListId();
    await brevo(`/contacts/${encodeURIComponent(e)}`, { method: 'PUT', body: JSON.stringify({ attributes: { COMPRADO: 'si' }, unlinkListIds: [listId] }) });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!/Brevo 404/.test(msg)) console.warn('[brevo] markBuyer:', msg);
  }
}
