/*
 * Genera el PDF del informe en Node con el mismo pdfmake (0.2.23) que usa el
 * navegador, las mismas fuentes de public/fonts y la misma definición de
 * public/js/report-pdf.js.
 */
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { loadBrowserScripts } from './load-browser.mjs';
import { generateChat, NOW } from '../fixtures/synthetic-chats.mjs';

const require = createRequire(import.meta.url);
const PdfPrinter = require('pdfmake');

export function loadAll() {
  return loadBrowserScripts(['ai-payload.js', 'report-model.js', 'keywords.js', 'metrics.js',
    '../guide/blocks.js', '../guide/assemble.js', 'report-pdf.js']);
}

export function printer(sb) {
  const dir = fileURLToPath(new URL('../../public/fonts/', import.meta.url));
  const fonts = {};
  const F = sb.window.YLSReportPDF.FONTS;
  for (const [family, variants] of Object.entries(F)) {
    fonts[family] = {};
    for (const [k, file] of Object.entries(variants)) fonts[family][k] = dir + file;
  }
  return new PdfPrinter(fonts);
}

export function renderToBuffer(pp, dd) {
  return new Promise((resolve, reject) => {
    const doc = pp.createPdfKitDocument(dd);
    const chunks = [];
    let pages = 0;
    doc.on('pageAdded', () => { pages++; });
    doc.on('data', c => chunks.push(c));
    doc.on('end', () => resolve({ buffer: Buffer.concat(chunks), pages: pages + 1 }));
    doc.on('error', reject);
    doc.end();
  });
}

export function reportFor(sb, kind, ai) {
  const messages = generateChat(kind);
  const stats = sb.analyzeMessages(messages);
  const report = sb.window.YLSMetrics.buildReportData(messages, stats, { now: NOW });
  const guide = sb.window.YLSGuide.assemble(report, { ai });
  return { stats, report, guide };
}
