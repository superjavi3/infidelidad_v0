import {
  buildScoreRingSVG,
  buildTimelineSVG,
  buildHorizontalBarsSVG,
  buildParticipationBarsSVG,
} from './pdf-charts';

export interface PDFData {
  stats: {
    personA: string;
    personB: string;
    total: number;
    msgsA: number;
    msgsB: number;
    uniqueDays: number;
    score: number;
    leader: string;
    leaderPct: number;
    avgReply: number;
    nightPct: number;
    loveCount: number;
    ratio: number;
  };
  timeline: {
    labels: string[];
    data: number[];
    peakMonth: string;
    maxVal: number;
    declineMonth: string | null;
    declinePct: number;
  };
  silences: {
    total: number;
    longest: { hours: number } | null;
    brokeCount: Record<string, number>;
  };
  doubleTexting: Record<string, number[]>;
  deletedMessages: {
    deleted: Record<string, number>;
    total: number;
  };
  beforeAfter: {
    metrics: {
      label: string;
      before: number;
      after: number;
      changePct: number;
      suffix?: string;
    }[];
    beforeLabel: string;
    afterLabel: string;
  } | null;
  aiSummary: string;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildPDFHTML(data: PDFData): string {
  const { stats, timeline, silences, doubleTexting, deletedMessages, beforeAfter, aiSummary } = data;
  const pA = stats.personA || 'Persona A';
  const pB = stats.personB || 'Persona B';
  const pctA = Math.round((stats.msgsA / stats.total) * 100);
  const pctB = 100 - pctA;
  const today = new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });

  const verdict = stats.score >= 80 ? 'Relación intensa y equilibrada'
    : stats.score >= 60 ? 'Relación con altibajos'
    : stats.score >= 40 ? 'Relación con áreas de mejora'
    : 'Relación con desafíos importantes';

  // --- Charts ---
  const scoreRing = buildScoreRingSVG(stats.score);
  const timelineChart = buildTimelineSVG(timeline.labels, timeline.data, timeline.peakMonth, timeline.maxVal);

  // Silence bars
  const silenceBrokeItems = Object.entries(silences.brokeCount).map(([name, count], i) => ({
    label: `${name} rompe el silencio`,
    value: count as number,
    color: i === 0 ? '#FF2D78' : '#8B5CF6',
  }));
  const silenceBars = silenceBrokeItems.length > 0
    ? buildHorizontalBarsSVG(silenceBrokeItems)
    : '';

  // Double texting bars
  const dtItems = Object.entries(doubleTexting).map(([name, episodes], i) => ({
    label: `${name}`,
    value: (episodes as number[]).length,
    color: i === 0 ? '#FF2D78' : '#8B5CF6',
  }));
  const dtBars = dtItems.length > 0 ? buildHorizontalBarsSVG(dtItems) : '';

  // Deleted messages bars
  const delItems = Object.entries(deletedMessages.deleted).map(([name, count], i) => ({
    label: `${name}`,
    value: count as number,
    color: i === 0 ? '#FF2D78' : '#8B5CF6',
  }));
  const delBars = delItems.length > 0 ? buildHorizontalBarsSVG(delItems) : '';

  const participationBars = buildParticipationBarsSVG(pA, pctA, pB, pctB);

  // AI Summary sections
  const summaryBlocks = parseAISummary(aiSummary);

  // Before/After table rows
  const beforeAfterRows = beforeAfter?.metrics?.map(m => {
    const changeColor = m.changePct > 20 ? '#4ADE80' : m.changePct < -20 ? '#FF2D78' : '#9B96B0';
    const arrow = m.changePct > 0 ? '▲' : m.changePct < 0 ? '▼' : '—';
    return `<tr>
      <td class="metric-label">${escapeHtml(m.label)}</td>
      <td class="metric-val">${m.before}${m.suffix || ''}</td>
      <td class="metric-val">${m.after}${m.suffix || ''}</td>
      <td class="metric-change" style="color:${changeColor}">${arrow} ${Math.abs(m.changePct)}%</td>
    </tr>`;
  }).join('\n') || '';

  const longestDays = silences.longest ? Math.round(silences.longest.hours / 24) : 0;
  const longestHours = silences.longest ? silences.longest.hours : 0;

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"/>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700;800&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet"/>
<style>
  @page { size: A4; margin: 0; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'DM Sans', 'DejaVu Sans', sans-serif;
    background: #0A0812;
    color: #EDE9F8;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .page {
    width: 210mm;
    height: 297mm;
    padding: 32px 36px;
    position: relative;
    overflow: hidden;
    page-break-after: always;
    background: #0A0812;
  }
  .page:last-child { page-break-after: auto; }

  /* Cover */
  .cover {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    background: linear-gradient(165deg, #0A0812 0%, #1A0F2E 40%, #0A0812 100%);
  }
  .cover .brand {
    font-family: 'Playfair Display', serif;
    font-size: 18px;
    font-weight: 600;
    color: #FF2D78;
    letter-spacing: 2px;
    text-transform: uppercase;
    margin-bottom: 6px;
  }
  .cover .subtitle {
    font-size: 13px;
    color: #9B96B0;
    margin-bottom: 28px;
  }
  .score-ring { margin-bottom: 20px; }
  .cover .names {
    font-family: 'Playfair Display', serif;
    font-size: 28px;
    font-weight: 700;
    color: #FFFFFF;
    margin-bottom: 6px;
  }
  .cover .verdict {
    font-size: 15px;
    color: #F5C842;
    font-weight: 500;
    margin-bottom: 32px;
  }
  .stat-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
    width: 100%;
    max-width: 460px;
    margin-bottom: 28px;
  }
  .stat-card {
    background: #120F1E;
    border: 1px solid #1E1B2E;
    border-radius: 10px;
    padding: 16px 18px;
    text-align: left;
  }
  .stat-card .val {
    font-size: 22px;
    font-weight: 700;
    color: #FFFFFF;
    margin-bottom: 2px;
  }
  .stat-card .lbl {
    font-size: 11px;
    color: #9B96B0;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .participation { margin-bottom: 20px; }
  .cover-date {
    font-size: 11px;
    color: #6B6780;
    position: absolute;
    bottom: 28px;
  }

  /* Section pages */
  .page-title {
    font-family: 'Playfair Display', serif;
    font-size: 26px;
    font-weight: 700;
    color: #FFFFFF;
    margin-bottom: 4px;
  }
  .page-subtitle {
    font-size: 13px;
    color: #9B96B0;
    margin-bottom: 28px;
  }
  .accent-line {
    width: 50px;
    height: 3px;
    background: linear-gradient(90deg, #FF2D78, #8B5CF6);
    border-radius: 2px;
    margin: 10px 0 24px;
  }
  .section-card {
    background: #120F1E;
    border: 1px solid #1E1B2E;
    border-radius: 12px;
    padding: 24px;
    margin-bottom: 18px;
  }
  .section-card h3 {
    font-family: 'Playfair Display', serif;
    font-size: 16px;
    font-weight: 600;
    color: #FF2D78;
    margin-bottom: 12px;
  }
  .chart-container {
    display: flex;
    justify-content: center;
    margin: 16px 0;
  }
  .chart-container svg { max-width: 100%; height: auto; }

  /* Stats row */
  .stats-row {
    display: flex;
    gap: 16px;
    margin-bottom: 18px;
  }
  .mini-stat {
    background: #1E1B2E;
    border-radius: 8px;
    padding: 14px 18px;
    flex: 1;
    text-align: center;
  }
  .mini-stat .num {
    font-size: 26px;
    font-weight: 700;
    color: #F5C842;
  }
  .mini-stat .desc {
    font-size: 11px;
    color: #9B96B0;
    margin-top: 2px;
  }

  /* Before/After table */
  .comparison-table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0 6px;
  }
  .comparison-table th {
    font-size: 11px;
    color: #9B96B0;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    padding: 8px 12px;
    text-align: left;
    font-weight: 600;
  }
  .comparison-table td {
    padding: 10px 12px;
    font-size: 13px;
  }
  .comparison-table tr td {
    background: #120F1E;
  }
  .comparison-table tr td:first-child { border-radius: 8px 0 0 8px; }
  .comparison-table tr td:last-child { border-radius: 0 8px 8px 0; }
  .metric-label { color: #EDE9F8; font-weight: 500; }
  .metric-val { color: #FFFFFF; font-weight: 600; }
  .metric-change { font-weight: 700; font-size: 12px; }

  /* AI summary */
  .ai-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
  }
  .ai-block {
    background: #120F1E;
    border: 1px solid #1E1B2E;
    border-radius: 10px;
    padding: 18px;
  }
  .ai-block.full-width {
    grid-column: 1 / -1;
  }
  .ai-block h4 {
    font-family: 'Playfair Display', serif;
    font-size: 14px;
    font-weight: 600;
    margin-bottom: 8px;
  }
  .ai-block p {
    font-size: 12px;
    line-height: 1.6;
    color: #C8C3D8;
  }
  .ai-estado h4 { color: #F5C842; }
  .ai-fortalezas h4 { color: #4ADE80; }
  .ai-atencion h4 { color: #FF2D78; }
  .ai-recomendacion h4 { color: #8B5CF6; }

  /* Closing page */
  .closing {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    background: linear-gradient(165deg, #0A0812 0%, #1A0F2E 50%, #0A0812 100%);
  }
  .closing .logo-big {
    font-family: 'Playfair Display', serif;
    font-size: 42px;
    font-weight: 800;
    background: linear-gradient(135deg, #FF2D78, #F5C842);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    margin-bottom: 12px;
  }
  .closing .tagline {
    font-size: 16px;
    color: #9B96B0;
    margin-bottom: 36px;
  }
  .closing .close-date {
    font-size: 12px;
    color: #6B6780;
  }
  .closing .close-url {
    font-size: 14px;
    color: #FF2D78;
    font-weight: 600;
    margin-top: 8px;
  }

  /* Page footer */
  .page-footer {
    position: absolute;
    bottom: 20px;
    left: 0;
    right: 0;
    text-align: center;
    font-size: 10px;
    color: #4A4660;
  }

  /* Insight text */
  .insight-text {
    font-size: 12px;
    color: #9B96B0;
    line-height: 1.5;
    margin-top: 12px;
    padding: 12px 16px;
    background: #1E1B2E;
    border-radius: 8px;
    border-left: 3px solid #FF2D78;
  }

  .combined-section { margin-bottom: 24px; }
  .combined-section h3 {
    font-family: 'Playfair Display', serif;
    font-size: 16px;
    font-weight: 600;
    color: #F5C842;
    margin-bottom: 12px;
  }
</style>
</head>
<body>

<!-- ═══ PAGE 1: COVER ═══ -->
<div class="page cover">
  <div class="brand">LoSabía.mx</div>
  <div class="subtitle">Reporte Detective de Relación</div>
  <div class="score-ring">${scoreRing}</div>
  <div class="names">${escapeHtml(pA)} & ${escapeHtml(pB)}</div>
  <div class="verdict">${verdict}</div>
  <div class="stat-grid">
    <div class="stat-card">
      <div class="val">${stats.total.toLocaleString()}</div>
      <div class="lbl">Mensajes totales</div>
    </div>
    <div class="stat-card">
      <div class="val">${stats.uniqueDays}</div>
      <div class="lbl">Días de conversación</div>
    </div>
    <div class="stat-card">
      <div class="val">${stats.avgReply} min</div>
      <div class="lbl">Respuesta promedio</div>
    </div>
    <div class="stat-card">
      <div class="val">${stats.loveCount.toLocaleString()}</div>
      <div class="lbl">Emojis de amor</div>
    </div>
  </div>
  <div class="participation">${participationBars}</div>
  <div class="cover-date">${today}</div>
</div>

<!-- ═══ PAGE 2: TIMELINE ═══ -->
<div class="page">
  <div class="page-title">Línea de Vida</div>
  <div class="accent-line"></div>
  <div class="page-subtitle">Evolución mensual de mensajes a lo largo del tiempo</div>
  <div class="section-card">
    <div class="chart-container">${timelineChart}</div>
    ${timeline.declineMonth ? `
    <div class="insight-text">
      El punto más alto fue en <strong>${escapeHtml(timeline.peakMonth)}</strong> con <strong>${timeline.maxVal.toLocaleString()}</strong> mensajes.
      ${timeline.declineMonth ? `A partir de <strong>${escapeHtml(timeline.declineMonth)}</strong> se detecta una caída del <strong>${timeline.declinePct}%</strong>.` : ''}
    </div>` : `
    <div class="insight-text">
      El punto más alto fue en <strong>${escapeHtml(timeline.peakMonth)}</strong> con <strong>${timeline.maxVal.toLocaleString()}</strong> mensajes.
    </div>`}
  </div>
  <div class="page-footer">LoSabía.mx — Análisis de relaciones con IA</div>
</div>

<!-- ═══ PAGE 3: SILENCES ═══ -->
<div class="page">
  <div class="page-title">Mapa de Silencios</div>
  <div class="accent-line"></div>
  <div class="page-subtitle">Períodos de más de 48 horas sin mensajes</div>
  <div class="stats-row">
    <div class="mini-stat">
      <div class="num">${silences.total}</div>
      <div class="desc">Silencios totales</div>
    </div>
    <div class="mini-stat">
      <div class="num">${longestDays}d</div>
      <div class="desc">Silencio más largo</div>
    </div>
    <div class="mini-stat">
      <div class="num">${longestHours}h</div>
      <div class="desc">En horas</div>
    </div>
  </div>
  ${silenceBars ? `
  <div class="section-card">
    <h3>¿Quién rompe el silencio?</h3>
    <div class="chart-container">${silenceBars}</div>
  </div>` : `
  <div class="section-card">
    <h3>Sin silencios prolongados</h3>
    <p style="color:#9B96B0;font-size:13px;">No se detectaron períodos de silencio mayores a 48 horas. ¡Buena comunicación!</p>
  </div>`}
  <div class="page-footer">LoSabía.mx — Análisis de relaciones con IA</div>
</div>

<!-- ═══ PAGE 4: DOUBLE TEXTING + DELETED ═══ -->
<div class="page">
  <div class="page-title">Mensajes y Patrones</div>
  <div class="accent-line"></div>

  <div class="combined-section">
    <h3>Double Texting (5+ mensajes sin respuesta)</h3>
    ${dtItems.length > 0 ? `
    <div class="section-card">
      <div class="chart-container">${dtBars}</div>
      <div class="insight-text">
        Cuando alguien envía 5 o más mensajes consecutivos sin respuesta,
        puede indicar ansiedad o necesidad de atención en la conversación.
      </div>
    </div>` : `
    <div class="section-card">
      <p style="color:#9B96B0;font-size:13px;">No se detectaron episodios significativos de double texting.</p>
    </div>`}
  </div>

  <div class="combined-section">
    <h3>Mensajes Eliminados</h3>
    ${deletedMessages.total > 0 ? `
    <div class="section-card">
      <div class="stats-row">
        <div class="mini-stat">
          <div class="num">${deletedMessages.total}</div>
          <div class="desc">Total eliminados</div>
        </div>
        ${delItems.map(item => `
        <div class="mini-stat">
          <div class="num">${item.value}</div>
          <div class="desc">${escapeHtml(item.label)}</div>
        </div>`).join('')}
      </div>
      ${delBars ? `<div class="chart-container">${delBars}</div>` : ''}
    </div>` : `
    <div class="section-card">
      <p style="color:#9B96B0;font-size:13px;">No se detectaron mensajes eliminados.</p>
    </div>`}
  </div>
  <div class="page-footer">LoSabía.mx — Análisis de relaciones con IA</div>
</div>

<!-- ═══ PAGE 5: BEFORE VS NOW ═══ -->
<div class="page">
  <div class="page-title">Antes vs Ahora</div>
  <div class="accent-line"></div>
  ${beforeAfter ? `
  <div class="page-subtitle">Comparación entre ${escapeHtml(beforeAfter.beforeLabel)} y ${escapeHtml(beforeAfter.afterLabel)}</div>
  <div class="section-card">
    <table class="comparison-table">
      <thead>
        <tr>
          <th>Métrica</th>
          <th>Antes</th>
          <th>Ahora</th>
          <th>Cambio</th>
        </tr>
      </thead>
      <tbody>
        ${beforeAfterRows}
      </tbody>
    </table>
  </div>
  ${(() => {
    const bigChanges = beforeAfter.metrics
      .filter(m => Math.abs(m.changePct) > 30)
      .sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct))
      .slice(0, 4);
    if (bigChanges.length === 0) return `
      <div class="insight-text">No se detectaron cambios significativos mayores al 30%.</div>`;
    return `
      <div class="section-card">
        <h3 style="color:#F5C842;">Cambios principales</h3>
        ${bigChanges.map(m => {
          const dir = m.changePct > 0 ? 'Aumento' : 'Disminución';
          const icon = m.changePct > 0 ? '📈' : '📉';
          return `<p style="font-size:13px;color:#C8C3D8;margin-bottom:6px;">${icon} <strong>${escapeHtml(m.label)}</strong>: ${dir} de ${Math.abs(m.changePct)}%</p>`;
        }).join('')}
      </div>`;
  })()}
  ` : `
  <div class="page-subtitle">Comparación temporal de la relación</div>
  <div class="section-card">
    <p style="color:#9B96B0;font-size:14px;text-align:center;padding:40px 0;">
      No hay suficientes datos para la comparación Antes vs Ahora.<br/>
      Se necesitan al menos 2 meses de conversación.
    </p>
  </div>`}
  <div class="page-footer">LoSabía.mx — Análisis de relaciones con IA</div>
</div>

<!-- ═══ PAGE 6: AI ANALYSIS ═══ -->
<div class="page">
  <div class="page-title">Análisis de IA</div>
  <div class="accent-line"></div>
  <div class="page-subtitle">Resumen generado por inteligencia artificial</div>
  <div class="ai-grid">
    <div class="ai-block ai-estado">
      <h4>Estado de la relación</h4>
      <p>${escapeHtml(summaryBlocks.estado)}</p>
    </div>
    <div class="ai-block ai-fortalezas">
      <h4>Fortalezas</h4>
      <p>${escapeHtml(summaryBlocks.fortalezas)}</p>
    </div>
    <div class="ai-block ai-atencion">
      <h4>Áreas de atención</h4>
      <p>${escapeHtml(summaryBlocks.atencion)}</p>
    </div>
    <div class="ai-block ai-recomendacion full-width">
      <h4>Recomendación</h4>
      <p>${escapeHtml(summaryBlocks.recomendacion)}</p>
    </div>
  </div>
  <div class="page-footer">LoSabía.mx — Análisis de relaciones con IA</div>
</div>

<!-- ═══ PAGE 7: CLOSING ═══ -->
<div class="page closing">
  <div class="logo-big">LoSabía.mx</div>
  <div class="tagline">Análisis de relaciones con inteligencia artificial</div>
  <div style="width:120px;height:3px;background:linear-gradient(90deg,#FF2D78,#F5C842);border-radius:2px;margin-bottom:36px;"></div>
  <div style="color:#C8C3D8;font-size:14px;max-width:400px;text-align:center;line-height:1.7;">
    Este reporte fue generado analizando <strong>${stats.total.toLocaleString()}</strong> mensajes
    entre <strong>${escapeHtml(pA)}</strong> y <strong>${escapeHtml(pB)}</strong>
    a lo largo de <strong>${stats.uniqueDays}</strong> días de conversación.
  </div>
  <div class="close-date" style="margin-top:40px;">${today}</div>
  <div class="close-url">losabía.mx</div>
</div>

</body>
</html>`;
}

function parseAISummary(text: string): {
  estado: string;
  fortalezas: string;
  atencion: string;
  recomendacion: string;
} {
  const fallback = {
    estado: 'Resumen no disponible.',
    fortalezas: '',
    atencion: '',
    recomendacion: '',
  };

  if (!text || text.length < 10) return fallback;

  // Try to parse numbered sections from the AI output
  const clean = text.replace(/\*\*/g, '').replace(/\*/g, '');

  // Match sections by numbered headings or keywords
  const estadoMatch = clean.match(/(?:1\.\s*)?(?:Estado actual[^:]*:|Estado[^:]*:)\s*([\s\S]*?)(?=(?:2\.\s*)?(?:Fortaleza|Área|Recomend)|\n\n\d\.|\z)/i);
  const fortalezasMatch = clean.match(/(?:2\.\s*)?(?:Fortaleza[^:]*:)\s*([\s\S]*?)(?=(?:3\.\s*)?(?:Área|Atención|Recomend)|\n\n\d\.|\z)/i);
  const atencionMatch = clean.match(/(?:3\.\s*)?(?:Área[^:]*:|Atención[^:]*:)\s*([\s\S]*?)(?=(?:4\.\s*)?Recomend|\n\n\d\.|\z)/i);
  const recomendacionMatch = clean.match(/(?:4\.\s*)?(?:Recomendaci[oó]n[^:]*:)\s*([\s\S]*?)$/i);

  if (estadoMatch || fortalezasMatch || atencionMatch || recomendacionMatch) {
    return {
      estado: (estadoMatch?.[1] || '').trim().slice(0, 500) || fallback.estado,
      fortalezas: (fortalezasMatch?.[1] || '').trim().slice(0, 500) || fallback.fortalezas,
      atencion: (atencionMatch?.[1] || '').trim().slice(0, 500) || fallback.atencion,
      recomendacion: (recomendacionMatch?.[1] || '').trim().slice(0, 500) || fallback.recomendacion,
    };
  }

  // Fallback: split roughly into quarters
  const lines = clean.split('\n').filter(l => l.trim());
  const quarter = Math.ceil(lines.length / 4);
  return {
    estado: lines.slice(0, quarter).join(' ').trim() || fallback.estado,
    fortalezas: lines.slice(quarter, quarter * 2).join(' ').trim() || fallback.fortalezas,
    atencion: lines.slice(quarter * 2, quarter * 3).join(' ').trim() || fallback.atencion,
    recomendacion: lines.slice(quarter * 3).join(' ').trim() || fallback.recomendacion,
  };
}
