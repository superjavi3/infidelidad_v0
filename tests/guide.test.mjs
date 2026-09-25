/*
 * Tests de la guía: la biblioteca (public/guide/blocks.js), el ensamblado y
 * la validación de lo que devuelve la IA (public/guide/assemble.js), y el
 * agregado anónimo que se le envía (buildGuideAIPayload).
 * Ejecutar con: npm test
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadBrowserScripts, wire } from './helpers/load-browser.mjs';
import { generateChat, A, B, NOW } from './fixtures/synthetic-chats.mjs';

const sb = loadBrowserScripts(['ai-payload.js', 'keywords.js', 'metrics.js', '../guide/blocks.js', '../guide/assemble.js']);
const { YLSMetrics, YLSGuide, YLSGuideBlocks, YLSPayload } = sb.window;

const chats = {};
for (const kind of ['sano', 'enfriandose', 'terminado']) {
  const messages = generateChat(kind);
  const stats = sb.analyzeMessages(messages);
  const report = YLSMetrics.buildReportData(messages, stats, { now: NOW });
  chats[kind] = { stats, report, guide: YLSGuide.assemble(report) };
}

/* Todas las cadenas de un objeto, con su ruta. */
function strings(value, path = '$', out = []) {
  if (typeof value === 'string') out.push([path, value]);
  else if (Array.isArray(value)) value.forEach((v, i) => strings(v, `${path}[${i}]`, out));
  else if (value && typeof value === 'object') Object.keys(value).forEach(k => strings(value[k], `${path}.${k}`, out));
  return out;
}

const CLINICAL = /t[oó]xic|narcis|apego (?:ansioso|evitativo)|red ?flag|gaslight|manipulador|psic[oó]pata|bipolar|infiel/i;
const VOSOTROS = /(?<!\p{L})(?:vosotr[oa]s|vuestr[oa]s?|os|habéis|tenéis|podéis|queréis|sabéis|sois|estáis|hacéis|decís)(?!\p{L})/iu;
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
const SPAIN = /\b(?:vale|móvil|ordenador|guay|currar|liad[oa]|mola|tío|tía)\b(?! (?:la|más|mucho|poco))/i;

test('la biblioteca no usa etiquetas clínicas, vosotros, españolismos, emojis ni huecos sin rellenar', () => {
  for (const [path, text] of strings(wire(YLSGuideBlocks))) {
    assert.ok(!CLINICAL.test(text), `${path}: etiqueta clínica en «${text.slice(0, 80)}»`);
    assert.ok(!VOSOTROS.test(text), `${path}: forma de vosotros en «${text.slice(0, 80)}»`);
    assert.ok(!SPAIN.test(text), `${path}: expresión de España en «${text.slice(0, 80)}»`);
    assert.ok(!EMOJI.test(text), `${path}: emoji`);
    assert.ok(!/[{}]/.test(text), `${path}: llave sin rellenar`);
    // Las secciones 16 a 18 cambian de número según aparezca o no la de final.
    assert.ok(!/secci[oó]n 1[6-8]/.test(text), `${path}: remite a una sección que cambia de número`);
  }
});

test('cada patrón tiene un bloque completo', () => {
  for (const id of YLSGuide.PRIORITY) {
    const b = YLSGuideBlocks.CONCERNS[id];
    assert.ok(b, `falta el bloque ${id}`);
    for (const field of ['title', 'calm', 'significa', 'noSignifica', 'normal', 'preocupa', 'queHacer']) {
      assert.ok(b[field] && b[field].length, `${id}.${field} vacío`);
    }
    if (b.conversation) {
      for (const field of ['title', 'porque', 'cuando', 'abrir', 'escuchar', 'evitar']) {
        assert.ok(b.conversation[field] && b.conversation[field].length, `${id}.conversation.${field} vacío`);
      }
      for (const opening of b.conversation.abrir) {
        const sentences = opening.guion.split(/[.?!]+\s/).filter(Boolean).length;
        assert.ok(sentences >= 3 && sentences <= 6, `${id}: el guion tiene ${sentences} frases`);
      }
    }
  }
});

test('la guía de los tres chats tiene entre 6,000 y 9,000 palabras', () => {
  for (const [kind, c] of Object.entries(chats)) {
    assert.ok(c.guide.wordCount >= 6000 && c.guide.wordCount <= 9000, `${kind}: ${c.guide.wordCount} palabras`);
  }
});

test('la guía ensamblada no deja huecos, ni undefined, ni NaN', () => {
  for (const [kind, c] of Object.entries(chats)) {
    for (const [path, text] of strings(wire(c.guide))) {
      assert.ok(!/undefined|NaN|null|\{|\}/.test(text), `${kind} ${path}: «${text.slice(0, 100)}»`);
    }
  }
});

test('detección: cada chat activa lo que tiene que activar', () => {
  const ids = (kind) => chats[kind].guide.detection.concerns.map(c => c.id);
  assert.ok(chats.sano.guide.detection.concerns.every(c => c.severity < 3), 'el sano no tiene avisos graves');
  assert.ok(chats.sano.guide.detection.concerns.length <= 2);
  assert.ok(chats.sano.guide.detection.healthy.length >= 3);

  for (const kind of ['enfriandose', 'terminado']) {
    for (const id of ['respuesta', 'preguntas', 'enfriamiento', 'temas', 'silencios']) {
      assert.ok(ids(kind).includes(id), `${kind} debería activar ${id}`);
    }
  }
  assert.ok(ids('enfriandose').includes('iniciativa'), 'Elena abre el 71% en la segunda mitad');
  assert.ok(ids('terminado').includes('volumen'));
});

test('la sección de final solo aparece en el chat que terminó', () => {
  assert.equal(chats.sano.guide.ending, null);
  assert.equal(chats.enfriandose.guide.ending, null);
  assert.ok(chats.terminado.guide.ending);
});

test('la sección 11 cuenta lo que preocupa y también lo que se miró y no preocupa', () => {
  for (const c of Object.values(chats)) {
    const covered = c.guide.meaning.map(m => m.id).concat(c.guide.calm.map(m => m.id)).sort();
    assert.deepEqual(wire(covered), wire([...YLSGuide.PRIORITY].sort()));
  }
});

test('conversaciones: entre 3 y 5, sin repetir, con las de los patrones primero', () => {
  for (const [kind, c] of Object.entries(chats)) {
    const ids = c.guide.conversations.map(x => x.id);
    assert.ok(ids.length >= 3 && ids.length <= 5, kind);
    assert.equal(new Set(ids).size, ids.length, kind);
  }
  assert.equal(chats.enfriandose.guide.conversations[0].id, chats.enfriandose.guide.detection.concerns[0].id);
});

test('plan de 30 días: 4 semanas de 2 o 3 acciones, y la última compara', () => {
  for (const [kind, c] of Object.entries(chats)) {
    assert.equal(c.guide.plan.length, 4, kind);
    c.guide.plan.forEach((w, i) => {
      assert.equal(w.week, i + 1);
      assert.ok(w.actions.length >= 2 && w.actions.length <= 3, `${kind} semana ${w.week}: ${w.actions.length}`);
      assert.ok(w.focus && w.intro);
    });
    assert.ok(c.guide.plan[3].actions.some(a => /Vuelve a analizar el chat/.test(a)), kind);
  }
});

test('tu informe en 10 frases: diez, con números y sin repetir', () => {
  for (const [kind, c] of Object.entries(chats)) {
    assert.equal(c.guide.summary.length, 10, kind);
    assert.equal(new Set(c.guide.summary).size, 10, kind);
    assert.ok(c.guide.summary.filter(s => /\d/.test(s)).length >= 4, kind);
  }
  assert.ok(chats.enfriandose.guide.summary.some(s => /últimos tres meses/.test(s)),
    'si el score reciente es muy distinto, se dice');
});

test('las líneas de ayuda de México y España están', () => {
  const { lines } = YLSGuideBlocks.HELP;
  assert.ok(lines.mx.some(l => l.contact === '911'));
  assert.ok(lines.mx.some(l => l.contact === '800 911 2000'));
  assert.ok(lines.es.some(l => l.contact === '024'));
  assert.ok(lines.es.some(l => l.contact === '016'));
});

/* ── La capa de IA ── */

function ctxOf(kind) {
  return YLSGuide.aiContext(chats[kind].report);
}

const goodAI = {
  headline: 'La conversación se ha vuelto más de Elena que de los dos en los últimos meses.',
  onePage: {
    summary: 'El score es 78, pero los últimos tres meses bajan a 45: la conversación se enfrió en la segunda mitad.',
    good: ['Durante un año contestaban en menos de 15 minutos.'],
    watch: ['Tomás pasó de contestar en 11 minutos a 3 horas.', 'La mitad de las preguntas de Elena se quedan sin respuesta.']
  },
  patterns: [
    { id: 'respuesta', intro: 'Tomás contestaba en 11 minutos y ahora tarda 3 horas en mediana; Elena sigue en 8 minutos.' },
    { id: 'inventado', intro: 'Esto no debería pasar la validación porque el id no existe.' }
  ],
  conversations: ['preguntas', 'respuesta', 'loQueFunciona', 'noExiste'],
  plan: [1, 2, 3, 4].map(w => ({ week: w, focus: 'Semana ' + w, actions: ['Una acción concreta para la semana ' + w, 'Otra acción medible para la semana ' + w] }))
};

test('sanitizeAI acepta una respuesta buena y descarta lo que no está permitido', () => {
  const clean = wire(YLSGuide.sanitizeAI(goodAI, ctxOf('enfriandose')));
  assert.equal(clean.headline, goodAI.headline);
  assert.deepEqual(Object.keys(clean.patterns), ['respuesta']);
  assert.deepEqual(clean.conversations, ['preguntas', 'respuesta', 'loQueFunciona']);
  assert.equal(clean.plan.length, 4);
  assert.equal(clean.onePage.watch.length, 2);
});

test('sanitizeAI tira etiquetas clínicas, emojis, consejos de ruptura y planes incompletos', () => {
  const ctx = ctxOf('enfriandose');
  const bad = wire(YLSGuide.sanitizeAI({
    headline: 'Tomás tiene un apego evitativo muy claro en estos datos.',
    onePage: { summary: 'Deberías dejarlo, los números no mienten nunca en estos casos.', good: [], watch: ['x'] },
    patterns: [{ id: 'respuesta', intro: 'Una relación tóxica se nota en los tiempos de respuesta de este chat.' },
      { id: 'preguntas', intro: 'Las preguntas de Elena se quedan sin respuesta 💔 cada vez más a menudo.' }],
    conversations: ['respuesta'],
    plan: goodAI.plan.slice(0, 3)
  }, ctx));
  assert.equal(bad, null);
  assert.equal(YLSGuide.sanitizeAI('texto suelto', ctx), null);
  assert.equal(YLSGuide.sanitizeAI(null, ctx), null);
});

test('con IA, la guía usa lo personalizado y sigue completa', () => {
  const ctx = ctxOf('enfriandose');
  const ai = YLSGuide.sanitizeAI(goodAI, ctx);
  const g = YLSGuide.assemble(chats.enfriandose.report, { ai });
  assert.equal(g.personalized, true);
  assert.equal(g.headline, goodAI.headline);
  const resp = g.meaning.find(m => m.id === 'respuesta');
  assert.equal(resp.lead, goodAI.patterns[0].intro);
  assert.equal(resp.personalized, true);
  const other = g.meaning.find(m => m.id === 'preguntas');
  assert.equal(other.personalized, false, 'lo que la IA no personaliza conserva la frase determinista');
  assert.deepEqual(wire(g.conversations.map(c => c.id)), ['preguntas', 'respuesta', 'loQueFunciona']);
  assert.equal(g.plan[0].focus, 'Semana 1');
  assert.ok(g.wordCount >= 6000);
});

test('el agregado de la guía no lleva nombres ni texto del chat', () => {
  for (const kind of Object.keys(chats)) {
    const { stats, report } = chats[kind];
    const ctx = YLSGuide.aiContext(report);
    const { payload } = YLSPayload.buildGuideAIPayload(stats, report, ctx);
    const json = JSON.stringify(payload);
    assert.ok(!/Elena|Ruiz|Tomás|Tomas/.test(json), kind + ': se cuela un nombre');
    assert.ok(!/Buenos días|te quiero|Se eliminó/i.test(json), kind + ': se cuela texto del chat');
    assert.equal(payload.schema, 'yls.aggregate.guide.v1');
    assert.deepEqual(wire(payload.detail.people.map(p => p.label)), ['Persona A', 'Persona B']);
    assert.ok(payload.patterns.every(p => ctx.patterns.some(x => x.id === p.id)));
  }
});

test('lo que vuelve de la IA recupera los nombres reales en el cliente', () => {
  const { stats, report } = chats.enfriandose;
  const ctx = YLSGuide.aiContext(report);
  const { aliases } = YLSPayload.buildGuideAIPayload(stats, report, ctx);
  const labelOf = (name) => aliases.toAlias(name);
  const raw = { headline: labelOf(B) + ' tarda más en contestar que ' + labelOf(A) + ' en los últimos meses.' };
  const restored = YLSGuide.sanitizeAI(YLSPayload.restoreDeep(raw, aliases), ctx);
  assert.match(restored.headline, /Tomás tarda más en contestar que Elena Ruiz/);
});
