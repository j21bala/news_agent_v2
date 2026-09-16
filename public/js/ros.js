const { protegerRuta } = require('./_auth');
const { construirPromptROS, NOTA_LEGAL } = require('./plantilla-ros');

// Limpia cercas markdown y texto sobrante alrededor del JSON.
function extraerJSON(texto) {
  if (!texto) throw new Error('El motor devolvió una respuesta vacía.');
  let limpio = String(texto).trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  const ini = limpio.indexOf('{');
  const fin = limpio.lastIndexOf('}');
  if (ini === -1 || fin === -1) throw new Error('El motor no devolvió un JSON válido.');
  return JSON.parse(limpio.slice(ini, fin + 1));
}

module.exports = protegerRuta(async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  // Ya NO se recibe plantillaPrompt: la plantilla vive en el servidor.
  const { textoDocumentos, instruccionesAnalista } = req.body || {};

  if (!textoDocumentos || !String(textoDocumentos).trim()) {
    return res.status(400).json({ error: 'No se recibieron evidencias documentales para analizar.' });
  }

  const GEMINI_KEY = process.env.GEMINI_API_KEY;
  const GROQ_KEY = process.env.GROQ_API_KEY;

  // Recorte defensivo para no reventar el contexto del modelo.
  const MAX_CHARS = 180000;
  const evidencias = String(textoDocumentos).slice(0, MAX_CHARS);

  const prompt = construirPromptROS(evidencias, instruccionesAnalista);

  // ---------- Intento 1: Gemini 2.0 Flash (temperatura 0, salida JSON) ----------
  if (GEMINI_KEY) {
    try {
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0,
              maxOutputTokens: 8192,
              responseMimeType: 'application/json'
            }
          })
        }
      );

      if (!r.ok) throw new Error(`Gemini respondió ${r.status}`);
      const data = await r.json();
      const texto = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      const informe = extraerJSON(texto);

      return res.status(200).json({ informe, notaLegal: NOTA_LEGAL, motor: 'Gemini 2.0 Flash' });
    } catch (e) {
      console.warn('Gemini falló, se conmuta a Groq:', e.message);
    }
  }

  // ---------- Intento 2: Groq (respaldo, cadena de modelos) ----------
  if (GROQ_KEY) {
    const MODELOS_GROQ = ['openai/gpt-oss-120b', 'llama-3.3-70b-versatile', 'openai/gpt-oss-20b'];
    let ultimoError = 'Groq no respondió.';

    for (const modelo of MODELOS_GROQ) {
      try {
        const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${GROQ_KEY}` },
          body: JSON.stringify({
            model: modelo,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0,
            response_format: { type: 'json_object' }
          })
        });

        if (!r.ok) {
          ultimoError = `${modelo} respondió ${r.status}`;
          continue;
        }

        const data = await r.json();
        const informe = extraerJSON(data?.choices?.[0]?.message?.content);
        return res.status(200).json({ informe, notaLegal: NOTA_LEGAL, motor: `Groq ${modelo} (respaldo)` });
      } catch (e) {
        ultimoError = e.message;
      }
    }

    return res.status(500).json({ error: `No se pudo generar el ROS. ${ultimoError}` });
  }

  return res.status(500).json({ error: 'Faltan GEMINI_API_KEY y GROQ_API_KEY en las variables de entorno.' });
});

// Vercel: el llenado completo de la plantilla puede tardar más de 10 s.
module.exports.config = { maxDuration: 60 };