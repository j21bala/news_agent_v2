// api/analizar.js
const axios = require('axios');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  const { articulo, link } = req.body;
  const GROQ_KEY = process.env.GROQ_API_KEY;
  const TAVILY_KEY = process.env.TAVILY_API_KEY;

  try {
    // 1. Extraer entidades para minimizar el gasto de tokens en la búsqueda
    const entityPrompt = `Extrae únicamente los nombres de personas y empresas clave del texto, separados por coma: "${articulo.substring(0, 1000)}"`;
    const groqEntityRes = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: entityPrompt }]
    }, { headers: { Authorization: `Bearer ${GROQ_KEY}` } });

    const entidades = groqEntityRes.data.choices[0].message.content;

    // 2. Búsqueda web dirigida con Tavily
    const tavilyRes = await axios.post('https://api.tavily.com/search', {
      api_key: TAVILY_KEY,
      query: entidades,
      max_results: 3
    });

    const fuentes = tavilyRes.data.results.map(r => ({ titulo: r.title, url: r.url, snippet: r.content }));

    return res.status(200).json({ entidades, fuentes, ok: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
