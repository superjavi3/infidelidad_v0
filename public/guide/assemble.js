/*
 * assemble.js — de los datos del chat a la guía.
 *
 *   detect(report)          qué patrones se activan, con qué gravedad y
 *                           con qué números. Los umbrales viven aquí.
 *   assemble(report, opts)  la guía completa (secciones 11 a 17 del informe
 *                           y «Cómo leer este informe»), determinista.
 *   sanitizeAI(raw, ctx)    valida lo que devuelve la IA. Lo que no pasa se
 *                           descarta y se usa el bloque sin personalizar.
 *
 * `report` es la salida de YLSMetrics.buildReportData(). Nada de aquí hace
 * red ni toca el DOM.
 */
(function (root) {
  'use strict';

  const G = root.YLSGuideBlocks;

  function first(name) {
    return String(name || '').trim().split(/\s+/)[0] || 'Persona';
  }

  function fmtMin(minutes) {
    if (root.YLSMetrics) return root.YLSMetrics.formatMinutes(minutes);
    return Math.round(minutes) + ' min';
  }

  function fmtHours(hours) {
    if (hours < 48) return hours + ' horas';
    const days = Math.round(hours / 24);
    return days + ' días';
  }

  function num(n) {
    return Number(n || 0).toLocaleString('es-MX');
  }

  function byKey(list, key, value) {
    return (list || []).find(x => x[key] === value);
  }

  // Orden de desempate cuando dos patrones tienen la misma gravedad: primero
  // lo que más pesa en el día a día de una pareja.
  const PRIORITY = ['iniciativa', 'respuesta', 'preguntas', 'silencios', 'enfriamiento',
    'volumen', 'temas', 'doubleTexting', 'nocturna', 'multimedia', 'eliminados'];

  /* ─────────────────────────────────────────────────────────────
   * DETECCIÓN
   * Cada detector devuelve { concern?, healthy? }. concern lleva la
   * gravedad (1 a 3), la frase con los números del chat y, si hace falta,
   * notas que añaden párrafos al bloque.
   * ───────────────────────────────────────────────────────────── */
  const DETECTORS = {

    iniciativa(r) {
      const c = r.conversations;
      if (!c || c.openings < 20) return {};
      const [p, q] = [...c.people].sort((x, y) => y.openedPct - x.openedPct);
      const top = Math.max(p.openedPct, p.openedPctLate);
      const lead = first(p.name) + ' abre el ' + p.openedPct + '% de las conversaciones y ' +
        first(q.name) + ' el ' + q.openedPct + '%.' +
        (p.openedPctLate - p.openedPctEarly >= 10
          ? ' En la primera mitad del periodo era el ' + p.openedPctEarly + '%; en la segunda, el ' + p.openedPctLate + '%.'
          : '');
      if (p.openedPct >= 65 || p.openedPctLate >= 70) {
        return { concern: { severity: top >= 80 ? 3 : top >= 72 ? 2 : 1, lead } };
      }
      if (p.openedPct <= 62 && p.openedPctLate <= 62) return { healthy: { lead } };
      return {};
    },

    respuesta(r) {
      const people = (r.rhythms && r.rhythms.people || []).filter(p => p.medianMin !== null);
      if (people.length < 2) return {};
      const [slow, fast] = [...people].sort((x, y) => y.medianMin - x.medianMin);
      const ratio = fast.medianMin > 0 ? slow.medianMin / fast.medianMin : 1;
      const trend = people
        .filter(p => p.medianMinEarly !== null && p.medianMinLate !== null &&
          p.medianMinLate >= 30 && p.medianMinLate >= p.medianMinEarly * 3)
        .sort((x, y) => y.medianMinLate - x.medianMinLate)[0];
      let lead = first(slow.name) + ' tarda ' + fmtMin(slow.medianMin) + ' en contestar, en mediana, y ' +
        first(fast.name) + ' ' + fmtMin(fast.medianMin) + '.';
      if (trend) {
        lead += ' El ritmo de ' + first(trend.name) + ' ha cambiado: en la primera mitad del periodo contestaba en ' +
          fmtMin(trend.medianMinEarly) + ' y en la segunda en ' + fmtMin(trend.medianMinLate) + '.';
      }
      if ((ratio >= 3 && slow.medianMin >= 20) || trend) {
        const worst = trend ? trend.medianMinLate : slow.medianMin;
        const severity = worst >= 120 ? 3 : (worst >= 60 || ratio >= 5) ? 2 : 1;
        return { concern: { severity, lead, trend: !!trend } };
      }
      if (slow.medianMin <= 20 && ratio < 2) return { healthy: { lead } };
      return {};
    },

    doubleTexting(r) {
      const dt = r.doubleText || {};
      const names = [r.stats.personA, r.stats.personB];
      const counts = names.map(n => (dt[n] || []).length);
      const total = counts[0] + counts[1];
      if (total < 8) return {};
      const i = counts[0] >= counts[1] ? 0 : 1;
      const msgs = i === 0 ? r.stats.msgsA : r.stats.msgsB;
      const share = counts[i] / total;
      const rate = msgs ? counts[i] / msgs * 1000 : 0;
      if (share >= 0.7 && rate >= 4) {
        const lead = first(names[i]) + ' escribió ' + num(counts[i]) +
          ' veces cinco o más mensajes seguidos sin respuesta en medio; ' + first(names[1 - i]) + ', ' + num(counts[1 - i]) + '.';
        return { concern: { severity: share >= 0.85 && counts[i] >= 30 ? 3 : counts[i] >= 15 ? 2 : 1, lead } };
      }
      return {};
    },

    silencios(r) {
      const s = r.silences;
      const act = r.activity;
      if (!s || !act) return {};
      const months = Math.max(1, act.totalDays / 30);
      const rate6 = s.total / (months / 6);
      const longestH = s.longest ? s.longest.hours : 0;
      let lead = s.total
        ? 'Hubo ' + num(s.total) + (s.total === 1 ? ' silencio' : ' silencios') + ' de dos días o más; el más largo duró ' + fmtHours(longestH) + '.'
        : 'No hubo ni un solo silencio de dos días o más en todo el periodo.';
      const brokers = Object.entries(s.brokeCount || {}).sort((a, b) => b[1] - a[1]);
      if (s.total >= 4 && brokers.length && brokers[0][1] / s.total >= 0.7) {
        lead += ' ' + first(brokers[0][0]) + ' rompió ' + num(brokers[0][1]) + ' de ellos.';
      }
      if (rate6 > 3 || longestH >= 24 * 7) {
        const severity = (rate6 > 10 || longestH >= 24 * 21) ? 3 : (rate6 > 6 || longestH >= 24 * 10) ? 2 : 1;
        return { concern: { severity, lead } };
      }
      const consistency = r.stats.factors && r.stats.factors.consistency ? r.stats.factors.consistency.value : 0;
      if (rate6 <= 1 && consistency >= 0.85) return { healthy: { id: 'constancia', lead } };
      return {};
    },

    nocturna(r) {
      const people = (r.rhythms && r.rhythms.people) || [];
      if (people.length < 2) return {};
      const [p, q] = [...people].sort((x, y) => y.lateNightPct - x.lateNightPct);
      if (p.lateNightPct < 35) return {};
      const lead = 'El ' + p.lateNightPct + '% de los mensajes de ' + first(p.name) +
        ' se escribe entre las diez de la noche y las seis de la mañana' +
        (q.lateNightPct < p.lateNightPct - 10 ? '; en el caso de ' + first(q.name) + ', el ' + q.lateNightPct + '%.' : ', y en el de ' + first(q.name) + ' el ' + q.lateNightPct + '%.');
      return { concern: { severity: p.lateNightPct >= 70 ? 3 : p.lateNightPct >= 55 ? 2 : 1, lead } };
    },

    enfriamiento(r) {
      const w = r.warmth && r.warmth.people;
      if (!w || w.length < 2) return {};
      const avg = (k) => Math.round((w[0][k] + w[1][k]) / 2 * 10) / 10;
      const early = avg('per100Early');
      const late = avg('per100Late');
      const overall = avg('per100');
      const fmt = (v) => String(v).replace('.', ',');
      if (early >= 2 && late <= early * 0.5) {
        const lead = 'En la primera mitad del periodo había ' + fmt(early) +
          ' palabras o emojis de afecto por cada 100 mensajes; en la segunda, ' + fmt(late) + '.';
        const ratio = late / early;
        return { concern: { severity: ratio <= 0.25 ? 3 : ratio <= 0.4 ? 2 : 1, lead } };
      }
      if (overall < 1 && r.stats.total >= 500) {
        const lead = 'Hay ' + fmt(overall) + ' palabras o emojis de afecto por cada 100 mensajes: el cariño apenas aparece por escrito.';
        return { concern: { severity: 1, lead } };
      }
      if (late >= 3 && late >= early * 0.8) {
        return { healthy: { id: 'calidez', lead: 'Hay ' + fmt(late) + ' palabras o emojis de afecto por cada 100 mensajes en los últimos meses, al nivel del principio.' } };
      }
      return {};
    },

    volumen(r) {
      const data = (r.timeline && r.timeline.data) || [];
      // El último mes del export suele estar a medias.
      const full = data.length > 6 ? data.slice(0, -1) : data;
      if (full.length < 6) return {};
      const third = Math.max(2, Math.floor(full.length / 3));
      const mean = (arr) => arr.reduce((s, v) => s + v, 0) / arr.length;
      const a = mean(full.slice(0, third));
      const b = mean(full.slice(-third));
      if (a < 60 || b > a * 0.6) return {};
      const drops = (r.turningPoints || []).filter(t => t.direction === 'down')
        .map(t => t.month + ' (−' + t.pct + '%)');
      const lead = 'En los primeros meses se escribían unos ' + num(Math.round(a)) +
        ' mensajes al mes; en los últimos, unos ' + num(Math.round(b)) + '.' +
        (drops.length ? ' ' + (drops.length === 1 ? 'La caída más marcada fue en ' : 'Las caídas más marcadas fueron en ') +
          drops.join(drops.length === 2 ? ' y ' : ', ').replace(/, ([^,]*)$/, ' y $1') + ', respecto a los meses anteriores.' : '');
      const ratio = b / a;
      return { concern: { severity: ratio <= 0.25 ? 3 : ratio <= 0.4 ? 2 : 1, lead } };
    },

    preguntas(r) {
      const q = r.questions && r.questions.people;
      if (!q) return {};
      const flagged = q
        .filter(p => p.asked >= 20 && (p.unansweredPct >= 25 ||
          (p.unansweredPctLate >= 30 && p.unansweredPctLate >= p.unansweredPctEarly * 2)))
        .sort((x, y) => Math.max(y.unansweredPct, y.unansweredPctLate) - Math.max(x.unansweredPct, x.unansweredPctLate))[0];
      if (flagged) {
        let lead = 'De las ' + num(flagged.asked) + ' preguntas que hizo ' + first(flagged.name) + ', ' +
          num(flagged.unanswered) + ' se quedaron sin respuesta en doce horas: el ' + flagged.unansweredPct + '%.';
        if (flagged.unansweredPctLate - flagged.unansweredPctEarly >= 10) {
          lead += ' En la primera mitad del periodo era el ' + flagged.unansweredPctEarly + '%; en la segunda, el ' + flagged.unansweredPctLate + '%.';
        }
        const worst = Math.max(flagged.unansweredPct, flagged.unansweredPctLate);
        return { concern: { severity: worst >= 50 ? 3 : worst >= 35 ? 2 : 1, lead } };
      }
      if (q.every(p => p.asked >= 20 && p.unansweredPct <= 15)) {
        const answered = Math.round((q[0].answeredPct + q[1].answeredPct) / 2);
        return { healthy: { id: 'atencion', lead: 'El ' + answered + '% de las preguntas recibe respuesta en menos de doce horas.' } };
      }
      return {};
    },

    temas(r) {
      const t = r.topics;
      if (!t) return {};
      const avoided = t.topics.filter(x => x.avoided);
      if (avoided.length) {
        const parts = [];
        avoided.forEach(topic => {
          topic.responders.filter(x => x.avoided).forEach(resp => {
            const base = byKey(t.baseline, 'name', resp.name) || {};
            const slow = resp.ratio !== null && resp.ratio >= 2;
            parts.push('Cuando sale el tema «' + topic.label.toLowerCase() + '», ' + first(resp.name) +
              (slow
                ? ' tarda ' + fmtMin(resp.medianMin) + ' en contestar, frente a ' + fmtMin(base.medianMin) + ' en el resto de la conversación'
                : ' deja sin respuesta el ' + resp.noReplyPct + '% de las preguntas, frente al ' + (base.noReplyPct || 0) + '% de costumbre') +
              '.');
          });
        });
        const important = avoided.some(x => ['futuro', 'dinero', 'familia', 'ex'].indexOf(x.key) !== -1);
        return { concern: { severity: avoided.length >= 2 ? 3 : important ? 2 : 1, lead: parts.join(' '), topics: avoided.map(x => x.key) } };
      }
      if (t.topics.filter(x => x.enoughData).length >= 3) {
        return { healthy: { lead: 'Los tiempos de respuesta son parecidos hablen de lo que hablen.' } };
      }
      return {};
    },

    multimedia(r) {
      const mm = r.multimedia || {};
      const names = [r.stats.personA, r.stats.personB];
      const per = names.map(n => Object.values(mm).reduce((s, t) => s + ((t.perPerson || {})[n] || 0), 0));
      const total = per[0] + per[1];
      if (total < 40) return {};
      const i = per[0] >= per[1] ? 0 : 1;
      const share = Math.round(per[i] / total * 100);
      if (share < 75) return {};
      return { concern: { severity: 1, lead: first(names[i]) + ' compartió el ' + share + '% de las fotos, audios, stickers y ubicaciones del chat.' } };
    },

    eliminados(r) {
      const d = r.deleted;
      if (!d) return {};
      const names = [r.stats.personA, r.stats.personB];
      const counts = names.map(n => (d.deleted || {})[n] || 0);
      const msgs = [r.stats.msgsA, r.stats.msgsB];
      const i = counts[0] >= counts[1] ? 0 : 1;
      if (counts[i] < 10 || counts[i] / (msgs[i] || 1) < 0.005) return {};
      return {
        concern: {
          severity: 1,
          lead: first(names[i]) + ' eliminó ' + num(counts[i]) + ' mensajes después de enviarlos, y ' +
            first(names[1 - i]) + ' ' + num(counts[1 - i]) + '. No sabemos qué decían.'
        }
      };
    }
  };

  function detect(report) {
    const concerns = [];
    const healthy = [];
    // Lo que se miró y no preocupa: la sección 11 también lo cuenta, para
    // que quien lee sepa qué se ha revisado y por qué no aparece como aviso.
    const calm = [];
    for (const id of PRIORITY) {
      const out = DETECTORS[id](report) || {};
      if (out.concern) concerns.push(Object.assign({ id }, out.concern));
      else calm.push({ id, lead: (out.healthy && out.healthy.lead) || null });
      if (out.healthy) healthy.push(Object.assign({ id }, out.healthy, { id: out.healthy.id || id }));
    }
    concerns.sort((a, b) => b.severity - a.severity || PRIORITY.indexOf(a.id) - PRIORITY.indexOf(b.id));
    return { concerns, healthy, calm };
  }

  // «Si estás pensando en terminar» aparece si el score es bajo, en todo el periodo o en los
  // últimos 90 días, o si la conversación terminó en silencio.
  function includesEnding(report) {
    return report.stats.score < 40 ||
      !!(report.recentStats && report.recentStats.score < 40) ||
      !!(report.ending && report.ending.endsInSilence);
  }

  /* ─────────────────────────────────────────────────────────────
   * ENSAMBLADO
   * ───────────────────────────────────────────────────────────── */
  function buildMeaning(det, ai) {
    return det.concerns.map(c => {
      const block = G.CONCERNS[c.id];
      const significa = block.significa.slice();
      if (c.trend && block.noteTrend) significa.push(block.noteTrend);
      const aiIntro = ai && ai.patterns && ai.patterns[c.id] && ai.patterns[c.id].intro;
      return {
        id: c.id,
        title: block.title,
        severity: c.severity,
        lead: aiIntro || c.lead,
        personalized: !!aiIntro,
        significa,
        noSignifica: block.noSignifica,
        normal: block.normal,
        preocupa: block.preocupa,
        queHacer: block.queHacer
      };
    });
  }

  function buildCalm(det) {
    return det.calm.map(c => ({
      id: c.id,
      title: G.CONCERNS[c.id].title,
      lead: c.lead,
      text: G.CONCERNS[c.id].calm
    }));
  }

  function buildGoing(det, report) {
    const healthy = det.healthy
      .filter(h => G.HEALTHY[h.id])
      .map(h => Object.assign({ id: h.id, lead: h.lead }, G.HEALTHY[h.id]));
    const rituals = ((report.rituals && report.rituals.rituals) || [])
      .filter(r => r.present && G.RITUALS[r.key])
      .map(r => ({
        id: r.key,
        title: r.label,
        daysPct: r.daysPct,
        trend: r.trend,
        lead: 'Aparece en el ' + r.daysPct + '% de los días con mensajes' +
          (r.trend === 'se ha perdido' ? ', aunque en los últimos meses casi ha desaparecido.'
            : r.trend === 'baja' ? ', algo menos en los últimos meses.'
              : r.trend === 'crece' ? ', y cada vez más.' : '.'),
        text: G.RITUALS[r.key].text,
        proteger: G.RITUALS[r.key].proteger
      }));
    return { healthy, rituals, anticipate: det.concerns.length <= 2 ? G.ANTICIPATE : null };
  }

  function conversationFor(id) {
    if (G.CONCERNS[id] && G.CONCERNS[id].conversation) return Object.assign({ id }, G.CONCERNS[id].conversation);
    const g = G.GENERAL_CONVERSATIONS.find(x => x.id === id);
    return g ? Object.assign({}, g) : null;
  }

  function conversationCandidates(det) {
    const fromConcerns = det.concerns.filter(c => G.CONCERNS[c.id].conversation).map(c => c.id);
    return fromConcerns.concat(G.GENERAL_CONVERSATIONS.map(g => g.id));
  }

  function buildConversations(det, ai) {
    const candidates = conversationCandidates(det);
    const target = 5;
    let ids = candidates.slice(0, target);
    if (ai && Array.isArray(ai.conversations) && ai.conversations.length >= 3) {
      ids = ai.conversations.slice(0, 5);
    }
    return ids.map(conversationFor).filter(Boolean);
  }

  function buildPlan(det, ai) {
    if (ai && Array.isArray(ai.plan) && ai.plan.length === 4) {
      return ai.plan.map(w => ({ week: w.week, focus: w.focus, intro: G.PLAN_INTRO[w.week], actions: w.actions.slice(0, 3), personalized: true }));
    }
    const plan = [];
    for (let week = 1; week <= 4; week++) {
      const actions = [];
      for (const c of det.concerns) {
        if (actions.length >= 3) break;
        const a = (G.CONCERNS[c.id].actions || []).find(x => x.week === week);
        if (a) actions.push(a.text);
      }
      for (const g of G.GENERAL_ACTIONS) {
        if (actions.length >= 2) break;
        if (g.week === week && actions.indexOf(g.text) === -1) actions.push(g.text);
      }
      // La última semana siempre cierra comparando: es la promesa de la contraportada.
      if (week === 4) {
        const compare = G.GENERAL_ACTIONS.find(g => g.week === 4).text;
        if (actions.indexOf(compare) === -1) {
          if (actions.length >= 3) actions[2] = compare; else actions.push(compare);
        }
      }
      plan.push({ week, focus: G.PLAN_FOCUS[week], intro: G.PLAN_INTRO[week], actions });
    }
    return plan;
  }

  // «Tu informe en 10 frases»: el resumen para releer, siempre con datos.
  function tenPhrases(report, det, headline) {
    const s = report.stats;
    const A = first(s.personA), B = first(s.personB);
    const out = [];
    const recent = report.recentStats;
    out.push(headline || ('El score de su conversación es ' + s.score + ' de 100.'));
    if (recent && Math.abs(recent.score - s.score) >= 10) {
      out.push('En todo el periodo el score es ' + s.score + ' de 100; en los últimos tres meses, ' + recent.score + '.');
    }
    out.push('Son ' + num(s.total) + ' mensajes, con actividad en ' + num(s.uniqueDays) + ' días distintos.');
    const c = report.conversations;
    if (c && c.openings) {
      const [p, q] = [...c.people].sort((x, y) => y.openedPct - x.openedPct);
      const shifted = [...c.people].sort((x, y) => y.openedPctLate - x.openedPctLate)[0];
      if (shifted.openedPctLate >= 65 && shifted.openedPctLate - shifted.openedPctEarly >= 10) {
        out.push(first(shifted.name) + ' abre cada vez más conversaciones: el ' + shifted.openedPctEarly + '% al principio y el ' + shifted.openedPctLate + '% en la segunda mitad.');
      } else {
        out.push(p.openedPct >= 60
          ? first(p.name) + ' abre la mayoría de las conversaciones: el ' + p.openedPct + '%.'
          : 'Los dos abren las conversaciones en una proporción parecida: ' + p.openedPct + '% y ' + q.openedPct + '%.');
      }
    }
    const rp = (report.rhythms && report.rhythms.people || []).filter(p => p.medianMin !== null);
    if (rp.length === 2) {
      out.push(first(rp[0].name) + ' contesta en ' + fmtMin(rp[0].medianMin) + ' y ' + first(rp[1].name) + ' en ' + fmtMin(rp[1].medianMin) + ', en mediana.');
    }
    if (report.silences) {
      out.push(report.silences.total
        ? 'Hubo ' + num(report.silences.total) + ' silencios de dos días o más.'
        : 'No hubo ningún silencio de dos días o más.');
    }
    const w = report.warmth && report.warmth.people;
    if (w) {
      const early = (w[0].per100Early + w[1].per100Early) / 2;
      const late = (w[0].per100Late + w[1].per100Late) / 2;
      out.push(late < early * 0.6 ? 'El afecto escrito ha bajado respecto al principio.'
        : late > early * 1.2 ? 'El afecto escrito ha crecido respecto al principio.'
          : 'El afecto escrito se mantiene parecido al del principio.');
    }
    const goingWell = det.healthy[0];
    if (goingWell && G.HEALTHY[goingWell.id]) out.push('Lo que mejor funciona: ' + G.HEALTHY[goingWell.id].title.toLowerCase() + '.');
    det.concerns.slice(0, 2).forEach(cn => out.push('Merece atención: ' + G.CONCERNS[cn.id].title.toLowerCase() + '.'));
    if (out.length < 9) out.push('Los datos describen mensajes, no sentimientos: tú tienes el contexto que les falta.');
    if (out.length < 9) out.push('La conversación que más puede ayudar ahora está en la sección 13.');
    out.push('Vuelve a analizar el chat dentro de 30 días y compara.');
    while (out.length < 10) out.splice(out.length - 1, 0, 'Ninguna cifra de este informe decide por ti; te da algo concreto de lo que hablar.');
    return out.slice(0, 10);
  }

  function assemble(report, opts) {
    opts = opts || {};
    const ai = opts.ai || null;
    const det = detect(report);
    const headline = (ai && ai.headline) || opts.headline || null;
    const going = buildGoing(det, report);
    const guide = {
      names: { a: first(report.stats.personA), b: first(report.stats.personB) },
      headline,
      onePage: ai && ai.onePage ? ai.onePage : null,
      detection: det,
      howToRead: G.HOW_TO_READ,
      intros: G.SECTION_INTROS,
      meaning: buildMeaning(det, ai),
      calm: buildCalm(det),
      goingWell: going,
      conversations: buildConversations(det, ai),
      plan: buildPlan(det, ai),
      care: G.CARE,
      ending: includesEnding(report) ? G.ENDING : null,
      help: G.HELP,
      summary: tenPhrases(report, det, headline),
      personalized: !!ai
    };
    guide.wordCount = countWords(guide);
    return guide;
  }

  function countWords(guide) {
    let n = 0;
    const walk = (v, key) => {
      if (key === 'detection' || key === 'names' || key === 'id' || key === 'wordCount') return;
      if (typeof v === 'string') { n += v.split(/\s+/).filter(Boolean).length; return; }
      if (Array.isArray(v)) { v.forEach(x => walk(x)); return; }
      if (v && typeof v === 'object') Object.keys(v).forEach(k => walk(v[k], k));
    };
    Object.keys(guide).forEach(k => walk(guide[k], k));
    return n;
  }

  /* ─────────────────────────────────────────────────────────────
   * VALIDACIÓN DE LO QUE DEVUELVE LA IA
   * Todo lo que no cumple se tira campo a campo; la guía completa sigue
   * funcionando con los bloques sin personalizar.
   * ───────────────────────────────────────────────────────────── */
  const FORBIDDEN = [
    /t[oó]xic/i, /narcis/i, /apego (?:ansioso|evitativo|desorganizado)/i, /red ?flags?/i,
    /gaslight/i, /manipulador/i, /psic[oó]pata/i, /bipolar/i, /trastorno/i, /diagn[oó]stic/i,
    /deber[ií]as? (?:dejar|terminar|romper)/i, /d[eé]jal[oa]\b/i, /rompe con/i, /termina con (?:[eé]l|ella)/i,
    /infiel/i, /te enga[ñn]a/i, /https?:\/\//i, /Persona [C-Z]\b/,
    /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u
  ];

  function cleanText(v, min, max) {
    if (typeof v !== 'string') return null;
    const t = v.replace(/\s+/g, ' ').trim();
    if (t.length < min || t.length > max) return null;
    if (FORBIDDEN.some(re => re.test(t))) return null;
    return t;
  }

  function sanitizeAI(raw, ctx) {
    if (!raw || typeof raw !== 'object') return null;
    ctx = ctx || {};
    const out = {};

    const headline = cleanText(raw.headline, 20, 160);
    if (headline) out.headline = headline;

    if (raw.onePage && typeof raw.onePage === 'object') {
      const summary = cleanText(raw.onePage.summary, 40, 420);
      const list = (arr) => Array.isArray(arr) ? arr.map(x => cleanText(x, 10, 220)).filter(Boolean).slice(0, 3) : [];
      const good = list(raw.onePage.good);
      const watch = list(raw.onePage.watch);
      if (summary && (good.length || watch.length)) out.onePage = { summary, good, watch };
    }

    const ids = (list) => (list || []).map(x => (x && typeof x === 'object') ? x.id : x);

    // La IA devuelve los patrones como lista [{ id, intro }]; se acepta
    // también el mapa { id: { intro } }.
    if (raw.patterns && typeof raw.patterns === 'object') {
      const allowed = ids(ctx.patterns);
      const entries = Array.isArray(raw.patterns)
        ? raw.patterns.map(p => [p && p.id, p])
        : Object.keys(raw.patterns).map(id => [id, raw.patterns[id]]);
      const patterns = {};
      entries.forEach(([id, p]) => {
        if (allowed.indexOf(id) === -1 || patterns[id]) return;
        const intro = cleanText(p && p.intro, 40, 600);
        if (intro) patterns[id] = { intro };
      });
      if (Object.keys(patterns).length) out.patterns = patterns;
    }

    if (Array.isArray(raw.conversations)) {
      const allowed = ids(ctx.conversations);
      const chosen = [];
      raw.conversations.forEach(id => {
        if (allowed.indexOf(id) !== -1 && chosen.indexOf(id) === -1) chosen.push(id);
      });
      if (chosen.length >= 3) out.conversations = chosen.slice(0, 5);
    }

    if (Array.isArray(raw.plan) && raw.plan.length === 4) {
      const weeks = raw.plan.map((w, i) => {
        if (!w || typeof w !== 'object') return null;
        const focus = cleanText(w.focus, 3, 80);
        const actions = Array.isArray(w.actions) ? w.actions.map(a => cleanText(a, 15, 240)).filter(Boolean) : [];
        if (!focus || actions.length < 2) return null;
        return { week: i + 1, focus, actions: actions.slice(0, 3) };
      });
      if (weeks.every(Boolean)) out.plan = weeks;
    }

    return Object.keys(out).length ? out : null;
  }

  /* Lo que se le puede ofrecer a la IA para elegir y personalizar. */
  function aiContext(report) {
    const det = detect(report);
    return {
      patterns: det.concerns.map(c => ({ id: c.id, severity: c.severity, title: G.CONCERNS[c.id].title })),
      conversations: conversationCandidates(det).map(id => ({ id, title: conversationFor(id).title })),
      detection: det
    };
  }

  root.YLSGuide = {
    PRIORITY, detect, includesEnding, assemble, sanitizeAI, aiContext, countWords, tenPhrases
  };
})(typeof window !== 'undefined' ? window : globalThis);
