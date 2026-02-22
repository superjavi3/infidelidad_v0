import { NextRequest, NextResponse } from 'next/server';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

export async function POST(req: NextRequest) {
  try {
    const { messages, stats } = await req.json();

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
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
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