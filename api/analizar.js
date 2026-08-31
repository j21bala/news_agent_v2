module.exports = async (req, res) => {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

    const { articulos } = req.body;
    const GROQ_KEY = process.env.GROQ_API_KEY;
    const TAVILY_KEY = process.env.TAVILY_API_KEY;

    if (!GROQ_KEY) return res.status(500).json({ error: 'Falta API Key de Groq' });

    let contextoWeb = "";
    let urlsEncontradas = [];

    if (articulos && articulos.length > 0) {
        const queryBusqueda = articulos[0].substring(0, 150);
        
        if (TAVILY_KEY) {
            try {
                const tavilyRes = await fetch('https://api.tavily.com/search', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        api_key: TAVILY_KEY,
                        query: queryBusqueda,
                        search_depth: "advanced",
                        include_sources: true,
                        max_results: 5
                    })
                });
                const tavilyData = await tavilyRes.json();
                if (tavilyData.results) {
                    contextoWeb = tavilyData.results.map(r => `Fuente Web (${r.url}): ${r.content}`).join('\n\n');
                    urlsEncontradas = tavilyData.results.map(r => r.url);
                }
            } catch (e) {
                console.error("Error en Tavily Search:", e);
            }
        }
    }

    const textoLocal = (articulos || []).join('\n\n---\n\n');

    const prompt = `
    Eres un oficial de cumplimiento y analista senior de riesgo SARLAFT. Analiza la información provista y el contexto de investigación web.
    Genera un INFORME DE RIESGO SARLAFT exhaustivo, profesional y formal.
    
    Responde ÚNICA Y EXCLUSIVAMENTE con un objeto JSON válido que contenga esta estructura exacta:
    {
      "sujeto_nombre": "Nombre completo de la persona o empresa investigada",
      "sujeto_perfil": "Breve descripción de su rol (ej: narcotraficante, empresario, etc.)",
      "riesgo_general": "Alto",
      "hechos_clave": [
        "Hecho clave 1 detallado",
        "Hecho clave 2 detallado",
        "Hecho clave 3 detallado"
      ],
      "analisis_riesgo": "Análisis legal, financiero y operativo detallado del riesgo de lavado de activos.",
      "porque_este_nivel": "Justificación clara de por qué se asigna este nivel de riesgo.",
      "tipo_id": "CC, NIT o CE",
      "numero_id": "Número de identificación detectado o estimado",
      "cliente_bcs": "Sí o No",
      "productos_bcs": "Detalle de productos o 'No aplica'",
      "cliente_fiduciaria": "Sí o No",
      "productos_fiduciaria": "Detalle de productos o 'No aplica'",
      "estado": "Detenido, Investigado, Condenado, Activo, etc.",
      "recomendacion": "Recomendación del analista (ej: Incluir en lista de reserva, debida diligencia intensificada, etc.)",
      "fuentes": [
        "https://ejemplo.com/fuente1"
      ]
    }

    Información local aportada:
    ${textoLocal}

    Contexto de investigación web (Tavily):
    ${contextoWeb}
    `;

    try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'openai/gpt-oss-120b',
                messages: [{ role: 'system', content: prompt }],
                response_format: { type: "json_object" },
                temperature: 0.1
            })
        });

        const data = await response.json();
        if (!response.ok) return res.status(response.status).json({ error: 'Error en la IA', detalle: data });

        const jsonRespuesta = JSON.parse(data.choices[0].message.content);
        
        if (urlsEncontradas.length > 0) {
            jsonRespuesta.fuentes = [...new Set([...(jsonRespuesta.fuentes || []), ...urlsEncontradas])];
        }

        return res.status(200).json(jsonRespuesta);
    } catch (error) {
        return res.status(500).json({ error: 'Falla interna en el análisis', detalle: error.message });
    }
};
