// Casos — Informe tipo ROS (basado en la plantilla oficial): editor + vista previa + PDF + redacción asistida por IA.
(function () {
    const { esc, COP, T_NODO, RIESGO, T_VINC } = CS;
    const IA = {
        'informe.hechos': 'Redacta los HECHOS CRONOLÓGICOS del caso en orden de fecha, en prosa formal, usando solo la cronología, las transacciones marcadas para ROS y los sujetos.',
        'informe.riesgos': 'Redacta la sección RIESGOS: riesgos de LA/FT identificados a partir de alertas, perfil, vínculos y transacciones.',
        'informe.criterios': 'Redacta los CRITERIOS OBJETIVOS (señales de alerta verificables y cuantificadas) que sustentan el reporte.',
        'informe.indicio': 'Redacta el INDICIO: por qué la operación puede estar vinculada a lavado de activos o financiación del terrorismo, sin afirmar responsabilidad penal.',
        'informe.comite': 'Redacta la DECISIÓN DEL COMITÉ propuesta (ROS, archivo o gestión comercial) con su justificación basada en los datos disponibles.',
        'informe.gestion': 'Redacta la GESTIÓN COMERCIAL realizada o recomendada respecto del cliente, con base en los datos del caso.',
        'informe.validaciones': 'Redacta las VALIDACIONES realizadas (listas, noticias, soportes) a partir de evidencias y hallazgos registrados.',
        'informe.conclusion': 'Redacta una CONCLUSIÓN ejecutiva del caso en máximo 2 párrafos.'
    };
    const resumen = () => { const d = CS.d(), k = CS.calc(); return {
        meta: d.meta, sujetos: d.nodos.map(n => ({ nombre: n.nombre, tipo: n.tipo, rol: n.rol, doc: n.doc, riesgo: n.riesgo, pep: n.pep, desc: n.desc, alertas: n.flags, fuente: n.src })),
        vinculos: d.vinculos.map(e => ({ de: CS.nombreNodo(e.de), a: CS.nombreNodo(e.a), tipo: T_VINC[e.tipo]?.[0], detalle: e.etq, valor: e.valor, nota: e.nota })),
        totales: { creditos: k.cred, debitos: k.deb }, porTipo: k.porTipo, transacciones_ros: d.tx.filter(t => t.reportar).slice(0, 200), muestra_transacciones: d.tx.slice(0, 60),
        cronologia: d.crono, alertas_automaticas: k.al, hallazgos: d.hallazgos, informe_actual: d.informe }; };

    const tabla = (cols, filas) => `<table><thead><tr>${cols.map(c => `<th>${c}</th>`).join('')}</tr></thead><tbody>${filas.map(f => `<tr>${f.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
    const sec = (t, x) => x ? `<h2>${t}</h2><p>${esc(x)}</p>` : '';

    function documento(email) {
        const d = CS.d(), m = d.meta, i = d.informe, k = CS.calc(), rep = d.tx.filter(t => t.reportar), doc = n => d.nodos.find(x => x.nombre === n)?.doc || '';
        const hechos = i.hechos || [...d.crono].sort((a, b) => (a.fecha || '').localeCompare(b.fecha || '')).map(c => `${c.fecha || 's/f'} — ${c.titulo}${c.desc ? '. ' + c.desc : ''}`).join('\n');
        const prods = d.nodos.flatMap(n => (n.prods || []).map(p => [esc(n.nombre), esc(n.doc), esc(p.tipo), esc(p.numero), esc(p.apertura), esc(p.estado), esc(p.oficina), COP(p.saldo)]));
        const fichas = d.nodos.filter(n => n.tipo === 'persona' && Object.values(n.ficha || {}).some(Boolean)).map(n => `<h2 style="font-size:12px">Formulario de vinculación — ${esc(n.nombre)}</h2>` + tabla(['Campo', 'Valor'], CS.FICHA.filter(([k2]) => n.ficha[k2] !== '' && n.ficha[k2] != null).map(([k2, l]) => [l, esc(n.ficha[k2])]))).join('');
        const pc = (v, t) => t ? (v / t * 100).toFixed(1) + '%' : '—';
        return `<h1>Reporte de Operación Sospechosa <span style="font-weight:400;font-size:13px;color:#64748b">· borrador de trabajo</span></h1>
        <p style="color:#475569">Caso <b>${esc(m.numero)}</b> — ${esc(m.titulo)}<br>Fecha de apertura: ${esc(m.apertura)} · Ciudad: ${esc(m.ciudad || '—')} · Oficina: ${esc(m.oficina || '—')}</p>
        ${sec('Asunto', m.asunto)}<p><b>Decisión:</b> ${m.decision.ros ? '☑' : '☐'} Reportar ROS &nbsp; ${m.decision.archivo ? '☑' : '☐'} Archivo &nbsp; ${m.decision.gestion_comercial ? '☑' : '☐'} Gestión comercial</p>
        <h2>1. Descripción de montos</h2>${rep.length ? tabla(['N.º producto', 'Identificación', 'Titular', 'Oficina', 'Fecha', 'Transacción', 'Valor'], rep.map(t => [esc(t.numero), esc(doc(t.titular)), esc(t.titular), esc(t.oficina), esc(t.fecha), esc(t.tipo) + (t.nat === 'debito' ? ' (déb.)' : ''), COP(t.valor)]).concat([['<b>TOTAL A REPORTAR</b>', '', '', '', '', '', `<b>${COP(CS.sum(rep))}</b>`]])) : '<p style="color:#94a3b8">Sin operaciones marcadas para reporte.</p>'}
        ${sec('Riesgos', i.riesgos)}${sec('Criterios objetivos', i.criterios)}${sec('Indicio', i.indicio)}${sec('Decisión del comité', i.comite)}
        ${sec('2. Hechos cronológicos', hechos)}
        ${prods.length ? '<h2>3. Productos del titular</h2>' + tabla(['Cliente', 'ID', 'Producto', 'N.º', 'Apertura', 'Estado', 'Oficina', 'Saldo'], prods) : ''}
        ${fichas ? '<h2>4. Formulario de vinculación</h2>' + fichas : ''}
        ${sec('5. Gestión comercial', i.gestion)}${sec('6. Validaciones', i.validaciones)}
        ${k.ntx ? '<h2>7. Comportamiento transaccional</h2>' + tabla(['Transacción', 'Crédito', '#', '%', 'Débito', '#', '%'], Object.entries(k.porTipo).map(([t, o]) => [esc(t), COP(o.c), o.nc, pc(o.c, k.cred), COP(o.d), o.nd, pc(o.d, k.deb)]).concat([['<b>TOTAL</b>', `<b>${COP(k.cred)}</b>`, '', '', `<b>${COP(k.deb)}</b>`, '', '']])) : ''}
        ${d.nodos.length ? '<h2>8. Sujetos y vínculos involucrados</h2>' + tabla(['Sujeto', 'Tipo', 'Rol', 'Documento', 'Riesgo'], d.nodos.map(n => [esc(n.nombre) + (n.pep ? ' (PEP)' : ''), T_NODO[n.tipo]?.n, esc(n.rol), esc(n.doc), RIESGO[n.riesgo]?.[0]])) + (d.vinculos.length ? '<p style="margin-top:6px"><b>Vínculos:</b></p>' + tabla(['Origen', 'Relación', 'Destino', 'Detalle'], d.vinculos.map(e => [esc(CS.nombreNodo(e.de)), T_VINC[e.tipo]?.[0], esc(CS.nombreNodo(e.a)), esc([e.etq, e.valor, e.nota].filter(Boolean).join(' · '))])) : '') : ''}
        ${k.al.length || d.hallazgos.length ? '<h2>9. Alertas y hallazgos</h2><ul style="padding-left:18px">' + k.al.map(a => `<li><b>[${a.g}]</b> ${esc(a.t)} — ${esc(a.x)}</li>`).join('') + d.hallazgos.map(h => `<li><b>[${esc(h.g)}]</b> ${esc(h.t)} — ${esc(h.x)}</li>`).join('') + '</ul>' : ''}
        ${sec('Conclusión', i.conclusion)}
        <div class="wm">DOCUMENTO CONFIDENCIAL — Caso ${esc(m.numero)} · Generado por ${esc(email)} el ${new Date().toLocaleString('es-CO')}. Un vínculo o una noticia no implican responsabilidad ni condena. Las secciones asistidas por IA son borradores y deben ser verificadas por el analista.</div>`;
    }

    CS.tabs.informe = async el => {
        const d = CS.d(), us = await SarlaftAuth.usuario(), email = us?.email || '';
        const area = (l, p, r = 4) => `<div class="cs-f"><span class="cs-row between" style="text-transform:none">${l}<button class="cs-btn sm" data-ia="${p}" title="Borrador con IA usando solo los datos del caso">✨ Redactar con IA</button></span><textarea class="cs-in" data-p="${p}" rows="${r}">${esc(CS.get(p))}</textarea></div>`;
        el.innerHTML = `<div class="cs-row between" style="margin-bottom:14px"><div><h2 style="font-size:20px;font-weight:700">Informe ROS</h2><p class="cs-mu cs-sm">Estructura de la plantilla oficial. Los montos, productos, hechos y sujetos se alimentan solos de las demás pestañas.</p></div>
            <div class="cs-row"><button class="cs-btn" id="i-fx" title="Hechos cronológicos desde la pestaña Cronología">Hechos ← Cronología</button><button class="cs-btn pri" id="i-pdf"><i class="fa-solid fa-file-pdf"></i> Imprimir / PDF</button></div></div>
            <div style="display:grid;grid-template-columns:minmax(320px,430px) 1fr;gap:16px;align-items:start" id="i-grid"><div class="cs-grid" style="max-height:76vh;overflow:auto;padding-right:4px">
              <div class="cs-card cs-grid">${CS.f('Asunto', 'meta.asunto', { t: 'area', r: 2 })}<div class="cs-grid g2">${CS.f('Ciudad', 'meta.ciudad')}${CS.f('Oficina', 'meta.oficina')}</div>
              <div class="cs-row">${CS.f('Reportar ROS', 'meta.decision.ros', { t: 'chk' })}${CS.f('Archivo', 'meta.decision.archivo', { t: 'chk' })}${CS.f('Gestión comercial', 'meta.decision.gestion_comercial', { t: 'chk' })}</div></div>
              <div class="cs-card cs-grid">${area('Riesgos', 'informe.riesgos')}${area('Criterios objetivos', 'informe.criterios')}${area('Indicio', 'informe.indicio')}${area('Decisión del comité', 'informe.comite')}</div>
              <div class="cs-card cs-grid">${area('Hechos cronológicos', 'informe.hechos', 7)}${area('Gestión comercial', 'informe.gestion')}${area('Validaciones', 'informe.validaciones')}${area('Conclusión', 'informe.conclusion')}</div></div>
              <div style="overflow:auto;max-height:76vh"><div id="informe-doc"></div></div></div>`;
        const pintar = () => { el.querySelector('#informe-doc').innerHTML = documento(email); }; pintar();
        let t; CS.hooks.push(() => { clearTimeout(t); t = setTimeout(pintar, 350); });
        if (innerWidth < 1000) el.querySelector('#i-grid').style.gridTemplateColumns = '1fr';
        el.querySelector('#i-pdf').onclick = () => { CS.audit('exportar_informe_pdf'); document.body.classList.add('imprimiendo'); window.onafterprint = () => document.body.classList.remove('imprimiendo'); window.print(); };
        el.querySelector('#i-fx').onclick = () => { if (!d.crono.length) return alert('La cronología está vacía.'); const txt = [...d.crono].sort((a, b) => (a.fecha || '').localeCompare(b.fecha || '')).map(c => `${c.fecha || 's/f'} — ${c.titulo}${c.desc ? '. ' + c.desc : ''}`).join('\n'); d.informe.hechos = txt; CS.dirty('informe.hechos'); CS.refrescar(); };
        el.onclick = async e => { const b = e.target.closest('[data-ia]'); if (!b) return; const p = b.dataset.ia, ta = el.querySelector(`textarea[data-p="${p}"]`);
            if (!d.nodos.length && !d.tx.length && !d.crono.length) return alert('Agrega primero sujetos, transacciones o cronología: la IA solo redacta con los datos del caso.');
            if (ta.value.trim() && !confirm('Se reemplazará el texto actual por un borrador nuevo. ¿Continuar?')) return;
            b.disabled = true; b.textContent = 'Redactando…';
            try { const r = await SarlaftAuth.authFetch('/api/caso-ia', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ instruccion: IA[p], caso: resumen() }) }); const j = await r.json(); if (!r.ok) throw new Error(j.error || 'Error');
                ta.value = j.texto; ta.dispatchEvent(new Event('input', { bubbles: true })); CS.audit('ia_borrador', { campo: p }); CS.toast('Borrador generado — verifícalo antes de usarlo'); } catch (x) { alert('No se pudo redactar: ' + x.message); }
            b.disabled = false; b.textContent = '✨ Redactar con IA'; };
    };
})();
