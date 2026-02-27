export default function NotFound() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `@import url('https://fonts.googleapis.com/css2?family=Dela+Gothic+One&family=DM+Sans:wght@400;500;600;700&display=swap');` }} />
      <div style={{
        maxWidth: 500,
        margin: '80px auto',
        textAlign: 'center',
        padding: '0 24px',
        fontFamily: "'DM Sans', sans-serif",
      }}>
        <div style={{ fontSize: '4rem', marginBottom: 16 }}>🔍</div>
        <h1 style={{
          fontFamily: "'Dela Gothic One', sans-serif",
          fontSize: '1.5rem',
          marginBottom: 12,
        }}>Análisis no encontrado</h1>
        <p style={{ color: '#a0a0b8', marginBottom: 32, lineHeight: 1.5 }}>
          Este enlace no existe o ha expirado.
        </p>
        <a
          href="https://yalosabia.com"
          style={{
            display: 'inline-block',
            padding: '14px 32px',
            background: 'linear-gradient(135deg, #FF2D78, #FF6B35)',
            color: 'white',
            borderRadius: 50,
            textDecoration: 'none',
            fontWeight: 700,
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          Ir a YaLoSabía →
        </a>
      </div>
    </>
  );
}
