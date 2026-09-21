const { protegerRuta } = require('./_auth');
const { construirPromptROS, NOTA_LEGAL } = require('./plantilla-ros');

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
      if (profundidad === 0) return texto.slice(ini, i + 1);
    }
  }
  return null;
}

function extraerJSON(texto, etiquetaMotor) {
  if (!texto || !String(texto).trim()) {
    throw new Error(`${etiquetaMotor} devolvió una respuesta vacía.`);
  }
  const limpio = String(texto)
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim();
  const bloque = recortarObjeto(limpio);
  if (!bloque) {
    throw new Error(
      `${etiquetaMotor} devolvió un JSON incompleto (respuesta cortada a la mitad). ` +
      `Longitud recibida: ${limpio.length} caracteres.`
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

async function fetchConReintentos(url, opciones, intentos = 2, esperaBaseMs = 1500) {
  const CODIGOS_TRANSITORIOS = new Set([429, 500, 502, 503, 504]);
  let ultimaRespuesta;
  for (let i = 0; i < intentos; i++) {
    const r = await fetch(url, opciones);
    if (r.ok) return r;
    ultimaRespuesta = r;
    if (!CODIGOS_TRANSITORIOS.has(r.status) || i === intentos - 1) return r;
    const espera = esperaBaseMs * Math.pow(2, i);
    console.warn(`HTTP ${r.status} (intento ${i + 1}/${intentos}), reintentando en ${espera}ms...`);
    await new Promise((resolve) => setTimeout(resolve, espera));
  }
  return ultimaRespuesta;
}

module.exports = protegerRuta(async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  const { textoDocumentos, instruccionesAnalista, imagenes } = req.body || {};
  const listaImagenes = Array.isArray(imagenes) ? imagenes : [];
  const hayTexto = textoDocumentos && String(textoDocumentos).trim();

  if (!hayTexto && listaImagenes.length === 0) {
    return res.status(400).json({ error: 'No se recibieron evidencias documentales para analizar.' });
  }

  const GEMINI_KEY = process.env.GEMINI_API_KEY;
  const GROQ_KEY = process.env.GROQ_API_KEY;

  const MAX_CHARS = 180000;
  const evidencias = hayTexto ? String(textoDocumentos).slice(0, MAX_CHARS) : '(sin evidencias en texto: todo el material llega como imágenes adjuntas)';

  const notaImagenes = listaImagenes.length
    ? `\n\nADEMÁS del texto anterior se adjuntan ${listaImagenes.length} imagen(es) (páginas escaneadas, fotos u otro material sin texto extraíble). ` +
      `Léelas igual que el resto de evidencias documentales: identifica de qué archivo/página viene cada una por el nombre indicado y cita esa ` +
      `referencia en "trazabilidad" con origen "evidencia".\nReferencia de cada imagen adjunta, en el mismo orden en que se envían: ` +
      listaImagenes.map((img, i) => `(${i + 1}) ${img.origen || 'sin nombre'}`).join('; ')
    : '';

  const prompt = construirPromptROS(evidencias, instruccionesAnalista) + notaImagenes;
  const fallos = [];

  // ---------- Intento 1: Gemini (único motor con visión) ----------
  // Se prueban varias versiones del modelo: cuando Google reporta "alta
  // demanda" (503) suele ser por versión/región puntual, no por toda la
  // familia Gemini, así que rotar de versión suele resolverlo más rápido
  // que insistir en la misma con reintentos largos.
  const MODELOS_GEMINI = Array.from(new Set([
    process.env.GEMINI_MODEL || 'gemini-3.6-flash',
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite',
    'gemini-2.0-flash'
  ]));

  if (GEMINI_KEY) {
    const parts = [{ text: prompt }];
    listaImagenes.forEach((img) => {
      parts.push({ inline_data: { mime_type: img.mimeType || 'image/jpeg', data: img.data } });
    });

    for (const modeloGemini of MODELOS_GEMINI) {
      try {
        const r = await fetchConReintentos(
          `https://generativelanguage.googleapis.com/v1beta/models/${modeloGemini}:generateContent?key=${GEMINI_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts }],
              generationConfig: {
                temperature: 0,
                maxOutputTokens: 65536,
                responseMimeType: 'application/json'
              }
            })
          },
          2,    // solo 2 intentos por versión: si sigue "UNAVAILABLE" se rota de versión, no se insiste
          1200
        );
        if (!r.ok) {
          const cuerpo = await r.text().catch(() => '');
          throw new Error(`HTTP ${r.status}. ${cuerpo.slice(0, 300)}`);
        }
        const data = await r.json();
        const cand = data?.candidates?.[0];
        if (cand?.finishReason && cand.finishReason !== 'STOP') {
          throw new Error(
            `la generación terminó por "${cand.finishReason}" (respuesta incompleta). ` +
            `Reduce el número de evidencias o divide el análisis.`
          );
        }
        const texto = (cand?.content?.parts || []).map((p) => p?.text || '').join('');
        const informe = extraerJSON(texto, `Gemini (${modeloGemini})`);
        return res.status(200).json({ informe, notaLegal: NOTA_LEGAL, motor: `Gemini ${modeloGemini}` });
      } catch (e) {
        fallos.push(`Gemini ${modeloGemini}: ${e.message}`);
        console.warn(`Gemini ${modeloGemini} falló, se prueba siguiente motor:`, e.message);
      }
    }
  }

  // ---------- Intento 2: Groq (respaldo, SOLO texto — no admite imágenes) ----------
  // Catálogo actual de Groq (los IDs verificados hoy):
  // gpt-oss-120b / gpt-oss-20b -> max completion 65536, admiten json_object.
  // qwen/qwen3.8-27b -> max completion 16384, admite json_object.
  // (groq/compound-mini fue retirado: generaría 404.)
  if (GROQ_KEY) {
    const promptGroq = listaImagenes.length
      ? prompt + `\n\nAVISO: este motor de respaldo NO puede leer imágenes. Las ${listaImagenes.length} imagen(es) adjuntas ` +
        `no están disponibles en este intento; para los campos que dependan exclusivamente de ellas, usa "" y registra en ` +
        `"trazabilidad" origen "no_encontrado" con una nota de que la evidencia era una imagen no procesada por el motor de respaldo.`
      : prompt;

    const MODELOS_GROQ = [
      { id: 'openai/gpt-oss-120b', maxTokens: 65536, json: true },
      { id: 'openai/gpt-oss-20b', maxTokens: 65536, json: true },
      { id: 'qwen/qwen3.8-27b', maxTokens: 16384, json: true }
    ];
    for (const modelo of MODELOS_GROQ) {
      try {
        const cuerpo = {
          model: modelo.id,
          messages: [{ role: 'user', content: promptGroq }],
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
          motor: listaImagenes.length
            ? `Groq ${modelo.id} (respaldo — sin leer ${listaImagenes.length} imagen(es))`
            : `Groq ${modelo.id} (respaldo)`
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