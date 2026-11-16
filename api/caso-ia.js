const { protegerRuta } = require('./_auth');

// Redacta borradores a partir EXCLUSIVAMENTE de los datos del caso (sin inventar).
module.exports = protegerRuta(async (req, res) => {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });
    const { instruccion, caso } = req.body || {};
    const KEY = process.env.GROQ_API_KEY;
    if (!KEY) return res.status(500).json({ error: 'Falta GROQ_API_KEY en Vercel' });
    if (!instruccion || !caso) return res.status(400).json({ error: 'Faltan datos.' });

    const contexto = JSON.stringify(caso).slice(0, 60000);
    const system = 'Eres un analista senior SARLAFT/LAFT en Colombia. Redactas en español, tono formal de informe de cumplimiento. ' +
        'Usa ÚNICAMENTE los datos del caso entregados; si un dato no está, no lo inventes ni lo supongas. ' +
        'Un vínculo o una noticia no implican responsabilidad ni condena. Responde solo con el texto solicitado, sin markdown.';
    const modelos = ['openai/gpt-oss-120b', 'openai/gpt-oss-20b'];
    let ultimo = 'Sin respuesta de la IA.';
    for (const model of modelos) {
        try {
            const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}` },
                body: JSON.stringify({ model, temperature: 0.2, messages: [
                    { role: 'system', content: system },
                    { role: 'user', content: `DATOS DEL CASO (JSON):\n${contexto}\n\nTAREA: ${String(instruccion).slice(0, 800)}` }] })
            });
            const d = await r.json().catch(() => ({}));
            const texto = d?.choices?.[0]?.message?.content;
            if (r.ok && texto) return res.status(200).json({ texto: texto.trim() });
            ultimo = d?.error?.message || `HTTP ${r.status}`;
        } catch (e) { ultimo = e.message; }
    }
    return res.status(502).json({ error: ultimo });
});
