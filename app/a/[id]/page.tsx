import { Metadata } from 'next';
import { supabaseAdmin } from '@/lib/supabase';

type Stats = Record<string, unknown>;
type Premium = Record<string, string | null>;
type ChartImages = Record<string, string>;
interface SharedAnalysis {
  id: string;
  alias: string | null;
  score: number;
  stats: Stats;
  ai_insight: string | null;
  participant_names: string[];
  date_range: string | null;
  total_messages: number;
  views: number;
}

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  try {
    const { data } = await supabaseAdmin
      .from('shared_analyses')
      .select('score, stats, participant_names, alias, total_messages')
      .eq('id', id)
      .single();
    if (!data) return { title: 'Análisis compartido — YaLoSabía' };
    const names = data.alias || data.participant_names?.join(' y ') || 'Análisis';
    const title = `${names}: Score ${data.score}/100 — YaLoSabía`;
    const desc = `${(data.stats as Stats)?.verdict || ''} | ${(data.total_messages || 0).toLocaleString()} mensajes analizados.`;
    return {
      title, description: desc,
      robots: { index: false, follow: false },
      openGraph: { title, description: desc, url: `https://yalosabia.com/a/${id}`, siteName: 'YaLoSabía', locale: 'es_MX', type: 'website' },
      twitter: { card: 'summary_large_image', title, description: desc },
    };
  } catch { return { title: 'Análisis compartido — YaLoSabía' }; }
}

/* ═══════════════════════════════════════════════════════════════
   CSS — copied verbatim from public/index.html design system
   ═══════════════════════════════════════════════════════════════ */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Dela+Gothic+One&family=DM+Sans:wght@400;500;600;700&display=swap');

:root {
  --bg-deep: #0d0d0d;
  --bg-card: #1a1a2e;
  --pink: #FF2D78;
  --orange: #FF6B35;
  --yellow: #FFD23F;
  --green: #3BCEAC;
  --purple: #6C5CE7;
  --blue: #0984E3;
  --text: #FAFAFA;
  --text-muted: #a0a0b8;
  --radius: 20px;
  --font-display: 'Dela Gothic One', sans-serif;
  --font-body: 'DM Sans', sans-serif;
}

*,*::before,*::after { box-sizing: border-box; }

/* Override Tailwind interference */
.sa, .sa * {
  color: var(--text) !important;
  font-family: var(--font-body) !important;
}

/* Grain overlay */
.sa::before {
  content: '';
  position: fixed;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E");
  opacity: 0.04;
  pointer-events: none;
  z-index: 9999;
}

.sa {
  max-width: 640px;
  margin: 0 auto;
  padding: 48px 24px 80px;
  background: var(--bg-deep) !important;
  min-height: 100vh;
  -webkit-font-smoothing: antialiased;
  position: relative;
}
.sa a { color: inherit; text-decoration: none; }

/* ── Header ── */
.sa-header { text-align: center; margin-bottom: 40px; padding-top: 16px; }
.sa-logo { font-family: var(--font-display) !important; font-size: 1.35rem; letter-spacing: -0.5px; }
.sa-logo .pk { color: var(--pink) !important; }
.sa-sub { color: var(--text-muted) !important; font-size: 0.85rem; margin-top: 8px; }
.sa-alias { text-align: center; font-size: 1.05rem; font-weight: 600; color: var(--text-muted) !important; margin: 0 0 20px; }
.sa-meta { text-align: center; color: var(--text-muted) !important; font-size: 0.88rem; margin-bottom: 36px; line-height: 1.8; }
.sa-meta span { color: var(--text-muted) !important; }

/* ── Score Card ── */
.score-card {
  max-width: 400px; margin: 0 auto 48px;
  background: linear-gradient(135deg, var(--pink), var(--purple)) !important;
  border-radius: var(--radius); padding: 40px; text-align: center;
  position: relative; overflow: hidden;
}
.score-card::before {
  content: ''; position: absolute; inset: 0;
  background: radial-gradient(circle at 30% 20%, rgba(255,255,255,0.15), transparent 50%);
}
.score-card > * { position: relative; z-index: 1; }
.score-label { font-size: 0.85rem; text-transform: uppercase; letter-spacing: 3px; color: rgba(255,255,255,0.8) !important; margin-bottom: 12px; }
.score-number { font-family: var(--font-display) !important; font-size: 5rem; line-height: 1; color: #fff !important; margin-bottom: 4px; }
.score-max { font-size: 1.1rem; color: rgba(255,255,255,0.7) !important; }
.score-verdict { margin-top: 16px; font-size: 1.1rem; font-weight: 600; color: #fff !important; }

/* ── Plan Headers ── */
.plan-header { text-align: center; padding: 32px 0 28px; }
.plan-divider { height: 2px; border: none; margin: 0; border-radius: 2px; }
.plan-divider.free { background: linear-gradient(90deg, transparent, var(--green), transparent); }
.plan-divider.detective { background: linear-gradient(90deg, transparent, #3B82F6, transparent); }
.plan-divider.obsessive { background: linear-gradient(90deg, transparent, #EC4899, #A855F7, transparent); height: 3px; }
.plan-badge {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 0.72rem !important; font-weight: 700; letter-spacing: 2px; text-transform: uppercase;
  padding: 6px 18px; border-radius: 50px; margin-bottom: 14px;
}
.plan-badge.free { background: rgba(16,185,129,0.12); color: #10B981 !important; border: 1px solid rgba(16,185,129,0.25); }
.plan-badge.detective { background: rgba(59,130,246,0.12); color: #3B82F6 !important; border: 1px solid rgba(59,130,246,0.25); }
.plan-badge.obsessive {
  background: linear-gradient(135deg, rgba(236,72,153,0.15), rgba(168,85,247,0.15));
  color: #EC4899 !important; border: 1px solid rgba(236,72,153,0.3);
}
.plan-title { font-family: var(--font-display) !important; margin-bottom: 6px; }
.plan-title.free { font-size: 1.3rem; color: var(--text) !important; }
.plan-title.detective { font-size: 1.5rem; color: #3B82F6 !important; }
.plan-title.obsessive {
  font-size: 1.7rem;
  background: linear-gradient(135deg, #EC4899, #A855F7);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
}
.plan-subtitle { color: var(--text-muted) !important; font-size: 0.92rem; }

/* ── Stats Grid ── */
.stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 16px; margin-bottom: 48px; }
.stat-card {
  background: var(--bg-card); border-radius: var(--radius); padding: 28px;
  border: 1px solid rgba(255,255,255,0.06); text-align: center;
}
.stat-emoji { font-size: 1.8rem; margin-bottom: 12px; }
.stat-value { font-family: var(--font-display) !important; font-size: 1.8rem; margin-bottom: 4px; color: var(--text) !important; word-break: break-word; }
.stat-label { color: var(--text-muted) !important; font-size: 0.88rem; }

/* ── Fun Fact / AI Insight ── */
.fun-fact {
  background: linear-gradient(135deg, rgba(255,210,63,0.1), rgba(255,107,53,0.1));
  border: 1px solid rgba(255,210,63,0.2); border-radius: var(--radius);
  padding: 28px 32px; font-size: 0.95rem; line-height: 1.6; margin-bottom: 48px;
}
.fun-fact strong { color: var(--yellow) !important; }

/* ── Example Card / Dynamics ── */
.example-card { background: var(--bg-card); border-radius: var(--radius); padding: 32px; border: 1px solid rgba(255,255,255,0.06); margin-bottom: 48px; }
.example-label { font-size: 0.78rem !important; text-transform: uppercase; letter-spacing: 2px; color: var(--text-muted) !important; margin-bottom: 8px; }
.example-card h4 { font-family: var(--font-display) !important; font-size: 1rem; margin-bottom: 12px; }
.example-card p { color: var(--text-muted) !important; font-size: 0.9rem; line-height: 1.6; }

/* ── Premium Feature Cards ── */
.premium-feature-card {
  background: var(--bg-card); border: 1px solid rgba(255,255,255,0.06);
  border-radius: var(--radius); margin-bottom: 20px; position: relative; overflow: hidden;
}
.pf-header { display: flex; align-items: center; gap: 16px; padding: 24px 28px 0; }
.pf-icon { font-size: 2rem; flex-shrink: 0; }
.pf-title { font-family: var(--font-display) !important; font-size: 1.1rem; margin-bottom: 2px; }
.pf-subtitle { color: var(--text-muted) !important; font-size: 0.85rem; }
.pf-body { padding: 20px 28px 28px; position: relative; }
.pf-insight {
  background: rgba(108,92,231,0.1); border: 1px solid rgba(108,92,231,0.2);
  border-radius: 12px; padding: 16px 20px; margin-top: 16px;
  font-size: 0.95rem; line-height: 1.6; color: var(--text) !important;
}
.pf-insight strong { color: var(--purple) !important; }

/* Chart image */
.chart-img { width: 100%; height: auto; border-radius: 12px; margin-bottom: 16px; }

/* ══════════════════════════════════════════
   SILENCE SECTION — from index.html
   ══════════════════════════════════════════ */
.silence-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 20px; }
.silence-stat { background: rgba(255,255,255,0.04); border-radius: 12px; padding: 16px; text-align: center; }
.silence-stat-value { font-family: var(--font-display) !important; font-size: 1.5rem; margin-bottom: 4px; }
.silence-stat-label { color: var(--text-muted) !important; font-size: 0.8rem; }
.silence-timeline-visual { display: flex; flex-direction: column; gap: 8px; max-height: 400px; overflow-y: auto; }
.silence-bar {
  display: flex; align-items: center; flex-wrap: wrap; gap: 8px 12px;
  padding: 10px 14px; background: rgba(255,45,120,0.06);
  border-left: 3px solid var(--pink); border-radius: 0 8px 8px 0; font-size: 0.85rem;
}
.silence-bar-duration { font-weight: 700; color: var(--pink) !important; min-width: 60px; }
.silence-bar-info { color: var(--text-muted) !important; flex: 1; }
.silence-bar-breaker { font-weight: 600; color: var(--green) !important; font-size: 0.8rem; }
.silence-bar-message {
  width: 100%; font-size: 0.78rem; color: var(--text-muted) !important;
  font-style: italic; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}

/* ══════════════════════════════════════════
   DOUBLE TEXTING — from index.html
   ══════════════════════════════════════════ */
.dt-comparison { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 16px; }
.dt-person { text-align: center; }
.dt-person-name { font-family: var(--font-display) !important; font-size: 0.95rem; margin-bottom: 8px; }
.dt-person-count { font-family: var(--font-display) !important; font-size: 2.5rem; margin-bottom: 4px; }
.dt-person-label { color: var(--text-muted) !important; font-size: 0.8rem; }
.dt-bar-track { height: 8px; background: rgba(255,255,255,0.06); border-radius: 4px; margin-top: 8px; overflow: hidden; }
.dt-bar-fill { height: 100%; border-radius: 4px; transition: width 1s ease; }
.dt-bar-fill.pink { background: var(--pink); }
.dt-bar-fill.purple { background: var(--purple); }

/* ══════════════════════════════════════════
   MULTIMEDIA — from index.html
   ══════════════════════════════════════════ */
.mm-row { display: flex; align-items: center; gap: 12px; padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.04); }
.mm-row:last-child { border-bottom: none; }
.mm-icon { font-size: 1.3rem; flex-shrink: 0; width: 28px; text-align: center; }
.mm-label { font-size: 0.85rem; min-width: 110px; flex-shrink: 0; }
.mm-label span { color: var(--text-muted) !important; font-size: 0.78rem; }
.mm-bar-wrap { flex: 1; display: flex; height: 20px; border-radius: 10px; background: rgba(255,255,255,0.04); }
.mm-bar-a { background: var(--pink); height: 100%; border-radius: 10px 0 0 10px; min-width: 0; }
.mm-bar-b { background: var(--purple); height: 100%; border-radius: 0 10px 10px 0; min-width: 0; }
.mm-counts { font-size: 0.72rem; color: rgba(255,255,255,0.6) !important; white-space: nowrap; flex-shrink: 0; }
.mm-king { font-family: var(--font-display) !important; font-size: 0.78rem; font-weight: 700; color: var(--pink) !important; flex-shrink: 0; }
.mm-empty { color: var(--text-muted) !important; font-size: 0.8rem; font-weight: 500; flex: 1; }
.mm-ratio-wrap { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 16px; }
.mm-ratio-card { background: rgba(255,255,255,0.04); border-radius: 10px; padding: 14px 16px; }
.mm-ratio-name { font-family: var(--font-display) !important; font-size: 0.9rem; margin-bottom: 6px; }
.mm-ratio-bar { height: 6px; background: rgba(255,255,255,0.06); border-radius: 3px; overflow: hidden; margin-bottom: 4px; }
.mm-ratio-fill { height: 100%; border-radius: 3px; transition: width .8s ease; }
.mm-ratio-pct { font-family: var(--font-display) !important; font-size: 1.4rem; }
.mm-ratio-label { color: var(--text-muted) !important; font-size: 0.75rem; }

/* ══════════════════════════════════════════
   DELETED MESSAGES — from index.html
   ══════════════════════════════════════════ */
.deleted-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.deleted-stat-card { background: rgba(255,255,255,0.04); border-radius: 12px; padding: 20px; text-align: center; }
.deleted-stat-value { font-family: var(--font-display) !important; font-size: 2rem; margin-bottom: 4px; color: var(--pink) !important; }
.deleted-stat-label { color: var(--text-muted) !important; font-size: 0.82rem; }

/* ══════════════════════════════════════════
   FORENSIC — from index.html
   ══════════════════════════════════════════ */
.forensic-point {
  background: rgba(255,45,120,0.06); border-left: 3px solid var(--pink);
  border-radius: 0 12px 12px 0; padding: 16px 20px; margin-bottom: 12px;
}
.forensic-date { font-family: var(--font-display) !important; font-size: 1rem; color: var(--pink) !important; margin-bottom: 6px; }
.forensic-detail { color: var(--text-muted) !important; font-size: 0.88rem; line-height: 1.5; margin-bottom: 4px; }
.forensic-detail strong { color: var(--text) !important; }
.forensic-keywords { margin-top: 8px; font-size: 0.82rem; color: var(--text-muted) !important; }
.forensic-chip {
  display: inline-block; background: rgba(108,92,231,0.15); border: 1px solid rgba(108,92,231,0.25);
  border-radius: 50px; padding: 4px 10px; color: var(--purple) !important; margin: 2px 3px;
}
.forensic-quote {
  background: rgba(255,255,255,0.05); border-radius: 8px; padding: 8px 12px;
  margin: 8px 0; display: block; color: var(--text) !important; font-style: italic; line-height: 1.4;
}
.forensic-quote-expand { background: none; border: none; color: var(--pink) !important; cursor: pointer; font-weight: 600; font-size: 0.8rem; }

/* ══════════════════════════════════════════
   BEFORE VS NOW — from index.html
   ══════════════════════════════════════════ */
.bvn-grid { display: flex; flex-direction: column; gap: 16px; }
.bvn-person {
  background: rgba(255,255,255,0.03); border-radius: 12px; padding: 16px;
  border: 1px solid rgba(255,255,255,0.06);
}
.bvn-person-header {
  font-family: var(--font-display) !important; font-size: 0.95rem; font-weight: 700;
  margin-bottom: 12px; display: flex; align-items: center; gap: 8px;
}
.bvn-person-dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
.bvn-table { width: 100%; border-collapse: separate; border-spacing: 0; }
.bvn-table th {
  font-family: var(--font-display) !important; font-size: 0.85rem; text-transform: uppercase;
  letter-spacing: 0.05em; padding: 12px 16px; border-bottom: 2px solid rgba(255,255,255,0.08);
}
.bvn-table th:first-child { text-align: left; color: var(--text-muted) !important; }
.bvn-table th:nth-child(2) { text-align: center; color: var(--green) !important; }
.bvn-table th:nth-child(3) { text-align: center; color: var(--pink) !important; }
.bvn-table th:nth-child(4) { text-align: center; color: var(--text-muted) !important; }
.bvn-table td { padding: 10px 16px; font-size: 0.9rem; border-bottom: 1px solid rgba(255,255,255,0.04); }
.bvn-table td:first-child { color: var(--text-muted) !important; font-weight: 500; }
.bvn-table td:nth-child(2),
.bvn-table td:nth-child(3) { text-align: center; font-family: var(--font-display) !important; font-size: 1.05rem; }
.bvn-table td:nth-child(4) { text-align: center; font-weight: 700; }
.bvn-change-negative { color: #FF4757 !important; }
.bvn-change-positive { color: var(--green) !important; }
.bvn-change-neutral { color: var(--text-muted) !important; }

/* ══════════════════════════════════════════
   GHOSTING — from index.html
   ══════════════════════════════════════════ */
.ghosting-hero {
  text-align: center; padding: 24px 20px; margin-bottom: 20px;
  background: rgba(255,45,120,0.06); border-radius: 16px; border: 1px solid rgba(255,45,120,0.15);
}
.ghosting-hero--ok { background: rgba(59,206,172,0.08); border-color: rgba(59,206,172,0.15); }
.ghosting-ratio { font-family: var(--font-display) !important; font-size: 3rem; font-weight: 900; color: var(--pink) !important; line-height: 1.1; }
.ghosting-hero--ok .ghosting-ratio { color: var(--green) !important; }
.ghosting-label { font-size: 0.9rem; color: var(--text-muted) !important; margin-top: 8px; line-height: 1.4; }
.ghosting-pattern {
  display: flex; align-items: center; gap: 12px;
  padding: 12px 16px; margin-bottom: 8px; border-radius: 10px;
}
.ghosting-pattern.fast { background: rgba(59,206,172,0.08); border-left: 3px solid var(--green); }
.ghosting-pattern.slow { background: rgba(255,71,87,0.08); border-left: 3px solid #FF4757; }
.ghosting-icon { font-size: 1.3rem; flex-shrink: 0; }
.ghosting-text { font-size: 0.9rem; line-height: 1.4; color: var(--text-muted) !important; }
.ghosting-text strong { color: var(--text) !important; }
.ghosting-words { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 12px; }
.ghosting-word { font-size: 0.78rem; padding: 4px 12px; border-radius: 50px; font-weight: 600; }
.ghosting-word.trigger { background: rgba(255,71,87,0.15); color: #FF4757 !important; }
.ghosting-word.safe { background: rgba(59,206,172,0.15); color: var(--green) !important; }
.ghosting-category {
  display: flex; align-items: center; gap: 12px;
  padding: 12px 16px; border-radius: 10px; background: rgba(255,255,255,0.03);
  border-left: 3px solid var(--green); margin-bottom: 8px;
}
.ghosting-category.warn { border-left-color: #FF6B35; }
.ghosting-category.danger { border-left-color: var(--pink); }
.ghosting-cat-emoji { font-size: 1.2rem; flex-shrink: 0; }
.ghosting-cat-info { flex: 1; min-width: 0; }
.ghosting-cat-name { font-size: 0.88rem; font-weight: 600; color: var(--text) !important; }
.ghosting-cat-time { font-size: 0.82rem; color: var(--text-muted) !important; }
.ghosting-cat-status { font-size: 0.78rem; font-weight: 700; flex-shrink: 0; white-space: nowrap; }
.ghosting-worst {
  background: rgba(255,45,120,0.06); border-left: 3px solid var(--pink);
  border-radius: 0 12px 12px 0; padding: 16px 20px; margin-top: 16px;
}
.ghosting-worst-title { font-size: 0.82rem; color: var(--pink) !important; font-weight: 700; margin-bottom: 8px; }
.ghosting-worst-msg { font-style: italic; font-size: 0.85rem; color: var(--text) !important; margin-bottom: 6px; }
.ghosting-worst-meta { font-size: 0.75rem; color: var(--text-muted) !important; }

/* ══════════════════════════════════════════
   LANGUAGE CHANGES — from index.html
   ══════════════════════════════════════════ */
.lang-change-card { background: rgba(255,255,255,0.03); border-radius: 12px; padding: 16px 20px; margin-bottom: 10px; }
.lang-change-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.lang-change-label { font-weight: 600; font-size: 0.9rem; }
.lang-change-badge { font-size: 0.75rem; font-weight: 700; padding: 3px 10px; border-radius: 50px; }
.lang-change-badge.alert { background: rgba(255,71,87,0.15); color: #FF4757 !important; }
.lang-change-badge.ok { background: rgba(59,206,172,0.15); color: var(--green) !important; }
.lang-change-bars { display: flex; gap: 4px; align-items: flex-end; height: 32px; }
.lang-bar { flex: 1; border-radius: 2px 2px 0 0; min-height: 3px; transition: height 0.5s ease; }
.lang-change-legend { display: flex; justify-content: space-between; margin-top: 4px; font-size: 0.72rem; color: var(--text-muted) !important; }
.language-comparison { display: grid; grid-template-columns: 1fr auto 1fr; gap: 12px; margin-bottom: 20px; align-items: center; }
.language-period-label { font-size: 0.7rem; color: var(--text-muted) !important; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.05em; }
.language-message { padding: 12px; font-size: 0.85rem; color: var(--text) !important; font-style: italic; line-height: 1.5; }
.language-message--warm { background: rgba(107,203,119,0.1); border-left: 3px solid #6BCB77; border-radius: 0 8px 8px 0; }
.language-message--cold { background: rgba(255,45,120,0.1); border-left: 3px solid var(--pink); border-radius: 0 8px 8px 0; }
.language-date { font-size: 0.72rem; color: var(--text-muted) !important; margin-top: 6px; }
.language-vs { display: flex; align-items: center; justify-content: center; font-weight: 900; color: var(--pink) !important; font-size: 1.2rem; }
.language-words { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
.language-word { font-size: 0.78rem; padding: 4px 12px; border-radius: 50px; font-weight: 600; }
.language-word.affective { background: rgba(255,45,120,0.2); color: var(--pink) !important; border: 1px solid rgba(255,45,120,0.3); }
.language-word.normal { background: rgba(108,92,231,0.15); color: var(--purple) !important; }
.language-word.distancing { background: rgba(255,107,53,0.15); color: #FF6B35 !important; }

/* ── Views / CTA / Footer ── */
.sa-views { text-align: center; color: var(--text-muted) !important; font-size: 0.82rem; margin-bottom: 40px; }
.sa-cta {
  text-align: center;
  background: linear-gradient(135deg, rgba(255,45,120,0.08), rgba(108,92,231,0.08));
  border: 1px solid rgba(255,45,120,0.15); border-radius: var(--radius);
  padding: 40px 24px; margin-bottom: 32px;
}
.sa-cta-icon { font-size: 2.4rem; margin-bottom: 14px; }
.sa-cta h3 { font-family: var(--font-display) !important; font-size: 1.2rem; margin-bottom: 10px; }
.sa-cta p { color: var(--text-muted) !important; font-size: 0.9rem; margin-bottom: 20px; line-height: 1.5; }
.btn-main {
  display: inline-block; background: linear-gradient(135deg, var(--pink), var(--orange));
  color: #fff !important; padding: 14px 32px; border-radius: 50px;
  font-family: var(--font-body) !important; font-size: 1rem; font-weight: 700;
  transition: transform .2s, box-shadow .2s;
}
.btn-main:hover { transform: translateY(-2px); box-shadow: 0 8px 30px rgba(255,45,120,0.35); }
.sa-footer { text-align: center; color: var(--text-muted) !important; font-size: 0.78rem; }
.sa-footer .pk { color: var(--pink) !important; }
.sa-error {
  background: #2a1020; border: 1px solid var(--pink); border-radius: 12px;
  padding: 20px; margin-bottom: 24px; color: var(--pink) !important; font-size: 0.85rem; word-break: break-all;
}

/* ── Responsive ── */
@media (max-width: 480px) {
  .sa { padding: 32px 16px 60px; }
  .score-number { font-size: 4rem; }
  .score-card { padding: 32px 24px; }
  .stats-grid { grid-template-columns: repeat(2, 1fr); gap: 12px; }
  .stat-card { padding: 20px 16px; }
  .stat-value { font-size: 1.4rem; }
  .stat-emoji { font-size: 1.5rem; margin-bottom: 8px; }
  .pf-header { padding: 20px 20px 0; }
  .pf-body { padding: 16px 20px 24px; }
  .example-card { padding: 24px 20px; }
  .fun-fact { padding: 20px 24px; }
  .silence-stats { grid-template-columns: 1fr; }
  .dt-comparison { grid-template-columns: 1fr; }
  .deleted-stats { grid-template-columns: 1fr; }
  .mm-row { flex-wrap: wrap; }
  .mm-counts { width: 100%; padding-left: 40px; margin-top: -4px; font-size: 0.68rem; }
  .bvn-table { font-size: 0.8rem; }
  .bvn-table th, .bvn-table td { padding: 8px 6px; }
  .bvn-table td:nth-child(2), .bvn-table td:nth-child(3) { font-size: 0.9rem; }
  .bvn-grid { gap: 12px; }
  .language-comparison { grid-template-columns: 1fr; }
}
`;

// Premium section definitions
const DETECTIVE_SECTIONS: { key: string; icon: string; title: string; sub: string }[] = [
  { key: 'timeline', icon: '📉', title: 'Línea de Vida de la Relación', sub: 'Intensidad mes a mes: auge, pico y declive' },
  { key: 'silences', icon: '🔇', title: 'Mapa de Silencios', sub: 'Momentos donde la conversación se detuvo por 48+ horas' },
  { key: 'doubleText', icon: '😤', title: 'Double Texting', sub: '5+ mensajes seguidos sin respuesta' },
  { key: 'multimedia', icon: '📱', title: 'Reyes del Multimedia', sub: 'Quién habla y quién manda archivos' },
  { key: 'deleted', icon: '🗑️', title: 'Mensajes Eliminados', sub: 'Lo que no quisieron que vieras' },
];
const OBSESIVO_SECTIONS: { key: string; icon: string; title: string; sub: string }[] = [
  { key: 'forensic', icon: '🕵️', title: 'Reconstrucción Forense', sub: 'Puntos de inflexión: el día exacto donde algo cambió' },
  { key: 'beforeNow', icon: '💔', title: 'Devastador: Antes vs Ahora', sub: 'Comparación brutal de los primeros meses vs los últimos' },
  { key: 'ghosting', icon: '📱', title: 'Ghosting Selectivo', sub: '¿Te ignora cuando más lo necesitas?' },
  { key: 'language', icon: '🎯', title: 'Cómo ha cambiado su forma de hablarte', sub: 'El lenguaje dice lo que las palabras callan' },
];

export default async function SharedAnalysisPage({ params }: PageProps) {
  const { id } = await params;

  const { data, error } = await supabaseAdmin
    .from('shared_analyses')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    return (
      <>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Dela+Gothic+One&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <style dangerouslySetInnerHTML={{ __html: CSS }} />
        <div className="sa">
          <div className="sa-header">
            <a href="https://www.yalosabia.com" className="sa-logo">YaLo<span className="pk">Sabía</span></a>
          </div>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ fontSize: '3rem', marginBottom: 12 }}>🔍</div>
            <h1 style={{ fontFamily: "'Dela Gothic One',sans-serif", fontSize: '1.3rem', marginBottom: 12 }}>Análisis no encontrado</h1>
            <p style={{ color: '#a0a0b8', marginBottom: 24 }}>Este enlace no existe o ha expirado.</p>
          </div>
          <div className="sa-cta">
            <h3>¿Quieres analizar tu propio chat?</h3>
            <p>Sube tu chat de WhatsApp y descubre qué dicen tus mensajes</p>
            <a href="https://www.yalosabia.com" className="btn-main">Analizar mi chat →</a>
          </div>
        </div>
      </>
    );
  }

  const a = data as SharedAnalysis;
  const s = a.stats || {};
  const premium = (s.premium as Premium) || {};
  const chartImages = (s.chartImages as ChartImages) || {};
  const n = (key: string): number => Number(s[key]) || 0;
  const v = (key: string): string => String(s[key] ?? '');
  const firstName = (key: string): string => String(s[key] || '?').split(' ')[0];

  supabaseAdmin.rpc('increment_views', { analysis_id: id }).then();

  const hasDetective = DETECTIVE_SECTIONS.some(sec => premium[sec.key]);
  const hasObsesivo = OBSESIVO_SECTIONS.some(sec => premium[sec.key]);

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=Dela+Gothic+One&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      <div className="sa">

        {/* ── Header ── */}
        <div className="sa-header">
          <a href="https://www.yalosabia.com" className="sa-logo">YaLo<span className="pk">Sabía</span></a>
          <div className="sa-sub">Análisis de chat compartido</div>
        </div>

        {a.alias && <div className="sa-alias">&quot;{a.alias}&quot;</div>}

        {/* ── Meta ── */}
        <div className="sa-meta">
          {a.participant_names?.length >= 2 && (
            <div><span>{a.participant_names[0]}</span> y <span>{a.participant_names[1]}</span></div>
          )}
          {a.date_range && <div>{a.date_range}</div>}
          <div>{(a.total_messages || 0).toLocaleString()} mensajes analizados</div>
        </div>

        {/* ── Score Card ── */}
        <div className="score-card">
          <div className="score-label">Score de la relación</div>
          <div className="score-number">{a.score}</div>
          <div className="score-max">de 100</div>
          <div className="score-verdict">{v('verdict')}</div>
        </div>

        {/* ══════ SECCIÓN 1: PLAN GRATIS ══════ */}
        <div className="plan-divider free" />
        <div className="plan-header">
          <div className="plan-badge free">✨ GRATIS</div>
          <div className="plan-title free">Análisis Básico</div>
          <div className="plan-subtitle">Estadísticas generales de tu conversación</div>
        </div>

        {/* Stats Grid */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-emoji">💬</div>
            <div className="stat-value">{n('msgsA').toLocaleString()}</div>
            <div className="stat-label">Mensajes de {firstName('personA')}</div>
          </div>
          <div className="stat-card">
            <div className="stat-emoji">💬</div>
            <div className="stat-value">{n('msgsB').toLocaleString()}</div>
            <div className="stat-label">Mensajes de {firstName('personB')}</div>
          </div>
          <div className="stat-card">
            <div className="stat-emoji">⏱️</div>
            <div className="stat-value">{v('avgReplyFormatted') || '—'}</div>
            <div className="stat-label">Tiempo promedio de respuesta</div>
          </div>
          <div className="stat-card">
            <div className="stat-emoji">🌙</div>
            <div className="stat-value">{n('nightPct')}%</div>
            <div className="stat-label">Mensajes nocturnos (12am-5am)</div>
          </div>
          <div className="stat-card">
            <div className="stat-emoji">❤️</div>
            <div className="stat-value">{n('loveCount').toLocaleString()}</div>
            <div className="stat-label">Emojis de amor enviados</div>
          </div>
          <div className="stat-card">
            <div className="stat-emoji">📅</div>
            <div className="stat-value">{n('uniqueDays')}</div>
            <div className="stat-label">Días de conversación</div>
          </div>
        </div>

        {/* AI Insight */}
        {a.ai_insight && (
          <div className="fun-fact">
            🤖 <strong>Insight con IA:</strong> {a.ai_insight}
          </div>
        )}

        {/* Dynamics Card */}
        <div className="example-card">
          <div className="example-label">⚡ Dinámica</div>
          <h4>Quién lleva la relación</h4>
          <p>
            {n('leaderPct') >= 55
              ? `${firstName('leader')} lleva la relación con ${n('leaderPct')}% de los mensajes. Ratio: ${v('ratio') || '?'}.`
              : `Relación equilibrada: ${firstName('personA')} (${n('leaderPct')}%) y ${firstName('personB')} (${100 - n('leaderPct')}%). Ratio: ${v('ratio') || '?'}.`
            }
          </p>
        </div>

        {/* ══════ SECCIÓN 2: PLAN DETECTIVE ══════ */}
        {hasDetective && (
          <>
            <div className="plan-divider detective" />
            <div className="plan-header">
              <div className="plan-badge detective">🔍 DETECTIVE</div>
              <div className="plan-title detective">Análisis Profundo</div>
              <div className="plan-subtitle">Patrones ocultos en tu conversación</div>
            </div>

            {DETECTIVE_SECTIONS.map(sec => {
              const body = premium[sec.key];
              if (!body) return null;
              return (
                <div key={sec.key} className="premium-feature-card">
                  <div className="pf-header">
                    <span className="pf-icon">{sec.icon}</span>
                    <div>
                      <div className="pf-title">{sec.title}</div>
                      <div className="pf-subtitle">{sec.sub}</div>
                    </div>
                  </div>
                  <div className="pf-body">
                    {sec.key === 'timeline' && chartImages.timeline && (
                      <img className="chart-img" src={chartImages.timeline} alt="Línea de Vida de la Relación" />
                    )}
                    <div dangerouslySetInnerHTML={{ __html: body }} />
                  </div>
                </div>
              );
            })}
          </>
        )}

        {/* ══════ SECCIÓN 3: PLAN OBSESIVO ══════ */}
        {hasObsesivo && (
          <>
            <div className="plan-divider obsessive" />
            <div className="plan-header">
              <div className="plan-badge obsessive">🔬 OBSESIVO</div>
              <div className="plan-title obsessive">Análisis Obsesivo</div>
              <div className="plan-subtitle">4 análisis devastadores para quien necesita saber TODO</div>
            </div>

            {OBSESIVO_SECTIONS.map(sec => {
              const body = premium[sec.key];
              if (!body) return null;
              return (
                <div key={sec.key} className="premium-feature-card">
                  <div className="pf-header">
                    <span className="pf-icon">{sec.icon}</span>
                    <div>
                      <div className="pf-title">{sec.title}</div>
                      <div className="pf-subtitle">{sec.sub}</div>
                    </div>
                  </div>
                  <div className="pf-body">
                    <div dangerouslySetInnerHTML={{ __html: body }} />
                  </div>
                </div>
              );
            })}
          </>
        )}

        {/* Views */}
        <div className="sa-views">👁️ Este análisis ha sido visto {(a.views || 0) + 1} veces</div>

        {/* ── CTA ── */}
        <div className="sa-cta">
          <div className="sa-cta-icon">💬</div>
          <h3>¿Quieres analizar tu propio chat?</h3>
          <p>Sube tu chat de WhatsApp y descubre qué dicen tus mensajes sobre tu relación</p>
          <a href="https://www.yalosabia.com" className="btn-main">Analizar mi chat →</a>
        </div>

        {/* Footer */}
        <div className="sa-footer">
          <a href="https://www.yalosabia.com" className="pk">yalosabia.com</a> — Analiza tu chat de WhatsApp con IA
        </div>
      </div>
    </>
  );
}
