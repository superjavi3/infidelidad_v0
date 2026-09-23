import { NextRequest, NextResponse } from 'next/server';
import { gunzipSync } from 'zlib';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

/*
 * Esta ruta solo acepta agregados anónimos construidos por public/js/ai-payload.js:
 * números, porcentajes, fechas y categorías. Nunca texto de mensajes ni nombres.
 * El cliente etiqueta a las personas como "Persona A"/"Miembro 3" y deshace la
 * sustitución al recibir la respuesta.
 */

const REJECTED_KEYS = ['messages', 'message', 'text', 'sender', 'chatHistory', 'question'];

type Json = Record<string, any>;

async function askGemini(prompt: string, maxOutputTokens: number, temperature = 0.3): Promise<string | null> {
  const response = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature, maxOutputTokens, thinkingConfig: { thinkingBudget: 0 } }
    })
  });

  const data = await response.json();
  if (!data.candidates?.[0]) {
    console.error('Gemini sin respuesta:', JSON.stringify(data).substring(0, 300));
    return null;
  }
  return String(data.candidates[0].content.parts[0].text || '').replace(/```json/g, '').replace(/```/g, '').trim();
}

function extractJson(text: string, shape: 'object' | 'array'): any | null {
  const match = text.match(shape === 'array' ? /\[[\s\S]*\]/ : /\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

/* Resume el agregado de pareja en líneas legibles para el prompt. */
function describeCouple(a: Json): string {
  const people = (a.people || [])
    .map((p: Json) => `  - ${p.label}: ${p.messageCount} mensajes (${p.sharePct}%), ${p.doubleTextEpisodes} rachas de mensajes seguidos, rompió el silencio ${p.silencesBroken} veces, ${p.deletedMessages} mensajes eliminados, ${p.mediaShared} archivos compartidos`)
    .join('\n');

  const monthly = (a.timeline?.monthly || [])
    .map((m: Json) => `${m.month}: ${m.total}`)
    .join(' · ');

  return [
    `- Periodo: ${a.span?.firstMonth || '?'} a ${a.span?.lastMonth || '?'} (${a.span?.activeDays || 0} días con actividad)`,
    `- Total: ${a.totals?.messageCount || 0} mensajes, ${a.totals?.loveEmojis || 0} emojis de afecto, ${a.totals?.mediaShared || 0} archivos, ${a.totals?.deletedMessages || 0} eliminados`,
    `- Score global: ${a.score?.overall ?? 'N/A'}/100`,
    `- Ritmo: ${a.rhythm?.avgReplyMinutes ?? '?'} min de respuesta media; ${a.rhythm?.nightSharePct ?? 0}% de mensajes de madrugada`,
    `- Quien más escribe: ${a.balance?.leaderLabel || '?'} (${a.balance?.leaderSharePct || 0}% del total)`,
    `- Silencios de 48h o más: ${a.silences?.count || 0} (el más largo, ${a.silences?.longestHours || 0} horas)`,
    `- Pico de actividad: ${a.timeline?.peakMonth || 'N/A'}${a.timeline?.declineMonth ? `; caída del ${a.timeline.declinePct}% en ${a.timeline.declineMonth}` : ''}`,
    `- Mensajes por mes: ${monthly || 'N/A'}`,
    `- Personas:\n${people}`
  ].join('\n');
}

function describeGroup(a: Json): string {
  const members = (a.members || [])
    .map((m: Json) => `  - ${m.label}: ${m.messageCount} mensajes (${m.sharePct}%)${m.category ? `, perfil ${m.category}` : ''}`)
    .join('\n');

  const monthly = (a.monthly || []).map((m: Json) => `${m.month}: ${m.total}`).join(' · ');
  const events = Object.entries(a.eventCounts || {}).map(([type, n]) => `${type}: ${n}`).join(', ');

  return [
    `- Total: ${a.totals?.messageCount || 0} mensajes de ${a.totals?.members || 0} miembros en ${a.totals?.activeDays || 0} días`,
    `- Score del grupo: ${a.score?.overall ?? 'N/A'}/100`,
    `- Miembros:\n${members}`,
    `- Mensajes por mes: ${monthly || 'N/A'}`,
    `- Eventos del grupo: ${events || 'ninguno'}`
  ].join('\n');
}

const LABEL_RULE =
  'Las personas se identifican SOLO por su etiqueta ("Persona A", "Miembro 3"). ' +
  'Úsalas tal cual. No inventes nombres propios.';

export async function POST(req: NextRequest) {
  try {
    let body: Json;
    const contentEncoding = req.headers.get('content-encoding');
    if (contentEncoding === 'gzip') {
      const compressed = Buffer.from(await req.arrayBuffer());
      body = JSON.parse(gunzipSync(compressed).toString('utf-8'));
    } else {
      body = await req.json();
    }

    // Defensa en profundidad: si alguna vez vuelve a colarse contenido del chat,
    // esta ruta lo rechaza en vez de reenviarlo a Gemini.
    const offending = REJECTED_KEYS.filter((k) => k in body);
    if (offending.length > 0) {
      console.error('Payload rechazado, contiene:', offending.join(', '));
      return NextResponse.json(
        { success: false, error: 'Esta ruta solo acepta estadísticas agregadas.' },
        { status: 400 }
      );
    }

    const { mode = 'analysis', aggregate } = body;

    if (!aggregate || typeof aggregate !== 'object') {
      return NextResponse.json({ success: false, error: 'Falta el agregado.' }, { status: 400 });
    }

    console.log('API /analyze — mode:', mode, '| schema:', aggregate.schema);

    // ═══ RESUMEN PARA EL INFORME ═══
    if (mode === 'summary') {
      const prompt = `Eres un analista de relaciones. Escribe un resumen del estado de esta relación a partir de estas estadísticas de su chat.

${describeCouple(aggregate)}

${LABEL_RULE}

ESCRIBE (máximo 200 palabras), con estos cuatro apartados y estos títulos exactos:
Estado actual:
Fortalezas:
Áreas de atención:
Recomendación:

Reglas: habla en segunda persona, con calidez y sin dramatizar. Apóyate en los números concretos. No diagnostiques ni etiquetes con términos clínicos. No digas qué debe hacer con la relación.`;

      const text = await askGemini(prompt, 800);
      return NextResponse.json({ success: true, summary: text || 'Resumen no disponible.' });
    }

    // ═══ DATO CURIOSO DEL GRUPO ═══
    if (mode === 'group-analysis') {
      const prompt = `Genera UN dato curioso corto y divertido sobre este grupo de WhatsApp.

REGLAS ESTRICTAS:
- MÁXIMO 1-2 frases. Nunca más de 30 palabras.
- Usa UN dato numérico concreto, no varios.
- Menciona como mucho 1-2 etiquetas de miembros.
- Debe hacer reír o sorprender.
- NO inventes datos que no estén abajo.
${LABEL_RULE}

DATOS DEL GRUPO:
${describeGroup(aggregate)}

Responde en JSON: { "funInsight": "tu dato curioso aquí" }`;

      const text = await askGemini(prompt, 300, 0.8);
      const parsed = text ? extractJson(text, 'object') : null;
      return NextResponse.json({
        success: true,
        analysis: parsed || { funInsight: 'No pudimos generar un dato curioso para este grupo.' }
      });
    }

    // ═══ MOMENTOS CLAVE DEL GRUPO ═══
    if (mode === 'group-autopsy') {
      const prompt = `Eres analista de dinámicas de grupo. A partir de la actividad mensual y los eventos, identifica los 3-5 momentos en los que la dinámica del grupo cambió.

${describeGroup(aggregate)}

${LABEL_RULE}
Basa cada momento en los cambios de actividad mensual. No inventes sucesos que los datos no respalden.

Responde en JSON array:
[{"date":"Mes Año","title":"Título corto","description":"Qué muestran los datos","impact":"Cómo cambió el grupo","severity":"high|medium|low"}]

Máximo 5 momentos.`;

      const text = await askGemini(prompt, 2000);
      const parsed = text ? extractJson(text, 'array') : null;
      return NextResponse.json({ success: true, autopsy: parsed || [] });
    }

    // ═══ ANÁLISIS DE PAREJA (por defecto) ═══
    const prompt = `Eres un analista de relaciones. Analiza estas estadísticas del chat de una pareja.

${describeCouple(aggregate)}

${LABEL_RULE}

Responde SOLO en JSON con esta estructura exacta:
{
  "whoLeads": "Dos frases sobre quién lleva el ritmo de la conversación y qué muestran los números",
  "funInsight": "Un dato llamativo y concreto de estas estadísticas, en una frase"
}

Reglas: apóyate únicamente en los números de arriba. Tono claro, cálido y honesto, sin dramatizar y sin culpabilizar a nadie. Nada de términos clínicos.`;

    const text = await askGemini(prompt, 1000);
    const analysis = text ? extractJson(text, 'object') : null;

    if (!analysis) {
      return NextResponse.json({ success: false, error: 'Sin respuesta de Gemini' }, { status: 502 });
    }

    return NextResponse.json({ success: true, analysis });
  } catch (error: any) {
    console.error('Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
