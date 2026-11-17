const { protegerRuta } = require('./_auth');

// Chat del asistente: búsqueda web rápida + respuesta en STREAMING (el primer texto llega en ~1-2 s).
module.exports = protegerRuta(async (req, res) => {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });
    const { pregunta, contexto, historial } = req.body || {};
    const GROQ_KEY = process.env.GROQ_API_KEY, TAVILY_KEY = process.env.TAVILY_API_KEY;
    if (!GROQ_KEY) return res.status(500).json({ error: 'Falta GROQ_API_KEY en Vercel.' });
    if (!pregunta || !String(pregunta).trim()) return res.status(400).json({ error: 'Pregunta vacía.' });

    const ctx = (typeof contexto === 'string' ? contexto : JSON.stringify(contexto || {})).slice(0, 10000);
    let ctxObj = {}; try { ctxObj = JSON.parse(ctx); } catch (_) {}

    // Inicia el stream de inmediato para evitar timeouts y mostrar progreso.
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();
    const send = o => res.write(`data: ${JSON.stringify(o)}\n\n`);
    const fin = () => { res.write('data: [DONE]\n\n'); res.end(); };

    // 1) Búsqueda web rápida (máx. 6 s, no bloquea si falla)
    let web = '', fuentes = [];
    if (TAVILY_KEY) {
        const ac = new AbortController(), to = setTimeout(() => ac.abort(), 6000);
        try {
            const q = `${pregunta} ${ctxObj.titulo || ''} ${ctxObj.lugar || ''}`.trim().slice(0, 250);
            const r = await fetch('https://api.tavily.com/search', { method: 'POST', signal: ac.signal, headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ api_key: TAVILY_KEY, query: q, search_depth: 'basic', max_results: 4, include_answer: false }) });
            const d = await r.json();
            if (d.results) { web = d.results.map(x => `Fuente: ${x.url}\n${(x.content || '').slice(0, 700)}`).join('\n\n'); fuentes = d.results.map(x => x.url); }
        } catch (e) { console.warn('Tavily chat:', e.message); } finally { clearTimeout(to); }
    }
    send({ f: fuentes });

    const system = `Eres un asistente de auditoría SARLAFT/LAFT. Responde en español, de forma concisa y bien estructurada (párrafos cortos, viñetas con "-" o tablas markdown simples).
Prioridad de datos: 1) el informe analizado, 2) las fuentes web. Si usas una fuente web, indícalo ("Según [sitio]…") sin mezclar datos de fuentes distintas.
Si el dato no está en el informe ni en las fuentes, dilo claramente. Nunca inventes datos; un vínculo o una noticia no implican responsabilidad penal.

INFORME:\n${ctx}\n\nFUENTES WEB:\n${web || 'Sin resultados web para esta pregunta.'}`;
    const msgs = [{ role: 'system', content: system }]
        .concat((Array.isArray(historial) ? historial : []).slice(-6).map(m => ({ role: m.r === 'u' ? 'user' : 'assistant', content: String(m.t || '').slice(0, 1500) })))
        .concat([{ role: 'user', content: String(pregunta).slice(0, 1500) }]);

    // 2) Respuesta en streaming con respaldo de modelo
    for (const model of ['openai/gpt-oss-120b', 'openai/gpt-oss-20b']) {
        try {
            const r = await fetch('https://api.groq.com/openai/v1/chat/completions', { method: 'POST',
                headers: { Authorization: `Bearer ${GROQ_KEY}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ model, messages: msgs, temperature: 0.2, max_tokens: 1800, stream: true, reasoning_effort: 'low' }) });
            if (!r.ok || !r.body) { console.warn('Groq', model, r.status); continue; }
            const rd = r.body.getReader(), dec = new TextDecoder(); let buf = '', hubo = false;
            while (true) {
                const { done, value } = await rd.read(); if (done) break;
                buf += dec.decode(value, { stream: true }); const ls = buf.split('\n'); buf = ls.pop();
                for (const l of ls) { if (!l.startsWith('data: ')) continue; const p = l.slice(6).trim(); if (p === '[DONE]') continue;
                    try { const t = JSON.parse(p).choices?.[0]?.delta?.content; if (t) { hubo = true; send({ t }); } } catch (_) {} }
            }
            if (hubo) return fin();
        } catch (e) { console.warn('Chat stream', model, e.message); }
    }
    send({ e: 'La IA no respondió a tiempo. Intenta de nuevo en unos segundos.' }); fin();
});
