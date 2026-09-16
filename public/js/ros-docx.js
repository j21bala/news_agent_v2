// =============================================================================
//  ROS -> DOCX  (rellenado sobre la plantilla oficial)
//  NO reconstruye el documento: abre public/plantilla/Plantilla_ROS_base.docx
//  y solo sustituye los marcadores. Formato, tablas, estilos, encabezado y pie
//  quedan exactamente como en la plantilla.
// =============================================================================

(function () {
  'use strict';

  var RUTA_PLANTILLA = './plantilla/Plantilla_ROS_base.docx';
  var MIME_DOCX =
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

  var MARCADO = '\u2612';   // casilla marcada
  var SIN_MARCAR = '\u2610'; // casilla vacia

  // Campos de la ficha de vinculacion, en el mismo orden de la plantilla.
  var CAMPOS_FICHA = [
    'tipo_id', 'id_cliente', 'fecha_creacion', 'nombres_apellidos', 'edad',
    'lugar_nacimiento', 'fecha_nacimiento', 'genero', 'estado_civil',
    'actividad_economica', 'nivel_riesgo_actividad', 'ocupacion',
    'segmento_sarlaft', 'perfil_riesgo_sarlaft', 'empresa_empleadora',
    'profesion', 'nivel_educativo', 'ingresos', 'direccion', 'ciudad',
    'oficina_administra', 'fecha_ultima_actualizacion', 'egresos',
    'valor_activos', 'valor_pasivos', 'operaciones_internacionales',
    'importaciones', 'exportaciones', 'cambio_divisas', 'origen_fondos',
    'origen_activos'
  ];

  // Bloques de detalle (A)..(G) y las columnas que admite cada tabla.
  var BLOQUES = [
    { letra: 'A', key: 'detalle_a', cols: ['fecha', 'oficina', 'identificacion', 'nombre', 'valor'] },
    { letra: 'B', key: 'detalle_b', cols: ['fecha', 'oficina', 'identificacion', 'nombre', 'valor'] },
    { letra: 'C', key: 'detalle_c', cols: ['fecha', 'oficina', 'ciudad', 'valor'] },
    { letra: 'D', key: 'detalle_d', cols: ['fecha', 'oficina', 'identificacion', 'nombre', 'valor'] },
    { letra: 'E', key: 'detalle_e', cols: ['fecha', 'oficina', 'girado_a', 'identificacion', 'valor'] },
    { letra: 'F', key: 'detalle_f', cols: ['fecha', 'oficina', 'identificacion', 'nombre', 'valor'] },
    { letra: 'G', key: 'detalle_g', cols: ['fecha', 'oficina', 'identificacion', 'nombre', 'valor'] }
  ];

  // ------------------------------------------------------------- utilidades
  // Nunca devolvemos "undefined": un campo sin dato queda VACIO, jamas hereda
  // el valor de la plantilla.
  function txt(v) {
    if (v === null || v === undefined) return '';
    if (typeof v === 'string') return v;
    return String(v);
  }

  function lista(v) {
    return Array.isArray(v) ? v : [];
  }

  function objeto(v) {
    return v && typeof v === 'object' && !Array.isArray(v) ? v : {};
  }

  // Convierte un array de parrafos o un texto en un unico string con saltos
  // de linea (la plantilla se renderiza con linebreaks: true).
  function bloqueTexto(v) {
    if (Array.isArray(v)) {
      return v.map(txt).filter(function (t) { return t.trim() !== ''; }).join('\n');
    }
    return txt(v);
  }

  // Deja una fila con exactamente las columnas que la tabla de la plantilla
  // espera. Columnas de mas se ignoran; columnas de menos quedan vacias.
  function fila(origen, cols) {
    var o = objeto(origen), out = {}, i;
    for (i = 0; i < cols.length; i++) out[cols[i]] = txt(o[cols[i]]);
    return out;
  }

  function filas(origen, cols) {
    return lista(origen).map(function (f) { return fila(f, cols); });
  }

  // ------------------------------------------------- JSON de la IA -> plantilla
  function aplanar(informe) {
    var d = objeto(informe);
    var dm = objeto(d.descripcion_montos);
    var fv = objeto(d.formulario_vinculacion);
    var ficha = objeto(fv.ficha);
    var ct = objeto(d.comportamiento_transaccional);
    var ac = objeto(d.acumulados);
    var tc = objeto(d.tipo_cliente);
    var rp = objeto(d.reporte);
    var dec = objeto(d.decision);

    var datos = {
      // -------------------------------------------------------- encabezado
      asunto: txt(d.asunto),
      ciudad: txt(d.ciudad),
      chk_ros: dec.ros ? MARCADO : SIN_MARCAR,
      chk_archivo: dec.archivo ? MARCADO : SIN_MARCAR,
      chk_gestion: dec.gestion_comercial ? MARCADO : SIN_MARCAR,

      // ----------------------------------------------- descripcion de montos
      producto: txt(dm.producto),
      operaciones: filas(dm.operaciones, [
        'numero', 'identificacion_titular', 'nombre_titular', 'oficina',
        'fecha', 'transaccion', 'valor'
      ]),
      total_reportar: txt(dm.total_reportar),
      riesgos: bloqueTexto(dm.riesgos),
      criterios_objetivos: bloqueTexto(dm.criterios_objetivos),
      indicio: bloqueTexto(dm.indicio),
      decision_comite: bloqueTexto(dm.decision_comite),

      // --------------------------------------------------- 1. y 2. hechos
      hechos_cronologicos: bloqueTexto(d.hechos_cronologicos),
      productos_titular: filas(d.productos_titular, [
        'cliente', 'id_cliente', 'tipo_producto', 'no_producto',
        'fecha_apertura', 'estado', 'nombre_oficina', 'ciudad', 'saldo'
      ]),

      // ------------------------------------------------------ 3. formulario
      fecha_diligenciamiento: txt(fv.fecha_diligenciamiento),

      // ------------------------------------------------ 4. y 5. gestion
      gestion_comercial: bloqueTexto(d.gestion_comercial),
      validaciones: bloqueTexto(d.validaciones),

      // ---------------------------------------------- 6. transaccional
      nombre_titular: txt(ct.nombre_titular),
      numero_producto: txt(ct.numero_producto),
      periodo: txt(ct.periodo),
      resumen: filas(ct.resumen, [
        'transaccion', 'credito', 'tx_credito', 'pct_credito',
        'debito', 'tx_debito', 'pct_debito'
      ]),

      // -------------------------------------------------- acumulados
      acumulados: filas(ac.filas, [
        'fecha', 'credito', 'tx_credito', 'pct_credito',
        'debito', 'tx_debito', 'pct_debito'
      ]),
      conclusion_acumulados: bloqueTexto(ac.conclusion),

      // -------------------------------------------------- tipo de cliente
      tipo_cliente: txt(tc.tipo),
      perfil_financiero: bloqueTexto(tc.perfil_financiero),
      comparacion_sector: bloqueTexto(tc.comparacion_sector),

      // -------------------------------------------------------- reporte
      calificacion_reporte: txt(rp.calificacion),
      urgencia: txt(rp.urgencia),

      // ------------------------------------------------------- 5. a 10.
      caracteristicas_sospecha: lista(d.caracteristicas_sospecha)
        .map(txt).filter(function (t) { return t.trim() !== ''; }),
      metodologia: bloqueTexto(d.metodologia),
      relacion_reportes_anteriores: txt(d.relacion_reportes_anteriores),
      senales_alerta: bloqueTexto(d.senales_alerta),
      motivo_reporte: bloqueTexto(d.motivo_reporte),
      informacion_soporte: lista(d.informacion_soporte)
        .map(txt).filter(function (t) { return t.trim() !== ''; })
    };

    // Ficha de vinculacion (31 campos fijos de la plantilla).
    CAMPOS_FICHA.forEach(function (c) {
      datos['ficha_' + c] = txt(ficha[c]);
    });

    // Totales del resumen transaccional y de acumulados.
    var tr = objeto(ct.total_resumen), ta = objeto(ac.total);
    ['credito', 'tx_credito', 'pct_credito', 'debito', 'tx_debito', 'pct_debito']
      .forEach(function (c) {
        datos['total_resumen_' + c] = txt(tr[c]);
        datos['total_acumulados_' + c] = txt(ta[c]);
      });

    // Bloques de detalle (A)..(G). La IA los entrega como arreglo "detalles"
    // con la letra del bloque; se ubican en su tabla correspondiente.
    var porLetra = {};
    lista(ct.detalles).forEach(function (det) {
      var l = txt(objeto(det).letra).trim().toUpperCase().replace(/[()]/g, '');
      if (l) porLetra[l] = det;
    });

    BLOQUES.forEach(function (b) {
      var det = objeto(porLetra[b.letra]);
      datos[b.key + '_titulo'] = txt(det.titulo);
      datos[b.key + '_narrativa'] = bloqueTexto(det.narrativa);
      datos[b.key + '_filas'] = filas(det.filas, b.cols);
      datos[b.key + '_total'] = txt(det.total);
    });

    return datos;
  }

  // --------------------------------------------------------------- descarga
  function nombreArchivo(informe) {
    var base = txt(objeto(informe).asunto).replace(/[^\w\s-]/g, '').trim()
      .replace(/\s+/g, '_');
    return (base ? 'RIS_FINAL_' + base : 'RIS_FINAL') + '.docx';
  }

  /**
   * Rellena la plantilla oficial con el JSON de la IA y dispara la descarga.
   * @param {Object} informe JSON devuelto por /api/generar-ros
   */
  window.generarROSDocx = async function (informe) {
    if (!informe) throw new Error('No hay informe para exportar.');
    if (!window.PizZip || !window.docxtemplater) {
      throw new Error('No se cargaron las librerías de plantilla DOCX (PizZip / docxtemplater).');
    }

    var res = await fetch(RUTA_PLANTILLA);
    if (!res.ok) {
      throw new Error('No se encontró la plantilla en ' + RUTA_PLANTILLA + ' (HTTP ' + res.status + ').');
    }
    var buffer = await res.arrayBuffer();

    var zip = new window.PizZip(buffer);
    var doc = new window.docxtemplater(zip, {
      paragraphLoop: true,   // permite repetir viñetas y filas completas
      linebreaks: true,      // respeta los \n dentro de un mismo párrafo
      nullGetter: function () { return ''; } // campo sin dato -> vacío
    });

    try {
      doc.render(aplanar(informe));
    } catch (e) {
      var detalle = (e.properties && e.properties.errors || [])
        .map(function (x) { return x.properties && x.properties.explanation; })
        .filter(Boolean).join(' | ');
      throw new Error('La plantilla no pudo rellenarse. ' + (detalle || e.message));
    }

    var blob = doc.getZip().generate({ type: 'blob', mimeType: MIME_DOCX });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = nombreArchivo(informe);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
  };

  // Expuesto por si quieres inspeccionar el mapeo en consola.
  window.aplanarInformeROS = aplanar;
})();