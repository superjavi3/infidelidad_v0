// Generador de exports de WhatsApp para probar la web (se inyecta en el preview estático).
(function () {
  const ES = ['hola amor', '¿cómo te fue hoy?', 'ya voy saliendo', 'jajaja', 'te extraño', '¿comemos juntos?', 'buenas noches', 'qué día más largo', 'llego en 10', 'mañana te veo', 'ok', 'va', 'te quiero', 'estoy muy bien contigo', 'ya llegué', '¿dónde estás?', 'perdón, no vi tu mensaje', 'me encantó la cena', 'no se me olvida', 'gracias por existir'];
  const EN = ['hey babe', 'how was your day?', 'on my way', 'lol', 'miss you', 'lunch together?', 'good night', 'long day', 'be there in 10', 'see you tomorrow', 'ok', 'sure', 'I love you', 'so happy with you', 'home now', 'where are you?', 'sorry, missed your message', 'loved dinner', 'thank you'];
  const PT = ['oi amor', 'como foi seu dia?', 'estou saindo', 'kkkkk', 'saudade', 'boa noite', 'te amo', 'chego em 10'];
  const pad = n => String(n).padStart(2, '0');
  const NB = ' ';

  // fmt: android-es | android-es-12h | ios-es | ios-en | android-en | android-4digit
  function line(fmt, d, sender, text) {
    const D = d.getDate(), M = d.getMonth() + 1, Y = d.getFullYear(), yy = String(Y).slice(2);
    const h = d.getHours(), mi = pad(d.getMinutes()), s = pad(d.getSeconds());
    const h12 = ((h + 11) % 12) + 1, pm = h >= 12;
    switch (fmt) {
      case 'android-es': return `${pad(D)}/${pad(M)}/${yy}, ${pad(h)}:${mi} - ${sender}: ${text}`;
      case 'android-es-12h': return `${D}/${M}/${yy}, ${h12}:${mi} ${pm ? 'p. m.' : 'a. m.'} - ${sender}: ${text}`;
      case 'ios-es': return `[${D}/${M}/${yy}, ${pad(h)}:${mi}:${s}] ${sender}: ${text}`;
      case 'ios-en': return `[${M}/${D}/${yy}, ${h12}:${mi}:${s}${NB}${pm ? 'PM' : 'AM'}] ${sender}: ${text}`;
      case 'android-en': return `${M}/${D}/${yy}, ${h12}:${mi}${NB}${pm ? 'PM' : 'AM'} - ${sender}: ${text}`;
      case 'android-4digit': return `${pad(D)}/${pad(M)}/${Y}, ${pad(h)}:${mi} - ${sender}: ${text}`;
    }
  }
  function sys(fmt, d, text) { // aviso sin remitente
    const l = line(fmt, d, 'X', 'x');
    return l.replace(/(\] |- )X: x$/, '$1' + text);
  }

  // opts: { n, fmt, lang, people:[..], days, extras:true, crlf, bom }
  window.genChat = function (opts) {
    const n = opts.n, fmt = opts.fmt || 'android-es', people = opts.people || ['Ana López', 'Diego ❤️'];
    const words = opts.lang === 'en' ? EN : opts.lang === 'pt' ? PT : opts.lang === 'mix' ? ES.concat(EN) : ES;
    const days = opts.days || Math.max(3, Math.min(900, Math.ceil(n / 40)));
    const start = new Date(2023, 1, 14, 9, 0, 0).getTime();
    const out = [];
    if (opts.extras !== false) {
      out.push(sys(fmt, new Date(start - 60000), fmt.endsWith('en') ? 'Messages and calls are end-to-end encrypted. No one outside of this chat can read them.' : 'Los mensajes y las llamadas están cifrados de extremo a extremo. Nadie fuera de este chat puede leerlos.'));
    }
    let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < n; i++) {
      const t = start + Math.floor((i / n) * days * 86400000) + Math.floor(rnd() * 3600000);
      const d = new Date(t);
      const who = people[(rnd() < 0.52 ? 0 : 1) % people.length] || people[i % people.length];
      const sender = people.length > 2 ? people[i % people.length] : who;
      let text = words[Math.floor(rnd() * words.length)];
      if (opts.extras !== false) {
        const r = rnd();
        if (r < 0.03) text = fmt.endsWith('en') ? '<Media omitted>' : '<Multimedia omitido>';
        else if (r < 0.04) text = fmt.endsWith('en') ? 'This message was deleted' : 'Se eliminó este mensaje';
        else if (r < 0.05) text = 'audio omitido';
        else if (r < 0.06) text = text + '\nsegunda línea del mismo mensaje\ny otra más';
        else if (r < 0.065) text = 'https://www.instagram.com/p/abc123/';
        else if (r < 0.07) text = '😂😂😂';
      }
      out.push(line(fmt, d, sender, text));
    }
    let txt = out.join(opts.crlf ? '\r\n' : '\n');
    if (opts.bom) txt = '﻿' + txt;
    return txt;
  };

  // Procesa un chat y mide
  window.runCase = async function (name, opts) {
    const text = typeof opts === 'string' ? opts : window.genChat(opts);
    const t0 = performance.now();
    const alerts = []; const oa = window.alert; window.alert = m => alerts.push(String(m));
    let err = null;
    window.lastStats = null;
    try { await processChat(text); } catch (e) { err = String(e); }
    window.alert = oa;
    const ms = Math.round(performance.now() - t0);
    const res = document.getElementById('resultsSection');
    const visible = res && getComputedStyle(res).display !== 'none' && lastStats;
    let payloadKB = null, gzipKB = null;
    if (visible && lastMessages) {
      const p = JSON.stringify({ messages: diaryPayload(lastMessages) });
      payloadKB = Math.round(p.length / 1024);
      try {
        const st = new Blob([p]).stream().pipeThrough(new CompressionStream('gzip'));
        gzipKB = Math.round((await new Response(st).blob()).size / 1024);
      } catch (e) {}
    }
    const f = lastMessages && lastMessages[0] ? parseMessageDate(lastMessages[0].date, lastMessages[0].time, lastMessages[0].ampm) : null;
    return {
      name, bytesKB: Math.round(text.length / 1024), ms, alerts, err,
      preview: !!visible, msgs: lastMessages ? lastMessages.length : 0,
      order: typeof CHAT_DATE_ORDER !== 'undefined' ? CHAT_DATE_ORDER : '?',
      first: f && !isNaN(f) ? f.toISOString().slice(0, 16) : null,
      score: lastStats ? (lastStats.score ?? lastStats.index ?? null) : null,
      people: lastStats ? (lastStats.personA || '') + ' / ' + (lastStats.personB || '') : '',
      fp: (window.currentChatFp || '').slice(0, 8), payloadKB, gzipKB,
      header: res ? res.innerText.slice(0, 90).replace(/\n+/g, ' | ') : '',
    };
  };

  // Genera el PDF (con el /api/analyze simulado del preview) y mide
  window.runPdf = async function () {
    rememberPurchase('cs_test_'.padEnd(24, 'z'), window.currentChatFp); onNewChatLoaded(); unlockPlan();
    Object.keys(localStorage).filter(k => k.startsWith('yls_diary_')).forEach(k => localStorage.removeItem(k));
    window.diaryPromise = null; window.lastDiary = null;
    const ou = URL.createObjectURL; let pdf = null; URL.createObjectURL = b => { if (b.type === 'application/pdf') pdf = Math.round(b.size / 1024); return ou.call(URL, b); };
    const alerts = []; const oa = window.alert; window.alert = m => alerts.push(String(m));
    const t0 = performance.now();
    try { await generatePDF(); } catch (e) { alerts.push('THROW ' + e); }
    URL.createObjectURL = ou; window.alert = oa;
    return { pdfKB: pdf, ms: Math.round(performance.now() - t0), alerts };
  };
})();
