
(function () {
    const C = window.CAPT_LISTAS, $ = id => document.getElementById(id);
    const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const ON = 'bg-navy text-white px-4 py-2 rounded-lg text-sm font-bold';
    const OFF = 'bg-slate-200 text-navy px-4 py-2 rounded-lg text-sm font-bold';
    let registros = [];

    /* ---------- SECCIONES DEL FORMULARIO ---------- */
    const SECCIONES = [
        { titulo: '1 · Identificación del caso', icono: 'fa-id-badge', campos: ['cod', 'anio', 'ingresa', 'ris', 'decision', 'ros'] },
        { titulo: '2 · Acta y fechas', icono: 'fa-calendar-day', campos: ['f_acta', 'acta', 'f_rec'] },
        { titulo: '3 · Oficinas', icono: 'fa-building-columns', campos: ['ofi_sede', 'n_sede', 'ofi_rep', 'n_rep', 'ofi_adm', 'n_adm', 'terr'] },
        { titulo: '4 · Cliente y analista', icono: 'fa-user-tie', campos: ['cliente', 'tipo_id', 'id_cli', 'nombre', 'analista', 'reporta'] },
        { titulo: '5 · Productos y cancelaciones', icono: 'fa-box-open', campos: ['lr', 'monit', 'canc_prod', 'canc_vinc', 'sub417', 'p1', 'p2', 'p3', 'p4'] },
        { titulo: '6 · Control y reporte', icono: 'fa-shield-halved', campos: ['control', 'riesgo', 'macro', 'canal', 'uiaf', 'intentada'] }
    ];

    /* ---------- ESTILOS (se inyectan solos) ---------- */
    const CSS = `
.capturador-panel{max-width:1180px;margin:0 auto;padding:28px;background:#fff;border:1px solid #dbe4ee;border-radius:18px;box-shadow:0 12px 35px rgba(15,42,67,.08)}
.capturador-heading{display:flex;justify-content:space-between;align-items:flex-start;gap:20px;margin-bottom:22px;padding-bottom:18px;border-bottom:1px solid #e5ebf2}
.capturador-kicker{display:block;margin-bottom:4px;color:#059669;font-size:.7rem;font-weight:800;letter-spacing:.09em;text-transform:uppercase}
.capturador-heading h3{margin:0;color:#0f1b2d;font-size:1.3rem;font-weight:800}
.capturador-heading p{margin:6px 0 0;color:#64748b;font-size:.85rem;line-height:1.5}
.capturador-badge{padding:7px 12px;border-radius:999px;background:#ecfdf5;color:#047857;font-size:.7rem;font-weight:800;white-space:nowrap}
.capt-section{margin:0 0 18px;padding:16px 18px 18px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px}
.capt-section-title{display:flex;align-items:center;gap:9px;margin:0 0 14px;color:#0f1b2d;font-size:.88rem;font-weight:800}
.capt-section-title::before{content:"";width:5px;height:18px;border-radius:4px;background:#10b981}
.capt-section-title i{color:#059669;font-size:.78rem}
.capt-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
@media(min-width:900px){.capt-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}
.capt-field--wide{grid-column:1/-1}
.capt-label{display:block;margin-bottom:6px;color:#334155;font-size:.72rem;font-weight:700}
.capt-req{color:#e11d48;font-weight:800}
.capt-input{width:100%;min-height:40px;padding:8px 12px;border:1px solid #cbd5e1;border-radius:8px;background:#fff;color:#1e293b;font-size:.85rem;transition:border-color .15s,box-shadow .15s}
.capt-input:focus{border-color:#10b981;outline:none;box-shadow:0 0 0 3px rgba(16,185,129,.15)}
.capt-input:disabled{background:#eef2f7;color:#94a3b8;cursor:not-allowed}
.capt-input::placeholder{color:#9aa8ba}
.capt-input-auto{background:#f1f5f9;color:#475569}
select.capt-input{appearance:none;-webkit-appearance:none;padding-right:34px;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 10px center;background-size:14px}
.capt-ofi{position:relative}
.capt-ofi-input{padding-right:38px}
.capt-ofi-arrow{position:absolute;right:6px;top:50%;transform:translateY(-50%);width:28px;height:28px;border:0;border-radius:6px;background:transparent;color:#64748b;cursor:pointer;display:flex;align-items:center;justify-content:center}
.capt-ofi-arrow:hover{background:#eef2f7}
.capt-ofi.abierto .capt-ofi-input{border-color:#10b981;box-shadow:0 0 0 3px rgba(16,185,129,.15)}
.capt-ofi-menu{position:absolute;z-index:70;top:calc(100% + 6px);left:0;right:0;max-height:260px;overflow-y:auto;background:#fff;border:1px solid #dbe4ee;border-radius:10px;box-shadow:0 14px 30px rgba(15,27,45,.18);padding:6px}
.capt-ofi-opt{display:grid;grid-template-columns:52px 1fr auto;align-items:center;gap:8px;width:100%;padding:8px 10px;border:0;border-radius:8px;background:transparent;text-align:left;cursor:pointer;font-size:.8rem;color:#1e293b}
.capt-ofi-opt:hover,.capt-ofi-opt.activa{background:#ecfdf5}
.capt-ofi-cod{font-weight:800;color:#059669}
.capt-ofi-nom{font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.capt-ofi-terr{color:#94a3b8;font-size:.66rem;text-transform:uppercase;letter-spacing:.04em}
.capt-ofi-vacio{padding:12px;color:#94a3b8;font-size:.8rem;text-align:center}
.capt-ofi-error .capt-ofi-input{border-color:#e11d48;box-shadow:0 0 0 3px rgba(225,29,72,.1)}
.capturador-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:22px;padding-top:18px;border-top:1px solid #e5ebf2}
.capt-btn{min-height:42px;padding:0 18px;border:0;border-radius:9px;font-size:.84rem;font-weight:800;cursor:pointer;transition:background .15s,opacity .15s}
.capt-btn-primary{background:#0f1b2d;color:#fff}
.capt-btn-primary:hover{background:#123a5c}
.capt-btn-primary:disabled{opacity:.55;cursor:not-allowed}
.capt-btn-secondary{background:#e2e8f0;color:#0f1b2d}
.capt-btn-secondary:hover{background:#cbd5e1}
.capt-msg{margin-top:16px;font-size:.85rem}
.capt-msg:empty{display:none}
.capt-msg-error{background:#fef2f2;border:1px solid #fecaca;color:#b91c1c;padding:12px 14px;border-radius:10px}
.capt-msg-ok{background:#ecfdf5;border:1px solid #a7f3d0;color:#047857;padding:12px 14px;border-radius:10px}
@media(max-width:640px){.capturador-panel{padding:18px}.capt-grid{grid-template-columns:1fr}.capturador-heading{flex-direction:column}.capturador-badge{display:none}}
`;

    function inyectarEstilos() {
        if (!$('capt-estilos')) {
            const st = document.createElement('style');
            st.id = 'capt-estilos';
            st.textContent = CSS;
            document.head.appendChild(st);
        }
    }

    /* ---------- RENDER DE CAMPOS ---------- */
    function campoHTML(k) {
        const f = C.campos.find(c => c.k === k);
        if (!f) return '';
        const id = 'c-' + f.k;
        const wide = k === 'nombre' ? ' capt-field--wide' : '';
        const req = f.r === 1 ? '<span class="capt-req"> *</span>' : '';
        let ctrl;
        if (f.t === 'sel') {
            ctrl = `<select id="${id}" class="capt-input"><option value="">Seleccionar…</option>${C.listas[f.l].map(v => `<option value="${esc(v)}">${esc(v)}</option>`).join('')}</select>`;
        } else if (f.t === 'auto') {
            ctrl = `<input id="${id}" readonly tabindex="-1" class="capt-input capt-input-auto" placeholder="Se calcula automáticamente">`;
        } else if (f.t === 'fecha') {
            ctrl = `<input id="${id}" type="date" ${f.k === 'f_acta' ? `min="${C.fechaMin}" max="${C.fechaMax}"` : ''} class="capt-input">`;
        } else if (f.t === 'ofi') {
            ctrl = `<div class="capt-ofi" data-ofi>
                        <input id="${id}" class="capt-ofi-input capt-input" autocomplete="off" spellcheck="false" placeholder="Código o nombre de oficina…">
                        <button type="button" class="capt-ofi-arrow" data-ofi-toggle tabindex="-1" title="Ver oficinas"><i class="fa-solid fa-chevron-down"></i></button>
                        <div class="capt-ofi-menu hidden" data-ofi-menu></div>
                    </div>`;
        } else {
            const im = (f.t === 'num' || f.t === 'prod') ? 'inputmode="numeric"' : '';
            ctrl = `<input id="${id}" ${im} autocomplete="off" class="capt-input" placeholder="${f.t === 'num' ? 'Solo números' : ''}">`;
        }
        return `<div class="capt-field${wide}"><label class="capt-label" for="${id}">${esc(f.n)}${req}</label>${ctrl}</div>`;
    }

    function seccionHTML(s) {
        return `<section class="capt-section">
            <h4 class="capt-section-title"><i class="fa-solid ${s.icono}"></i>${esc(s.titulo)}</h4>
            <div class="capt-grid">${s.campos.map(campoHTML).join('')}</div>
        </section>`;
    }

    /* ---------- SELECTOR DE OFICINAS (reemplaza al datalist) ---------- */
    let suprimirApertura = false;

    function cerrarMenusOfi() {
        document.querySelectorAll('[data-ofi]').forEach(w => {
            w.classList.remove('abierto');
            const m = w.querySelector('[data-ofi-menu]');
            if (m) m.classList.add('hidden');
        });
    }

    function pintarOpciones(wrap, q) {
        const menu = wrap.querySelector('[data-ofi-menu]');
        const t = String(q || '').trim().toLowerCase();
        const coinciden = C.oficinas
            .filter(o => !t || String(o[0]).startsWith(t) || String(o[1]).toLowerCase().includes(t))
            .slice(0, 80);
        const actual = wrap.querySelector('input').value;
        const activo = coinciden.findIndex(o => String(o[0]) === String(actual));
        menu.innerHTML = coinciden.length
            ? coinciden.map((o, i) => `<button type="button" class="capt-ofi-opt${i === (activo >= 0 ? activo : 0) ? ' activa' : ''}" data-cod="${o[0]}"><span class="capt-ofi-cod">${o[0]}</span><span class="capt-ofi-nom">${esc(o[1])}</span><span class="capt-ofi-terr">${esc(o[2] || '')}</span></button>`).join('')
            : '<div class="capt-ofi-vacio">Sin resultados</div>';
    }

    function abrirMenuOfi(wrap, q) {
        document.querySelectorAll('[data-ofi]').forEach(w => {
            if (w !== wrap) { w.classList.remove('abierto'); w.querySelector('[data-ofi-menu]').classList.add('hidden'); }
        });
        pintarOpciones(wrap, q);
        wrap.querySelector('[data-ofi-menu]').classList.remove('hidden');
        wrap.classList.add('abierto');
    }

    function navTeclas(e, wrap) {
        const menu = wrap.querySelector('[data-ofi-menu]');
        if (menu.classList.contains('hidden')) {
            if (e.key === 'ArrowDown') { e.preventDefault(); abrirMenuOfi(wrap, wrap.querySelector('input').value); }
            return;
        }
        const opts = [...menu.querySelectorAll('.capt-ofi-opt')];
        if (!opts.length) return;
        let i = opts.findIndex(o => o.classList.contains('activa'));
        if (e.key === 'ArrowDown') { e.preventDefault(); i = (i + 1) % opts.length; }
        else if (e.key === 'ArrowUp') { e.preventDefault(); i = (i <= 0 ? opts.length - 1 : i - 1); }
        else if (e.key === 'Enter') { e.preventDefault(); opts[Math.max(i, 0)].click(); return; }
        else if (e.key === 'Escape') { menu.classList.add('hidden'); wrap.classList.remove('abierto'); return; }
        else return;
        opts.forEach(o => o.classList.remove('activa'));
        opts[i].classList.add('activa');
        opts[i].scrollIntoView({ block: 'nearest' });
    }

    /* ---------- LÓGICA DEL FORMULARIO ---------- */
    const leer = () => Object.fromEntries(C.campos.map(f => [f.k, $('c-' + f.k).value]));

    function refrescar() {
        const d = C.derivar(leer());
        C.campos.forEach(f => { if (f.t === 'auto') $('c-' + f.k).value = d[f.k] || ''; });
        const ros = $('c-decision').value === 'ROS';
        ['ros', 'uiaf'].forEach(k => { const e = $('c-' + k); e.disabled = !ros; if (!ros) e.value = ''; });
        const cp = $('c-canc_prod').value;
        ['p1', 'p2', 'p3', 'p4'].forEach(k => {
            const e = $('c-' + k);
            e.disabled = cp !== 'SI';
            if (cp === 'NO') e.value = 'NO';
            else if (cp === '') e.value = '';
            else if (e.value === '' && k !== 'p1') e.value = 'NO';
            else if (k === 'p1' && e.value === 'NO') e.value = '';
        });
        ['ofi_sede', 'ofi_rep', 'ofi_adm'].forEach(k => {
            const inp = $('c-' + k);
            const wrap = inp.closest('[data-ofi]');
            if (wrap) wrap.classList.toggle('capt-ofi-error', inp.value !== '' && !C.ofi(inp.value));
        });
    }

    function limpiar() {
        C.campos.forEach(f => { if (f.t !== 'auto') $('c-' + f.k).value = ''; });
        $('c-anio').value = new Date().getFullYear();
        refrescar();
    }

    const msg = (lineas, err) => {
        const box = $('capt-msg');
        if (!box) return;
        box.className = 'capt-msg ' + (err ? 'capt-msg-error' : 'capt-msg-ok');
        box.innerHTML = [].concat(lineas).map(l => `<div>${esc(l)}</div>`).join('');
    };

    /* ---------- GUARDAR / LISTAR / EXPORTAR ---------- */
    window.captGuardar = async function (forzar) {
        const d = C.derivar(leer());
        const errs = C.validar(d);
        if (errs.length) return msg(errs, true);
        const b = $('capt-guardar'); b.disabled = true;
        try {
            const r = await SarlaftAuth.authFetch('/api/capturador', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ datos: d, forzar: forzar === true }) });
            const j = await r.json();
            if (r.status === 409) { if (confirm(j.error + '\n\n¿Guardar de todas formas?')) { b.disabled = false; return window.captGuardar(true); } return; }
            if (!r.ok) return msg(j.error || 'Error al guardar.', true);
            msg('Registro guardado correctamente.');
            limpiar();
        } catch (e) { msg(e.message, true); }
        finally { b.disabled = false; }
    };

    async function cargar() {
        const p = $('capt-filtro').value === 'p' ? '?pendientes=1' : '';
        const r = await SarlaftAuth.authFetch('/api/capturador' + p);
        const j = await r.json();
        registros = j.data || [];
        $('capt-count').textContent = registros.length + ' registro(s)';
        $('capt-tbody').innerHTML = registros.slice(0, 50).map(r => `<tr class="border-b border-slate-100">
            <td class="p-2">${esc(new Date(r.creado_en).toLocaleString('es-CO'))}</td><td class="p-2">${esc(r.datos.cod)}</td>
            <td class="p-2">${esc(r.anio)}</td><td class="p-2">${esc(r.num_ris)}</td><td class="p-2">${esc(r.datos.decision)}</td>
            <td class="p-2">${esc(r.datos.nombre)}</td><td class="p-2">${esc(r.datos.analista)}</td>
            <td class="p-2">${r.exportado ? 'Exportado' : '<b>Pendiente</b>'}</td></tr>`).join('');
    }

    const filas = () => [...registros].reverse().map(r => C.fila(r.datos));
    const idxFecha = C.cols.map((h, i) => C.campos.find(c => c.h === h && c.t === 'fecha') ? i : -1).filter(i => i >= 0);
    const serial = iso => { const [y, m, d] = iso.split('-').map(Number); return Date.UTC(y, m - 1, d) / 864e5 + 25569; };

    async function marcar() {
        if ($('capt-filtro').value !== 'p' || !registros.length) return;
        await SarlaftAuth.authFetch('/api/capturador', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: registros.map(r => r.id) }) });
        cargar();
    }

    window.captExcel = async function () {
        if (!registros.length) return alert('No hay registros para exportar.');
        const rows = filas().map(f => f.map((v, i) => (idxFecha.includes(i) && v ? serial(v) : v)));
        const ws = XLSX.utils.aoa_to_sheet([C.cols, ...rows]);
        rows.forEach((_, r) => idxFecha.forEach(c => { const a = ws[XLSX.utils.encode_cell({ r: r + 1, c })]; if (a) a.z = 'dd/mm/yyyy'; }));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'BASE');
        XLSX.writeFile(wb, `CAPTURADOR_${new Date().toISOString().slice(0, 10)}.xlsx`);
        await marcar();
    };

    window.captCopiar = async function () {
        if (!registros.length) return alert('No hay registros para copiar.');
        const tsv = filas().map(f => f.map((v, i) => (idxFecha.includes(i) && v ? v.split('-').reverse().join('/') : v)).join('\t')).join('\n');
        await navigator.clipboard.writeText(tsv);
        alert('Filas copiadas (sin encabezado). Pégalas en la primera fila vacía de la tabla BASE.');
        await marcar();
    };

    /* ---------- NAVEGACIÓN DE VISTAS ---------- */
    window.captTab = function (t) {
        $('capt-nuevo').classList.toggle('hidden', t !== 'n');
        $('capt-lista').classList.toggle('hidden', t !== 'l');
        $('capt-tab-n').className = t === 'n' ? ON : OFF;
        $('capt-tab-l').className = t === 'l' ? ON : OFF;
        if (t === 'l') cargar();
    };

    window.captCargar = cargar;
    window.captLimpiar = limpiar;

    window.abrirCapturador = function () {
        document.querySelectorAll('[id^="view-"]').forEach(v => v.classList.add('hidden'));
        const vista = document.getElementById('view-capturador');
        if (!vista) { console.error('No existe el elemento #view-capturador'); return; }
        vista.classList.remove('hidden');
        window.captTab('n');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    window.cerrarCapturador = function () {
        document.querySelectorAll('[id^="view-"]').forEach(v => v.classList.add('hidden'));
        const menu = document.getElementById('view-menu');
        if (menu) {
            menu.classList.remove('hidden');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    /* ---------- INICIALIZACIÓN ---------- */
    inyectarEstilos();

    const panel = $('capt-nuevo');
    if (panel) {
        panel.className = 'capturador-panel';
        panel.innerHTML = `
            <div class="capturador-heading">
                <div>
                    <span class="capturador-kicker">Registro operativo</span>
                    <h3>Nuevo caso del comité</h3>
                    <p>Diligencia las secciones en orden. Los campos con <b class="capt-req">*</b> son obligatorios; el nombre de oficina, el territorio y los campos derivados se completan solos al elegir el código.</p>
                </div>
                <span class="capturador-badge"><i class="fa-solid fa-asterisk"></i>&nbsp;Campos obligatorios</span>
            </div>
            <div id="capt-form"></div>
            <div id="capt-msg" class="capt-msg"></div>
            <div class="capturador-actions">
                <button id="capt-limpiar" type="button" class="capt-btn capt-btn-secondary"><i class="fa-solid fa-eraser"></i>&nbsp;Limpiar</button>
                <button id="capt-guardar" type="button" class="capt-btn capt-btn-primary"><i class="fa-solid fa-floppy-disk"></i>&nbsp;Guardar registro</button>
            </div>`;
        $('capt-limpiar').addEventListener('click', limpiar);
        $('capt-guardar').addEventListener('click', () => window.captGuardar());
    }

    const form = $('capt-form');
    if (form) {
        const puestas = new Set(SECCIONES.flatMap(s => s.campos));
        const faltantes = C.campos.filter(f => !puestas.has(f.k)).map(f => f.k);
        let html = SECCIONES.map(seccionHTML).join('');
        if (faltantes.length) html += seccionHTML({ titulo: 'Otros campos', icono: 'fa-list', campos: faltantes });
        form.innerHTML = html;

        form.addEventListener('input', e => {
            const wrap = e.target.closest('[data-ofi]');
            if (wrap) abrirMenuOfi(wrap, e.target.value);
            refrescar();
        });
        form.addEventListener('focusin', e => {
            if (suprimirApertura) { suprimirApertura = false; return; }
            if (e.target.classList && e.target.classList.contains('capt-ofi-input')) {
                abrirMenuOfi(e.target.closest('[data-ofi]'), e.target.value);
            }
        });
        form.addEventListener('click', e => {
            const opt = e.target.closest('.capt-ofi-opt');
            if (opt) {
                const wrap = opt.closest('[data-ofi]');
                const inp = wrap.querySelector('input');
                suprimirApertura = true;
                inp.value = opt.dataset.cod;
                cerrarMenusOfi();
                inp.focus();
                refrescar();
                return;
            }
            const tog = e.target.closest('[data-ofi-toggle]');
            if (tog) {
                const wrap = tog.closest('[data-ofi]');
                abrirMenuOfi(wrap, wrap.querySelector('input').value);
            }
        });
        form.addEventListener('keydown', e => {
            const wrap = e.target.closest('[data-ofi]');
            if (wrap) navTeclas(e, wrap);
        });
    }

    // El botón "Volver al Menú" pasa a usar cerrarCapturador (sin tocar el HTML)
    const vistaCapt = document.getElementById('view-capturador');
    if (vistaCapt) {
        const btnVolver = vistaCapt.querySelector('.barra-cristal button');
        if (btnVolver) btnVolver.setAttribute('onclick', 'window.cerrarCapturador()');
    }

    // Cerrar cualquier menú de oficinas al hacer clic fuera
    document.addEventListener('click', e => {
        document.querySelectorAll('[data-ofi]').forEach(w => {
            if (!w.contains(e.target)) {
                w.classList.remove('abierto');
                w.querySelector('[data-ofi-menu]').classList.add('hidden');
            }
        });
    });

    limpiar();
})();