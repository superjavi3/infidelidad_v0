import { NextRequest, NextResponse } from 'next/server';
import { gunzipSync } from 'zlib';

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
    const { mode, question, chatHistory, stats, messages } = body;

    console.log('API /analyze called - mode:', mode || 'analysis');

    // ===== MODO SUMMARY - PDF REPORT =====
    if (mode === 'summary') {
      const summaryPrompt = `Genera un resumen ejecutivo de esta relación de pareja.

DATOS:
- ${stats?.total || 0} mensajes analizados en ${stats?.uniqueDays || 0} días
- ${stats?.personA}: ${stats?.msgsA || 0} (${stats?.total ? Math.round(stats.msgsA / stats.total * 100) : 0}%)
- ${stats?.personB}: ${stats?.msgsB || 0} (${stats?.total ? Math.round(stats.msgsB / stats.total * 100) : 0}%)
- Score: ${stats?.score || 'N/A'}/100
- Emojis de amor: ${stats?.loveCount || 0}
- Lidera: ${stats?.leader || 'N/A'} (${stats?.leaderPct || 0}%)

MUESTRA MENSAJES:
${(messages || []).slice(-30).map((m: any) => `[${m.date}] ${m.sender}: ${m.text?.substring(0, 60)}`).join('\n')}

ESCRIBE (máx 200 palabras):
1. Estado actual de la relación
2. Fortalezas identificadas
3. Áreas de atención
4. Recomendación final

Tono: Profesional, empático, directo.`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: summaryPrompt }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 800, thinkingConfig: { thinkingBudget: 0 } }
          })
        }
      );
      const data = await response.json();
      if (!data.candidates?.[0]) {
        return NextResponse.json({ success: true, summary: 'Resumen no disponible.' });
      }
      const summary = data.candidates[0].content.parts[0].text.replace(/```/g, '').trim();
      return NextResponse.json({ success: true, summary });
    }

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
          console.log(`=== DEBUG DATE SEARCH ===`);
          console.log(`Looking for: day=${qDay} month=${qMonth} year=${qYearShort || 'any'}`);
          console.log(`First 3 msg dates:`, messages.slice(0, 3).map((m: any) => m.date));
          console.log(`Last 3 msg dates:`, messages.slice(-3).map((m: any) => m.date));

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

          // Debug: if not found, try manual string search
          if (dateFoundMessages.length === 0) {
            const monthStr = String(qMonth);
            const dayStr = String(qDay);
            const manual = messages.filter((m: any) => {
              const d = String(m.date || '');
              return d.includes(dayStr + '/' + monthStr) || d.includes(dayStr + '/' + monthStr.padStart(2, '0'));
            });
            console.log(`Manual string search for "${dayStr}/${monthStr}" → ${manual.length} found`);
            if (manual.length > 0) {
              console.log(`Sample manual match date:`, manual[0].date);
              dateFoundMessages = manual.filter((m: any) => {
                if (!qYearShort) return true;
                const d = String(m.date || '');
                return d.includes(String(qYearShort)) || d.includes(String(qYearShort + 2000));
              });
              console.log(`After year filter: ${dateFoundMessages.length} found`);
            }
          }
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

    // ===== MODO GROUP-ANALYSIS — Fun fact del grupo =====
    if (mode === 'group-analysis') {
      const memberList = (stats?.members || []).slice(0, 8).map((m: any) => `${m.name}: ${m.msgCount} msgs (${m.pct}%)`).join(', ');

      const groupPrompt = `Genera UN dato curioso corto y divertido sobre este grupo de WhatsApp.

REGLAS ESTRICTAS:
- MÁXIMO 1-2 frases. Nunca más de 30 palabras.
- Usa UN dato numérico concreto, no varios.
- Menciona solo 1-2 nombres de personas, no más.
- El dato debe hacer reír o sorprender. Tono: como contarle algo gracioso a un amigo.
- NO hagas comparaciones complicadas con múltiples personas.
- NO menciones porcentajes ni datos técnicos.
- NO inventes datos que no estén abajo.

Buenos ejemplos del tono que quiero:
- "Carlos ha mandado más audios que palabras escritas. Literalmente habla más de lo que escribe."
- "Si María cobrara $1 por cada 'jajaja', ya habría pagado la renta de un año."
- "Pedro lleva 1,283 días sin hablar. Ni para felicitar cumpleaños."
- "El grupo tiene 16 miembros pero solo 4 hablan. Los otros 12 son espectadores."

DATOS DEL GRUPO:
- ${stats?.totalMessages || 0} mensajes, ${stats?.members?.length || 0} miembros, ${stats?.uniqueDays || 0} días
- Miembros: ${memberList}

Responde en JSON: { "funInsight": "tu dato curioso aquí" }`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: groupPrompt }] }],
            generationConfig: { temperature: 0.8, maxOutputTokens: 300, thinkingConfig: { thinkingBudget: 0 } }
          })
        }
      );
      const data = await response.json();
      if (!data.candidates?.[0]) {
        return NextResponse.json({ success: true, analysis: { funInsight: 'No pudimos generar un dato curioso para este grupo.' } });
      }
      const text = data.candidates[0].content.parts[0].text;
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      const analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : { funInsight: text.replace(/```/g, '').trim() };
      return NextResponse.json({ success: true, analysis });
    }

    // ===== MODO GROUP-AUTOPSY — Momentos clave del grupo =====
    if (mode === 'group-autopsy') {
      const memberList = (stats?.members || []).slice(0, 15).map((m: any) => `${m.name}: ${m.msgCount} msgs`).join(', ');
      const monthlyData = (stats?.monthlyActivity || []).map((m: any) => `${m.month}: ${m.total} msgs`).join(', ');
      const events = (stats?.systemEvents || []).slice(0, 30).map((e: any) => `${e.date} - ${e.type}: ${e.actor}${e.target ? ' → ' + e.target : ''}${e.detail ? ' (' + e.detail + ')' : ''}`).join('\n');
      const sampleMsgs = (messages || []).slice(-100).map((m: any) => `[${m.date}] ${m.sender}: ${(m.text || '').substring(0, 60)}`).join('\n');

      const autopsyPrompt = `Eres un analista forense de grupos de WhatsApp. Identifica los 3-5 momentos clave donde la dinámica del grupo cambió.

DATOS:
- ${stats?.totalMessages || 0} msgs de ${stats?.members?.length || 0} miembros
- Miembros: ${memberList}

ACTIVIDAD MENSUAL: ${monthlyData}

EVENTOS DEL GRUPO:
${events || 'No se detectaron eventos de sistema'}

MUESTRA DE MENSAJES:
${sampleMsgs}

Responde en JSON array:
[{"date":"Mes Año","title":"Título corto","description":"Qué pasó (con nombres)","impact":"Cómo cambió el grupo","severity":"high|medium|low"}]

Máximo 5 momentos. Sé específico con nombres y datos.`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: autopsyPrompt }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 2000, thinkingConfig: { thinkingBudget: 0 } }
          })
        }
      );
      const data = await response.json();
      if (!data.candidates?.[0]) {
        return NextResponse.json({ success: true, autopsy: [] });
      }
      const text = data.candidates[0].content.parts[0].text;
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      const autopsy = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
      return NextResponse.json({ success: true, autopsy });
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