/*
 * report-model.js — el modelo del informe de pareja.
 *
 * Solo lógica pura: el índice de secciones y las funciones que convierten las
 * estadísticas en las frases de «En una página». Sin DOM, para poder probarlo.
 * El pintado vive en index.html (renderReport / renderReportIndex).
 */
(function (root) {
  'use strict';

  // El índice del informe. Es la única fuente de verdad de qué contiene cada
  // sección, y la Fase 5 construirá el PDF a partir de esta misma lista.
  const REPORT_SECTIONS = [
    { part: 'Parte A · Cómo va tu relación' },
    { n: '01', free: true, title: 'En una página',
      desc: 'El score explicado en palabras, tres cosas que van bien y tres que merecen atención.' },
    { n: '02', title: 'Los dos, en números',
      desc: 'Iniciativa, ritmo de respuesta, calidez, constancia y atención, persona a persona.' },
    { n: '03', title: 'La línea de vida',
      desc: 'Mensajes mes a mes, con los momentos en que algo cambió y qué pasaba alrededor.' },
    { n: '04', title: 'Cómo empiezan y cómo terminan las conversaciones',
      desc: 'Quién abre, quién cierra y qué preguntas se quedaron sin responder.' },
    { n: '05', title: 'Ritmos',
      desc: 'Cuánto tardan en contestarse según la hora y el día. Cuándo estás más presente y cuándo no.' },
    { n: '06', title: 'Silencios',
      desc: 'Los días sin mensajes, el silencio más largo y quién suele romperlo.' },
    { n: '07', title: 'Cómo se hablan',
      desc: 'Apodos, emojis y longitud de los mensajes: antes y ahora.' },
    { n: '08', title: 'Lo que se comparte',
      desc: 'Fotos, audios, stickers y ubicaciones, y el equilibrio entre los dos.' },
    { n: '09', title: 'Lo que desaparece',
      desc: 'Mensajes eliminados, con contexto y sin acusaciones.' },
    { n: '10', title: 'Los temas',
      desc: 'Cuánto se tarda en responder según de qué se hable: planes, futuro, familia, dinero, trabajo.' },
    { part: 'Parte B · Tu guía' },
    { n: '11', title: 'Qué significa lo que has visto',
      desc: 'Una página por patrón: qué suele significar, qué no significa, cuándo es normal y cuándo preocupa.' },
    { n: '12', title: 'Lo que sí va bien y cómo protegerlo',
      desc: 'Los rituales que ya existen en el chat y cómo no perderlos.' },
    { n: '13', title: 'Conversaciones que merece la pena tener',
      desc: 'Tres a cinco, con por qué, cuándo, cómo abrirlas y qué escuchar.' },
    { n: '14', title: 'Un plan de 30 días',
      desc: 'Cuatro semanas, dos o tres acciones pequeñas por semana, con sitio para anotar.' },
    { n: '15', title: 'Cómo cuidar la relación a partir de ahora',
      desc: 'Pedir lo que necesitas, poner límites y reparar después de una discusión.' },
    { n: '16', title: 'Cuándo hablar con alguien',
      desc: 'Señales para buscar ayuda profesional y líneas de apoyo en México y España.' },
    { n: '17', title: 'Tu informe en 10 frases',
      desc: 'El resumen, para releer dentro de un mes.' }
  ];

  // Solo aparece si el score es bajo o el chat terminó en silencio. Se
  // inserta detrás de «Cómo cuidar la relación» y renumera lo que sigue.
  const ENDING_SECTION = {
    title: 'Si estás pensando en terminar, o ya terminó',
    desc: 'Cómo leer este informe sin castigarte, qué patrones son tuyos y qué aprender de ellos.'
  };

  function buildIndex(opts) {
    opts = opts || {};
    const out = [];
    let n = 0;
    REPORT_SECTIONS.forEach(item => {
      if (item.part) { out.push(item); return; }
      n++;
      out.push(Object.assign({}, item, { n: String(n).padStart(2, '0') }));
      if (opts.ending && item.n === '15') {
        n++;
        out.push(Object.assign({}, ENDING_SECTION, { n: String(n).padStart(2, '0'), conditional: true }));
      }
    });
    return out;
  }

  function firstName(name) {
    return String(name || '').trim().split(/\s+/)[0] || 'Persona';
  }

  function formatReportDate(d) {
    if (!d) return null;
    return new Date(d).toLocaleDateString('es-MX', { month: 'short', year: 'numeric' }).replace('.', '');
  }

  // El score, en palabras y sin dramatizar.
  function scoreInWords(score) {
    if (score >= 85) return 'Una relación sólida en los mensajes: constante, equilibrada y con afecto a la vista.';
    if (score >= 70) return 'Va bien. Hay constancia y equilibrio, con algún punto que conviene mirar.';
    if (score >= 55) return 'Funciona, pero hay señales de desgaste que merece la pena atender ahora.';
    if (score >= 40) return 'La conversación se ha enfriado. Los datos muestran menos ritmo y más distancia que antes.';
    if (score >= 25) return 'Hay poco de lo que sostiene una conversación viva: poca constancia y silencios largos.';
    return 'Los mensajes muestran una conversación casi apagada. Merece una lectura con calma.';
  }

  /*
   * Convierte los seis factores del score en frases con números concretos.
   * Devuelve las tres mejores y las tres que más piden atención.
   */
  function buildOnePage(s) {
    const f = s.factors || {};
    const leaderShort = firstName(s.leader);
    const other = s.leader === s.personA ? s.personB : s.personA;
    const otherShort = firstName(other);
    const ratio = (x) => (x && x.max) ? x.score / x.max : 0;

    const candidates = [
      { key: 'balance', strength: ratio(f.balance),
        good: `El reparto es ${s.leaderPct}/${100 - s.leaderPct}: los dos sostienen la conversación.`,
        watch: `${leaderShort} escribe el ${s.leaderPct}% de los mensajes y ${otherShort} el ${100 - s.leaderPct}%.` },
      { key: 'consistency', strength: ratio(f.consistency),
        good: `Hay mensajes en la mayoría de las semanas del periodo, sin temporadas en blanco.`,
        watch: `Hay semanas enteras sin mensajes: la conversación va a rachas.` },
      { key: 'response', strength: ratio(f.response),
        good: `Se responden en ${s.avgReplyFormatted} de media.`,
        watch: `La respuesta media es de ${s.avgReplyFormatted}.` },
      { key: 'affection', strength: ratio(f.affection),
        good: `${s.loveCount.toLocaleString('es-MX')} emojis de afecto en ${s.total.toLocaleString('es-MX')} mensajes.`,
        watch: `Solo ${s.loveCount.toLocaleString('es-MX')} emojis de afecto en ${s.total.toLocaleString('es-MX')} mensajes.` },
      { key: 'silences', strength: f.silences ? 1 + (f.silences.score / 15) : 1,
        good: `Casi no hay silencios: ${s.silencesCount} pausas de más de 48 horas en todo el periodo.`,
        watch: `${s.silencesCount} silencios de más de 48 horas.` },
      { key: 'double', strength: f.doubleTexting ? 1 + (f.doubleTexting.score / 10) : 1,
        good: `Nadie se queda hablando solo: las rachas de mensajes sin respuesta son anecdóticas.`,
        watch: `${s.totalDouble} rachas de cinco o más mensajes seguidos sin respuesta.` },
      { key: 'night', strength: s.nightPct >= 25 ? 0.2 : 0.75,
        good: `La conversación ocurre a horas normales: solo el ${s.nightPct}% es de madrugada.`,
        watch: `El ${s.nightPct}% de los mensajes son de madrugada.` }
    ];

    const sorted = [...candidates].sort((a, b) => b.strength - a.strength);
    const good = sorted.filter(c => c.strength >= 0.6).slice(0, 3).map(c => c.good);
    const watch = [...sorted].reverse().filter(c => c.strength < 0.6).slice(0, 3).map(c => c.watch);

    // Si nada llega al listón pero hay algo razonable, se dice lo mejor que
    // haya en lugar de dejar la columna vacía: callarse también es dramatizar.
    // Por debajo de ese mínimo no se felicita a nadie.
    if (good.length === 0 && sorted.length && sorted[0].strength >= 0.45) {
      good.push(sorted[0].good);
    }

    return { good, watch };
  }

  root.YLSReport = {
    REPORT_SECTIONS: REPORT_SECTIONS,
    buildIndex: buildIndex,
    firstName: firstName,
    formatReportDate: formatReportDate,
    scoreInWords: scoreInWords,
    buildOnePage: buildOnePage
  };
})(typeof window !== 'undefined' ? window : globalThis);
