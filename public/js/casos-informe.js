// Casos — Informe ROS con estructura fija de la plantilla oficial.
(function () {
    const { esc, COP, T_NODO, T_VINC } = CS;
    const FORM_FIELDS = [
        ['tipo_id', 'Tipo Id'], ['id_cliente', 'Id Cliente'], ['fecha_creacion', 'Fecha creación'],
        ['nombres_apellidos', 'Nombres y apellidos'], ['edad', 'Edad'], ['lugar_nacimiento', 'Lugar de nacimiento'],
        ['fecha_nacimiento', 'Fecha de nacimiento'], ['genero', 'Género'], ['estado_civil', 'Estado civil'],
        ['actividad_economica', 'Actividad económica'], ['nivel_riesgo_actividad', 'Nivel de riesgo actividad económica'],
        ['ocupacion', 'Ocupación'], ['segmento_sarlaft', 'Segmento primario SARLAFT'],
        ['perfil_riesgo_sarlaft', 'Perfil de riesgo SARLAFT'], ['empresa_empleadora', 'Empresa empleadora'],
        ['profesion', 'Profesión'], ['nivel_educativo', 'Nivel educativo'], ['ingresos', 'Ingresos'],
        ['direccion', 'Dirección de correspondencia'], ['ciudad', 'Ciudad'],
        ['oficina_administra', 'Oficina que administra la relación'], ['fecha_ultima_actualizacion', 'Fecha última de actualización'],
        ['egresos', 'Egresos'], ['valor_activos', 'Valor activos'], ['valor_pasivos', 'Valor pasivos'],
        ['operaciones_internacionales', 'Indicador de operaciones internacionales'], ['importaciones', 'Importaciones'],
        ['exportaciones', 'Exportaciones'], ['cambio_divisas', 'Cambio de divisas'],
        ['origen_fondos', 'Origen de fondos'], ['origen_activos', 'Activos cuantificados provienen de']
    ];
    const GRAVEDAD = { alta: 0, media: 1, baja: 2 };
    const CATEGORIAS_ALERTA = {
        pep: 'Vínculo PEP',
        alto_riesgo_conectado: 'Sujeto de alto riesgo con múltiples vínculos',
        sujeto_sin_vinculo: 'Sujeto sin vínculos registrados',
        perfil_ingresos: 'Créditos superiores al perfil declarado',
        fraccionamiento: 'Posible fraccionamiento en efectivo',
        concentracion_efectivo: 'Concentración de operaciones en efectivo',
        montos_recurrentes: 'Montos idénticos recurrentes',
        contraparte_alto_riesgo: 'Contraparte de alto riesgo',
        otra: 'Otra alerta automática'
    };
    const AI_FIELDS = new Set([
        'informe.riesgos', 'informe.criterios', 'informe.indicio',
        'informe.caracteristicas_sospecha', 'informe.senales_alerta',
        'informe.metodologia', 'informe.motivo_reporte'
    ]);

    function categoriaAlerta(titulo) {
        const t = String(titulo || '').toLowerCase();
        if (t.includes('contraparte de alto riesgo')) return 'contraparte_alto_riesgo';
        if (t.includes('fraccionamiento')) return 'fraccionamiento';
        if (t.includes('concentración en efectivo')) return 'concentracion_efectivo';
        if (t.includes('montos idénticos')) return 'montos_recurrentes';
        if (t.includes('superan 12× ingresos')) return 'perfil_ingresos';
        if (t.includes('pep vinculado')) return 'pep';
        if (t.includes('alto riesgo muy conectado')) return 'alto_riesgo_conectado';
        if (t.includes('sujeto sin vincular')) return 'sujeto_sin_vinculo';
        return 'otra';
    }

    function conteoPor(lista, getClave, permitidas) {
        const r = Object.fromEntries(permitidas.map(k => [k, 0]));
        lista.forEach(x => { const k = getClave(x); if (Object.prototype.hasOwnProperty.call(r, k)) r[k]++; });
        return r;
    }

    function resumenSeguro() {
        const d = CS.d(), k = CS.calc();
        const grados = ['alta', 'media', 'baja'];
        const tiposSujeto = Object.keys(T_NODO);
        const tiposVinculo = Object.keys(T_VINC);
        const tiposTransaccion = CS.TX_TIPOS;
        const categorias = Object.keys(CATEGORIAS_ALERTA);
        return {
            sujetos: {
                total: d.nodos.length,
                tipos: conteoPor(d.nodos, n => n.tipo, tiposSujeto),
                riesgos: conteoPor(d.nodos, n => n.riesgo, ['alto', 'medio', 'bajo', 'na']),
                pep: d.nodos.filter(n => n.pep).length
            },
            vinculos: {
                total: d.vinculos.length,
                tipos: conteoPor(d.vinculos, v => v.tipo, tiposVinculo)
            },
            transacciones: {
                total: d.tx.length,
                reportables: d.tx.filter(t => t.reportar).length,
                creditos: d.tx.filter(t => t.nat !== 'debito').length,
                debitos: d.tx.filter(t => t.nat === 'debito').length,
                tipos: conteoPor(d.tx, t => tiposTransaccion.includes(t.tipo) ? t.tipo : 'Otro', [...tiposTransaccion, 'Otro'])
            },
            alertas: {
                total: k.al.length,
                gravedad: conteoPor(k.al, a => a.g, grados),
                categorias: conteoPor(k.al, a => categoriaAlerta(a.t), categorias)
            },
            hallazgos: {
                total: d.hallazgos.length,
                gravedad: conteoPor(d.hallazgos, h => h.g, grados)
            },
            cronologia: { eventos: d.crono.length },
            evidencias: { total: d.evid.length }
        };
    }

    function resumenAlertas(d, k) {
        const categorias = {};
        k.al.forEach(a => {
            const key = `${a.g}:${categoriaAlerta(a.t)}`;
            categorias[key] = (categorias[key] || 0) + 1;
        });
        const alertas = Object.entries(categorias)
            .sort((a, b) => {
                const nivelA = a[0].split(':')[0], nivelB = b[0].split(':')[0];
                return (GRAVEDAD[nivelA] ?? 3) - (GRAVEDAD[nivelB] ?? 3) || b[1] - a[1];
            })
            .slice(0, 5)
            .map(([key, n]) => {
                const [gravedad, categoria] = key.split(':');
                return `${gravedad}: ${CATEGORIAS_ALERTA[categoria]} (${n})`;
            });
        const hallazgosUnicos = new Map();
        [...d.hallazgos].sort((a, b) => (GRAVEDAD[a.g] ?? 3) - (GRAVEDAD[b.g] ?? 3)).forEach(h => {
            const gravedad = h.g || 'Sin gravedad';
            const titulo = String(h.t || 'Hallazgo sin título').replace(/\s+/g, ' ').trim();
            const clave = `${gravedad}:${titulo.toLowerCase()}`;
            const actual = hallazgosUnicos.get(clave);
            if (actual) actual.cantidad++;
            else hallazgosUnicos.set(clave, { gravedad, titulo, cantidad: 1 });
        });
        const hallazgos = [...hallazgosUnicos.values()];
        const hallazgoLineas = hallazgos.slice(0, 4).map(h =>
            `${h.gravedad}: ${h.titulo.slice(0, 140)}${h.titulo.length > 140 ? '…' : ''}${h.cantidad > 1 ? ` (${h.cantidad})` : ''}`);
        if (hallazgos.length > 4) hallazgoLineas.push(`${hallazgos.length - 4} hallazgo(s) adicional(es) resumido(s).`);
        const hallazgoTexto = hallazgoLineas.length ? hallazgoLineas.join('\n') : 'No hay hallazgos del analista registrados.';
        const alertaTexto = k.al.length
            ? `Alertas automáticas (${k.al.length}): ${alertas.join('; ')}.`
            : 'No hay alertas automáticas registradas.';
        return { alertas: alertaTexto, hallazgos: hallazgoTexto };
    }

    const tabla = (columnas, filas, clase = '') =>
        `<table${clase ? ` class="${clase}"` : ''}><thead><tr>${columnas.map(c => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${filas.map(f => `<tr>${f.map(c => `<td>${esc(c == null ? '' : c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
    const filaPlantilla = valor => `<table class="ros-single"><tbody><tr><td>${esc(valor || '')}</td></tr></tbody></table>`;
    const texto = valor => `<p class="ros-text">${esc(valor || '')}</p>`;
    const seccion = (titulo, cuerpo) => `<h2>${esc(titulo)}</h2>${cuerpo}`;
    const porcentaje = (v, total) => total ? `${(v / total * 100).toFixed(1)}%` : '—';

    function documento() {
        const d = CS.d(), m = d.meta, i = d.informe, k = CS.calc();
        const rep = d.tx.filter(t => t.reportar);
        const nodosPorNombre = nombre => d.nodos.find(n => n.nombre === nombre);
        const documentoSujeto = nombre => nodosPorNombre(nombre)?.doc || '';
        const productos = d.nodos.flatMap(n => (n.prods || []).map(p => [
            n.nombre, n.doc, p.tipo, p.numero, p.apertura, p.estado, p.oficina, COP(p.saldo)
        ]));
        const titular = rep[0]?.titular || d.nodos.find(n => n.tipo === 'persona')?.nombre || '';
        const sujetoFicha = d.nodos.find(n => n.nombre === titular && Object.values(n.ficha || {}).some(Boolean))
            || d.nodos.find(n => Object.values(n.ficha || {}).some(Boolean))
            || d.nodos.find(n => n.tipo === 'persona')
            || {};
        const ficha = sujetoFicha.ficha || {};
        const camposFicha = FORM_FIELDS.map(([key, label]) => [label, ficha[key] || '']);
        const fechaDiligenciamiento = ficha.fecha_ultima_actualizacion || ficha.fecha_creacion || '';
        const txValidas = d.tx.filter(t => Number.isFinite(+t.valor) && +t.valor > 0);
        const periodos = txValidas.map(t => t.fecha).filter(Boolean).sort();
        const periodo = periodos.length ? `${periodos[0]} - ${periodos[periodos.length - 1]}` : '';
        const tipos = Object.entries(k.porTipo);
        const filasResumen = tipos.map(([tipo, o]) => [
            tipo, COP(o.c), o.nc, porcentaje(o.c, k.cred), COP(o.d), o.nd, porcentaje(o.d, k.deb)
        ]);
        filasResumen.push(['Total general', COP(k.cred), txValidas.filter(t => t.nat !== 'debito').length,
            porcentaje(k.cred, k.cred), COP(k.deb), txValidas.filter(t => t.nat === 'debito').length,
            porcentaje(k.deb, k.deb)]);

        const porTipo = {};
        txValidas.forEach(t => { const key = t.tipo || 'Otro'; (porTipo[key] = porTipo[key] || []).push(t); });
        let grupos = Object.entries(porTipo).sort((a, b) => CS.sum(b[1]) - CS.sum(a[1]));
        if (grupos.length > 7) {
            const principales = grupos.slice(0, 6);
            const otros = grupos.slice(6).flatMap(([, filas]) => filas);
            grupos = [...principales, ['Otros movimientos', otros]];
        }
        const letras = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
        const detalles = letras.map((letra, index) => {
            const grupo = grupos[index];
            const filas = grupo ? grupo[1] : [];
            const titulo = grupo ? grupo[0] : '';
            const columnas = letra === 'C'
                ? ['Fecha', 'Oficina', 'Ciudad', 'Valor']
                : letra === 'E'
                    ? ['Fecha', 'Oficina', 'Girado a', 'Identificación', 'Valor']
                    : ['Fecha', 'Oficina', 'Identificación', 'Nombre', 'Valor'];
            const cuerpo = filas.map(t => letra === 'C'
                ? [t.fecha, t.oficina, t.ciudad || '', COP(t.valor)]
                : letra === 'E'
                    ? [t.fecha, t.oficina, t.contra, documentoSujeto(t.contra), COP(t.valor)]
                    : [t.fecha, t.oficina, documentoSujeto(t.titular), t.titular, COP(t.valor)]);
            if (letra === 'C') cuerpo.push(['Total', '', '', COP(CS.sum(filas))]);
            else if (letra !== 'E') cuerpo.push(['Total', '', '', '', COP(CS.sum(filas))]);
            const narracion = letra === 'C' || !grupo ? '' : `Detalle de ${titulo}: ${filas.length} operación(es).`;
            return `<h3>${esc(titulo)}</h3>${letra === 'C' || !grupo ? '' : texto(narracion)}${tabla(columnas, cuerpo, 'ros-detail')}`;
        }).join('');

        const meses = {};
        txValidas.forEach(t => {
            const mes = /^\d{4}-\d{2}/.test(t.fecha || '') ? t.fecha.slice(0, 7) : 'Sin fecha';
            const o = meses[mes] = meses[mes] || { c: 0, nc: 0, d: 0, nd: 0 };
            if (t.nat === 'debito') { o.d += +t.valor; o.nd++; }
            else { o.c += +t.valor; o.nc++; }
        });
        const creditosMes = Object.values(meses).reduce((s, o) => s + o.c, 0);
        const debitosMes = Object.values(meses).reduce((s, o) => s + o.d, 0);
        const filasMes = Object.entries(meses).sort(([a], [b]) => a.localeCompare(b)).map(([mes, o]) => [
            mes, COP(o.c), o.nc, porcentaje(o.c, creditosMes), COP(o.d), o.nd, porcentaje(o.d, debitosMes)
        ]);
        filasMes.push(['Total general', COP(creditosMes), txValidas.filter(t => t.nat !== 'debito').length,
            porcentaje(creditosMes, creditosMes), COP(debitosMes), txValidas.filter(t => t.nat === 'debito').length,
            porcentaje(debitosMes, debitosMes)]);

        const decision = m.decision || {};
        const productoResumen = [...new Set(rep.map(t => t.producto).filter(Boolean))].join(', ');
        const alertasResumen = resumenAlertas(d, k);
        const caracteristicas = (i.caracteristicas_sospecha || alertasResumen.hallazgos)
            .split(/\r?\n/).map(x => x.trim()).filter(Boolean);
        const evidencia = d.evid.map(e => e.nombre).filter(Boolean);
        const lineasSoporte = evidencia.length
            ? `<ul>${evidencia.map(nombre => `<li>${esc(nombre)}</li>`).join('')}</ul>`
            : '<ul></ul>';

        return `<div class="ros-document">
            <p><b>Asunto:</b> ${esc(m.asunto || '')}</p>
            <p class="ros-checks">ROS ${decision.ros ? 'X' : ''} &nbsp; ARCHIVO ${decision.archivo ? 'X' : ''} &nbsp; GESTIÓN COMERCIAL ${decision.gestion_comercial ? 'X' : ''}</p>
            <p><b>Ciudad:</b> ${esc(m.ciudad || '')}</p>
            ${seccion('Descripción de Montos', `<table class="ros-product"><tbody><tr><td><b>Producto:</b> ${esc(productoResumen)}</td></tr></tbody></table>`)}
            ${tabla(['Numero', 'Identificación del titular', 'Nombre Titular', 'Oficina', 'Fecha', 'Transacción', 'Valor'],
                rep.map(t => [t.numero, documentoSujeto(t.titular), t.titular, t.oficina, t.fecha, `${t.tipo || ''}${t.nat === 'debito' ? ' (débito)' : ''}`, COP(t.valor)]))}
            <table class="ros-total"><tbody><tr><td><b>TOTAL A REPORTAR</b></td><td>${esc(COP(CS.sum(rep)))}</td></tr></tbody></table>
            ${filaPlantilla(`Riesgos: ${i.riesgos || ''}`)}
            ${filaPlantilla(`Criterios objetivos: ${i.criterios || ''}`)}
            ${filaPlantilla(`Indicio: ${i.indicio || ''}`)}
            <h3>DECISIÓN COMITÉ</h3>${filaPlantilla(i.comite)}

            ${seccion('DESCRIPCIÓN DE LOS HECHOS', `<h3>1.1 HECHOS CRONOLÓGICOS</h3>${texto(i.hechos || [...d.crono].sort((a, b) => (a.fecha || '').localeCompare(b.fecha || '')).map(c => `${c.fecha || ''} — ${c.titulo}${c.desc ? '. ' + c.desc : ''}`).join('\\n'))}`)}

            ${seccion('PERSONAS NATURALES O JURÍDICAS VINCULADAS AL REPORTE QUE REGISTRA COMO TITULAR DE LOS SIGUIENTES PRODUCTOS:',
                tabla(['Cliente', 'Id. Cliente', 'Tipo Producto', 'No. producto', 'Fecha Apertura', 'Estado', 'Nombre oficina', 'Ciudad', 'Saldo'], productos))}

            ${seccion('INFORMACION FORMULARIO DE VINCULACIÓN Y/O ACTUALIZACION:',
                `<p>Según el formulario de actualización de datos diligenciado el: ${esc(fechaDiligenciamiento)}</p>${tabla(['Campo', 'Valor'], camposFicha)}`)}

            ${seccion('GESTION COMERCIAL POR PARTE DE LA OFICINA QUE ADMINISTRA LA RELACION.',
                `<p>La oficina sede de la cuenta ha efectuado gestión comercial para lo cual indica:</p>${texto(i.gestion)}`)}
            ${seccion('VALIDACIONES Y HALLAZGOS COMPLEMENTARIOS DE LAS DIFERENTES FUENTES DE INFORMACIÓN:', texto(i.validaciones))}

            ${seccion(`COMPORTAMIENTO TRANSACCIONAL ${titular}:`,
                `<p>El movimiento transaccional efectuado en la ${esc(productoResumen)} No ${esc(rep[0]?.numero || '')}, durante el ${esc(periodo)} al igual que detalle de sus operaciones:</p>
                ${tabla(['Transacción', 'Crédito', 'Tx.', '%', 'Débito', 'Tx.', '%'], filasResumen)}
                ${detalles}`)}

            ${seccion(`ACUMULADOS Y PROMEDIOS DÉBITO Y CRÉDITO DEL PERIODO ${titular}`,
                `${tabla(['Fecha', 'Crédito', 'Tx.', '%', 'Débito', 'Tx.', '%'], filasMes)}${texto(i.conclusion_acumulados || '')}`)}

            ${seccion('TIPO DE CLIENTE',
                `<p>${esc(i.tipo_cliente || '')}</p><p>Comparación del cliente con el sector económico al cual pertenece</p>${texto(i.perfil_financiero)}${texto(i.comparacion_sector)}`)}
            ${seccion('REPORTE',
                `<p>Calificación reporte: ${esc(i.calificacion_reporte || '')}</p><p>Urgencia: ${esc(i.urgencia || '')}</p>`)}
            ${seccion('CARACTERÍSTICAS POR LAS CUALES SE HA CONSIDERADO LA OPERACIÓN COMO SOSPECHOSA.',
                `<ul>${caracteristicas.map(x => `<li>${esc(x)}</li>`).join('')}</ul>`)}
            ${seccion('METODOLOGÍA EMPLEADA PARA LA DETECCIÓN DE LA OPERACIÓN REPORTADA:', texto(i.metodologia))}
            ${seccion('LA OPERACIÓN SOSPECHOSA SE RELACIONA CON ALGÚN REPORTE REALIZADO ANTERIORMENTE POR LA INSTITUCIÓN O CON OTRAS OPERACIONES',
                texto(i.reportes_anteriores))}
            ${seccion('SEÑAL DE ALERTA', texto(i.senales_alerta || alertasResumen.alertas))}
            ${seccion('MOTIVO DEL REPORTE', texto(i.motivo_reporte))}
            ${seccion('INFORMACIÓN SOPORTE DE LA OPERACIÓN REPORTADA', lineasSoporte)}
            ${texto('NOTA: Este informe se efectúa en desarrollo de las disposiciones legales, los acuerdos y convenios suscritos por el sector financiero con las autoridades, y el Código de conducta y Manual de Procedimientos del SARLAFT, en el entendimiento que los hechos relatados se sustentan en los perfiles generales fijados para las Operaciones sospechosas y no constituye denuncia de un hecho ilícito. Por lo tanto, nos encontramos amparados por la exoneración de responsabilidad consagrada en el artículo 42 de la Ley 190 de 1995.')}
        </div>`;
    }

    CS.tabs.informe = async el => {
        const d = CS.d();
        const area = (label, path, rows = 4, conIA = false) => `<div class="cs-f">
            <span class="cs-row between" style="text-transform:none"><span>${label}${conIA ? '' : ' · Manual'}</span>
            ${conIA ? `<button class="cs-btn sm" data-ia="${path}" title="Borrador con datos agregados y anonimizados">✨ Redactar con IA</button>` : ''}</span>
            <textarea class="cs-in" data-p="${path}" rows="${rows}">${esc(CS.get(path) || '')}</textarea></div>`;
        el.innerHTML = `<div class="cs-row between" style="margin-bottom:14px"><div><h2 style="font-size:20px;font-weight:700">Informe ROS</h2>
            <p class="cs-mu cs-sm">Vista previa con la estructura fija de Plantilla_ROS_base.docx. La IA solo recibe conteos y categorías; no recibe nombres, documentos, cuentas, fechas ni montos exactos.</p></div>
            <div class="cs-row"><button class="cs-btn" id="i-fx" title="Copiar hechos desde Cronología">Hechos ← Cronología</button><button class="cs-btn pri" id="i-pdf"><i class="fa-solid fa-file-pdf"></i> Imprimir / PDF</button></div></div>
            <div style="display:grid;grid-template-columns:minmax(320px,430px) 1fr;gap:16px;align-items:start" id="i-grid">
              <div class="cs-grid" style="max-height:76vh;overflow:auto;padding-right:4px">
                <div class="cs-card cs-grid">${CS.f('Asunto', 'meta.asunto', { t: 'area', r: 2 })}
                    <div class="cs-grid g2">${CS.f('Ciudad', 'meta.ciudad')}${CS.f('Oficina', 'meta.oficina')}</div>
                    <div class="cs-row">${CS.f('ROS', 'meta.decision.ros', { t: 'chk' })}${CS.f('Archivo', 'meta.decision.archivo', { t: 'chk' })}${CS.f('Gestión comercial', 'meta.decision.gestion_comercial', { t: 'chk' })}</div>
                </div>
                <div class="cs-card cs-grid">
                    ${area('Riesgos', 'informe.riesgos', 4, true)}${area('Criterios objetivos', 'informe.criterios', 4, true)}
                    ${area('Indicio', 'informe.indicio', 4, true)}${area('Decisión del comité', 'informe.comite')}
                </div>
                <div class="cs-card cs-grid">
                    ${area('Hechos cronológicos', 'informe.hechos', 7)}${area('Gestión comercial', 'informe.gestion')}
                    ${area('Validaciones y hallazgos', 'informe.validaciones', 4)}
                </div>
                <div class="cs-card cs-grid">
                    ${area('Características de sospecha', 'informe.caracteristicas_sospecha', 4, true)}
                    ${area('Señales de alerta', 'informe.senales_alerta', 4, true)}
                    ${area('Metodología', 'informe.metodologia', 4, true)}
                    ${area('Motivo del reporte', 'informe.motivo_reporte', 4, true)}
                    ${area('Relación con reportes anteriores', 'informe.reportes_anteriores')}
                    ${area('Conclusión de acumulados', 'informe.conclusion_acumulados')}
                </div>
                <div class="cs-card cs-grid">
                    <div class="cs-grid g2">${CS.f('Tipo de cliente', 'informe.tipo_cliente')}
                        ${CS.f('Calificación reporte', 'informe.calificacion_reporte', { t: 'sel', o: [['', 'Seleccionar'], ['Alta', 'Alta'], ['Media', 'Media'], ['Baja', 'Baja']] })}
                        ${CS.f('Urgencia', 'informe.urgencia', { t: 'sel', o: [['', 'Seleccionar'], ['Alta', 'Alta'], ['Media', 'Media'], ['Baja', 'Baja']] })}
                        ${CS.f('Perfil financiero', 'informe.perfil_financiero', { t: 'area', r: 2 })}
                        ${CS.f('Comparación con el sector', 'informe.comparacion_sector', { t: 'area', r: 2 })}</div>
                </div>
              </div>
              <div style="overflow:auto;max-height:76vh"><div id="informe-doc"></div></div>
            </div>`;

        const pintar = () => { el.querySelector('#informe-doc').innerHTML = documento(); };
        pintar();
        let t;
        CS.hooks.push(() => { clearTimeout(t); t = setTimeout(pintar, 350); });
        if (innerWidth < 1000) el.querySelector('#i-grid').style.gridTemplateColumns = '1fr';
        el.querySelector('#i-pdf').onclick = () => {
            CS.audit('exportar_informe_pdf');
            document.body.classList.add('imprimiendo');
            window.onafterprint = () => document.body.classList.remove('imprimiendo');
            window.print();
        };
        el.querySelector('#i-fx').onclick = () => {
            if (!d.crono.length) return alert('La cronología está vacía.');
            d.informe.hechos = [...d.crono].sort((a, b) => (a.fecha || '').localeCompare(b.fecha || ''))
                .map(c => `${c.fecha || 's/f'} — ${c.titulo}${c.desc ? '. ' + c.desc : ''}`).join('\n');
            CS.dirty('informe.hechos');
            CS.refrescar();
        };
        el.onclick = async e => {
            const b = e.target.closest('[data-ia]');
            if (!b) return;
            const campo = b.dataset.ia;
            const ta = el.querySelector(`textarea[data-p="${campo}"]`);
            if (!AI_FIELDS.has(campo)) return;
            const resumen = resumenSeguro();
            if (!resumen.sujetos.total && !resumen.transacciones.total && !resumen.cronologia.eventos) {
                return alert('Agrega primero sujetos, transacciones o cronología. La IA solo redacta con indicadores agregados del caso.');
            }
            if (ta.value.trim() && !confirm('Se reemplazará el texto actual por un borrador nuevo. ¿Continuar?')) return;
            b.disabled = true;
            b.textContent = 'Redactando…';
            try {
                const r = await SarlaftAuth.authFetch('/api/caso-ia', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ campo, caso: resumen })
                });
                const j = await r.json();
                if (!r.ok) throw new Error(j.error || 'Error al generar el borrador.');
                ta.value = j.texto;
                ta.dispatchEvent(new Event('input', { bubbles: true }));
                CS.audit('ia_borrador', { campo });
                CS.toast('Borrador anonimizado generado; revísalo antes de usarlo.');
            } catch (x) {
                alert('No se pudo redactar: ' + x.message);
            } finally {
                b.disabled = false;
                b.textContent = '✨ Redactar con IA';
            }
        };
    };
})();
