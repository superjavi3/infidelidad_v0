import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase';

interface SharedAnalysis {
  id: string;
  created_at: string;
  alias: string | null;
  score: number;
  stats: {
    personA: string;
    personB: string;
    msgsA: number;
    msgsB: number;
    total: number;
    score: number;
    verdict: string;
    loveCount: number;
    nightPct: number;
    uniqueDays: number;
    avgReplyFormatted: string;
    leader: string;
    leaderPct: number;
    ratio: string;
    silencesCount: number;
    totalDouble: number;
  };
  ai_insight: string | null;
  participant_names: string[];
  date_range: string | null;
  total_messages: number;
  views: number;
}

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const { data } = await supabaseAdmin
    .from('shared_analyses')
    .select('score, stats, participant_names, alias, total_messages')
    .eq('id', id)
    .single();

  if (!data) {
    return { title: 'Análisis no encontrado — YaLoSabía' };
  }

  const names = data.alias || data.participant_names.join(' y ');
  const title = `${names}: Score ${data.score}/100 — YaLoSabía`;
  const description = `${data.stats.verdict} | ${data.total_messages.toLocaleString()} mensajes analizados. Descubre qué dicen los chats sobre tu relación.`;

  return {
    title,
    description,
    robots: { index: false, follow: false },
    openGraph: {
      title,
      description,
      url: `https://yalosabia.com/a/${id}`,
      siteName: 'YaLoSabía',
      locale: 'es_MX',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

export default async function SharedAnalysisPage({ params }: PageProps) {
  const { id } = await params;

  const { data, error } = await supabaseAdmin
    .from('shared_analyses')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    notFound();
  }

  const analysis = data as SharedAnalysis;
  const s = analysis.stats;

  // Increment views server-side (fire and forget)
  supabaseAdmin.rpc('increment_views', { analysis_id: id }).then();

  const statCards = [
    { emoji: '💬', value: s.msgsA?.toLocaleString() ?? '0', label: `Mensajes de ${s.personA?.split(' ')[0] ?? '?'}` },
    { emoji: '💬', value: s.msgsB?.toLocaleString() ?? '0', label: `Mensajes de ${s.personB?.split(' ')[0] ?? '?'}` },
    { emoji: '⏱️', value: s.avgReplyFormatted ?? '—', label: 'Tiempo de respuesta' },
    { emoji: '🌙', value: `${s.nightPct ?? 0}%`, label: 'Mensajes nocturnos' },
    { emoji: '❤️', value: s.loveCount?.toLocaleString() ?? '0', label: 'Emojis de amor' },
    { emoji: '📅', value: String(s.uniqueDays ?? 0), label: 'Días de conversación' },
  ];

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Dela+Gothic+One&family=DM+Sans:wght@400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0d0d0d; color: #FAFAFA; font-family: 'DM Sans', sans-serif; -webkit-font-smoothing: antialiased; }
        .sa-container { max-width: 560px; margin: 0 auto; padding: 40px 20px 80px; }
        .sa-header { text-align: center; margin-bottom: 36px; }
        .sa-logo { font-family: 'Dela Gothic One', sans-serif; font-size: 1.4rem; color: #FAFAFA; text-decoration: none; }
        .sa-logo span { color: #FF2D78; }
        .sa-subtitle { color: #a0a0b8; font-size: 0.85rem; margin-top: 8px; }
        .sa-alias { text-align: center; font-size: 1.05rem; font-weight: 600; color: #a0a0b8; margin-bottom: 20px; }
        .sa-meta { text-align: center; color: #a0a0b8; font-size: 0.88rem; margin-bottom: 32px; line-height: 1.6; }
        .sa-score-card { max-width: 360px; margin: 0 auto 40px; background: linear-gradient(135deg, #FF2D78, #6C5CE7); border-radius: 20px; padding: 36px 24px; text-align: center; position: relative; overflow: hidden; }
        .sa-score-glow { position: absolute; inset: 0; background: radial-gradient(circle at 30% 20%, rgba(255,255,255,0.15), transparent 50%); }
        .sa-score-inner { position: relative; z-index: 1; }
        .sa-score-label { font-size: 0.8rem; text-transform: uppercase; letter-spacing: 3px; opacity: 0.8; margin-bottom: 10px; }
        .sa-score-num { font-family: 'Dela Gothic One', sans-serif; font-size: 4.5rem; line-height: 1; }
        .sa-score-max { font-size: 1rem; opacity: 0.7; margin-top: 2px; }
        .sa-score-verdict { margin-top: 14px; font-size: 1.05rem; font-weight: 600; }
        .sa-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 40px; }
        .sa-stat { background: #1a1a2e; border-radius: 16px; padding: 20px 16px; border: 1px solid rgba(255,255,255,0.06); text-align: center; }
        .sa-stat-emoji { font-size: 1.5rem; margin-bottom: 8px; }
        .sa-stat-value { font-family: 'Dela Gothic One', sans-serif; font-size: 1.4rem; margin-bottom: 4px; word-break: break-word; }
        .sa-stat-label { color: #a0a0b8; font-size: 0.78rem; line-height: 1.3; }
        .sa-dynamics { background: #1a1a2e; border-radius: 16px; padding: 24px 20px; border: 1px solid rgba(255,255,255,0.06); margin-bottom: 40px; }
        .sa-dynamics-tag { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 2px; color: #a0a0b8; margin-bottom: 6px; }
        .sa-dynamics h4 { font-family: 'Dela Gothic One', sans-serif; font-size: 0.95rem; margin-bottom: 10px; }
        .sa-dynamics p { color: #a0a0b8; font-size: 0.88rem; line-height: 1.6; }
        .sa-insight { background: linear-gradient(135deg, rgba(255,210,63,0.1), rgba(255,107,53,0.1)); border: 1px solid rgba(255,210,63,0.2); border-radius: 16px; padding: 24px 20px; margin-bottom: 40px; font-size: 0.95rem; line-height: 1.6; text-align: center; }
        .sa-insight strong { color: #FFD23F; }
        .sa-cta { text-align: center; background: linear-gradient(135deg, rgba(255,45,120,0.08), rgba(108,92,231,0.08)); border: 1px solid rgba(255,45,120,0.15); border-radius: 20px; padding: 40px 24px; margin-bottom: 32px; }
        .sa-cta-icon { font-size: 2.2rem; margin-bottom: 14px; }
        .sa-cta h3 { font-family: 'Dela Gothic One', sans-serif; font-size: 1.2rem; margin-bottom: 10px; }
        .sa-cta p { color: #a0a0b8; font-size: 0.9rem; margin-bottom: 20px; line-height: 1.5; }
        .sa-cta-btn { display: inline-block; background: linear-gradient(135deg, #FF2D78, #FF6B35); color: white; padding: 14px 32px; border-radius: 50px; font-family: 'DM Sans', sans-serif; font-size: 1rem; font-weight: 700; text-decoration: none; }
        .sa-footer { text-align: center; color: #a0a0b8; font-size: 0.78rem; }
        .sa-footer a { color: #FF2D78; text-decoration: none; }
        @media (max-width: 400px) {
          .sa-container { padding: 28px 16px 60px; }
          .sa-score-num { font-size: 3.8rem; }
          .sa-score-card { padding: 28px 20px; }
          .sa-grid { gap: 10px; }
          .sa-stat { padding: 16px 12px; }
          .sa-stat-value { font-size: 1.2rem; }
        }
      ` }} />

      <div className="sa-container">

        {/* Header */}
        <div className="sa-header">
          <a href="https://www.yalosabia.com" className="sa-logo">
            YaLo<span>Sabía</span>
          </a>
          <p className="sa-subtitle">Análisis de chat compartido</p>
        </div>

        {/* Alias */}
        {analysis.alias && (
          <p className="sa-alias">&quot;{analysis.alias}&quot;</p>
        )}

        {/* Meta info */}
        <div className="sa-meta">
          {analysis.participant_names.length >= 2 && (
            <p>{analysis.participant_names[0]} y {analysis.participant_names[1]}</p>
          )}
          {analysis.date_range && <p>{analysis.date_range}</p>}
          <p>{analysis.total_messages.toLocaleString()} mensajes analizados</p>
        </div>

        {/* Score Card */}
        <div className="sa-score-card">
          <div className="sa-score-glow" />
          <div className="sa-score-inner">
            <div className="sa-score-label">Score de la relación</div>
            <div className="sa-score-num">{analysis.score}</div>
            <div className="sa-score-max">de 100</div>
            <div className="sa-score-verdict">{s.verdict}</div>
          </div>
        </div>

        {/* Stats Grid — 2 columns, mobile safe */}
        <div className="sa-grid">
          {statCards.map((stat, i) => (
            <div key={i} className="sa-stat">
              <div className="sa-stat-emoji">{stat.emoji}</div>
              <div className="sa-stat-value">{stat.value}</div>
              <div className="sa-stat-label">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Who Leads */}
        <div className="sa-dynamics">
          <div className="sa-dynamics-tag">⚡ Dinámica</div>
          <h4>Quién lleva la relación</h4>
          <p>
            {s.leaderPct >= 55
              ? `${s.leader?.split(' ')[0] ?? '?'} lleva la relación con ${s.leaderPct}% de los mensajes.`
              : `Relación equilibrada: ${s.personA?.split(' ')[0] ?? '?'} (${s.leaderPct}%) y ${s.personB?.split(' ')[0] ?? '?'} (${100 - s.leaderPct}%).`
            }
          </p>
        </div>

        {/* AI Insight */}
        {analysis.ai_insight && (
          <div className="sa-insight">
            🤖 <strong>Insight con IA:</strong> {analysis.ai_insight}
          </div>
        )}

        {/* CTA */}
        <div className="sa-cta">
          <div className="sa-cta-icon">💬</div>
          <h3>¿Quieres analizar tu propio chat?</h3>
          <p>Sube tu chat de WhatsApp y descubre qué dicen tus mensajes sobre tu relación</p>
          <a href="https://www.yalosabia.com" className="sa-cta-btn">
            Analizar mi chat →
          </a>
        </div>

        {/* Footer */}
        <div className="sa-footer">
          <p>👁️ {analysis.views + 1} vistas</p>
          <p style={{ marginTop: 8 }}>
            <a href="https://www.yalosabia.com">yalosabia.com</a> — Analiza tu chat de WhatsApp con IA
          </p>
        </div>
      </div>
    </>
  );
}
