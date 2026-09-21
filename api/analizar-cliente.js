const { protegerRuta } = require('./_auth');

const PROMPT_CLIENTE = `Eres un analista senior de riesgo financiero SARLAFT/LAFT en Colombia. Vas a recibir varias capturas de pantalla (hasta 6) de sistemas bancarios internos de un mismo cliente: listas de vinculación, consulta de datos generales, consulta fiduciaria, movimientos, productos/cuentas y saldos.
Cruza y consolida TODA la información visible en las imágenes en un único perfil. Si un dato no aparece en ninguna imagen, usa null (no inventes datos). Los montos numéricos van sin símbolos ni separadores (solo dígitos).
Responde ÚNICA Y ESTRICTAMENTE con un objeto JSON válido (sin markdown, sin comentarios) con esta estructura exacta:
{
 "cliente": {
  "nombre": string|null, "identificacion": string|null, "tipo_id": string|null,
  "fecha_nacimiento": string|null, "edad": number|null, "genero": string|null,
  "lugar_nacimiento": string|null, "estado_civil": string|null, "profesion": string|null,
  "actividad_economica": string|null, "direccion": string|null, "telefono": string|null,
  "segmento": string|null, "nivel_riesgo": string|null, "es_pep": boolean|null,
  "capacidad_economica": string|null
 },
 "score_riesgo": number entre 0 y 100 (100 = bajo riesgo/excelente cliente),
 "ingresos_calculados": number|null,
 "egresos_calculados": number|null,
 "valor_activos": number|null,
 "valor_pasivos": number|null,
 "analisis_narrativo": string (2 a 4 párrafos, tono profesional de informe SARLAFT),
 "productos": [ { "tipo": string, "numero": string, "detalle": string|null } ],
 "movimientos": [ { "fecha": string, "descripcion": string, "valor": number, "naturaleza": "credito"|"debito" } ],
 "alertas": ["alerta 1", "alerta 2"]
}`;

// Cadena de modelos Gemini: el primero que responda gana.
function modelosGemini() {
  const lista = [
    process.env.GEMINI_MODEL,
    'gemini-flash-latest',
    'gemini-flash-lite-latest',
    'gemini-3.6-flash'
  ].filter(Boolean);
  return [...new Set(lista)];
}

// Único modelo con visión disponible actualmente en Groq.
// Límite: 3 imágenes por petición y 16.384 tokens de salida.
const GROQ_VISION = 'qwen/qwen3.8-27b';
const GROQ_VISION_IMAGENES_POR_LLAMADA = 3;
const GROQ_TEXTO = ['openai/gpt-oss-120b', 'openai/gpt-oss-20b'];

// Reintentos con backoff ante sobrecarga transitoria (429/5xx).
async function fetchConReintentos(url, opciones, intentos = 3) {
  const TRANSITORIOS = new Set([429, 500, 502, 503, 504]);
  let ultima;
  for (let i = 0; i < intentos; i++) {
    const r = await fetch(url, opciones);
    if (r.ok) return r;
    ultima = r;
    if (!TRANSITORIOS.has(r.status) || i === intentos - 1) return r;
    const espera = 2000 * Math.pow(2, i);
    console.warn(`HTTP ${r.status} (intento ${i + 1}/${intentos}), esperando ${espera}ms...`);
    await new Promise(res => setTimeout(res, espera));
  }
  return ultima;
}

function extraerJSON(texto) {
  if (!texto) throw new Error('Respuesta vacía de la IA.');
  const limpio = String(texto).replace(/```(?:json)?/gi, '').trim();
  const inicio = limpio.indexOf('{');
  const fin = limpio.lastIndexOf('}');
  if (inicio === -1 || fin === -1) {
    throw new Error('La IA no devolvió JSON válido: ' + limpio.substring(0, 200));
  }
  return JSON.parse(limpio.slice(inicio, fin + 1));
}

function partesImagenes(imagenes) {
  return imagenes.map((img) => {
    const data = typeof img === 'string' ? img : img.data;
    const mime = typeof img === 'string' ? 'image/jpeg' : (img.mimeType || 'image/jpeg');
    return { inline_data: { mime_type: mime, data } };
  });
}

function partesImagenesGroq(imagenes) {
  return imagenes.map((img) => {
    const data = typeof img === 'string' ? img : img.data;
    const mime = typeof img === 'string' ? 'image/jpeg' : (img.mimeType || 'image/jpeg');
    return { type: 'image_url', image_url: { url: `data:${mime};base64,${data}` } };
  });
}

// ---------- Motor 1: Gemini ----------
async function intentarGemini(imagenes) {
  const KEY = process.env.GEMINI_API_KEY;
  if (!KEY) throw new Error('Sin GEMINI_API_KEY.');
  const fallos = [];
  for (const modelo of modelosGemini()) {
    const r = await fetchConReintentos(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: PROMPT_CLIENTE }, ...partesImagenes(imagenes)] }],
          generationConfig: { temperature: 0.1, response_mime_type: 'application/json' }
        })
      }
    );
    if (r.ok) {
      const d = await r.json();
      const texto = (d?.candidates?.[0]?.content?.parts || []).map(p => p?.text || '').join('');
      if (texto) return { data: extraerJSON(texto), motor: `Gemini ${modelo}` };
      fallos.push(`${modelo}: respuesta vacía`);
      continue;
    }
    const cuerpo = await r.text().catch(() => '');
    fallos.push(`${modelo}: HTTP ${r.status}. ${cuerpo.slice(0, 150)}`);
    console.warn(`Gemini falló (${modelo}):`, fallos[fallos.length - 1]);
  }
  throw new Error(fallos.join(' | '));
}

// ---------- Motor 2: Groq visión (en bloques de 3 imágenes) ----------
async function groqVisionBloque(bloque) {
  const KEY = process.env.GROQ_API_KEY;
  const r = await fetchConReintentos('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}` },
    body: JSON.stringify({
      model: GROQ_VISION,
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: PROMPT_CLIENTE + '\nAnaliza SOLO las imágenes adjuntas en este bloque.' },
          ...partesImagenesGroq(bloque)
        ]
      }],
      temperature: 0,
      max_completion_tokens: 8192,
      response_format: { type: 'json_object' }
    })
  });
  if (!r.ok) {
    const t = await r.text().catch(() => '');
    throw new Error(`${GROQ_VISION}: HTTP ${r.status}. ${t.slice(0, 200)}`);
  }
  const d = await r.json();
  return extraerJSON(d?.choices?.[0]?.message?.content);
}

// Consolida los JSON parciales de cada bloque en un único perfil.
async function consolidarConGroqTexto(partials) {
  const KEY = process.env.GROQ_API_KEY;
  const prompt = `Recibirás ${partials.length} análisis JSON parciales de un MISMO cliente bancario, cada uno derivado de un subconjunto de capturas de pantalla. Consolídalos en un ÚNICO objeto JSON con exactamente la misma estructura. Reglas: para cada campo elige el valor no nulo más completo; nunca inventes datos; concatena y deduplica productos, movimientos (ordenados por fecha) y alertas; promedia score_riesgo si difieren; el analisis_narrativo debe integrar todos los hallazgos en 2 a 4 párrafos. Responde ÚNICAMENTE con el objeto JSON final.
JSON parciales:
${JSON.stringify(partials)}`;
  const fallos = [];
  for (const modelo of GROQ_TEXTO) {
    try {
      const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}` },
        body: JSON.stringify({
          model: modelo,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0,
          max_completion_tokens: 8192,
          response_format: { type: 'json_object' }
        })
      });
      if (!r.ok) { fallos.push(`${modelo}: HTTP ${r.status}`); continue; }
      const d = await r.json();
      return { data: extraerJSON(d?.choices?.[0]?.message?.content), motor: `Groq ${GROQ_VISION} + ${modelo}` };
    } catch (e) { fallos.push(`${modelo}: ${e.message}`); }
  }
  console.warn('Consolidación con modelo de texto falló, se aplica fusión básica:', fallos.join(' | '));
  return { data: mergeBasico(partials), motor: `Groq ${GROQ_VISION} (fusión básica)` };
}

// Fusión programática de respaldo si el modelo de texto no está disponible.
function mergeBasico(partials) {
  const out = JSON.parse(JSON.stringify(partials[0] || {}));
  for (const p of partials.slice(1)) {
    if (!p || typeof p !== 'object') continue;
    if (p.cliente) {
      out.cliente = out.cliente || {};
      for (const [k, v] of Object.entries(p.cliente)) {
        if ((out.cliente[k] === null || out.cliente[k] === undefined || out.cliente[k] === '') && v != null) {
          out.cliente[k] = v;
        }
      }
    }
    for (const k of ['score_riesgo', 'ingresos_calculados', 'egresos_calculados', 'valor_activos', 'valor_pasivos']) {
      if ((out[k] === null || out[k] === undefined) && p[k] != null) out[k] = p[k];
    }
    out.productos = [...(out.productos || []), ...(p.productos || [])];
    out.movimientos = [...(out.movimientos || []), ...(p.movimientos || [])];
    out.alertas = [...new Set([...(out.alertas || []), ...(p.alertas || [])])];
    if (p.analisis_narrativo) {
      out.analisis_narrativo = out.analisis_narrativo
        ? out.analisis_narrativo + '\n\n' + p.analisis_narrativo
        : p.analisis_narrativo;
    }
  }
  return out;
}

async function intentarGroqVision(imagenes) {
  const KEY = process.env.GROQ_API_KEY;
  if (!KEY) throw new Error('Sin GROQ_API_KEY para el respaldo de visión.');
  const bloques = [];
  for (let i = 0; i < imagenes.length; i += GROQ_VISION_IMAGENES_POR_LLAMADA) {
    bloques.push(imagenes.slice(i, i + GROQ_VISION_IMAGENES_POR_LLAMADA));
  }
  const results = await Promise.all(bloques.map(b => groqVisionBloque(b).catch(e => {
    console.error('Bloque Groq visión falló:', e.message);
    return null;
  })));
  const partials = results.filter(Boolean);
  if (partials.length === 0) {
    throw new Error(`Ningún bloque pudo procesarse con ${GROQ_VISION}.`);
  }
  if (partials.length === 1) {
    return { data: partials[0], motor: `Groq ${GROQ_VISION}` };
  }
  return consolidarConGroqTexto(partials);
}

module.exports = protegerRuta(async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }
  const { imagenes } = req.body || {};
  if (!process.env.GEMINI_API_KEY && !process.env.GROQ_API_KEY) {
    return res.status(500).json({ error: 'Falta GEMINI_API_KEY y GROQ_API_KEY en el servidor.' });
  }
  if (!imagenes || imagenes.length === 0) {
    return res.status(400).json({ error: 'No se enviaron imágenes para analizar.' });
  }
  try {
    let resultado;
    try {
      resultado = await intentarGemini(imagenes);
    } catch (eGemini) {
      console.warn('Gemini no disponible, conmutando a Groq visión:', eGemini.message);
      resultado = await intentarGroqVision(imagenes);
    }
    console.log('Motor usado en analizar-cliente:', resultado.motor);
    return res.status(200).json(resultado.data);
  } catch (error) {
    const detalle = error.message || String(error);
    console.error('Error analizar-cliente:', detalle);
    return res.status(502).json({
      error: `Error procesando los documentos del cliente. ${detalle}`
    });
  }
});

// Límite de ejecución en Vercel suficiente para 6 imágenes.
module.exports.config = { maxDuration: 60 };