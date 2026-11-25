// Comportamiento del menú principal.
(function () {
    const root = document.getElementById('view-menu');
    const visible = () => root && !root.classList.contains('hidden') && !document.hidden;
    if (!root) return;

    root.addEventListener('click', e => {
        const card = e.target.closest('[data-go]');
        if (card) ir(card.dataset.go);
    });

    function ir(modulo) {
        if (modulo === 'noticias') navegarA('view-noticias');
        else if (modulo === 'cruce') navegarA('view-cliente');
        else if (modulo === 'casos') abrirCasos();
    }

    window.addEventListener('keydown', e => {
        if (!visible() || e.ctrlKey || e.metaKey || e.altKey || /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName)) return;
        const modulo = { 1: 'noticias', 2: 'cruce', 3: 'casos' }[e.key];
        if (modulo) ir(modulo);
    });

    async function stats() {
        try {
            const db = await SarlaftAuth.db();
            if (!db) return;
            const q = (tabla, filtro) => filtro(db.from(tabla).select('id', { count: 'exact', head: true }));
            const [noticias, cruces, casos] = await Promise.all([
                q('historial', x => x.eq('tipo', 'noticias')),
                q('historial', x => x.eq('tipo', 'cruce')),
                q('casos', x => x.eq('archivado', false))
            ]);
            [['noticias', noticias], ['cruce', cruces], ['casos', casos]].forEach(([id, resultado]) => {
                const el = root.querySelector(`[data-stat="${id}"]`);
                if (el && resultado.count != null) el.textContent = resultado.count;
            });
        } catch (e) { /* Puede no haber sesión o faltar tablas. */ }
    }

    window.menuActivar = stats;
    setTimeout(stats, 900);
})();
