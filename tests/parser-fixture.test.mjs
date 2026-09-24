/*
 * Los chats sintéticos, escritos como export de Android, pasan por el
 * parseWhatsApp() real de index.html (que no se toca) y el motor da lo mismo
 * que con los mensajes generados directamente.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { loadBrowserScripts } from './helpers/load-browser.mjs';
import { generateChat, toWhatsAppTxt } from './fixtures/synthetic-chats.mjs';

const html = readFileSync(new URL('../public/index.html', import.meta.url), 'utf-8');
const start = html.indexOf('function parseWhatsApp(text) {');
const end = html.indexOf('\n}\n', start) + 2;
const parserSource = html.slice(start, end);

test('el parser real lee el export sintético mensaje a mensaje', () => {
  assert.ok(start > 0, 'parseWhatsApp no está en index.html');
  const sb = loadBrowserScripts(['keywords.js', 'metrics.js']);
  vm.runInContext(parserSource, sb);

  for (const kind of ['sano', 'enfriandose', 'terminado']) {
    const generated = generateChat(kind);
    const parsed = sb.parseWhatsApp(toWhatsAppTxt(generated));
    assert.equal(parsed.length, generated.length, kind);
    assert.equal(sb.analyzeMessages(parsed).score, sb.analyzeMessages(generated).score, kind);
  }
});
