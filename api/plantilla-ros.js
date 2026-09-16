// =============================================================================
//  PLANTILLA BASE ROS  —  Definición única y centralizada
//  Esta estructura refleja EXACTAMENTE la plantilla Word oficial
//  (public/plantilla/Plantilla_ROS_base.docx). Si cambia la plantilla, hay que
//  cambiar este esquema; si cambia este esquema, hay que cambiar la plantilla.
//  Aquí no hay datos de ejemplo: todo se llena con las evidencias.
// =============================================================================

// Esquema JSON exacto que debe devolver el modelo.
// Cualquier campo sin soporte documental -> cadena vacía "" (NUNCA inventado).
const ESQUEMA_ROS = {
  asunto: '',
  ciudad: '',
  decision: { ros: false, archivo: false, gestion_comercial: false },

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
    total_reportar: '',
    riesgos: '',
    criterios_objetivos: '',
    indicio: '',
    decision_comite: ''
  },

  hechos_cronologicos: '',

  productos_titular: [
    {
      cliente: '',
      id_cliente: '',
      tipo_producto: '',
      no_producto: '',
      fecha_apertura: '',
      estado: '',
      nombre_oficina: '',
      ciudad: '',
      saldo: ''
    }
  ],

  formulario_vinculacion: {
    fecha_diligenciamiento: '',
    ficha: {
      tipo_id: '',
      id_cliente: '',
      fecha_creacion: '',
      nombres_apellidos: '',
      edad: '',
      lugar_nacimiento: '',
      fecha_nacimiento: '',
      genero: '',
      estado_civil: '',
      actividad_economica: '',
      nivel_riesgo_actividad: '',
      ocupacion: '',
      segmento_sarlaft: '',
      perfil_riesgo_sarlaft: '',
      empresa_empleadora: '',
      profesion: '',
      nivel_educativo: '',
      ingresos: '',
      direccion: '',
      ciudad: '',
      oficina_administra: '',
      fecha_ultima_actualizacion: '',
      egresos: '',
      valor_activos: '',
      valor_pasivos: '',
      operaciones_internacionales: '',
      importaciones: '',
      exportaciones: '',
      cambio_divisas: '',
      origen_fondos: '',
      origen_activos: ''
    }
  },

  gestion_comercial: '',
  validaciones: '',

  comportamiento_transaccional: {
    nombre_titular: '',
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
      { letra: 'A', titulo: '', narrativa: '', filas: [], total: '' }
    ]
  },

  acumulados: {
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
    },
    conclusion: ''
  },

  tipo_cliente: { tipo: '', perfil_financiero: '', comparacion_sector: '' },

  reporte: { calificacion: '', urgencia: '' },

  caracteristicas_sospecha: [''],
  metodologia: '',
  relacion_reportes_anteriores: '',
  senales_alerta: '',
  motivo_reporte: '',
  informacion_soporte: [''],

  // Trazabilidad: una entrada por campo diligenciado, con la ruta del campo
  // como clave. NO se imprime en el Word; sirve para auditar el informe.
  trazabilidad: {
    'ruta.del.campo': { origen: 'evidencia|inferido|no_encontrado', archivo: '', pagina: '' }
  }
};

// Nota legal fija: ya está impresa en la plantilla Word. Se conserva aquí
// porque la vista previa en pantalla la muestra al final del informe.
const NOTA_LEGAL =
  'NOTA: Este informe se efectúa en desarrollo de las disposiciones legales, los acuerdos y ' +
  'convenios suscritos por el sector financiero con las autoridades, y el Código de conducta y ' +
  'Manual de Procedimientos del SARLAFT, en el entendimiento que los hechos relatados se sustentan ' +
  'en los perfiles generales fijados para las Operaciones sospechosas y no constituye denuncia de ' +
  'un hecho ilícito. Por lo tanto, nos encontramos amparados por la exoneración de responsabilidad ' +
  'consagrada en el artículo 42 de la Ley 190 de 1995.';

// Títulos oficiales de cada sección, tal como aparecen en la plantilla Word.
const SECCIONES = {
  s1: '1. DESCRIPCIÓN DE LOS HECHOS',
  s11: '1.1 HECHOS CRONOLÓGICOS',
  s2: '2. PERSONAS NATURALES O JURÍDICAS VINCULADAS AL REPORTE QUE REGISTRA COMO TITULAR DE LOS SIGUIENTES PRODUCTOS',
  s3: '3. INFORMACION FORMULARIO DE VINCULACIÓN Y/O ACTUALIZACION',
  s4: '4. GESTION COMERCIAL POR PARTE DE LA OFICINA QUE ADMINISTRA LA RELACION',
  s5: '5. VALIDACIONES Y HALLAZGOS COMPLEMENTARIOS DE LAS DIFERENTES FUENTES DE INFORMACIÓN',
  s6: '6. COMPORTAMIENTO TRANSACCIONAL',
  s7: 'ACUMULADOS Y PROMEDIOS DÉBITO Y CRÉDITO DEL PERIODO',
  s8: 'TIPO DE CLIENTE',
  s9: 'REPORTE',
  s10: 'CARACTERÍSTICAS POR LAS CUALES SE HA CONSIDERADO LA OPERACIÓN COMO SOSPECHOSA',
  s11b: 'METODOLOGÍA EMPLEADA PARA LA DETECCIÓN DE LA OPERACIÓN REPORTADA',
  s12: 'LA OPERACIÓN SOSPECHOSA SE RELACIONA CON ALGÚN REPORTE REALIZADO ANTERIORMENTE',
  s13: 'SEÑAL DE ALERTA',
  s14: 'MOTIVO DEL REPORTE',
  s15: 'INFORMACIÓN SOPORTE DE LA OPERACIÓN REPORTADA'
};

// Instrucciones de llenado. Describen QUÉ va en cada campo, nunca CON QUÉ
// datos (esos salen exclusivamente de las evidencias).
const GUIA_LLENADO = `
ENCABEZADO
- asunto: identificador del caso tal como aparezca en la documentación (p. ej. "RIS 00000").
- ciudad: ciudad de la oficina donde se originó la alerta.
- decision: marca con true UNA sola de las tres opciones (ros / archivo /
  gestion_comercial), según la decisión que conste en el soporte del comité.
  Si no consta, deja las tres en false.

DESCRIPCIÓN DE MONTOS
- producto: tipo de producto alertado (se imprime como "Producto: <valor>").
- operaciones[]: una fila por operación alertada. Usa exactamente estas claves:
  numero, identificacion_titular, nombre_titular, oficina, fecha, transaccion, valor.
- total_reportar: suma de los valores de operaciones[], solo si es verificable.
- riesgos / criterios_objetivos / indicio: código y texto del riesgo, del
  criterio objetivo y del indicio aplicados. Si no aplica, "NO APLICA".
- decision_comite: decisión del comité. Puede llevar varias líneas separadas
  por salto de línea (\\n).

${SECCIONES.s11}
- hechos_cronologicos: uno o varios párrafos en orden cronológico que expliquen
  por qué se alertó la operación, con fechas, valores y fuentes documentales.
  Separa los párrafos con \\n.

${SECCIONES.s2}
- productos_titular[]: un renglón por producto del titular, con las claves
  cliente, id_cliente, tipo_producto, no_producto, fecha_apertura, estado,
  nombre_oficina, ciudad, saldo.

${SECCIONES.s3}
- formulario_vinculacion.fecha_diligenciamiento: fecha del formulario de
  vinculación o de la última actualización de datos.
- formulario_vinculacion.ficha: la plantilla tiene 31 campos FIJOS. Diligencia
  solo los que aparezcan en las evidencias y deja en "" los demás. NO agregues
  campos nuevos: los que no estén en el esquema no se imprimen.

${SECCIONES.s4}
- gestion_comercial: transcripción resumida de la gestión de la oficina. Varios
  párrafos separados por \\n.

${SECCIONES.s5}
- validaciones: resultado de consultas en listas restrictivas, antecedentes y
  demás fuentes. Sin calificar conducta delictiva.

${SECCIONES.s6}
- nombre_titular, producto, numero_producto, periodo: encabezan la sección.
- resumen[]: una fila por tipo de transacción, separando crédito y débito, con
  número de transacciones y participación porcentual. Deja en "" las columnas
  que no apliquen a esa fila. total_resumen cierra la tabla.
- detalles[]: la plantilla tiene SIETE bloques de detalle fijos, rotulados de
  (A) a (G). Entrega un objeto por bloque con:
    letra: "A".."G"  (obligatorio, define en qué tabla de la plantilla cae)
    titulo: nombre de la transacción del resumen que se está detallando
    narrativa: párrafo explicativo (el bloque C no tiene narrativa impresa)
    total: total del bloque
    filas[]: usa SOLO las columnas que admite cada bloque:
      A, B, D, F, G -> fecha, oficina, identificacion, nombre, valor
      C             -> fecha, oficina, ciudad, valor
      E             -> fecha, oficina, girado_a, identificacion, valor
  Usa como máximo 7 bloques. Si hay menos transacciones relevantes, entrega
  menos objetos: los bloques sobrantes quedarán vacíos.

${SECCIONES.s7}
- acumulados.filas[]: un renglón por mes del periodo con crédito, débito,
  número de transacciones y porcentajes; acumulados.total cierra la tabla.
- acumulados.conclusion: párrafo de lectura de la tendencia.

${SECCIONES.s8}
- tipo_cliente.tipo: "Cliente" o "No cliente".
- tipo_cliente.perfil_financiero: perfil financiero que arroja la combinación
  de variables.
- tipo_cliente.comparacion_sector: comparación frente al sector económico.

${SECCIONES.s9}
- reporte.calificacion y reporte.urgencia: Alta / Media / Baja.

${SECCIONES.s10}
- caracteristicas_sospecha[]: una viñeta por elemento objetivo que sustenta (o
  desvirtúa) la sospecha, cada una anclada a un soporte documental.

${SECCIONES.s11b}
- metodologia: cómo se detectó la operación (herramientas SARLAFT, reporte de
  oficina, riesgo y criterio aplicados).

${SECCIONES.s12}
- relacion_reportes_anteriores: "SI" con la referencia del reporte previo, o "NO".

${SECCIONES.s13}
- senales_alerta: código y descripción textual de cada señal de alerta. Si hay
  varias, sepáralas con \\n.

${SECCIONES.s14}
- motivo_reporte: motivo del reporte; si no aplica, "NO APLICA".

${SECCIONES.s15}
- informacion_soporte[]: una entrada por soporte efectivamente adjuntado por el
  analista (reporte de operación inusual, perfilamiento, documentos de
  vinculación, soportes de operaciones, etc.).

TRAZABILIDAD
- trazabilidad: un objeto cuyas claves son las rutas de los campos que
  diligenciaste, p. ej. "descripcion_montos.operaciones[0].valor" o
  "formulario_vinculacion.ficha.ingresos". Cada valor es
  { origen, archivo, pagina }:
    origen "evidencia"     -> el dato aparece literal en una evidencia
    origen "inferido"      -> lo dedujiste de una o varias evidencias
    origen "no_encontrado" -> no pudiste determinarlo (el campo va en "")
  archivo y pagina identifican la evidencia; si no aplica, déjalos en "".
  No hace falta una entrada por cada fila de una tabla larga: basta con una
  entrada por tabla si todas las filas vienen de la misma evidencia.
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
2. Cero alucinación: si un dato no figura en las evidencias, deja el campo en
   cadena vacía "". Nunca inventes nombres, cédulas, NIT, cuentas, fechas,
   valores, porcentajes ni oficinas. Un campo vacío es correcto; un campo
   inventado invalida el informe.
3. Cifras y fechas se transcriben tal como aparecen en la evidencia (formato de
   moneda colombiana, p. ej. $1.234.567).
4. Los porcentajes y totales solo se reportan si están en la evidencia o si son
   suma directa y verificable de las filas incluidas.
5. Si una sección completa no aplica al caso, deja sus arreglos vacíos ([]) y
   sus textos en "".
6. Redacta en español formal, en tercera persona, tiempo pasado.
7. Respeta los nombres de clave del esquema al carácter. Los campos que no
   estén en el esquema NO se imprimen en el documento final.

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