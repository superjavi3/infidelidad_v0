// Nombre único por red para el origen de una visita. La web (public/index.html, normalizeSource) usa la misma
// lista; aquí sirve para agrupar en el panel los orígenes guardados antes de normalizar («t.co», «l.instagram.com»…).
const ALIASES: [RegExp, string][] = [
  [/^(x|twitter|t\.co|x\.com|twitter\.com|mobile\.twitter\.com)$/, 'x'],
  [/^(ig|insta|instagram|(l|lm|m)\.instagram\.com|instagram\.com)$/, 'instagram'],
  [/^(fb|facebook|(l|lm|m|web)\.facebook\.com|facebook\.com|fb\.me)$/, 'facebook'],
  [/^(tiktok|tt|tiktok\.com|vm\.tiktok\.com|www\.tiktok\.com)$/, 'tiktok'],
  [/^(pinterest|pin|pin\.it|([a-z]{2}\.)?pinterest\.[a-z.]+)$/, 'pinterest'],
  [/^(whatsapp|wa|wa\.me|web\.whatsapp\.com|api\.whatsapp\.com)$/, 'whatsapp'],
  [/^(google|([a-z]+\.)?google\.[a-z.]+)$/, 'google'],
  [/^(youtube|youtube\.com|m\.youtube\.com|youtu\.be)$/, 'youtube'],
  [/^(bing|bing\.com)$/, 'bing'],
  [/^(email|correo|brevo)$/, 'email'],
];

export function normalizeSource(v: unknown): string {
  const s = String(v ?? '').trim().toLowerCase().replace(/^www\./, '');
  if (!s) return 'sin dato';
  for (const [re, name] of ALIASES) if (re.test(s)) return name;
  return s;
}
