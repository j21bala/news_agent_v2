// =============================================================================
//  PLANTILLA BASE ROS  —  Definición única y centralizada
//  El analista NO escribe plantilla. Solo carga evidencias y, si quiere,
//  una instrucción puntual. Esta es la estructura obligatoria del informe.
//  IMPORTANTE: aquí no hay datos de ejemplo. Todo se llena con las evidencias.
// =============================================================================

// Esquema JSON exacto que debe devolver el modelo.
// Cualquier campo sin soporte documental -> "No documentado".
const ESQUEMA_ROS = {
  encabezado: { marca: '', asunto: '', ciudad: '' },

  descripcion_montos: {
    producto: '',
    operaciones: [
      {
        numero: '',
        identificacion_titular: '',
        nombre_titular: '',
        oficina: '',
        fecha: '',
        transaccion: '',
        valor: ''
      }
    ],
    tipologia: '',
    criterios_objetivo: '',
    decision_comite: ''
  },

  hechos: {
    identificacion_sujetos: '',
    antecedentes: '',
    hechos_cronologicos: [''],
    composicion_societaria: [
      { tipo: '', numero: '', nombre: '', porcentaje: '', cliente: '' }
    ],
    junta_directiva_principales: [{ identificacion: '', nombre: '', cliente: '' }],
    junta_directiva_suplentes: [{ identificacion: '', nombre: '', cliente: '' }],
    gestion_comercial: ['']
  },

  comportamiento_transaccional: {
    producto: '',
    numero_producto: '',
    periodo: '',
    resumen: [
      {
        transaccion: '',
        credito: '',
        tx_credito: '',
        pct_credito: '',
        debito: '',
        tx_debito: '',
        pct_debito: ''
      }
    ],
    total_resumen: {
      credito: '',
      tx_credito: '',
      pct_credito: '',
      debito: '',
      tx_debito: '',
      pct_debito: ''
    },
    detalles: [
      {
        titulo: '',
        narrativa: '',
        columnas: [''],
        filas: [['']],
        total: ''
      }
    ],
    observaciones: ['']
  },

  acumulados_mensuales: {
    periodo: '',
    filas: [
      {
        fecha: '',
        credito: '',
        tx_credito: '',
        pct_credito: '',
        debito: '',
        tx_debito: '',
        pct_debito: ''
      }
    ],
    total: {
      credito: '',
      tx_credito: '',
      pct_credito: '',
      debito: '',
      tx_debito: '',
      pct_debito: ''
    }
  },

  productos_involucrados: [
    { producto: '', cuenta: '', tipo_transaccion: '', monto: '', institucion: '' }
  ],

  otros_productos: [
    { producto: '', numero: '', fecha_apertura: '', estado: '' }
  ],

  tipo_cliente: {
    tipo: '',
    ficha: [{ campo: '', valor: '' }],
    comparacion_sector: '',
    fecha_actualizacion_datos: ''
  },

  reporte: { calificacion: '', urgencia: '' },

  caracteristicas_sospecha: [''],
  conclusion_sospecha: '',
  metodologia: '',
  relacion_reportes_anteriores: '',
  senales_alerta: [''],
  motivo_reporte: '',
  informacion_soporte: ['']
};

// Nota legal fija: va siempre al final del ROS, textual.
const NOTA_LEGAL =
  'NOTA: Este informe se efectúa en desarrollo de las disposiciones legales, los acuerdos y ' +
  'convenios suscritos por el sector financiero con las autoridades, y el Código de conducta y ' +
  'Manual de Procedimientos del SARLAFT, en el entendimiento que los hechos relatados se sustentan ' +
  'en los perfiles generales fijados para las Operaciones sospechosas y no constituye denuncia de ' +
  'un hecho ilícito. (Artículo 42 de la Ley 190 de 1995).';

// Títulos oficiales de cada sección (los usa el render y el export a Word).
const SECCIONES = {
  s1: '1. DESCRIPCIÓN DE LOS HECHOS',
  s11: '1.1 HECHOS CRONOLÓGICOS',
  s13: '1.3. COMPORTAMIENTO TRANSACCIONAL DEL PRINCIPAL',
  s14: '1.4. PRODUCTOS FINANCIEROS INVOLUCRADOS, TIPOS DE TRANSACCIONES, MONTOS E INSTITUCIONES FINANCIERAS',
  s141: '1.4.1 OTROS PRODUCTOS FINANCIEROS',
  s2: '2. TIPO DE CLIENTE',
  s21: '2.1 SI ES CLIENTE DEFINA',
  s3: '3. REPORTE',
  s4: '4. CARACTERÍSTICAS POR LAS CUALES SE HA CONSIDERADO LA OPERACIÓN COMO SOSPECHOSA',
  s5: '5. METODOLOGÍA EMPLEADA PARA LA DETECCIÓN DE LA OPERACIÓN REPORTADA',
  s6: '6. LA OPERACIÓN SOSPECHOSA SE RELACIONA CON ALGÚN REPORTE REALIZADO ANTERIORMENTE POR LA INSTITUCIÓN O CON OTRAS OPERACIONES',
  s7: '7. SEÑAL DE ALERTA',
  s8: '8. MOTIVO DEL REPORTE',
  s9: '9. INFORMACIÓN SOPORTE DE LA OPERACIÓN REPORTADA'
};

// Instrucciones de llenado, sección por sección. Describen QUÉ va en cada
// campo, nunca CON QUÉ datos (esos salen exclusivamente de las evidencias).
const GUIA_LLENADO = `
ENCABEZADO
- marca: entidad financiera que reporta.
- asunto: decisión/propósito del caso (p. ej. "Caso para ROS", "Caso para ARCHIVO").
- ciudad: ciudad de la oficina donde se originó la alerta.

DESCRIPCIÓN DE MONTOS (tabla)
- producto: tipo de producto alertado.
- operaciones[]: una fila por operación alertada con numero de producto,
  identificacion_titular, nombre_titular, oficina, fecha, transaccion y valor.
- tipologia / criterios_objetivo: los que apliquen según la documentación; si no
  hay, "NO APLICA".
- decision_comite: decisión que conste en el acta o soporte del comité.

${SECCIONES.s1}
- identificacion_sujetos: párrafo que identifica a la persona natural/jurídica
  vinculada, su documento, producto, número, fecha de apertura y oficina.
- antecedentes: resultado de consultas en listas y antecedentes.
- hechos_cronologicos[]: párrafos en orden cronológico que expliquen por qué se
  alertó la operación, con fechas, valores y fuentes documentales.
- composicion_societaria[] y junta_directiva_*: solo si el sujeto es persona
  jurídica y la información consta en certificado de existencia o base de datos.
- gestion_comercial[]: transcripción resumida de la gestión de la oficina.

${SECCIONES.s13}
- producto, numero_producto y periodo analizado.
- resumen[]: una fila por tipo de transacción, separando crédito y débito, con
  número de transacciones y participación porcentual. total_resumen cierra la tabla.
- detalles[]: un bloque por cada transacción relevante del resumen, rotulado
  (A), (B), (C)... con narrativa y una tabla propia (columnas + filas) cuyo
  detalle dependa de la evidencia disponible (fecha, oficina, identificación,
  nombre, dirección, teléfono, destino de recursos, valor, etc.).
- observaciones[]: hallazgos sobre terceros (si son clientes, antecedentes,
  vínculos), sin calificarlos sin evidencia.

ACUMULADOS Y PROMEDIOS
- filas[]: un renglón por mes del periodo con crédito, débito, número de
  transacciones y porcentajes; total cierra la tabla.

${SECCIONES.s14} / ${SECCIONES.s141}
- Tablas de productos involucrados y otros productos del titular.

${SECCIONES.s2} / ${SECCIONES.s21}
- tipo: "Cliente" o "No cliente".
- ficha[]: pares campo/valor tomados del formulario de vinculación o de la base
  de datos (ID, razón social o nombre, matrícula, actividad económica, nivel de
  riesgo, segmento, ingresos, egresos, activos, pasivos, dirección, teléfono,
  ciudad, oficina, representante legal, etc.). Incluye únicamente los campos que
  aparezcan en las evidencias.
- comparacion_sector: perfil financiero frente a su sector.
- fecha_actualizacion_datos: última actualización de datos.

${SECCIONES.s3}
- calificacion y urgencia: Alta / Media / Baja.

${SECCIONES.s4}
- caracteristicas_sospecha[]: viñetas con los elementos objetivos que sustentan
  (o desvirtúan) la sospecha, cada una anclada a un soporte documental.
- conclusion_sospecha: párrafo de cierre que indique si se mantienen o se
  desvirtúan los elementos de inusualidad.

${SECCIONES.s5}
- metodologia: cómo se detectó la operación (herramientas SARLAFT, reporte de
  oficina, tipología y criterio aplicados).

${SECCIONES.s6}
- relacion_reportes_anteriores: "SI" con la referencia del reporte previo, o "NO".

${SECCIONES.s7}
- senales_alerta[]: código y descripción textual de cada señal de alerta aplicada.

${SECCIONES.s8}
- motivo_reporte: motivo del reporte; si no aplica, "NO APLICA".

${SECCIONES.s9}
- informacion_soporte[]: lista de los soportes efectivamente adjuntados por el
  analista (reporte de operación inusual, perfilamiento, documentos de
  vinculación, soportes de operaciones, formatos DOE, etc.).
`;

// Prompt de sistema completo que se envía al modelo.
function construirPromptROS(textoDocumentos, instruccionesAnalista) {
  return `INSTRUCCIÓN DE SISTEMA — GENERACIÓN DE ROS (SARLAFT)

Eres un analista de cumplimiento. Debes diligenciar la PLANTILLA OFICIAL DE ROS
que se define más abajo, usando EXCLUSIVAMENTE las evidencias documentales
adjuntas. La plantilla es fija: no la modifiques, no agregues ni elimines
secciones, no cambies los nombres de los campos.

REGLAS CRÍTICAS
1. Imparcialidad absoluta: describe hechos, no opiniones. No califiques ni
   presumas conducta delictiva.
2. Cero alucinación: si un dato no figura en las evidencias, escribe exactamente
   "No documentado". Nunca inventes nombres, cédulas, NIT, cuentas, fechas,
   valores, porcentajes ni oficinas.
3. Cifras y fechas se transcriben tal como aparecen en la evidencia (formato de
   moneda colombiana, p. ej. $1.234.567).
4. Los porcentajes y totales solo se reportan si están en la evidencia o si son
   suma directa y verificable de las filas incluidas.
5. Si una sección completa no aplica al caso, deja sus arreglos vacíos ([]) y sus
   textos en "No documentado" o "NO APLICA" según corresponda.
6. Redacta en español formal, en tercera persona, tiempo pasado.

GUÍA DE LLENADO DE LA PLANTILLA
${GUIA_LLENADO}

FORMATO DE SALIDA (OBLIGATORIO)
Devuelve ÚNICAMENTE un objeto JSON válido, sin texto antes ni después, sin
bloques de código markdown, que respete exactamente esta estructura de claves:

${JSON.stringify(ESQUEMA_ROS, null, 2)}

INSTRUCCIÓN PUNTUAL DEL ANALISTA (si está vacía, ignórala):
${instruccionesAnalista || '(sin instrucciones adicionales)'}

EVIDENCIAS DOCUMENTALES ADJUNTAS:
${textoDocumentos}
`;
}

module.exports = { ESQUEMA_ROS, SECCIONES, GUIA_LLENADO, NOTA_LEGAL, construirPromptROS };