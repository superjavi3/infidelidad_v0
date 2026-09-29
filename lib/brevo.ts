// Brevo (correo): guarda los contactos que piden «hacerlo luego» y les manda el primer correo.
// Necesita BREVO_API_KEY en Vercel. La lista «Leads web» se crea sola la primera vez
// (o se usa BREVO_LIST_ID si está definida). Remitente: contacto@yalosabia.com (dominio autenticado en Brevo).
export { emailE0 as welcomeEmail } from './email-templates';
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

// Atributos que usan las plantillas de Brevo ({{ contact.CODIGO }}); si ya existen, Brevo da error y se ignora
let attrsReady = false;
async function ensureAttributes() {
  if (attrsReady) return;
  for (const name of ['CODIGO', 'CODIGO_CADUCA']) {
    try { await brevo(`/contacts/attributes/normal/${name}`, { method: 'POST', body: JSON.stringify({ type: 'text' }) }); } catch { /* ya existe */ }
  }
  attrsReady = true;
}

export async function addLead(email: string, attributes: Record<string, string>) {
  const listId = await leadsListId();
  if (attributes.CODIGO) await ensureAttributes();
  try {
    await brevo('/contacts', { method: 'POST', body: JSON.stringify({ email, listIds: [listId], updateEnabled: true, attributes }) });
  } catch (err: unknown) {
    // Si faltan los atributos en Brevo (se crean con scripts/brevo-plantillas.mjs), se guarda el contacto sin ellos
    if (!/attribute/i.test(err instanceof Error ? err.message : '')) throw err;
    await brevo('/contacts', { method: 'POST', body: JSON.stringify({ email, listIds: [listId], updateEnabled: true }) });
  }
  return listId;
}

export async function sendEmail(to: string, subject: string, html: string, tag: string, attachment?: { name: string; content: string }[]) {
  await brevo('/smtp/email', { method: 'POST', body: JSON.stringify({ sender: SENDER, to: [{ email: to }], subject, htmlContent: html, tags: [tag], ...(attachment ? { attachment } : {}) }) });
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
