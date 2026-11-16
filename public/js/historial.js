// Historial de sesiones (Noticias y Cruce Masivo), estilo conversaciones de IA.
// Cada analista solo ve lo suyo: Supabase RLS (user_id = auth.uid()).
window.Historial = (function () {
    const actual = {};            // tipo -> { id, titulo, get }
    const meta = {
        noticias: { nombre: 'Historial de Noticias', icono: 'fa-newspaper', color: '#0e93b8' },
        cruce:    { nombre: 'Historial de Cruce Masivo', icono: 'fa-chart-pie', color: '#9333ea' }
    };
    const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

    async function nueva(tipo, titulo, get) {
        actual[tipo] = { id: null, titulo: String(titulo || 'Sin título').slice(0, 140), get };
        await sync(tipo);
    }
    async function sync(tipo) {
        const a = actual[tipo]; if (!a) return;
        try {
            const db = await SarlaftAuth.db();
            const payload = a.get();
            if (!a.id) {
                const { data, error } = await db.from('historial').insert({ tipo, titulo: a.titulo, payload }).select('id').single();
                if (error) throw error; a.id = data.id;
            } else {
                const { error } = await db.from('historial').update({ payload }).eq('id', a.id);
                if (error) throw error;
            }
        } catch (e) { console.warn('Historial no guardado:', e.message); }
    }
    function adoptar(tipo, id, titulo, get) { actual[tipo] = { id, titulo, get }; }

    function grupo(f) {
        const d = (Date.now() - new Date(f).getTime()) / 864e5;
        return d < 1 ? 'Hoy' : d < 2 ? 'Ayer' : d < 8 ? 'Últimos 7 días' : d < 31 ? 'Últimos 30 días' : 'Anteriores';
    }

    async function abrir(tipo) {
        cerrar();
        const m = meta[tipo];
        const ov = document.createElement('div');
        ov.id = 'hist-ov'; ov.className = 'hist-ov'; ov.onclick = e => { if (e.target === ov) cerrar(); };
        ov.innerHTML = `<aside class="hist-panel">
            <div class="hist-head"><b><i class="fa-solid ${m.icono}" style="color:${m.color}"></i> ${m.nombre}</b>
              <button onclick="Historial.cerrar()" aria-label="Cerrar">✕</button></div>
            <input id="hist-q" placeholder="Buscar en el historial…" autocomplete="off">
            <div id="hist-list" class="hist-list"><p class="hist-vacio">Cargando…</p></div>
            <p class="hist-pie"><i class="fa-solid fa-lock"></i> Solo tú puedes ver tu historial.</p></aside>`;
        document.body.appendChild(ov);
        let filas = [];
        const pintar = () => {
            const q = document.getElementById('hist-q').value.toLowerCase();
            const vis = filas.filter(f => f.titulo.toLowerCase().includes(q));
            if (!vis.length) { document.getElementById('hist-list').innerHTML = '<p class="hist-vacio">Aún no hay sesiones guardadas.</p>'; return; }
            let h = '', g = '';
            vis.forEach(f => {
                const gr = grupo(f.updated_at);
                if (gr !== g) { g = gr; h += `<h4>${gr}</h4>`; }
                h += `<div class="hist-item ${actual[tipo]?.id === f.id ? 'act' : ''}" data-id="${f.id}">
                    <button class="hist-t" data-a="abrir" title="${esc(f.titulo)}">${esc(f.titulo)}<small>${new Date(f.updated_at).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })}</small></button>
                    <button data-a="ren" title="Renombrar"><i class="fa-solid fa-pen"></i></button>
                    <button data-a="del" title="Eliminar"><i class="fa-solid fa-trash"></i></button></div>`;
            });
            document.getElementById('hist-list').innerHTML = h;
        };
        try {
            const db = await SarlaftAuth.db();
            const { data, error } = await db.from('historial').select('id,titulo,created_at,updated_at').eq('tipo', tipo).order('updated_at', { ascending: false }).limit(200);
            if (error) throw error; filas = data;
        } catch (e) { document.getElementById('hist-list').innerHTML = `<p class="hist-vacio">No se pudo cargar: ${esc(e.message)}<br>¿Ejecutaste supabase/casos_y_historial.sql?</p>`; return; }
        pintar();
        document.getElementById('hist-q').oninput = pintar;
        document.getElementById('hist-list').onclick = async e => {
            const b = e.target.closest('button'); const it = e.target.closest('.hist-item'); if (!b || !it) return;
            const id = it.dataset.id, f = filas.find(x => x.id === id), db = await SarlaftAuth.db();
            if (b.dataset.a === 'abrir') {
                const { data, error } = await db.from('historial').select('payload,titulo').eq('id', id).single();
                if (error) return alert('No se pudo abrir: ' + error.message);
                cerrar(); handlers[tipo](data.payload, id, data.titulo);
            } else if (b.dataset.a === 'ren') {
                const t = prompt('Nuevo nombre:', f.titulo); if (!t || !t.trim()) return;
                await db.from('historial').update({ titulo: t.trim().slice(0, 140) }).eq('id', id);
                f.titulo = t.trim(); if (actual[tipo]?.id === id) actual[tipo].titulo = f.titulo; pintar();
            } else if (b.dataset.a === 'del') {
                if (!confirm('¿Eliminar esta sesión del historial? No se puede deshacer.')) return;
                await db.from('historial').delete().eq('id', id);
                filas = filas.filter(x => x.id !== id); if (actual[tipo]?.id === id) delete actual[tipo]; pintar();
            }
        };
    }
    function cerrar() { document.getElementById('hist-ov')?.remove(); }

    const handlers = {
        noticias: (p, id, t) => window.restaurarNoticias(p, id, t),
        cruce: (p, id, t) => window.restaurarCruce(p, id, t)
    };
    return { nueva, sync, adoptar, abrir, cerrar };
})();
