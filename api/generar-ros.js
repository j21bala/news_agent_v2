const axios = require('axios');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  const { textoDocumentos, plantillaPrompt } = req.body;
  const GEMINI_KEY = process.env.GEMINI_API_KEY;
  const GROQ_KEY = process.env.GROQ_API_KEY;

  const promptROS = `
  INSTRUCCIÓN DE SISTEMA - AUDITORÍA BANCARIA ROS:
  Genera un Reporte de Operaciones Sospechosas (ROS) estrictamente imparcial y objetivo para la Gerencia y Junta Directiva.
  
  REGLAS CRÍTICAS:
  1. No tomar partido ni calificar sin evidencia.
  2. No alucinar ni inferir. Si un dato no figura en los documentos, escribe explícitamente "No documentado".
  3. Cíñete a las directrices de la siguiente plantilla.

  PLANTILLA / REQUERIMIENTOS:
  ${plantillaPrompt}

  DOCUMENTOS Y FUENTES ADJUNTAS:
  ${textoDocumentos}
  `;

  // Intento 1: Gemini 2.0 Flash (Temperatura 0)
  try {
    const responseGemini = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
      {
        contents: [{ parts: [{ text: promptROS }] }],
        generationConfig: { temperature: 0 }
      },
      { headers: { 'Content-Type': 'application/json' }, timeout: 20000 }
    );

    const texto = responseGemini.data.candidates[0].content.parts[0].text;
    return res.status(200).json({ informe: texto, motor: 'Gemini 2.0 Flash' });

  } catch (geminiErr) {
    console.warn('Gemini conmutó por cuota/límite. Usando Groq...', geminiErr.message);

    // Intento 2: Groq Llama 3.3 70B (Respaldo Redundante)
    try {
      const responseGroq = await axios.post(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'system', content: promptROS }],
          temperature: 0
        },
        { headers: { Authorization: `Bearer ${GROQ_KEY}` }, timeout: 20000 }
      );

      return res.status(200).json({ 
        informe: responseGroq.data.choices[0].message.content, 
        motor: 'Groq (Respaldo)' 
      });

    } catch (groqErr) {
      return res.status(500).json({ error: 'Ambos motores de IA alcanzaron su límite temporal.' });
    }
  }
};
