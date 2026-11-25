const fs = require('fs');
const path = require('path');
const Docxtemplater = require('docxtemplater');
const PizZip = require('pizzip');
const { protegerRuta } = require('./_auth');

const CAMPOS_TEXTO = [
    'asunto', 'chk_ros', 'chk_archivo', 'chk_gestion', 'ciudad', 'producto', 'total_reportar',
    'riesgos', 'criterios_objetivos', 'indicio', 'decision_comite', 'hechos_cronologicos',
    'fecha_diligenciamiento', 'gestion_comercial', 'validaciones', 'nombre_titular',
    'numero_producto', 'periodo', 'total_resumen_credito', 'total_resumen_tx_credito',
    'total_resumen_pct_credito', 'total_resumen_debito', 'total_resumen_tx_debito',
    'total_resumen_pct_debito', 'total_acumulados_credito', 'total_acumulados_tx_credito',
    'total_acumulados_pct_credito', 'total_acumulados_debito', 'total_acumulados_tx_debito',
    'total_acumulados_pct_debito', 'conclusion_acumulados', 'tipo_cliente', 'perfil_financiero',
    'comparacion_sector', 'calificacion_reporte', 'urgencia', 'metodologia',
    'relacion_reportes_anteriores', 'senales_alerta', 'motivo_reporte'
];
const CAMPOS_OPERACION = ['numero', 'identificacion_titular', 'nombre_titular', 'oficina', 'fecha', 'transaccion', 'valor'];
const CAMPOS_PRODUCTO = ['cliente', 'id_cliente', 'tipo_producto', 'no_producto', 'fecha_apertura', 'estado', 'nombre_oficina', 'ciudad', 'saldo'];
const CAMPOS_RESUMEN = ['transaccion', 'credito', 'tx_credito', 'pct_credito', 'debito', 'tx_debito', 'pct_debito'];
const CAMPOS_ACUMULADO = ['fecha', 'credito', 'tx_credito', 'pct_credito', 'debito', 'tx_debito', 'pct_debito'];
const CAMPOS_DETALLE = ['fecha', 'oficina', 'identificacion', 'nombre', 'valor', 'ciudad', 'girado_a'];
const MAX_FILAS = 5000;
const MAX_TEXTO = 30000;

function texto(valor) {
    if (typeof valor !== 'string' && typeof valor !== 'number') return '';
    const resultado = String(valor);
    if (resultado.length > MAX_TEXTO) throw new Error(`Un campo de texto excede el máximo de ${MAX_TEXTO} caracteres.`);
    return resultado;
}

function objeto(valor) {
    return valor && typeof valor === 'object' && !Array.isArray(valor) ? valor : {};
}

function listaTexto(valor, campo) {
    if (valor == null) return [];
    if (!Array.isArray(valor)) throw new Error(`El campo ${campo} debe ser una lista.`);
    if (valor.length > MAX_FILAS) throw new Error(`El campo ${campo} excede el máximo de ${MAX_FILAS} elementos.`);
    return valor.map(texto);
}

function listaFilas(valor, campos, nombreCampo) {
    if (valor == null) return [];
    if (!Array.isArray(valor)) throw new Error(`El campo ${nombreCampo} debe ser una lista.`);
    if (valor.length > MAX_FILAS) throw new Error(`El campo ${nombreCampo} excede el máximo de ${MAX_FILAS} filas.`);
    return valor.map(fila => {
        const entrada = objeto(fila);
        return Object.fromEntries(campos.map(campo => [campo, texto(entrada[campo])]));
    });
}

function normalizarDatos(datos) {
    const entrada = objeto(datos);
    const salida = Object.fromEntries(CAMPOS_TEXTO.map(campo => [campo, texto(entrada[campo])]));
    for (const campo of [
        'tipo_id', 'id_cliente', 'fecha_creacion', 'nombres_apellidos', 'edad', 'lugar_nacimiento',
        'fecha_nacimiento', 'genero', 'estado_civil', 'actividad_economica', 'nivel_riesgo_actividad',
        'ocupacion', 'segmento_sarlaft', 'perfil_riesgo_sarlaft', 'empresa_empleadora', 'profesion',
        'nivel_educativo', 'ingresos', 'direccion', 'ciudad', 'oficina_administra',
        'fecha_ultima_actualizacion', 'egresos', 'valor_activos', 'valor_pasivos',
        'operaciones_internacionales', 'importaciones', 'exportaciones', 'cambio_divisas',
        'origen_fondos', 'origen_activos'
    ]) salida[`ficha_${campo}`] = texto(entrada[`ficha_${campo}`]);

    salida.operaciones = listaFilas(entrada.operaciones, CAMPOS_OPERACION, 'operaciones');
    salida.productos_titular = listaFilas(entrada.productos_titular, CAMPOS_PRODUCTO, 'productos_titular');
    salida.resumen = listaFilas(entrada.resumen, CAMPOS_RESUMEN, 'resumen');
    salida.acumulados = listaFilas(entrada.acumulados, CAMPOS_ACUMULADO, 'acumulados');
    salida.caracteristicas_sospecha = listaTexto(entrada.caracteristicas_sospecha, 'caracteristicas_sospecha');
    salida.informacion_soporte = listaTexto(entrada.informacion_soporte, 'informacion_soporte');

    for (const letra of ['a', 'b', 'c', 'd', 'e', 'f', 'g']) {
        salida[`detalle_${letra}_titulo`] = texto(entrada[`detalle_${letra}_titulo`]);
        salida[`detalle_${letra}_narrativa`] = texto(entrada[`detalle_${letra}_narrativa`]);
        salida[`detalle_${letra}_total`] = texto(entrada[`detalle_${letra}_total`]);
        salida[`detalle_${letra}_filas`] = listaFilas(entrada[`detalle_${letra}_filas`], CAMPOS_DETALLE, `detalle_${letra}_filas`);
    }
    return salida;
}

module.exports = protegerRuta(async (req, res) => {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido.' });
    if (!req.body || !req.body.datos || typeof req.body.datos !== 'object' || Array.isArray(req.body.datos)) {
        return res.status(400).json({ error: 'Faltan los datos para completar la plantilla.' });
    }

    let datos;
    try {
        datos = normalizarDatos(req.body.datos);
    } catch (error) {
        return res.status(400).json({ error: error.message });
    }

    try {
        const rutaPlantilla = path.join(process.cwd(), 'public', 'plantilla', 'Plantilla_ROS_base.docx');
        const plantilla = fs.readFileSync(rutaPlantilla);
        const zip = new PizZip(plantilla);
        const documento = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });
        documento.render(datos);
        const archivo = documento.getZip().generate({
            type: 'nodebuffer',
            compression: 'DEFLATE',
            compressionOptions: { level: 6 }
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', 'attachment; filename="Informe_ROS.docx"');
        res.setHeader('Cache-Control', 'no-store');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        return res.status(200).send(archivo);
    } catch (error) {
        console.error('Error al completar la plantilla ROS:', error.name || 'Error');
        return res.status(500).json({ error: 'No se pudo completar la plantilla Word del informe ROS.' });
    }
});

module.exports.config = { maxDuration: 30 };
