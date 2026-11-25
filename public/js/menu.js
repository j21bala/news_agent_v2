// Comportamiento del menú principal.
(function () {
    const root = document.getElementById('view-menu');
    const visible = () => root && !root.classList.contains('hidden') && !document.hidden;
    const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!root) return;

    root.addEventListener('click', e => {
        const card = e.target.closest('[data-go]');
        if (card) ir(card.dataset.go);
    });

    root.querySelectorAll('.mn-card').forEach(card => {
        card.addEventListener('pointermove', e => {
            const rect = card.getBoundingClientRect();
            const x = (e.clientX - rect.left) / rect.width;
            const y = (e.clientY - rect.top) / rect.height;
            const rotateX = (.5 - y) * 5;
            card.style.setProperty('--mx', `${x * 100}%`);
            card.style.setProperty('--my', `${y * 100}%`);
            if (!reduceMotion) card.style.transform = `rotateY(${(x - .5) * 5}deg) rotateX(${rotateX}deg) translateY(-2px)`;
        });
        card.addEventListener('pointerleave', () => { card.style.transform = ''; });
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

    const typed = root.querySelector('#mn-typed');
    const frases = ['Debida diligencia en tiempo real', 'Investigación de casos con mapa de vínculos', 'Análisis de riesgo y cumplimiento'];
    let frase = 0, posicion = 0, borrando = false, timer = null;
    function escribir() {
        timer = null;
        if (!typed || reduceMotion || !visible()) return;
        const actual = frases[frase];
        typed.textContent = actual.slice(0, posicion);
        if (!borrando && posicion < actual.length) posicion++;
        else if (!borrando) borrando = true;
        else if (posicion > 0) posicion--;
        else { borrando = false; frase = (frase + 1) % frases.length; }
        timer = setTimeout(escribir, borrando ? 24 : 48);
    }

    window.menuActivar = () => {
        stats();
        if (!timer) escribir();
    };
    setTimeout(stats, 900);
    if (!reduceMotion) escribir();
})();
