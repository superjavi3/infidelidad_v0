/*
 * report-pdf.js — el informe en PDF.
 *
 * build(report, guide, opts) devuelve la definición de documento de pdfmake:
 * portada, cómo leer, índice con números de página, parte A con sus datos y
 * gráficas, parte B con la guía y contraportada. Es lógica pura: no carga
 * pdfmake, no hace red y no toca el DOM, así que se prueba en Node con el
 * pdfmake real (tests/report-pdf.test.mjs).
 *
 * Las gráficas son SVG vectorial generado aquí mismo, no imágenes: el texto
 * sale nítido a cualquier zoom, pesa unos pocos KB y usa las mismas fuentes
 * que el resto del documento.
 *
 * download() (al final) es la parte de navegador: carga pdfmake y las fuentes
 * solo cuando alguien pulsa «Descargar», y entrega el archivo.
 */
(function (root) {
  'use strict';

  // Media carta (5,5 × 8,5 in): se lee en un iPhone sin hacer zoom y se
  // imprime bien a dos por hoja. Cambiar aquí si se quiere carta o A4.
  const PAGE = { size: { width: 396, height: 612 }, margins: [36, 48, 36, 48] };
  const CONTENT_W = PAGE.size.width - PAGE.margins[0] - PAGE.margins[2];

  const C = {
    paper: '#F7F3EC', paper2: '#EFE9DF', ink: '#1F1D1B', ink2: '#4A4642', muted: '#8A837A',
    line: '#DED6C9', accent: '#B5533C', accentInk: '#9C4531', green: '#2F4A3E', gold: '#B9924B'
  };

  const FONTS = {
    Inter: { normal: 'Inter-400.ttf', bold: 'Inter-600.ttf', italics: 'Inter-400.ttf', bolditalics: 'Inter-600.ttf' },
    InterMedium: { normal: 'Inter-500.ttf', bold: 'Inter-600.ttf', italics: 'Inter-500.ttf', bolditalics: 'Inter-600.ttf' },
    Fraunces: { normal: 'Fraunces-300.ttf', bold: 'Fraunces-600.ttf', italics: 'Fraunces-300-italic.ttf', bolditalics: 'Fraunces-300-italic.ttf' }
  };
  const FONT_FILES = ['Inter-400.ttf', 'Inter-500.ttf', 'Inter-600.ttf', 'Fraunces-300.ttf', 'Fraunces-600.ttf', 'Fraunces-300-italic.ttf'];

  /* ── Texto ── */

  // Las fuentes se incrustan solo con latín: los emojis y otros alfabetos
  // saldrían como cajas vacías, así que se quitan.
  function clean(s) {
    return String(s === null || s === undefined ? '' : s)
      .replace(/[^\n -~ -ÿıŒœ‐-‧‰‹›€™←-↓−]/g, '')
      .replace(/[ \t]{2,}/g, ' ')
      .trim();
  }

  function esc(s) {
    return clean(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function shortName(name, fallback) {
    // Se limpia antes de cortar: «💕 Ana» es Ana, no un nombre vacío.
    const first = clean(name).split(/\s+/)[0];
    return first || fallback;
  }

  function num(n) { return Number(n || 0).toLocaleString('es-MX'); }
  function mins(m) { return m === null || m === undefined ? '—' : root.YLSMetrics.formatMinutes(m); }
  function pct(n) { return n === null || n === undefined ? '—' : n + '%'; }
  function dec(n) { return String(Math.round((n || 0) * 10) / 10).replace('.', ','); }

  function monthYear(d) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
  }

  /* ── Piezas de maquetación ── */

  const P = (text, extra) => Object.assign({ text: clean(text), style: 'body' }, extra || {});
  const Lead = (text) => ({ text: clean(text), style: 'lead' });
  const Label = (text, extra) => Object.assign({ text: clean(text).toUpperCase(), style: 'label' }, extra || {});
  const H3 = (text) => ({ text: clean(text), style: 'h3', headlineLevel: 1 });
  const Note = (text) => ({ text: clean(text), style: 'note' });
  const Rule = (color) => ({ canvas: [{ type: 'line', x1: 0, y1: 0, x2: CONTENT_W, y2: 0, lineWidth: 0.5, lineColor: color || C.line }], margin: [0, 6, 0, 10] });

  function bullets(items, color) {
    return {
      ul: items.map(t => ({ text: clean(t), style: 'body', margin: [0, 0, 0, 3] })),
      markerColor: color || C.gold,
      margin: [0, 0, 0, 8]
    };
  }

  // Cada sección numerada empieza en página nueva y entra en el índice.
  function sectionHead(n, title, opts) {
    return [
      {
        text: [{ text: n + '  ', color: C.gold, font: 'Inter', fontSize: 9, bold: true }, { text: clean(title) }],
        style: 'h2', tocItem: true, tocStyle: 'tocEntry', tocMargin: [0, 5, 0, 0],
        pageBreak: opts && opts.noBreak ? undefined : 'before', headlineLevel: 1
      },
      Rule(C.gold)
    ];
  }

  function partPage(label, title, intro) {
    return {
      stack: [
        Label(label, { margin: [0, 150, 0, 10], color: C.accentInk }),
        { text: clean(title), style: 'part' },
        intro ? P(intro, { margin: [0, 16, 0, 0], color: C.ink2 }) : ''
      ],
      pageBreak: 'before'
    };
  }

  function tableLayout() {
    return {
      hLineWidth: (i, node) => (i === 0 || i === node.table.body.length) ? 0 : 0.5,
      vLineWidth: () => 0,
      hLineColor: () => C.line,
      paddingLeft: (i) => (i === 0 ? 0 : 6),
      paddingRight: () => 4,
      paddingTop: () => 4,
      paddingBottom: () => 4
    };
  }

  // Tabla con cabecera en etiqueta pequeña. rows: arrays de celdas (texto).
  function dataTable(head, rows, widths) {
    return {
      table: {
        headerRows: 1,
        widths: widths || ['*'].concat(head.slice(1).map(() => 'auto')),
        body: [head.map((h, i) => ({ text: clean(h).toUpperCase(), style: 'th', alignment: i ? 'right' : 'left' }))]
          .concat(rows.map(r => r.map((c, i) => (typeof c === 'object' && c !== null)
            ? (c.stack ? Object.assign({ style: 'td' }, c)
              : Object.assign({ style: 'td', alignment: i ? 'right' : 'left' }, c, { text: clean(c.text) }))
            : { text: clean(c), style: 'td', alignment: i ? 'right' : 'left' })))
      },
      layout: tableLayout(),
      margin: [0, 4, 0, 12]
    };
  }

  function svg(markup, width) {
    return { svg: markup, width: width || CONTENT_W, margin: [0, 6, 0, 10] };
  }

  function legend(items) {
    return {
      columns: items.map(it => ({
        width: 'auto',
        columns: [
          { canvas: [{ type: 'rect', x: 0, y: 2, w: 7, h: 7, color: it.color }], width: 11 },
          { text: clean(it.label), style: 'small', width: 'auto' }
        ],
        columnGap: 0
      })),
      columnGap: 14,
      margin: [0, 0, 0, 8]
    };
  }

  /* ── Gráficas SVG ── */

  const SVG_FONT = 'font-family="Inter"';

  function radarSvg(axes, series) {
    const W = CONTENT_W, H = 178, cx = W / 2, cy = 90, R = 64;
    const n = axes.length;
    const pt = (i, v) => {
      const a = -Math.PI / 2 + i * 2 * Math.PI / n;
      return [cx + Math.cos(a) * R * v / 100, cy + Math.sin(a) * R * v / 100];
    };
    let out = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`;
    [25, 50, 75, 100].forEach(v => {
      out += `<polygon points="${axes.map((_, i) => pt(i, v).join(',')).join(' ')}" fill="none" stroke="${C.line}" stroke-width="0.6"/>`;
    });
    axes.forEach((ax, i) => {
      const [x, y] = pt(i, 100);
      out += `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="${C.line}" stroke-width="0.6"/>`;
      const [lx, ly] = pt(i, 122);
      const anchor = Math.abs(lx - cx) < 4 ? 'middle' : lx > cx ? 'start' : 'end';
      out += `<text x="${lx}" y="${ly + 3}" ${SVG_FONT} font-size="7.5" fill="${C.ink2}" text-anchor="${anchor}">${esc(ax.label)}</text>`;
    });
    series.forEach(s => {
      const pts = s.values.map((v, i) => pt(i, v === null ? 0 : v).join(',')).join(' ');
      out += `<polygon points="${pts}" fill="${s.color}" fill-opacity="0.10" stroke="${s.color}" stroke-width="1.4"/>`;
      s.values.forEach((v, i) => {
        if (v === null) return;
        const [x, y] = pt(i, v);
        out += `<circle cx="${x}" cy="${y}" r="1.8" fill="${s.color}"/>`;
      });
    });
    return out + '</svg>';
  }

  function timelineSvg(timeline, turningPoints) {
    const data = timeline.data || [];
    const labels = timeline.labels || [];
    const W = CONTENT_W, H = 150, left = 30, top = 16, bottom = 20;
    const plotW = W - left, plotH = H - top - bottom;
    const max = Math.max(1, ...data);
    const step = plotW / Math.max(1, data.length);
    const bw = Math.max(1.5, step * 0.68);
    let out = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`;
    [0, 0.5, 1].forEach(f => {
      const y = top + plotH * (1 - f);
      out += `<line x1="${left}" y1="${y}" x2="${W}" y2="${y}" stroke="${C.line}" stroke-width="0.5"/>`;
      out += `<text x="${left - 5}" y="${y + 2.5}" ${SVG_FONT} font-size="6.5" fill="${C.muted}" text-anchor="end">${num(Math.round(max * f))}</text>`;
    });
    const marks = {};
    (turningPoints || []).forEach((t, i) => { marks[t.index] = i + 1; });
    const every = Math.max(1, Math.ceil(data.length / 7));
    data.forEach((v, i) => {
      const h = plotH * v / max;
      const x = left + i * step + (step - bw) / 2;
      const y = top + plotH - h;
      out += `<rect x="${x}" y="${y}" width="${bw}" height="${Math.max(0.5, h)}" fill="${marks[i] ? C.accent : C.ink}" fill-opacity="${marks[i] ? 1 : 0.8}"/>`;
      if (marks[i]) {
        out += `<circle cx="${x + bw / 2}" cy="${y - 8}" r="5" fill="${C.paper}" stroke="${C.accent}" stroke-width="0.8"/>`;
        out += `<text x="${x + bw / 2}" y="${y - 5.6}" ${SVG_FONT} font-size="6.5" font-weight="bold" fill="${C.accentInk}" text-anchor="middle">${marks[i]}</text>`;
      }
      if (i % every === 0) {
        out += `<text x="${x + bw / 2}" y="${H - 6}" ${SVG_FONT} font-size="6.5" fill="${C.muted}" text-anchor="middle">${esc(String(labels[i] || '').toLowerCase())}</text>`;
      }
    });
    return out + '</svg>';
  }

  // Barras horizontales por franja: una por persona, escala de raíz para
  // que 8 min y 3 h quepan en la misma gráfica sin que una desaparezca.
  function bandsSvg(bands, people, colors) {
    const W = CONTENT_W, rowH = 30, labelW = 74, H = bands.length * rowH + 6;
    const values = [];
    people.forEach(p => p.byBand.forEach(b => { if (b.medianMin !== null) values.push(b.medianMin); }));
    const max = Math.sqrt(Math.max(1, ...values));
    const barMax = W - labelW - 58;
    let out = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`;
    bands.forEach((b, r) => {
      const y0 = r * rowH + 4;
      out += `<text x="0" y="${y0 + 9}" ${SVG_FONT} font-size="7.5" fill="${C.ink}">${esc(b.label)}</text>`;
      out += `<text x="0" y="${y0 + 19}" ${SVG_FONT} font-size="6.5" fill="${C.muted}">${esc(b.range)}</text>`;
      people.forEach((p, k) => {
        const v = p.byBand[r].medianMin;
        const y = y0 + k * 11;
        if (v === null) {
          out += `<text x="${labelW}" y="${y + 7}" ${SVG_FONT} font-size="6.5" fill="${C.muted}">sin datos suficientes</text>`;
          return;
        }
        const w = Math.max(1.5, barMax * Math.sqrt(v) / max);
        out += `<rect x="${labelW}" y="${y}" width="${w}" height="8" fill="${colors[k]}"/>`;
        out += `<text x="${labelW + w + 4}" y="${y + 6.5}" ${SVG_FONT} font-size="6.5" fill="${C.ink2}">${esc(mins(v))}</text>`;
      });
    });
    return out + '</svg>';
  }

  // El mapa de días: una columna por semana y una fila por día. Los días sin
  // mensajes van en arcilla; los demás en tinta, más oscura cuanto más se
  // escribieron. Se muestran las últimas 52 semanas como mucho.
  function calendarSvg(activity) {
    const days = activity.days.slice(-364);
    // Se alinea al lunes para que las filas sean días de la semana.
    const firstWd = (days[0].weekday + 6) % 7;
    const weeks = Math.ceil((days.length + firstWd) / 7);
    const W = CONTENT_W, labelW = 16, top = 12;
    const cell = Math.min(10, (W - labelW) / weeks);
    const H = top + cell * 7 + 4;
    const counts = days.filter(d => d.n > 0).map(d => d.n).sort((a, b) => a - b);
    const q = (f) => counts.length ? counts[Math.floor(f * (counts.length - 1))] : 1;
    const q1 = q(0.33), q2 = q(0.66);
    const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    let out = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`;
    ['L', '', 'X', '', 'V', '', 'D'].forEach((l, i) => {
      if (l) out += `<text x="0" y="${top + i * cell + cell * 0.75}" ${SVG_FONT} font-size="5.5" fill="${C.muted}">${l}</text>`;
    });
    let lastMonth = -1;
    days.forEach((d, i) => {
      const idx = i + firstWd;
      const col = Math.floor(idx / 7), row = idx % 7;
      const x = labelW + col * cell, y = top + row * cell;
      const month = parseInt(d.date.slice(5, 7), 10) - 1;
      if (row === 0 || i === 0) {
        if (month !== lastMonth && parseInt(d.date.slice(8, 10), 10) <= 7) {
          out += `<text x="${x}" y="${top - 4}" ${SVG_FONT} font-size="5.5" fill="${C.muted}">${MONTHS[month]}</text>`;
          lastMonth = month;
        }
      }
      const fill = d.n === 0 ? C.accent : C.ink;
      const op = d.n === 0 ? 0.55 : d.n <= q1 ? 0.18 : d.n <= q2 ? 0.4 : 0.75;
      out += `<rect x="${x + 0.4}" y="${y + 0.4}" width="${cell - 0.8}" height="${cell - 0.8}" fill="${fill}" fill-opacity="${op}"/>`;
    });
    return out + '</svg>';
  }

  // El score con el que se redacta el veredicto: el de los últimos 90 días
  // si es claramente peor que el del periodo, porque describe cómo están ahora.
  function currentScore(report) {
    const r = report.recentStats;
    return r && r.score <= report.stats.score - 10 ? r.score : report.stats.score;
  }

  /* ── Parte A ── */

  function onePageSection(n, ctx) {
    const { report, guide, names } = ctx;
    const s = report.stats;
    const Y = root.YLSReport;
    const ai = guide.onePage;
    const fallback = Y.buildOnePage(Object.assign({}, s, { personA: names.fullA, personB: names.fullB }));
    const good = ai ? ai.good : fallback.good;
    const watch = (ai ? ai.watch : fallback.watch).slice();
    // Sin IA, lo que merece atención se completa con los patrones más
    // graves de la guía, que miran también la evolución y no solo el total.
    if (!ai) {
      for (const m of guide.meaning) {
        if (watch.length >= 3) break;
        watch.push(m.lead);
      }
    }
    const recent = report.recentStats;

    const stats = [
      [String(s.score), 'Score de la relación'],
      recent ? [String(recent.score), 'Últimos 90 días'] : [s.avgReplyFormatted || '—', 'Respuesta media'],
      [num(s.total), 'Mensajes']
    ];
    return [
      ...sectionHead(n, 'En una página'),
      {
        columns: stats.map(([v, l]) => ({
          stack: [{ text: clean(v), style: 'bigNumber' }, Label(l)],
          width: '*'
        })),
        margin: [0, 4, 0, 14]
      },
      Lead(ai ? ai.summary : Y.scoreInWords(currentScore(report))),
      recent && Math.abs(recent.score - s.score) >= 10
        ? P(recent.score < s.score
          ? 'El score de todo el periodo es ' + s.score + '; si solo se miran los últimos tres meses, baja a ' + recent.score + '. Los dos números cuentan algo: el primero, lo que han construido; el segundo, cómo están ahora.'
          : 'El score de todo el periodo es ' + s.score + '; en los últimos tres meses sube a ' + recent.score + '. La conversación está mejor ahora que en promedio.')
        : '',
      good.length ? Label('Lo que va bien', { margin: [0, 10, 0, 4], color: C.green }) : '',
      good.length ? bullets(good, C.green) : '',
      watch.length ? Label('Lo que merece atención', { margin: [0, 6, 0, 4], color: C.accentInk }) : '',
      watch.length ? bullets(watch, C.accent) : ''
    ];
  }

  function twoInNumbersSection(n, ctx) {
    const { report, names } = ctx;
    const ind = report.recentStats && report.individualRecent ? report.individualRecent : report.individual;
    const axes = report.individual.axes;
    const values = (p) => axes.map(a => p.scores[a.key]);
    const cell = (v) => v === null || v === undefined ? '—' : String(v);
    const rows = axes.map(a => {
      const all = report.individual.people.map(p => cell(p.scores[a.key]));
      const now = report.individualRecent ? report.individualRecent.people.map(p => cell(p.scores[a.key])) : null;
      return [{ stack: [{ text: clean(a.label) }, { text: clean(a.desc), fontSize: 7, color: C.ink2 }] }]
        .concat(now ? [all[0] + ' / ' + now[0], all[1] + ' / ' + now[1]] : all);
    });
    return [
      ...sectionHead(n, 'Los dos, en números'),
      P('Cinco ejes para cada persona, de 0 a 100. No son una nota: describen cómo escribe cada uno. ' +
        (ind === report.individualRecent ? 'La gráfica muestra los últimos 90 días. En la tabla, el primer número es todo el periodo y el segundo, los últimos 90 días.' : 'Corresponden a todo el periodo.')),
      svg(radarSvg(axes, [
        { color: C.ink, values: values(ind.people[0]) },
        { color: C.accent, values: values(ind.people[1]) }
      ])),
      legend([{ color: C.ink, label: names.a }, { color: C.accent, label: names.b }]),
      // La tabla va entera: si no cabe bajo la gráfica, pasa completa a la
      // página siguiente en lugar de dejar la cabecera sola.
      Object.assign(dataTable(['Eje', names.a, names.b], rows, ['*', 56, 56]), { unbreakable: true })
    ];
  }

  function timelineSection(n, ctx) {
    const { report } = ctx;
    const t = report.timeline;
    const tps = report.turningPoints || [];
    return [
      ...sectionHead(n, 'La línea de vida'),
      P('Mensajes por mes a lo largo de todo el periodo. El mes de más actividad fue ' + clean(String(t.peakMonth || '').toLowerCase()) +
        ', con ' + num(t.maxVal) + ' mensajes.'),
      svg(timelineSvg(t, tps)),
      tps.length ? Label('Momentos de cambio', { margin: [0, 4, 0, 4] }) : '',
      tps.length ? { ol: tps.map(tp => ({ text: clean(tp.sentence), style: 'body', margin: [0, 0, 0, 3] })), margin: [0, 0, 0, 8] } : P('No hay cambios bruscos: la conversación ha tenido un ritmo parecido todo el periodo.'),
      tps.length ? Note('Los datos no saben qué pasaba en su vida esos meses. Tú sí: una mudanza, un trabajo nuevo, un viaje o una discusión suelen explicar estos cambios mejor que cualquier número.') : ''
    ];
  }

  function conversationsSection(n, ctx) {
    const { report, names } = ctx;
    const c = report.conversations;
    const q = report.questions;
    const [ca, cb] = c.people;
    const [qa, qb] = q.people;
    return [
      ...sectionHead(n, 'Cómo empiezan y cómo terminan las conversaciones'),
      P('Contamos una conversación nueva cuando alguien escribe después de cuatro horas sin mensajes. Contestar tarde a la otra persona no cuenta como abrir. En total hubo ' + num(c.total) + ' conversaciones, de ' + num(c.medianMessages) + ' mensajes en la mediana.'),
      dataTable(['', names.a, names.b], [
        ['Abre la conversación', pct(ca.openedPct), pct(cb.openedPct)],
        ['  en la primera mitad', pct(ca.openedPctEarly), pct(cb.openedPctEarly)],
        ['  en la segunda mitad', pct(ca.openedPctLate), pct(cb.openedPctLate)],
        ['La cierra', pct(ca.closedPct), pct(cb.closedPct)],
        ['Preguntas que hizo', num(qa.asked), num(qb.asked)],
        ['  sin respuesta en 12 h', pct(qa.unansweredPct), pct(qb.unansweredPct)],
        ['  primera mitad → segunda', pct(qa.unansweredPctEarly) + ' → ' + pct(qa.unansweredPctLate), pct(qb.unansweredPctEarly) + ' → ' + pct(qb.unansweredPctLate)],
        ['Conversaciones que terminó con una pregunta', num(ca.endedWithQuestion), num(cb.endedWithQuestion)]
      ], ['*', 58, 58]),
      Note('Una pregunta cuenta como respondida si la otra persona escribe en las siguientes doce horas. Muchas preguntas se contestan en persona o por llamada, y eso el chat no lo ve.')
    ];
  }

  function rhythmsSection(n, ctx) {
    const { report, names } = ctx;
    const r = report.rhythms;
    const [pa, pb] = r.people;
    const lines = r.people.map((p, i) => {
      const who = i === 0 ? names.a : names.b;
      const parts = [who + ' contesta en ' + mins(p.medianMin) + ' en la mediana'];
      const when = { madrugada: 'de madrugada', manana: 'por la mañana', tarde: 'por la tarde', noche: 'por la noche' };
      const f = p.fastestBand, sl = p.slowestBand;
      // Solo se cuenta si la diferencia se nota: la mitad más y 5 minutos.
      if (f && sl && sl.key !== f.key && sl.medianMin >= f.medianMin * 1.5 && sl.medianMin - f.medianMin >= 5) {
        parts.push('más rápido ' + when[f.key] + ' (' + mins(f.medianMin) + ') y más despacio ' + when[sl.key] + ' (' + mins(sl.medianMin) + ')');
      }
      if (p.medianMinEarly !== null && p.medianMinLate !== null && Math.abs(p.medianMinLate - p.medianMinEarly) >= 10) {
        parts.push('en la primera mitad del periodo tardaba ' + mins(p.medianMinEarly) + ' y en la segunda ' + mins(p.medianMinLate));
      }
      return parts.join('; ') + '.';
    });
    const out = [
      ...sectionHead(n, 'Ritmos'),
      P('Cuánto tarda cada uno en contestar según la hora a la que le llega el mensaje. Son medianas y no cuentan los silencios de más de dos días, que están en la sección siguiente.'),
      legend([{ color: C.ink, label: names.a }, { color: C.accent, label: names.b }]),
      svg(bandsSvg(r.bands, r.people, [C.ink, C.accent])),
      ...lines.map(l => P(l)),
      Label('Por día de la semana', { margin: [0, 8, 0, 2] }),
      dataTable(['Día', names.a, names.b], pa.byWeekday.map((d, i) => {
        const cap = d.label.charAt(0).toUpperCase() + d.label.slice(1);
        return [cap, mins(d.medianMin), mins(pb.byWeekday[i].medianMin)];
      }).slice(1).concat([['Domingo', mins(pa.byWeekday[0].medianMin), mins(pb.byWeekday[0].medianMin)]]), ['*', 70, 70])
    ];

    // Cuándo estás más presente y cuándo no: la respuesta según el tipo de
    // mensaje (el analizador de respuestas selectivas, sin ese nombre).
    const sg = report.selectiveGhosting;
    if (sg) {
      const cats = ['casual', 'pregunta_directa', 'emocional', 'relacional', 'confesion'];
      const labelOf = { casual: 'Conversación del día a día', pregunta_directa: 'Preguntas directas', emocional: 'Momentos de vulnerabilidad', relacional: 'Preguntas sobre la relación', confesion: 'Palabras de amor' };
      const byName = {};
      [sg.personA, sg.personB].forEach(d => { if (d) byName[d.responderName] = d; });
      const da = byName[report.stats.personA], db = byName[report.stats.personB];
      if (da && db) {
        const rows = cats
          .filter(k => (da.categories[k] && da.categories[k].count) || (db.categories[k] && db.categories[k].count))
          .map(k => [labelOf[k],
            da.categories[k].count >= 3 ? mins(da.categories[k].median) : '—',
            db.categories[k].count >= 3 ? mins(db.categories[k].median) : '—']);
        out.push(Label('Cuándo están más presentes y cuándo no', { margin: [0, 8, 0, 2], headlineLevel: 1 }));
        out.push(P('Tiempo que tarda cada uno en contestar según el tipo de mensaje que recibe. Si los mensajes con carga emocional tardan mucho más que los del día a día, puede que cueste responderlos.'));
        out.push(dataTable(['Tipo de mensaje', names.a, names.b], rows, ['*', 70, 70]));
      }
    }
    return out;
  }

  function silencesSection(n, ctx) {
    const { report, names } = ctx;
    const s = report.silences;
    const a = report.activity;
    const brokeA = (s.brokeCount || {})[report.stats.personA] || 0;
    const brokeB = (s.brokeCount || {})[report.stats.personB] || 0;
    const longest = s.longest;
    return [
      ...sectionHead(n, 'Silencios'),
      P('Cada casilla es un día. En arcilla, los días sin ningún mensaje; en tinta, los días con mensajes, más oscuros cuanto más se escribieron.' + (a.days.length > 364 ? ' Se muestran los últimos doce meses.' : '')),
      svg(calendarSvg(a)),
      legend([{ color: '#D9A08F', label: 'Sin mensajes' }, { color: '#C8C3BD', label: 'Pocos' }, { color: '#4F4B47', label: 'Muchos' }]),
      dataTable(['', 'Periodo'], [
        ['Días sin mensajes', num(a.silentDays) + ' de ' + num(a.totalDays) + ' (' + a.silentPct + '%)'],
        ['Racha más larga con mensajes todos los días', num(a.longestActiveStreak) + ' días'],
        ['Silencios de dos días o más', num(s.total)],
        ['El más largo', longest ? root.YLSReportPDF._silence(longest.hours) : '—'],
        ['Los rompió ' + names.a, num(brokeA)],
        ['Los rompió ' + names.b, num(brokeB)]
      ], ['*', 'auto']),
      longest ? P('El silencio más largo empezó en ' + monthYear(longest.start) + ' y lo rompió ' + shortName(longest.brokeBy, '—') + '.') : ''
    ];
  }

  function talkSection(n, ctx) {
    const { report, names } = ctx;
    const w = report.warmth.people;
    const out = [
      ...sectionHead(n, 'Cómo se hablan'),
      P('Palabras y emojis de afecto por cada 100 mensajes: «te quiero», «te extraño», los apodos, los corazones. La primera mitad del periodo frente a la segunda.'),
      dataTable(['Afecto por cada 100 mensajes', names.a, names.b], [
        ['Primera mitad', dec(w[0].per100Early), dec(w[1].per100Early)],
        ['Segunda mitad', dec(w[0].per100Late), dec(w[1].per100Late)]
      ], ['*', 60, 60])
    ];
    const bn = report.beforeNow;
    if (bn) {
      const labelFix = (l) => clean(l).replace('Largo promedio', 'Largo medio (caracteres)').replace('Inicia conversación', 'Inicia conversaciones');
      out.push(Label('Los primeros meses frente a los últimos', { margin: [0, 6, 0, 2], headlineLevel: 1 }));
      out.push(P('Primeros ' + bn.cutoffMonths + ' meses (' + clean(bn.beforeLabel) + ') frente a los últimos ' + bn.cutoffMonths + ' (' + clean(bn.afterLabel) + ').'));
      out.push(dataTable(['', names.a, names.b], bn.personA.metrics.map((m, i) => {
        const mb = bn.personB.metrics[i];
        return [labelFix(m.label), num(m.before) + ' → ' + num(m.after), num(mb.before) + ' → ' + num(mb.after)];
      }), ['*', 72, 72]));
    }
    const lang = report.language;
    if (lang && lang.hasEnoughMonths) {
      const words = (d, key) => d && d[key] && d[key].length ? d[key].slice(0, 5).map(x => clean(x.word)).filter(Boolean).join(', ') : '';
      const rows = [];
      [[lang.personAData, names.a], [lang.personBData, names.b]].forEach(([d, who]) => {
        if (!d) return;
        const gone = words(d, 'disappeared');
        const came = words(d, 'appeared');
        const parts = [];
        if (gone) parts.push('usaba al principio y casi ya no: ' + gone);
        if (came) parts.push((gone ? 'y usa ahora y antes no: ' : 'usa ahora y antes no: ') + came);
        if (parts.length) rows.push(P(who + ' ' + parts.join('; ') + '.'));
      });
      if (rows.length) {
        out.push(Label('Palabras que van y vienen', { margin: [0, 6, 0, 2], headlineLevel: 1 }));
        out.push(Note('Se buscaron en tu teléfono y no han salido de él.'));
        out.push(...rows);
      }
    }
    return out;
  }

  function sharedSection(n, ctx) {
    const { report, names } = ctx;
    const mm = report.multimedia || {};
    const LABELS = { audios: 'Audios', imagenes: 'Fotos', stickers: 'Stickers', videos: 'Videos', documentos: 'Documentos', ubicaciones: 'Ubicaciones' };
    const a = report.stats.personA, b = report.stats.personB;
    const rows = Object.keys(LABELS).map(k => {
      const t = mm[k] || { perPerson: {} };
      return [LABELS[k], num(t.perPerson[a] || 0), num(t.perPerson[b] || 0)];
    });
    const totA = Object.keys(LABELS).reduce((s, k) => s + ((mm[k] || { perPerson: {} }).perPerson[a] || 0), 0);
    const totB = Object.keys(LABELS).reduce((s, k) => s + ((mm[k] || { perPerson: {} }).perPerson[b] || 0), 0);
    const tot = totA + totB;
    return [
      ...sectionHead(n, 'Lo que se comparte'),
      P(tot
        ? 'En total compartieron ' + num(tot) + ' archivos: el ' + Math.round(totA / tot * 100) + '% los envió ' + names.a + ' y el ' + Math.round(totB / tot * 100) + '% ' + names.b + '.'
        : 'En este chat casi no se comparten archivos, o el export se hizo sin multimedia y no deja marca.'),
      dataTable(['', names.a, names.b], rows.concat([[{ text: 'Total', bold: true }, { text: num(totA), bold: true }, { text: num(totB), bold: true }]]), ['*', 60, 60]),
      Note('Contamos las marcas que deja WhatsApp al exportar («imagen omitida», «audio omitido»). Nunca vemos el contenido.')
    ];
  }

  function goneSection(n, ctx) {
    const { report, names } = ctx;
    const d = report.deleted;
    const e = report.edited;
    const a = report.stats.personA, b = report.stats.personB;
    const out = [
      ...sectionHead(n, 'Lo que desaparece'),
      P('Mensajes que alguien envió y después eliminó para todos. WhatsApp deja la marca «Se eliminó este mensaje»; no sabemos qué decían ni queremos saberlo.'),
      dataTable(['', names.a, names.b], [
        ['Mensajes eliminados', num((d.deleted || {})[a] || 0), num((d.deleted || {})[b] || 0)]
      ].concat(e.supported ? [['Mensajes editados', num(e.people[0].count), num(e.people[1].count)]] : []), ['*', 60, 60]),
      e.supported ? '' : Note('Tu export no marca los mensajes editados: las versiones antiguas de WhatsApp solo guardan el texto final. Por eso aquí no hay dato de editados.'),
      Lead('Hay muchas razones para borrar un mensaje.'),
      P('Una errata, un mensaje enviado al chat equivocado, una foto que no era, algo dicho en caliente y retirado a tiempo. La mayoría no significan nada, y cuando significan algo, borrar lo dicho con enojo puede ser una forma de cuidar. Este informe no saca ninguna conclusión de este dato, y te pedimos que tú tampoco lo hagas solo con él.')
    ];
    return out;
  }

  function topicsSection(n, ctx) {
    const { report, names } = ctx;
    const t = report.topics;
    const [ba, bb] = t.baseline;
    const rows = t.topics.filter(x => x.mentions > 0).map(x => {
      const ra = x.responders[0], rb = x.responders[1];
      const mark = (r) => (r.medianMin === null ? '—' : mins(r.medianMin)) + (r.avoided ? ' *' : '');
      return [x.label, num(x.mentions), mark(ra), mark(rb)];
    });
    const avoided = t.topics.filter(x => x.avoided);
    return [
      ...sectionHead(n, 'Los temas'),
      P('Cuánto tarda cada uno en contestar cuando aparece un tema, frente a lo que tarda con el resto de la conversación. Los temas se detectan con palabras clave dentro de tu teléfono; ningún mensaje ha salido de él para este análisis.'),
      rows.length
        ? dataTable(['Tema', 'Veces', names.a, names.b], rows.concat([['Resto de la conversación', '', mins(ba.medianMin), mins(bb.medianMin)]]), ['*', 34, 58, 58])
        : P('No hay suficientes menciones de estos temas para comparar.'),
      avoided.length ? Note('* Tema que a esa persona le cuesta: tarda al menos el doble que de costumbre o deja sin responder el doble de preguntas. La guía lo explica en la sección 11.') : '',
      avoided.length ? '' : P('Ningún tema provoca respuestas mucho más lentas que el resto de la conversación.')
    ];
  }

  /* ── Parte B ── */

  function meaningSection(n, ctx) {
    const g = ctx.guide;
    const out = [...sectionHead(n, 'Qué significa lo que has visto'), ...g.intros.meaning.map(t => P(t))];
    g.meaning.forEach((m, i) => {
      if (i > 0) out.push(Rule());
      out.push({ text: clean(m.title), style: 'h3', headlineLevel: 1, margin: [0, i === 0 ? 14 : 6, 0, 6] });
      out.push(Lead(m.lead));
      [['Qué suele significar', m.significa], ['Qué no significa', m.noSignifica], ['Cuándo es normal', m.normal], ['Cuándo preocupa', m.preocupa]]
        .forEach(([label, paras]) => {
          out.push(Label(label, { margin: [0, 6, 0, 3], headlineLevel: 1 }));
          paras.forEach(p => out.push(P(p)));
        });
      out.push(Label('Qué hacer', { margin: [0, 6, 0, 3], headlineLevel: 1 }));
      out.push(bullets(m.queHacer));
    });
    if (g.calm.length) {
      if (g.meaning.length) out.push(Rule());
      out.push({ text: 'Lo que miramos y no preocupa', style: 'h3', headlineLevel: 1, margin: [0, 6, 0, 6] });
      g.calm.forEach(c => {
        out.push({ text: clean(c.title), style: 'h4', headlineLevel: 1 });
        if (c.lead) out.push(P(c.lead, { color: C.ink2 }));
        out.push(P(c.text));
      });
    }
    return out;
  }

  function goingWellSection(n, ctx) {
    const g = ctx.guide;
    const gw = g.goingWell;
    const out = [...sectionHead(n, 'Lo que sí va bien y cómo protegerlo'), ...g.intros.going.map(t => P(t))];
    if (!gw.healthy.length && !gw.rituals.length) {
      out.push(P('En este momento los datos no muestran patrones claramente sanos, lo que no significa que no los haya: el chat solo ve una parte. Piensa qué es lo que más te gusta de cómo están, y cuídalo con la misma atención que lo que preocupa.'));
    }
    gw.healthy.forEach(h => {
      out.push(H3(h.title));
      out.push(Lead(h.lead));
      h.text.forEach(t => out.push(P(t)));
      out.push(Label('Cómo protegerlo', { margin: [0, 4, 0, 3], color: C.green, headlineLevel: 1 }));
      out.push(P(h.proteger));
      out.push(bullets(h.habitos, C.green));
      out.push(Note(h.vigilar));
    });
    if (gw.rituals.length) {
      out.push(H3('Los rituales que ya tienen'));
      gw.rituals.forEach(r => {
        out.push({ text: clean(r.title), style: 'h4', headlineLevel: 1 });
        out.push(P(r.lead + ' ' + r.text + ' ' + r.proteger));
      });
    }
    if (gw.anticipate) {
      out.push(H3(gw.anticipate.title));
      gw.anticipate.paragraphs.forEach(t => out.push(P(t)));
    }
    return out;
  }

  function conversationsGuideSection(n, ctx) {
    const g = ctx.guide;
    const out = [...sectionHead(n, 'Conversaciones que merece la pena tener'), ...g.intros.conversations.map(t => P(t))];
    out.push(Label('Antes de empezar', { margin: [0, 4, 0, 3] }));
    out.push(bullets(g.intros.conversationTips));
    g.conversations.forEach((c, i) => {
      out.push({ text: (i + 1) + '. ' + clean(c.title), style: 'h3', headlineLevel: 1, pageBreak: 'before' });
      out.push(Label('Por qué', { margin: [0, 2, 0, 2] }));
      out.push(P(c.porque));
      out.push(Label('Cuándo', { margin: [0, 4, 0, 2] }));
      out.push(P(c.cuando));
      c.abrir.forEach(a => {
        out.push(Label('Cómo abrirla · ' + a.si, { margin: [0, 6, 0, 3], headlineLevel: 1 }));
        out.push({
          table: { widths: [2, '*'], body: [[{ text: '', fillColor: C.gold }, { text: '«' + clean(a.guion) + '»', style: 'script' }]] },
          layout: { hLineWidth: () => 0, vLineWidth: () => 0, paddingLeft: (i) => (i === 1 ? 10 : 0), paddingRight: () => 0, paddingTop: () => 2, paddingBottom: () => 2 },
          margin: [0, 0, 0, 8],
          unbreakable: true
        });
      });
      out.push(Label('Qué escuchar', { margin: [0, 2, 0, 2], color: C.green }));
      out.push(P(c.escuchar));
      out.push(Label('Qué evitar', { margin: [0, 4, 0, 2], color: C.accentInk }));
      out.push(P(c.evitar));
    });
    return out;
  }

  function planSection(n, ctx) {
    const g = ctx.guide;
    const out = [...sectionHead(n, 'Un plan de 30 días'), ...g.intros.plan.map(t => P(t))];
    g.plan.forEach(w => {
      out.push({
        stack: [
          { text: [{ text: 'SEMANA ' + w.week + '  ', style: 'label', color: C.gold }, { text: clean(w.focus), style: 'h4' }], margin: [0, 10, 0, 4] },
          w.intro ? P(w.intro, { color: C.ink2 }) : '',
          ...w.actions.map(a => ({
            columns: [
              { canvas: [{ type: 'rect', x: 0, y: 2, w: 8, h: 8, lineWidth: 0.7, lineColor: C.ink2 }], width: 16 },
              { text: clean(a), style: 'body' }
            ],
            margin: [0, 0, 0, 4]
          })),
          Label('Notas', { margin: [0, 6, 0, 0], color: C.muted }),
          { canvas: [0, 1, 2].map(i => ({ type: 'line', x1: 0, y1: 16 + i * 18, x2: CONTENT_W, y2: 16 + i * 18, lineWidth: 0.4, lineColor: C.line })), margin: [0, 0, 0, 6] }
        ],
        unbreakable: true
      });
    });
    return out;
  }

  function careSection(n, ctx) {
    const g = ctx.guide;
    const out = [...sectionHead(n, 'Cómo cuidar la relación a partir de ahora'), ...g.intros.care.map(t => P(t))];
    g.care.forEach(c => {
      out.push(H3(c.title));
      c.paragraphs.forEach(t => out.push(P(t)));
    });
    return out;
  }

  function endingSection(n, ctx) {
    const e = ctx.guide.ending;
    return [...sectionHead(n, e.title), ...e.paragraphs.map((t, i) => i === 0 ? Lead(t) : P(t))];
  }

  function helpSection(n, ctx) {
    const h = ctx.guide.help;
    const lines = (list) => dataTable(['', 'Teléfono', ''], list.map(l => [
      { text: l.name, bold: true }, { text: l.contact, bold: true, alignment: 'left' }, { text: l.desc, style: 'small', alignment: 'left' }
    ]), [70, 62, '*']);
    return [
      ...sectionHead(n, 'Cuándo hablar con alguien'),
      Lead(h.intro),
      Label('Señales para buscar ayuda', { margin: [0, 6, 0, 3] }),
      bullets(h.signals, C.accent),
      P(h.professional),
      Label('México', { margin: [0, 8, 0, 0], headlineLevel: 1 }),
      lines(h.lines.mx),
      Label('España', { margin: [0, 4, 0, 0], headlineLevel: 1 }),
      lines(h.lines.es),
      {
        table: { widths: ['*'], body: [[{ text: clean(h.note), style: 'body', fillColor: C.paper2, margin: [8, 8, 8, 8] }]] },
        layout: 'noBorders', margin: [0, 8, 0, 0]
      }
    ];
  }

  function summarySection(n, ctx) {
    return [
      ...sectionHead(n, 'Tu informe en 10 frases'),
      {
        table: {
          widths: [18, '*'],
          body: ctx.guide.summary.map((t, i) => [
            { text: String(i + 1).padStart(2, '0'), style: 'label', color: C.gold, margin: [0, 2, 0, 0] },
            { text: clean(t), style: 'summaryLine' }
          ])
        },
        layout: tableLayout()
      }
    ];
  }

  const SECTION_BUILDERS = {
    'En una página': onePageSection,
    'Los dos, en números': twoInNumbersSection,
    'La línea de vida': timelineSection,
    'Cómo empiezan y cómo terminan las conversaciones': conversationsSection,
    'Ritmos': rhythmsSection,
    'Silencios': silencesSection,
    'Cómo se hablan': talkSection,
    'Lo que se comparte': sharedSection,
    'Lo que desaparece': goneSection,
    'Los temas': topicsSection,
    'Qué significa lo que has visto': meaningSection,
    'Lo que sí va bien y cómo protegerlo': goingWellSection,
    'Conversaciones que merece la pena tener': conversationsGuideSection,
    'Un plan de 30 días': planSection,
    'Cómo cuidar la relación a partir de ahora': careSection,
    'Si estás pensando en terminar, o ya terminó': endingSection,
    'Cuándo hablar con alguien': helpSection,
    'Tu informe en 10 frases': summarySection
  };

  // Quita los huecos vacíos y el margen inferior del último elemento. Si una
  // sección acaba justo al final de la página, ese margen abre una página
  // nueva y el salto de la sección siguiente deja otra en blanco.
  function finishSection(nodes) {
    const out = nodes.filter(n => n !== '' && n !== null && n !== undefined);
    const last = out[out.length - 1];
    if (last && typeof last === 'object') {
      const m = last.margin || [0, 0, 0, 0];
      out[out.length - 1] = Object.assign({}, last, { margin: [m[0], m[1], m[2], 0] });
      // Los estilos también llevan margen: se anula con uno explícito.
      if (!last.margin && last.style) out[out.length - 1].margin = [0, 0, 0, 0];
    }
    return out;
  }

  /* ── Documento ── */

  function build(report, guide, opts) {
    opts = opts || {};
    const s = report.stats;
    const names = {
      a: shortName(s.personA, 'Persona A'),
      b: shortName(s.personB, 'Persona B'),
      fullA: s.personA,
      fullB: s.personB
    };
    const ctx = { report, guide, names };
    const now = opts.now ? new Date(opts.now) : new Date();
    const index = root.YLSReport.buildIndex({ ending: !!guide.ending });
    const headline = guide.headline || root.YLSReport.scoreInWords(currentScore(report));
    const period = monthYear(s.firstDate) + ' — ' + monthYear(s.lastDate);

    const content = [];

    // Portada
    content.push({
      stack: [
        { text: 'YaLoSabía', style: 'brand' },
        Label('Informe de relación', { margin: [0, 128, 0, 10], color: C.accentInk }),
        { text: names.a + ' y ' + names.b, style: 'cover' },
        { text: clean(headline), style: 'coverLine' },
        Rule(C.gold),
        {
          columns: [
            { stack: [Label('Periodo'), { text: clean(period), style: 'meta' }, Label('Días con actividad', { margin: [0, 8, 0, 0] }), { text: num(s.uniqueDays), style: 'meta' }] },
            { stack: [Label('Mensajes'), { text: num(s.total), style: 'meta' }, Label('Fecha del informe', { margin: [0, 8, 0, 0] }), { text: now.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' }), style: 'meta' }] }
          ],
          columnGap: 16
        }
      ]
    });

    // Cómo leer este informe
    content.push({ text: 'Cómo leer este informe', style: 'h2', pageBreak: 'before' });
    content.push(Rule(C.gold));
    // El último párrafo sin margen inferior: si la página queda justa, el
    // margen empujaría a una página en blanco antes del índice.
    guide.howToRead.forEach((t, i, all) => content.push(P(t, i === all.length - 1 ? { margin: [0, 0, 0, 0] } : undefined)));

    // Índice con números de página
    content.push({ text: 'Índice', style: 'h2', pageBreak: 'before' });
    content.push(Rule(C.gold));
    content.push({ toc: { numberStyle: 'tocNumber' } });

    // Las secciones, en el orden del índice
    index.forEach(item => {
      if (item.part) {
        const isB = /Parte B/.test(item.part);
        content.push(partPage(isB ? 'Parte B' : 'Parte A', item.part.replace(/^Parte [AB] · /, ''),
          isB ? 'Qué significa lo que muestran sus mensajes, qué pueden hacer y cómo cuidar lo que tienen.'
            : 'Lo que muestran los datos de su conversación, sección a sección.'));
        return;
      }
      const builder = SECTION_BUILDERS[item.title];
      if (builder) content.push(...finishSection(builder(item.n, ctx)));
    });

    // Contraportada
    content.push({
      stack: [
        { text: 'Vuelve a analizar el chat en 30 días y compara.', style: 'backLine', margin: [0, 190, 0, 14] },
        P('Exporta el chat de nuevo, súbelo y pon los dos informes uno al lado del otro. Lo que ha cambiado, y lo que no, te dirá más que cualquier número de hoy.', { alignment: 'center', color: C.ink2 }),
        { text: 'yalosabia.com', style: 'brand', alignment: 'center', margin: [0, 40, 0, 0] }
      ],
      pageBreak: 'before'
    });

    const title = 'Informe de ' + names.a + ' y ' + names.b;

    return {
      pageSize: PAGE.size,
      pageMargins: PAGE.margins,
      info: { title: 'YaLoSabía · ' + title, author: 'YaLoSabía', subject: 'Informe de relación', creator: 'yalosabia.com' },
      background: function () {
        return { canvas: [{ type: 'rect', x: 0, y: 0, w: PAGE.size.width, h: PAGE.size.height, color: C.paper }] };
      },
      header: function (page, pages) {
        if (page === 1 || page === pages) return null;
        return {
          columns: [
            { text: 'YaLoSabía · ' + title, style: 'running' },
            { text: String(page), style: 'running', alignment: 'right', width: 30 }
          ],
          margin: [PAGE.margins[0], 22, PAGE.margins[2], 0]
        };
      },
      content,
      // Un título nunca se queda solo al final de una página.
      pageBreakBefore: function (node, following) {
        return !!node.headlineLevel && node.startPosition && following.length < 2 && !node.pageBreak;
      },
      defaultStyle: { font: 'Inter', fontSize: 9.2, lineHeight: 1.38, color: C.ink },
      styles: {
        brand: { font: 'Fraunces', bold: true, fontSize: 11, color: C.ink },
        cover: { font: 'Fraunces', fontSize: 32, lineHeight: 1.1, margin: [0, 0, 0, 12] },
        coverLine: { font: 'Fraunces', italics: true, fontSize: 14, lineHeight: 1.3, color: C.ink2, margin: [0, 0, 0, 14] },
        meta: { font: 'InterMedium', fontSize: 10, margin: [0, 2, 0, 0] },
        part: { font: 'Fraunces', fontSize: 28, lineHeight: 1.1 },
        h2: { font: 'Fraunces', fontSize: 19, lineHeight: 1.15, margin: [0, 0, 0, 2] },
        h3: { font: 'Fraunces', bold: true, fontSize: 12.5, lineHeight: 1.2, margin: [0, 12, 0, 5] },
        h4: { font: 'InterMedium', bold: true, fontSize: 9.5, margin: [0, 6, 0, 2] },
        lead: { font: 'Fraunces', italics: true, fontSize: 11.5, lineHeight: 1.35, color: C.ink, margin: [0, 2, 0, 8] },
        body: { margin: [0, 0, 0, 6] },
        small: { fontSize: 7.8, color: C.ink2, lineHeight: 1.3 },
        note: { fontSize: 7.8, color: C.ink2, lineHeight: 1.3, margin: [0, 2, 0, 8] },
        label: { font: 'Inter', bold: true, fontSize: 6.8, characterSpacing: 0.7, color: C.ink2 },
        bigNumber: { font: 'Fraunces', fontSize: 30, lineHeight: 1, margin: [0, 0, 0, 3] },
        th: { font: 'Inter', bold: true, fontSize: 6.5, characterSpacing: 0.5, color: C.ink2 },
        td: { fontSize: 8.6, lineHeight: 1.25 },
        script: { font: 'Fraunces', italics: true, fontSize: 10.5, lineHeight: 1.4 },
        summaryLine: { font: 'Fraunces', fontSize: 11, lineHeight: 1.35 },
        running: { fontSize: 6.8, color: C.muted },
        tocEntry: { fontSize: 9.2 },
        tocNumber: { fontSize: 9.2, color: C.ink2 },
        backLine: { font: 'Fraunces', italics: true, fontSize: 18, alignment: 'center', lineHeight: 1.25 }
      }
    };
  }

  function fileName(report) {
    const plain = (s) => clean(s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const a = plain(shortName(report.stats.personA, 'A'));
    const b = plain(shortName(report.stats.personB, 'B'));
    return 'YaLoSabia-informe-' + (a || 'A') + '-y-' + (b || 'B') + '.pdf';
  }

  function silence(hours) {
    if (hours < 48) return hours + ' horas';
    return Math.round(hours / 24) + ' días';
  }

  /* ── Navegador ── */

  const PDFMAKE_SRC = 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.23/pdfmake.min.js';
  let loading = null;

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const el = document.createElement('script');
      el.src = src;
      el.async = true;
      el.crossOrigin = 'anonymous';
      el.onload = resolve;
      el.onerror = () => reject(new Error('No se pudo cargar ' + src));
      document.head.appendChild(el);
    });
  }

  function toBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.length; i += 0x8000) {
      binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    }
    return btoa(binary);
  }

  // pdfmake (1,4 MB) y las fuentes (224 KB) se cargan solo la primera vez que
  // alguien descarga su informe. La landing no paga ese peso.
  function ensurePdfMake() {
    if (loading) return loading;
    loading = (async () => {
      if (!root.pdfMake) await loadScript(PDFMAKE_SRC);
      const vfs = {};
      await Promise.all(FONT_FILES.map(async f => {
        const res = await fetch('/fonts/' + f);
        if (!res.ok) throw new Error('No se pudo cargar la fuente ' + f);
        vfs[f] = toBase64(await res.arrayBuffer());
      }));
      root.pdfMake.vfs = vfs;
      root.pdfMake.fonts = FONTS;
      return root.pdfMake;
    })();
    loading.catch(() => { loading = null; });
    return loading;
  }

  async function download(report, guide, opts) {
    const pdfMake = await ensurePdfMake();
    const dd = build(report, guide, opts);
    const blob = await new Promise((resolve, reject) => {
      try { pdfMake.createPdf(dd).getBlob(resolve); } catch (e) { reject(e); }
    });
    const name = fileName(report);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    // El nombre del archivo lleva los nombres de pila: que el autocapture de
    // PostHog no registre este clic.
    a.className = 'ph-no-capture';
    document.body.appendChild(a);
    a.click();
    a.remove();
    // Safari en iOS abre el PDF en la misma pestaña si no respeta download;
    // se deja la URL viva un rato para que pueda terminar.
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    return { name, size: blob.size };
  }

  root.YLSReportPDF = {
    PAGE, FONTS, FONT_FILES, COLORS: C,
    clean, build, fileName, currentScore,
    radarSvg, timelineSvg, bandsSvg, calendarSvg,
    ensurePdfMake, download,
    _silence: silence
  };
})(typeof window !== 'undefined' ? window : globalThis);
