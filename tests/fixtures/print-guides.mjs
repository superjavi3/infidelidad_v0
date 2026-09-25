/*
 * Escribe la guía de los tres chats sintéticos en docs/v3/ para leerla sin
 * abrir la web: `npm run guide:demo`. Es la guía sin personalizar, la que se
 * entrega si la IA no responde.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { loadBrowserScripts } from '../helpers/load-browser.mjs';
import { generateChat, NOW } from './synthetic-chats.mjs';

const sb = loadBrowserScripts(['report-model.js', 'keywords.js', 'metrics.js', '../guide/blocks.js', '../guide/assemble.js']);
const { YLSMetrics, YLSGuide, YLSReport } = sb.window;
const dir = new URL('../../docs/v3/', import.meta.url);
mkdirSync(dir, { recursive: true });

const TITLES = { sano: 'sano', enfriandose: 'enfriándose', terminado: 'terminado' };

function md(kind) {
  const messages = generateChat(kind);
  const stats = sb.analyzeMessages(messages);
  const report = YLSMetrics.buildReportData(messages, stats, { now: NOW });
  const g = YLSGuide.assemble(report);
  const index = YLSReport.buildIndex({ ending: !!g.ending }).filter(s => s.n);
  const n = (title) => (index.find(s => s.title === title) || {}).n;
  const out = [];
  const p = (t) => out.push(t, '');

  p(`# Guía de ejemplo · chat ${TITLES[kind]}`);
  p(`> Generada con \`npm run guide:demo\` a partir del chat sintético \`${kind}\` (${stats.total.toLocaleString('es-MX')} mensajes, score ${stats.score}${report.recentStats ? `, últimos 90 días ${report.recentStats.score}` : ''}). Es la guía determinista, sin personalizar con IA. ${g.wordCount.toLocaleString('es-MX')} palabras.`);
  p(`**Patrones activados:** ${g.detection.concerns.map(c => `${c.id} (${c.severity})`).join(', ') || 'ninguno'}  \n**Lo que va bien:** ${g.detection.healthy.map(h => h.id).join(', ') || '—'}`);

  p('## Cómo leer este informe');
  g.howToRead.forEach(p);

  p(`## ${n('Qué significa lo que has visto')} · Qué significa lo que has visto`);
  g.intros.meaning.forEach(p);
  for (const m of g.meaning) {
    p(`### ${m.title}`);
    p(`*${m.lead}*`);
    p('**Qué suele significar.** ' + m.significa.join(' '));
    p('**Qué no significa.** ' + m.noSignifica.join(' '));
    p('**Cuándo es normal.** ' + m.normal.join(' '));
    p('**Cuándo preocupa.** ' + m.preocupa.join(' '));
    p('**Qué hacer.**');
    m.queHacer.forEach(t => out.push('- ' + t));
    out.push('');
  }
  if (g.calm.length) {
    p('### Lo que miramos y no preocupa');
    g.calm.forEach(c => p(`**${c.title}.** ${c.lead ? c.lead + ' ' : ''}${c.text}`));
  }

  p(`## ${n('Lo que sí va bien y cómo protegerlo')} · Lo que sí va bien y cómo protegerlo`);
  g.intros.going.forEach(p);
  g.goingWell.healthy.forEach(h => {
    p(`### ${h.title}`);
    p(`*${h.lead}*`);
    h.text.forEach(p);
    p(h.proteger);
    h.habitos.forEach(t => out.push('- ' + t));
    out.push('');
    p(h.vigilar);
  });
  if (g.goingWell.rituals.length) {
    p('### Los rituales que ya tienen');
    g.goingWell.rituals.forEach(r => p(`**${r.title}.** ${r.lead} ${r.text} ${r.proteger}`));
  }
  if (g.goingWell.anticipate) {
    p('### ' + g.goingWell.anticipate.title);
    g.goingWell.anticipate.paragraphs.forEach(p);
  }

  p(`## ${n('Conversaciones que merece la pena tener')} · Conversaciones que merece la pena tener`);
  g.intros.conversations.forEach(p);
  g.intros.conversationTips.forEach(t => out.push('- ' + t));
  out.push('');
  g.conversations.forEach((c, i) => {
    p(`### ${i + 1}. ${c.title}`);
    p('**Por qué.** ' + c.porque);
    p('**Cuándo.** ' + c.cuando);
    c.abrir.forEach(a => p(`**Cómo abrirla — ${a.si.toLowerCase()}.** «${a.guion}»`));
    p('**Qué escuchar.** ' + c.escuchar);
    p('**Qué evitar.** ' + c.evitar);
  });

  p(`## ${n('Un plan de 30 días')} · Un plan de 30 días`);
  g.intros.plan.forEach(p);
  g.plan.forEach(w => {
    p(`### Semana ${w.week} · ${w.focus}`);
    p(w.intro);
    w.actions.forEach(a => out.push('- [ ] ' + a));
    out.push('', '*Notas:* ___________________________', '');
  });

  p(`## ${n('Cómo cuidar la relación a partir de ahora')} · Cómo cuidar la relación a partir de ahora`);
  g.intros.care.forEach(p);
  g.care.forEach(c => { p('### ' + c.title); c.paragraphs.forEach(p); });

  if (g.ending) {
    p(`## ${n(g.ending.title)} · ${g.ending.title}`);
    g.ending.paragraphs.forEach(p);
  }

  p(`## ${n('Cuándo hablar con alguien')} · Cuándo hablar con alguien`);
  p(g.help.intro);
  g.help.signals.forEach(t => out.push('- ' + t));
  out.push('');
  p(g.help.professional);
  p('**México**');
  g.help.lines.mx.forEach(l => out.push(`- **${l.name}** · ${l.contact} — ${l.desc}`));
  out.push('');
  p('**España**');
  g.help.lines.es.forEach(l => out.push(`- **${l.name}** · ${l.contact} — ${l.desc}`));
  out.push('');
  p('*' + g.help.note + '*');

  p(`## ${n('Tu informe en 10 frases')} · Tu informe en 10 frases`);
  g.summary.forEach((t, i) => out.push(`${i + 1}. ${t}`));
  out.push('');
  return out.join('\n');
}

for (const kind of Object.keys(TITLES)) {
  const file = new URL(`guia-${kind}.md`, dir);
  writeFileSync(file, md(kind));
  console.log('escrito', file.pathname);
}
