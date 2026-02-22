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
      console.log('Question:', question);
      console.log('Total messages available:', messages?.length || 0);

      // Step 1: Detect date-specific question
      const monthMap: Record<string, number> = {
        'enero': 1, 'febrero': 2, 'marzo': 3, 'abril': 4,
        'mayo': 5, 'junio': 6, 'julio': 7, 'agosto': 8,
        'septiembre': 9, 'octubre': 10, 'noviembre': 11, 'diciembre': 12
      };
      const dateRegex = /(\d{1,2})\s+de\s+(\w+)(?:\s+(?:de|del)\s+(\d{2,4}))?/i;
      const dateMatch = question.match(dateRegex);

      let isDateQuery = false;
      let dateFoundMessages: any[] = [];

      if (dateMatch && messages && messages.length > 0) {
        const qDay = parseInt(dateMatch[1]);
        const qMonthName = dateMatch[2].toLowerCase();
        const qMonth = monthMap[qMonthName] || 0;
        const qYearShort = dateMatch[3] ? parseInt(dateMatch[3].slice(-2)) : null;

        if (qMonth) {
          isDateQuery = true;
          dateFoundMessages = messages.filter((m: any) => {
            const dateStr = (m.date || '').replace(/[\[\]]/g, '').split(',')[0].trim();
            const parts = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
            if (!parts) return false;
            const mDay = parseInt(parts[1]);
            const mMonth = parseInt(parts[2]);
            const mYear = parseInt(parts[3]);
            return mDay === qDay && mMonth === qMonth && (!qYearShort || mYear === qYearShort || mYear === qYearShort + 2000);
          });
          console.log(`Date search: ${qDay}/${qMonth}${qYearShort ? '/' + qYearShort : ''} → ${dateFoundMessages.length} messages found`);
        }
      }

      // Step 2: Build prompt based on query type
      let therapistPrompt: string;

      if (isDateQuery && dateFoundMessages.length > 0) {
        // CASE 1: Date query WITH messages found
        therapistPrompt = `El usuario pregunta por el ${dateMatch![1]} de ${dateMatch![2]}${dateMatch![3] ? ' de ' + dateMatch![3] : ''}.

MENSAJES DE ESA FECHA (${dateFoundMessages.length}):
${dateFoundMessages.slice(0, 100).map((m: any) => `${m.time || ''} ${m.sender}: ${m.text}`).join('\n')}

Resume:
- De qué hablaron (2-3 temas principales)
- Tono de la conversación
- Algo destacable

Máximo 120 palabras. Sé específico.

PREGUNTA: ${question}`;

      } else if (isDateQuery && dateFoundMessages.length === 0) {
        // CASE 2: Date query but NO messages found
        const firstDate = messages?.[0]?.date || 'desconocida';
        const lastDate = messages?.[messages.length - 1]?.date || 'desconocida';
        therapistPrompt = `El usuario pregunta por el ${dateMatch![1]} de ${dateMatch![2]}${dateMatch![3] ? ' de ' + dateMatch![3] : ''}, pero NO hay mensajes de esa fecha.

El chat tiene mensajes desde ${firstDate} hasta ${lastDate}.

Dile que no encontraste mensajes de esa fecha y sugiere que pregunte por otra fecha dentro del rango del chat.

PREGUNTA: ${question}`;

      } else {
        // CASE 3: General question
        const recentMsgs = messages ? sampleMessages(messages, 30) : [];
        const recentHistory = chatHistory && chatHistory.length > 0
          ? chatHistory.slice(-2).map((m: any) => `${m.role === 'user' ? 'Usuario' : 'Terapeuta'}: ${m.text}`).join('\n')
          : '';

        therapistPrompt = `Eres terapeuta de parejas. Responde CONCISO.

DATOS:
- Total: ${stats?.total || 0} msgs en ${stats?.uniqueDays || 0} días
- ${stats?.personA || 'A'}: ${stats?.msgsA || 0} (${stats?.total ? Math.round(stats.msgsA / stats.total * 100) : 0}%)
- ${stats?.personB || 'B'}: ${stats?.msgsB || 0} (${stats?.total ? Math.round(stats.msgsB / stats.total * 100) : 0}%)
- Score: ${stats?.score || 'N/A'}/100 | Emojis amor: ${stats?.loveCount || 0} | Lidera: ${stats?.leader || 'N/A'} (${stats?.leaderPct || 0}%)

MENSAJES:
${recentMsgs.map((m: any) => `[${m.date}] ${m.sender}: ${m.text.substring(0, 80)}`).join('\n')}

REGLAS: Máximo 150 palabras. Datos concretos. Si no sabes, dilo.

${recentHistory ? `CONTEXTO:\n${recentHistory}\n` : ''}PREGUNTA: ${question}
RESPONDE:`;
      }

      console.log('Calling Gemini... prompt length:', therapistPrompt.length);
      const startTime = Date.now();

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: therapistPrompt }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 1500, thinkingConfig: { thinkingBudget: 0 } }
          })
        }
      );

      const data = await response.json();
      console.log(`Gemini responded in ${Date.now() - startTime}ms - status: ${response.status}`);

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

      let answer = data.candidates[0].content.parts[0].text;
      answer = answer.replace(/```json/g, '').replace(/```/g, '').trim();
      console.log('Answer length:', answer.length);
      return NextResponse.json({ success: true, answer });
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
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1500,
            thinkingConfig: { thinkingBudget: 0 }
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