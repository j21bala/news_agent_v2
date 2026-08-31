module.exports = async (req, res) => {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

    const { pregunta, contexto } = req.body;
    const GROQ_KEY = process.env.GROQ_API_KEY;

    if (!GROQ_KEY) return res.status(500).json({ error: 'Falta API Key' });

    const prompt = `
    Eres un asistente de auditoría SARLAFT. 
    Tu tarea es responder la pregunta del usuario basándote ÚNICA Y EXCLUSIVAMENTE en el contexto proporcionado.
    Si la respuesta no está en el contexto, responde explícitamente: "No hay información en la noticia sobre este dato". No inventes nada.

    Contexto del informe:
    ${JSON.stringify(contexto)}

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
                model: 'llama-3.3-70b-versatile2', // <-- Modelo estable y garantizado
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

        return res.status(200).json({ respuesta: data.choices[0].message.content });
    } catch (error) {
        return res.status(500).json({ error: 'Error de conexión' });
    }
};
