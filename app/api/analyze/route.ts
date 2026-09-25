import { NextRequest, NextResponse } from 'next/server';
import { gunzipSync } from 'zlib';
import { checkSessionPayment, chatFingerprint } from '@/lib/payments';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

export async function POST(req: NextRequest) {
  try {
    let body;
    const contentEncoding = req.headers.get('content-encoding');
    if (contentEncoding === 'gzip') {
      const compressed = Buffer.from(await req.arrayBuffer());
      const decompressed = gunzipSync(compressed);
      body = JSON.parse(decompressed.toString('utf-8'));
    } else {
      body = await req.json();
    }
    const { mode, stats, messages } = body;

    // El único modo es «diary»: el diario completo, solo con una sesión de Stripe pagada y sin reembolso
    if (mode !== 'diary') {
      return NextResponse.json({ success: false, error: 'unknown_mode' }, { status: 400 });
    }
    const payment = await checkSessionPayment(body.sessionId);
    if (!payment.paid) {
      const status = payment.reason === 'error' ? 503 : 402;
      return NextResponse.json({ success: false, error: 'payment_required', reason: payment.reason }, { status });
    }
    // Un pago = un diario: el diario solo se escribe para el chat con el que se pagó.
    // (Las compras anteriores a este cambio no traen huella y siguen valiendo para cualquier chat.)
    if (payment.chatFp && chatFingerprint(messages || []) !== payment.chatFp) {
      return NextResponse.json({ success: false, error: 'payment_required', reason: 'other_chat' }, { status: 403 });
    }

    // ===== DIARIO: perfiles, compatibilidad, señales, pronóstico, consejos y mensaje =====
    const diarySample = sampleMessages(messages || [], 320);
    const p = body.people || {};
    const personLine = (key: 'A' | 'B') => {
      const d = p[key] || {};
      return `- ${d.name}: ${d.msgs} mensajes, inicia el ${d.initiatesPct}% de las conversaciones, contesta en ${d.replyLabel} (mediana), hora favorita ${d.peakHour}h, ${d.audios} audios, palabras frecuentes: ${(d.topWords || []).join(', ')}`;
    };

    const diaryPrompt = `Eres quien escribe «el diario» de una relación a partir de su chat de WhatsApp. Tono: cercano, cálido, honesto, en español de México (usa "ustedes", nunca "vosotros"). Nada de diagnósticos clínicos ni de acusar a nadie de infidelidad.

DATOS REALES (no los contradigas):
- ${stats?.total} mensajes en ${stats?.uniqueDays} días. Índice de la relación: ${stats?.score}/100.
${personLine('A')}
${personLine('B')}
- Silencios de más de 48 h: ${stats?.silencesCount ?? 'N/D'}. Emojis de amor: ${stats?.loveCount ?? 'N/D'}. Mensajes de madrugada: ${stats?.nightPct ?? 'N/D'}%.

MUESTRA DE MENSAJES (formato [fecha hora] nombre: texto):
${diarySample.map((m: any) => `[${m.date} ${m.time}] ${m.sender}: ${String(m.text || '').substring(0, 220)}`).join('\n')}

RESPONDE SOLO CON JSON VÁLIDO con esta estructura exacta:
{
  "profiles": {
    "A": { "archetype": "«la que inicia» o similar, 2-5 palabras", "description": "2 frases sobre cómo se comunica", "traits": ["rasgo", "rasgo", "rasgo"] },
    "B": { "archetype": "...", "description": "...", "traits": ["...", "...", "..."] }
  },
  "compatibility": {
    "percent": 0-100,
    "summary": "1-2 frases: en qué se entienden y en qué chocan",
    "loveLanguages": {
    "A": { "palabras": 0-100, "tiempo": 0-100, "servicio": 0-100, "contacto": 0-100, "regalos": 0-100 },
    "B": { "palabras": 0-100, "tiempo": 0-100, "servicio": 0-100, "contacto": 0-100, "regalos": 0-100 }
    },
    "strengths": ["3-4 cosas que les salen bien, frases cortas"],
    "toWork": ["3-4 cosas que pueden trabajar, frases cortas"]
  },
  "signals": {
    "toWatch": [{ "title": "título corto", "detail": "1-2 frases con datos del chat", "level": "importante|a vigilar|detalle" }],
    "greenFlags": ["2-3 cosas buenas concretas"]
  },
  "forecast": {
    "level": "fragil|inestable|estable|solida",
    "position": 0-100,
    "headline": "frase corta, p. ej. «Buen rumbo, con una condición.»",
    "explanation": "3-4 frases honestas",
    "pros": ["3-4 frases cortas"],
    "cons": ["2-3 frases cortas"],
    "condition": "la condición para que sigan bien, 1 frase (o vacío si no hay)"
  },
  "advice": [{ "title": "consejo corto", "text": "1-2 frases concretas; puede ir dirigido a una persona por su nombre" }],
  "bestMessage": { "sender": "nombre exacto", "date": "fecha tal cual aparece", "time": "hora tal cual aparece", "text": "COPIA LITERAL de un mensaje cariñoso de la muestra" }
}

REGLAS:
- "A" es ${p.A?.name || stats?.personA} y "B" es ${p.B?.name || stats?.personB}.
- Máximo 3 elementos en signals.toWatch y exactamente 5 en advice.
- bestMessage.text debe ser un mensaje copiado palabra por palabra de la muestra; si no hay ninguno cariñoso, usa null en bestMessage.
- No inventes hechos que no estén en los datos o la muestra.
- No uses emojis ni símbolos decorativos en ningún texto. Escribe como una persona, sin frases hechas de IA (nada de «en resumen», «es importante destacar», «sin duda»).`;

    const diaryRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: diaryPrompt }] }],
          generationConfig: {
            temperature: 0.6,
            maxOutputTokens: 3000,
            responseMimeType: 'application/json',
            thinkingConfig: { thinkingBudget: 0 }
          }
        })
      }
    );
    const diaryData = await diaryRes.json();
    const diaryText = diaryData.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!diaryText) {
      return NextResponse.json({ success: false, error: 'Sin respuesta del modelo' }, { status: 502 });
    }
    const diaryJson = diaryText.match(/\{[\s\S]*\}/);
    const diary = JSON.parse(diaryJson ? diaryJson[0] : diaryText);
    return NextResponse.json({ success: true, diary });

  } catch (error: any) {
    console.error('Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// Función para samplear mensajes inteligentemente
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