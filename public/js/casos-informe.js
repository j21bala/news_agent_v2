// Casos — edición de campos y generación del informe con la plantilla Word original.
(function () {
    const { esc, COP, T_NODO, T_VINC } = CS;
    const FORM_FIELDS = [
        'tipo_id', 'id_cliente', 'fecha_creacion', 'nombres_apellidos', 'edad', 'lugar_nacimiento',
        'fecha_nacimiento', 'genero', 'estado_civil', 'actividad_economica', 'nivel_riesgo_actividad',
        'ocupacion', 'segmento_sarlaft', 'perfil_riesgo_sarlaft', 'empresa_empleadora', 'profesion',
        'nivel_educativo', 'ingresos', 'direccion', 'ciudad', 'oficina_administra',
        'fecha_ultima_actualizacion', 'egresos', 'valor_activos', 'valor_pasivos',
        'operaciones_internacionales', 'importaciones', 'exportaciones', 'cambio_divisas',
        'origen_fondos', 'origen_activos'
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
        const resultado = Object.fromEntries(permitidas.map(k => [k, 0]));
        lista.forEach(item => {
            const clave = getClave(item);
            if (Object.prototype.hasOwnProperty.call(resultado, clave)) resultado[clave]++;
        });
        return resultado;
    }

    function resumenSeguro() {
        const d = CS.d(), k = CS.calc();
        const grados = ['alta', 'media', 'baja'];
        const tiposTransaccion = CS.TX_TIPOS;
        return {
            sujetos: {
                total: d.nodos.length,
                tipos: conteoPor(d.nodos, n => n.tipo, Object.keys(T_NODO)),
                riesgos: conteoPor(d.nodos, n => n.riesgo, ['alto', 'medio', 'bajo', 'na']),
                pep: d.nodos.filter(n => n.pep).length
            },
            vinculos: {
                total: d.vinculos.length,
                tipos: conteoPor(d.vinculos, v => v.tipo, Object.keys(T_VINC))
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
                categorias: conteoPor(k.al, a => categoriaAlerta(a.t), Object.keys(CATEGORIAS_ALERTA))
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
        k.al.forEach(alerta => {
            const key = `${alerta.g}:${categoriaAlerta(alerta.t)}`;
            categorias[key] = (categorias[key] || 0) + 1;
        });
        const alertas = Object.entries(categorias)
            .sort((a, b) => {
                const nivelA = a[0].split(':')[0], nivelB = b[0].split(':')[0];
                return (GRAVEDAD[nivelA] ?? 3) - (GRAVEDAD[nivelB] ?? 3) || b[1] - a[1];
            })
            .slice(0, 5)
            .map(([key, cantidad]) => {
                const [gravedad, categoria] = key.split(':');
                return `${gravedad}: ${CATEGORIAS_ALERTA[categoria]} (${cantidad})`;
            });

        const hallazgosUnicos = new Map();
        [...d.hallazgos].sort((a, b) => (GRAVEDAD[a.g] ?? 3) - (GRAVEDAD[b.g] ?? 3)).forEach(hallazgo => {
            const gravedad = hallazgo.g || 'Sin gravedad';
            const titulo = String(hallazgo.t || 'Hallazgo sin título').replace(/\s+/g, ' ').trim();
            const clave = `${gravedad}:${titulo.toLowerCase()}`;
            const actual = hallazgosUnicos.get(clave);
            if (actual) actual.cantidad++;
            else hallazgosUnicos.set(clave, { gravedad, titulo, cantidad: 1 });
        });
        const hallazgoLineas = [...hallazgosUnicos.values()].slice(0, 4).map(h =>
            `${h.gravedad}: ${h.titulo.slice(0, 140)}${h.titulo.length > 140 ? '…' : ''}${h.cantidad > 1 ? ` (${h.cantidad})` : ''}`);
        const totalHallazgos = hallazgosUnicos.size;
        if (totalHallazgos > 4) hallazgoLineas.push(`${totalHallazgos - 4} hallazgo(s) adicional(es) resumido(s).`);
        return {
            alertas: k.al.length ? `Alertas automáticas (${k.al.length}): ${alertas.join('; ')}.` : 'No hay alertas automáticas registradas.',
            hallazgos: hallazgoLineas.length ? hallazgoLineas.join('\n') : 'No hay hallazgos del analista registrados.'
        };
    }

    const porcentaje = (valor, total) => total ? `${(valor / total * 100).toFixed(1)}%` : '';

    function datosDocumento() {
        const d = CS.d(), m = d.meta, i = d.informe, k = CS.calc();
        const operacionesROS = d.tx.filter(t => t.reportar);
        const movimientos = d.tx.filter(t => Number.isFinite(+t.valor) && +t.valor > 0);
        const porNombre = nombre => d.nodos.find(n => n.nombre === nombre);
        const documento = nombre => porNombre(nombre)?.doc || '';
        const titular = operacionesROS[0]?.titular
            || d.nodos.find(n => (n.prods || []).length)?.nombre
            || d.nodos.find(n => n.tipo === 'persona')?.nombre
            || '';
        const nodoTitular = porNombre(titular) || {};
        const fichaNodo = d.nodos.find(n => n.nombre === titular && Object.values(n.ficha || {}).some(Boolean))
            || d.nodos.find(n => Object.values(n.ficha || {}).some(Boolean))
            || nodoTitular;
        const ficha = fichaNodo.ficha || {};
        const fechas = movimientos.map(t => t.fecha).filter(Boolean).sort();
        const periodo = fechas.length ? `${fechas[0]} - ${fechas[fechas.length - 1]}` : '';
        const operacionesProducto = operacionesROS.length ? operacionesROS : movimientos;
        const producto = [...new Set(operacionesProducto.map(t => t.producto).filter(Boolean))].join(', ');
        const numeroProducto = operacionesROS[0]?.numero || nodoTitular.prods?.[0]?.numero || '';
        const resumenAlertasCaso = resumenAlertas(d, k);

        const porMes = {};
        movimientos.forEach(t => {
            const mes = /^\d{4}-\d{2}/.test(t.fecha || '') ? t.fecha.slice(0, 7) : 'Sin fecha';
            const acumulado = porMes[mes] = porMes[mes] || { credito: 0, txCredito: 0, debito: 0, txDebito: 0 };
            if (t.nat === 'debito') {
                acumulado.debito += +t.valor;
                acumulado.txDebito++;
            } else {
                acumulado.credito += +t.valor;
                acumulado.txCredito++;
            }
        });
        const filasAcumulados = Object.entries(porMes).sort(([a], [b]) => a.localeCompare(b)).map(([fecha, o]) => ({
            fecha,
            credito: COP(o.credito),
            tx_credito: o.txCredito,
            pct_credito: porcentaje(o.credito, k.cred),
            debito: COP(o.debito),
            tx_debito: o.txDebito,
            pct_debito: porcentaje(o.debito, k.deb)
        }));
        const totalAcumuladoCredito = Object.values(porMes).reduce((sum, o) => sum + o.credito, 0);
        const totalAcumuladoDebito = Object.values(porMes).reduce((sum, o) => sum + o.debito, 0);
        const resumen = Object.entries(k.porTipo).map(([transaccion, o]) => ({
            transaccion,
            credito: COP(o.c),
            tx_credito: o.nc,
            pct_credito: porcentaje(o.c, k.cred),
            debito: COP(o.d),
            tx_debito: o.nd,
            pct_debito: porcentaje(o.d, k.deb)
        }));
        const caracteristicas = i.caracteristicas_sospecha
            ? i.caracteristicas_sospecha.split(/\r?\n/).map(x => x.trim()).filter(Boolean)
            : [...resumenAlertasCaso.alertas.split('\n'), ...resumenAlertasCaso.hallazgos.split('\n')].filter(Boolean);

        const data = {
            asunto: m.asunto || '',
            chk_ros: m.decision?.ros ? 'X' : '',
            chk_archivo: m.decision?.archivo ? 'X' : '',
            chk_gestion: m.decision?.gestion_comercial ? 'X' : '',
            ciudad: m.ciudad || '',
            producto,
            operaciones: operacionesROS.map(t => ({
                numero: t.numero || '',
                identificacion_titular: documento(t.titular),
                nombre_titular: t.titular || '',
                oficina: t.oficina || '',
                fecha: t.fecha || '',
                transaccion: `${t.tipo || ''}${t.nat === 'debito' ? ' (débito)' : t.tipo ? ' (crédito)' : ''}`,
                valor: COP(t.valor)
            })),
            total_reportar: COP(CS.sum(operacionesROS)),
            riesgos: i.riesgos || '',
            criterios_objetivos: i.criterios || '',
            indicio: i.indicio || '',
            decision_comite: i.comite || '',
            hechos_cronologicos: i.hechos || [...d.crono]
                .sort((a, b) => (a.fecha || '').localeCompare(b.fecha || ''))
                .map(c => `${c.fecha || 's/f'} — ${c.titulo}${c.desc ? '. ' + c.desc : ''}`).join('\n'),
            productos_titular: d.nodos.flatMap(n => (n.prods || []).map(p => ({
                cliente: n.nombre || '',
                id_cliente: n.doc || '',
                tipo_producto: p.tipo || '',
                no_producto: p.numero || '',
                fecha_apertura: p.apertura || '',
                estado: p.estado || '',
                nombre_oficina: p.oficina || '',
                ciudad: p.ciudad || '',
                saldo: COP(p.saldo)
            }))),
            fecha_diligenciamiento: ficha.fecha_ultima_actualizacion || ficha.fecha_creacion || '',
            gestion_comercial: i.gestion || '',
            validaciones: i.validaciones || '',
            nombre_titular: titular,
            numero_producto: numeroProducto,
            periodo,
            resumen,
            total_resumen_credito: COP(k.cred),
            total_resumen_tx_credito: resumen.reduce((sum, row) => sum + (+row.tx_credito || 0), 0),
            total_resumen_pct_credito: porcentaje(k.cred, k.cred),
            total_resumen_debito: COP(k.deb),
            total_resumen_tx_debito: resumen.reduce((sum, row) => sum + (+row.tx_debito || 0), 0),
            total_resumen_pct_debito: porcentaje(k.deb, k.deb),
            acumulados: filasAcumulados,
            total_acumulados_credito: COP(totalAcumuladoCredito),
            total_acumulados_tx_credito: filasAcumulados.reduce((sum, row) => sum + (+row.tx_credito || 0), 0),
            total_acumulados_pct_credito: porcentaje(totalAcumuladoCredito, k.cred),
            total_acumulados_debito: COP(totalAcumuladoDebito),
            total_acumulados_tx_debito: filasAcumulados.reduce((sum, row) => sum + (+row.tx_debito || 0), 0),
            total_acumulados_pct_debito: porcentaje(totalAcumuladoDebito, k.deb),
            conclusion_acumulados: i.conclusion_acumulados || '',
            tipo_cliente: i.tipo_cliente || '',
            perfil_financiero: i.perfil_financiero || '',
            comparacion_sector: i.comparacion_sector || '',
            calificacion_reporte: i.calificacion_reporte || '',
            urgencia: i.urgencia || '',
            caracteristicas_sospecha: caracteristicas,
            metodologia: i.metodologia || '',
            relacion_reportes_anteriores: i.reportes_anteriores || '',
            senales_alerta: i.senales_alerta || resumenAlertasCaso.alertas,
            motivo_reporte: i.motivo_reporte || '',
            informacion_soporte: d.evid.map(e => e.nombre).filter(Boolean)
        };

        FORM_FIELDS.forEach(key => { data[`ficha_${key}`] = ficha[key] == null ? '' : String(ficha[key]); });
        ['a', 'b', 'c', 'd', 'e', 'f', 'g'].forEach(letra => {
            data[`detalle_${letra}_titulo`] = '';
            data[`detalle_${letra}_narrativa`] = '';
            data[`detalle_${letra}_filas`] = [];
            data[`detalle_${letra}_total`] = '';
        });
        return data;
    }

    CS.tabs.informe = async el => {
        const d = CS.d();
        const area = (label, path, rows = 4, conIA = false) => `<div class="cs-f">
            <span class="cs-row between" style="text-transform:none"><span>${label}${conIA ? '' : ' · Manual'}</span>
            ${conIA ? `<button class="cs-btn sm" data-ia="${path}" title="Borrador con datos agregados y anonimizados">✨ Redactar con IA</button>` : ''}</span>
            <textarea class="cs-in" data-p="${path}" rows="${rows}">${esc(CS.get(path) || '')}</textarea></div>`;
        el.innerHTML = `<div class="cs-row between" style="margin-bottom:14px"><div><h2 style="font-size:20px;font-weight:700">Informe ROS</h2>
            <p class="cs-mu cs-sm">El archivo se rellena sobre la plantilla Word original, sin reconstruir el informe en HTML.</p></div>
            <div class="cs-row"><button class="cs-btn" id="i-fx" title="Copiar hechos desde Cronología">Hechos ← Cronología</button>
                <button class="cs-btn pri" id="i-docx"><i class="fa-solid fa-file-word"></i> Descargar informe Word (.docx)</button></div></div>
            <div style="display:grid;grid-template-columns:minmax(320px,1.4fr) minmax(260px,.8fr);gap:16px;align-items:start" id="i-grid">
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
              <aside class="cs-grid">
                <div class="cs-card cs-grid"><h3><i class="fa-solid fa-file-word"></i> Plantilla oficial</h3>
                    <p class="cs-mu">Al descargar, los datos se insertan en Plantilla_ROS_base.docx. El documento final conserva sus tablas, estructura y formato y puede seguir editándose en Word.</p>
                    <p class="cs-mu">El histórico se presenta en tablas agregadas por tipo y periodo. Solo las operaciones marcadas para ROS aparecen como filas individuales.</p>
                    <a class="cs-btn" href="./plantilla/Plantilla_ROS_base.docx" download>Descargar plantilla vacía</a>
                    <p class="cs-sm cs-mu">Para obtener PDF, abre el DOCX generado en Word y expórtalo desde allí.</p>
                </div>
              </aside>
            </div>`;

        if (innerWidth < 1000) el.querySelector('#i-grid').style.gridTemplateColumns = '1fr';
        el.querySelector('#i-fx').onclick = () => {
            if (!d.crono.length) return alert('La cronología está vacía.');
            d.informe.hechos = [...d.crono].sort((a, b) => (a.fecha || '').localeCompare(b.fecha || ''))
                .map(c => `${c.fecha || 's/f'} — ${c.titulo}${c.desc ? '. ' + c.desc : ''}`).join('\n');
            CS.dirty('informe.hechos');
            CS.refrescar();
        };
        el.querySelector('#i-docx').onclick = async e => {
            const button = e.currentTarget;
            button.disabled = true;
            button.textContent = 'Generando DOCX…';
            try {
                const response = await SarlaftAuth.authFetch('/api/caso-ros-docx', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ datos: datosDocumento() })
                });
                if (!response.ok) {
                    const error = await response.json().catch(() => ({}));
                    throw new Error(error.error || `No se pudo generar el documento (HTTP ${response.status}).`);
                }
                const blob = await response.blob();
                if (!blob.size) throw new Error('La plantilla devolvió un documento vacío.');
                const numero = String(d.meta.numero || 'ROS').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40);
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `${numero || 'ROS'}_informe.docx`;
                link.click();
                setTimeout(() => URL.revokeObjectURL(url), 5000);
                CS.audit('exportar_informe_docx');
                CS.toast('Informe Word generado desde la plantilla oficial.');
            } catch (error) {
                alert('No se pudo generar el informe Word: ' + error.message);
            } finally {
                button.disabled = false;
                button.innerHTML = '<i class="fa-solid fa-file-word"></i> Descargar informe Word (.docx)';
            }
        };
        el.onclick = async e => {
            const button = e.target.closest('[data-ia]');
            if (!button) return;
            const campo = button.dataset.ia;
            const textarea = el.querySelector(`textarea[data-p="${campo}"]`);
            if (!AI_FIELDS.has(campo)) return;
            const resumen = resumenSeguro();
            if (!resumen.sujetos.total && !resumen.transacciones.total && !resumen.cronologia.eventos) {
                return alert('Agrega primero sujetos, transacciones o cronología. La IA solo redacta con indicadores agregados del caso.');
            }
            if (textarea.value.trim() && !confirm('Se reemplazará el texto actual por un borrador nuevo. ¿Continuar?')) return;
            button.disabled = true;
            button.textContent = 'Redactando…';
            try {
                const response = await SarlaftAuth.authFetch('/api/caso-ia', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ campo, caso: resumen })
                });
                const result = await response.json();
                if (!response.ok) throw new Error(result.error || 'Error al generar el borrador.');
                textarea.value = result.texto;
                textarea.dispatchEvent(new Event('input', { bubbles: true }));
                CS.audit('ia_borrador', { campo });
                CS.toast('Borrador anonimizado generado; revísalo antes de usarlo.');
            } catch (error) {
                alert('No se pudo redactar: ' + error.message);
            } finally {
                button.disabled = false;
                button.textContent = '✨ Redactar con IA';
            }
        };
    };
})();
