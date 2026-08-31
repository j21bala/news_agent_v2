module.exports = async (req, res) => {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

    const { articulos, link } = req.body;
    const GROQ_KEY = process.env.GROQ_API_KEY;
    const TAVILY_KEY = process.env.TAVILY_API_KEY;

    if (!GROQ_KEY) return res.status(500).json({ error: 'Falta API Key de Groq en Vercel' });

    const textoLocal = (articulos || []).join('\n\n---\n\n');
    let urlsEncontradas = [];
    let contextoWeb = "";

    // ---- Helper: llamar a Groq ----
    async function groqChat(prompt, { json = true } = {}) {
        const body = {
            model: 'openai/gpt-oss-120b',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0
        };
        if (json) body.response_format = { type: 'json_object' };
        const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_KEY}` },
            body: JSON.stringify(body)
        });
        const d = await r.json();
        if (!r.ok) throw { status: r.status, detalle: d };
        return d.choices[0].message.content;
    }

    // ---- Helper: buscar en Tavily ----
    async function tavilySearch(query, maxResults = 4) {
        if (!TAVILY_KEY || !query) return [];
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
            const d = await r.json();
            return d.results || [];
        } catch (e) {
            console.error('Error Tavily search:', query, e.message);
            return [];
        }
    }

    // ---- Helper: extraer el contenido completo de una URL (si el usuario pegó un link) ----
    async function tavilyExtract(url) {
        if (!TAVILY_KEY || !url) return null;
        try {
            const r = await fetch('https://api.tavily.com/extract', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ api_key: TAVILY_KEY, urls: [url] })
            });
            const d = await r.json();
            const res0 = (d.results || [])[0];
            return res0 ? res0.raw_content : null;
        } catch (e) {
            console.error('Error Tavily extract:', url, e.message);
            return null;
        }
    }

    try {
        // ---- Paso 0: si el usuario pegó un enlace, traer el artículo completo de esa fuente ----
        let textoEnlace = "";
        if (link) {
            const extraido = await tavilyExtract(link);
            if (extraido) {
                textoEnlace = extraido.substring(0, 3000);
                urlsEncontradas.push(link);
            }
        }

        const textoBase = [textoLocal, textoEnlace].filter(Boolean).join('\n\n---\n\n');

        // ---- Paso 1: extracción rápida de entidades para saber QUÉ buscar en internet ----
        let entidades = { titulo: '', lugar: '', personas: [] };
        if (TAVILY_KEY) {
            try {
                const promptEntidades = `Lee la siguiente noticia y responde ÚNICA Y EXCLUSIVAMENTE con este JSON, sin texto adicional:
{
 "titulo": "titular exacto o mejor aproximación",
 "lugar": "ciudad/país donde ocurren los hechos",
 "personas": ["nombre 1 mencionado", "nombre 2 mencionado"]
}
Incluye en "personas" a TODAS las personas naturales y funcionarios nombrados en el texto (máximo 6).

Noticia: """${textoBase.substring(0, 3000)}"""`;
                const raw = await groqChat(promptEntidades);
                entidades = JSON.parse(raw);
            } catch (e) {
                console.error('Error extracción entidades:', e.message || e);
            }
        }

        // ---- Paso 2: búsquedas en internet: 1 general + 1 por cada persona detectada ----
        if (TAVILY_KEY) {
            const queries = [];
            const queryGeneral = [entidades.titulo, entidades.lugar].filter(Boolean).join(' ') || textoBase.substring(0, 150);
            queries.push(queryGeneral);

            const personas = (entidades.personas || []).slice(0, 3);
            personas.forEach(nombre => {
                queries.push(`"${nombre}" nombre completo ${entidades.lugar || ''}`.trim());
            });

            const resultadosPorQuery = await Promise.all(queries.map(q => tavilySearch(q, 3)));

            const bloques = [];
            resultadosPorQuery.forEach((results, idx) => {
                results.forEach(r => {
                    bloques.push(`[Búsqueda: "${queries[idx]}"] Fuente: ${r.url}\nContenido: ${(r.content || '').substring(0, 500)}`);
                    urlsEncontradas.push(r.url);
                });
            });
            contextoWeb = bloques.join('\n\n').substring(0, 6000);
            urlsEncontradas = Array.from(new Set(urlsEncontradas));
        }

        // ---- Paso 3: análisis final SARLAFT combinando texto original + todo lo hallado en internet ----
        const promptFinal = `Eres un analista senior de riesgo SARLAFT con acceso a fuentes de internet. Analiza la noticia usando el texto original Y el contexto web recopilado abajo. Prioriza los datos confirmados por varias fuentes web (nombres completos, cargos, estado del proceso judicial) sobre datos ambiguos del texto original.

Reglas:
- "titulo": titular exacto.
- "resumen": 5 a 7 frases.
- "hechos_clave": 4 a 6 hechos.
- "personas": lista a TODOS los involucrados. Para cada uno define: nombre (el nombre COMPLETO más preciso que encuentres, priorizando fuentes web), rol_en_hechos (delito), cargo_o_actividad, analisis_riesgo (detallado), estado_proceso (Investigado, Detenido, Condenado, Prófugo, Fallecido), justificacion_riesgo (1 frase), nivel_riesgo_sugerido (alto, medio, bajo), y "fuentes" (array de URLs del contexto web que respaldan los datos de esta persona; vacío si no hay ninguna).

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
    "nivel_riesgo_sugerido": "alto",
    "fuentes": []
 }],
 "fuentes_consultadas": []
}

Noticia (texto original${textoEnlace ? ' + artículo completo del enlace proporcionado' : ''}): """${textoBase.substring(0, 6000)}"""

Contexto web recopilado en internet (usa esto para completar nombres, cargos y estado del proceso):
${contextoWeb || 'No se encontraron resultados web adicionales.'}`;

        const rawFinal = await groqChat(promptFinal);
        const jsonRespuesta = JSON.parse(rawFinal);
        jsonRespuesta.fuentes_consultadas = Array.from(new Set([...(jsonRespuesta.fuentes_consultadas || []), ...urlsEncontradas]));

        return res.status(200).json(jsonRespuesta);
    } catch (error) {
        const status = error && error.status ? error.status : 500;
        const detalle = error && error.detalle ? error.detalle : (error.message || String(error));
        return res.status(status).json({ error: 'Fallo servidor', detalle });
    }
};