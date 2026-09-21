// =============================================================================
//  GENERADOR ROS  —  frontend
//  El analista solo carga evidencias (+ instrucción opcional).
//  La plantilla es fija y vive en /api/plantilla-ros.js (esquema) y en
//  /public/plantilla/Plantilla_ROS_base.docx (formato Word).
//  Este archivo: extrae texto de los archivos -> llama a la IA -> muestra una
//  VISTA PREVIA en pantalla. La descarga del Word la hace ros-docx.js
//  rellenando la plantilla oficial (no reconstruye el documento).
// =============================================================================

(function () {
  'use strict';

  let rosArchivosTexto = '';   // texto extraído de las evidencias
  let rosInformeActual = null; // último JSON devuelto por la IA
  let rosArchivosAcumulados = []; // File[] — se van sumando entre selecciones/drops

  const VACIO = '';
  const NOTA_LEGAL_FALLBACK =
    'NOTA: Este informe se efectúa en desarrollo de las disposiciones legales, los acuerdos y ' +
    'convenios suscritos por el sector financiero con las autoridades, y el Código de conducta y ' +
    'Manual de Procedimientos del SARLAFT, en el entendimiento que los hechos relatados se sustentan ' +
    'en los perfiles generales fijados para las Operaciones sospechosas y no constituye denuncia de ' +
    'un hecho ilícito. Por lo tanto, nos encontramos amparados por la exoneración de responsabilidad ' +
    'consagrada en el artículo 42 de la Ley 190 de 1995.';

  let notaLegalActual = NOTA_LEGAL_FALLBACK;

  // ---------------------------------------------------------------- utilidades
  const esc = (v) => String(v === undefined || v === null ? VACIO : v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const arr = (v) => (Array.isArray(v) ? v.filter((x) => x !== null && x !== undefined) : []);
  const obj = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});

  // Texto que puede venir como string con \n o como arreglo de párrafos.
  const bloque = (v) => (Array.isArray(v) ? v.join('\n') : String(v || ''));

  function status(msg) {
    const el = document.getElementById('status-ros');
    if (el) el.innerHTML = msg;
  }

  // ------------------------------------------------- listado de archivos cargados
  // Los archivos se ACUMULAN: cada nueva selección o drop se suma a los ya
  // cargados (no los reemplaza). Se deduplica por nombre+tamaño+fecha.
  window.agregarArchivosRos = function (fileList) {
    Array.from(fileList || []).forEach((f) => {
      const yaExiste = rosArchivosAcumulados.some(
        (x) => x.name === f.name && x.size === f.size && x.lastModified === f.lastModified
      );
      if (!yaExiste) rosArchivosAcumulados.push(f);
    });
    renderizarListaArchivosRos();

    // Limpia el <input> para que el próximo drop/selección se sume y no reemplace.
    const input = document.getElementById('rosArchivos');
    if (input) input.value = '';
  };

  window.quitarArchivoRos = function (idx) {
    rosArchivosAcumulados.splice(idx, 1);
    renderizarListaArchivosRos();
  };

  window.limpiarArchivosRos = function () {
    rosArchivosAcumulados = [];
    renderizarListaArchivosRos();
  };

  function renderizarListaArchivosRos() {
    const lista = document.getElementById('rosListaArchivos');
    if (!lista) return;

    lista.innerHTML = '';
    rosArchivosAcumulados.forEach((f, idx) => {
      const li = document.createElement('li');
      li.className = 'flex items-center justify-between gap-2';
      li.innerHTML =
        `<span class="flex items-center gap-2"><i class="fa-solid fa-file-lines text-gold"></i> ${esc(f.name)} ` +
        `<span class="text-slate-400 text-xs">(${(f.size / 1024).toFixed(0)} KB)</span></span>` +
        `<button type="button" onclick="window.quitarArchivoRos(${idx})" class="text-slate-400 hover:text-red-500" title="Quitar"><i class="fa-solid fa-xmark"></i></button>`;
      lista.appendChild(li);
    });

    const contador = document.getElementById('rosContadorArchivos');
    if (contador) {
      contador.innerHTML = rosArchivosAcumulados.length
        ? `${rosArchivosAcumulados.length} archivo(s) cargado(s) · <button type="button" onclick="window.limpiarArchivosRos()" class="underline hover:text-red-500">vaciar</button>`
        : '';
    }
  }

  // Compatibilidad con el nombre anterior (por si algo más lo referencia).
  window.mostrarArchivos = function () { renderizarListaArchivosRos(); };

  // --------------------------------------- reduce a texto plano y liviano
  // Colapsa espacios/saltos de línea redundantes que vienen de la extracción
  // (PDF/Word/Excel) para minimizar los tokens que consume la IA, sin perder
  // información. Así entran muchos más archivos dentro del mismo presupuesto.
  function compactarTexto(texto) {
    return String(texto || '')
      .replace(/\r\n?/g, '\n')
      .replace(/[ \t]{2,}/g, ' ')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n[ \t]+/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  function compactarCSV(csv) {
    return String(csv || '')
      .split('\n')
      .map((l) => l.replace(/,+$/g, '').trim())
      .filter((l) => l.replace(/,/g, '').trim() !== '')
      .join('\n');
  }

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
    return wb.SheetNames.map((n) => {
      const csv = compactarCSV(window.XLSX.utils.sheet_to_csv(wb.Sheets[n]));
      return csv ? `\n--- Hoja: ${n} ---\n${csv}` : '';
    }).filter(Boolean).join('\n');
  }

  // Correos exportados como .eml (MIME estándar): extrae encabezados clave y
  // el cuerpo en texto plano (o el HTML sin etiquetas si no hay texto plano).
  async function leerEML(file) {
    const raw = await file.text();
    const [headerText, ...restoPartes] = raw.split(/\r?\n\r?\n/);
    let cuerpo = restoPartes.join('\n\n');

    const getHeader = (nombre) => {
      const m = headerText.match(new RegExp(`^${nombre}:\\s*(.+(?:\\n[ \\t].+)*)`, 'im'));
      return m ? m[1].replace(/\n[ \t]+/g, ' ').trim() : '';
    };

    const boundaryMatch = headerText.match(/boundary="?([^"\n;]+)"?/i);
    if (boundaryMatch) {
      const boundary = boundaryMatch[1].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const partes = cuerpo.split(new RegExp(`--${boundary}`, 'g'));
      const plana = partes.find((p) => /content-type:\s*text\/plain/i.test(p));
      const html = partes.find((p) => /content-type:\s*text\/html/i.test(p));
      cuerpo = (plana || html || '').replace(/^[\s\S]*?\r?\n\r?\n/, '');
      if (!plana && html) cuerpo = cuerpo.replace(/<[^>]+>/g, ' ');
    } else if (/content-type:\s*text\/html/i.test(headerText)) {
      cuerpo = cuerpo.replace(/<[^>]+>/g, ' ');
    }

    // Decodifica quoted-printable básico.
    cuerpo = cuerpo.replace(/=\r?\n/g, '').replace(/=([0-9A-F]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));

    return `De: ${getHeader('From')}\nPara: ${getHeader('To')}\nFecha: ${getHeader('Date')}\nAsunto: ${getHeader('Subject')}\n\n${cuerpo}`;
  }

  // Correos .msg (formato binario propietario de Outlook, OLE compound file):
  // sin librería, se hace una extracción de mejor esfuerzo de las cadenas de
  // texto legibles (UTF-16LE, como guarda Outlook el asunto/cuerpo/remitente).
  async function leerMSG(file) {
    const buf = new Uint8Array(await file.arrayBuffer());
    const cadenas = new Set();
    let actual = '';
    for (let i = 0; i < buf.length - 1; i += 2) {
      const code = buf[i] | (buf[i + 1] << 8);
      if (code >= 32 && code < 127) {
        actual += String.fromCharCode(code);
      } else {
        if (actual.trim().length >= 5) cadenas.add(actual.trim());
        actual = '';
      }
    }
    if (actual.trim().length >= 5) cadenas.add(actual.trim());
    return `[Correo .msg — texto extraído automáticamente]\n${Array.from(cadenas).join('\n')}`;
  }

  async function extraerTexto(file) {
    const nombre = file.name.toLowerCase();
    if (nombre.endsWith('.pdf')) return leerPDF(file);
    if (nombre.endsWith('.docx')) return leerDocx(file);
    if (/\.(xlsx|xlsm|xls|csv)$/.test(nombre)) return leerExcel(file);
    if (nombre.endsWith('.eml')) return leerEML(file);
    if (nombre.endsWith('.msg')) return leerMSG(file);
    if (/\.(txt|md|json)$/.test(nombre)) return file.text();
    throw new Error(`Formato no soportado: ${file.name}`);
  }

  // ------------------------------------------------------ llamada al generador
  window.analizarROS = async function () {
    const btn = document.getElementById('btnAnalizarRos');
    const instruccionesAnalista =
      (document.getElementById('rosInstrucciones')?.value || '').trim();

    if (rosArchivosAcumulados.length === 0) {
      alert('Carga al menos un documento de evidencia.');
      return;
    }

    btn.disabled = true;
    btn.classList.add('opacity-50');

    try {
      // 1) Extraer texto de cada evidencia y comprimirlo a un formato liviano
      //    (menos tokens por archivo) para que quepan muchas evidencias juntas.
      const total = rosArchivosAcumulados.length;
      const partes = [];
      for (let i = 0; i < total; i++) {
        const f = rosArchivosAcumulados[i];
        status(`<i class="fa-solid fa-spinner fa-spin text-teal"></i> Leyendo evidencia ${i + 1} de ${total}: ${esc(f.name)}`);
        try {
          const crudo = await extraerTexto(f);
          const texto = compactarTexto(crudo);
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

      // 3) Vista previa
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

  // --------------------------------------------------- vista previa en pantalla
  const TB = 'width:100%;border-collapse:collapse;font-size:11px;margin:8px 0;';
  const TH = 'border:1px solid #999;padding:5px;background:#e9edf2;font-weight:bold;text-align:left;';
  const TD = 'border:1px solid #999;padding:5px;vertical-align:top;';
  const H1 = 'font-size:13px;font-weight:bold;margin:18px 0 6px 0;text-transform:uppercase;';
  const H2 = 'font-size:12px;font-weight:bold;margin:14px 0 6px 0;';
  const SIN = '<p style="font-style:italic;color:#999;">(sin datos en las evidencias)</p>';

  function tabla(columnas, filas) {
    if (!filas.length) return SIN;
    const head = columnas.map((c) => `<th style="${TH}">${esc(c)}</th>`).join('');
    const body = filas
      .map((f) => `<tr>${f.map((c) => `<td style="${TD}">${esc(c)}</td>`).join('')}</tr>`)
      .join('');
    return `<table style="${TB}"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
  }

  function parrafos(v) {
    const l = bloque(v).split('\n').filter((t) => t.trim());
    if (!l.length) return SIN;
    return l.map((t) => `<p style="text-align:justify;margin:6px 0;">${esc(t)}</p>`).join('');
  }

  function vinetas(lista) {
    const l = arr(lista).filter((t) => String(t).trim());
    if (!l.length) return SIN;
    return `<ul style="margin:6px 0 6px 18px;">${l.map((t) => `<li style="margin-bottom:4px;text-align:justify;">${esc(t)}</li>`).join('')}</ul>`;
  }

  const COLS_DETALLE = {
    A: ['fecha', 'oficina', 'identificacion', 'nombre', 'valor'],
    B: ['fecha', 'oficina', 'identificacion', 'nombre', 'valor'],
    C: ['fecha', 'oficina', 'ciudad', 'valor'],
    D: ['fecha', 'oficina', 'identificacion', 'nombre', 'valor'],
    E: ['fecha', 'oficina', 'girado_a', 'identificacion', 'valor'],
    F: ['fecha', 'oficina', 'identificacion', 'nombre', 'valor'],
    G: ['fecha', 'oficina', 'identificacion', 'nombre', 'valor']
  };

  function construirInformeHTML(d) {
    d = obj(d);
    const dm = obj(d.descripcion_montos);
    const fv = obj(d.formulario_vinculacion);
    const ficha = obj(fv.ficha);
    const ct = obj(d.comportamiento_transaccional);
    const ac = obj(d.acumulados);
    const tc = obj(d.tipo_cliente);
    const rp = obj(d.reporte);
    const dec = obj(d.decision);

    const chk = (v) => (v ? '☒' : '☐');
    let html = '';

    // ---------------- Encabezado
    html += `<p><b>Asunto:</b> ${esc(d.asunto)}</p>`;
    html += `<p>ROS ${chk(dec.ros)} &nbsp; ARCHIVO ${chk(dec.archivo)} &nbsp; GESTIÓN COMERCIAL ${chk(dec.gestion_comercial)}</p>`;
    html += `<p><b>Ciudad:</b> ${esc(d.ciudad)}</p>`;

    // ---------------- Descripción de montos
    html += `<h4 style="${H2}">Descripción de Montos</h4>`;
    html += `<p><b>Producto:</b> ${esc(dm.producto)}</p>`;
    html += tabla(
      ['Numero', 'Identificación del titular', 'Nombre Titular', 'Oficina', 'Fecha', 'Transacción', 'Valor'],
      arr(dm.operaciones).map((o) => [o.numero, o.identificacion_titular, o.nombre_titular, o.oficina, o.fecha, o.transaccion, o.valor])
    );
    html += `<p><b>Total a reportar:</b> ${esc(dm.total_reportar)}</p>`;
    html += `<p><b>Riesgos:</b> ${esc(bloque(dm.riesgos))}</p>`;
    html += `<p><b>Criterios objetivos:</b> ${esc(bloque(dm.criterios_objetivos))}</p>`;
    html += `<p><b>Indicio:</b> ${esc(bloque(dm.indicio))}</p>`;
    html += `<p><b>Decisión comité:</b> ${esc(bloque(dm.decision_comite))}</p>`;

    // ---------------- 1. Descripción de los hechos
    html += `<h3 style="${H1}">1. Descripción de los hechos</h3>`;
    html += `<h4 style="${H2}">1.1 Hechos cronológicos</h4>`;
    html += parrafos(d.hechos_cronologicos);

    // ---------------- 2. Productos del titular
    html += `<h3 style="${H1}">2. Personas naturales o jurídicas vinculadas al reporte</h3>`;
    html += tabla(
      ['Cliente', 'Id. Cliente', 'Tipo Producto', 'No. producto', 'Fecha Apertura', 'Estado', 'Nombre oficina', 'Ciudad', 'Saldo'],
      arr(d.productos_titular).map((p) => [p.cliente, p.id_cliente, p.tipo_producto, p.no_producto, p.fecha_apertura, p.estado, p.nombre_oficina, p.ciudad, p.saldo])
    );

    // ---------------- 3. Formulario de vinculación
    html += `<h3 style="${H1}">3. Información formulario de vinculación y/o actualización</h3>`;
    html += `<p>Según el formulario de actualización de datos diligenciado el: ${esc(fv.fecha_diligenciamiento)}</p>`;
    const filasFicha = Object.keys(ficha)
      .filter((k) => String(ficha[k] || '').trim())
      .map((k) => [k.replace(/_/g, ' '), ficha[k]]);
    html += tabla(['Campo', 'Valor'], filasFicha);

    // ---------------- 4 y 5
    html += `<h3 style="${H1}">4. Gestión comercial de la oficina</h3>`;
    html += parrafos(d.gestion_comercial);
    html += `<h3 style="${H1}">5. Validaciones y hallazgos complementarios</h3>`;
    html += parrafos(d.validaciones);

    // ---------------- 6. Comportamiento transaccional
    html += `<h3 style="${H1}">6. Comportamiento transaccional ${esc(ct.nombre_titular)}</h3>`;
    html += `<p style="text-align:justify;">Movimiento del producto <b>${esc(ct.producto)}</b> No <b>${esc(ct.numero_producto)}</b>, durante el periodo <b><u>${esc(ct.periodo)}</u></b>:</p>`;

    const filasRes = arr(ct.resumen).map((r) => [r.transaccion, r.credito, r.tx_credito, r.pct_credito, r.debito, r.tx_debito, r.pct_debito]);
    const tot = obj(ct.total_resumen);
    if (filasRes.length) {
      filasRes.push(['Total general', tot.credito, tot.tx_credito, tot.pct_credito, tot.debito, tot.tx_debito, tot.pct_debito]);
    }
    html += tabla(['Transacción', 'Crédito', 'Tx.', '%', 'Débito', 'Tx.', '%'], filasRes);

    arr(ct.detalles).forEach((det) => {
      const letra = String(det.letra || '').toUpperCase().replace(/[()]/g, '');
      const cols = COLS_DETALLE[letra] || ['fecha', 'oficina', 'identificacion', 'nombre', 'valor'];
      html += `<h4 style="${H2}">(${esc(letra)}) ${esc(det.titulo)}</h4>`;
      if (bloque(det.narrativa).trim()) html += parrafos(det.narrativa);
      const fls = arr(det.filas).map((f) => cols.map((c) => obj(f)[c]));
      if (fls.length && det.total) fls.push(cols.map((_, i) => (i === 0 ? 'Total' : (i === cols.length - 1 ? det.total : ''))));
      html += tabla(cols.map((c) => c.replace(/_/g, ' ')), fls);
    });

    // ---------------- Acumulados
    html += `<h3 style="${H1}">Acumulados y promedios débito y crédito del periodo</h3>`;
    const filasAM = arr(ac.filas).map((r) => [r.fecha, r.credito, r.tx_credito, r.pct_credito, r.debito, r.tx_debito, r.pct_debito]);
    const totAM = obj(ac.total);
    if (filasAM.length) {
      filasAM.push(['Total general', totAM.credito, totAM.tx_credito, totAM.pct_credito, totAM.debito, totAM.tx_debito, totAM.pct_debito]);
    }
    html += tabla(['Fecha', 'Crédito', 'Tx.', '%', 'Débito', 'Tx.', '%'], filasAM);
    html += parrafos(ac.conclusion);

    // ---------------- Tipo de cliente
    html += `<h3 style="${H1}">Tipo de cliente</h3>`;
    html += `<p>${esc(tc.tipo)}</p>`;
    html += `<p><b>a) Comparación del cliente con el sector económico al cual pertenece</b></p>`;
    html += parrafos(tc.perfil_financiero);
    html += parrafos(tc.comparacion_sector);

    // ---------------- Reporte
    html += `<h3 style="${H1}">Reporte</h3>`;
    html += `<p><b>Calificación reporte:</b> ${esc(rp.calificacion)}</p>`;
    html += `<p><b>Urgencia:</b> ${esc(rp.urgencia)}</p>`;

    // ---------------- Resto
    html += `<h3 style="${H1}">Características por las cuales se ha considerado la operación como sospechosa</h3>`;
    html += vinetas(d.caracteristicas_sospecha);

    html += `<h3 style="${H1}">Metodología empleada para la detección de la operación reportada</h3>`;
    html += parrafos(d.metodologia);

    html += `<h3 style="${H1}">La operación sospechosa se relaciona con algún reporte realizado anteriormente</h3>`;
    html += `<p>${esc(d.relacion_reportes_anteriores)}</p>`;

    html += `<h3 style="${H1}">Señal de alerta</h3>`;
    html += parrafos(d.senales_alerta);

    html += `<h3 style="${H1}">Motivo del reporte</h3>`;
    html += parrafos(d.motivo_reporte);

    html += `<h3 style="${H1}">Información soporte de la operación reportada</h3>`;
    html += vinetas(d.informacion_soporte);

    html += `<p style="margin-top:22px;font-size:10px;text-align:justify;">${esc(notaLegalActual)}</p>`;

    // ---------------- Trazabilidad (solo pantalla, no va al Word)
    const tz = obj(d.trazabilidad);
    const claves = Object.keys(tz);
    if (claves.length) {
      const noHallados = claves.filter((k) => obj(tz[k]).origen === 'no_encontrado');
      const inferidos = claves.filter((k) => obj(tz[k]).origen === 'inferido');
      html += `<h3 style="${H1}">Trazabilidad</h3>`;
      html += `<p style="font-size:11px;">Campos con soporte documental: <b>${claves.length - noHallados.length - inferidos.length}</b> · inferidos: <b>${inferidos.length}</b> · no encontrados: <b>${noHallados.length}</b></p>`;
      html += tabla(['Campo', 'Origen', 'Archivo', 'Página'],
        claves.map((k) => [k, obj(tz[k]).origen, obj(tz[k]).archivo, obj(tz[k]).pagina]));
    }

    return html;
  }

  // ----------------------------------------------------- exportar a Word (.docx)
  // Ya NO se construye HTML: se rellena la plantilla oficial (ros-docx.js).
  window.descargarROSWord = async function () {
    if (!rosInformeActual) return alert('Primero genera el informe.');
    if (typeof window.generarROSDocx !== 'function') {
      return alert('No se cargó el módulo de plantilla DOCX (ros-docx.js).');
    }
    try {
      status('<i class="fa-solid fa-spinner fa-spin text-teal"></i> Rellenando la plantilla oficial...');
      await window.generarROSDocx(rosInformeActual);
      status('<span class="text-green-600 font-semibold">Documento generado ✓</span>');
    } catch (e) {
      status('');
      alert(`No se pudo generar el Word: ${e.message}`);
    }
  };

  // Compatibilidad con el nombre anterior.
  window.generarInformeROS = window.analizarROS;
})();