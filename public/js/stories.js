/*
 * stories.js — la imagen para Stories (1080 × 1920).
 *
 * Se dibuja directamente en un <canvas> con las fuentes de la web, en vez de
 * fotografiar un bloque oculto con html2canvas: sale nítida, sin depender de
 * esa librería y sin sorpresas de maquetación. Lleva solo el score, una
 * frase y yalosabia.com. Ni nombres ni datos del chat: una imagen de Stories
 * la ve cualquiera.
 */
(function (root) {
  'use strict';

  const W = 1080, H = 1920;
  const C = { paper: '#F7F3EC', ink: '#1F1D1B', ink2: '#4A4642', gold: '#B9924B', accentInk: '#9C4531', line: '#DED6C9' };
  const DISPLAY = "'Fraunces', Georgia, serif";
  const BODY = "'Inter', -apple-system, 'Segoe UI', Arial, sans-serif";

  // Parte el texto en líneas que quepan en maxWidth.
  function wrap(ctx, text, maxWidth) {
    const words = String(text || '').split(/\s+/).filter(Boolean);
    const lines = [];
    let line = '';
    for (const w of words) {
      const test = line ? line + ' ' + w : w;
      if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = w; }
      else line = test;
    }
    if (line) lines.push(line);
    return lines;
  }

  async function ensureFonts(doc) {
    if (!doc || !doc.fonts || !doc.fonts.load) return;
    try {
      await Promise.all([
        doc.fonts.load("300 360px 'Fraunces'"),
        doc.fonts.load("600 64px 'Fraunces'"),
        doc.fonts.load("italic 300 60px 'Fraunces'"),
        doc.fonts.load("500 38px 'Inter'"),
        doc.fonts.load("600 28px 'Inter'")
      ]);
    } catch (e) { /* si no cargan, el canvas usa las de respaldo */ }
  }

  function draw(canvas, data) {
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = C.paper;
    ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';

    ctx.fillStyle = C.ink;
    ctx.font = '600 64px ' + DISPLAY;
    ctx.fillText('YaLoSabía', W / 2, 220);

    ctx.fillStyle = C.gold;
    ctx.fillRect(W / 2 - 60, 272, 120, 3);

    ctx.fillStyle = C.accentInk;
    ctx.font = '600 28px ' + BODY;
    ctx.fillText('S C O R E   D E   L A   C O N V E R S A C I Ó N', W / 2, 640);

    ctx.fillStyle = C.ink;
    ctx.font = '300 360px ' + DISPLAY;
    ctx.fillText(String(data.score), W / 2, 980);

    ctx.fillStyle = C.ink2;
    ctx.font = '500 38px ' + BODY;
    ctx.fillText('de 100', W / 2, 1060);

    ctx.fillStyle = C.ink;
    ctx.font = 'italic 300 60px ' + DISPLAY;
    const lines = wrap(ctx, data.phrase, 860).slice(0, 5);
    lines.forEach((l, i) => ctx.fillText(l, W / 2, 1230 + i * 80));

    ctx.fillStyle = C.line;
    ctx.fillRect(140, 1700, W - 280, 2);
    ctx.fillStyle = C.ink;
    ctx.font = '500 38px ' + BODY;
    ctx.fillText('yalosabia.com', W / 2, 1790);
    return canvas;
  }

  async function render(data, doc) {
    doc = doc || root.document;
    await ensureFonts(doc);
    return draw(doc.createElement('canvas'), data);
  }

  // En el móvil se abre la hoja de compartir del sistema (guardar en fotos,
  // Instagram…). Donde no se puede, se descarga el PNG.
  async function share(data) {
    const canvas = await render(data);
    const blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
    const file = new File([blob], 'yalosabia-score.png', { type: 'image/png' });
    if (root.navigator && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file] });
        return 'shared';
      } catch (e) {
        if (e && e.name === 'AbortError') return 'cancelled';
      }
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    a.className = 'ph-no-capture';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    return 'downloaded';
  }

  root.YLSStories = { W, H, wrap, draw, render, share };
})(typeof window !== 'undefined' ? window : globalThis);
