/*
 * Tests del modelo del informe: el índice y la redacción de «En una página».
 * Ejecutar con: npm test
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../public/js/report-model.js', import.meta.url), 'utf-8');
const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(source, sandbox);
const { REPORT_SECTIONS, buildIndex, firstName, scoreInWords, buildOnePage } = sandbox.window.YLSReport;

/* El modelo se evalúa dentro del vm, así que sus objetos llevan el prototipo
   de ese realm y deepEqual los rechazaría. */
const wire = (v) => JSON.parse(JSON.stringify(v));

/* Tres chats sintéticos: sano, enfriándose y apagado. */
function stats(overrides) {
  return Object.assign({
    personA: 'Elena Ruiz', personB: 'Tomás',
    msgsA: 6500, msgsB: 5982, total: 12482,
    loveCount: 310, nightPct: 12, uniqueDays: 700,
    avgReply: 11, avgReplyFormatted: '11 min',
    score: 94, leader: 'Elena Ruiz', leaderPct: 52,
    silencesCount: 3, totalDouble: 12,
    factors: {
      balance:      { score: 25, max: 25, value: 0.92 },
      consistency:  { score: 20, max: 20, value: 0.95 },
      response:     { score: 17, max: 20, value: 11 },
      affection:    { score: 12, max: 15, value: 9 },
      silences:     { score: 0,  max: 0, min: -15, value: 3 },
      doubleTexting:{ score: 0,  max: 0, min: -10, value: 12 }
    }
  }, overrides);
}

const sano = stats({});

const enfriandose = stats({
  score: 44, leaderPct: 71, nightPct: 38, silencesCount: 19, totalDouble: 210,
  avgReply: 95, avgReplyFormatted: '1 h 35 min', loveCount: 24,
  factors: {
    balance:      { score: 8,  max: 25, value: 0.41 },
    consistency:  { score: 11, max: 20, value: 0.63 },
    response:     { score: 6,  max: 20, value: 95 },
    affection:    { score: 4,  max: 15, value: 1.9 },
    silences:     { score: -11, max: 0, min: -15, value: 19 },
    doubleTexting:{ score: -5,  max: 0, min: -10, value: 210 }
  }
});

const apagado = stats({
  score: 18, leaderPct: 84, nightPct: 44, silencesCount: 52, totalDouble: 430,
  avgReply: 620, avgReplyFormatted: '10 h 20 min', loveCount: 2,
  factors: {
    balance:      { score: 3,  max: 25, value: 0.19 },
    consistency:  { score: 2,  max: 20, value: 0.22 },
    response:     { score: 1,  max: 20, value: 620 },
    affection:    { score: 0,  max: 15, value: 0.2 },
    silences:     { score: -15, max: 0, min: -15, value: 52 },
    doubleTexting:{ score: -10, max: 0, min: -10, value: 430 }
  }
});

test('firstName toma solo el nombre de pila', () => {
  assert.equal(firstName('Elena Ruiz'), 'Elena');
  assert.equal(firstName('  Tomás  '), 'Tomás');
  assert.equal(firstName(''), 'Persona');
  assert.equal(firstName(undefined), 'Persona');
});

test('scoreInWords cubre todo el rango y no lleva emojis ni etiquetas clínicas', () => {
  const prohibidas = ['tóxic', 'narcisis', 'apego ansioso', 'red flag'];
  for (let score = 0; score <= 100; score += 1) {
    const t = scoreInWords(score);
    assert.ok(t && t.length > 20, `score ${score} sin texto`);
    assert.ok(!/[\u{1F300}-\u{1FAFF}☀-➿]/u.test(t), `score ${score} lleva emoji`);
    for (const p of prohibidas) {
      assert.ok(!t.toLowerCase().includes(p), `score ${score} usa "${p}"`);
    }
  }
});

test('un chat sano produce sobre todo cosas que van bien', () => {
  const { good, watch } = buildOnePage(sano);
  assert.ok(good.length >= 3, 'deberían salir al menos 3 aciertos');
  assert.equal(watch.length, 0, 'no debería inventar problemas donde no los hay');
  assert.ok(good.every(t => t.length > 25), 'las frases no pueden ser telegramas');
  assert.ok(good.some(t => /\d/.test(t)), 'al menos una debe citar un número');
});

test('un chat enfriándose reparte aciertos y avisos', () => {
  const { good, watch } = buildOnePage(enfriandose);
  assert.ok(watch.length >= 3, 'deberían salir 3 avisos');
  assert.ok(watch.length <= 3, 'nunca más de 3');
  assert.ok(good.length >= 1, 'aunque vaya mal, hay que decir lo mejor que haya');
  assert.ok(good.length <= 3);
  assert.ok(watch.every(t => /\d/.test(t)), 'cada aviso debe apoyarse en un número');
});

test('un chat apagado no devuelve aciertos inventados', () => {
  const { good, watch } = buildOnePage(apagado);
  assert.equal(good.length, 0, 'no debería felicitar a nadie aquí');
  assert.equal(watch.length, 3);
});

test('las frases citan números reales y no dejan huecos sin rellenar', () => {
  for (const s of [sano, enfriandose, apagado]) {
    for (const frase of [...buildOnePage(s).good, ...buildOnePage(s).watch]) {
      assert.ok(!frase.includes('undefined'), `hueco sin rellenar: ${frase}`);
      assert.ok(!frase.includes('NaN'), `número roto: ${frase}`);
      assert.ok(!frase.includes('${'), `plantilla sin interpolar: ${frase}`);
    }
  }
});

test('buildOnePage no revienta si faltan los factores', () => {
  const sinFactores = stats({ factors: undefined });
  const { good, watch } = buildOnePage(sinFactores);
  assert.ok(Array.isArray(good) && Array.isArray(watch));
});

test('el índice tiene las 17 secciones y las dos partes', () => {
  const partes = REPORT_SECTIONS.filter(s => s.part);
  const secciones = REPORT_SECTIONS.filter(s => s.n);
  assert.equal(partes.length, 2);
  assert.equal(secciones.length, 17);
  assert.deepEqual(wire(secciones).map(s => s.n), Array.from({ length: 17 }, (_, i) => String(i + 1).padStart(2, '0')));
});

test('solo «En una página» es gratis, y todas las secciones se describen', () => {
  const gratis = REPORT_SECTIONS.filter(s => s.free);
  assert.equal(gratis.length, 1);
  assert.equal(gratis[0].title, 'En una página');
  for (const s of REPORT_SECTIONS.filter(x => x.n)) {
    assert.ok(s.title && s.title.length > 3, `sección ${s.n} sin título`);
    assert.ok(s.desc && s.desc.length > 20, `sección ${s.n} sin descripción`);
  }
});

test('la sección de final solo entra cuando toca y renumera lo que sigue', () => {
  const normal = wire(buildIndex()).filter(s => s.n);
  assert.equal(normal.length, 17);
  assert.deepEqual(normal.map(s => s.n), wire(REPORT_SECTIONS.filter(s => s.n).map(s => s.n)));

  const withEnding = wire(buildIndex({ ending: true })).filter(s => s.n);
  assert.equal(withEnding.length, 18);
  const i = withEnding.findIndex(s => s.conditional);
  assert.equal(withEnding[i].n, '16');
  assert.equal(withEnding[i - 1].title, 'Cómo cuidar la relación a partir de ahora');
  assert.equal(withEnding[i + 1].n, '17');
  assert.equal(withEnding[withEnding.length - 1].n, '18');
});
