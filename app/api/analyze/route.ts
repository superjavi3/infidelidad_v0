import { NextRequest, NextResponse } from 'next/server';
import { gunzipSync } from 'zlib';
import { checkSessionPayment, chatFingerprint, markDiaryWritten } from '@/lib/payments';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

// Gemini tarda entre 10 y 40 s; sin esto Vercel puede cortar antes
export const maxDuration = 60;
// Un chat enorme cabe de sobra en 30 MB descomprimidos; más es un abuso (gzip bomb)
const MAX_BODY_BYTES = 30 * 1024 * 1024;
// Un pago = un PDF: la IA escribe el diario una vez. Durante 15 min desde la primera se deja reintentar
// (si falló la descarga o se cortó la conexión); después, el navegador usa el diario que ya guardó.
const RETRY_WINDOW_MS = 15 * 60 * 1000;

export async function POST(req: NextRequest) {
  try {
    let body;
    const contentEncoding = req.headers.get('content-encoding');
    if (contentEncoding === 'gzip') {
      const compressed = Buffer.from(await req.arrayBuffer());
      const decompressed = gunzipSync(compressed, { maxOutputLength: MAX_BODY_BYTES });
      body = JSON.parse(decompressed.toString('utf-8'));
    } else {
      body = await req.json();
    }
    const { mode, stats, messages } = body;

    // El único modo es «diary»: el diario completo, solo con una sesión de Stripe pagada y sin reembolso
    if (mode !== 'diary') {
      return NextResponse.json({ success: false, error: 'unknown_mode' }, { status: 400 });
    }
    // Sin caché: un reembolso o una disputa tienen que quitar el acceso al momento (la caché es por instancia)
    const payment = await checkSessionPayment(body.sessionId, { fresh: true });
    if (!payment.paid) {
      const status = payment.reason === 'error' ? 503 : 402;
      return NextResponse.json({ success: false, error: 'payment_required', reason: payment.reason }, { status });
    }
    // Un pago = un diario: el diario solo se escribe para el chat con el que se pagó.
    // (Las compras anteriores a este cambio no traen huella y siguen valiendo para cualquier chat.)
    if (payment.chatFp && chatFingerprint(messages || []) !== payment.chatFp) {
      return NextResponse.json({ success: false, error: 'payment_required', reason: 'other_chat' }, { status: 403 });
    }
    if ((payment.diaryCount || 0) >= 1 && Date.now() - (payment.diaryAt || 0) > RETRY_WINDOW_MS) {
      return NextResponse.json({ success: false, error: 'already_generated' }, { status: 409 });
    }

    // ===== DIARIO: perfiles, compatibilidad, señales, pronóstico, consejos y mensaje =====
    // La huella se calcula sobre la lista tal cual; a la IA le llega sin los avisos automáticos de WhatsApp
    const chatMessages = (messages || []).filter((m: any) => !WA_SYSTEM_RE.test(String(m?.text || '').trim()));
    const diarySample = sampleMessages(chatMessages, 320);
    const p = body.people || {};
    const personLine = (key: 'A' | 'B') => {
      const d = p[key] || {};
      return `- ${d.name}: ${d.msgs} mensajes, inicia el ${d.initiatesPct}% de las conversaciones, contesta en ${d.replyLabel} (mediana), hora favorita ${d.peakHour}h, ${d.audios} audios, palabras frecuentes: ${(d.topWords || []).join(', ')}`;
    };

    const moments = Array.isArray(body.moments) ? body.moments.slice(0, 5) : [];
    const momentsBlock = moments.length
      ? moments.map((mo: any) => `- [${mo.id}] ${mo.date} — ${mo.label}:\n${(mo.messages || []).slice(0, 6).map((m: any) => `    ${m.sender}: «${String(m.text || '').substring(0, 200)}»`).join('\n')}`).join('\n')
      : '(sin momentos)';
    // Solo el nombre de pila: «Conrado», no «Conrado Escobar»
    const firstName = (n: any) => String(n || '').trim().split(/\s+/)[0] || String(n || '');
    const nameA = firstName(p.A?.name || stats?.personA);
    const nameB = firstName(p.B?.name || stats?.personB);

    const diaryPrompt = `Vas a escribir «el diario» de una pareja a partir de su chat de WhatsApp. Lo van a leer los dos, quizá juntos, quizá uno a escondidas. Escribe como alguien que ha leído cada mensaje y les tiene cariño: cercano, íntimo, concreto, con un punto de nostalgia. Que emocione. Que al leerlo piensen «esto somos nosotros» y les den ganas de escribirse.

CÓMO ESCRIBIR
- Español de México. Háblales de «ustedes» y llámalos solo por su nombre de pila (${nameA} y ${nameB}), nunca con apellido. Nunca «vosotros» ni «usted»: cuando hables de uno solo, hazlo en tercera persona («${nameA} suele…»).
- No comentes enlaces, URLs ni palabras técnicas del chat.
- Concreto siempre: menciona fechas, palabras y mensajes reales de su chat. Mejor «el día que ${nameA} escribió "ya llegué, te extrañé"» que «muestran afecto».
- Cita sus mensajes entre comillas cuando ayude. Nada de estadísticas en frío si puedes contarlas como una historia.
- Puedes tocar la fibra: recordarles cómo se hablaban al principio, lo que se echan de menos, lo que se están dejando de decir. Pero sin crueldad, sin culpar y sin hablar nunca de infidelidad ni de diagnósticos.
- Nada que suene a informe o a IA: prohibido «en resumen», «es importante destacar», «sin duda», «cabe mencionar», «en conclusión», «fomentar», «comunicación asertiva», «es fundamental», «en definitiva».
- Sin emojis ni símbolos decorativos.
- No inventes nada: todo lo que afirmes tiene que salir de los datos, de los momentos o de la muestra.

DATOS REALES (no los contradigas)
- ${stats?.total} mensajes en ${stats?.uniqueDays} días. Índice de la relación: ${stats?.score}/100.
${personLine('A')}
${personLine('B')}
- Silencios de más de 48 h: ${stats?.silencesCount ?? 'N/D'}. Emojis de amor: ${stats?.loveCount ?? 'N/D'}. Mensajes de madrugada: ${stats?.nightPct ?? 'N/D'}%.

MOMENTOS CLAVE (con sus mensajes reales de ese día)
${momentsBlock}

MUESTRA DE MENSAJES (formato [fecha hora] nombre: texto)
${diarySample.map((m: any) => `[${m.date} ${m.time}] ${m.sender}: ${String(m.text || '').substring(0, 220)}`).join('\n')}

RESPONDE SOLO CON JSON VÁLIDO con esta estructura exacta:
{
  "opening": "3-4 frases (máximo 400 caracteres) para abrir el diario, como el principio de una carta a los dos. Menciona algo muy concreto de su historia.",
  "profiles": {
    "A": { "archetype": "cómo es en la relación, 2-5 palabras, p. ej. «la que siempre escribe primero»", "description": "2-3 frases con cariño y con un ejemplo real de su forma de escribir", "traits": ["rasgo", "rasgo", "rasgo"], "quote": { "text": "COPIA LITERAL de un mensaje de A que lo retrate" } },
    "B": { "archetype": "...", "description": "...", "traits": ["...", "...", "..."], "quote": { "text": "COPIA LITERAL de un mensaje de B que lo retrate" } }
  },
  "moments": [{ "id": "el id del momento", "text": "2 frases cortas (máximo 170 caracteres en total) sobre ese día, como si se lo recordaras: qué pasó, qué se dijeron, por qué importa" }],
  "compatibility": {
    "percent": 0-100,
    "summary": "2 frases: en qué se entienden y en qué chocan, con un ejemplo real",
    "loveLanguages": {
      "A": { "palabras": 0-100, "tiempo": 0-100, "servicio": 0-100, "contacto": 0-100, "regalos": 0-100 },
      "B": { "palabras": 0-100, "tiempo": 0-100, "servicio": 0-100, "contacto": 0-100, "regalos": 0-100 }
    },
    "strengths": ["3-4 cosas que les salen bien, concretas"],
    "toWork": ["3-4 cosas que pueden trabajar, concretas"]
  },
  "signals": {
    "toWatch": [{ "title": "título corto y humano", "detail": "2 frases con datos del chat", "level": "importante|a vigilar|detalle", "quote": { "sender": "nombre exacto", "text": "COPIA LITERAL de un mensaje que lo ejemplifique" } }],
    "greenFlags": ["2-3 cosas bonitas y concretas que ya hacen"]
  },
  "forecast": {
    "level": "fragil|inestable|estable|solida",
    "position": 0-100 dentro de la franja del nivel (frágil 0-25, inestable 25-50, estable 50-75, sólida 75-100),
    "headline": "frase corta, p. ej. «Buen rumbo, con una condición.»",
    "explanation": "4 frases honestas, directas y con cariño; que se note que conoces su historia",
    "pros": ["3-4 frases cortas"],
    "cons": ["2-3 frases cortas"],
    "condition": "la condición para que sigan bien, 1 frase dirigida a los dos (o vacío si no hay)"
  },
  "advice": [{ "title": "consejo corto en imperativo", "text": "2 frases: qué hacer y por qué, apoyado en algo real de su chat; puede ir dirigido a una persona por su nombre" }],
  "bestMessage": { "sender": "nombre exacto", "text": "COPIA LITERAL del mensaje más bonito de la muestra" },
  "quotesToKeep": [{ "sender": "nombre exacto", "text": "COPIA LITERAL de un mensaje bonito, gracioso o tierno de la muestra" }],
  "closing": "3 frases (máximo 330 caracteres) para cerrar el diario, dirigidas a los dos. Que emocione y les deje con ganas de escribirse."
}

REGLAS
- "A" es ${nameA} y "B" es ${nameB}.
- "moments": uno por cada momento clave, usando su mismo "id".
- Máximo 3 elementos en signals.toWatch, exactamente 5 en advice y 4 en quotesToKeep (distintos de bestMessage).
- Todo campo que diga COPIA LITERAL tiene que ser un mensaje copiado palabra por palabra de la muestra o de los momentos. Si no hay uno adecuado, pon null.`;

    const diaryRes = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': GEMINI_API_KEY },
        signal: AbortSignal.timeout(55_000),
        body: JSON.stringify({
          contents: [{ parts: [{ text: diaryPrompt }] }],
          generationConfig: {
            temperature: 0.8,
            maxOutputTokens: 6000,
            responseMimeType: 'application/json',
            thinkingConfig: { thinkingBudget: 0 }
          }
        })
      }
    );
    if (!diaryRes.ok) {
      console.error('Gemini', diaryRes.status, (await diaryRes.text()).slice(0, 300));
      return NextResponse.json({ success: false, error: 'model_error' }, { status: 502 });
    }
    const diaryData = await diaryRes.json();
    const diaryText = diaryData.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!diaryText) {
      return NextResponse.json({ success: false, error: 'Sin respuesta del modelo' }, { status: 502 });
    }
    const diaryJson = diaryText.match(/\{[\s\S]*\}/);
    const diary = JSON.parse(diaryJson ? diaryJson[0] : diaryText);
    try {
      await markDiaryWritten(body.sessionId, payment);
    } catch (err: unknown) {
      console.error('[diary] no se pudo marcar el diario como escrito:', err instanceof Error ? err.message : err);
    }
    return NextResponse.json({ success: true, diary });

  } catch (error: any) {
    console.error('Error:', error);
    return NextResponse.json(
      { success: false, error: 'server_error' },
      { status: 500 }
    );
  }
}

// Función para samplear mensajes inteligentemente
// Igual que WA_SYSTEM_RE en public/index.html
const WA_SYSTEM_RE = /^.{1,60} es un contacto\.?$|^.{1,60} is a contact\.?$|cifrad[oa]s? de extremo a extremo|end-to-end encrypted|mensajes temporales|disappearing messages|cambió su número|changed (their|his|her) phone number|bloqueaste a este contacto|desbloqueaste a este contacto|you (un)?blocked this contact|^(llamada|videollamada)( de (voz|video))?( perdida)?\b.{0,30}$|^(missed )?(voice|video) call\b.{0,30}$/i;

function sampleMessages(messages: any[], maxMessages: number) {
  if (messages.length <= maxMessages) return messages;

  const sample = [];
  
  // Primeros 50
  sample.push(...messages.slice(0, 50));
  
  // Últimos 50
  sample.push(...messages.slice(-50));
  
  // 200 random del medio
  const middle = messages.slice(50, -50);
  const step = Math.floor(middle.length / 200);
  for (let i = 0; i < middle.length; i += step) {
    sample.push(middle[i]);
    if (sample.length >= maxMessages) break;
  }
  
  return sample.slice(0, maxMessages);
}