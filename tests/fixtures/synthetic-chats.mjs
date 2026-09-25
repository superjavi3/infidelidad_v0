/*
 * Tres chats sintéticos deterministas para los tests del motor y de la guía:
 *
 *   sano         14 meses equilibrados, respuestas rápidas, afecto y rituales.
 *   enfriandose  la primera mitad como el sano; la segunda, Elena abre casi
 *                todo, Tomás tarda horas, deja preguntas sin responder y
 *                esquiva el tema «futuro».
 *   terminado    se apaga poco a poco y el último mensaje es de noviembre;
 *                el informe se genera en marzo.
 *
 * Los mensajes tienen la forma que devuelve parseWhatsApp():
 *   { date: 'd/m/yy', time: 'HH:MM', ampm: null, sender, text }
 *
 * toWhatsAppTxt() los convierte en un export de Android para probar la web a
 * mano: `node tests/fixtures/write-fixtures.mjs`.
 */

export const A = 'Elena Ruiz';
export const B = 'Tomás';
export const NOW = new Date(2026, 2, 1, 12, 0); // 1 de marzo de 2026

function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const TEXT = {
  morning: ['Buenos días amor', 'Buenos días ❤️', 'Buen día, ¿dormiste bien?', 'Buenos días, ya voy al trabajo'],
  night: ['Buenas noches, descansa', 'Buenas noches amor 😘', 'Que descanses', 'Me voy a dormir, sueña bonito'],
  checkin: ['¿Cómo te fue hoy?', '¿Qué tal tu día?', '¿Cómo estás?', '¿Cómo te fue en la junta?'],
  casual: ['Ya voy saliendo', 'Ok', 'Sí, dale', 'Jajaja qué bueno', 'Estoy en el metro', 'Ahorita te marco',
    'Acabo de llegar a casa', 'Hay mucho tráfico', 'Me comí unos tacos buenísimos', 'Vi algo que te va a gustar',
    'Jajajaja no puede ser', 'Va', 'Ahorita no puedo', 'Luego te cuento', 'Qué flojera el lunes',
    'Ya casi termino', 'Pásame la receta porfa', 'Mañana te digo'],
  affection: ['Te quiero mucho', 'Te extraño 😘', 'Eres lo mejor que me ha pasado', 'Mi amor, me haces feliz',
    'Pienso en ti 🥰', 'Te amo'],
  cold: ['Ok', 'Va', 'Ya', 'Sí', 'Luego', 'Ajá'],
  questions: {
    casual: ['¿Ya comiste?', '¿A qué hora sales?', '¿Viste el partido?', '¿Dónde estás?', '¿Ya llegaste?'],
    planes: ['¿Vamos al cine el sábado?', '¿Quedamos para cenar el viernes?', '¿Hacemos un viaje en vacaciones?'],
    futuro: ['¿Has pensado en vivir juntos?', '¿Dónde te ves en el futuro?', '¿Algún día quieres casarnos?'],
    familia: ['¿Vienes a la comida familiar del domingo?', '¿Cómo sigue tu mamá?', '¿Le hablaste a tu hermana?'],
    dinero: ['¿Me prestas para la renta?', '¿Ya te llegó la quincena?', '¿Cuánto cuesta el depa?'],
    trabajo: ['¿Qué te dijo tu jefe?', '¿Cómo te fue en la entrevista?', '¿Mucho trabajo hoy?']
  },
  media: ['<Multimedia omitido>', 'imagen omitida', 'audio omitido', 'sticker omitido'],
  deleted: 'Se eliminó este mensaje'
};

function pick(rng, arr) { return arr[Math.floor(rng() * arr.length)]; }
function lognormal(rng, medianMin, spread) {
  const u = Math.max(1e-9, rng()), v = rng();
  const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  return Math.max(0.2, medianMin * Math.exp(z * (spread || 0.8)));
}

/* Parámetros de cada perfil según el momento del periodo (t de 0 a 1). */
const PROFILES = {
  sano: {
    seed: 11, start: new Date(2025, 0, 1), end: new Date(2026, 1, 26),
    at: () => ({
      active: 0.93, convs: 2, initA: 0.52,
      reply: { [A]: 6, [B]: 8 }, answer: { [A]: 0.97, [B]: 0.96 },
      affection: 0.13, morning: 0.7, night: 0.6, checkin: 0.5,
      nightOwl: 0.04, deleted: 0.004, edited: 0.01, media: 0.06, double: 0.01,
    })
  },
  enfriandose: {
    seed: 23, start: new Date(2025, 0, 1), end: new Date(2026, 1, 26), dodgeTopic: 'futuro',
    at: (t) => t < 0.5
      ? PROFILES.sano.at(t)
      : ({
        active: 0.55, convs: 1, initA: 0.9,
        reply: { [A]: 7, [B]: 160 }, answer: { [A]: 0.95, [B]: 0.5 },
        affection: 0.02, morning: 0.2, night: 0.1, checkin: 0.15,
        nightOwl: 0.35, deleted: 0.015, edited: 0.01, media: 0.03, double: 0.14, breaks: 0.04, terse: true,
      })
  },
  terminado: {
    seed: 37, start: new Date(2024, 8, 1), end: new Date(2025, 10, 12), dodgeTopic: 'futuro',
    at: (t) => t < 0.35
      ? PROFILES.sano.at(t)
      : ({
        active: Math.max(0.08, 0.55 - t * 0.55), convs: 1, initA: 0.9,
        reply: { [A]: 10, [B]: 120 + t * 500 }, answer: { [A]: 0.9, [B]: 0.4 },
        affection: 0.015, morning: 0.12, night: 0.08, checkin: 0.1,
        nightOwl: 0.35, deleted: 0.02, edited: 0.0, media: 0.03, double: 0.16, breaks: 0.1, terse: true,
      })
  }
};

function fmtDate(d) {
  return d.getDate() + '/' + (d.getMonth() + 1) + '/' + String(d.getFullYear()).slice(-2);
}
function fmtTime(d) {
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}

export function generateChat(kind) {
  const prof = PROFILES[kind];
  if (!prof) throw new Error('perfil desconocido: ' + kind);
  const rng = mulberry32(prof.seed);
  const out = [];
  const push = (ts, sender, text) => out.push({ date: fmtDate(ts), time: fmtTime(ts), ampm: null, sender, text, _ts: ts.getTime() });
  const span = prof.end - prof.start;
  let cursor = new Date(prof.start);
  let breakUntil = new Date(0);

  for (let day = new Date(prof.start); day <= prof.end; day = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1)) {
    const t = (day - prof.start) / span;
    const p = prof.at(t);
    if (day < breakUntil) continue;
    // Rachas de varios días sin hablar.
    if (p.breaks && rng() < p.breaks) {
      breakUntil = new Date(day.getTime() + (3 + Math.floor(rng() * 6)) * 86400000);
      continue;
    }
    if (rng() > p.active) continue;
    const nConvs = 1 + Math.floor(rng() * p.convs);

    for (let c = 0; c < nConvs; c++) {
      const owl = rng() < p.nightOwl;
      const hour = owl ? 23 + Math.floor(rng() * 3) : 8 + Math.floor(rng() * 14);
      let ts = new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour, Math.floor(rng() * 60));
      if (ts < cursor) ts = new Date(cursor.getTime() + (4 * 60 + 30) * 60000);
      if (ts > new Date(prof.end.getTime() + 86400000)) break;

      let sender = rng() < p.initA ? A : B;
      const other = (s) => (s === A ? B : A);
      const turns = 3 + Math.floor(rng() * 9);

      for (let k = 0; k < turns; k++) {
        const runLen = rng() < p.double && sender === A ? 5 + Math.floor(rng() * 3)
          : sender === B && p.terse ? 1 : 1 + Math.floor(rng() * 2);
        let asked = null;
        for (let r = 0; r < runLen; r++) {
          let text;
          const roll = rng();
          if (k === 0 && r === 0 && c === 0 && hour < 12 && rng() < p.morning) text = pick(rng, TEXT.morning);
          else if (k === 0 && r === 0 && rng() < p.checkin) { text = pick(rng, TEXT.checkin); asked = 'casual'; }
          else if (roll < 0.22) {
            const topic = rng() < 0.55 ? 'casual' : pick(rng, ['planes', 'futuro', 'familia', 'dinero', 'trabajo']);
            text = pick(rng, TEXT.questions[topic]);
            asked = topic;
          } else if (roll < 0.22 + p.affection) text = pick(rng, TEXT.affection);
          else if (roll < 0.22 + p.affection + p.media) text = pick(rng, TEXT.media);
          else if (roll < 0.22 + p.affection + p.media + p.deleted) text = TEXT.deleted;
          else text = p.affection < 0.05 && rng() < 0.4 ? pick(rng, TEXT.cold) : pick(rng, TEXT.casual);
          if (rng() < p.edited && text.length > 8) text = text + ' <Se editó este mensaje.>';
          push(ts, sender, text);
          ts = new Date(ts.getTime() + Math.floor(rng() * 3) * 60000 + 20000);
        }

        const responder = other(sender);
        // Una pregunta que no se contesta cierra la conversación.
        const dodges = asked && prof.dodgeTopic && asked === prof.dodgeTopic && responder === B;
        if (asked && (rng() > p.answer[responder] || (dodges && rng() < 0.5))) {
          ts = new Date(ts.getTime() + 13 * 3600000);
          break;
        }
        let delay = lognormal(rng, p.reply[responder]);
        if (dodges) delay *= 8;
        delay = Math.min(delay, 20 * 60);
        ts = new Date(ts.getTime() + delay * 60000);
        sender = responder;
      }

      if (c === nConvs - 1 && rng() < p.night) {
        const nightTs = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 23, Math.floor(rng() * 50));
        if (nightTs > ts) { push(nightTs, rng() < 0.5 ? A : B, pick(rng, TEXT.night)); ts = nightTs; }
      }
      cursor = ts;
    }
  }

  out.sort((x, y) => x._ts - y._ts);
  return out.map(({ _ts, ...m }) => m);
}

/* Export de Android: «12/1/25, 10:32 - Nombre: mensaje». */
export function toWhatsAppTxt(messages) {
  const header = '1/1/25, 00:00 - Los mensajes y las llamadas están cifrados de extremo a extremo. Nadie fuera de este chat, ni siquiera WhatsApp, puede leerlos ni escucharlos.';
  return [header, ...messages.map(m => `${m.date}, ${m.time} - ${m.sender}: ${m.text}`)].join('\n') + '\n';
}
