/*
 * Tests del motor de métricas (public/js/metrics.js): los analizadores que se
 * movieron desde index.html y las métricas nuevas del informe v3.
 * Ejecutar con: npm test
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadBrowserScripts, wire } from './helpers/load-browser.mjs';
import { generateChat, A, B, NOW } from './fixtures/synthetic-chats.mjs';

const sb = loadBrowserScripts(['keywords.js', 'metrics.js']);
const M = sb.window.YLSMetrics;

const chats = {};
for (const kind of ['sano', 'enfriandose', 'terminado']) {
  const messages = generateChat(kind);
  const stats = sb.analyzeMessages(messages);
  chats[kind] = { messages, stats, report: M.buildReportData(messages, stats, { now: NOW }) };
}

/* Mensajes a mano: [ 'dd/mm/yy HH:MM', remitente, texto ]. */
function msgs(rows) {
  return rows.map(([when, sender, text]) => {
    const [date, time] = when.split(' ');
    return { date, time, ampm: null, sender, text };
  });
}
const pair = { personA: A, personB: B };
const person = (list, name) => wire(list).find(p => p.name === name);

test('los analizadores movidos siguen siendo globales y dan un score', () => {
  for (const fn of ['analyzeMessages', 'parseMessageDate', 'getHour24', 'analyzeSilences',
    'analyzeRelationshipTimeline', 'analyzeBeforeVsNow', 'analyzeSelectiveGhosting',
    'analyzeLanguageChanges', 'isStopword', 'extractKeywords']) {
    assert.equal(typeof sb[fn], 'function', fn + ' no es global');
  }
  for (const c of Object.values(chats)) {
    assert.ok(c.stats.score >= 0 && c.stats.score <= 100);
    assert.equal(c.stats.personA === A || c.stats.personA === B, true);
  }
  assert.ok(chats.sano.stats.score > chats.enfriandose.stats.score);
});

test('sortMessages ordena y deja fuera a terceros', () => {
  const sorted = M.sortMessages(msgs([
    ['02/01/25 10:00', B, 'segundo'],
    ['01/01/25 10:00', A, 'primero'],
    ['01/01/25 11:00', 'Meta AI', 'hola'],
    ['xx/01/25 10:00', A, 'fecha rota']
  ]), pair);
  assert.deepEqual(wire(sorted.map(m => m.text)), ['primero', 'segundo']);
});

test('quién abre: contestar tarde no cuenta como iniciativa', () => {
  const m = msgs([
    ['01/01/25 09:00', A, 'Buenos días'],          // Elena abre
    ['01/01/25 09:05', B, 'Buenos días'],
    ['01/01/25 20:00', A, 'Ya salí del trabajo'],  // 11 h después: Elena abre
    ['02/01/25 02:00', B, 'Perdón, me dormí'],     // 6 h tarde: respuesta, no apertura
    ['03/01/25 10:00', B, 'Hola, ¿comemos?'],       // 32 h después: Tomás abre
    ['03/01/25 10:02', A, 'Va']
  ]);
  const sorted = M.sortMessages(m, pair);
  const conv = M.analyzeConversations(sorted, pair, M.toTurns(sorted));
  assert.equal(conv.total, 4);
  assert.equal(conv.openings, 3);
  assert.equal(person(conv.people, A).opened, 2);
  assert.equal(person(conv.people, B).opened, 1);
});

test('preguntas sin responder: una por turno, y la del final no cuenta', () => {
  const m = msgs([
    ['01/01/25 10:00', A, '¿Vienes? ¿A qué hora?'],     // un solo turno con dos «?»
    ['01/01/25 10:01', A, '¿Me avisas?'],
    ['01/01/25 10:30', B, 'A las 8'],                    // respondida
    ['01/01/25 12:00', A, '¿Compraste el pan?'],          // sin respuesta en 12 h
    ['02/01/25 09:00', B, 'Buenos días'],
    ['02/01/25 09:10', A, 'Hola'],
    ['02/01/25 09:20', B, '¿Hoy sí vienes?']              // última: aún no ha podido responderse
  ]);
  const sorted = M.sortMessages(m, pair);
  const q = M.analyzeQuestions(sorted, pair, M.toTurns(sorted));
  const elena = person(q.people, A);
  assert.equal(elena.asked, 2);
  assert.equal(elena.unanswered, 1);
  assert.equal(person(q.people, B).asked, 0);
  assert.equal(person(q.people, B).answeredPct, 50);
});

test('en el chat que se enfría, las preguntas de Elena se quedan sin respuesta cada vez más', () => {
  const elena = person(chats.enfriandose.report.questions.people, A);
  assert.ok(elena.unansweredPctLate > elena.unansweredPctEarly * 2,
    `antes ${elena.unansweredPctEarly} %, ahora ${elena.unansweredPctLate} %`);
  const sano = person(chats.sano.report.questions.people, A);
  assert.ok(sano.unansweredPct < 20);
});

test('ritmos: mediana por franja y por día, y la tendencia de Tomás', () => {
  const rows = [];
  // Tomás contesta en 2 min por la mañana y en 60 por la noche, 10 veces cada una.
  for (let d = 1; d <= 10; d++) {
    const day = String(d).padStart(2, '0') + '/03/25';
    rows.push([day + ' 09:00', A, 'Hola'], [day + ' 09:02', B, 'Hola']);
    rows.push([day + ' 21:00', A, 'Ya llegué'], [day + ' 22:00', B, 'Qué bien']);
  }
  const sorted = M.sortMessages(msgs(rows), pair);
  const r = M.analyzeRhythms(sorted, pair, M.toTurns(sorted));
  const tomas = person(r.people, B);
  const band = (k) => tomas.byBand.find(b => b.key === k);
  assert.equal(band('manana').medianMin, 2);
  assert.equal(band('noche').medianMin, 60);
  assert.equal(band('tarde').medianMin, null, 'sin muestra suficiente no se inventa una mediana');
  assert.equal(tomas.fastestBand.key, 'manana');
  assert.equal(tomas.slowestBand.key, 'noche');

  const real = person(chats.enfriandose.report.rhythms.people, B);
  assert.ok(real.medianMinLate > real.medianMinEarly * 3,
    `Tomás pasa de ${real.medianMinEarly} a ${real.medianMinLate} min`);
});

test('temas: palabra completa y sin acentos', () => {
  const re = M.phraseRegex(['ex', 'mi mamá']);
  assert.ok(re.test(M.normalize('Vi a mi ex ayer')));
  assert.ok(!re.test(M.normalize('Mañana tengo examen')));
  assert.ok(re.test(M.normalize('Le hablé a mi mama')));
  assert.ok(!re.test(M.normalize('Mamá')), 'la frase exige el «mi»');
});

test('temas: se detecta el que Tomás esquiva, y solo ese', () => {
  for (const kind of ['enfriandose', 'terminado']) {
    const topics = wire(chats[kind].report.topics.topics);
    const futuro = topics.find(t => t.key === 'futuro');
    assert.ok(futuro.avoided, kind + ': «futuro» debería salir como evitado');
    assert.deepEqual(futuro.avoidedBy, [B]);
    assert.deepEqual(topics.filter(t => t.avoided).map(t => t.key), ['futuro'], kind);
  }
  assert.deepEqual(wire(chats.sano.report.topics.topics.filter(t => t.avoided).map(t => t.key)), []);
});

test('los cinco ejes van de 0 a 100 y la ventana reciente muestra el cambio', () => {
  for (const c of Object.values(chats)) {
    for (const p of c.report.individual.people) {
      for (const [axis, v] of Object.entries(p.scores)) {
        assert.ok(v === null || (v >= 0 && v <= 100), `${axis} = ${v}`);
      }
    }
  }
  const { individual, individualRecent } = chats.enfriandose.report;
  assert.ok(individualRecent, 'un chat de 14 meses tiene ventana reciente');
  const before = person(individual.people, B).scores;
  const now = person(individualRecent.people, B).scores;
  assert.ok(now.ritmo < before.ritmo - 20, `ritmo ${before.ritmo} → ${now.ritmo}`);
  assert.ok(now.calidez < before.calidez, `calidez ${before.calidez} → ${now.calidez}`);
});

test('rhythmScore es monótona', () => {
  let prev = 101;
  for (const m of [0.5, 1, 3, 5, 10, 30, 60, 120, 480, 1440, 3000]) {
    const s = M.rhythmScore(m);
    assert.ok(s <= prev, `${m} min → ${s}`);
    prev = s;
  }
  assert.equal(M.rhythmScore(null), null);
});

test('editados: se cuentan si el export los marca y si no se dice', () => {
  const sorted = M.sortMessages(msgs([
    ['01/01/25 10:00', A, 'Llego a las 8 <Se editó este mensaje.>'],
    ['01/01/25 10:01', B, 'Va']
  ]), pair);
  const e = M.analyzeEdited(sorted, pair);
  assert.equal(e.supported, true);
  assert.equal(person(e.people, A).count, 1);

  const none = M.analyzeEdited(M.sortMessages(msgs([['01/01/25 10:00', A, 'Hola']]), pair), pair);
  assert.equal(none.supported, false);
});

test('momentos de cambio: los más grandes, separados y en orden', () => {
  const tp = M.findTurningPoints({
    data: [300, 310, 290, 305, 120, 110, 115, 400, 390],
    labelsLong: ['Enero 2025', 'Febrero 2025', 'Marzo 2025', 'Abril 2025', 'Mayo 2025', 'Junio 2025',
      'Julio 2025', 'Agosto 2025', 'Septiembre 2025']
  });
  assert.deepEqual(wire(tp).map(t => [t.label, t.direction]), [['Mayo 2025', 'down'], ['Agosto 2025', 'up']]);
  assert.match(tp[0].sentence, /^En mayo 2025 la conversación bajó un \d+ %/);
});

test('rituales: el afecto se pierde en el chat que se enfría y no en el sano', () => {
  const r = (kind, key) => chats[kind].report.rituals.rituals.find(x => x.key === key);
  assert.equal(r('enfriandose', 'afecto').trend, 'se ha perdido');
  assert.notEqual(r('sano', 'afecto').trend, 'se ha perdido');
  assert.ok(r('sano', 'afecto').present);
});

test('final: el chat terminado acaba en silencio y el sano no', () => {
  assert.equal(chats.terminado.report.ending.endsInSilence, true);
  assert.ok(chats.terminado.report.ending.daysSinceLast > 90);
  assert.equal(chats.sano.report.ending.endsInSilence, false);
  assert.equal(chats.enfriandose.report.ending.endsInSilence, false);
});

test('mapa de actividad: días sin mensajes cuadran', () => {
  const a = chats.terminado.report.activity;
  assert.equal(a.totalDays, a.activeDays + a.silentDays);
  assert.equal(a.days.length, a.totalDays);
  assert.equal(a.months.reduce((s, m) => s + m.silent, 0), a.silentDays);
});

test('buildReportData aguanta un chat de 40,000 mensajes en menos de 4 s', () => {
  const big = [];
  const base = generateChat('sano');
  // Siete copias desplazadas un año cada una.
  for (let k = 0; big.length < 40000; k++) {
    for (const m of base) {
      const [d, mo, y] = m.date.split('/');
      big.push({ ...m, date: `${d}/${mo}/${String(Number(y) + k).padStart(2, '0')}` });
      if (big.length >= 40000) break;
    }
  }
  const t0 = Date.now();
  const stats = sb.analyzeMessages(big);
  M.buildReportData(big, stats, { now: NOW });
  const ms = Date.now() - t0;
  assert.ok(ms < 4000, `${ms} ms`);
});
