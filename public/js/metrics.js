/*
 * metrics.js — el motor de análisis del chat de pareja.
 *
 * Se ejecuta en el navegador sobre los mensajes que devuelve parseWhatsApp()
 * (que sigue en index.html). Nada de lo que calcula este archivo sale del
 * dispositivo por sí mismo: lo que viaja a la IA lo decide ai-payload.js.
 *
 * Dos partes:
 *   1. Los analizadores que ya existían, movidos tal cual desde index.html
 *      (mismos nombres globales, mismos umbrales, mismo resultado).
 *   2. Las métricas nuevas del informe v3, al final, expuestas en
 *      window.YLSMetrics y probadas en tests/metrics.test.mjs.
 *
 * Es un script clásico, no un módulo: las funciones de la parte 1 siguen
 * siendo globales porque index.html (y el motor de grupos) las llama así.
 */

function getHour24(timeStr, ampm) {
  const hour = parseInt(timeStr.split(':')[0]);
  if (!ampm) return hour;
  const isPM = ampm.includes('p');
  const isAM = ampm.includes('a');
  if (isPM && hour !== 12) return hour + 12;
  if (isAM && hour === 12) return 0;
  return hour;
}

function analyzeMessages(messages) {
  if (messages.length < 10) return null;

  // Get unique senders (filter system messages)
  const senders = {};
  messages.forEach(m => {
    if (m.sender && !m.text.includes('cifrado de extremo a extremo') && !m.text.includes('end-to-end encrypted')) {
      senders[m.sender] = (senders[m.sender] || 0) + 1;
    }
  });

  const sortedSenders = Object.entries(senders).sort((a, b) => b[1] - a[1]);
  if (sortedSenders.length < 2) return null;

  const personA = sortedSenders[0][0];
  const personB = sortedSenders[1][0];
  const msgsA = sortedSenders[0][1];
  const msgsB = sortedSenders[1][1];
  const total = msgsA + msgsB;

  // Love emojis
  const loveEmojis = /[❤️💕💖💗💘💝💓💞😍🥰😘💋💑🫶🫂💌]/g;
  let loveCount = 0;
  messages.forEach(m => {
    const found = m.text.match(loveEmojis);
    if (found) loveCount += found.length;
  });

  // Night messages (00:00–05:59)
  let nightCount = 0;
  messages.forEach(m => {
    if (m.time) {
      const hour = getHour24(m.time, m.ampm);
      if (hour >= 0 && hour < 6) nightCount++;
    }
  });
  const nightPct = messages.length > 0 ? Math.round((nightCount / messages.length) * 100) : 0;

  // Days span
  const dates = messages.map(m => m.date).filter(Boolean);
  const uniqueDays = new Set(dates).size;

  // Reply time (median of turn-switches, excluding gaps > 24h)
  const ratio = (msgsA / msgsB).toFixed(1);
  const sortedForReply = [];
  messages.forEach(m => {
    try {
      const ts = parseMessageDate(m.date, m.time, m.ampm);
      if (!isNaN(ts.getTime())) sortedForReply.push({ sender: m.sender, timestamp: ts });
    } catch(e) {}
  });
  sortedForReply.sort((a, b) => a.timestamp - b.timestamp);
  const replyTimes = [];
  for (let i = 1; i < sortedForReply.length; i++) {
    if (sortedForReply[i].sender !== sortedForReply[i - 1].sender) {
      const diffMin = (sortedForReply[i].timestamp - sortedForReply[i - 1].timestamp) / 60000;
      if (diffMin > 0 && diffMin < 2880) replyTimes.push(diffMin);
    }
  }
  let avgReply = 0;
  if (replyTimes.length > 0) {
    replyTimes.sort((a, b) => a - b);
    const mid = Math.floor(replyTimes.length / 2);
    avgReply = replyTimes.length % 2 === 0
      ? (replyTimes[mid - 1] + replyTimes[mid]) / 2
      : replyTimes[mid];
  }
  function formatResponseTime(minutes) {
    if (minutes < 1) {
      const seconds = Math.round(minutes * 60);
      return seconds <= 5 ? '< 5 seg' : seconds + ' seg';
    } else if (minutes < 60) {
      return Math.round(minutes) + ' min';
    } else if (minutes < 1440) {
      const hours = Math.floor(minutes / 60);
      const mins = Math.round(minutes % 60);
      return mins > 0 ? hours + 'h ' + mins + 'min' : hours + 'h';
    } else {
      return Math.floor(minutes / 1440) + ' días';
    }
  }
  const avgReplyFormatted = formatResponseTime(avgReply);

  // ── Score v2: 6 components ──

  // Derived data from sortedForReply (already chronological)
  const firstTs = sortedForReply.length > 0 ? sortedForReply[0].timestamp : new Date();
  const lastTs = sortedForReply.length > 0 ? sortedForReply[sortedForReply.length - 1].timestamp : new Date();
  const totalDays = Math.max(1, Math.round((lastTs - firstTs) / 86400000));

  // Active weeks
  const weekSet = new Set();
  sortedForReply.forEach(m => {
    const d = m.timestamp;
    const jan1 = new Date(d.getFullYear(), 0, 1);
    const weekNum = Math.ceil(((d - jan1) / 86400000 + jan1.getDay() + 1) / 7);
    weekSet.add(d.getFullYear() + '-W' + weekNum);
  });
  const totalWeeks = Math.max(1, Math.ceil(totalDays / 7));
  const activeWeeks = weekSet.size;
  const weeklyConsistency = activeWeeks / totalWeeks;

  // Silences (gaps > 48h between consecutive messages)
  let silencesCount = 0;
  for (let i = 1; i < sortedForReply.length; i++) {
    if ((sortedForReply[i].timestamp - sortedForReply[i - 1].timestamp) / 3600000 >= 48) {
      silencesCount++;
    }
  }

  // Double texting (5+ consecutive same sender)
  let doubleTextA = 0, doubleTextB = 0;
  let dtSender = null, dtCount = 0;
  sortedForReply.forEach(m => {
    if (m.sender === dtSender) {
      dtCount++;
    } else {
      if (dtCount >= 5 && dtSender) {
        if (dtSender === personA) doubleTextA++;
        else if (dtSender === personB) doubleTextB++;
      }
      dtSender = m.sender;
      dtCount = 1;
    }
  });
  if (dtCount >= 5 && dtSender) {
    if (dtSender === personA) doubleTextA++;
    else if (dtSender === personB) doubleTextB++;
  }

  // 1. EQUILIBRIO (0-25)
  const msgRatio = Math.min(msgsA, msgsB) / Math.max(msgsA, msgsB);
  const balanceScore = msgRatio >= 0.85 ? 25 :
                       msgRatio >= 0.70 ? 20 :
                       msgRatio >= 0.55 ? 14 :
                       msgRatio >= 0.40 ? 8  : 3;

  // 2. CONSISTENCIA TEMPORAL (0-20)
  const consistencyScore = weeklyConsistency >= 0.90 ? 20 :
                           weeklyConsistency >= 0.75 ? 16 :
                           weeklyConsistency >= 0.60 ? 11 :
                           weeklyConsistency >= 0.40 ? 6  : 2;

  // 3. TIEMPO DE RESPUESTA (0-20)
  const responseScore = avgReply <= 5   ? 20 :
                        avgReply <= 15  ? 17 :
                        avgReply <= 30  ? 14 :
                        avgReply <= 60  ? 10 :
                        avgReply <= 180 ? 6  :
                        avgReply <= 480 ? 3  : 1;

  // 4. AFECTO EXPRESADO (0-15)
  const loveRate = (loveCount / total) * 1000;
  const emojiScore = loveRate >= 15 ? 15 :
                     loveRate >= 8  ? 12 :
                     loveRate >= 4  ? 8  :
                     loveRate >= 1  ? 4  : 0;

  // 5. PENALIZACIÓN SILENCIOS (0 a -15)
  const monthsTotal = Math.max(1, totalDays / 30);
  const silenceRate = silencesCount / (monthsTotal / 6);
  const silencePenalty = silenceRate <= 1  ? 0   :
                         silenceRate <= 3  ? -3  :
                         silenceRate <= 6  ? -7  :
                         silenceRate <= 10 ? -11 : -15;

  // 6. PENALIZACIÓN DOUBLE TEXTING (0 a -10)
  const totalDouble = doubleTextA + doubleTextB;
  const doubleRate = totalDouble / total;
  const doubleRatio = totalDouble > 0
    ? Math.min(doubleTextA, doubleTextB) / Math.max(doubleTextA, doubleTextB)
    : 1;
  const doublePenalty = doubleRate < 0.05  ? 0   :
                        doubleRatio > 0.7  ? -2  :
                        doubleRatio > 0.4  ? -5  : -10;

  // Raw: max 80, min -25 → normalize to 0-100
  const rawScore = balanceScore + consistencyScore + responseScore + emojiScore + silencePenalty + doublePenalty;
  const score = Math.round(Math.min(100, Math.max(0, (rawScore + 25) / 105 * 100)));

  let verdict = '';
  if      (score >= 95) verdict = 'De otro planeta 🪐';
  else if (score >= 85) verdict = 'Sólidos de verdad 💚';
  else if (score >= 75) verdict = 'Va muy bien 💛';
  else if (score >= 65) verdict = 'Bien, pero ojo 👀';
  else if (score >= 55) verdict = 'Tibio, cuidado 🟠';
  else if (score >= 45) verdict = 'Enfriándose ya 🟠';
  else if (score >= 35) verdict = 'Algo está mal 🔴';
  else if (score >= 25) verdict = 'Bajo presión seria 🔴';
  else if (score >= 15) verdict = 'Casi apagado 💔';
  else                  verdict = 'Houston, hablemos 🚨';

  // Who leads
  const leader = msgsA > msgsB ? personA : personB;
  const leaderPct = Math.round(Math.max(msgsA, msgsB) / total * 100);

  return {
    personA, personB, msgsA, msgsB, total,
    loveCount, nightPct, uniqueDays, avgReply, avgReplyFormatted,
    score, verdict, leader, leaderPct, ratio,
    silencesCount, totalDouble,

    // Rango real de la conversación, para la portada del informe.
    firstDate: sortedForReply.length ? sortedForReply[0].timestamp : null,
    lastDate: sortedForReply.length ? sortedForReply[sortedForReply.length - 1].timestamp : null,

    // Los seis factores que componen el score, ya calculados arriba. Se
    // exponen para poder explicar en palabras qué va bien y qué no; los
    // umbrales son los mismos y el score no cambia.
    factors: {
      balance:      { score: balanceScore,     max: 25, value: msgRatio },
      consistency:  { score: consistencyScore, max: 20, value: weeklyConsistency },
      response:     { score: responseScore,    max: 20, value: avgReply },
      affection:    { score: emojiScore,       max: 15, value: loveRate },
      silences:     { score: silencePenalty,   max: 0,  min: -15, value: silencesCount },
      doubleTexting:{ score: doublePenalty,    max: 0,  min: -10, value: totalDouble }
    }
  };
}

function parseMessageDate(dateStr, timeStr, ampm) {
  const parts = dateStr.split('/');
  let day = parseInt(parts[0]);
  let month = parseInt(parts[1]);
  let year = parseInt(parts[2]);
  if (year < 100) year += 2000;
  const timeParts = timeStr.split(':');
  let hour = getHour24(timeStr, ampm);
  let minute = parseInt(timeParts[1]);
  let second = timeParts[2] ? parseInt(timeParts[2]) : 0;
  return new Date(year, month - 1, day, hour, minute, second);
}

// ── 1. LÍNEA DE VIDA DE LA RELACIÓN ──
function analyzeRelationshipTimeline(messages) {
  const monthlyData = {};
  const monthlyPerPerson = {};
  messages.forEach(m => {
    try {
      const date = parseMessageDate(m.date, m.time, m.ampm);
      if (isNaN(date.getTime())) return;
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthlyData[key] = (monthlyData[key] || 0) + 1;
      if (m.sender) {
        if (!monthlyPerPerson[key]) monthlyPerPerson[key] = {};
        monthlyPerPerson[key][m.sender] = (monthlyPerPerson[key][m.sender] || 0) + 1;
      }
    } catch(e) {}
  });

  const sortedMonths = Object.keys(monthlyData).sort();
  const monthNames = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  const fullMonthNames = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const labels = sortedMonths.map(k => {
    const [y, m] = k.split('-');
    return monthNames[parseInt(m)-1] + " '" + String(y).padStart(4, '0').slice(-2);
  });
  const labelsLong = sortedMonths.map(k => {
    const [y, m] = k.split('-');
    return fullMonthNames[parseInt(m)-1] + ' ' + y;
  });
  const data = sortedMonths.map(k => monthlyData[k]);
  const perPerson = sortedMonths.map(k => monthlyPerPerson[k] || {});

  const maxVal = Math.max(...data);
  const peakIdx = data.indexOf(maxVal);
  const peakMonth = labels[peakIdx];

  let declineMonth = null;
  let declinePct = 0;
  for (let i = peakIdx + 1; i < data.length; i++) {
    const drop = ((maxVal - data[i]) / maxVal) * 100;
    if (drop > 20) {
      declineMonth = labels[i];
      declinePct = Math.round(drop);
      break;
    }
  }

  return { labels, labelsLong, data, perPerson, peakMonth, maxVal, declineMonth, declinePct };
}

// ── SILENCE HELPERS ──
function formatSilenceDuration(hours) {
  if (hours < 48) return hours + 'h';
  return (hours / 24).toFixed(1) + ' días';
}


// ── 2. MAPA DE SILENCIOS ──
function analyzeSilences(messages) {
  const sorted = [];
  messages.forEach(m => {
    try {
      const ts = parseMessageDate(m.date, m.time, m.ampm);
      if (!isNaN(ts.getTime())) sorted.push({ ...m, timestamp: ts });
    } catch(e) {}
  });
  sorted.sort((a, b) => a.timestamp - b.timestamp);

  const silences = [];
  const THRESHOLD = 48 * 60 * 60 * 1000; // 48 hours

  for (let i = 1; i < sorted.length; i++) {
    const gap = sorted[i].timestamp - sorted[i-1].timestamp;
    if (gap >= THRESHOLD) {
      silences.push({
        start: sorted[i-1].timestamp,
        end: sorted[i].timestamp,
        hours: Math.round(gap / (60 * 60 * 1000)),
        brokeBy: sorted[i].sender,
        brokeMessage: sorted[i].text,
        lastSender: sorted[i-1].sender
      });
    }
  }

  const brokeCount = {};
  silences.forEach(s => {
    brokeCount[s.brokeBy] = (brokeCount[s.brokeBy] || 0) + 1;
  });

  const longest = silences.length > 0
    ? silences.reduce((max, s) => s.hours > max.hours ? s : max, silences[0])
    : null;

  return { silences, brokeCount, longest, total: silences.length };
}

// ── 3. DOUBLE TEXTING ANALYSIS ──
function analyzeDoubleTexting(messages) {
  const sorted = [];
  messages.forEach(m => {
    try {
      const ts = parseMessageDate(m.date, m.time, m.ampm);
      if (!isNaN(ts.getTime())) sorted.push({ ...m, timestamp: ts });
    } catch(e) {}
  });
  sorted.sort((a, b) => a.timestamp - b.timestamp);

  const episodes = {};
  let currentSender = null;
  let consecutiveCount = 0;

  sorted.forEach(m => {
    if (m.sender === currentSender) {
      consecutiveCount++;
    } else {
      if (consecutiveCount >= 5 && currentSender) {
        if (!episodes[currentSender]) episodes[currentSender] = [];
        episodes[currentSender].push(consecutiveCount);
      }
      currentSender = m.sender;
      consecutiveCount = 1;
    }
  });
  if (consecutiveCount >= 5 && currentSender) {
    if (!episodes[currentSender]) episodes[currentSender] = [];
    episodes[currentSender].push(consecutiveCount);
  }

  return episodes;
}

// ── 3b. MULTIMEDIA ANALYSIS ──
function analyzeMultimedia(messages) {
  const counts = {
    audios:      { perPerson: {}, total: 0, icon: '🎙️', label: 'Audios' },
    imagenes:    { perPerson: {}, total: 0, icon: '📸', label: 'Imágenes' },
    stickers:    { perPerson: {}, total: 0, icon: '🎭', label: 'Stickers' },
    videos:      { perPerson: {}, total: 0, icon: '🎬', label: 'Videos' },
    documentos:  { perPerson: {}, total: 0, icon: '📄', label: 'Documentos' },
    ubicaciones: { perPerson: {}, total: 0, icon: '📍', label: 'Ubicaciones' }
  };

  messages.forEach(m => {
    if (!m.sender || !m.text) return;
    // console.log('MULTIMEDIA DEBUG:', JSON.stringify(m.text.substring(0, 40)));
    const cl = (m.text || '')
      .replace(/[\u200e\u200f\u202a-\u202e\u2066-\u2069\u200b\u200c\u200d\ufeff]/g, '')
      .replace(/\r/g, '')
      .replace(/[<>]/g, '')
      .trim()
      .toLowerCase();

    let type = null;
    if (cl.includes('audio omitido') || cl.includes('audio omitted') ||
        cl.includes('ptt omitido') || cl.includes('ptt omitted')) {
      type = 'audios';
    } else if (cl.includes('imagen omitida') || cl.includes('image omitted')) {
      type = 'imagenes';
    } else if (cl.includes('sticker omitido') || cl.includes('sticker omitted')) {
      type = 'stickers';
    } else if (cl.includes('video omitido') || cl.includes('video omitted')) {
      type = 'videos';
    } else if (cl.includes('documento omitido') || cl.includes('document omitted')) {
      type = 'documentos';
    } else if (cl.includes('ubicación:') || cl.includes('ubicacion:') ||
               cl.includes('location:') || cl.includes('maps.google.com')) {
      type = 'ubicaciones';
    }

    if (type) {
      counts[type].perPerson[m.sender] = (counts[type].perPerson[m.sender] || 0) + 1;
      counts[type].total++;
    }
  });

  return counts;
}

// ── 4. MENSAJES ELIMINADOS ──
function analyzeDeletedMessages(messages) {
  const deletedPatterns = [
    'Este mensaje fue eliminado',
    'Se eliminó este mensaje',
    'This message was deleted',
    'You deleted this message',
    'Eliminaste este mensaje',
    'Borraste este mensaje'
  ];

  const deleted = {};
  const timestamps = [];
  let total = 0;

  messages.forEach(m => {
    if (deletedPatterns.some(p => m.text.includes(p))) {
      deleted[m.sender] = (deleted[m.sender] || 0) + 1;
      total++;
      try {
        const ts = parseMessageDate(m.date, m.time, m.ampm);
        if (!isNaN(ts.getTime())) timestamps.push({ sender: m.sender, date: ts });
      } catch(e) {}
    }
  });

  return { deleted, total, timestamps };
}

// ── GLOBAL STOPWORDS ──
const STOPWORDS = new Set([
  // Artículos y determinantes
  "el","la","los","las","un","una","unos","unas","lo","al","del",
  // Pronombres
  "yo","tu","el","ella","nosotros","vosotros","ellos","ellas",
  "me","te","se","nos","os","le","les","mi","mis","tus",
  "su","sus","mio","mia","tuyo","tuya","este","esta","estos",
  "estas","ese","esa","esos","esas","aquel","aquella","ello",
  // Preposiciones
  "a","ante","bajo","con","contra","de","desde","en","entre",
  "hacia","hasta","para","por","segun","sin","sobre","tras",
  // Conjunciones
  "y","e","o","u","pero","sino","aunque","porque","que","si",
  "ni","como","cuando","donde","mientras","pues","ya","tanto",
  // Verbos auxiliares y comunes
  "es","son","fue","ser","estar","estoy","estas","esta",
  "estamos","estais","estan","era","eras","eramos","eran",
  "hay","haber","tiene","tienen","tengo","tienes","tenia",
  "hacer","hago","haces","hace","hacemos","hacen","hizo",
  "ir","voy","vas","va","vamos","van","iba","dijo","dice",
  "se","saber","poder","puedo","puede","pueden","podria","querer",
  "quiero","quieres","quiere","ver","veo","ves","ve",
  // Adverbios vacíos
  "no","si","tambien","tampoco","muy","mas","menos","bien",
  "mal","aqui","ahi","alli","ahora","antes","despues","luego",
  "ya","aun","todavia","siempre","nunca","jamas","solo","tan",
  "asi","todo","nada","algo","alguien","nadie","cada","otro",
  "otra","otros","otras","mismo","misma","cual","que","quien",
  // Relleno de chat
  "ok","okay","jaja","jajaja","jajajaja","jeje","jejeje","xd","xdd",
  "mm","mmm","hmm","ah","oh","ay","eh","uh","bueno","pues",
  "claro","vale","venga","dale","anda","oye","oiga","mira",
  "eso","esto","aca","alla","hola","buena","buenas",
  // Verbos/palabras genéricas que no aportan tema
  "creo","puede","sea","era","solo","cada","vez","dos","tres",
  "dia","dias","han","van","son","ver","les","ella","ellos",
  "tiene","medio","tipo","cosa","cosas","verdad","manera",
  "parte","lado","punto","forma","caso","gente","persona"
]);
const TEMPORAL_WORDS = new Set([
  "manana","hoy","ayer","semana","mes","ano","lunes","martes",
  "miercoles","jueves","viernes","sabado","domingo","noche",
  "tarde","hora","minuto","rato","momento","vez",
  "veces","tiempo","fecha","pronto"
]);
const _normKw = w => w.replace(/[áà]/g,'a').replace(/[éè]/g,'e').replace(/[íì]/g,'i').replace(/[óò]/g,'o').replace(/[úùü]/g,'u').replace(/ñ/g,'n');
function isStopword(word, extraNames) {
  const n = _normKw(word.toLowerCase());
  if (n.length < 4) return true;
  if (STOPWORDS.has(n)) return true;
  if (TEMPORAL_WORDS.has(n)) return true;
  if (extraNames) {
    for (const name of extraNames) { if (n === _normKw(name.toLowerCase())) return true; }
  }
  return false;
}

const MEDIA_BLACKLIST = new Set([
  'omitido','omitida','omitidos','omitidas','adjunto','multimedia',
  'sticker','gif','audio','llamada','perdida','eliminado','eliminaste',
  'mensaje','imagen','video','archivo','documento','contacto',
  'ubicacion','nota','enlace'
]);

function extractKeywords(msgs, topN, participantNames) {
  if (msgs.length < 50) return [];
  const names = (participantNames || []).flatMap(n => n.toLowerCase().split(/\s+/));
  // Count words per unique message (not per occurrence within a message)
  const msgCount = {};
  msgs.forEach(m => {
    const seen = new Set();
    const words = (m.text || '').toLowerCase().match(/[a-záéíóúüñ]{4,}/g) || [];
    words.forEach(w => {
      const n = _normKw(w);
      if (!isStopword(n, names) && !seen.has(n) && !MEDIA_BLACKLIST.has(n)) {
        seen.add(n);
        msgCount[n] = (msgCount[n] || 0) + 1;
      }
    });
  });
  return Object.entries(msgCount)
    .filter(([, c]) => c >= 3)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN || 5)
    .map(e => e[0]);
}

// ── OBSESSIVE 2: ANTES VS AHORA ──
function analyzeBeforeVsNow(sorted, stats) {
  if (sorted.length < 50) return null;

  const firstDate = sorted[0].timestamp;
  const lastDate = sorted[sorted.length - 1].timestamp;
  const totalDaysSpan = (lastDate - firstDate) / (24 * 60 * 60 * 1000);
  if (totalDaysSpan < 60) return null;

  const cutoffMonths = Math.min(3, Math.floor(totalDaysSpan / 60));
  const beforeEnd = new Date(firstDate.getTime() + cutoffMonths * 30 * 24 * 60 * 60 * 1000);
  const afterStart = new Date(lastDate.getTime() - cutoffMonths * 30 * 24 * 60 * 60 * 1000);

  const beforeMsgs = sorted.filter(m => m.timestamp <= beforeEnd);
  const afterMsgs = sorted.filter(m => m.timestamp >= afterStart);

  const personA = stats.personA;
  const personB = stats.personB;

  const loveEmojis = /[❤️💕💖💗💘💝💓💞😍🥰😘💋💑🫶🫂💌]/g;
  const nicknamePattern = /\b(?:amor|mi amor|bebe|bb|bebé|cariño|corazón|vida|mi vida|cielo|hermosa|hermoso|princesa|príncipe|gordo|gorda|flaco|flaca|nena|nene|papi|mami|tesoro|bonita|bonito|chiquita|chiquito|muñeca|reina|rey)\b/i;

  function countLoveEmojis(msgs) {
    let count = 0;
    msgs.forEach(m => { const f = m.text.match(loveEmojis); if (f) count += f.length; });
    return count;
  }

  function avgLength(msgs) {
    if (msgs.length === 0) return 0;
    return Math.round(msgs.reduce((s, m) => s + m.text.length, 0) / msgs.length);
  }

  function countNicknames(msgs) {
    return msgs.filter(m => nicknamePattern.test(m.text)).length;
  }

  function countInitiator(msgs, person) {
    let initiations = 0;
    let lastTime = null;
    msgs.forEach(m => {
      const gap = lastTime ? (m.timestamp - lastTime) : Infinity;
      if (gap > 4 * 60 * 60 * 1000 && m.sender === person) initiations++;
      lastTime = m.timestamp;
    });
    return initiations;
  }

  function countNightMsgs(msgs) {
    return msgs.filter(m => {
      const h = m.timestamp.getHours();
      return h >= 0 && h < 6;
    }).length;
  }

  function calcChange(before, after) {
    if (before === 0 && after === 0) return 0;
    if (before === 0) return 100;
    return Math.round(((after - before) / before) * 100);
  }

  // Per-person analysis
  function analyzePersonBvn(person) {
    const bMsgs = beforeMsgs.filter(m => m.sender === person);
    const aMsgs = afterMsgs.filter(m => m.sender === person);
    const metrics = [
      { label: 'Mensajes enviados', before: bMsgs.length, after: aMsgs.length, positive: 'up' },
      { label: 'Largo promedio', before: avgLength(bMsgs), after: avgLength(aMsgs), suffix: ' chars', positive: 'up' },
      { label: 'Emojis de amor ❤️', before: countLoveEmojis(bMsgs), after: countLoveEmojis(aMsgs), positive: 'up' },
      { label: 'Apodos cariñosos', before: countNicknames(bMsgs), after: countNicknames(aMsgs), positive: 'up' },
      { label: 'Inicia conversación', before: countInitiator(beforeMsgs, person), after: countInitiator(afterMsgs, person), suffix: ' veces', positive: 'up' },
      { label: 'Mensajes nocturnos', before: countNightMsgs(bMsgs), after: countNightMsgs(aMsgs), positive: 'neutral' }
    ];
    metrics.forEach(m => { m.changePct = calcChange(m.before, m.after); });
    return metrics;
  }

  const monthNames = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  return {
    personA: { name: personA, metrics: analyzePersonBvn(personA) },
    personB: { name: personB, metrics: analyzePersonBvn(personB) },
    beforeLabel: `${monthNames[firstDate.getMonth()]} ${firstDate.getFullYear()} — ${monthNames[beforeEnd.getMonth()]} ${beforeEnd.getFullYear()}`,
    afterLabel: `${monthNames[afterStart.getMonth()]} ${afterStart.getFullYear()} — ${monthNames[lastDate.getMonth()]} ${lastDate.getFullYear()}`,
    cutoffMonths
  };
}

// ── OBSESSIVE 3: GHOSTING SELECTIVO ──
const GHOSTING_CATEGORIES = {
  confesion: {
    label: 'Confesiones de amor', emoji: '💕',
    keywords: ['te quiero','te amo','te adoro','me gustas','me encantas','eres lo mejor','eres increíble','no sé qué haría sin ti','eres especial para mí','me haces feliz','pienso en ti','te echo de menos','te extraño','me haces falta','eres todo para mí','gracias por existir','me alegras la vida']
  },
  relacional: {
    label: 'Preguntas sobre la relación', emoji: '💔',
    keywords: ['qué somos','qué hay entre','cómo estamos','estás bien conmigo','pasa algo entre','algo va mal','me quieres','te importo','nuestra relación','tenemos que hablar','podemos hablar','necesito que me digas','qué sientes por mí','qué soy para ti','estás conmigo','sigues queriéndome']
  },
  emocional: {
    label: 'Momentos de vulnerabilidad', emoji: '🥺',
    keywords: ['estoy mal','me duele','me siento solo','me siento sola','estoy llorando','lloré','tengo miedo','me preocupa','no sé qué hacer','necesito ayuda','estoy agobiado','agobiada','me agobio','no puedo más','estoy harto','harta','me rindo','me da igual','ya nada','para qué']
  },
  pregunta_directa: {
    label: 'Preguntas directas', emoji: '❓',
    special: 'question_only'
  },
  casual: {
    label: 'Conversación casual', emoji: '💬',
    fallback: true
  }
};

function analyzeSelectiveGhosting(sorted, stats) {
  if (sorted.length < 30) return null;

  const personA = stats.personA;
  const personB = stats.personB;

  function classifyMessage(text) {
    const lower = text.toLowerCase();
    for (const cat of ['confesion','relacional','emocional']) {
      if (GHOSTING_CATEGORIES[cat].keywords.some(kw => lower.includes(kw))) return cat;
    }
    const wordCount = text.trim().split(/\s+/).length;
    if (text.trim().endsWith('?') && wordCount < 15) return 'pregunta_directa';
    return 'casual';
  }

  function median(arr) {
    if (arr.length === 0) return 0;
    const s = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(s.length / 2);
    return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
  }

  // Analyze for both directions: A→B and B→A
  function analyzeDirection(sender, responder) {
    const categories = { confesion: [], relacional: [], emocional: [], pregunta_directa: [], casual: [] };
    const episodes = [];
    let worstCase = null;

    // O(n) single-pass: track last unanswered message from sender
    let pendingMessage = null;
    let totalResponseTime = 0;
    let responseCount = 0;

    for (let i = 0; i < sorted.length; i++) {
      const msg = sorted[i];
      if (msg.sender === sender) {
        // New message from sender — overwrite any previous pending (only last matters)
        pendingMessage = { timestamp: msg.timestamp, text: msg.text, category: classifyMessage(msg.text) };
      } else if (msg.sender === responder && pendingMessage !== null) {
        const responseTime = (msg.timestamp - pendingMessage.timestamp) / (60 * 1000);
        if (responseTime > 0 && responseTime < 48 * 60) {
          const cat = pendingMessage.category;
          categories[cat].push(responseTime);
          totalResponseTime += responseTime;
          responseCount++;
          // Ghost threshold: use running average instead of recalculating median every iteration
          const runningAvg = totalResponseTime / responseCount;
          const ghostThreshold = runningAvg < 60 ? 180 : 360;
          if (responseTime > ghostThreshold) {
            episodes.push({ date: pendingMessage.timestamp, responseTime, category: cat, text: pendingMessage.text });
          }
          // Track worst case for emotional/relational
          if ((cat === 'emocional' || cat === 'relacional' || cat === 'confesion') && (!worstCase || responseTime > worstCase.responseTime)) {
            worstCase = { text: pendingMessage.text, date: pendingMessage.timestamp, responseTime, category: cat, responseDate: msg.timestamp };
          }
        }
        pendingMessage = null;
      }
    }

    const catResults = {};
    for (const [cat, times] of Object.entries(categories)) {
      catResults[cat] = { median: Math.round(median(times)), count: times.length };
    }

    // Temporal trend
    const midPoint = sorted[Math.floor(sorted.length / 2)].timestamp;
    const firstHalf = episodes.filter(e => e.date < midPoint).length;
    const secondHalf = episodes.filter(e => e.date >= midPoint).length;
    const trend = secondHalf > firstHalf * 1.5 ? 'aumentando' : secondHalf < firstHalf * 0.7 ? 'mejorando' : 'estable';

    // Ratio: emotional median / casual median
    const emotionalMedian = Math.max(catResults.emocional.median, catResults.relacional.median, catResults.confesion.median);
    const casualMedian = catResults.casual.median || 1;
    const ratio = Math.round((emotionalMedian / casualMedian) * 10) / 10;

    // Ghosting emotional percentage
    const emotionalEpisodes = episodes.filter(e => ['emocional','relacional','confesion'].includes(e.category)).length;
    const ghostEmotionalPct = episodes.length > 0 ? Math.round((emotionalEpisodes / episodes.length) * 100) : 0;

    return { categories: catResults, episodes, worstCase, trend, firstHalf, secondHalf, ratio, ghostEmotionalPct, responderName: responder };
  }

  const bData = analyzeDirection(personA, personB);
  const aData = analyzeDirection(personB, personA);

  return { personB: bData, personA: aData, personBName: personB, personAName: personA };
}

function getGhostingVerdict(data) {
  const { ratio, trend, ghostEmotionalPct } = data;
  if (ratio > 8 && ghostEmotionalPct > 60) {
    return `El patrón es inequívoco: responde mensajes banales en minutos pero puede tardar horas en contestar cuando el tema tiene carga emocional.${trend === 'aumentando' ? ' Y cada vez es más frecuente.' : ''}`;
  }
  if (ratio > 4) {
    return 'Hay una diferencia clara entre cómo responde lo cotidiano y lo emocional. No es falta de tiempo — es una evasión selectiva de los temas que incomodan.';
  }
  if (ratio > 2) {
    return 'Ligera tendencia a tardar más con los temas emocionales, pero sin un patrón alarmante. Puede ser forma de procesar antes de responder.';
  }
  if (ratio <= 1.2) {
    return 'No hay ghosting selectivo. Los tiempos de respuesta son consistentes independientemente de lo que se le diga. Buena señal.';
  }
  return 'Los datos no muestran un patrón claro de evasión.';
}

// ── OBSESSIVE 4: DETECTOR DE CAMBIOS DE LENGUAJE ──
const AFFECTIVE_VOCAB = [
  'amor','amorcito','mi amor','cariño','mi cariño','cielo','mi cielo',
  'vida','mi vida','bebé','bebe','corazón','mi corazón','bonita',
  'bonito','hermosa','hermoso','preciosa','linda','lindo','guapa',
  'guapo','chiqui','osito','osita','gordi','tontito','tontita',
  'te quiero','te amo','te adoro','te extraño','te echo de menos',
  'me haces feliz','eres lo mejor','eres increíble','eres especial',
  'pienso en ti','para siempre','gracias por existir','me alegras'
];

const COLD_RESPONSES = [
  'ok','okay','k','vale','sí','si','no','ya','bueno','bien',
  'claro','venga','dale','aha','ajá','mhm','mm','hmm','jaja',
  'jeje','👍','😊','😂','🙂','lol'
];

const DISTANCING_WORDS = [
  'trabajo','trabajando','ocupado','ocupada','cansado','cansada',
  'estrés','estres','luego','después','mañana','no puedo',
  'no sé','igual','depende','veremos','ya veremos','imposible',
  'difícil','complicado','no tengo tiempo','estoy liado','liada'
];

function analyzeLanguageChanges(sorted, stats) {
  if (sorted.length < 50) return null;

  const personA = stats.personA;
  const personB = stats.personB;
  const monthNames = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

  function analyzePersonLanguage(personMsgs, personName) {
    if (personMsgs.length < 20) return null;

    // Split into 3 equal periods by message count
    const third = Math.floor(personMsgs.length / 3);
    const periods = [
      personMsgs.slice(0, third),
      personMsgs.slice(third, third * 2),
      personMsgs.slice(third * 2)
    ];

    const omittedPattern = /(?:imagen|audio|video|sticker|GIF|documento|contacto|ubicación)\s+omitid[oa]/i;

    function analyzePeriod(msgs) {
      const filtered = msgs.filter(m => !omittedPattern.test(m.text));
      if (filtered.length === 0) return { affectRate: 0, avgLength: 0, coldPct: 0, count: 0 };

      // Affective index per 1000 messages
      let affectCount = 0;
      filtered.forEach(m => {
        const lower = m.text.toLowerCase();
        AFFECTIVE_VOCAB.forEach(word => {
          if (lower.includes(word)) affectCount++;
        });
      });
      const affectRate = Math.round((affectCount / filtered.length) * 1000);

      // Average message length
      const avgLength = Math.round(filtered.reduce((s, m) => s + m.text.length, 0) / filtered.length);

      // Cold response ratio
      let coldCount = 0;
      filtered.forEach(m => {
        const clean = m.text.trim().toLowerCase().replace(/[.,!?¿¡]/g, '').trim();
        if (COLD_RESPONSES.includes(clean)) coldCount++;
      });
      const coldPct = Math.round((coldCount / filtered.length) * 100);

      return { affectRate, avgLength, coldPct, count: filtered.length };
    }

    const p1 = analyzePeriod(periods[0]);
    const p2 = analyzePeriod(periods[1]);
    const p3 = analyzePeriod(periods[2]);

    // Period date labels
    const fmtDate = d => `${monthNames[d.getMonth()]} ${d.getFullYear().toString().slice(2)}`;
    const periodLabels = periods.map(p => {
      if (p.length === 0) return '';
      return `${fmtDate(p[0].timestamp)}–${fmtDate(p[p.length - 1].timestamp)}`;
    });

    // Disappeared words: high frequency in P1, <=20% in P3
    const nameWords = [personA, personB].flatMap(n => n.toLowerCase().split(/\s+/));
    function wordFreqs(msgs) {
      const freq = {};
      msgs.forEach(m => {
        const words = m.text.toLowerCase().match(/\b[a-záéíóúñü]{4,}\b/g) || [];
        words.forEach(w => {
          if (!isStopword(w, nameWords)) freq[w] = (freq[w] || 0) + 1;
        });
      });
      return freq;
    }

    const freqP1 = wordFreqs(periods[0]);
    const freqP3 = wordFreqs(periods[2]);
    const affectiveSet = new Set(AFFECTIVE_VOCAB.flatMap(v => v.split(' ').filter(w => w.length >= 4)));
    const distancingSet = new Set(DISTANCING_WORDS.flatMap(v => v.split(' ').filter(w => w.length >= 4)));

    const disappeared = Object.entries(freqP1)
      .filter(([w, c]) => c >= 3 && (!freqP3[w] || freqP3[w] <= c * 0.2))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([w, c]) => ({ word: w, countP1: c, countP3: freqP3[w] || 0, isAffective: affectiveSet.has(w) }));

    const appeared = Object.entries(freqP3)
      .filter(([w, c]) => c >= 3 && (!freqP1[w] || freqP1[w] <= c * 0.2))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([w, c]) => ({ word: w, countP1: freqP1[w] || 0, countP3: c, isDistancing: distancingSet.has(w) }));

    // Find warmest message from P1 and coldest from recent
    let warmestMsg = null;
    let warmestScore = 0;
    periods[0].forEach(m => {
      const lower = m.text.toLowerCase();
      let score = 0;
      AFFECTIVE_VOCAB.forEach(w => { if (lower.includes(w)) score++; });
      score += m.text.length / 50; // bonus for length
      if (score > warmestScore && m.text.length > 20) {
        warmestScore = score;
        warmestMsg = m;
      }
    });

    let coldestMsg = null;
    const recentMsgs = periods[2].slice(-Math.min(200, periods[2].length));
    let coldestLen = Infinity;
    recentMsgs.forEach(m => {
      if (m.text.length > 1 && m.text.length < coldestLen && !omittedPattern.test(m.text) && m.text.length < 60) {
        coldestLen = m.text.length;
        coldestMsg = m;
      }
    });

    return {
      personName,
      p1, p2, p3,
      periodLabels,
      disappeared,
      appeared,
      disappearedAffective: disappeared.filter(d => d.isAffective).map(d => d.word),
      newDistancing: appeared.filter(a => a.isDistancing).map(a => a.word),
      warmestMsg: warmestMsg ? { text: warmestMsg.text.substring(0, 120), date: warmestMsg.timestamp, sender: warmestMsg.sender } : null,
      coldestMsg: coldestMsg ? { text: coldestMsg.text.substring(0, 120), date: coldestMsg.timestamp, sender: coldestMsg.sender } : null
    };
  }

  const personBMsgs = sorted.filter(m => m.sender === personB);
  const personAMsgs = sorted.filter(m => m.sender === personA);

  const bData = analyzePersonLanguage(personBMsgs, personB);
  const aData = analyzePersonLanguage(personAMsgs, personA);

  // Check if we have at least 3 months for period comparison
  const firstDate = sorted[0].timestamp;
  const lastDate = sorted[sorted.length - 1].timestamp;
  const totalMonths = (lastDate - firstDate) / (30 * 24 * 60 * 60 * 1000);
  const hasEnoughMonths = totalMonths >= 3;

  return { personBData: bData, personAData: aData, personBName: personB, personAName: personA, hasEnoughMonths };
}

function getLanguageVerdict(personData) {
  if (!personData) return 'Sin datos suficientes para este análisis.';
  const { p1, p3, disappearedAffective, newDistancing } = personData;

  const affectDrop = p1.affectRate > 0 ? (p1.affectRate - p3.affectRate) / p1.affectRate : 0;
  const coldIncrease = p3.coldPct - p1.coldPct;
  const lengthDrop = p1.avgLength > 0 ? (p1.avgLength - p3.avgLength) / p1.avgLength : 0;

  if (disappearedAffective.length > 2 && affectDrop > 0.6 && coldIncrease > 20) {
    return `El cambio es difícil de ignorar: palabras como "${disappearedAffective.slice(0,2).join('" y "')}" casi han desaparecido, los mensajes son ${Math.round(lengthDrop*100)}% más cortos y las respuestas frías pasaron del ${Math.round(p1.coldPct)}% al ${Math.round(p3.coldPct)}%. No es el mismo lenguaje que al principio.`;
  }
  if (affectDrop > 0.5 && coldIncrease > 15) {
    return `El lenguaje afectivo cayó un ${Math.round(affectDrop*100)}% entre el inicio y ahora. Los mensajes se volvieron más escuetos y las respuestas de una palabra más frecuentes. Es un patrón que merece atención.`;
  }
  if (affectDrop > 0.25) {
    return 'Hay un enfriamiento moderado en el lenguaje. Parte puede ser normalización de la relación — parte puede ser algo más. Los números hablan por sí solos.';
  }
  if (affectDrop < -0.1) {
    return 'Buena señal: el lenguaje afectivo creció con el tiempo. La forma de hablarse se volvió más cálida, no más fría.';
  }
  return 'El lenguaje se mantiene estable. No se detectan señales de enfriamiento significativo en la forma de comunicarse.';
}


// ══════════════════════════════════════════════
// ── MÉTRICAS DEL INFORME v3 ──
// ══════════════════════════════════════════════
// Todo lo que sigue es nuevo en la v3 y alimenta las secciones 02-10 del
// informe y la guía. Mismas reglas que el resto del motor: se ejecuta en el
// navegador y trabaja sobre los mensajes ya parseados. Nada de aquí viaja: lo
// que sale hacia la IA lo decide public/js/ai-payload.js campo a campo.
(function (root) {
  'use strict';

  const MIN = 60000;
  const HOUR = 3600000;
  const DAY = 86400000;

  // Una conversación nueva empieza tras 4 horas sin mensajes. Es el mismo
  // corte que usa analyzeBeforeVsNow para contar quién inicia.
  const CONVERSATION_GAP_MIN = 4 * 60;
  const OPENING_GAP_MIN = 8 * 60;
  // Una pregunta cuenta como respondida si la otra persona escribe en las
  // siguientes 12 horas.
  const ANSWER_WINDOW_MIN = 12 * 60;
  // Igual que analyzeMessages: por encima de 48 h no es una respuesta, es un
  // silencio, y se mide aparte.
  const REPLY_MAX_MIN = 48 * 60;

  const BANDS = [
    { key: 'madrugada', label: 'Madrugada', range: '0 a 6 h', from: 0, to: 6 },
    { key: 'manana', label: 'Mañana', range: '6 a 12 h', from: 6, to: 12 },
    { key: 'tarde', label: 'Tarde', range: '12 a 19 h', from: 12, to: 19 },
    { key: 'noche', label: 'Noche', range: '19 a 24 h', from: 19, to: 24 }
  ];
  const WEEKDAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto',
    'septiembre', 'octubre', 'noviembre', 'diciembre'];

  const MEDIA_RE = /(?:imagen|audio|video|v[ií]deo|sticker|gif|documento|contacto|ptt)\s+omitid[oa]|(?:image|audio|video|sticker|gif|document|contact)\s+omitted|multimedia omitido|media omitted/i;
  const DELETED_RE = /este mensaje fue eliminado|se elimin[oó] este mensaje|this message was deleted|you deleted this message|eliminaste este mensaje|borraste este mensaje/i;
  // WhatsApp añade esta marca al final de un mensaje editado en los exports
  // recientes. Los antiguos no la traen y entonces no hay forma de saberlo.
  const EDITED_RE = /<?\s*(?:se edit[oó] este mensaje|este mensaje se edit[oó]|this message was edited|mensaje editado)\.?\s*>?\s*$/i;

  const LOVE_EMOJI_RE = /(?:❤️|❤|💕|💖|💗|💘|💝|💓|💞|😍|🥰|😘|💋|💑|🫶|🫂|💌)/gu;

  // Palabras y frases de afecto. Se comparan como palabra completa y sin
  // acentos; se quitan las ambiguas sueltas («vida», «cielo», «rey»).
  const WARM_PHRASES = [
    'te quiero', 'te amo', 'te adoro', 'te extrano', 'te echo de menos', 'me haces falta',
    'me haces feliz', 'eres lo mejor', 'eres increible', 'eres especial', 'pienso en ti',
    'gracias por existir', 'me alegras', 'me encantas', 'me gustas', 'mi amor', 'amor',
    'amorcito', 'mi vida', 'mi cielo', 'carino', 'mi corazon', 'corazon', 'bebe', 'bb',
    'preciosa', 'precioso', 'hermosa', 'hermoso', 'bonita', 'guapa', 'guapo', 'linda',
    'lindo', 'mi reina', 'princesa', 'gordi', 'osito', 'osita', 'chiquita', 'chiquito',
    'tesoro', 'nena', 'nene'
  ];

  const RITUALS = [
    { key: 'buenosDias', label: 'Los buenos días',
      re: /\bbuen(?:os)? d[ií]as?\b|\bbuenas? mañanas?\b|\bbuen d[ií]a\b/i },
    { key: 'buenasNoches', label: 'Las buenas noches',
      re: /\bbuenas noches\b|\bque descanses\b|\bdescansa\b|\bque duermas\b|\bsue[ñn]a bonito\b|\bdulces sue[ñn]os\b/i },
    { key: 'seguimiento', label: 'Preguntar por el día del otro',
      re: /c[oó]mo te fue|c[oó]mo (?:est[aá]s|vas|sigues|amaneciste|te sientes|va tu d[ií]a)|qu[eé] tal (?:tu|el|te fue)|c[oó]mo te va|qu[eé] tal todo/i },
    { key: 'humor', label: 'El humor',
      re: /\b(?:ja){2,}|\b(?:je){2,}|\b(?:ji){2,}|😂|🤣|😹|\blol\b|\bxd+\b/i },
    { key: 'afecto', label: 'Decirse lo que se quieren',
      re: /\bte (?:quiero|amo|adoro|extra[ñn]o)\b|\bte echo de menos\b|\bme haces falta\b/i }
  ];

  function normalize(s) {
    return String(s || '').toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/ñ/g, 'n');
  }

  function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

  // Una lista de palabras → una expresión que las busca como palabra completa
  // sobre texto normalizado. Las frases largas van primero para que «mi amor»
  // gane a «amor».
  function phraseRegex(words, flags) {
    const alts = Array.from(new Set(words.map(normalize)))
      .sort((a, b) => b.length - a.length)
      .map(escapeRe);
    return new RegExp('(?:^|[^a-z0-9])(' + alts.join('|') + ')(?=$|[^a-z0-9])', flags || '');
  }

  const WARM_RE = phraseRegex(WARM_PHRASES, 'g');

  function countMatches(re, text) {
    re.lastIndex = 0;
    let n = 0;
    while (re.exec(text) !== null) n++;
    return n;
  }

  function median(arr) {
    if (!arr.length) return null;
    const s = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(s.length / 2);
    return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
  }

  function round(v, d) {
    const f = Math.pow(10, d || 0);
    return Math.round(v * f) / f;
  }

  function pct(part, whole) {
    return whole ? Math.round(part / whole * 100) : 0;
  }

  // 12 min, 1 h 35 min, 2 días. Mismo registro que el resto del informe.
  function formatMinutes(minutes) {
    if (minutes === null || minutes === undefined || isNaN(minutes)) return '—';
    if (minutes < 1) return 'menos de 1 min';
    if (minutes < 60) return Math.round(minutes) + ' min';
    if (minutes < 1440) {
      const h = Math.floor(minutes / 60);
      const m = Math.round(minutes % 60);
      return m ? h + ' h ' + m + ' min' : h + ' h';
    }
    const d = Math.round(minutes / 1440 * 10) / 10;
    return String(d).replace('.', ',') + (d === 1 ? ' día' : ' días');
  }

  function isMedia(text) { return MEDIA_RE.test(text); }
  function isDeleted(text) { return DELETED_RE.test(text); }
  function isQuestion(text) {
    return text.indexOf('?') !== -1 && !isMedia(text) && !isDeleted(text);
  }

  function monthKey(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
  }
  function dayKey(d) {
    return monthKey(d) + '-' + String(d.getDate()).padStart(2, '0');
  }
  function monthLabel(key) {
    const [y, m] = key.split('-');
    return MONTHS[parseInt(m, 10) - 1] + ' de ' + y;
  }

  /*
   * Mensajes de las dos personas, con fecha, en orden. Es la entrada de todas
   * las métricas nuevas y tiene la misma forma que el `sorted` que usan
   * analyzeBeforeVsNow, analyzeSelectiveGhosting y analyzeLanguageChanges.
   */
  function sortMessages(messages, stats) {
    const out = [];
    for (const m of messages) {
      if (m.sender !== stats.personA && m.sender !== stats.personB) continue;
      let ts;
      try { ts = parseMessageDate(m.date, m.time, m.ampm); } catch (e) { continue; }
      if (isNaN(ts.getTime())) continue;
      out.push({ sender: m.sender, text: m.text || '', timestamp: ts });
    }
    out.sort((a, b) => a.timestamp - b.timestamp);
    return out;
  }

  /*
   * Turnos: rachas seguidas de mensajes de la misma persona. Casi todas las
   * métricas de iniciativa y respuesta razonan por turnos y no por mensajes,
   * porque «¿vienes? ¿a qué hora?» es una sola pregunta.
   */
  function toTurns(sorted) {
    const turns = [];
    let cur = null;
    for (let i = 0; i < sorted.length; i++) {
      const m = sorted[i];
      const gapMin = i ? (m.timestamp - sorted[i - 1].timestamp) / MIN : Infinity;
      if (cur && cur.sender === m.sender && gapMin < CONVERSATION_GAP_MIN) {
        cur.messages.push(m);
        cur.end = m.timestamp;
      } else {
        // Tras 4 horas sin mensajes empieza una conversación nueva. Quien
        // escribe entonces la abre, salvo que esté contestando tarde a la otra
        // persona: con menos de 8 horas de retraso, o de 24 si la otra persona
        // acababa de abrir la conversación y seguía esperando. Responder tarde
        // no es tomar la iniciativa. Un «buenos días» tras un «buenas noches»
        // sí lo es.
        const prev = turns[turns.length - 1];
        const newConversation = gapMin >= CONVERSATION_GAP_MIN;
        const lateReply = prev && prev.sender !== m.sender &&
          (gapMin < OPENING_GAP_MIN || (prev.opens && gapMin < 24 * 60));
        cur = { sender: m.sender, start: m.timestamp, end: m.timestamp, messages: [m],
          newConversation, opens: newConversation && !lateReply };
        turns.push(cur);
      }
    }
    // El siguiente turno de la otra persona, con cuánto tardó en llegar.
    for (let i = 0; i < turns.length; i++) {
      const next = turns[i + 1];
      turns[i].replyMin = next && next.sender !== turns[i].sender
        ? (next.start - turns[i].end) / MIN
        : null;
      turns[i].repliedBy = next && next.sender !== turns[i].sender ? next.sender : null;
    }
    return turns;
  }

  function splitHalves(sorted) {
    if (!sorted.length) return null;
    const first = sorted[0].timestamp.getTime();
    const last = sorted[sorted.length - 1].timestamp.getTime();
    return { first, last, mid: first + (last - first) / 2 };
  }

  // ── 04 · CÓMO EMPIEZAN Y CÓMO TERMINAN ──
  function analyzeConversations(sorted, stats, turns) {
    const names = [stats.personA, stats.personB];
    const opened = { [names[0]]: 0, [names[1]]: 0 };
    const closed = { [names[0]]: 0, [names[1]]: 0 };
    const openedEarly = { [names[0]]: 0, [names[1]]: 0 };
    const openedLate = { [names[0]]: 0, [names[1]]: 0 };
    const hanging = { [names[0]]: 0, [names[1]]: 0 };
    const halves = splitHalves(sorted);
    let total = 0;
    let openings = 0;
    const sizes = [];
    let size = 0;

    for (let i = 0; i < turns.length; i++) {
      const t = turns[i];
      if (t.opens) {
        openings++;
        opened[t.sender]++;
        if (t.start.getTime() < halves.mid) openedEarly[t.sender]++;
        else openedLate[t.sender]++;
      }
      if (t.newConversation || i === 0) {
        total++;
        if (i > 0) {
          const prev = turns[i - 1];
          closed[prev.sender]++;
          // La conversación terminó con una pregunta de alguien sin respuesta.
          if (prev.messages.some(m => isQuestion(m.text))) hanging[prev.sender]++;
        }
        if (size) sizes.push(size);
        size = 0;
      }
      size += t.messages.length;
    }
    if (turns.length) closed[turns[turns.length - 1].sender]++;
    if (size) sizes.push(size);

    const earlyTotal = openedEarly[names[0]] + openedEarly[names[1]];
    const lateTotal = openedLate[names[0]] + openedLate[names[1]];

    return {
      total,
      openings,
      medianMessages: median(sizes) || 0,
      people: names.map(name => ({
        name,
        opened: opened[name],
        openedPct: pct(opened[name], openings),
        openedPctEarly: pct(openedEarly[name], earlyTotal),
        openedPctLate: pct(openedLate[name], lateTotal),
        closed: closed[name],
        closedPct: pct(closed[name], total),
        endedWithQuestion: hanging[name]
      }))
    };
  }

  // ── 04 · PREGUNTAS SIN RESPONDER ──
  function analyzeQuestions(sorted, stats, turns) {
    const names = [stats.personA, stats.personB];
    const asked = { [names[0]]: 0, [names[1]]: 0 };
    const unanswered = { [names[0]]: 0, [names[1]]: 0 };
    const unansweredEarly = { [names[0]]: 0, [names[1]]: 0 };
    const askedEarly = { [names[0]]: 0, [names[1]]: 0 };
    const halves = splitHalves(sorted);
    const lastTs = sorted.length ? sorted[sorted.length - 1].timestamp.getTime() : 0;

    for (const t of turns) {
      if (!t.messages.some(m => isQuestion(m.text))) continue;
      // Una pregunta hecha en las últimas 12 h del chat todavía no ha podido
      // responderse: no se cuenta ni a favor ni en contra.
      if (lastTs - t.end.getTime() < ANSWER_WINDOW_MIN * MIN && t.replyMin === null) continue;
      const early = t.start.getTime() < halves.mid;
      asked[t.sender]++;
      if (early) askedEarly[t.sender]++;
      const answered = t.replyMin !== null && t.replyMin <= ANSWER_WINDOW_MIN;
      if (!answered) {
        unanswered[t.sender]++;
        if (early) unansweredEarly[t.sender]++;
      }
    }

    return {
      windowHours: ANSWER_WINDOW_MIN / 60,
      people: names.map((name, i) => {
        const other = names[1 - i];
        const lateAsked = asked[name] - askedEarly[name];
        const lateUnanswered = unanswered[name] - unansweredEarly[name];
        return {
          name,
          asked: asked[name],
          unanswered: unanswered[name],
          unansweredPct: pct(unanswered[name], asked[name]),
          unansweredPctEarly: pct(unansweredEarly[name], askedEarly[name]),
          unansweredPctLate: pct(lateUnanswered, lateAsked),
          // Visto desde quien recibe: de las preguntas de la otra persona,
          // cuántas contestó a tiempo.
          answeredOfReceived: asked[other] - unanswered[other],
          received: asked[other],
          answeredPct: asked[other] ? 100 - pct(unanswered[other], asked[other]) : null
        };
      })
    };
  }

  function bandOf(date) {
    const h = date.getHours();
    for (const b of BANDS) if (h >= b.from && h < b.to) return b.key;
    return 'noche';
  }

  // ── 05 · RITMOS ──
  function analyzeRhythms(sorted, stats, turns) {
    const names = [stats.personA, stats.personB];
    const people = {};
    names.forEach(n => {
      people[n] = {
        replies: [],
        byBand: Object.fromEntries(BANDS.map(b => [b.key, []])),
        byWeekday: WEEKDAYS.map(() => []),
        msgsByBand: Object.fromEntries(BANDS.map(b => [b.key, 0])),
        msgsByWeekday: WEEKDAYS.map(() => 0),
        lateNight: 0,
        total: 0,
        halves: [[], []]
      };
    });
    const halves = splitHalves(sorted);

    for (const m of sorted) {
      const p = people[m.sender];
      p.total++;
      p.msgsByBand[bandOf(m.timestamp)]++;
      p.msgsByWeekday[m.timestamp.getDay()]++;
      const h = m.timestamp.getHours();
      if (h >= 22 || h < 6) p.lateNight++;
    }

    // El tiempo de respuesta se agrupa por la hora a la que llegó el mensaje:
    // «cuando te escriben por la tarde, tardas tanto».
    for (const t of turns) {
      if (t.replyMin === null || t.replyMin <= 0 || t.replyMin >= REPLY_MAX_MIN) continue;
      const p = people[t.repliedBy];
      p.replies.push(t.replyMin);
      p.byBand[bandOf(t.end)].push(t.replyMin);
      p.byWeekday[t.end.getDay()].push(t.replyMin);
      p.halves[t.end.getTime() < halves.mid ? 0 : 1].push(t.replyMin);
    }

    const MIN_SAMPLE = 8;
    const out = names.map(name => {
      const p = people[name];
      const byBand = BANDS.map(b => ({
        key: b.key, label: b.label, range: b.range,
        medianMin: p.byBand[b.key].length >= MIN_SAMPLE ? round(median(p.byBand[b.key]), 1) : null,
        replies: p.byBand[b.key].length,
        messages: p.msgsByBand[b.key],
        messagesPct: pct(p.msgsByBand[b.key], p.total)
      }));
      const byWeekday = WEEKDAYS.map((label, d) => ({
        day: d, label,
        medianMin: p.byWeekday[d].length >= MIN_SAMPLE ? round(median(p.byWeekday[d]), 1) : null,
        replies: p.byWeekday[d].length,
        messages: p.msgsByWeekday[d]
      }));
      const ranked = byBand.filter(b => b.medianMin !== null).sort((a, b) => a.medianMin - b.medianMin);
      const rankedDays = byWeekday.filter(d => d.medianMin !== null).sort((a, b) => a.medianMin - b.medianMin);
      const early = median(p.halves[0]);
      const late = median(p.halves[1]);
      return {
        name,
        medianMin: p.replies.length ? round(median(p.replies), 1) : null,
        medianMinEarly: early !== null ? round(early, 1) : null,
        medianMinLate: late !== null ? round(late, 1) : null,
        replies: p.replies.length,
        byBand,
        byWeekday,
        fastestBand: ranked[0] || null,
        slowestBand: ranked.length > 1 ? ranked[ranked.length - 1] : null,
        fastestDay: rankedDays[0] || null,
        slowestDay: rankedDays.length > 1 ? rankedDays[rankedDays.length - 1] : null,
        lateNightPct: pct(p.lateNight, p.total)
      };
    });

    return { bands: BANDS.map(b => ({ key: b.key, label: b.label, range: b.range })), people: out };
  }

  // ── 10 · LOS TEMAS ──
  // Para cada tema se compara cómo responde cada persona cuando sale ese tema
  // con cómo responde ella misma al resto de la conversación. Así un tema no
  // parece «evitado» solo porque alguien sea lento en general.
  function analyzeTopics(sorted, stats, turns, topics) {
    topics = topics || root.YLSKeywords || {};
    const names = [stats.personA, stats.personB];
    const matchers = Object.entries(topics).map(([key, t]) => ({ key, label: t.label, re: phraseRegex(t.words) }));
    const empty = () => ({ [names[0]]: [], [names[1]]: [] });
    const zero = () => ({ [names[0]]: 0, [names[1]]: 0 });
    // Dos líneas base por persona: cuánto tarda en contestar al resto de la
    // conversación, y cuántas preguntas sin tema deja sin responder. Las
    // preguntas se comparan con preguntas: una afirmación casi siempre recibe
    // algo de vuelta y abarataría la comparación.
    const base = { replies: empty(), qReceived: zero(), qMissed: zero() };
    const acc = {};
    matchers.forEach(t => {
      acc[t.key] = { turns: 0, raisedBy: zero(), replies: empty(), received: zero(), qReceived: zero(), qMissed: zero() };
    });

    for (const t of turns) {
      const responder = t.sender === names[0] ? names[1] : names[0];
      const text = normalize(t.messages.map(m => m.text).join(' \n '));
      const hit = matchers.filter(mt => mt.re.test(text));
      const replied = t.replyMin !== null && t.replyMin > 0 && t.replyMin < REPLY_MAX_MIN;
      const asks = t.messages.some(m => isQuestion(m.text));
      const answered = t.replyMin !== null && t.replyMin <= ANSWER_WINDOW_MIN;
      const buckets = hit.length ? hit.map(mt => acc[mt.key]) : [base];
      buckets.forEach(a => {
        if (a !== base) { a.turns++; a.raisedBy[t.sender]++; a.received[responder]++; }
        if (replied) a.replies[responder].push(t.replyMin);
        if (asks) {
          a.qReceived[responder]++;
          if (!answered) a.qMissed[responder]++;
        }
      });
    }

    const baseline = names.map(n => ({
      name: n,
      medianMin: base.replies[n].length ? round(median(base.replies[n]), 1) : null,
      noReplyPct: pct(base.qMissed[n], base.qReceived[n])
    }));
    const MIN_REPLIES = 4;

    const list = matchers.map(mt => {
      const a = acc[mt.key];
      const all = a.replies[names[0]].concat(a.replies[names[1]]);
      const responders = names.map((n, i) => {
        const med = a.replies[n].length >= MIN_REPLIES ? median(a.replies[n]) : null;
        const ratio = med !== null && baseline[i].medianMin ? round(med / baseline[i].medianMin, 1) : null;
        const noReplyPct = pct(a.qMissed[n], a.qReceived[n]);
        // «Se evita» si, con datos suficientes, esa persona tarda al menos el
        // doble que de costumbre o deja sin respuesta el doble de preguntas.
        const avoided = a.received[n] >= 5 && (
          (ratio !== null && ratio >= 2) ||
          (a.qReceived[n] >= 5 && noReplyPct >= 25 && noReplyPct >= baseline[i].noReplyPct * 2)
        );
        return { name: n, medianMin: med !== null ? round(med, 1) : null, count: a.replies[n].length,
          received: a.received[n], ratio, noReplyPct, avoided };
      });
      const ratios = responders.map(r => r.ratio).filter(r => r !== null);
      return {
        key: mt.key,
        label: mt.label,
        mentions: a.turns,
        raisedBy: names.map(n => ({ name: n, count: a.raisedBy[n] })),
        medianMin: all.length ? round(median(all), 1) : null,
        ratio: ratios.length ? Math.max(...ratios) : null,
        responders,
        enoughData: a.turns >= 5,
        avoided: responders.some(r => r.avoided),
        avoidedBy: responders.filter(r => r.avoided).map(r => r.name)
      };
    });

    return { baseline, topics: list };
  }

  // ── 07 · CALIDEZ POR PERSONA ──
  function analyzeWarmth(sorted, stats) {
    const names = [stats.personA, stats.personB];
    const acc = {};
    names.forEach(n => { acc[n] = { msgs: 0, emojis: 0, words: 0, early: [0, 0], late: [0, 0] }; });
    const halves = splitHalves(sorted);
    for (const m of sorted) {
      if (isMedia(m.text) || isDeleted(m.text)) continue;
      const a = acc[m.sender];
      const e = (m.text.match(LOVE_EMOJI_RE) || []).length;
      const w = countMatches(WARM_RE, normalize(m.text));
      a.msgs++;
      a.emojis += e;
      a.words += w;
      const bucket = m.timestamp.getTime() < halves.mid ? a.early : a.late;
      bucket[0]++;
      bucket[1] += e + w;
    }
    return {
      people: names.map(n => {
        const a = acc[n];
        const per100 = a.msgs ? (a.emojis + a.words) / a.msgs * 100 : 0;
        return {
          name: n,
          loveEmojis: a.emojis,
          warmWords: a.words,
          per100: round(per100, 1),
          per100Early: a.early[0] ? round(a.early[1] / a.early[0] * 100, 1) : 0,
          per100Late: a.late[0] ? round(a.late[1] / a.late[0] * 100, 1) : 0
        };
      })
    };
  }

  // ── Constancia: semanas en las que cada persona escribió algo ──
  function analyzeConstancy(sorted, stats) {
    const names = [stats.personA, stats.personB];
    if (!sorted.length) return { totalWeeks: 0, people: names.map(n => ({ name: n, activeWeeks: 0, pct: 0 })) };
    const first = sorted[0].timestamp.getTime();
    const last = sorted[sorted.length - 1].timestamp.getTime();
    const totalWeeks = Math.max(1, Math.ceil((last - first + 1) / (7 * DAY)));
    const weeks = { [names[0]]: new Set(), [names[1]]: new Set() };
    for (const m of sorted) weeks[m.sender].add(Math.floor((m.timestamp.getTime() - first) / (7 * DAY)));
    return {
      totalWeeks,
      people: names.map(n => ({ name: n, activeWeeks: weeks[n].size, pct: pct(weeks[n].size, totalWeeks) }))
    };
  }

  // Interpolación por tramos sobre escala logarítmica: 5 min vale 95, una
  // hora 58, un día 8.
  const RHYTHM_CURVE = [[1, 100], [5, 95], [15, 85], [30, 72], [60, 58], [180, 38], [480, 20], [1440, 8], [2880, 3]];
  function rhythmScore(minutes) {
    if (minutes === null) return null;
    if (minutes <= RHYTHM_CURVE[0][0]) return 100;
    for (let i = 1; i < RHYTHM_CURVE.length; i++) {
      const [x1, y1] = RHYTHM_CURVE[i - 1];
      const [x2, y2] = RHYTHM_CURVE[i];
      if (minutes <= x2) {
        const t = (Math.log(minutes) - Math.log(x1)) / (Math.log(x2) - Math.log(x1));
        return Math.round(y1 + (y2 - y1) * t);
      }
    }
    return 3;
  }

  const AXES = [
    { key: 'iniciativa', label: 'Iniciativa', desc: 'Cuántas conversaciones abre. Abrir la mitad cuenta como 100.' },
    { key: 'ritmo', label: 'Ritmo de respuesta', desc: 'Cuánto tarda en contestar, en mediana.' },
    { key: 'calidez', label: 'Calidez', desc: 'Palabras y emojis de afecto por cada 100 mensajes.' },
    { key: 'constancia', label: 'Constancia', desc: 'Semanas del periodo en las que escribió algo.' },
    { key: 'atencion', label: 'Atención', desc: 'Preguntas de la otra persona que contestó en menos de 12 horas.' }
  ];

  // ── 02 · LOS DOS, EN NÚMEROS ──
  function individualScores(parts) {
    const { conversations, rhythms, warmth, constancy, questions } = parts;
    return {
      axes: AXES,
      people: conversations.people.map((c, i) => {
        const r = rhythms.people[i];
        const w = warmth.people[i];
        const k = constancy.people[i];
        const q = questions.people[i];
        const scores = {
          iniciativa: Math.round(Math.min(1, (c.openedPct / 100) / 0.5) * 100),
          ritmo: rhythmScore(r.medianMin),
          calidez: Math.round(100 * (1 - Math.exp(-w.per100 / 4))),
          constancia: k.pct,
          // Con menos de 5 preguntas recibidas el dato no dice nada.
          atencion: q.received >= 5 ? q.answeredPct : null
        };
        return {
          name: c.name,
          scores,
          raw: {
            openedPct: c.openedPct,
            medianReplyMin: r.medianMin,
            warmthPer100: w.per100,
            activeWeeksPct: k.pct,
            answeredPct: q.answeredPct,
            questionsReceived: q.received
          }
        };
      })
    };
  }

  // ── 09 · EDITADOS ──
  function analyzeEdited(sorted, stats) {
    const names = [stats.personA, stats.personB];
    const perPerson = { [names[0]]: 0, [names[1]]: 0 };
    let total = 0;
    for (const m of sorted) {
      if (EDITED_RE.test(m.text)) { perPerson[m.sender]++; total++; }
    }
    // Si no aparece ni una marca lo más probable es que el export no las
    // incluya, no que nadie haya editado nada. El informe lo dice así.
    return { supported: total > 0, total, people: names.map(n => ({ name: n, count: perPerson[n] })) };
  }

  // ── 03 · MOMENTOS DE CAMBIO EN LA LÍNEA DE VIDA ──
  function findTurningPoints(timeline) {
    const data = (timeline && timeline.data) || [];
    const labels = (timeline && timeline.labelsLong) || [];
    const candidates = [];
    // El último mes del export casi siempre está a medias: no se marca.
    const last = data.length > 3 ? data.length - 1 : data.length;
    for (let i = 2; i < last; i++) {
      const prev = data.slice(Math.max(0, i - 3), i);
      const avg = prev.reduce((s, v) => s + v, 0) / prev.length;
      if (avg < 30) continue;
      const rel = (data[i] - avg) / avg;
      if (Math.abs(rel) >= 0.35) candidates.push({ index: i, rel });
    }
    candidates.sort((a, b) => Math.abs(b.rel) - Math.abs(a.rel));
    const chosen = [];
    for (const c of candidates) {
      if (chosen.length >= 3) break;
      if (chosen.some(x => Math.abs(x.index - c.index) < 2)) continue;
      chosen.push(c);
    }
    chosen.sort((a, b) => a.index - b.index);
    return chosen.map(c => {
      const p = Math.round(Math.abs(c.rel) * 100);
      // «Agosto 2025» → «agosto de 2025».
      const month = (labels[c.index] || '').toLowerCase().replace(/ (\d{4})$/, ' de $1');
      const up = c.rel > 0;
      return {
        index: c.index,
        label: labels[c.index] || '',
        month,
        direction: up ? 'up' : 'down',
        pct: p,
        sentence: up
          ? 'En ' + month + ' la conversación creció un ' + p + '% respecto a los meses anteriores.'
          : 'En ' + month + ' la conversación bajó un ' + p + '% respecto a los meses anteriores.'
      };
    });
  }

  // ── 12 · RITUALES QUE YA EXISTEN ──
  function analyzeRituals(sorted, stats) {
    const names = [stats.personA, stats.personB];
    if (!sorted.length) return { rituals: [] };
    const first = sorted[0].timestamp.getTime();
    const last = sorted[sorted.length - 1].timestamp.getTime();
    const third = (last - first) / 3;
    const activeDays = [new Set(), new Set(), new Set()];
    const acc = RITUALS.map(() => ({ days: [new Set(), new Set(), new Set()], all: new Set(), by: { [names[0]]: 0, [names[1]]: 0 } }));

    for (const m of sorted) {
      const seg = third ? Math.min(2, Math.floor((m.timestamp.getTime() - first) / third)) : 0;
      const dk = dayKey(m.timestamp);
      activeDays[seg].add(dk);
      RITUALS.forEach((r, i) => {
        if (r.re.test(m.text)) {
          acc[i].days[seg].add(dk);
          acc[i].all.add(dk);
          acc[i].by[m.sender]++;
        }
      });
    }
    const allActive = new Set([...activeDays[0], ...activeDays[1], ...activeDays[2]]).size;

    return {
      rituals: RITUALS.map((r, i) => {
        const a = acc[i];
        const earlyPct = pct(a.days[0].size, activeDays[0].size);
        const latePct = pct(a.days[2].size, activeDays[2].size);
        const daysPct = pct(a.all.size, allActive);
        let trend = 'se mantiene';
        if (earlyPct >= 10 && latePct < earlyPct * 0.5) trend = 'se ha perdido';
        else if (latePct > earlyPct * 1.5 && latePct >= 10) trend = 'crece';
        else if (latePct < earlyPct * 0.8) trend = 'baja';
        return {
          key: r.key, label: r.label,
          daysPct, earlyPct, latePct, trend,
          present: daysPct >= 10,
          by: names.map(n => ({ name: n, count: a.by[n] }))
        };
      })
    };
  }

  // ── 06 · MAPA DE DÍAS SIN MENSAJES ──
  function analyzeActivity(sorted) {
    if (!sorted.length) return null;
    const counts = {};
    for (const m of sorted) {
      const k = dayKey(m.timestamp);
      counts[k] = (counts[k] || 0) + 1;
    }
    const start = new Date(sorted[0].timestamp); start.setHours(0, 0, 0, 0);
    const end = new Date(sorted[sorted.length - 1].timestamp); end.setHours(0, 0, 0, 0);
    const months = {};
    const days = [];
    let longestActive = 0, run = 0, silentDays = 0;
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const k = dayKey(d);
      const n = counts[k] || 0;
      days.push({ date: k, weekday: d.getDay(), n });
      const mk = monthKey(d);
      if (!months[mk]) months[mk] = { key: mk, label: monthLabel(mk), days: 0, silent: 0 };
      months[mk].days++;
      if (n === 0) { months[mk].silent++; silentDays++; run = 0; }
      else { run++; longestActive = Math.max(longestActive, run); }
    }
    return {
      totalDays: days.length,
      activeDays: days.length - silentDays,
      silentDays,
      silentPct: pct(silentDays, days.length),
      longestActiveStreak: longestActive,
      months: Object.values(months),
      days
    };
  }

  // ── 16 · ¿LA CONVERSACIÓN TERMINÓ? ──
  function analyzeEnding(sorted, timeline, now) {
    if (!sorted.length) return { endsInSilence: false };
    now = now ? new Date(now) : new Date();
    const lastTs = sorted[sorted.length - 1].timestamp;
    const daysSinceLast = Math.max(0, Math.floor((now - lastTs) / DAY));
    const data = (timeline && timeline.data) || [];
    // El último mes del export suele estar a medias, así que se comparan los
    // dos anteriores con el mes de más actividad.
    let fadeRatio = null;
    if (data.length >= 6) {
      const peak = Math.max(...data);
      const recent = data.slice(-3, -1).reduce((s, v) => s + v, 0) / 2;
      fadeRatio = peak ? round(recent / peak, 2) : null;
    }
    const endsInSilence = daysSinceLast >= 30 || (fadeRatio !== null && fadeRatio < 0.1);
    return { daysSinceLast, fadeRatio, endsInSilence, lastDate: lastTs };
  }

  /*
   * El informe completo en datos. Es lo que consumen la guía (Fase 4) y el
   * PDF (Fase 5). `now` se puede fijar para los tests.
   */
  function buildReportData(messages, stats, opts) {
    opts = opts || {};
    const sorted = sortMessages(messages, stats);
    const turns = toTurns(sorted);
    const own = messages.filter(m => m.sender === stats.personA || m.sender === stats.personB);

    const timeline = analyzeRelationshipTimeline(own);
    const conversations = analyzeConversations(sorted, stats, turns);
    const questions = analyzeQuestions(sorted, stats, turns);
    const rhythms = analyzeRhythms(sorted, stats, turns);
    const warmth = analyzeWarmth(sorted, stats);
    const constancy = analyzeConstancy(sorted, stats);

    // Los mismos cinco ejes, solo con los últimos 90 días. En una relación
    // larga el promedio de todo el periodo esconde cómo está ahora.
    let recent = null;
    if (sorted.length) {
      const lastMs = sorted[sorted.length - 1].timestamp.getTime();
      const spanDays = (lastMs - sorted[0].timestamp.getTime()) / DAY;
      if (spanDays >= 180) {
        const rs = sorted.filter(m => lastMs - m.timestamp.getTime() <= 90 * DAY);
        const rt = toTurns(rs);
        if (rs.length >= 50) {
          recent = individualScores({
            conversations: analyzeConversations(rs, stats, rt),
            rhythms: analyzeRhythms(rs, stats, rt),
            warmth: analyzeWarmth(rs, stats),
            constancy: analyzeConstancy(rs, stats),
            questions: analyzeQuestions(rs, stats, rt)
          });
          recent.windowDays = 90;
        }
      }
    }

    // El score de los últimos 90 días, con el mismo analyzeMessages y los
    // mismos umbrales. El del periodo completo promedia años de chat y puede
    // seguir alto en una conversación que ya se apagó.
    let recentStats = null;
    if (sorted.length) {
      const lastMs = sorted[sorted.length - 1].timestamp.getTime();
      if ((lastMs - sorted[0].timestamp.getTime()) / DAY >= 180) {
        const recentMsgs = own.filter(m => {
          try { return lastMs - parseMessageDate(m.date, m.time, m.ampm).getTime() <= 90 * DAY; }
          catch (e) { return false; }
        });
        const rs = recentMsgs.length >= 50 ? analyzeMessages(recentMsgs) : null;
        if (rs && rs.personA && [stats.personA, stats.personB].indexOf(rs.personA) !== -1) {
          recentStats = { score: rs.score, total: rs.total, avgReplyFormatted: rs.avgReplyFormatted, factors: rs.factors, windowDays: 90 };
        }
      }
    }

    return {
      stats,
      recentStats,
      timeline,
      turningPoints: findTurningPoints(timeline),
      conversations,
      questions,
      rhythms,
      warmth,
      constancy,
      individual: individualScores({ conversations, rhythms, warmth, constancy, questions }),
      individualRecent: recent,
      topics: analyzeTopics(sorted, stats, turns, opts.topics),
      silences: analyzeSilences(own),
      activity: analyzeActivity(sorted),
      doubleText: analyzeDoubleTexting(own),
      multimedia: analyzeMultimedia(own),
      deleted: analyzeDeletedMessages(own),
      edited: analyzeEdited(sorted, stats),
      beforeNow: analyzeBeforeVsNow(sorted, stats),
      selectiveGhosting: analyzeSelectiveGhosting(sorted, stats),
      language: analyzeLanguageChanges(sorted, stats),
      rituals: analyzeRituals(sorted, stats),
      ending: analyzeEnding(sorted, timeline, opts.now)
    };
  }

  root.YLSMetrics = {
    BANDS, WEEKDAYS, AXES,
    normalize, phraseRegex, formatMinutes, rhythmScore,
    sortMessages, toTurns,
    analyzeConversations, analyzeQuestions, analyzeRhythms, analyzeTopics,
    analyzeWarmth, analyzeConstancy, individualScores, analyzeEdited,
    findTurningPoints, analyzeRituals, analyzeActivity, analyzeEnding,
    buildReportData
  };
})(typeof window !== 'undefined' ? window : globalThis);
