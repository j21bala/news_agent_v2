const axios = require("axios");

module.exports = async (req, res) => {
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
      text: `Eres un analista de riesgo financiero SARLAFT. Analiza las siguientes imágenes de documentos de un cliente (pueden ser cédulas, estados financieros, certificados de ingresos). 

            Extrae la información y responde ÚNICA Y ESTRICTAMENTE con un objeto JSON válido con esta estructura: 

            { 

                "score_riesgo": número del 0 al 100 (100 es bajo riesgo/excelente cliente), 

                "ingresos_calculados": número entero con los ingresos mensuales estimados, 

                "alertas": ["alerta 1", "alerta 2"] (si el documento expira pronto, o hay inconsistencias en nombres/montos) 

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
};
