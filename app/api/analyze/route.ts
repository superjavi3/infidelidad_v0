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

// La guía pide una respuesta más larga que el resto de modos.
export const maxDuration = 30;

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

/*
 * Igual que askGemini, pero pidiendo JSON con un schema estricto. Gemini
 * garantiza la forma; el contenido lo valida después el cliente
 * (YLSGuide.sanitizeAI) y descarta lo que no cumpla.
 */
async function askGeminiJson(prompt: string, schema: Json, maxOutputTokens: number, temperature = 0.2): Promise<Json | null> {
  const response = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature,
        maxOutputTokens,
        responseMimeType: 'application/json',
        responseSchema: schema,
        thinkingConfig: { thinkingBudget: 0 }
      }
    })
  });
  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    console.error('Gemini sin respuesta:', JSON.stringify(data).substring(0, 300));
    return null;
  }
  try {
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return extractJson(text, 'object');
  }
}

const GUIDE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    headline: { type: 'STRING' },
    onePage: {
      type: 'OBJECT',
      properties: {
        summary: { type: 'STRING' },
        good: { type: 'ARRAY', items: { type: 'STRING' } },
        watch: { type: 'ARRAY', items: { type: 'STRING' } }
      },
      required: ['summary', 'good', 'watch']
    },
    patterns: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: { id: { type: 'STRING' }, intro: { type: 'STRING' } },
        required: ['id', 'intro']
      }
    },
    conversations: { type: 'ARRAY', items: { type: 'STRING' } },
    plan: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          week: { type: 'INTEGER' },
          focus: { type: 'STRING' },
          actions: { type: 'ARRAY', items: { type: 'STRING' } }
        },
        required: ['week', 'focus', 'actions']
      }
    }
  },
  required: ['headline', 'onePage', 'patterns', 'conversations', 'plan']
};

/* El detalle por persona que añade el agregado de la guía. */
function describeGuideDetail(d: Json): string {
  const fmt = (v: any, suffix = '') => (v === null || v === undefined ? 'sin datos' : `${v}${suffix}`);
  const people = (d.people || []).map((p: Json) => [
    `  - ${p.label}:`,
    `abre el ${p.openedPct}% de las conversaciones (${p.openedPctEarly}% en la primera mitad, ${p.openedPctLate}% en la segunda);`,
    `cierra el ${p.closedPct}%;`,
    `hizo ${p.questionsAsked} preguntas, ${p.unansweredPct}% sin respuesta en 12 h (${p.unansweredPctEarly}% → ${p.unansweredPctLate}%);`,
    `contesta en ${fmt(p.replyMedianMin, ' min')} de mediana (${fmt(p.replyMedianMinEarly, ' min')} → ${fmt(p.replyMedianMinLate, ' min')});`,
    `${p.lateNightPct}% de sus mensajes entre las 22 y las 6 h;`,
    `afecto escrito ${p.warmthPer100Early} → ${p.warmthPer100Late} por cada 100 mensajes;`,
    `ejes 0-100: iniciativa ${fmt(p.axes?.iniciativa)}, ritmo ${fmt(p.axes?.ritmo)}, calidez ${fmt(p.axes?.calidez)}, constancia ${fmt(p.axes?.constancia)}, atención ${fmt(p.axes?.atencion)}`
  ].join(' ')).join('\n');

  const topics = (d.topics || [])
    .filter((t: Json) => t.mentions > 0)
    .map((t: Json) => `${t.label} (${t.mentions} veces${t.avoided ? `, cuesta a ${(t.avoidedBy || []).join(' y ')}` : ''})`)
    .join(', ');
  const rituals = (d.rituals || [])
    .map((r: Json) => `${r.key}: ${r.present ? `presente en el ${r.daysPct}% de los días, ${r.trend}` : 'casi ausente'}`)
    .join('; ');
  const turning = (d.turningPoints || [])
    .map((t: Json) => `${t.month} (${t.direction === 'up' ? '+' : '−'}${t.pct}%)`)
    .join(', ');

  return [
    `- Score de los últimos 90 días: ${fmt(d.recentScore)}`,
    `- Por persona:\n${people}`,
    `- Temas: ${topics || 'sin datos suficientes'}`,
    `- Rituales: ${rituals || 'ninguno detectado'}`,
    `- Momentos de cambio: ${turning || 'ninguno marcado'}`,
    `- La conversación terminó en silencio: ${d.endsInSilence ? `sí, hace ${d.daysSinceLast} días` : 'no'}`
  ].join('\n');
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

    // ═══ GUÍA PERSONALIZADA (planes de pago) ═══
    if (mode === 'guide') {
      const couple = aggregate.couple || {};
      const detail = aggregate.detail || {};
      const patterns = (aggregate.patterns || [])
        .map((p: Json) => `  - ${p.id}: «${p.title}» (gravedad ${p.severity} de 3)`)
        .join('\n');
      const options = (aggregate.conversationOptions || [])
        .map((c: Json) => `  - ${c.id}: «${c.title}»`)
        .join('\n');

      const prompt = `Eres quien redacta un informe personal sobre la conversación de WhatsApp de una pareja. El informe ya tiene una guía escrita por expertos para cada patrón; tu trabajo es personalizarla con los números de este chat.

DATOS DEL CHAT (solo estadísticas, nunca mensajes):
${describeCouple(couple)}
${describeGuideDetail(detail)}

PATRONES QUE MERECEN ATENCIÓN (id: título):
${patterns || '  - ninguno'}

CONVERSACIONES DISPONIBLES (id: título):
${options}

${LABEL_RULE}

ESCRIBE, en español neutro de México (tú, nunca vosotros):
1. "headline": la frase más importante del análisis, una sola línea (máximo 140 caracteres), en segunda persona.
2. "onePage": "summary" (2 o 3 frases que explican el score con palabras), "good" (hasta 3 frases con lo que va bien, cada una con un número concreto) y "watch" (hasta 3 frases con lo que merece atención, cada una con un número concreto).
3. "patterns": para CADA patrón de la lista, un objeto con su "id" exacto y un "intro" de 2 a 3 frases que cuente lo que muestran los números de este chat para ese patrón. Sin interpretar intenciones.
4. "conversations": entre 3 y 5 ids de la lista de conversaciones disponibles, ordenados de más a menos útil para este chat.
5. "plan": exactamente 4 semanas (week 1 a 4). Semana 1 observar, 2 hablar, 3 probar algo distinto, 4 comparar. Cada una con "focus" (máximo 6 palabras) y "actions": 2 o 3 acciones pequeñas, concretas y medibles, en segunda persona.

REGLAS: tono claro, cálido y honesto. Sin dramatizar y sin culpar a nadie. Nada de términos clínicos ni etiquetas («tóxico», «narcisista», «apego ansioso», «red flag», «infiel»). No digas qué debe hacer con la relación: da herramientas para decidir. No uses emojis. Usa solo los números de arriba; no inventes datos.`;

      const guide = await askGeminiJson(prompt, GUIDE_SCHEMA, 3000, 0.2);
      if (!guide) {
        return NextResponse.json({ success: false, error: 'Sin respuesta de Gemini' }, { status: 502 });
      }
      return NextResponse.json({ success: true, guide });
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
  "headline": "La frase más importante del análisis, en una sola línea, en segunda persona y sin dramatizar",
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
