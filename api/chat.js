const { protegerRuta } = require('./_auth');

module.exports = protegerRuta(async (req, res) => {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

    const { pregunta, contexto } = req.body;
    const GROQ_KEY = process.env.GROQ_API_KEY;
    const TAVILY_KEY = process.env.TAVILY_API_KEY;

    if (!GROQ_KEY) return res.status(500).json({ error: 'Falta API Key' });

    let contextoWeb = "";
    let fuentesWeb = [];

    // ---- Buscar en internet información relevante para responder la pregunta ----
    if (TAVILY_KEY) {
        try {
            let contextoObj = {};
            try { contextoObj = typeof contexto === 'string' ? JSON.parse(contexto) : (contexto || {}); } catch (e) { /* contexto no es JSON, se ignora */ }

            const pistas = [contextoObj.titulo, contextoObj.lugar].filter(Boolean).join(' ');
            const query = `${pregunta} ${pistas}`.trim().substring(0, 250);

            const tavilyRes = await fetch('https://api.tavily.com/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ api_key: TAVILY_KEY, query, search_depth: 'advanced', max_results: 5, include_answer: false })
            });
            const tavilyData = await tavilyRes.json();
            if (tavilyData.results) {
                contextoWeb = tavilyData.results
                    .map(r => `Fuente: ${r.url}\nContenido: ${(r.content || '').substring(0, 1200)}`)
                    .join('\n\n');
                fuentesWeb = tavilyData.results.map(r => r.url);
            }
        } catch (e) {
            console.error('Error Tavily (chat):', e.message);
        }
    }

    const prompt = `
    Eres un asistente de auditoría SARLAFT con acceso a internet.
    Responde la pregunta del usuario usando, en este orden de prioridad:
    1) El contexto del informe (la noticia ya analizada).
    2) Las fuentes web listadas abajo, si el dato no está en el informe o necesita verificarse/ampliarse.

    Reglas obligatorias:
    - Cuando uses un dato que viene de una fuente web, dilo explícitamente así: "Según [URL o nombre del sitio], su nombre completo es ...". No mezcles datos de distintas fuentes sin aclarar cuál dice qué.
    - Si el dato está en el contexto del informe, puedes citarlo como "Según la noticia analizada, ...".
    - Si el dato no aparece ni en el contexto ni en las fuentes web, responde explícitamente: "No hay información disponible ni en la noticia ni en las fuentes web consultadas sobre este dato." No inventes nada.

    Contexto del informe:
    ${JSON.stringify(contexto)}

    Fuentes web consultadas ahora mismo:
    ${contextoWeb || 'No se encontraron fuentes web para esta pregunta.'}

    Pregunta del usuario: ${pregunta}
    `;

    try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'openai/gpt-oss-120b', // <-- Modelo estable y garantizado
                messages: [{ role: 'system', content: prompt }],
                temperature: 0
            })
        });

        const data = await response.json();

        console.log("Status Chat Groq:", response.status);
        if (!response.ok) {
            console.log("Error Groq:", data);
            return res.status(response.status).json({ error: 'Error de la IA', detalle: data });
        }

        return res.status(200).json({ respuesta: data.choices[0].message.content, fuentes: fuentesWeb });
    } catch (error) {
        return res.status(500).json({ error: 'Error de conexión' });
    }
});