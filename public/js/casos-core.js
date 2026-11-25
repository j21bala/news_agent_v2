// Casos de Investigación — núcleo: estado, guardado seguro, lista, espacio de trabajo y pestañas de datos.
(function () {
    const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const uid = () => Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
    const COP = n => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(+n || 0);
    const hoy = () => new Date().toISOString().slice(0, 10);
    const sum = a => a.reduce((s, t) => s + (+t.valor || 0), 0);

    const T_NODO = {
        persona: { n: 'Persona', i: '\uf007', c: '#38bdd0' }, empresa: { n: 'Empresa', i: '\uf1ad', c: '#a78bfa' },
        cuenta: { n: 'Producto / Cuenta', i: '\uf09d', c: '#34d399' }, inmueble: { n: 'Inmueble', i: '\uf015', c: '#fbbf24' },
        vehiculo: { n: 'Vehículo', i: '\uf1b9', c: '#fb923c' }, documento: { n: 'Documento', i: '\uf15b', c: '#94a3b8' },
        ubicacion: { n: 'Ubicación', i: '\uf3c5', c: '#f472b6' }, medio: { n: 'Noticia / Fuente', i: '\uf1ea', c: '#60a5fa' }
    };
    const T_VINC = {
        familiar: ['Familiar', '#22d3ee'], conyuge: ['Cónyuge / afinidad', '#c084fc'], socio: ['Socio / accionista', '#a78bfa'],
        rep: ['Representante legal', '#818cf8'], laboral: ['Laboral', '#60a5fa'], comercial: ['Comercial', '#fbbf24'],
        financiero: ['Transferencia / pago', '#34d399'], titular: ['Titular de producto', '#2dd4bf'], politico: ['Político', '#f472b6'],
        allegado: ['Allegado', '#fb923c'], otro: ['Otro', '#94a3b8']
    };
    const RIESGO = { alto: ['Alto', '#ef4444'], medio: ['Medio', '#f59e0b'], bajo: ['Bajo', '#22c55e'], na: ['Sin evaluar', '#64748b'] };
    const ESTADOS = [['abierto', 'Abierto'], ['analisis', 'En análisis'], ['comite', 'En comité'], ['ros', 'ROS reportado'], ['archivado', 'Archivado sin ROS'], ['cerrado', 'Cerrado']];
    const PRIOR = [['baja', 'Baja'], ['media', 'Media'], ['alta', 'Alta'], ['critica', 'Crítica']];
    const TX_TIPOS = ['Consignación en efectivo', 'Retiro en efectivo', 'Transferencia', 'Cheque', 'Pago PSE', 'Giro internacional', 'Inversión / fiducia', 'Otro'];
    const FICHA = [['tipo_id', 'Tipo ID'], ['id_cliente', 'N.º identificación'], ['nombres_apellidos', 'Nombres y apellidos'], ['fecha_nacimiento', 'Fecha nacimiento', 'date'], ['lugar_nacimiento', 'Lugar nacimiento'],
        ['genero', 'Género'], ['estado_civil', 'Estado civil'], ['actividad_economica', 'Actividad económica'], ['nivel_riesgo_actividad', 'Riesgo actividad'], ['ocupacion', 'Ocupación'], ['profesion', 'Profesión'],
        ['empresa_empleadora', 'Empresa empleadora'], ['segmento_sarlaft', 'Segmento SARLAFT'], ['perfil_riesgo_sarlaft', 'Perfil riesgo SARLAFT'], ['ingresos', 'Ingresos mensuales', 'number'], ['egresos', 'Egresos mensuales', 'number'],
        ['valor_activos', 'Activos', 'number'], ['valor_pasivos', 'Pasivos', 'number'], ['direccion', 'Dirección'], ['ciudad', 'Ciudad'], ['oficina_administra', 'Oficina que administra'],
        ['fecha_creacion', 'Fecha vinculación', 'date'], ['fecha_ultima_actualizacion', 'Última actualización', 'date'], ['operaciones_internacionales', 'Operaciones internacionales'], ['origen_fondos', 'Origen de fondos'], ['origen_activos', 'Origen de activos']];

    const nuevoData = () => ({
        meta: { asunto: '', ciudad: '', oficina: '', apertura: hoy(), umbral: 10000000, titulo: 'Caso sin título', numero: '', estado: 'abierto', prioridad: 'media', decision: { ros: false, archivo: false, gestion_comercial: false } },
        nodos: [], vinculos: [], tx: [], crono: [], hallazgos: [], evid: [],
        informe: { riesgos: '', criterios: '', indicio: '', comite: '', hechos: '', gestion: '', validaciones: '', conclusion: '' }, vista: null
    });

    let caso = null, main = null, timer = null, sucio = false, root = null, tabAct = 'resumen';
    const CS = window.CS = { esc, uid, COP, hoy, sum, T_NODO, T_VINC, RIESGO, ESTADOS, PRIOR, TX_TIPOS, FICHA, tabs: {}, hooks: [], sel: null };
    CS.d = () => caso.data; CS.caso = () => caso;
    const get = p => p.split('.').reduce((o, k) => o == null ? o : o[k], caso.data);
    const set = (p, v) => { const k = p.split('.'); let o = caso.data; k.slice(0, -1).forEach((x, i) => { if (o[x] == null) o[x] = isNaN(k[i + 1]) ? {} : []; o = o[x]; }); o[k[k.length - 1]] = v; };
    CS.get = get; CS.set = set;

    // ---------- UI helpers ----------
    CS.f = (l, p, o = {}) => {
        const v = get(p), t = o.t || 'text';
        if (t === 'chk') return `<label class="cs-chk"><input type="checkbox" data-p="${p}" ${v ? 'checked' : ''}> ${l}</label>`;
        let c;
        if (t === 'area') c = `<textarea class="cs-in" data-p="${p}" rows="${o.r || 3}" placeholder="${esc(o.ph || '')}">${esc(v)}</textarea>`;
        else if (t === 'sel') c = `<select class="cs-in" data-p="${p}">${o.o.map(x => { const [k, n] = Array.isArray(x) ? x : [x, x]; return `<option value="${esc(k)}" ${v == k ? 'selected' : ''}>${esc(n)}</option>`; }).join('')}</select>`;
        else c = `<input class="cs-in" type="${t}" data-p="${p}" value="${esc(v)}" placeholder="${esc(o.ph || '')}" ${o.l ? `list="${o.l}"` : ''}>`;
        return `<label class="cs-f ${o.c || ''}"><span>${l}</span>${c}</label>`;
    };
    CS.toast = m => { const e = document.createElement('div'); e.className = 'cs-toast'; e.textContent = m; document.body.appendChild(e); setTimeout(() => e.remove(), 2600); };
    CS.modal = (titulo, campos, ok = 'Guardar') => new Promise(res => {
        const o = document.createElement('div'); o.className = 'cs-modal';
        o.innerHTML = `<form class="cs-card"><h3>${titulo}</h3>${campos.map(c => `<label class="cs-f"><span>${c.l}</span>${c.o ? `<select class="cs-in" name="${c.k}">${c.o.map(x => `<option value="${x[0]}">${x[1]}</option>`).join('')}</select>` : `<input class="cs-in" name="${c.k}" value="${esc(c.v || '')}" placeholder="${esc(c.ph || '')}">`}</label>`).join('')}<div class="cs-row end"><button type="button" class="cs-btn" data-x>Cancelar</button><button class="cs-btn pri">${ok}</button></div></form>`;
        document.body.appendChild(o); const fm = o.querySelector('form'); fm.querySelector('input,select')?.focus();
        const cl = v => { o.remove(); res(v); }; o.querySelector('[data-x]').onclick = () => cl(null); o.onclick = e => { if (e.target === o) cl(null); };
        fm.onsubmit = e => { e.preventDefault(); cl(Object.fromEntries(new FormData(fm))); };
    });
    const riesgoBadge = r => `<span class="cs-badge" style="color:${(RIESGO[r] || RIESGO.na)[1]}">${(RIESGO[r] || RIESGO.na)[0]}</span>`;
    CS.riesgoBadge = riesgoBadge;

    // ---------- Persistencia ----------
    function indicador(t, c) { const e = document.getElementById('cs-save'); if (e) { e.textContent = t; e.className = 'cs-save ' + (c || ''); } }
    CS.dirty = p => { sucio = true; indicador('Editando…'); clearTimeout(timer); timer = setTimeout(guardar, 1200); CS.hooks.forEach(h => h(p || '')); };
    async function guardar() {
        if (!caso || !sucio) return true; clearTimeout(timer); sucio = false; indicador('Guardando…');
        const m = caso.data.meta;
        try {
            const db = await SarlaftAuth.db();
            const { data, error } = await db.from('casos').update({ data: caso.data, numero: m.numero, titulo: m.titulo, estado: m.estado, prioridad: m.prioridad, version: caso.version + 1 })
                .eq('id', caso.id).eq('version', caso.version).select('version');
            if (error) throw error;
            if (!data.length) { indicador('Conflicto de versión', 'err'); alert('Este caso fue modificado desde otra sesión. Recarga la página para no perder ni sobrescribir cambios.'); return false; }
            caso.version = data[0].version; indicador('Guardado ✓ ' + new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }), 'ok'); return true;
        } catch (e) { sucio = true; indicador('Error al guardar', 'err'); console.error(e); return false; }
    }
    CS.guardar = guardar;
    window.addEventListener('beforeunload', e => { if (sucio) { e.preventDefault(); e.returnValue = ''; } });
    CS.audit = async (accion, detalle = {}, id) => {
        try { const db = await SarlaftAuth.db(), u = await SarlaftAuth.usuario();
            await db.from('caso_auditoria').insert({ caso_id: id || caso.id, email: u?.email || null, accion, detalle }); } catch (e) { console.warn('audit', e.message); }
    };

    // ---------- Cálculos y alertas automáticas ----------
    const esEf = t => /efectivo/i.test(t.tipo || '');
    CS.calc = () => {
        const d = caso.data, tx = d.tx.filter(t => +t.valor), cr = tx.filter(t => t.nat !== 'debito'), de = tx.filter(t => t.nat === 'debito');
        const grado = {}; d.vinculos.forEach(v => { grado[v.de] = (grado[v.de] || 0) + 1; grado[v.a] = (grado[v.a] || 0) + 1; });
        const al = [], A = (g, t, x) => al.push({ g, t, x });
        d.nodos.forEach(n => {
            if (n.pep) A('media', `PEP vinculado: ${n.nombre}`, 'Aplicar debida diligencia reforzada.');
            if (n.riesgo === 'alto' && (grado[n.id] || 0) >= 3) A('alta', `Nodo de alto riesgo muy conectado: ${n.nombre}`, `${grado[n.id]} vínculos directos en el mapa.`);
            if (!grado[n.id] && d.nodos.length > 1) A('baja', `Sujeto sin vincular: ${n.nombre}`, 'Relacionarlo en el mapa o descartarlo.');
            const ing = +n.ficha?.ingresos;
            if (ing) { const c = sum(cr.filter(t => (t.titular || '').toLowerCase() === (n.nombre || '').toLowerCase()));
                if (c > ing * 12) A('alta', `Créditos superan 12× ingresos declarados: ${n.nombre}`, `${COP(c)} vs ${COP(ing)} mensuales.`); }
        });
        const ef = tx.filter(esEf), um = +d.meta.umbral || 0, porT = {};
        ef.forEach(t => (porT[t.titular || '—'] = porT[t.titular || '—'] || []).push(t));
        Object.entries(porT).forEach(([k, arr]) => {
            arr.sort((a, b) => (a.fecha || '').localeCompare(b.fecha || ''));
            for (let i = 0; i < arr.length; i++) { let w = [arr[i]];
                for (let j = i + 1; j < arr.length && (new Date(arr[j].fecha) - new Date(arr[i].fecha)) / 864e5 <= 3; j++) w.push(arr[j]);
                if (um && w.length >= 3 && w.every(t => +t.valor < um) && sum(w) >= um) { A('alta', `Posible fraccionamiento en efectivo: ${k}`, `${w.length} operaciones bajo el umbral suman ${COP(sum(w))} en ≤3 días (desde ${arr[i].fecha}).`); break; } }
        });
        const tot = sum(tx); if (tot && sum(ef) / tot > .6) A('media', 'Alta concentración en efectivo', `${Math.round(sum(ef) / tot * 100)}% del volumen total.`);
        const rep = {}; tx.forEach(t => { const k = t.valor + '|' + (t.titular || ''); rep[k] = (rep[k] || 0) + 1; });
        Object.entries(rep).forEach(([k, n]) => { if (n >= 3) A('media', 'Montos idénticos recurrentes', `${n} operaciones de ${COP(k.split('|')[0])}${k.split('|')[1] ? ' — ' + k.split('|')[1] : ''}.`); });
        d.nodos.filter(n => n.riesgo === 'alto').forEach(n => { const m = tx.filter(t => t.contra && t.contra.toLowerCase() === (n.nombre || '').toLowerCase()); if (m.length) A('alta', `Contraparte de alto riesgo: ${n.nombre}`, `${m.length} operación(es) por ${COP(sum(m))}.`); });
        const w = { alta: 18, media: 8, baja: 2 };
        const score = Math.min(100, al.reduce((s, a) => s + w[a.g], 0) + d.nodos.filter(n => n.riesgo === 'alto').length * 6 + d.nodos.filter(n => n.pep).length * 8);
        const porTipo = {}; tx.forEach(t => { const k = t.tipo || 'Otro'; const o = porTipo[k] = porTipo[k] || { c: 0, nc: 0, d: 0, nd: 0 }; if (t.nat === 'debito') { o.d += +t.valor; o.nd++; } else { o.c += +t.valor; o.nc++; } });
        return { cred: sum(cr), deb: sum(de), al, score, grado, porTipo, ntx: tx.length };
    };
    CS.nivel = s => s >= 70 ? ['Crítico', '#ef4444'] : s >= 40 ? ['Elevado', '#f59e0b'] : s >= 15 ? ['Moderado', '#38bdd0'] : ['Bajo', '#22c55e'];
    CS.addNodo = (tipo, nombre) => { const n = { id: uid(), tipo, nombre: nombre || 'Nuevo ' + T_NODO[tipo].n.toLowerCase(), rol: '', riesgo: 'na', pep: false, doc: '', desc: '', flags: '', src: '', evid: '', banco: false, fid: false, prods: [], ficha: {}, x: null, y: null };
        caso.data.nodos.push(n); CS.dirty('nodos'); return n; };
    CS.delNodo = id => { const d = caso.data; d.nodos = d.nodos.filter(n => n.id !== id); d.vinculos = d.vinculos.filter(v => v.de !== id && v.a !== id); CS.dirty('nodos'); };
    CS.irNodo = id => { CS.sel = { k: 'n', id }; CS.tab('mapa'); };
    CS.nombreNodo = id => caso.data.nodos.find(n => n.id === id)?.nombre || '—';

    // ---------- Lista de casos ----------
    async function lista() {
        caso = null; root = document.getElementById('view-casos');
        root.innerHTML = `<div class="cs-wrap"><div class="cs-row between" style="margin-bottom:22px">
            <div><h1 style="font-size:28px;font-weight:700"><i class="fa-solid fa-diagram-project" style="color:var(--gold)"></i> Casos de Investigación</h1>
            <p class="cs-mu">Espacio privado por analista · autoguardado · auditoría inmutable</p></div>
            <div class="cs-row"><input id="cs-q" class="cs-in" style="width:220px" placeholder="Buscar caso…"><button class="cs-btn pri" id="cs-nuevo"><i class="fa-solid fa-plus"></i> Nuevo caso</button>
            <button class="cs-btn" onclick="window.navegarA('view-menu')"><i class="fa-solid fa-arrow-left"></i> Menú</button></div></div>
            <div id="cs-lista" class="cs-grid g3"><p class="cs-mu">Cargando…</p></div></div>`;
        let filas = [];
        const pintar = () => {
            const q = (document.getElementById('cs-q').value || '').toLowerCase(), v = filas.filter(c => (c.titulo + c.numero).toLowerCase().includes(q));
            document.getElementById('cs-lista').innerHTML = v.length ? v.map(c => { const d = c.data || {}, e = ESTADOS.find(x => x[0] === c.estado)?.[1] || c.estado;
                const pc = { baja: '#22c55e', media: '#38bdd0', alta: '#f59e0b', critica: '#ef4444' }[c.prioridad] || '#38bdd0';
                return `<div class="cs-card cs-caso" data-id="${c.id}"><div class="cs-row between"><span class="cs-mu cs-sm">${esc(c.numero)}</span><span class="cs-badge" style="color:${pc}">${esc(c.prioridad)}</span></div>
                <h3 style="margin:8px 0 4px;font-size:17px">${esc(c.titulo)}</h3><p class="cs-mu cs-sm">${esc(e)} · ${new Date(c.updated_at).toLocaleDateString('es-CO')}</p>
                <div class="cs-row cs-sm cs-mu" style="margin-top:12px"><span><i class="fa-solid fa-user-group"></i> ${(d.nodos || []).length}</span><span><i class="fa-solid fa-link"></i> ${(d.vinculos || []).length}</span><span><i class="fa-solid fa-money-bill-wave"></i> ${(d.tx || []).length}</span><span><i class="fa-solid fa-paperclip"></i> ${(d.evid || []).length}</span></div></div>`; }).join('')
                : '<div class="cs-card cs-mu" style="grid-column:1/-1;text-align:center;padding:50px">Aún no tienes casos. Crea el primero con “Nuevo caso”.</div>';
        };
        try { const db = await SarlaftAuth.db(); const { data, error } = await db.from('casos').select('id,numero,titulo,estado,prioridad,updated_at,data').eq('archivado', false).order('updated_at', { ascending: false }).limit(200);
            if (error) throw error; filas = data; } catch (e) { document.getElementById('cs-lista').innerHTML = `<div class="cs-card" style="color:#b91c1c">No se pudo cargar: ${esc(e.message)}<br><small>¿Ejecutaste supabase/casos_y_historial.sql?</small></div>`; return; }
        pintar();
        document.getElementById('cs-q').oninput = pintar;
        document.getElementById('cs-lista').onclick = e => { const c = e.target.closest('.cs-caso'); if (c) abrir(c.dataset.id); };
        document.getElementById('cs-nuevo').onclick = async () => {
            const v = await CS.modal('Nuevo caso de investigación', [{ k: 'titulo', l: 'Título del caso', ph: 'Ej. Posible lavado — Empresa X' }, { k: 'prioridad', l: 'Prioridad', o: PRIOR.map(p => [p[0], p[1]]) }], 'Crear caso');
            if (!v) return; const db = await SarlaftAuth.db(); const { count } = await db.from('casos').select('id', { count: 'exact', head: true });
            const d = nuevoData(); d.meta.titulo = (v.titulo || '').trim() || 'Caso sin título'; d.meta.prioridad = v.prioridad; d.meta.numero = `SAR-${new Date().getFullYear()}-${String((count || 0) + 1).padStart(4, '0')}`;
            const { data, error } = await db.from('casos').insert({ numero: d.meta.numero, titulo: d.meta.titulo, prioridad: v.prioridad, data: d }).select('id').single();
            if (error) return alert('No se pudo crear: ' + error.message); await CS.audit('caso_creado', { numero: d.meta.numero }, data.id); abrir(data.id);
        };
    }
    async function abrir(id) {
        const db = await SarlaftAuth.db(); const { data, error } = await db.from('casos').select('*').eq('id', id).single();
        if (error) return alert('No se pudo abrir el caso: ' + error.message);
        const base = nuevoData(); data.data = Object.assign(base, data.data); data.data.meta = Object.assign(base.meta, data.data.meta); data.data.informe = Object.assign(nuevoData().informe, data.data.informe);
        caso = data; CS.sel = null; await CS.audit('caso_abierto'); espacio();
    }
    CS.abrir = abrir; CS.lista = lista;

    // ---------- Espacio de trabajo ----------
    const TABS = [['resumen', 'fa-gauge-high', 'Resumen'], ['mapa', 'fa-diagram-project', 'Mapa'], ['sujetos', 'fa-users', 'Sujetos'], ['tx', 'fa-money-bill-wave', 'Transacciones'], ['crono', 'fa-timeline', 'Cronología'], ['informe', 'fa-file-contract', 'Informe ROS'], ['evid', 'fa-paperclip', 'Evidencias'], ['audit', 'fa-clipboard-check', 'Auditoría']];
    function espacio() {
        const m = caso.data.meta;
        root.innerHTML = `<div class="cs-top"><button class="cs-btn" id="cs-back"><i class="fa-solid fa-arrow-left"></i> Casos</button>
            <span class="cs-badge" style="color:var(--gold)">${esc(m.numero)}</span>
            <input class="t" data-p="meta.titulo" value="${esc(m.titulo)}" aria-label="Título">
            <select class="cs-in" style="width:auto" data-p="meta.estado">${ESTADOS.map(e => `<option value="${e[0]}" ${m.estado === e[0] ? 'selected' : ''}>${e[1]}</option>`).join('')}</select>
            <select class="cs-in" style="width:auto" data-p="meta.prioridad">${PRIOR.map(e => `<option value="${e[0]}" ${m.prioridad === e[0] ? 'selected' : ''}>Prioridad ${e[1]}</option>`).join('')}</select>
            <span id="cs-save" class="cs-save">Guardado</span>
            <button class="cs-btn" id="cs-bk" title="Descargar copia JSON"><i class="fa-solid fa-download"></i></button>
            <button class="cs-btn red" id="cs-arch" title="Archivar caso"><i class="fa-solid fa-box-archive"></i></button></div>
            <div class="cs-shell"><nav class="cs-rail">${TABS.map(t => `<button data-t="${t[0]}"><i class="fa-solid ${t[1]}"></i>${t[2]}</button>`).join('')}</nav><section class="cs-main" id="cs-main"></section></div>`;
        main = document.getElementById('cs-main');
        document.getElementById('cs-back').onclick = async () => { await guardar(); CS.hooks.length = 0; lista(); };
        document.getElementById('cs-bk').onclick = () => { CS.audit('exportar_json'); dl(new Blob([JSON.stringify(caso.data, null, 2)], { type: 'application/json' }), `${m.numero}.json`); };
        document.getElementById('cs-arch').onclick = async () => { if (!confirm('¿Archivar este caso? Dejará de aparecer en tu lista (queda en la base para auditoría).')) return;
            await guardar(); const db = await SarlaftAuth.db(); await db.from('casos').update({ archivado: true }).eq('id', caso.id); await CS.audit('caso_archivado'); lista(); };
        root.querySelector('.cs-rail').onclick = e => { const b = e.target.closest('button'); if (b) CS.tab(b.dataset.t); };
        root.oninput = e => { const p = e.target.dataset?.p; if (!p) return; let v = e.target.type === 'checkbox' ? e.target.checked : e.target.value; if (e.target.type === 'number') v = v === '' ? '' : +v; if (p === 'meta.estado') CS.audit('cambio_estado', { a: v }); set(p, v); CS.dirty(p); };
        CS.tab(tabAct);
    }
    CS.tab = n => { tabAct = n; CS.hooks.length = 0; root.querySelectorAll('.cs-rail button').forEach(b => b.classList.toggle('act', b.dataset.t === n)); main.innerHTML = ''; CS.tabs[n](main); };
    CS.refrescar = () => CS.tab(tabAct);
    function dl(blob, nombre) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nombre; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); }
    CS.dl = dl;
    window.abrirCasos = () => { window.navegarA('view-casos'); lista(); };

    // ---------- Pestaña: Resumen ----------
    const barra = (p, c) => `<div class="cs-bar"><i style="width:${Math.max(2, p)}%;background:${c}"></i></div>`;
    CS.tabs.resumen = el => {
        const d = caso.data, k = CS.calc(), [nv, nc] = CS.nivel(k.score), cl = { alta: '#ef4444', media: '#f59e0b', baja: '#64748b' };
        const top = d.nodos.map(n => [n, k.grado[n.id] || 0]).sort((a, b) => b[1] - a[1]).slice(0, 5).filter(x => x[1]);
        const rs = ['alto', 'medio', 'bajo', 'na'].map(r => [r, d.nodos.filter(n => n.riesgo === r).length]);
        const mx = Math.max(1, ...Object.values(k.porTipo).map(o => o.c + o.d));
        const cmp = [['Asunto', d.meta.asunto], ['Sujetos', d.nodos.length], ['Transacciones', d.tx.length], ['Hechos cronológicos', d.informe.hechos || d.crono.length], ['Riesgos', d.informe.riesgos], ['Criterios objetivos', d.informe.criterios], ['Indicio', d.informe.indicio], ['Decisión del comité', d.informe.comite], ['Evidencias', d.evid.length]];
        el.innerHTML = `<div class="cs-grid g6" style="margin-bottom:16px">
            <div class="cs-card cs-kpi"><small>Sujetos</small><b>${d.nodos.length}</b></div><div class="cs-card cs-kpi"><small>Vínculos</small><b>${d.vinculos.length}</b></div>
            <div class="cs-card cs-kpi"><small>Créditos</small><b style="font-size:17px;color:#34d399">${COP(k.cred)}</b></div><div class="cs-card cs-kpi"><small>Débitos</small><b style="font-size:17px;color:#fb923c">${COP(k.deb)}</b></div>
            <div class="cs-card cs-kpi"><small>Alertas</small><b style="color:${k.al.length ? '#f59e0b' : '#22c55e'}">${k.al.length}</b></div>
            <div class="cs-card cs-kpi" style="text-align:center"><small>Criticidad</small><div class="cs-gauge" style="background:conic-gradient(${nc} ${k.score}%,#1e293b 0);width:64px;height:64px;margin-top:4px"><div style="width:48px;height:48px;font-size:16px;color:${nc}">${k.score}</div></div><small style="color:${nc}">${nv}</small></div></div>
            <div class="cs-grid g2" style="grid-template-columns:1.4fr 1fr;align-items:start"><div class="cs-grid">
              <div class="cs-card"><h3><i class="fa-solid fa-bell"></i> Alertas automáticas</h3>${k.al.length ? k.al.sort((a, b) => 'altamediabaja'.indexOf(a.g) - 'altamediabaja'.indexOf(b.g)).map(a => `<div class="cs-alert" style="--c:${cl[a.g]}"><div><b>${esc(a.t)}</b><span>${esc(a.x)}</span></div></div>`).join('') : '<p class="cs-mu">Sin alertas. Agrega sujetos, vínculos y transacciones para activar las reglas (fraccionamiento, PEP, concentración en efectivo, perfil vs. ingresos…).</p>'}</div>
              <div class="cs-card"><h3><i class="fa-solid fa-flag"></i> Hallazgos del analista <button class="cs-btn sm" id="h-add" style="margin-left:auto">+ Hallazgo</button></h3>
                ${d.hallazgos.map((h, i) => `<div class="cs-grid" style="grid-template-columns:1fr 110px 34px;margin-bottom:8px">${CS.f('Título', `hallazgos.${i}.t`)}${CS.f('Gravedad', `hallazgos.${i}.g`, { t: 'sel', o: [['alta', 'Alta'], ['media', 'Media'], ['baja', 'Baja']] })}<button class="cs-btn sm red" data-hd="${i}" style="align-self:end">✕</button>${CS.f('Detalle', `hallazgos.${i}.x`, { t: 'area', r: 2, c: '' })}</div>`).join('') || '<p class="cs-mu">Registra aquí conclusiones relevantes.</p>'}</div></div>
            <div class="cs-grid">
              <div class="cs-card"><h3><i class="fa-solid fa-circle-nodes"></i> Más conectados</h3>${top.map(([n, g]) => `<div style="margin-bottom:9px;cursor:pointer" data-n="${n.id}"><div class="cs-row between cs-sm"><span>${esc(n.nombre)}</span><b>${g}</b></div>${barra(g / top[0][1] * 100, (T_NODO[n.tipo] || T_NODO.persona).c)}</div>`).join('') || '<p class="cs-mu">Aún sin vínculos.</p>'}</div>
              <div class="cs-card"><h3><i class="fa-solid fa-triangle-exclamation"></i> Riesgo de sujetos</h3>${rs.map(([r, n]) => `<div style="margin-bottom:8px"><div class="cs-row between cs-sm"><span>${RIESGO[r][0]}</span><b>${n}</b></div>${barra(d.nodos.length ? n / d.nodos.length * 100 : 0, RIESGO[r][1])}</div>`).join('')}</div>
              <div class="cs-card"><h3><i class="fa-solid fa-chart-simple"></i> Volumen por tipo</h3>${Object.entries(k.porTipo).map(([t, o]) => `<div style="margin-bottom:8px"><div class="cs-row between cs-sm"><span>${esc(t)}</span><b>${COP(o.c + o.d)}</b></div>${barra((o.c + o.d) / mx * 100, '#38bdd0')}</div>`).join('') || '<p class="cs-mu">Sin transacciones.</p>'}</div>
              <div class="cs-card"><h3><i class="fa-solid fa-list-check"></i> Completitud del informe</h3>${cmp.map(([n, v]) => `<div class="cs-row cs-sm" style="margin-bottom:5px"><i class="fa-solid ${v ? 'fa-circle-check' : 'fa-circle'}" style="color:${v ? '#22c55e' : '#334155'}"></i>${n}</div>`).join('')}</div></div></div>`;
        el.querySelector('#h-add').onclick = () => { d.hallazgos.push({ id: uid(), t: '', g: 'media', x: '' }); CS.dirty(); CS.refrescar(); };
        el.onclick = e => { const b = e.target.closest('[data-hd]'); if (b) { d.hallazgos.splice(+b.dataset.hd, 1); CS.dirty(); CS.refrescar(); } const n = e.target.closest('[data-n]'); if (n) CS.irNodo(n.dataset.n); };
    };

    // ---------- Pestaña: Sujetos ----------
    CS.tabs.sujetos = el => {
        const d = caso.data, k = CS.calc(); let q = '', ft = '', fr = '';
        el.innerHTML = `<div class="cs-row" style="margin-bottom:14px"><input id="s-q" class="cs-in" style="width:240px" placeholder="Buscar nombre, documento…">
            <select id="s-t" class="cs-in" style="width:auto"><option value="">Todos los tipos</option>${Object.entries(T_NODO).map(([k2, v]) => `<option value="${k2}">${v.n}</option>`).join('')}</select>
            <select id="s-r" class="cs-in" style="width:auto"><option value="">Todo riesgo</option>${Object.entries(RIESGO).map(([k2, v]) => `<option value="${k2}">${v[0]}</option>`).join('')}</select>
            <span style="flex:1"></span><button class="cs-btn pri" data-add="persona">+ Persona</button><button class="cs-btn pri" data-add="empresa">+ Empresa</button><button class="cs-btn" id="s-xl"><i class="fa-solid fa-file-excel"></i> Excel</button></div>
            <div class="cs-scroll"><table class="cs-tbl"><thead><tr><th>Sujeto</th><th>Tipo</th><th>Rol</th><th>Documento</th><th>Riesgo</th><th>Banco</th><th>Fid.</th><th>Vínc.</th></tr></thead><tbody id="s-b"></tbody></table></div>`;
        const pintar = () => { const v = d.nodos.filter(n => (!ft || n.tipo === ft) && (!fr || n.riesgo === fr) && (n.nombre + n.doc + n.rol).toLowerCase().includes(q));
            el.querySelector('#s-b').innerHTML = v.map(n => `<tr class="clk" data-n="${n.id}"><td style="padding:9px 6px"><b>${esc(n.nombre)}</b>${n.pep ? ' <span class="cs-badge" style="color:var(--gold)">PEP</span>' : ''}</td><td>${(T_NODO[n.tipo] || {}).n}</td><td>${esc(n.rol)}</td><td>${esc(n.doc)}</td><td>${riesgoBadge(n.riesgo)}</td><td>${n.banco ? '✔' : ''}</td><td>${n.fid ? '✔' : ''}</td><td>${k.grado[n.id] || 0}</td></tr>`).join('') || '<tr><td colspan="8" class="cs-mu" style="padding:30px;text-align:center">Sin sujetos.</td></tr>'; };
        pintar();
        el.querySelector('#s-q').oninput = e => { q = e.target.value.toLowerCase(); pintar(); }; el.querySelector('#s-t').onchange = e => { ft = e.target.value; pintar(); }; el.querySelector('#s-r').onchange = e => { fr = e.target.value; pintar(); };
        el.onclick = e => { const a = e.target.closest('[data-add]'); if (a) { const n = CS.addNodo(a.dataset.add); return CS.irNodo(n.id); } const r = e.target.closest('tr[data-n]'); if (r) CS.irNodo(r.dataset.n); };
        el.querySelector('#s-xl').onclick = () => { const ws = XLSX.utils.json_to_sheet(d.nodos.map(n => ({ Nombre: n.nombre, Tipo: T_NODO[n.tipo]?.n, Rol: n.rol, Documento: n.doc, Riesgo: RIESGO[n.riesgo]?.[0], PEP: n.pep ? 'Sí' : '', Banco: n.banco ? 'Sí' : '', Fiduciaria: n.fid ? 'Sí' : '', Descripción: n.desc, Alertas: n.flags, Fuente: n.src }))); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Sujetos'); XLSX.writeFile(wb, `${caso.data.meta.numero}_sujetos.xlsx`); CS.audit('exportar_sujetos'); };
    };

    // ---------- Pestaña: Transacciones ----------
    const norm = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const fechaISO = v => { if (typeof v === 'number') return new Date(Math.round((v - 25569) * 864e5)).toISOString().slice(0, 10); const m = String(v).match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/); if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`; const x = new Date(v); return isNaN(x) ? '' : x.toISOString().slice(0, 10); };
    const num = v => +String(v ?? '').replace(/[^\d.,-]/g, '').replace(/\.(?=\d{3}\b)/g, '').replace(',', '.') || 0;
    function mapFila(r) {
        const o = {}; Object.entries(r).forEach(([k, v]) => o[norm(k)] = v);
        const f = (...ks) => { for (const k of ks) { const h = Object.keys(o).find(x => x.includes(k)); if (h !== undefined && o[h] !== '') return o[h]; } return ''; };
        const hojaTrabajo = o.txfecha !== undefined && o.txnaturaleza !== undefined && o.txtotal !== undefined;
        const c = num(f('credito')), db = num(f('debito')), val = f('valor', 'monto', 'importe', 'total');
        const naturaleza = norm(f('naturaleza', 'tipo mov', 'signo', 'transaccion'));
        const nat = db && !c ? 'debito' : c && !db ? 'credito' : (naturaleza === 'd' || /deb|retiro|egreso|salida/.test(naturaleza)) ? 'debito' : 'credito';
        const nota = hojaTrabajo
            ? [['Macro código', 'macrocodigo'], ['Código oficina', 'ofcodigo'], ['Comprobante', 'txcomprobante'], ['Cupo', 'txcupo'], ['Efectivo', 'txefectivo']]
                .map(([label, key]) => o[key] !== '' && o[key] != null ? `${label}: ${o[key]}` : '')
                .filter(Boolean).join(' · ')
            : '';
        return {
            id: uid(), fecha: fechaISO(f('fecha')),
            titular: String(hojaTrabajo ? f('clidcliente') : f('titular', 'cliente', 'nombre')),
            producto: String(f('producto')), numero: String(f('cccuentanum', 'numero', 'cuenta')),
            oficina: String(f('oficina')), tipo: String(f('ctxnombre', 'transaccion', 'tipo') || 'Otro'),
            nat, valor: c || db || Math.abs(num(val)),
            contra: String(f('contraparte', 'beneficiario', 'origen')), reportar: false, nota
        };
    }
    CS.tabs.tx = el => {
        const d = caso.data, nombres = d.nodos.map(n => `<option value="${esc(n.nombre)}">`).join('');
        el.innerHTML = `<datalist id="dl-n">${nombres}</datalist><datalist id="dl-t">${TX_TIPOS.map(t => `<option value="${t}">`).join('')}</datalist>
            <div class="cs-row" style="margin-bottom:12px"><button class="cs-btn pri" id="t-add">+ Transacción</button>
            <label class="cs-btn"><i class="fa-solid fa-file-import"></i> Importar Excel/CSV<input id="t-imp" type="file" accept=".xlsx,.xls,.csv" hidden></label>
            <button class="cs-btn" id="t-ord">Ordenar por fecha</button><button class="cs-btn" id="t-xl"><i class="fa-solid fa-file-excel"></i> Exportar</button><span style="flex:1"></span>
            <div style="width:190px">${CS.f('Umbral efectivo (COP)', 'meta.umbral', { t: 'number' })}</div></div>
            <div class="cs-scroll"><table class="cs-tbl" style="min-width:1100px"><thead><tr><th>Fecha</th><th>Titular</th><th>Producto</th><th>N.º</th><th>Oficina</th><th>Transacción</th><th>Nat.</th><th>Valor</th><th>Contraparte</th><th title="Incluir en el ROS">ROS</th><th>Nota</th><th></th></tr></thead><tbody id="t-b"></tbody></table></div>
            <div id="t-res" class="cs-grid g2" style="margin-top:16px;align-items:start"></div>`;
        const filas = () => { el.querySelector('#t-b').innerHTML = d.tx.map((t, i) => `<tr><td><input class="cs-in" type="date" data-p="tx.${i}.fecha" value="${esc(t.fecha)}"></td><td><input class="cs-in" list="dl-n" data-p="tx.${i}.titular" value="${esc(t.titular)}"></td><td><input class="cs-in" data-p="tx.${i}.producto" value="${esc(t.producto)}"></td><td><input class="cs-in" data-p="tx.${i}.numero" value="${esc(t.numero)}"></td><td><input class="cs-in" data-p="tx.${i}.oficina" value="${esc(t.oficina)}"></td><td><input class="cs-in" list="dl-t" data-p="tx.${i}.tipo" value="${esc(t.tipo)}"></td><td><select class="cs-in" data-p="tx.${i}.nat"><option value="credito" ${t.nat !== 'debito' ? 'selected' : ''}>Créd.</option><option value="debito" ${t.nat === 'debito' ? 'selected' : ''}>Déb.</option></select></td><td><input class="cs-in" type="number" data-p="tx.${i}.valor" value="${t.valor}" style="width:130px"></td><td><input class="cs-in" list="dl-n" data-p="tx.${i}.contra" value="${esc(t.contra)}"></td><td><input type="checkbox" data-p="tx.${i}.reportar" ${t.reportar ? 'checked' : ''}></td><td><input class="cs-in" data-p="tx.${i}.nota" value="${esc(t.nota)}"></td><td><button class="cs-btn sm red" data-del="${i}">✕</button></td></tr>`).join(''); };
        const res = () => { const k = CS.calc(), meses = {}; d.tx.forEach(t => { const m = (t.fecha || 's/f').slice(0, 7); const o = meses[m] = meses[m] || { c: 0, d: 0 }; t.nat === 'debito' ? o.d += +t.valor || 0 : o.c += +t.valor || 0; });
            const mx = Math.max(1, ...Object.values(meses).map(o => Math.max(o.c, o.d))), pc = (v, t) => t ? (v / t * 100).toFixed(1) + '%' : '—';
            el.querySelector('#t-res').innerHTML = `<div class="cs-card"><h3><i class="fa-solid fa-table"></i> Comportamiento transaccional</h3><div class="cs-scroll" style="max-height:none"><table class="cs-tbl"><thead><tr><th>Transacción</th><th>Crédito</th><th>#</th><th>%</th><th>Débito</th><th>#</th><th>%</th></tr></thead><tbody>${Object.entries(k.porTipo).map(([t, o]) => `<tr><td style="padding:6px">${esc(t)}</td><td>${COP(o.c)}</td><td>${o.nc}</td><td>${pc(o.c, k.cred)}</td><td>${COP(o.d)}</td><td>${o.nd}</td><td>${pc(o.d, k.deb)}</td></tr>`).join('')}<tr style="font-weight:700"><td style="padding:6px">TOTAL</td><td>${COP(k.cred)}</td><td></td><td></td><td>${COP(k.deb)}</td><td></td><td></td></tr></tbody></table></div></div>
              <div class="cs-card"><h3><i class="fa-solid fa-chart-column"></i> Flujo mensual</h3><div style="display:flex;gap:10px;align-items:flex-end;height:170px;overflow-x:auto">${Object.entries(meses).sort().map(([m, o]) => `<div style="text-align:center;font-size:10px;color:var(--mu);min-width:44px"><div style="display:flex;gap:3px;align-items:flex-end;height:140px;justify-content:center"><i title="Créditos ${COP(o.c)}" style="width:15px;height:${Math.max(2, o.c / mx * 100)}%;background:#34d399;border-radius:4px 4px 0 0"></i><i title="Débitos ${COP(o.d)}" style="width:15px;height:${Math.max(2, o.d / mx * 100)}%;background:#fb923c;border-radius:4px 4px 0 0"></i></div>${m}</div>`).join('') || '<span class="cs-mu">Sin datos.</span>'}</div><p class="cs-sm cs-mu" style="margin-top:8px"><span style="color:#34d399">■</span> Créditos <span style="color:#fb923c">■</span> Débitos · Marca “ROS” en las operaciones a reportar: total ${COP(sum(d.tx.filter(t => t.reportar)))}</p></div>`; };
        filas(); res(); CS.hooks.push(p => { if (p.startsWith('tx') || p === 'meta.umbral') res(); });
        el.querySelector('#t-add').onclick = () => { d.tx.push({ id: uid(), fecha: hoy(), titular: '', producto: '', numero: '', oficina: '', tipo: 'Transferencia', nat: 'credito', valor: 0, contra: '', reportar: false, nota: '' }); CS.dirty('tx'); filas(); res(); };
        el.querySelector('#t-ord').onclick = () => { d.tx.sort((a, b) => (a.fecha || '').localeCompare(b.fecha || '')); CS.dirty('tx'); filas(); };
        el.querySelector('#t-b').onclick = e => { const b = e.target.closest('[data-del]'); if (b) { d.tx.splice(+b.dataset.del, 1); CS.dirty('tx'); filas(); res(); } };
        el.querySelector('#t-xl').onclick = () => { const ws = XLSX.utils.json_to_sheet(d.tx.map(t => ({ Fecha: t.fecha, Titular: t.titular, Producto: t.producto, Número: t.numero, Oficina: t.oficina, Transacción: t.tipo, Naturaleza: t.nat === 'debito' ? 'Débito' : 'Crédito', Valor: t.valor, Contraparte: t.contra, ROS: t.reportar ? 'Sí' : '', Nota: t.nota }))); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Transacciones'); XLSX.writeFile(wb, `${caso.data.meta.numero}_transacciones.xlsx`); CS.audit('exportar_tx'); };
        el.querySelector('#t-imp').onchange = async e => { const f = e.target.files[0]; if (!f) return; try {
            const wb = XLSX.read(await f.arrayBuffer(), { type: 'array', cellDates: false });
            const hoja = wb.SheetNames.find(n => norm(n) === 'exportar hoja de trabajo') || wb.SheetNames[0];
            const rows = XLSX.utils.sheet_to_json(wb.Sheets[hoja], { defval: '' }).map(mapFila).filter(t => t.valor);
            if (!rows.length) {
                alert('No se reconocieron filas con valor. Revisa los encabezados (fecha, valor/monto o TXTOTAL, titular…).');
                e.target.value = '';
                return;
            }
            d.tx.push(...rows); CS.dirty('tx'); CS.audit('importar_tx', { filas: rows.length, archivo: f.name, hoja }); filas(); res();
            CS.toast(`${rows.length} transacciones importadas desde "${hoja}"`);
        } catch (x) { alert('No se pudo leer el archivo: ' + x.message); } e.target.value = ''; };
    };

    // ---------- Pestaña: Cronología ----------
    CS.tabs.crono = el => {
        const d = caso.data, ops = [['', '— sin relacionar —']].concat(d.nodos.map(n => [n.id, n.nombre]));
        el.innerHTML = `<div class="cs-row between" style="margin-bottom:14px"><h2 style="font-size:20px;font-weight:700">Cronología de hechos</h2><div class="cs-row"><button class="cs-btn" id="c-ord">Ordenar por fecha</button><button class="cs-btn" id="c-gen" title="Crea eventos con las transacciones marcadas ROS">+ Desde transacciones ROS</button><button class="cs-btn pri" id="c-add">+ Evento</button></div></div>
            <div class="cs-tl">${d.crono.map((c, i) => `<div class="cs-ev cs-card"><div class="cs-grid" style="grid-template-columns:150px 1fr 220px 34px;align-items:end">${CS.f('Fecha', `crono.${i}.fecha`, { t: 'date' })}${CS.f('Hecho', `crono.${i}.titulo`)}${CS.f('Sujeto relacionado', `crono.${i}.nodo`, { t: 'sel', o: ops })}<button class="cs-btn sm red" data-del="${i}">✕</button></div><div style="margin-top:8px">${CS.f('Descripción', `crono.${i}.desc`, { t: 'area', r: 2 })}</div></div>`).join('') || '<p class="cs-mu">Registra los hechos en orden: aperturas, depósitos, noticias, reuniones. El informe los incluye automáticamente.</p>'}</div>`;
        el.querySelector('#c-add').onclick = () => { d.crono.push({ id: uid(), fecha: hoy(), titulo: '', desc: '', nodo: '' }); CS.dirty(); CS.refrescar(); };
        el.querySelector('#c-ord').onclick = () => { d.crono.sort((a, b) => (a.fecha || '').localeCompare(b.fecha || '')); CS.dirty(); CS.refrescar(); };
        el.querySelector('#c-gen').onclick = () => { const r = d.tx.filter(t => t.reportar); if (!r.length) return alert('Marca primero transacciones con “ROS”.'); r.forEach(t => d.crono.push({ id: uid(), fecha: t.fecha, titulo: `${t.tipo} ${t.nat === 'debito' ? '(débito)' : '(crédito)'} por ${COP(t.valor)}`, desc: `Titular: ${t.titular || 's/d'}. Producto ${t.producto || ''} ${t.numero || ''}. ${t.nota || ''}`.trim(), nodo: d.nodos.find(n => n.nombre === t.titular)?.id || '' })); CS.dirty(); CS.refrescar(); };
        el.onclick = e => { const b = e.target.closest('[data-del]'); if (b) { d.crono.splice(+b.dataset.del, 1); CS.dirty(); CS.refrescar(); } };
    };

    // ---------- Pestaña: Evidencias (Storage privado + hash SHA-256) ----------
    const sha = async buf => [...new Uint8Array(await crypto.subtle.digest('SHA-256', buf))].map(b => b.toString(16).padStart(2, '0')).join('');
    CS.tabs.evid = el => {
        const d = caso.data, ops = [['', '— caso en general —']].concat(d.nodos.map(n => [n.id, n.nombre]));
        el.innerHTML = `<div class="cs-row between" style="margin-bottom:14px"><div><h2 style="font-size:20px;font-weight:700">Evidencias y cadena de custodia</h2><p class="cs-mu cs-sm">Archivos en almacenamiento privado, con huella SHA-256 y registro de auditoría. Máx. 20 MB por archivo.</p></div>
            <div class="cs-row"><button class="cs-btn" id="e-url"><i class="fa-solid fa-link"></i> Agregar enlace</button><label class="cs-btn pri"><i class="fa-solid fa-upload"></i> Subir archivos<input id="e-up" type="file" multiple hidden></label></div></div>
            <div class="cs-grid">${d.evid.map((v, i) => `<div class="cs-card"><div class="cs-row between"><b><i class="fa-solid ${v.ruta ? 'fa-file-shield' : 'fa-link'}" style="color:var(--ac)"></i> ${esc(v.nombre)}</b><div class="cs-row">${v.ruta ? `<button class="cs-btn sm" data-dl="${i}">Descargar</button>` : `<a class="cs-btn sm" href="${esc(v.url)}" target="_blank" rel="noopener noreferrer">Abrir</a>`}<button class="cs-btn sm red" data-del="${i}">✕</button></div></div>
              <p class="cs-mu cs-sm" style="margin:6px 0">${v.ruta ? `${(v.tam / 1024).toFixed(1)} KB · SHA-256: <code style="word-break:break-all">${v.hash}</code>` : esc(v.url)}<br>Cargado por ${esc(v.por || '—')} el ${new Date(v.fecha).toLocaleString('es-CO')}</p>
              <div class="cs-grid g2">${CS.f('Relacionada con', `evid.${i}.nodo`, { t: 'sel', o: ops })}${CS.f('Descripción', `evid.${i}.nota`)}</div></div>`).join('') || '<div class="cs-card cs-mu" style="text-align:center;padding:40px">Sin evidencias. Sube soportes (extractos, formularios, pantallazos) o enlaza noticias.</div>'}</div>`;
        const u = SarlaftAuth.usuario();
        el.querySelector('#e-up').onchange = async e => { const db = await SarlaftAuth.db(), us = await u;
            for (const f of e.target.files) { if (f.size > 20 * 1048576) { alert(`${f.name} supera 20 MB.`); continue; }
                const buf = await f.arrayBuffer(), h = await sha(buf), ruta = `${us.id}/${caso.id}/${uid()}-${f.name.replace(/[^\w.\-]/g, '_')}`;
                const { error } = await db.storage.from('evidencias').upload(ruta, f, { contentType: f.type || 'application/octet-stream' }); if (error) { alert('No se pudo subir: ' + error.message); continue; }
                d.evid.push({ id: uid(), nombre: f.name, ruta, hash: h, tam: f.size, tipo: f.type, fecha: new Date().toISOString(), por: us.email, nodo: '', nota: '' }); CS.audit('evidencia_subida', { nombre: f.name, sha256: h }); }
            CS.dirty(); CS.refrescar(); };
        el.querySelector('#e-url').onclick = async () => { const v = await CS.modal('Agregar enlace / fuente', [{ k: 'nombre', l: 'Título', ph: 'Titular de la noticia' }, { k: 'url', l: 'URL', ph: 'https://…' }], 'Agregar'); if (!v || !/^https?:\/\//i.test(v.url)) return v && alert('La URL debe iniciar con http:// o https://');
            d.evid.push({ id: uid(), nombre: v.nombre || v.url, url: v.url, fecha: new Date().toISOString(), por: (await u).email, nodo: '', nota: '' }); CS.dirty(); CS.refrescar(); };
        el.onclick = async e => { const b = e.target.closest('button'); if (!b) return; const db = await SarlaftAuth.db();
            if (b.dataset.dl !== undefined) { const v = d.evid[+b.dataset.dl]; const { data, error } = await db.storage.from('evidencias').createSignedUrl(v.ruta, 60); if (error) return alert(error.message); CS.audit('evidencia_descargada', { nombre: v.nombre }); window.open(data.signedUrl, '_blank', 'noopener'); }
            if (b.dataset.del !== undefined) { const v = d.evid[+b.dataset.del]; if (!confirm('¿Eliminar esta evidencia?')) return; if (v.ruta) await db.storage.from('evidencias').remove([v.ruta]); CS.audit('evidencia_eliminada', { nombre: v.nombre, sha256: v.hash }); d.evid.splice(+b.dataset.del, 1); CS.dirty(); CS.refrescar(); } };
    };

    // ---------- Pestaña: Auditoría ----------
    CS.tabs.audit = async el => {
        el.innerHTML = '<h2 style="font-size:20px;font-weight:700;margin-bottom:6px">Registro de auditoría</h2><p class="cs-mu cs-sm" style="margin-bottom:14px"><i class="fa-solid fa-lock"></i> Inmutable: no puede editarse ni borrarse desde la aplicación.</p><div id="a-b" class="cs-mu">Cargando…</div>';
        const db = await SarlaftAuth.db(); const { data, error } = await db.from('caso_auditoria').select('*').eq('caso_id', caso.id).order('created_at', { ascending: false }).limit(300);
        el.querySelector('#a-b').innerHTML = error ? esc(error.message) : `<div class="cs-scroll"><table class="cs-tbl"><thead><tr><th>Fecha</th><th>Analista</th><th>Acción</th><th>Detalle</th></tr></thead><tbody>${data.map(a => `<tr><td style="padding:7px 6px;white-space:nowrap">${new Date(a.created_at).toLocaleString('es-CO')}</td><td>${esc(a.email)}</td><td><b>${esc(a.accion)}</b></td><td class="cs-mu">${esc(JSON.stringify(a.detalle))}</td></tr>`).join('')}</tbody></table></div>`;
    };
})();
