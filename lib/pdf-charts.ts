// SVG chart generators for PDF report

export function buildScoreRingSVG(score: number): string {
  const size = 180;
  const cx = size / 2;
  const cy = size / 2;
  const r = 72;
  const strokeWidth = 10;
  const circumference = 2 * Math.PI * r;
  const progress = (score / 100) * circumference;
  const gap = circumference - progress;

  const color = score >= 80 ? '#4ADE80' : score >= 60 ? '#F5C842' : score >= 40 ? '#FB923C' : '#FF2D78';

  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <defs>
      <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${color}"/>
        <stop offset="100%" stop-color="#FF2D78"/>
      </linearGradient>
      <filter id="glow">
        <feGaussianBlur stdDeviation="3" result="blur"/>
        <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#1E1B2E" stroke-width="${strokeWidth}"/>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="url(#ringGrad)" stroke-width="${strokeWidth}"
      stroke-dasharray="${progress} ${gap}" stroke-linecap="round"
      transform="rotate(-90 ${cx} ${cy})" filter="url(#glow)"/>
    <text x="${cx}" y="${cy - 8}" text-anchor="middle" font-family="'Playfair Display',serif" font-size="48" font-weight="700" fill="#FFFFFF">${score}</text>
    <text x="${cx}" y="${cy + 18}" text-anchor="middle" font-family="'DM Sans',sans-serif" font-size="16" fill="#9B96B0">/100</text>
  </svg>`;
}

export function buildTimelineSVG(
  labels: string[],
  data: number[],
  peakMonth: string,
  maxVal: number
): string {
  if (labels.length < 2) return '<svg width="680" height="260"></svg>';

  const W = 680, H = 260;
  const padL = 50, padR = 20, padT = 30, padB = 50;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;

  const xStep = chartW / (data.length - 1);
  const yScale = chartH / (maxVal * 1.1);

  // Build points
  const points = data.map((v, i) => ({
    x: padL + i * xStep,
    y: padT + chartH - v * yScale,
  }));

  // Area path (filled under the line)
  const areaPath = `M ${points[0].x} ${padT + chartH} ` +
    points.map(p => `L ${p.x} ${p.y}`).join(' ') +
    ` L ${points[points.length - 1].x} ${padT + chartH} Z`;

  // Line path
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  // Grid lines
  const gridLines = [0, 0.25, 0.5, 0.75, 1].map(frac => {
    const y = padT + chartH - frac * chartH;
    const val = Math.round(frac * maxVal * 1.1);
    return `<line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" stroke="#1E1B2E" stroke-width="1"/>
      <text x="${padL - 8}" y="${y + 4}" text-anchor="end" font-size="10" fill="#6B6780" font-family="'DM Sans',sans-serif">${val}</text>`;
  }).join('\n');

  // X-axis labels (show every Nth to avoid crowding)
  const labelStep = Math.max(1, Math.floor(labels.length / 8));
  const xLabels = labels.map((label, i) => {
    if (i % labelStep !== 0 && i !== labels.length - 1) return '';
    return `<text x="${points[i].x}" y="${H - 10}" text-anchor="middle" font-size="10" fill="#6B6780" font-family="'DM Sans',sans-serif">${label}</text>`;
  }).join('\n');

  // Peak annotation
  const peakIdx = data.indexOf(maxVal);
  const peakPoint = points[peakIdx];
  const peakAnnotation = peakPoint ? `
    <circle cx="${peakPoint.x}" cy="${peakPoint.y}" r="5" fill="#FF2D78" stroke="#0A0812" stroke-width="2"/>
    <rect x="${peakPoint.x - 45}" y="${peakPoint.y - 30}" width="90" height="20" rx="4" fill="#FF2D78" opacity="0.9"/>
    <text x="${peakPoint.x}" y="${peakPoint.y - 16}" text-anchor="middle" font-size="11" font-weight="600" fill="#FFF" font-family="'DM Sans',sans-serif">${peakMonth}: ${maxVal}</text>
  ` : '';

  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <defs>
      <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#FF2D78" stop-opacity="0.35"/>
        <stop offset="100%" stop-color="#FF2D78" stop-opacity="0.02"/>
      </linearGradient>
    </defs>
    ${gridLines}
    <path d="${areaPath}" fill="url(#areaFill)"/>
    <path d="${linePath}" fill="none" stroke="#FF2D78" stroke-width="2.5" stroke-linejoin="round"/>
    ${xLabels}
    ${peakAnnotation}
  </svg>`;
}

export function buildHorizontalBarsSVG(
  items: { label: string; value: number; color: string }[],
  maxValue?: number
): string {
  const barH = 36;
  const gap = 12;
  const padL = 10;
  const padR = 10;
  const W = 680;
  const H = items.length * (barH + gap) + gap;
  const barAreaW = W - padL - padR;
  const max = maxValue || Math.max(1, ...items.map(i => i.value));

  const bars = items.map((item, i) => {
    const y = gap + i * (barH + gap);
    const barW = Math.max(30, (item.value / max) * barAreaW * 0.85);
    return `
      <rect x="${padL}" y="${y}" width="${barAreaW}" height="${barH}" rx="6" fill="#1E1B2E"/>
      <rect x="${padL}" y="${y}" width="${barW}" height="${barH}" rx="6" fill="${item.color}" opacity="0.85"/>
      <text x="${padL + 12}" y="${y + barH / 2 + 5}" font-size="13" font-weight="600" fill="#FFF" font-family="'DM Sans',sans-serif">${item.label}</text>
      <text x="${padL + barW - 12}" y="${y + barH / 2 + 5}" text-anchor="end" font-size="13" font-weight="700" fill="#FFF" font-family="'DM Sans',sans-serif">${item.value}</text>
    `;
  }).join('\n');

  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${bars}</svg>`;
}

export function buildParticipationBarsSVG(
  personA: string, pctA: number,
  personB: string, pctB: number
): string {
  const W = 400, H = 60;
  const barH = 22;
  const wA = Math.max(20, (pctA / 100) * (W - 20));
  const wB = Math.max(20, (pctB / 100) * (W - 20));

  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <rect x="10" y="4" width="${wA}" height="${barH}" rx="4" fill="#FF2D78"/>
    <text x="18" y="20" font-size="12" font-weight="600" fill="#FFF" font-family="'DM Sans',sans-serif">${personA} ${pctA}%</text>
    <rect x="10" y="32" width="${wB}" height="${barH}" rx="4" fill="#8B5CF6"/>
    <text x="18" y="48" font-size="12" font-weight="600" fill="#FFF" font-family="'DM Sans',sans-serif">${personB} ${pctB}%</text>
  </svg>`;
}
