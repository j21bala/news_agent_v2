const axios = require("axios");
const { protegerRuta } = require("./_auth");

module.exports = protegerRuta(async (req, res) => {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Método no permitido" });

  const { imagenes } = req.body;

  const GEMINI_KEY = process.env.GEMINI_API_KEY;

  if (!GEMINI_KEY) {
    return res
      .status(500)
      .json({ error: "Falta configurar GEMINI_API_KEY en el servidor." });
  }

  if (!imagenes || imagenes.length === 0) {
    return res
      .status(400)
      .json({ error: "No se enviaron imágenes para analizar." });
  }

  // Construir el array de partes para Gemini (Texto + Imágenes)

  const parts = [
    {
      text: `Eres un analista senior de riesgo financiero SARLAFT/LAFT en Colombia. Vas a recibir varias capturas de pantalla (hasta 6) de sistemas bancarios internos de un mismo cliente: listas de vinculación, consulta de datos generales, consulta fiduciaria, movimientos, productos/cuentas y saldos.

Cruza y consolida TODA la información visible en las imágenes en un único perfil. Si un dato no aparece en ninguna imagen, usa null (no inventes datos). Los montos numéricos van sin símbolos ni separadores (solo dígitos).

Responde ÚNICA Y ESTRICTAMENTE con un objeto JSON válido (sin markdown, sin comentarios) con esta estructura exacta:

{
  "cliente": {
    "nombre": string|null,
    "identificacion": string|null,
    "tipo_id": string|null,
    "fecha_nacimiento": string|null,
    "edad": number|null,
    "genero": string|null,
    "lugar_nacimiento": string|null,
    "estado_civil": string|null,
    "profesion": string|null,
    "actividad_economica": string|null,
    "direccion": string|null,
    "telefono": string|null,
    "segmento": string|null,
    "nivel_riesgo": string|null,
    "es_pep": boolean|null,
    "capacidad_economica": string|null
  },
  "score_riesgo": number entre 0 y 100 (100 = bajo riesgo/excelente cliente),
  "ingresos_calculados": number|null (ingresos mensuales estimados),
  "egresos_calculados": number|null,
  "valor_activos": number|null,
  "valor_pasivos": number|null,
  "analisis_narrativo": string (2 a 4 párrafos explicando el hallazgo: por qué se generó la alerta, coherencia entre el perfil transaccional y el económico, listas en las que aparece, y conclusión del analista, en tono profesional de informe SARLAFT),
  "productos": [ { "tipo": string, "numero": string, "detalle": string|null } ],
  "movimientos": [ { "fecha": string, "descripcion": string, "valor": number, "naturaleza": "credito"|"debito" } ],
  "alertas": ["alerta 1", "alerta 2"] (inconsistencias, documentos próximos a vencer, listas restrictivas, operaciones inusuales, etc.)
}`,
    },
  ];

  // Adjuntar cada imagen en formato base64

  imagenes.forEach((img) => {
    // Soporta el formato nuevo { data, mimeType } y, por compatibilidad,
    // strings sueltos en base64 (se asume jpeg en ese caso).
    const data = typeof img === "string" ? img : img.data;
    const mimeType = typeof img === "string" ? "image/jpeg" : (img.mimeType || "image/jpeg");
    parts.push({
      inline_data: {
        mime_type: mimeType,
        data,
      },
    });
  });

  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${GEMINI_KEY}`,

      {
        contents: [{ parts }],

        generationConfig: {
          temperature: 0.1,

          response_mime_type: "application/json",
        },
      },

      { headers: { "Content-Type": "application/json" }, timeout: 30000 },
    );

    const rawText = response.data.candidates[0].content.parts[0].text;

    const data = JSON.parse(rawText);

    return res.status(200).json(data);
  } catch (error) {
    const detalle = error.response?.data?.error?.message || error.message;
    console.error("Error analizar-cliente:", detalle);

    return res
      .status(500)
      .json({ error: `Error procesando los documentos del cliente: ${detalle}` });
  }
});