module.exports = async (req, res) => {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

    const { articulos } = req.body;
    const GROQ_KEY = process.env.GROQ_API_KEY;

    // Validación de la llave
    if (!GROQ_KEY) {
        return res.status(500).json({ error: 'Falta la API Key de Groq en las variables de entorno de Vercel.' });
    }

    if (!articulos || articulos.length === 0) {
        return res.status(400).json({ error: 'No se enviaron artículos' });
    }

    const textosUnidos = articulos.join('\n\n---\n\n');

    const prompt = `
    Eres un analista senior de riesgo SARLAFT. Analiza la siguiente información y extrae los datos en formato JSON estrictamente.
    
    ESTRUCTURA JSON OBLIGATORIA:
    {
      "riesgo_general": "Alto, Medio o Bajo",
      "resumen": "Resumen de los hechos y delitos (máximo 5 líneas)",
      "involucrados": [
        {
          "nombre": "Nombre de la persona o empresa",
          "rol": "Delito o implicación",
          "estado": "Investigado, Detenido, Condenado, etc."
        }
      ]
    }

    Textos a analizar:
    ${textosUnidos}
    `;

    try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: [{ role: 'system', content: prompt }],
                response_format: { type: "json_object" },
                temperature: 0.2
            })
        });

        const data = await response.json();

        // Si Groq responde con un error, se lo enviamos al frontend para saber exactamente qué es
        if (!response.ok) {
            return res.status(response.status).json({ error: 'Error del motor de IA', detalle: data });
        }

        const jsonRespuesta = JSON.parse(data.choices[0].message.content);
        return res.status(200).json(jsonRespuesta);
    } catch (error) {
        return res.status(500).json({ error: 'Fallo interno del servidor.', detalle: error.message });
    }
};
