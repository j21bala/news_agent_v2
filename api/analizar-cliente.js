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
// Si en Vercel defines GEMINI_MODEL, se prueba primero ese.
function modelosGemini() {
  const lista = [process.env.GEMINI_MODEL, 'gemini-flash-latest', 'gemini-3.6-flash']
    .filter(Boolean);
  return [...new Set(lista)];
}

// Fallback gratuito con visión: mismos modelos que ya usas en Groq.
const MODELOS_GROQ_VISION = [
  'meta-llama/llama-4-scout-17b-16e-instruct',
  'meta-llama/llama-4-maverick-17b-128e-instruct'
];

// Reintentos con backoff: la sobrecarga (503) suele durar segundos.
async function fetchConReintentos(url, opciones, intentos = 3) {
  const TRANSITORIOS = new Set([429, 500, 502, 503, 504]);
  let ultima;
  for (let i = 0; i < intentos; i++) {
    const r = await fetch(url, opciones);
    if (r.ok) return r;
    ultima = r;
    if (!TRANSITORIOS.has(r.status) || i === intentos - 1) return r;
    const espera = 1500 * Math.pow(2, i);
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

function construirPartes(prompt, imagenes) {
  const parts = [{ text: prompt }];
  imagenes.forEach((img) => {
    const data = typeof img === 'string' ? img : img.data;
    const mime = typeof img === 'string' ? 'image/jpeg' : (img.mimeType || 'image/jpeg');
    parts.push({ inline_data: { mime_type: mime, data } });
  });
  return parts;
}

async function intentarGemini(imagenes) {
  const KEY = process.env.GEMINI_API_KEY;
  const fallos = [];
  for (const modelo of modelosGemini()) {
    const r = await fetchConReintentos(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: construirPartes(PROMPT_CLIENTE, imagenes) }],
          generationConfig: { temperature: 0.1, response_mime_type: 'application/json' }
        })
      }
    );
    if (r.ok) {
      const d = await r.json();
      const texto = (d?.candidates?.[0]?.content?.parts || []).map(p => p?.text || '').join('');
      if (texto) return { data: JSON.parse(extraerJSON(texto)), motor: `Gemini ${modelo}` };
      fallos.push(`${modelo}: respuesta vacía`);
      continue;
    }
    const cuerpo = await r.text().catch(() => '');
    fallos.push(`${modelo}: HTTP ${r.status}. ${cuerpo.slice(0, 150)}`);
    console.warn(`Gemini falló (${modelo}):`, fallos[fallos.length - 1]);
  }
  throw new Error(fallos.join(' | '));
}

async function intentarGroqVision(imagenes) {
  const KEY = process.env.GROQ_API_KEY;
  if (!KEY) throw new Error('Sin GROQ_API_KEY para el respaldo de visión.');
  const content = [{ type: 'text', text: PROMPT_CLIENTE }];
  imagenes.forEach((img) => {
    const data = typeof img === 'string' ? img : img.data;
    const mime = typeof img === 'string' ? 'image/jpeg' : (img.mimeType || 'image/jpeg');
    content.push({ type: 'image_url', image_url: { url: `data:${mime};base64,${data}` } });
  });
  const fallos = [];
  for (const modelo of MODELOS_GROQ_VISION) {
    try {
      const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}` },
        body: JSON.stringify({
          model: modelo,
          messages: [{ role: 'user', content }],
          temperature: 0,
          max_tokens: 4096,
          response_format: { type: 'json_object' }
        })
      });
      if (!r.ok) {
        const t = await r.text().catch(() => '');
        fallos.push(`${modelo}: HTTP ${r.status}. ${t.slice(0, 150)}`);
        continue;
      }
      const d = await r.json();
      const texto = d?.choices?.[0]?.message?.content;
      if (texto) return { data: extraerJSON(texto), motor: `Groq ${modelo}` };
      fallos.push(`${modelo}: respuesta vacía`);
    } catch (e) {
      fallos.push(`${modelo}: ${e.message}`);
    }
  }
  throw new Error(fallos.join(' | '));
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

module.exports.config = { maxDuration: 60 };