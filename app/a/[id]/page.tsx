import { Metadata } from 'next';
import { supabaseAdmin } from '@/lib/supabase';

interface SharedAnalysis {
  id: string;
  created_at: string;
  alias: string | null;
  score: number;
  stats: Record<string, unknown>;
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
    const verdict = (data.stats as Record<string, unknown>)?.verdict || '';
    const total = data.total_messages || 0;
    const title = `${names}: Score ${data.score}/100 — YaLoSabía`;
    const description = `${verdict} | ${total.toLocaleString()} mensajes analizados.`;
    return {
      title, description,
      robots: { index: false, follow: false },
      openGraph: { title, description, url: `https://yalosabia.com/a/${id}`, siteName: 'YaLoSabía', locale: 'es_MX', type: 'website' },
      twitter: { card: 'summary_large_image', title, description },
    };
  } catch { return { title: 'Análisis compartido — YaLoSabía' }; }
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Dela+Gothic+One&family=DM+Sans:wght@400;500;600;700&display=swap');
*,*::before,*::after{box-sizing:border-box}
.sa{max-width:560px;margin:0 auto;padding:40px 20px 80px;font-family:'DM Sans',sans-serif;color:#FAFAFA;-webkit-font-smoothing:antialiased;background:#0d0d0d;min-height:100vh}
.sa a{color:inherit;text-decoration:none}
.hdr{text-align:center;margin-bottom:36px}
.logo{font-family:'Dela Gothic One',sans-serif;font-size:1.4rem;color:#FAFAFA}
.pk{color:#FF2D78}
.sub{color:#a0a0b8;font-size:0.85rem;margin-top:8px}
.alias{text-align:center;font-size:1.05rem;font-weight:600;color:#a0a0b8;margin:0 0 20px}
.meta{text-align:center;color:#a0a0b8;font-size:0.88rem;margin-bottom:32px;line-height:1.8}
.meta div{margin:0}
.sc{max-width:360px;margin:0 auto 40px;background:linear-gradient(135deg,#FF2D78,#6C5CE7);border-radius:20px;padding:36px 24px;text-align:center;position:relative;overflow:hidden}
.sc-g{position:absolute;inset:0;background:radial-gradient(circle at 30% 20%,rgba(255,255,255,.15),transparent 50%);pointer-events:none}
.sc-z{position:relative;z-index:1}
.sc-l{font-size:.8rem;text-transform:uppercase;letter-spacing:3px;color:rgba(255,255,255,.8);margin-bottom:10px}
.sc-n{font-family:'Dela Gothic One',sans-serif;font-size:4.5rem;line-height:1;color:#fff}
.sc-m{font-size:1rem;color:rgba(255,255,255,.7);margin-top:2px}
.sc-v{margin-top:14px;font-size:1.05rem;font-weight:600;color:#fff}
.sec{margin-bottom:40px}
.sec-t{font-size:.75rem;text-transform:uppercase;letter-spacing:2px;color:#a0a0b8;margin-bottom:10px}
.sec-h{font-family:'Dela Gothic One',sans-serif;font-size:1rem;margin-bottom:16px;color:#FAFAFA}
.g2{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.cd{background:#1a1a2e;border-radius:16px;padding:20px 16px;border:1px solid rgba(255,255,255,.06);text-align:center;overflow:hidden}
.cd-e{font-size:1.5rem;margin-bottom:8px}
.cd-v{font-family:'Dela Gothic One',sans-serif;font-size:1.4rem;margin-bottom:4px;word-break:break-word;color:#FAFAFA}
.cd-l{color:#a0a0b8;font-size:.78rem;line-height:1.3}
.inf{background:#1a1a2e;border-radius:16px;padding:24px 20px;border:1px solid rgba(255,255,255,.06)}
.inf p{color:#a0a0b8;font-size:.88rem;line-height:1.6;margin:0}
.inf h4{font-family:'Dela Gothic One',sans-serif;font-size:.95rem;margin-bottom:10px;color:#FAFAFA}
.ai{background:linear-gradient(135deg,rgba(255,210,63,.1),rgba(255,107,53,.1));border:1px solid rgba(255,210,63,.2);border-radius:16px;padding:24px 20px;font-size:.95rem;line-height:1.6;text-align:center;color:#FAFAFA}
.ai strong{color:#FFD23F}
.vw{text-align:center;color:#a0a0b8;font-size:.82rem;margin-bottom:40px}
.cta{text-align:center;background:linear-gradient(135deg,rgba(255,45,120,.08),rgba(108,92,231,.08));border:1px solid rgba(255,45,120,.15);border-radius:20px;padding:40px 24px;margin-bottom:32px}
.cta-i{font-size:2.2rem;margin-bottom:14px}
.cta h3{font-family:'Dela Gothic One',sans-serif;font-size:1.2rem;margin-bottom:10px;color:#FAFAFA}
.cta p{color:#a0a0b8;font-size:.9rem;margin-bottom:20px;line-height:1.5}
.btn{display:inline-block;background:linear-gradient(135deg,#FF2D78,#FF6B35);color:#fff;padding:14px 32px;border-radius:50px;font-family:'DM Sans',sans-serif;font-size:1rem;font-weight:700}
.ft{text-align:center;color:#a0a0b8;font-size:.78rem}
.err{background:#2a1020;border:1px solid #FF2D78;border-radius:12px;padding:20px;margin-bottom:24px;color:#FF2D78;font-size:.85rem;word-break:break-all}
@media(max-width:400px){
  .sa{padding:28px 16px 60px}
  .sc-n{font-size:3.8rem}
  .sc{padding:28px 20px}
  .g2{gap:10px}
  .cd{padding:16px 12px}
  .cd-v{font-size:1.2rem}
}
`;

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
        <style dangerouslySetInnerHTML={{ __html: CSS }} />
        <div className="sa">
          <div className="hdr">
            <a href="https://www.yalosabia.com" className="logo">YaLo<span className="pk">Sabía</span></a>
          </div>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ fontSize: '3rem', marginBottom: 12 }}>🔍</div>
            <h1 style={{ fontFamily: "'Dela Gothic One',sans-serif", fontSize: '1.3rem', marginBottom: 12, color: '#FAFAFA' }}>Análisis no encontrado</h1>
            <p style={{ color: '#a0a0b8', marginBottom: 24 }}>Este enlace no existe o ha expirado.</p>
          </div>
          <div className="err">
            <strong>Debug (temporal):</strong><br/>
            ID: {id}<br/>
            Error: {error?.message || 'none'}<br/>
            Code: {error?.code || 'none'}<br/>
            URL: {process.env.SUPABASE_URL ? 'set' : 'MISSING'}<br/>
            Key: {process.env.SUPABASE_ANON_KEY ? 'set' : 'MISSING'}
          </div>
          <div className="cta">
            <h3>¿Quieres analizar tu propio chat?</h3>
            <p>Sube tu chat de WhatsApp y descubre qué dicen tus mensajes sobre tu relación</p>
            <a href="https://www.yalosabia.com" className="btn">Analizar mi chat →</a>
          </div>
        </div>
      </>
    );
  }

  const a = data as SharedAnalysis;
  const s = a.stats || {};

  // Helper to safely read stats fields
  const v = (key: string): string => String(s[key] ?? '');
  const n = (key: string): number => Number(s[key]) || 0;
  const firstName = (key: string): string => String(s[key] || '?').split(' ')[0];

  supabaseAdmin.rpc('increment_views', { analysis_id: id }).then();

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=Dela+Gothic+One&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      <div className="sa">

        {/* ── Header ── */}
        <div className="hdr">
          <a href="https://www.yalosabia.com" className="logo">YaLo<span className="pk">Sabía</span></a>
          <div className="sub">Análisis de chat compartido</div>
        </div>

        {a.alias && <div className="alias">&quot;{a.alias}&quot;</div>}

        <div className="meta">
          {a.participant_names?.length >= 2 && (
            <div>{a.participant_names[0]} y {a.participant_names[1]}</div>
          )}
          {a.date_range && <div>{a.date_range}</div>}
          <div>{(a.total_messages || 0).toLocaleString()} mensajes analizados</div>
        </div>

        {/* ── Score ── */}
        <div className="sc">
          <div className="sc-g" />
          <div className="sc-z">
            <div className="sc-l">Score de la relación</div>
            <div className="sc-n">{a.score}</div>
            <div className="sc-m">de 100</div>
            <div className="sc-v">{v('verdict')}</div>
          </div>
        </div>

        {/* ── Estadísticas generales ── */}
        <div className="sec">
          <div className="sec-t">📊 Estadísticas</div>
          <div className="g2">
            <div className="cd">
              <div className="cd-e">💬</div>
              <div className="cd-v">{n('msgsA').toLocaleString()}</div>
              <div className="cd-l">Mensajes de {firstName('personA')}</div>
            </div>
            <div className="cd">
              <div className="cd-e">💬</div>
              <div className="cd-v">{n('msgsB').toLocaleString()}</div>
              <div className="cd-l">Mensajes de {firstName('personB')}</div>
            </div>
            <div className="cd">
              <div className="cd-e">⏱️</div>
              <div className="cd-v">{v('avgReplyFormatted') || '—'}</div>
              <div className="cd-l">Tiempo de respuesta</div>
            </div>
            <div className="cd">
              <div className="cd-e">🌙</div>
              <div className="cd-v">{n('nightPct')}%</div>
              <div className="cd-l">Mensajes nocturnos</div>
            </div>
            <div className="cd">
              <div className="cd-e">❤️</div>
              <div className="cd-v">{n('loveCount').toLocaleString()}</div>
              <div className="cd-l">Emojis de amor</div>
            </div>
            <div className="cd">
              <div className="cd-e">📅</div>
              <div className="cd-v">{n('uniqueDays')}</div>
              <div className="cd-l">Días de conversación</div>
            </div>
          </div>
        </div>

        {/* ── Dinámica ── */}
        <div className="sec">
          <div className="sec-t">⚡ Dinámica de la relación</div>
          <div className="inf">
            <h4>Quién lleva la relación</h4>
            <p>
              {n('leaderPct') >= 55
                ? `${firstName('leader')} lleva la relación con ${n('leaderPct')}% de los mensajes. Ratio: ${v('ratio') || '?'}.`
                : `Relación equilibrada: ${firstName('personA')} (${n('leaderPct')}%) y ${firstName('personB')} (${100 - n('leaderPct')}%). Ratio: ${v('ratio') || '?'}.`
              }
            </p>
          </div>
        </div>

        {/* ── Detective: Silencios y Double Texting ── */}
        {(n('silencesCount') > 0 || n('totalDouble') > 0) && (
          <div className="sec">
            <div className="sec-t">🔍 Análisis Detective</div>
            <div className="g2">
              {n('silencesCount') > 0 && (
                <div className="cd">
                  <div className="cd-e">🤫</div>
                  <div className="cd-v">{n('silencesCount')}</div>
                  <div className="cd-l">Silencios largos detectados</div>
                </div>
              )}
              {n('totalDouble') > 0 && (
                <div className="cd">
                  <div className="cd-e">📩</div>
                  <div className="cd-v">{n('totalDouble')}</div>
                  <div className="cd-l">Double texting</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── AI Insight ── */}
        {a.ai_insight && (
          <div className="sec">
            <div className="sec-t">🤖 Análisis con IA</div>
            <div className="ai">
              <strong>Insight:</strong> {a.ai_insight}
            </div>
          </div>
        )}

        {/* ── Vistas ── */}
        <div className="vw">👁️ Este análisis ha sido visto {(a.views || 0) + 1} veces</div>

        {/* ── CTA ── */}
        <div className="cta">
          <div className="cta-i">💬</div>
          <h3>¿Quieres analizar tu propio chat?</h3>
          <p>Sube tu chat de WhatsApp y descubre qué dicen tus mensajes sobre tu relación</p>
          <a href="https://www.yalosabia.com" className="btn">Analizar mi chat →</a>
        </div>

        <div className="ft">
          <a href="https://www.yalosabia.com" className="pk">yalosabia.com</a> — Analiza tu chat de WhatsApp con IA
        </div>
      </div>
    </>
  );
}
