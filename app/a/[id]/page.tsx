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
    .select('score, stats, participant_names, alias')
    .eq('id', id)
    .single();

  if (!data) {
    return { title: 'Análisis no encontrado — YaLoSabía' };
  }

  const names = data.alias || data.participant_names.join(' y ');
  const title = `${names}: Score ${data.score}/100 — YaLoSabía`;
  const description = `${data.stats.verdict} | ${data.stats.total.toLocaleString()} mensajes analizados. Descubre qué dicen los chats sobre tu relación.`;

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
    { emoji: '💬', value: s.msgsA.toLocaleString(), label: `Mensajes de ${s.personA.split(' ')[0]}` },
    { emoji: '💬', value: s.msgsB.toLocaleString(), label: `Mensajes de ${s.personB.split(' ')[0]}` },
    { emoji: '⏱️', value: s.avgReplyFormatted, label: 'Tiempo promedio de respuesta' },
    { emoji: '🌙', value: `${s.nightPct}%`, label: 'Mensajes nocturnos (12am-5am)' },
    { emoji: '❤️', value: s.loveCount.toLocaleString(), label: 'Emojis de amor enviados' },
    { emoji: '📅', value: String(s.uniqueDays), label: 'Días de conversación' },
  ];

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `@import url('https://fonts.googleapis.com/css2?family=Dela+Gothic+One&family=DM+Sans:wght@400;500;600;700&display=swap');` }} />

      <div style={{
        maxWidth: 600,
        margin: '0 auto',
        padding: '40px 24px 80px',
        fontFamily: "'DM Sans', sans-serif",
      }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <a href="https://yalosabia.com" style={{ textDecoration: 'none' }}>
            <span style={{
              fontFamily: "'Dela Gothic One', sans-serif",
              fontSize: '1.4rem',
              color: '#FAFAFA',
            }}>
              YaLo<span style={{ color: '#FF2D78' }}>Sabía</span>
            </span>
          </a>
          <p style={{ color: '#a0a0b8', fontSize: '0.85rem', marginTop: 8 }}>
            Análisis de chat compartido
          </p>
        </div>

        {/* Alias */}
        {analysis.alias && (
          <p style={{
            textAlign: 'center',
            fontSize: '1.1rem',
            fontWeight: 600,
            marginBottom: 24,
            color: '#a0a0b8',
          }}>
            &quot;{analysis.alias}&quot;
          </p>
        )}

        {/* Date range + total messages */}
        <div style={{ textAlign: 'center', marginBottom: 32, color: '#a0a0b8', fontSize: '0.9rem' }}>
          {analysis.date_range && <p style={{ margin: '0 0 4px' }}>{analysis.date_range}</p>}
          <p style={{ margin: 0 }}>{analysis.total_messages.toLocaleString()} mensajes analizados</p>
        </div>

        {/* Score Card */}
        <div style={{
          maxWidth: 400,
          margin: '0 auto 48px',
          background: 'linear-gradient(135deg, #FF2D78, #6C5CE7)',
          borderRadius: 20,
          padding: 40,
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(circle at 30% 20%, rgba(255,255,255,0.15), transparent 50%)',
          }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{
              fontSize: '0.85rem',
              textTransform: 'uppercase',
              letterSpacing: 3,
              opacity: 0.8,
              marginBottom: 12,
            }}>Score de la relación</div>
            <div style={{
              fontFamily: "'Dela Gothic One', sans-serif",
              fontSize: '5rem',
              lineHeight: 1,
              marginBottom: 4,
            }}>{s.score}</div>
            <div style={{ fontSize: '1.1rem', opacity: 0.7 }}>de 100</div>
            <div style={{
              marginTop: 16,
              fontSize: '1.1rem',
              fontWeight: 600,
            }}>{s.verdict}</div>
          </div>
        </div>

        {/* Stats Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: 16,
          marginBottom: 48,
        }}>
          {statCards.map((stat, i) => (
            <div key={i} style={{
              background: '#1a1a2e',
              borderRadius: 20,
              padding: 28,
              border: '1px solid rgba(255,255,255,0.06)',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '1.8rem', marginBottom: 12 }}>{stat.emoji}</div>
              <div style={{
                fontFamily: "'Dela Gothic One', sans-serif",
                fontSize: '1.8rem',
                marginBottom: 4,
              }}>{stat.value}</div>
              <div style={{ color: '#a0a0b8', fontSize: '0.88rem' }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Who Leads */}
        <div style={{
          background: '#1a1a2e',
          borderRadius: 20,
          padding: 32,
          border: '1px solid rgba(255,255,255,0.06)',
          marginBottom: 48,
        }}>
          <div style={{
            fontSize: '0.78rem',
            textTransform: 'uppercase',
            letterSpacing: 2,
            color: '#a0a0b8',
            marginBottom: 8,
          }}>⚡ Dinámica</div>
          <h4 style={{
            fontFamily: "'Dela Gothic One', sans-serif",
            fontSize: '1rem',
            margin: '0 0 12px',
          }}>Quién lleva la relación</h4>
          <p style={{ color: '#a0a0b8', fontSize: '0.9rem', lineHeight: 1.6, margin: 0 }}>
            {s.leaderPct >= 55
              ? `${s.leader.split(' ')[0]} lleva la relación con ${s.leaderPct}% de los mensajes.`
              : `Relación equilibrada: ${s.personA.split(' ')[0]} (${s.leaderPct}%) y ${s.personB.split(' ')[0]} (${100 - s.leaderPct}%).`
            }
          </p>
        </div>

        {/* AI Insight */}
        {analysis.ai_insight && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(255,210,63,0.1), rgba(255,107,53,0.1))',
            border: '1px solid rgba(255,210,63,0.2)',
            borderRadius: 20,
            padding: '28px 32px',
            marginBottom: 48,
            fontSize: '1.05rem',
            lineHeight: 1.6,
            textAlign: 'center',
          }}>
            <span>🤖 </span>
            <strong style={{ color: '#FFD23F' }}>Insight con IA:</strong>{' '}
            {analysis.ai_insight}
          </div>
        )}

        {/* Blurred Premium Teaser */}
        <div style={{ position: 'relative', marginBottom: 48 }}>
          <div style={{
            filter: 'blur(8px)',
            opacity: 0.3,
            pointerEvents: 'none',
            userSelect: 'none',
          }}>
            <div style={{
              background: '#1a1a2e',
              borderRadius: 20,
              padding: 32,
              border: '1px solid rgba(255,255,255,0.06)',
              marginBottom: 16,
            }}>
              <h4 style={{ fontFamily: "'Dela Gothic One', sans-serif", fontSize: '1rem', margin: '0 0 8px' }}>
                🔍 Análisis Detective
              </h4>
              <p style={{ color: '#a0a0b8', margin: 0 }}>Timeline emocional, patrones de silencios, double texting, horarios sospechosos...</p>
            </div>
            <div style={{
              background: '#1a1a2e',
              borderRadius: 20,
              padding: 32,
              border: '1px solid rgba(255,255,255,0.06)',
            }}>
              <h4 style={{ fontFamily: "'Dela Gothic One', sans-serif", fontSize: '1rem', margin: '0 0 8px' }}>
                🔬 Análisis Obsesivo
              </h4>
              <p style={{ color: '#a0a0b8', margin: 0 }}>Análisis forense completo, mapas de calor, evolución de vocabulario...</p>
            </div>
          </div>
          <div style={{ textAlign: 'center', padding: '18px 16px' }}>
            <a
              href="https://yalosabia.com"
              style={{
                display: 'inline-block',
                padding: '14px 28px',
                background: 'linear-gradient(135deg, #3B82F6, #6C5CE7)',
                border: 'none',
                borderRadius: 10,
                color: '#fff',
                fontWeight: 700,
                fontSize: '0.95rem',
                textDecoration: 'none',
              }}
            >
              🔓 Desbloquear análisis completo
            </a>
          </div>
        </div>

        {/* CTA Section */}
        <div style={{
          textAlign: 'center',
          background: 'linear-gradient(135deg, rgba(255,45,120,0.1), rgba(108,92,231,0.1))',
          border: '1px solid rgba(255,45,120,0.2)',
          borderRadius: 20,
          padding: '48px 32px',
          marginBottom: 32,
        }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 16 }}>🔍</div>
          <h3 style={{
            fontFamily: "'Dela Gothic One', sans-serif",
            fontSize: '1.3rem',
            marginBottom: 12,
          }}>
            ¿Quieres analizar TU chat?
          </h3>
          <p style={{
            color: '#a0a0b8',
            fontSize: '0.95rem',
            marginBottom: 24,
            lineHeight: 1.5,
          }}>
            Sube tu chat de WhatsApp y descubre qué dicen tus mensajes sobre tu relación
          </p>
          <a
            href="https://yalosabia.com"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: 'linear-gradient(135deg, #FF2D78, #FF6B35)',
              color: 'white',
              border: 'none',
              padding: '16px 36px',
              borderRadius: 50,
              fontFamily: "'DM Sans', sans-serif",
              fontSize: '1.05rem',
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            Analizar mi chat →
          </a>
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', color: '#a0a0b8', fontSize: '0.8rem' }}>
          <p>👁️ {analysis.views + 1} vistas</p>
          <p style={{ marginTop: 8 }}>
            <a href="https://yalosabia.com" style={{ color: '#FF2D78', textDecoration: 'none' }}>
              yalosabia.com
            </a>
            {' '}— Analiza tu chat de WhatsApp con IA
          </p>
        </div>
      </div>
    </>
  );
}
