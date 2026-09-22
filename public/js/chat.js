const { protegerRuta } = require('./_auth');

// Palabras que delatan que el analista está buscando un dato de identidad
// (cédula, apellido, nombre completo, etc.) para insistir más en la búsqueda web.
const RE_BUSQUEDA_IDENTIDAD = /(c[eé]dula|nuip|apellido|identificaci[oó]n|qui[eé]n es|nombre completo|documento|d\.?n\.?i\.?)/i;

async function tavilySearch(TAVILY_KEY, query, maxResults = 5) {
    try {
        const r = await fetch('https://api.tavily.com/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                api_key: TAVILY_KEY,
                query,
                search_depth: 'advanced',
                max_results: maxResults,
                include_answer: false
            })
        });
        if (!r.ok) return [];
        const data = await r.json();
        return Array.isArray(data.results) ? data.results : [];
    } catch (e) {
        console.error('Error Tavily:', e.message);
        return [];
    }
}

module.exports = protegerRuta(async (req, res) => {
    // Todo el handler queda envuelto en try/catch para GARANTIZAR que siempre
    // se responde JSON válido, incluso si algo revienta. Así el frontend nunca
    // debería mostrar "Error de conexión" por un fallo de parseo del lado del navegador.
    try {
        if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

        const { pregunta, contexto } = req.body || {};
        if (!pregunta || !String(pregunta).trim()) {
            return res.status(400).json({ error: 'Falta la pregunta.' });
        }

        const GROQ_KEY = process.env.GROQ_API_KEY;
        const TAVILY_KEY = process.env.TAVILY_API_KEY;

        if (!GROQ_KEY) {
            return res.status(200).json({
                respuesta: 'El asistente no está configurado del todo: falta la clave de la IA en el servidor (GROQ_API_KEY). Avísale a quien administra el sistema.',
                fuentes: []
            });
        }

        let contextoObj = {};
        try { contextoObj = typeof contexto === 'string' ? JSON.parse(contexto) : (contexto || {}); } catch (e) { /* contexto no es JSON, se ignora */ }

        const pistas = [contextoObj.titulo, contextoObj.lugar].filter(Boolean).join(' ');

        // ---- Investigación web iterativa: no se conforma con una sola búsqueda ----
        const fuentesEncontradas = [];
        const urlsVistas = new Set();

        if (TAVILY_KEY) {
            const esBusquedaDeIdentidad = RE_BUSQUEDA_IDENTIDAD.test(pregunta);

            const consultas = [`${pregunta} ${pistas}`.trim().substring(0, 250)];
            if (esBusquedaDeIdentidad && pistas) {
                consultas.push(`${pistas} nombre completo apellidos identidad`.substring(0, 250));
                consultas.push(`${pistas} cédula documento identificación`.substring(0, 250));
            }

            for (const q of consultas) {
                if (fuentesEncontradas.length >= 8) break;
                const resultados = await tavilySearch(TAVILY_KEY, q, 5);
                for (const r of resultados) {
                    if (r.url && !urlsVistas.has(r.url)) {
                        urlsVistas.add(r.url);
                        fuentesEncontradas.push(r);
                    }
                }
            }

            // Si es una búsqueda de identidad y aún no encontramos nada, se insiste
            // una vez más con una consulta más amplia antes de rendirse.
            if (esBusquedaDeIdentidad && fuentesEncontradas.length === 0 && pregunta.trim()) {
                const resultados = await tavilySearch(TAVILY_KEY, pregunta.trim().substring(0, 250), 5);
                for (const r of resultados) {
                    if (r.url && !urlsVistas.has(r.url)) {
                        urlsVistas.add(r.url);
                        fuentesEncontradas.push(r);
                    }
                }
            }
        }

        const contextoWeb = fuentesEncontradas
            .slice(0, 8)
            .map(r => `Fuente: ${r.url}\nContenido: ${(r.content || '').substring(0, 1200)}`)
            .join('\n\n');

        const prompt = `
Eres un asistente investigativo de un analista de cumplimiento SARLAFT. Hablas como una persona real, natural y directa — nunca como un bot que escupe texto plano lleno de asteriscos, símbolos raros o listas interminables de links.

Tu especialidad es encontrar datos de identidad de las personas involucradas en la noticia: nombres completos, apellidos, números de cédula/identificación, cargos y empresas relacionadas. Cuando te pregunten por un dato que falta, no te conformas con lo obvio: revisas con cuidado el informe y todo el material de búsqueda web antes de decir que no lo encontraste.

Cómo debes responder:
- Escribe en prosa natural, en párrafos cortos y claros, como si le explicaras algo a un colega por chat. Nada de tablas, nada de asteriscos sueltos ni bloques de markdown.
- Si encuentras el dato, dalo con seguridad y de forma directa. Si quieres respaldarlo, nombra la fuente de forma breve dentro de la frase (ej. "según El Tiempo..." o "de acuerdo con la Fiscalía..."), sin pegar URLs completas en medio del texto.
- No hagas listas largas de enlaces ni repitas la misma fuente varias veces. Las fuentes ya se muestran aparte, tú solo cuéntale al analista lo que encontraste.
- Si no hallas el dato exacto pero sí algo relacionado (el nombre pero no el apellido, una cédula parecida, un alias), explícalo: comparte lo que sí tienes y sé claro sobre qué falta.
- Solo di que no hay información disponible cuando de verdad no encontraste nada relevante ni en el informe ni en las búsquedas web. Nunca inventes un dato ni una cédula.
- Siempre responde algo útil y concreto, nunca dejes al analista sin respuesta.

Informe ya analizado (contexto de la noticia):
${JSON.stringify(contextoObj)}

Resultados de búsqueda web recién consultados:
${contextoWeb || 'No se encontraron resultados web para esta consulta.'}

Pregunta del analista: ${pregunta}
`;

        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'openai/gpt-oss-120b', // <-- Modelo estable y garantizado
                messages: [{ role: 'system', content: prompt }],
                temperature: 0.3
            })
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('Error Groq:', data);
            return res.status(200).json({
                respuesta: 'Tuve un problema consultando la IA en este momento. Intenta de nuevo en unos segundos.',
                fuentes: []
            });
        }

        const respuestaTexto = data?.choices?.[0]?.message?.content
            || 'No logré generar una respuesta esta vez. ¿Puedes reformular la pregunta?';
        const fuentesUnicas = fuentesEncontradas.slice(0, 5).map(r => r.url);

        return res.status(200).json({ respuesta: respuestaTexto, fuentes: fuentesUnicas });
    } catch (error) {
        console.error('Error inesperado en /api/chat:', error);
        return res.status(200).json({
            respuesta: 'Ocurrió un error inesperado procesando tu consulta. Intenta de nuevo.',
            fuentes: []
        });
    }
});