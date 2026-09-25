/*
 * Tests del PDF (public/js/report-pdf.js), generándolo de verdad con el mismo
 * pdfmake 0.2.23 que carga el navegador y las fuentes de public/fonts.
 * Ejecutar con: npm test
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadAll, printer, renderToBuffer, reportFor } from './helpers/render-pdf.mjs';
import { wire } from './helpers/load-browser.mjs';
import { generateChat, NOW } from './fixtures/synthetic-chats.mjs';

const sb = loadAll();
const pp = printer(sb);
const PDF = sb.window.YLSReportPDF;

const docs = {};
for (const kind of ['sano', 'enfriandose', 'terminado']) {
  const { report, guide } = reportFor(sb, kind);
  const dd = PDF.build(report, guide, { now: NOW });
  docs[kind] = { report, guide, dd, out: await renderToBuffer(pp, dd) };
}

const pageCount = (buf) => (buf.toString('latin1').match(/\/Type \/Page\b/g) || []).length;

/* Recorre la definición del documento. */
function walk(node, fn) {
  if (Array.isArray(node)) return node.forEach(n => walk(n, fn));
  if (!node || typeof node !== 'object') return;
  fn(node);
  ['content', 'stack', 'columns', 'ul', 'ol'].forEach(k => node[k] && walk(node[k], fn));
  if (node.table) node.table.body.forEach(row => walk(row, fn));
  if (Array.isArray(node.text)) walk(node.text, fn);
}

test('el PDF pesa menos de 4 MB y tiene entre 30 y 70 páginas', () => {
  for (const [kind, d] of Object.entries(docs)) {
    const kb = d.out.buffer.length / 1024;
    const pages = pageCount(d.out.buffer);
    assert.ok(kb < 4096, `${kind}: ${kb.toFixed(0)} KB`);
    assert.ok(pages >= 30 && pages <= 70, `${kind}: ${pages} páginas`);
  }
});

test('las seis fuentes van incrustadas', () => {
  const pdf = docs.enfriandose.out.buffer.toString('latin1');
  for (const name of ['Inter-Regular', 'Inter-Medium', 'Inter-SemiBold', 'Fraunces-Light', 'Fraunces-SemiBold', 'Fraunces-LightItalic']) {
    assert.ok(new RegExp('/FontName /[A-Z]{6}\\+' + name + '\\b').test(pdf), 'falta ' + name);
  }
});

test('el índice sigue el orden del informe y la sección de final solo entra si toca', () => {
  for (const [kind, d] of Object.entries(docs)) {
    const heads = [];
    walk(d.dd.content, n => { if (n.tocItem) heads.push(n.text.map(t => t.text).join('').trim()); });
    const expected = sb.window.YLSReport.buildIndex({ ending: !!d.guide.ending }).filter(s => s.n).map(s => s.n + '  ' + s.title);
    assert.deepEqual(heads, wire(expected.map(s => s.trim())), kind);
  }
  const titles = (kind) => { const t = []; walk(docs[kind].dd.content, n => { if (n.tocItem) t.push(n.text[1].text); }); return t; };
  assert.ok(titles('terminado').includes('Si estás pensando en terminar, o ya terminó'));
  assert.ok(!titles('sano').includes('Si estás pensando en terminar, o ya terminó'));
});

test('ningún texto del documento lleva undefined, NaN, emojis ni llaves', () => {
  for (const [kind, d] of Object.entries(docs)) {
    walk(d.dd.content, n => {
      const texts = [];
      if (typeof n.text === 'string') texts.push(n.text);
      if (typeof n.svg === 'string') texts.push(n.svg.replace(/<[^>]+>/g, ' '));
      for (const t of texts) {
        assert.ok(!/undefined|NaN|\{|\}/.test(t), `${kind}: «${t.slice(0, 80)}»`);
        assert.ok(!/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(t), `${kind}: emoji en «${t.slice(0, 80)}»`);
      }
      if (typeof n.svg === 'string') assert.ok(!/NaN|undefined|Infinity/.test(n.svg), kind + ': SVG con valores rotos');
    });
  }
});

test('clean() quita lo que las fuentes no pueden pintar y conserva el español', () => {
  assert.equal(PDF.clean('Tomás ❤️ 😘'), 'Tomás');
  assert.equal(PDF.clean('¿Qué tal? «ñandú» — 12 €'), '¿Qué tal? «ñandú» — 12 €');
  assert.equal(PDF.clean(null), '');
});

test('nombres con emojis o sin letras latinas no rompen la portada ni el archivo', () => {
  const { report, guide } = reportFor(sb, 'sano');
  const r = Object.assign({}, report, { stats: Object.assign({}, report.stats, { personA: '💕 Ana', personB: '李' }) });
  const dd = PDF.build(r, guide, { now: NOW });
  const cover = dd.content[0].stack[2].text;
  assert.equal(cover, 'Ana y Persona B');
  assert.equal(PDF.fileName(r), 'YaLoSabia-informe-Ana-y-B.pdf');
  assert.equal(PDF.fileName(report), 'YaLoSabia-informe-Elena-y-Tomas.pdf');
});

test('un chat corto de tres meses también da un informe completo de más de 40 páginas', async () => {
  const messages = generateChat('sano').slice(0, 1400);
  const stats = sb.analyzeMessages(messages);
  const report = sb.window.YLSMetrics.buildReportData(messages, stats, { now: NOW });
  const guide = sb.window.YLSGuide.assemble(report);
  const { buffer } = await renderToBuffer(pp, PDF.build(report, guide, { now: NOW }));
  const pages = pageCount(buffer);
  assert.ok(pages >= 40, `${pages} páginas`);
});

test('las gráficas son SVG bien formado', () => {
  const { report } = docs.enfriandose;
  const svgs = [
    PDF.radarSvg(report.individual.axes, report.individual.people.map((p, i) => ({ color: i ? '#B5533C' : '#1F1D1B', values: report.individual.axes.map(a => p.scores[a.key]) }))),
    PDF.timelineSvg(report.timeline, report.turningPoints),
    PDF.bandsSvg(report.rhythms.bands, report.rhythms.people, ['#000', '#B5533C']),
    PDF.calendarSvg(report.activity)
  ];
  for (const s of svgs) {
    assert.match(s, /^<svg [^>]*>.*<\/svg>$/s);
    const open = (s.match(/<(?:svg|text)\b/g) || []).length;
    const close = (s.match(/<\/(?:svg|text)>/g) || []).length;
    assert.equal(open, close);
  }
});
