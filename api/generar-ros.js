const { protegerRuta } = require('./_auth');
const { construirPromptROS, NOTA_LEGAL } = require('./plantilla-ros');

// =============================================================================
//  Extracción robusta del JSON devuelto por el modelo.
//  El problema del método anterior (primer "{" ... último "}") es que si el
//  modelo escribe CUALQUIER cosa con llaves después del JSON, o si la respuesta
//  viene truncada, el corte resultante deja basura pegada al final y JSON.parse
//  falla con "Unexpected non-whitespace character after JSON".
//  Aquí se recorre el texto contando llaves y respetando comillas y escapes,
//  para quedarnos con el PRIMER objeto de nivel superior completo.
// =============================================================================
function recortarObjeto(texto) {
  const ini = texto.indexOf('{');
  if (ini === -1) return null;

  let profundidad = 0;
  let enCadena = false;
  let escapado = false;

  for (let i = ini; i < texto.length; i++) {
    const c = texto[i];

    if (enCadena) {
      if (escapado) escapado = false;
      else if (c === '\\') escapado = true;
      else if (c === '"') enCadena = false;
      continue;
    }

    if (c === '"') enCadena = true;
    else if (c === '{') profundidad++;
    else if (c === '}') {
      profundidad--;
      if (profundidad === 0) return texto.slice(ini, i + 1); // objeto completo
    }
  }

  return null; // se acabó el texto sin cerrar: respuesta truncada
}

function extraerJSON(texto, etiquetaMotor) {
  if (!texto || !String(texto).trim()) {
    throw new Error(`${etiquetaMotor} devolvió una respuesta vacía.`);
  }

  // Quita cercas markdown estén donde estén (no solo al inicio y al final).
  const limpio = String(texto)
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim();

  const bloque = recortarObjeto(limpio);

  if (!bloque) {
    throw new Error(
      `${etiquetaMotor} devolvió un JSON incompleto (respuesta cortada a la mitad, ` +
      `probablemente por límite de tokens). Longitud recibida: ${limpio.length} caracteres.`
    );
  }

  try {
    return JSON.parse(bloque);
  } catch (e) {
    const pos = Number((e.message.match(/position (\d+)/) || [])[1]);
    const ctx = Number.isFinite(pos)
      ? ` Contexto: ...${bloque.slice(Math.max(0, pos - 60), pos + 60)}...`
      : '';
    throw new Error(`${etiquetaMotor} devolvió un JSON inválido: ${e.message}.${ctx}`);
  }
}

// Reintenta con backoff exponencial ante errores transitorios (modelo saturado,
// rate limit, etc.). Evita conmutar a Groq por un 503 que se resuelve solo
// segundos después. No reintenta errores permanentes (4xx que no sean 429).
async function fetchConReintentos(url, opciones, intentos = 3) {
  const CODIGOS_TRANSITORIOS = new Set([429, 500, 502, 503, 504]);
  let ultimaRespuesta;

  for (let i = 0; i < intentos; i++) {
    const r = await fetch(url, opciones);
    if (r.ok) return r;

    ultimaRespuesta = r;
    if (!CODIGOS_TRANSITORIOS.has(r.status) || i === intentos - 1) return r;

    const espera = 1000 * Math.pow(2, i); // 1s, 2s, 4s
    console.warn(`Gemini respondió HTTP ${r.status} (intento ${i + 1}/${intentos}), reintentando en ${espera}ms...`);
    await new Promise((resolve) => setTimeout(resolve, espera));
  }

  return ultimaRespuesta;
}

module.exports = protegerRuta(async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  const { textoDocumentos, instruccionesAnalista } = req.body || {};

  if (!textoDocumentos || !String(textoDocumentos).trim()) {
    return res.status(400).json({ error: 'No se recibieron evidencias documentales para analizar.' });
  }

  const GEMINI_KEY = process.env.GEMINI_API_KEY;
  const GROQ_KEY = process.env.GROQ_API_KEY;
  // "gemini-flash-latest" es el alias oficial que Google mantiene apuntando
  // siempre al último Flash estable, así este código no se rompe cada vez que
  // retiran una versión (p. ej. 2.5-flash: baja el 16/10/2026). Si prefieres
  // fijar una versión concreta, defínela en GEMINI_MODEL en Vercel.
  const GEMINI_MODELO = process.env.GEMINI_MODEL || 'gemini-3.6-flash';

  const MAX_CHARS = 180000;
  const evidencias = String(textoDocumentos).slice(0, MAX_CHARS);
  const prompt = construirPromptROS(evidencias, instruccionesAnalista);

  // Se acumulan los fallos para poder explicarlos si no responde ningún motor.
  const fallos = [];

  // ---------- Intento 1: Gemini ----------
  if (GEMINI_KEY) {
    try {
      const r = await fetchConReintentos(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODELO}:generateContent?key=${GEMINI_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0,
              // Un ROS completo con tablas de movimientos supera con holgura los
              // 8192 tokens: ese límite era la causa de las respuestas cortadas.
              maxOutputTokens: 65536,
              responseMimeType: 'application/json'
            }
          })
        }
      );

      if (!r.ok) {
        const cuerpo = await r.text().catch(() => '');
        throw new Error(`HTTP ${r.status}. ${cuerpo.slice(0, 300)}`);
      }

      const data = await r.json();
      const cand = data?.candidates?.[0];

      // Si el modelo se quedó sin tokens, decirlo claro en vez de fallar al parsear.
      if (cand?.finishReason && cand.finishReason !== 'STOP') {
        throw new Error(
          `la generación terminó por "${cand.finishReason}" (respuesta incompleta). ` +
          `Reduce el número de evidencias o divide el análisis.`
        );
      }

      // La respuesta puede venir repartida en varias "parts".
      const texto = (cand?.content?.parts || [])
        .map((p) => p?.text || '')
        .join('');

      const informe = extraerJSON(texto, `Gemini (${GEMINI_MODELO})`);
      return res.status(200).json({
        informe,
        notaLegal: NOTA_LEGAL,
        motor: `Gemini ${GEMINI_MODELO}`
      });
    } catch (e) {
      fallos.push(`Gemini: ${e.message}`);
      console.warn('Gemini falló, se conmuta a Groq:', e.message);
    }
  }

  // ---------- Intento 2: Groq (respaldo) ----------
  if (GROQ_KEY) {
    // compound-mini no admite response_format json_object y su tope real de
    // salida es 8192 tokens (no 32768): se marca aparte para cada uno.
    const MODELOS_GROQ = ['openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'groq/compound-mini'];

    for (const modelo of MODELOS_GROQ) {
      try {
        const cuerpo = {
          model: modelo.id,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0,
          max_completion_tokens: modelo.maxTokens
        };
        if (modelo.json) cuerpo.response_format = { type: 'json_object' };

        const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${GROQ_KEY}` },
          body: JSON.stringify(cuerpo)
        });

        if (!r.ok) {
          const t = await r.text().catch(() => '');
          fallos.push(`Groq ${modelo.id}: HTTP ${r.status}. ${t.slice(0, 200)}`);
          continue;
        }

        const data = await r.json();
        const eleccion = data?.choices?.[0];

        if (eleccion?.finish_reason === 'length') {
          fallos.push(`Groq ${modelo.id}: respuesta cortada por límite de tokens.`);
          continue;
        }

        const informe = extraerJSON(eleccion?.message?.content, `Groq ${modelo.id}`);
        return res.status(200).json({
          informe,
          notaLegal: NOTA_LEGAL,
          motor: `Groq ${modelo.id} (respaldo)`
        });
      } catch (e) {
        fallos.push(`Groq ${modelo.id}: ${e.message}`);
      }
    }
  }

  if (!GEMINI_KEY && !GROQ_KEY) {
    return res.status(500).json({
      error: 'Faltan GEMINI_API_KEY y GROQ_API_KEY en las variables de entorno.'
    });
  }

  return res.status(500).json({
    error: 'Ningún motor pudo generar el ROS.',
    detalle: fallos
  });
});

module.exports.config = { maxDuration: 60 };