module.exports = async (req, res) => {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

    const { articulos } = req.body;
    const GROQ_KEY = process.env.GROQ_API_KEY;
    const TAVILY_KEY = process.env.TAVILY_API_KEY;

    if (!GROQ_KEY) return res.status(500).json({ error: 'Falta API Key de Groq en Vercel' });

    let contextoWeb = "";
    let urlsEncontradas = [];

    if (articulos && articulos.length > 0) {
        const queryBusqueda = articulos[0].substring(0, 150);
        if (TAVILY_KEY) {
            try {
                const tavilyRes = await fetch('https://api.tavily.com/search', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ api_key: TAVILY_KEY, query: queryBusqueda, search_depth: 'advanced', max_results: 4 })
                });
                const tavilyData = await tavilyRes.json();
                if (tavilyData.results) {
                    contextoWeb = tavilyData.results.map(r => `Fuente Web (${r.url}): ${r.content}`).join('\n\n');
                    urlsEncontradas = tavilyData.results.map(r => r.url);
                }
            } catch (e) {
                console.error("Error Tavily:", e);
            }
        }
    }

    const textoLocal = (articulos || []).join('\n\n---\n\n');

    const prompt = `Eres un analista senior de riesgo SARLAFT. Analiza la noticia y el contexto web.
    
    Reglas:
    - "titulo": titular exacto.
    - "resumen": 5 a 7 frases.
    - "hechos_clave": 4 a 6 hechos.
    - "personas": lista a TODOS los involucrados. Para cada uno define: nombre, rol_en_hechos (delito), cargo_o_actividad, analisis_riesgo (detallado), estado_proceso (Investigado, Detenido, Condenado, Prófugo, Fallecido), justificacion_riesgo (1 frase) y nivel_riesgo_sugerido (alto, medio, bajo).

    Responde ÚNICA Y EXCLUSIVAMENTE con este JSON:
    {
     "titulo": "Titular",
     "medio": "Medio",
     "fecha": "Fecha",
     "lugar": "Lugar",
     "resumen": "Resumen...",
     "hechos_clave": ["hecho 1","hecho 2"],
     "personas": [{
        "nombre": "Nombre completo",
        "rol_en_hechos": "Delito",
        "cargo_o_actividad": "Cargo",
        "analisis_riesgo": "Análisis...",
        "estado_proceso": "Investigado",
        "justificacion_riesgo": "Justificación...",
        "nivel_riesgo_sugerido": "alto"
     }],
     "fuentes_consultadas": []
    }

    Noticia: """${textoLocal}"""
    Contexto Web: ${contextoWeb}`;

    try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_KEY}` },
            body: JSON.stringify({
                model: 'openai/gpt-oss-120b',
                messages: [{ role: 'user', content: prompt }],
                response_format: { type: 'json_object' }
            })
        });

        const data = await response.json();
        if (!response.ok) return res.status(response.status).json({ error: 'Error IA', detalle: data });

        const jsonRespuesta = JSON.parse(data.choices[0].message.content);
        jsonRespuesta.fuentes_consultadas = Array.from(new Set([...(jsonRespuesta.fuentes_consultadas || []), ...urlsEncontradas]));
        
        return res.status(200).json(jsonRespuesta);
    } catch (error) {
        return res.status(500).json({ error: 'Fallo servidor', detalle: error.message });
    }
};
