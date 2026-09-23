/*
 * Tests del contrato de privacidad.
 *
 * public/js/ai-payload.js es un script de navegador (se engancha a window), así
 * que aquí se evalúa en un contexto vm con un window falso. Ejecutar con:
 *   npm test
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../public/js/ai-payload.js', import.meta.url), 'utf-8');
const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(source, sandbox);
const YLSPayload = sandbox.window.YLSPayload;

/* El payload se construye dentro del vm, así que sus objetos llevan el
   prototipo de ese realm y deepEqual los rechazaría. wire() lo pasa por JSON,
   que es exactamente lo que viaja por la red. */
const wire = (value) => JSON.parse(JSON.stringify(value));

const NAMES = ['Lucía Fernández', 'Marco'];

/* Fixtures con la forma real que devuelven los analizadores del cliente,
   incluyendo los campos sucios que NO deben salir del dispositivo. */
function coupleFixture() {
  const [a, b] = NAMES;
  return {
    stats: {
      personA: a,
      personB: b,
      msgsA: 4200,
      msgsB: 2800,
      total: 7000,
      loveCount: 310,
      nightPct: 23.4,
      uniqueDays: 412,
      avgReply: 12.75,
      score: 68,
      verdict: 'Bien, pero ojo 👀',
      leader: a,
      leaderPct: 60,
      silencesCount: 9
    },
    extras: {
      timeline: {
        labels: ["mar '24", "abr '24", "may '24"],
        data: [3000, 2500, 1500],
        perPerson: [
          { [a]: 1800, [b]: 1200 },
          { [a]: 1500, [b]: 1000 },
          { [a]: 900, [b]: 600 }
        ],
        peakMonth: "mar '24",
        declineMonth: "may '24",
        declinePct: 50
      },
      silences: {
        total: 9,
        brokeCount: { [a]: 7, [b]: 2 },
        longest: { hours: 96.4, brokeBy: a, brokeMessage: 'oye, ¿todo bien? te echo de menos' },
        silences: [{ hours: 96.4, brokeBy: a, brokeMessage: 'oye, ¿todo bien? te echo de menos' }]
      },
      doubleText: { [a]: [5, 7, 6], [b]: [5] },
      multimedia: {
        audios: { total: 120, perPerson: { [a]: 100, [b]: 20 } },
        imagenes: { total: 80, perPerson: { [a]: 30, [b]: 50 } },
        stickers: { total: 10, perPerson: { [a]: 10 } },
        videos: { total: 5, perPerson: { [b]: 5 } },
        documentos: { total: 0, perPerson: {} },
        ubicaciones: { total: 2, perPerson: { [a]: 2 } }
      },
      deleted: { deleted: { [a]: 3, [b]: 11 }, total: 14, timestamps: [] }
    }
  };
}

function groupFixture() {
  const members = [];
  for (let i = 1; i <= 13; i++) {
    members.push({ name: `Participante ${i} Apellido`, msgCount: 100 * i, pct: i, category: 'activo' });
  }
  return {
    totalMessages: 9100,
    uniqueDays: 500,
    score: 71,
    members,
    monthlyActivity: [{ month: '2024-03', total: 900 }, { month: '2024-04', total: 400 }],
    systemEvents: [
      { type: 'left', actor: 'Participante 4 Apellido', date: '12/3/24' },
      { type: 'left', actor: 'Participante 9 Apellido', date: '2/4/24' },
      { type: 'added', actor: 'Participante 1 Apellido', target: 'Participante 13 Apellido' }
    ]
  };
}

test('el agregado de pareja no contiene ningún nombre real', () => {
  const { stats, extras } = coupleFixture();
  const { payload } = YLSPayload.buildCoupleAIPayload(stats, extras);
  const serialized = JSON.stringify(payload).toLowerCase();

  for (const token of ['lucía', 'lucia', 'fernández', 'fernandez', 'marco']) {
    assert.equal(serialized.includes(token), false, `se ha filtrado "${token}"`);
  }
});

test('el agregado de pareja no contiene texto de mensajes', () => {
  const { stats, extras } = coupleFixture();
  const { payload } = YLSPayload.buildCoupleAIPayload(stats, extras);
  const serialized = JSON.stringify(payload).toLowerCase();

  assert.equal(serialized.includes('todo bien'), false, 'se ha filtrado la cita del silencio');
  assert.equal(serialized.includes('echo de menos'), false, 'se ha filtrado la cita del silencio');
  assert.equal(serialized.includes('brokemessage'), false, 'se ha filtrado la clave brokeMessage');
});

test('el agregado de pareja conserva los números que importan', () => {
  const { stats, extras } = coupleFixture();
  const { payload } = YLSPayload.buildCoupleAIPayload(stats, extras);

  assert.equal(payload.schema, 'yls.aggregate.couple.v1');
  assert.equal(payload.totals.messageCount, 7000);
  assert.equal(payload.totals.deletedMessages, 14);
  assert.equal(payload.totals.mediaShared, 217);
  assert.equal(payload.score.overall, 68);
  assert.equal(payload.rhythm.avgReplyMinutes, 12.8);
  assert.equal(payload.silences.longestHours, 96);
  assert.equal(payload.doubleTexting.totalEpisodes, 4);

  assert.deepEqual(wire(payload.people).map((p) => p.label), ['Persona A', 'Persona B']);
  assert.equal(payload.people[0].sharePct, 60);
  assert.equal(payload.people[1].deletedMessages, 11);
  assert.equal(payload.balance.leaderLabel, 'Persona A');

  assert.equal(payload.timeline.monthly.length, 3);
  assert.deepEqual(wire(payload.timeline.monthly[0].byPerson), [1800, 1200]);
  assert.equal(payload.span.firstMonth, "mar '24");
});

test('el agregado funciona sin extras (fallo de un analizador)', () => {
  const { stats } = coupleFixture();
  const { payload } = YLSPayload.buildCoupleAIPayload(stats);

  assert.equal(payload.totals.messageCount, 7000);
  assert.equal(payload.timeline.monthly.length, 0);
  assert.equal(payload.silences.count, 9);
});

test('restore() devuelve los nombres reales en la respuesta de la IA', () => {
  const { stats, extras } = coupleFixture();
  const { aliases } = YLSPayload.buildCoupleAIPayload(stats, extras);

  assert.equal(
    aliases.restore('Persona A escribe más que Persona B.'),
    'Lucía Fernández escribe más que Marco.'
  );
});

test('el agregado de grupo no contiene nombres ni actores de eventos', () => {
  const { payload } = YLSPayload.buildGroupAIPayload(groupFixture());
  const serialized = JSON.stringify(payload).toLowerCase();

  assert.equal(serialized.includes('participante'), false);
  assert.equal(serialized.includes('apellido'), false);
  assert.deepEqual(wire(payload.eventCounts), { left: 2, added: 1 });
  assert.equal(payload.totals.messageCount, 9100);
  assert.equal(payload.members[0].label, 'Miembro 1');
});

test('restore() de grupo no confunde "Miembro 1" con "Miembro 13"', () => {
  const { aliases } = YLSPayload.buildGroupAIPayload(groupFixture());

  assert.equal(
    aliases.restore('Miembro 13 habla más que Miembro 1.'),
    'Participante 13 Apellido habla más que Participante 1 Apellido.'
  );
});

test('restoreDeep() recorre objetos y arrays anidados', () => {
  const { aliases } = YLSPayload.buildCoupleAIPayload(coupleFixture().stats);
  const restored = YLSPayload.restoreDeep(
    { title: 'Persona A', items: [{ impact: 'Persona B responde tarde' }], severity: 'high', n: 3 },
    aliases
  );

  assert.equal(restored.title, 'Lucía Fernández');
  assert.equal(restored.items[0].impact, 'Marco responde tarde');
  assert.equal(restored.severity, 'high');
  assert.equal(restored.n, 3);
});

test('assertNoIdentifiers rechaza claves de texto libre', () => {
  assert.throws(
    () => YLSPayload.assertNoIdentifiers({ stats: { messages: [{ text: 'hola' }] } }, []),
    /clave prohibida "messages"/
  );
});

test('assertNoIdentifiers rechaza un nombre real anidado', () => {
  assert.throws(
    () => YLSPayload.assertNoIdentifiers({ a: { b: ['pico en marzo, según Lucía'] } }, ['Lucía Fernández']),
    /nombre real detectado/
  );
});

test('assertNoIdentifiers ignora tokens de menos de 3 caracteres', () => {
  // "Jo" no debe convertir cualquier texto con "jo" en un falso positivo.
  assert.doesNotThrow(() => YLSPayload.assertNoIdentifiers({ verdict: 'mejor' }, ['Jo']));
});
