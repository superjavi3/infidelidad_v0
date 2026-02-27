import { Metadata } from 'next';
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

  try {
    const { data } = await supabaseAdmin
      .from('shared_analyses')
      .select('score, stats, participant_names, alias, total_messages')
      .eq('id', id)
      .single();

    if (!data) {
      return { title: 'Análisis compartido — YaLoSabía' };
    }

    const names = data.alias || data.participant_names?.join(' y ') || 'Análisis';
    const verdict = data.stats?.verdict || '';
    const total = data.total_messages || 0;
    const title = `${names}: Score ${data.score}/100 — YaLoSabía`;
    const description = `${verdict} | ${total.toLocaleString()} mensajes analizados. Descubre qué dicen los chats sobre tu relación.`;

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
      twitter: { card: 'summary_large_image', title, description },
    };
  } catch {
    return { title: 'Análisis compartido — YaLoSabía' };
  }
}

const PAGE_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Dela+Gothic+One&family=DM+Sans:wght@400;500;600;700&display=swap');
  .sa * { box-sizing: border-box; margin: 0; padding: 0; }
  .sa { max-width: 560px; margin: 0 auto; padding: 40px 20px 80px; font-family: 'DM Sans', sans-serif; color: #FAFAFA; -webkit-font-smoothing: antialiased; background: #0d0d0d; min-height: 100vh; }
  .sa a { color: inherit; text-decoration: none; }
  .sa-header { text-align: center; margin-bottom: 36px; }
  .sa-logo { font-family: 'Dela Gothic One', sans-serif; font-size: 1.4rem; color: #FAFAFA; }
  .sa-accent { color: #FF2D78; }
  .sa-muted { color: #a0a0b8; }
  .sa-sub { color: #a0a0b8; font-size: 0.85rem; margin-top: 8px; }
  .sa-alias { text-align: center; font-size: 1.05rem; font-weight: 600; color: #a0a0b8; margin-bottom: 20px; }
  .sa-meta { text-align: center; color: #a0a0b8; font-size: 0.88rem; margin-bottom: 32px; line-height: 1.8; }
  .sa-score { max-width: 360px; margin: 0 auto 40px; background: linear-gradient(135deg, #FF2D78, #6C5CE7); border-radius: 20px; padding: 36px 24px; text-align: center; position: relative; overflow: hidden; }
  .sa-score-glow { position: absolute; inset: 0; background: radial-gradient(circle at 30% 20%, rgba(255,255,255,0.15), transparent 50%); pointer-events: none; }
  .sa-score-z { position: relative; z-index: 1; }
  .sa-score-lbl { font-size: 0.8rem; text-transform: uppercase; letter-spacing: 3px; color: rgba(255,255,255,0.8); margin-bottom: 10px; }
  .sa-score-num { font-family: 'Dela Gothic One', sans-serif; font-size: 4.5rem; line-height: 1; color: #fff; }
  .sa-score-max { font-size: 1rem; color: rgba(255,255,255,0.7); margin-top: 2px; }
  .sa-score-v { margin-top: 14px; font-size: 1.05rem; font-weight: 600; color: #fff; }
  .sa-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 40px; }
  .sa-card { background: #1a1a2e; border-radius: 16px; padding: 20px 16px; border: 1px solid rgba(255,255,255,0.06); text-align: center; overflow: hidden; }
  .sa-card-e { font-size: 1.5rem; margin-bottom: 8px; }
  .sa-card-v { font-family: 'Dela Gothic One', sans-serif; font-size: 1.4rem; margin-bottom: 4px; word-break: break-word; color: #FAFAFA; }
  .sa-card-l { color: #a0a0b8; font-size: 0.78rem; line-height: 1.3; }
  .sa-dyn { background: #1a1a2e; border-radius: 16px; padding: 24px 20px; border: 1px solid rgba(255,255,255,0.06); margin-bottom: 40px; }
  .sa-dyn-tag { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 2px; color: #a0a0b8; margin-bottom: 6px; }
  .sa-dyn h4 { font-family: 'Dela Gothic One', sans-serif; font-size: 0.95rem; margin-bottom: 10px; color: #FAFAFA; }
  .sa-dyn p { color: #a0a0b8; font-size: 0.88rem; line-height: 1.6; }
  .sa-ai { background: linear-gradient(135deg, rgba(255,210,63,0.1), rgba(255,107,53,0.1)); border: 1px solid rgba(255,210,63,0.2); border-radius: 16px; padding: 24px 20px; margin-bottom: 40px; font-size: 0.95rem; line-height: 1.6; text-align: center; color: #FAFAFA; }
  .sa-ai strong { color: #FFD23F; }
  .sa-views { text-align: center; color: #a0a0b8; font-size: 0.82rem; margin-bottom: 40px; }
  .sa-cta { text-align: center; background: linear-gradient(135deg, rgba(255,45,120,0.08), rgba(108,92,231,0.08)); border: 1px solid rgba(255,45,120,0.15); border-radius: 20px; padding: 40px 24px; margin-bottom: 32px; }
  .sa-cta-ico { font-size: 2.2rem; margin-bottom: 14px; }
  .sa-cta h3 { font-family: 'Dela Gothic One', sans-serif; font-size: 1.2rem; margin-bottom: 10px; color: #FAFAFA; }
  .sa-cta p { color: #a0a0b8; font-size: 0.9rem; margin-bottom: 20px; line-height: 1.5; }
  .sa-btn { display: inline-block; background: linear-gradient(135deg, #FF2D78, #FF6B35); color: #fff; padding: 14px 32px; border-radius: 50px; font-family: 'DM Sans', sans-serif; font-size: 1rem; font-weight: 700; }
  .sa-ft { text-align: center; color: #a0a0b8; font-size: 0.78rem; }
  .sa-err { background: #2a1020; border: 1px solid #FF2D78; border-radius: 12px; padding: 20px; margin-bottom: 24px; color: #FF2D78; font-size: 0.85rem; word-break: break-all; }
  @media (max-width: 400px) {
    .sa { padding: 28px 16px 60px; }
    .sa-score-num { font-size: 3.8rem; }
    .sa-score { padding: 28px 20px; }
    .sa-grid { gap: 10px; }
    .sa-card { padding: 16px 12px; }
    .sa-card-v { font-size: 1.2rem; }
  }
`;

export default async function SharedAnalysisPage({ params }: PageProps) {
  const { id } = await params;

  console.log('[SA] Fetching id:', id);
  console.log('[SA] SUPABASE_URL:', process.env.SUPABASE_URL ? 'SET' : 'MISSING');
  console.log('[SA] SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? 'SET (' + process.env.SUPABASE_ANON_KEY.substring(0, 10) + '...)' : 'MISSING');

  const { data, error } = await supabaseAdmin
    .from('shared_analyses')
    .select('*')
    .eq('id', id)
    .single();

  console.log('[SA] Query result — error:', JSON.stringify(error), 'data:', data ? JSON.stringify(data).substring(0, 300) : 'NULL');

  // If query failed or no data, show error page with diagnostics
  if (error || !data) {
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: PAGE_CSS }} />
        <div className="sa">
          <div className="sa-header">
            <a href="https://www.yalosabia.com" className="sa-logo">
              YaLo<span className="sa-accent">Sabía</span>
            </a>
          </div>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ fontSize: '3rem', marginBottom: 12 }}>🔍</div>
            <h1 style={{ fontFamily: "'Dela Gothic One', sans-serif", fontSize: '1.3rem', marginBottom: 12, color: '#FAFAFA' }}>
              Análisis no encontrado
            </h1>
            <p style={{ color: '#a0a0b8', marginBottom: 24 }}>
              Este enlace no existe o ha expirado.
            </p>
          </div>
          {/* Debug info — visible temporarily for diagnostics */}
          <div className="sa-err">
            <strong>Debug info (temporal):</strong><br />
            ID: {id}<br />
            Error: {error?.message || 'no error object'}<br />
            Error code: {error?.code || 'none'}<br />
            Data: {data ? 'exists' : 'null'}<br />
            URL env: {process.env.SUPABASE_URL ? 'set' : 'MISSING'}<br />
            Key env: {process.env.SUPABASE_ANON_KEY ? 'set' : 'MISSING'}
          </div>
          <div className="sa-cta">
            <h3>¿Quieres analizar tu propio chat?</h3>
            <p>Sube tu chat de WhatsApp y descubre qué dicen tus mensajes sobre tu relación</p>
            <a href="https://www.yalosabia.com" className="sa-btn">Analizar mi chat →</a>
          </div>
        </div>
      </>
    );
  }

  const analysis = data as SharedAnalysis;
  const s = analysis.stats || {};

  console.log('[SA] Rendering — score:', analysis.score, 'personA:', s.personA, 'personB:', s.personB);

  // Increment views (fire and forget)
  supabaseAdmin.rpc('increment_views', { analysis_id: id }).then();

  const firstName = (name: string | undefined) => name?.split(' ')[0] ?? '?';

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=Dela+Gothic+One&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <style dangerouslySetInnerHTML={{ __html: PAGE_CSS }} />

      <div className="sa">

        {/* Header */}
        <div className="sa-header">
          <a href="https://www.yalosabia.com" className="sa-logo">
            YaLo<span className="sa-accent">Sabía</span>
          </a>
          <div className="sa-sub">Análisis de chat compartido</div>
        </div>

        {/* Alias */}
        {analysis.alias && (
          <div className="sa-alias">&quot;{analysis.alias}&quot;</div>
        )}

        {/* Meta: participants, date range, total */}
        <div className="sa-meta">
          {analysis.participant_names?.length >= 2 && (
            <div>{analysis.participant_names[0]} y {analysis.participant_names[1]}</div>
          )}
          {analysis.date_range && <div>{analysis.date_range}</div>}
          <div>{(analysis.total_messages || 0).toLocaleString()} mensajes analizados</div>
        </div>

        {/* Score */}
        <div className="sa-score">
          <div className="sa-score-glow" />
          <div className="sa-score-z">
            <div className="sa-score-lbl">Score de la relación</div>
            <div className="sa-score-num">{analysis.score}</div>
            <div className="sa-score-max">de 100</div>
            <div className="sa-score-v">{s.verdict || ''}</div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="sa-grid">
          <div className="sa-card">
            <div className="sa-card-e">💬</div>
            <div className="sa-card-v">{(s.msgsA || 0).toLocaleString()}</div>
            <div className="sa-card-l">Mensajes de {firstName(s.personA)}</div>
          </div>
          <div className="sa-card">
            <div className="sa-card-e">💬</div>
            <div className="sa-card-v">{(s.msgsB || 0).toLocaleString()}</div>
            <div className="sa-card-l">Mensajes de {firstName(s.personB)}</div>
          </div>
          <div className="sa-card">
            <div className="sa-card-e">⏱️</div>
            <div className="sa-card-v">{s.avgReplyFormatted || '—'}</div>
            <div className="sa-card-l">Tiempo de respuesta</div>
          </div>
          <div className="sa-card">
            <div className="sa-card-e">🌙</div>
            <div className="sa-card-v">{s.nightPct ?? 0}%</div>
            <div className="sa-card-l">Mensajes nocturnos</div>
          </div>
          <div className="sa-card">
            <div className="sa-card-e">❤️</div>
            <div className="sa-card-v">{(s.loveCount || 0).toLocaleString()}</div>
            <div className="sa-card-l">Emojis de amor</div>
          </div>
          <div className="sa-card">
            <div className="sa-card-e">📅</div>
            <div className="sa-card-v">{s.uniqueDays || 0}</div>
            <div className="sa-card-l">Días de conversación</div>
          </div>
        </div>

        {/* Who Leads */}
        <div className="sa-dyn">
          <div className="sa-dyn-tag">⚡ Dinámica</div>
          <h4>Quién lleva la relación</h4>
          <p>
            {(s.leaderPct || 0) >= 55
              ? `${firstName(s.leader)} lleva la relación con ${s.leaderPct}% de los mensajes.`
              : `Relación equilibrada: ${firstName(s.personA)} (${s.leaderPct || 50}%) y ${firstName(s.personB)} (${100 - (s.leaderPct || 50)}%).`
            }
          </p>
        </div>

        {/* AI Insight */}
        {analysis.ai_insight && (
          <div className="sa-ai">
            🤖 <strong>Insight con IA:</strong> {analysis.ai_insight}
          </div>
        )}

        {/* Views */}
        <div className="sa-views">👁️ Este análisis ha sido visto {(analysis.views || 0) + 1} veces</div>

        {/* CTA */}
        <div className="sa-cta">
          <div className="sa-cta-ico">💬</div>
          <h3>¿Quieres analizar tu propio chat?</h3>
          <p>Sube tu chat de WhatsApp y descubre qué dicen tus mensajes sobre tu relación</p>
          <a href="https://www.yalosabia.com" className="sa-btn">Analizar mi chat →</a>
        </div>

        {/* Footer */}
        <div className="sa-ft">
          <a href="https://www.yalosabia.com" className="sa-accent">yalosabia.com</a> — Analiza tu chat de WhatsApp con IA
        </div>
      </div>
    </>
  );
}
