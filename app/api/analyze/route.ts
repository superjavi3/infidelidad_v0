import { NextRequest, NextResponse } from 'next/server';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { mode, question, chatHistory, stats, messages } = body;

    console.log('API /analyze called - mode:', mode || 'analysis');

    // ===== MODO CHAT - TERAPEUTA IA =====
    if (mode === 'chat') {
      console.log('=== CHATBOT DEBUG ===');
      console.log('API Key exists:', !!GEMINI_API_KEY);
      console.log('API Key starts with AIza:', GEMINI_API_KEY?.startsWith('AIza'));
      console.log('Question:', question);
      console.log('Stats exist:', !!stats);
      console.log('Messages count:', messages?.length || 0);

      const sampleMsgs = messages ? sampleMessages(messages, 100) : [];

      const therapistPrompt = `Eres un terapeuta de parejas especializado en análisis de comunicación digital.

ANÁLISIS COMPLETO DEL CHAT:
- Total mensajes: ${stats?.total || 0}
- ${stats?.personA || 'Persona A'}: ${stats?.msgsA || 0} mensajes (${stats?.total ? Math.round(stats.msgsA / stats.total * 100) : 0}%)
- ${stats?.personB || 'Persona B'}: ${stats?.msgsB || 0} mensajes (${stats?.total ? Math.round(stats.msgsB / stats.total * 100) : 0}%)
- Días de conversación: ${stats?.uniqueDays || 0}
- Score de relación: ${stats?.score || 'N/A'}/100
- Emojis de amor: ${stats?.loveCount || 0}
- Quién lidera: ${stats?.leader || 'N/A'} (${stats?.leaderPct || 0}%)

MUESTRA DE MENSAJES RECIENTES:
${sampleMsgs.map((m: any) => `[${m.date}] ${m.sender}: ${m.text.substring(0, 100)}`).join('\n')}

INSTRUCCIONES:
- Responde de forma empática pero honesta
- Usa DATOS REALES del análisis, nunca inventes
- Cita fechas específicas cuando sea relevante
- Máximo 3-4 párrafos
- Tono: Amigable y profesional, como una amiga psicóloga
- Usa emojis sutiles pero con moderación
- Si no tienes datos suficientes para responder algo específico, dilo honestamente

${chatHistory && chatHistory.length > 0 ? `CONVERSACIÓN PREVIA:\n${chatHistory.map((m: any) => `${m.role === 'user' ? 'Usuario' : 'Terapeuta'}: ${m.text}`).join('\n')}\n` : ''}

PREGUNTA DEL USUARIO:
${question}

RESPONDE DE FORMA CONVERSACIONAL:`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: therapistPrompt }] }],
            generationConfig: { temperature: 0.8, maxOutputTokens: 800 }
          })
        }
      );

      const data = await response.json();
      console.log('Gemini response status:', response.status);
      console.log('Gemini raw response:', JSON.stringify(data).substring(0, 500));
      console.log('Has candidates:', !!data.candidates);

      if (!data.candidates || !data.candidates[0]) {
        console.error('Gemini blocked or no response:', JSON.stringify(data).substring(0, 500));

        // Safety block check
        if (data.promptFeedback?.blockReason) {
          console.error('Blocked by safety:', data.promptFeedback.blockReason);
        }

        // Fallback: respuesta basada en estadísticas
        const pctA = stats?.total ? Math.round((stats.msgsA || 0) / stats.total * 100) : 50;
        const pctB = stats?.total ? Math.round((stats.msgsB || 0) / stats.total * 100) : 50;
        const leader = pctA > pctB ? stats?.personA : stats?.personB;
        const follower = pctA > pctB ? stats?.personB : stats?.personA;
        const leaderPct = Math.max(pctA, pctB);

        const fallbackAnswer = `Entiendo tu pregunta: "${question}"

Basándome en el análisis de ${stats?.total || 0} mensajes entre ${stats?.personA || 'Persona A'} y ${stats?.personB || 'Persona B'}:

**Stats clave:**
- ${stats?.personA || 'Persona A'}: ${stats?.msgsA || 0} mensajes (${pctA}%)
- ${stats?.personB || 'Persona B'}: ${stats?.msgsB || 0} mensajes (${pctB}%)
- Conversación de ${stats?.uniqueDays || 0} días
- Score de relación: ${stats?.score || 'N/A'}/100
- Emojis de amor encontrados: ${stats?.loveCount || 0}

**Observación rápida:** ${leader} lleva el ritmo de la conversación con ${leaderPct}% de los mensajes. ${leaderPct > 65 ? `Hay un desbalance notable - ${follower} participa menos.` : 'La participación está relativamente equilibrada.'}

*Estoy procesando tu pregunta con IA para darte una respuesta más personalizada. Si ves este mensaje, inténtalo de nuevo en unos minutos.*`;

        return NextResponse.json({ success: true, answer: fallbackAnswer });
      }

      const answer = data.candidates[0].content.parts[0].text;
      return NextResponse.json({ success: true, answer: answer.trim() });
    }

    // ===== MODO ANALYSIS - ORIGINAL =====
    // Samplear mensajes (no enviar todos)
    const sample = sampleMessages(messages, 300);

    // Prompt para Gemini
    const prompt = `
Eres un experto en análisis de relaciones de pareja. Analiza esta conversación de WhatsApp y dame insights concretos.

ESTADÍSTICAS:
- Total mensajes: ${stats.total}
- Persona A (${stats.personA}): ${stats.msgsA} mensajes
- Persona B (${stats.personB}): ${stats.msgsB} mensajes
- Días de conversación: ${stats.uniqueDays}

MUESTRA DE MENSAJES (${sample.length} de ${messages.length}):
${sample.map((m: any) => `${m.sender}: ${m.text}`).join('\n')}

ANALIZA Y RESPONDE EN JSON con esta estructura:
{
  "redFlags": ["señal 1", "señal 2"] o [],
  "greenFlags": ["señal positiva 1", "señal positiva 2"],
  "whoLeads": "Descripción de quién lleva la relación y por qué",
  "communicationStyle": "Descripción del estilo de comunicación de ambos",
  "emotionalTone": "Positivo/Neutro/Tenso/Distante",
  "funInsight": "Un dato curioso interesante sobre esta relación"
}

IMPORTANTE: 
- Sé específico pero amable
- No inventes cosas que no veas en los mensajes
- Si no hay red flags, el array debe estar vacío
- El funInsight debe ser único y basado en los datos reales
`;

    // Llamar a Gemini
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1000,
          }
        })
      }
    );

    const data = await response.json();
    
    if (!data.candidates || !data.candidates[0]) {
      throw new Error('No response from Gemini');
    }

    const text = data.candidates[0].content.parts[0].text;
    
    // Extraer JSON del texto (Gemini a veces lo envuelve en ```json)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(text);

    return NextResponse.json({ success: true, analysis });

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