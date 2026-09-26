// Preview local de public/ sin Next, sin Stripe y sin Gemini.
// /api/pricing devuelve el precio de México y /api/analyze un diario de ejemplo,
// así se puede recorrer todo el flujo (adelanto → pago simulado → PDF) sin gastar nada.
// Uso: npm run preview:static  →  http://localhost:5173
//
// En la consola del navegador:
//   loadDemo()                                   chat de ejemplo (modo demo: muestra el paywall)
//   await processChat(texto)                      procesa un export de WhatsApp como texto
//   rememberPurchase('cs_test_x'.padEnd(20,'x'), window.currentChatFp); onNewChatLoaded(); unlockPlan()
//                                                  simula que este chat está pagado → «¡Listo!» + PDF
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';

const root = resolve(process.argv[2] || 'public');
const port = Number(process.argv[3] || 5173);
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json', '.txt': 'text/plain' };

// Las citas son textos que existen en el chat de ejemplo (generateDemoMessages) para que pasen la verificación
const DIARY = {
  opening: 'Querida Laura, querido Carlos: leímos cada uno de sus mensajes, desde aquel primer «qué día más largo» hasta el último buenas noches. Esto es lo que encontramos.',
  profiles: {
    A: { archetype: '«la que inicia»', description: 'Empieza casi todas las conversaciones y cuenta su día con detalle.', traits: ['directa', 'nocturna', 'detallista'], quote: { text: '¿Comemos juntos?' } },
    B: { archetype: '«el que cierra con broma»', description: 'Tiene la última palabra en casi todas las discusiones, casi siempre con humor.', traits: ['relajado', 'conciliador', 'de día'], quote: { text: 'Qué día más largo' } },
  },
  moments: [
    { id: 'first', text: 'Empezó con algo tan pequeño como un día largo. Ninguno de los dos sabía que ahí empezaba todo.' },
    { id: 'love', text: 'Lo dijeron casi sin pensarlo, y la respuesta llegó enseguida. Hay cosas que no hace falta preparar.' },
    { id: 'busiest', text: 'Ese día no se soltaron: cientos de mensajes, como si no quisieran que la conversación se acabara.' },
    { id: 'lastLove', text: 'La última vez que se lo escribieron. Quizá se lo dicen en persona; quizá toca volver a escribirlo.' },
    { id: 'silence', text: 'Después de días sin hablar, alguien dio el primer paso. Eso también es querer.' },
  ],
  compatibility: {
    percent: 78, summary: 'Se entienden muy bien en lo emocional; chocan en los tiempos.',
    loveLanguages: { A: { palabras: 90, tiempo: 70, servicio: 40, contacto: 50, regalos: 20 }, B: { palabras: 65, tiempo: 85, servicio: 60, contacto: 45, regalos: 30 } },
    strengths: ['Se dicen lo que sienten', 'Se ríen mucho juntos'], toWork: ['Los tiempos al discutir', 'Más planes a futuro'],
  },
  signals: { toWatch: [{ title: 'Se dejan de hablar después de discutir', detail: 'Los silencios largos llegan tras un desacuerdo.', level: 'importante', quote: { text: 'Tenemos que hablar de lo nuestro' } }], greenFlags: ['Se dan las buenas noches casi a diario'] },
  forecast: { level: 'estable', position: 68, headline: 'Buen rumbo, con una condición.', explanation: 'Se buscan a diario y el cariño se mantiene.', pros: ['Hablan todos los días'], cons: ['Silencios tras discutir'], condition: 'No dejarse de hablar cuando discuten.' },
  advice: [1, 2, 3, 4, 5].map(i => ({ title: `Consejo ${i}`, text: 'Texto de ejemplo del consejo.' })),
  bestMessage: null,
  quotesToKeep: [{ text: 'Eres lo mejor que me ha pasado' }, { text: 'Gracias por existir' }, { text: 'Estoy muy bien contigo' }],
  closing: 'Ojalá este diario les recuerde por qué empezaron a escribirse. Y ojalá esta noche alguno de los dos escriba primero.',
};

createServer(async (req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  const json = (status, body) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(body)); };
  if (url === '/api/pricing') return json(200, { country: 'MX', currency: 'mxn', symbol: '$', label: 'MXN', premium: 19900, premiumFormatted: '$199', isZeroDecimal: false });
  if (url === '/api/analyze') return json(200, { success: true, diary: DIARY });
  // Oferta de bienvenida falsa (el token no vale para Stripe; solo para ver la barra y el precio)
  if (url === '/api/offer') return json(200, { enabled: true, code: 'YLS-PRUEB', expiresAt: Date.now() + 30 * 60000, percent: 15, token: 'preview.preview' });
  // Panel interno con datos inventados (clave: «preview»), para ver el diseño sin claves
  if (url === '/api/panel') {
    if (req.headers['x-panel-key'] !== 'preview') return json(401, { error: 'Clave incorrecta (en el preview es «preview»)' });
    const days = 14, d = i => new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    const daily = [], bySource = [];
    const ev = ['$pageview', 'chat_uploaded', 'preview_shown', 'checkout_started', 'purchase'];
    for (let i = days - 1; i >= 0; i--) { const v = 60 + ((i * 37) % 90); [v, v * 0.3, v * 0.22, v * 0.05, v * 0.02].forEach((n, j) => daily.push({ date: d(i), event: ev[j], users: Math.round(n) })); }
    [['meta', 900], ['directo', 300], ['pinterest', 120], ['sin dato', 250]].forEach(([s, v]) => [v, v * 0.3, v * 0.22, v * 0.05, v * 0.02].forEach((n, j) => bySource.push({ event: ev[j], source: s, users: Math.round(n) })));
    return json(200, {
      days, generatedAt: new Date().toISOString(),
      stripe: { configured: true, checkoutsStarted: 60, sales: [{ date: d(9), amount: 169.15, currency: 'MXN', source: 'sin dato', campaign: '', offer: true, refunded: false }, { date: d(3), amount: 199, currency: 'MXN', source: 'meta', campaign: 'trafico_mx', offer: false, refunded: false }, { date: d(1), amount: 169.15, currency: 'MXN', source: 'pinterest', campaign: 'q4_20', offer: true, refunded: false }] },
      posthog: { configured: true, bySource, daily, devices: [{ device: 'Mobile', users: 1300 }, { device: 'Desktop', users: 270 }] },
      meta: { configured: false },
    });
  }
  if (url.startsWith('/api/')) return json(503, { success: false, error: 'API no disponible en el preview estático' });

  const file = join(root, url === '/' ? 'index.html' : url);
  if (!file.startsWith(root)) { res.writeHead(403); return res.end(); }
  try {
    const data = await readFile(file);
    res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(404); res.end('not found');
  }
}).listen(port, () => console.log(`Preview estático en http://localhost:${port}`));
