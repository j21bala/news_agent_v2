const { protegerRuta } = require('./_auth');

const CAMPOS_IA = {
    'informe.riesgos': 'Resume los niveles de riesgo y señales categóricas del caso. No concluyas que hubo delito.',
    'informe.criterios': 'Redacta criterios objetivos usando únicamente los conteos y categorías recibidos. No agregues cifras ni hechos.',
    'informe.indicio': 'Describe con cautela qué señales agregadas ameritan análisis, sin afirmar responsabilidad ni delito.',
    'informe.caracteristicas_sospecha': 'Resume en máximo tres puntos las características relevantes, sin repetir categorías ni inventar hechos.',
    'informe.senales_alerta': 'Resume las señales de alerta presentes por categoría y gravedad, de forma breve.',
    'informe.metodologia': 'Describe una metodología de análisis basada únicamente en los conteos de sujetos, vínculos, movimientos y alertas recibidos. No afirmes consultas o validaciones externas.',
    'informe.motivo_reporte': 'Redacta un motivo breve y prudente basado solo en las categorías y conteos disponibles. No decidas si debe presentarse un ROS.'
};

const TIPOS_SUJETO = ['persona', 'empresa', 'cuenta', 'inmueble', 'vehiculo', 'documento', 'ubicacion', 'medio'];
const TIPOS_VINCULO = ['familiar', 'conyuge', 'socio', 'rep', 'laboral', 'comercial', 'financiero', 'titular', 'politico', 'allegado', 'otro'];
const TIPOS_TRANSACCION = [
    'Consignación en efectivo', 'Retiro en efectivo', 'Transferencia', 'Cheque',
    'Pago PSE', 'Giro internacional', 'Inversión / fiducia', 'Otro'
];
const RIESGOS = ['alto', 'medio', 'bajo', 'na'];
const GRAVEDADES = ['alta', 'media', 'baja'];
const CATEGORIAS_ALERTA = [
    'pep', 'alto_riesgo_conectado', 'sujeto_sin_vinculo', 'perfil_ingresos',
    'fraccionamiento', 'concentracion_efectivo', 'montos_recurrentes',
    'contraparte_alto_riesgo', 'otra'
];

function objeto(value) {
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function conteo(value) {
    const n = Number(value);
    return Number.isFinite(n) ? Math.min(100000, Math.max(0, Math.floor(n))) : 0;
}

function conteosPermitidos(value, keys) {
    const input = objeto(value);
    return Object.fromEntries(keys.map(key => [key, conteo(input[key])]));
}

function contextoAnonimizado(caso) {
    const input = objeto(caso);
    const sujetos = objeto(input.sujetos);
    const vinculos = objeto(input.vinculos);
    const transacciones = objeto(input.transacciones);
    const alertas = objeto(input.alertas);
    const hallazgos = objeto(input.hallazgos);
    const cronologia = objeto(input.cronologia);
    const evidencias = objeto(input.evidencias);
    return {
        sujetos: {
            total: conteo(sujetos.total),
            tipos: conteosPermitidos(sujetos.tipos, TIPOS_SUJETO),
            riesgos: conteosPermitidos(sujetos.riesgos, RIESGOS),
            pep: conteo(sujetos.pep)
        },
        vinculos: {
            total: conteo(vinculos.total),
            tipos: conteosPermitidos(vinculos.tipos, TIPOS_VINCULO)
        },
        transacciones: {
            total: conteo(transacciones.total),
            reportables: conteo(transacciones.reportables),
            creditos: conteo(transacciones.creditos),
            debitos: conteo(transacciones.debitos),
            tipos: conteosPermitidos(transacciones.tipos, TIPOS_TRANSACCION)
        },
        alertas: {
            total: conteo(alertas.total),
            gravedad: conteosPermitidos(alertas.gravedad, GRAVEDADES),
            categorias: conteosPermitidos(alertas.categorias, CATEGORIAS_ALERTA)
        },
        hallazgos: {
            total: conteo(hallazgos.total),
            gravedad: conteosPermitidos(hallazgos.gravedad, GRAVEDADES)
        },
        cronologia: { eventos: conteo(cronologia.eventos) },
        evidencias: { total: conteo(evidencias.total) }
    };
}

module.exports = protegerRuta(async (req, res) => {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });
    const { campo, caso } = req.body || {};
    const instruccion = Object.prototype.hasOwnProperty.call(CAMPOS_IA, campo) ? CAMPOS_IA[campo] : '';
    const KEY = process.env.GROQ_API_KEY;
    if (!KEY) return res.status(500).json({ error: 'Falta GROQ_API_KEY en Vercel' });
    if (!instruccion || !caso) return res.status(400).json({ error: 'Campo de redacción o resumen del caso inválido.' });

    const contexto = JSON.stringify(contextoAnonimizado(caso));
    const system = 'Eres un analista SARLAFT. Redacta en español formal, breve y prudente, usando exclusivamente el resumen agregado entregado. ' +
        'Ese resumen no contiene evidencia textual ni datos identificables. No inventes personas, empresas, documentos, cuentas, direcciones, ' +
        'fechas, valores, montos ni validaciones. No solicites ni incluyas nombres, números de identificación, cuentas, datos de contacto, ' +
        'fechas exactas ni montos exactos. No afirmes delitos, responsabilidad penal, decisiones del comité o gestiones comerciales. ' +
        'Si los conteos no bastan para sustentar un dato, omítelo. Responde solo con el borrador solicitado, sin markdown.';
    const modelos = ['openai/gpt-oss-120b', 'openai/gpt-oss-20b'];
    let ultimo = 'Sin respuesta de la IA.';
    for (const model of modelos) {
        try {
            const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}` },
                body: JSON.stringify({
                    model,
                    temperature: 0,
                    max_completion_tokens: 500,
                    messages: [
                        { role: 'system', content: system },
                        { role: 'user', content: `RESUMEN ANONIMIZADO:\n${contexto}\n\nTAREA: ${instruccion}` }
                    ]
                })
            });
            const d = await r.json().catch(() => ({}));
            const texto = d?.choices?.[0]?.message?.content;
            if (r.ok && texto) return res.status(200).json({ texto: texto.trim() });
            ultimo = d?.error?.message || `HTTP ${r.status}`;
        } catch (e) {
            ultimo = e.message;
        }
    }
    return res.status(502).json({ error: ultimo });
});
