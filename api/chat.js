const axios = require('axios'); 

 

module.exports = async (req, res) => { 

    if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' }); 

 

    const { pregunta, contexto } = req.body; 

    const GROQ_KEY = process.env.GROQ_API_KEY; 

 

    const prompt = ` 

    Eres un asistente de auditoría SARLAFT.  

    Tu tarea es responder la pregunta del usuario basándote ÚNICA Y EXCLUSIVAMENTE en el contexto proporcionado. 

    Si la respuesta no está en el contexto, responde explícitamente: "No hay información en la noticia sobre este dato". No inventes nada. 

 

    Contexto del informe: 

    ${JSON.stringify(contexto)} 

 

    Pregunta del usuario: ${pregunta} 

    `; 

 

    try { 

        const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', { 

            model: 'llama-3.3-70b-versatile', 

            messages: [{ role: 'system', content: prompt }], 

            temperature: 0 

        }, { 

            headers: { Authorization: `Bearer ${GROQ_KEY}` } 

        }); 

 

        return res.status(200).json({ respuesta: response.data.choices[0].message.content }); 

    } catch (error) { 

        return res.status(500).json({ error: 'Error de conexión con el asistente.' }); 

    } 

}; 