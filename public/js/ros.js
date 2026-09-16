// =============================================================================
//  GENERADOR ROS  —  frontend
//  El analista solo carga evidencias (+ instrucción opcional).
//  La plantilla es fija y vive en /api/plantilla-ros.js.
//  Este archivo: extrae texto de los archivos -> llama a la IA -> arma el
//  informe con el formato exacto de la plantilla Word -> permite descargarlo.
// =============================================================================

(function () {
  'use strict';

  let rosArchivosTexto = '';   // texto extraído de las evidencias
  let rosInformeActual = null; // último JSON devuelto por la IA

  const VACIO = 'No documentado';
  const NOTA_LEGAL_FALLBACK =
    'NOTA: Este informe se efectúa en desarrollo de las disposiciones legales, los acuerdos y ' +
    'convenios suscritos por el sector financiero con las autoridades, y el Código de conducta y ' +
    'Manual de Procedimientos del SARLAFT, en el entendimiento que los hechos relatados se sustentan ' +
    'en los perfiles generales fijados para las Operaciones sospechosas y no constituye denuncia de ' +
    'un hecho ilícito. (Artículo 42 de la Ley 190 de 1995).';

  let notaLegalActual = NOTA_LEGAL_FALLBACK;

  // ---------------------------------------------------------------- utilidades
  const esc = (v) => String(v === undefined || v === null || v === '' ? VACIO : v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const arr = (v) => (Array.isArray(v) ? v.filter((x) => x !== null && x !== undefined) : []);
  const obj = (v) => (v && typeof v === 'object' ? v : {});

  function status(msg) {
    const el = document.getElementById('status-ros');
    if (el) el.innerHTML = msg;
  }

  // ------------------------------------------------- listado de archivos cargados
  window.mostrarArchivos = function (idInput, idLista) {
    const input = document.getElementById(idInput);
    const lista = document.getElementById(idLista);
    if (!input || !lista) return;

    lista.innerHTML = '';
    Array.from(input.files).forEach((f) => {
      const li = document.createElement('li');
      li.className = 'flex items-center gap-2';
      li.innerHTML =
        `<i class="fa-solid fa-file-lines text-gold"></i> ${esc(f.name)} ` +
        `<span class="text-slate-400 text-xs">(${(f.size / 1024).toFixed(0)} KB)</span>`;
      lista.appendChild(li);
    });
  };

  // --------------------------------------------- extracción de texto por tipo
  async function leerPDF(file) {
    if (!window.pdfjsLib) throw new Error('No se cargó pdf.js para leer PDF.');
    const buf = await file.arrayBuffer();
    const pdf = await window.pdfjsLib.getDocument({ data: buf }).promise;
    let out = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const tc = await page.getTextContent();
      out += `\n--- Página ${i} ---\n` + tc.items.map((it) => it.str).join(' ');
    }
    return out;
  }

  async function leerDocx(file) {
    if (!window.mammoth) throw new Error('No se cargó mammoth.js para leer Word.');
    const buf = await file.arrayBuffer();
    const r = await window.mammoth.extractRawText({ arrayBuffer: buf });
    return r.value || '';
  }

  async function leerExcel(file) {
    if (!window.XLSX) throw new Error('No se cargó SheetJS para leer Excel.');
    const buf = await file.arrayBuffer();
    const wb = window.XLSX.read(buf, { type: 'array' });
    return wb.SheetNames.map(
      (n) => `\n--- Hoja: ${n} ---\n` + window.XLSX.utils.sheet_to_csv(wb.Sheets[n])
    ).join('\n');
  }

  async function extraerTexto(file) {
    const nombre = file.name.toLowerCase();
    if (nombre.endsWith('.pdf')) return leerPDF(file);
    if (nombre.endsWith('.docx')) return leerDocx(file);
    if (/\.(xlsx|xlsm|xls|csv)$/.test(nombre)) return leerExcel(file);
    if (/\.(txt|md|json)$/.test(nombre)) return file.text();
    throw new Error(`Formato no soportado: ${file.name}`);
  }

  // ------------------------------------------------------ llamada al generador
  window.analizarROS = async function () {
    const input = document.getElementById('rosArchivos');
    const btn = document.getElementById('btnAnalizarRos');
    const instruccionesAnalista =
      (document.getElementById('rosInstrucciones')?.value || '').trim();

    if (!input || input.files.length === 0) {
      alert('Carga al menos un documento de evidencia.');
      return;
    }

    btn.disabled = true;
    btn.classList.add('opacity-50');

    try {
      // 1) Extraer texto de cada evidencia
      const partes = [];
      for (let i = 0; i < input.files.length; i++) {
        const f = input.files[i];
        status(`<i class="fa-solid fa-spinner fa-spin text-teal"></i> Leyendo evidencia ${i + 1} de ${input.files.length}: ${esc(f.name)}`);
        try {
          const texto = await extraerTexto(f);
          partes.push(`\n\n===== EVIDENCIA: ${f.name} =====\n${texto}`);
        } catch (e) {
          partes.push(`\n\n===== EVIDENCIA: ${f.name} =====\n[No se pudo extraer texto: ${e.message}]`);
        }
      }
      rosArchivosTexto = partes.join('\n');

      if (rosArchivosTexto.replace(/\s/g, '').length < 50) {
        throw new Error('No se pudo extraer texto legible de las evidencias cargadas.');
      }

      // 2) Generar el ROS sobre la plantilla fija
      status('<i class="fa-solid fa-spinner fa-spin text-teal"></i> Diligenciando la plantilla oficial de ROS (temperatura 0)...');

      const res = await SarlaftAuth.authFetch('/api/generar-ros', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ textoDocumentos: rosArchivosTexto, instruccionesAnalista })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error del servidor');

      rosInformeActual = data.informe;
      notaLegalActual = data.notaLegal || NOTA_LEGAL_FALLBACK;

      // 3) Render con el formato de la plantilla
      document.getElementById('contenido-ros').innerHTML = construirInformeHTML(rosInformeActual);
      document.getElementById('reporte-ros').classList.remove('hidden');
      const badge = document.getElementById('rosMotorBadge');
      if (badge) badge.textContent = `Procesado con: ${data.motor}`;
      status('<span class="text-green-600 font-semibold">Informe completado ✓</span>');
      document.getElementById('reporte-ros').scrollIntoView({ behavior: 'smooth' });
    } catch (err) {
      alert(`Error al generar el ROS: ${err.message}`);
      status('');
    } finally {
      btn.disabled = false;
      btn.classList.remove('opacity-50');
    }
  };

  // --------------------------------------------------- render de la plantilla
  const TB = 'width:100%;border-collapse:collapse;font-size:11px;margin:8px 0;';
  const TH = 'border:1px solid #999;padding:5px;background:#e9edf2;font-weight:bold;text-align:left;';
  const TD = 'border:1px solid #999;padding:5px;vertical-align:top;';

  function tabla(columnas, filas) {
    if (!filas.length) return `<p style="${'font-style:italic;color:#666;'}">${VACIO}</p>`;
    const head = columnas.map((c) => `<th style="${TH}">${esc(c)}</th>`).join('');
    const body = filas
      .map((f) => `<tr>${f.map((c) => `<td style="${TD}">${esc(c)}</td>`).join('')}</tr>`)
      .join('');
    return `<table style="${TB}"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
  }

  function parrafos(lista) {
    const l = arr(lista).filter((t) => String(t).trim());
    if (!l.length) return `<p>${VACIO}</p>`;
    return l.map((t) => `<p style="text-align:justify;margin:6px 0;">${esc(t)}</p>`).join('');
  }

  function vinetas(lista) {
    const l = arr(lista).filter((t) => String(t).trim());
    if (!l.length) return `<p>${VACIO}</p>`;
    return `<ul style="margin:6px 0 6px 18px;">${l.map((t) => `<li style="margin-bottom:4px;text-align:justify;">${esc(t)}</li>`).join('')}</ul>`;
  }

  const H1 = 'font-size:13px;font-weight:bold;margin:18px 0 6px 0;text-transform:uppercase;';
  const H2 = 'font-size:12px;font-weight:bold;margin:14px 0 6px 0;';

  function construirInformeHTML(d) {
    d = obj(d);
    const enc = obj(d.encabezado);
    const dm = obj(d.descripcion_montos);
    const h = obj(d.hechos);
    const ct = obj(d.comportamiento_transaccional);
    const am = obj(d.acumulados_mensuales);
    const tc = obj(d.tipo_cliente);
    const rp = obj(d.reporte);

    let html = '';

    // ---------------- Encabezado
    html += `
      <p><b>Marca:</b> ${esc(enc.marca)}</p>
      <p><b>Asunto:</b> ${esc(enc.asunto)}</p>
      <p><b>Ciudad:</b> ${esc(enc.ciudad)}</p>`;

    // ---------------- Descripción de montos
    html += `<h4 style="${H2}">Descripción de Montos</h4>`;
    html += `<p><b>Producto:</b> ${esc(dm.producto)}</p>`;
    html += tabla(
      ['Numero', 'Identificación del titular', 'Nombre Titular', 'Oficina', 'Fecha', 'Transacción', 'Valor'],
      arr(dm.operaciones).map((o) => [o.numero, o.identificacion_titular, o.nombre_titular, o.oficina, o.fecha, o.transaccion, o.valor])
    );
    html += tabla(
      ['Tipología', 'Criterios objetivo', 'Decisión Comité'],
      [[dm.tipologia, dm.criterios_objetivo, dm.decision_comite]]
    );

    // ---------------- 1. Descripción de los hechos
    html += `<h3 style="${H1}">1. Descripción de los hechos</h3>`;
    html += `<p style="font-style:italic;">Personas naturales o jurídicas vinculadas al reporte.</p>`;
    html += `<p style="text-align:justify;">${esc(h.identificacion_sujetos)}</p>`;
    html += `<p style="text-align:justify;">${esc(h.antecedentes)}</p>`;

    html += `<h4 style="${H2}">1.1 Hechos cronológicos</h4>`;
    html += parrafos(h.hechos_cronologicos);

    const soc = arr(h.composicion_societaria);
    if (soc.length) {
      html += `<h4 style="${H2}">Composición societaria</h4>`;
      html += tabla(['Tipo', 'Numero', 'Nombre', 'Porcentaje', 'Cliente'],
        soc.map((s) => [s.tipo, s.numero, s.nombre, s.porcentaje, s.cliente]));
    }

    const jdp = arr(h.junta_directiva_principales);
    const jds = arr(h.junta_directiva_suplentes);
    if (jdp.length || jds.length) {
      html += `<h4 style="${H2}">Junta directiva</h4>`;
      if (jdp.length) {
        html += `<p><b>Principales</b></p>`;
        html += tabla(['Identificación', 'Nombre', 'Cliente'], jdp.map((j) => [j.identificacion, j.nombre, j.cliente]));
      }
      if (jds.length) {
        html += `<p><b>Suplentes</b></p>`;
        html += tabla(['Identificación', 'Nombre', 'Cliente'], jds.map((j) => [j.identificacion, j.nombre, j.cliente]));
      }
    }

    html += `<h4 style="${H2}">Gestión comercial de la oficina</h4>`;
    html += parrafos(h.gestion_comercial);

    // ---------------- 1.3 Comportamiento transaccional
    html += `<h3 style="${H1}">1.3. Comportamiento transaccional del principal</h3>`;
    html += `<p style="text-align:justify;">Movimiento transaccional del producto <b>${esc(ct.producto)}</b> No <b>${esc(ct.numero_producto)}</b>, durante el periodo <b><u>${esc(ct.periodo)}</u></b>, discriminado en débitos y créditos:</p>`;

    const filasRes = arr(ct.resumen).map((r) => [r.transaccion, r.credito, r.tx_credito, r.pct_credito, r.debito, r.tx_debito, r.pct_debito]);
    const tot = obj(ct.total_resumen);
    if (Object.keys(tot).length) {
      filasRes.push(['Total general', tot.credito, tot.tx_credito, tot.pct_credito, tot.debito, tot.tx_debito, tot.pct_debito]);
    }
    html += tabla(['Transacción', 'Crédito', 'Tx.', '%', 'Débito', 'Tx.', '%'], filasRes);

    arr(ct.detalles).forEach((det) => {
      html += `<h4 style="${H2}">${esc(det.titulo)}</h4>`;
      html += `<p style="text-align:justify;">${esc(det.narrativa)}</p>`;
      const cols = arr(det.columnas);
      const fls = arr(det.filas).map((f) => (Array.isArray(f) ? f : [f]));
      if (cols.length && fls.length) {
        if (det.total) fls.push(cols.map((_, i) => (i === cols.length - 1 ? det.total : (i === 0 ? 'Total' : ''))));
        html += tabla(cols, fls);
      }
    });

    html += parrafos(ct.observaciones);

    // ---------------- Acumulados mensuales
    html += `<h4 style="${H2}">Acumulados y promedios débito y crédito del periodo <u>${esc(am.periodo || ct.periodo)}</u></h4>`;
    const filasAM = arr(am.filas).map((r) => [r.fecha, r.credito, r.tx_credito, r.pct_credito, r.debito, r.tx_debito, r.pct_debito]);
    const totAM = obj(am.total);
    if (Object.keys(totAM).length) {
      filasAM.push(['Total general', totAM.credito, totAM.tx_credito, totAM.pct_credito, totAM.debito, totAM.tx_debito, totAM.pct_debito]);
    }
    html += tabla(['Fecha', 'Crédito', 'Tx.', '%', 'Débito', 'Tx.', '%'], filasAM);

    // ---------------- 1.4 Productos
    html += `<h3 style="${H1}">1.4. Productos financieros involucrados, tipos de transacciones, montos e instituciones financieras</h3>`;
    html += tabla(['Producto', 'Cuenta', 'Tipo de Transacción', 'Monto', 'Institución'],
      arr(d.productos_involucrados).map((p) => [p.producto, p.cuenta, p.tipo_transaccion, p.monto, p.institucion]));

    html += `<h4 style="${H2}">1.4.1 Otros productos financieros</h4>`;
    html += tabla(['Producto', 'Número', 'Fecha de apertura', 'Estado'],
      arr(d.otros_productos).map((p) => [p.producto, p.numero, p.fecha_apertura, p.estado]));

    // ---------------- 2. Tipo de cliente
    html += `<h3 style="${H1}">2. Tipo de cliente</h3>`;
    html += `<p>${esc(tc.tipo)}</p>`;
    html += `<h4 style="${H2}">2.1 Si es cliente defina:</h4>`;
    html += `<p><b>a) Ingresos y egresos e información patrimonial</b></p>`;
    html += tabla(['Campo', 'Valor'], arr(tc.ficha).map((f) => [f.campo, f.valor]));
    html += `<p><b>b) Comparación del cliente con el sector económico al cual pertenece</b></p>`;
    html += `<p style="text-align:justify;">${esc(tc.comparacion_sector)}</p>`;
    html += `<p><b>c) Fecha de actualización de datos</b></p>`;
    html += `<p>${esc(tc.fecha_actualizacion_datos)}</p>`;

    // ---------------- 3. Reporte
    html += `<h3 style="${H1}">3. Reporte</h3>`;
    html += `<p><b>Calificación reporte:</b> ${esc(rp.calificacion)}</p>`;
    html += `<p><b>Urgencia:</b> ${esc(rp.urgencia)}</p>`;

    // ---------------- 4 a 9
    html += `<h3 style="${H1}">4. Características por las cuales se ha considerado la operación como sospechosa</h3>`;
    html += vinetas(d.caracteristicas_sospecha);
    html += `<p style="text-align:justify;">${esc(d.conclusion_sospecha)}</p>`;

    html += `<h3 style="${H1}">5. Metodología empleada para la detección de la operación reportada</h3>`;
    html += `<p style="text-align:justify;">${esc(d.metodologia)}</p>`;

    html += `<h3 style="${H1}">6. La operación sospechosa se relaciona con algún reporte realizado anteriormente por la institución o con otras operaciones</h3>`;
    html += `<p>${esc(d.relacion_reportes_anteriores)}</p>`;

    html += `<h3 style="${H1}">7. Señal de alerta</h3>`;
    html += vinetas(d.senales_alerta);

    html += `<h3 style="${H1}">8. Motivo del reporte</h3>`;
    html += `<p>${esc(d.motivo_reporte)}</p>`;

    html += `<h3 style="${H1}">9. Información soporte de la operación reportada</h3>`;
    html += vinetas(d.informacion_soporte);

    html += `<p style="margin-top:22px;font-size:10px;text-align:justify;">${esc(notaLegalActual)}</p>`;

    return html;
  }

  // ----------------------------------------------------- exportar a Word (.docx)
  window.descargarROSWord = function () {
    if (!rosInformeActual) return alert('Primero genera el informe.');

    const cuerpo = document.getElementById('contenido-ros').innerHTML;
    const html = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8">
<style>
  @page { size: 21cm 29.7cm; margin: 2cm; }
  body { font-family: Arial, sans-serif; font-size: 11pt; }
  table { border-collapse: collapse; width: 100%; }
  td, th { border: 1px solid #999999; padding: 4pt; font-size: 9pt; }
  th { background-color: #e9edf2; }
</style></head>
<body>${cuerpo}</body></html>`;

    const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
    const a = document.createElement('a');
    const marca = (rosInformeActual?.encabezado?.marca || 'ROS').replace(/[^\w]/g, '_');
    a.href = URL.createObjectURL(blob);
    a.download = `ROS_${marca}_${new Date().toISOString().slice(0, 10)}.doc`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  // Compatibilidad con el nombre anterior.
  window.generarInformeROS = window.analizarROS;
})();