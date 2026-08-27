const axios = require('axios');

module.exports = async (req, res) => {
    if (req.method !== 'POST') return res.status(405).send('Método no permitido');

    const { pregunta, contexto } = req.body;
    const GROQ_KEY = process.env.GROQ_API_KEY;

    const prompt = `Eres un auditor bancario SARLAFT. Tu tarea es responder a la pregunta basándote ÚNICA Y EXCLUSIVAMENTE en el JSON de la noticia proporcionada. 
    REGLA ESTRICTA: Si la respuesta no está en el texto proporcionado, responde "No hay información en la noticia sobre este dato". No inventes nada.
    
    Contexto JSON: ${contexto}
    
    Pregunta: ${pregunta}`;

    try {
        const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
            model: 'llama-3.3-70b-versatile',
            messages: [{ role: 'system', content: prompt }]
        }, {
            headers: { Authorization: `Bearer ${GROQ_KEY}` }
        });

        return res.status(200).json({ respuesta: response.data.choices[0].message.content });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
};