// Menú principal: red animada de partículas con pulsos, tilt 3D, contadores y atajos.
(function () {
    const root = () => document.getElementById('view-menu'), visible = () => root() && !root().classList.contains('hidden') && !document.hidden;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ---- Canvas: constelación reactiva ----
    const cv = document.getElementById('mn-canvas'); if (!cv) return; const cx = cv.getContext('2d');
    let W, H, P = [], sig = [], mouse = { x: -999, y: -999 }; const COL = ['56,189,208', '167,139,250', '224,184,58'];
    function size() { const d = Math.min(devicePixelRatio || 1, 2); W = cv.clientWidth; H = cv.clientHeight; cv.width = W * d; cv.height = H * d; cx.setTransform(d, 0, 0, d, 0, 0);
        const n = Math.min(110, Math.round(W * H / 15000)); P = Array.from({ length: n }, () => ({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - .5) * .35, vy: (Math.random() - .5) * .35, r: Math.random() * 1.6 + .8, c: COL[Math.random() * 3 | 0] })); }
    addEventListener('resize', size); size();
    root().addEventListener('pointermove', e => { const r = cv.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; });
    root().addEventListener('pointerleave', () => { mouse.x = mouse.y = -999; });
    setInterval(() => { if (!visible() || reduce || sig.length > 14) return; const a = P[Math.random() * P.length | 0], near = P.filter(b => b !== a && Math.hypot(a.x - b.x, a.y - b.y) < 150); if (near.length) sig.push({ a, b: near[Math.random() * near.length | 0], t: 0 }); }, 260);
    function frame() {
        requestAnimationFrame(frame); if (!visible()) return; cx.clearRect(0, 0, W, H);
        for (const p of P) { if (!reduce) { p.x += p.vx; p.y += p.vy; } if (p.x < 0 || p.x > W) p.vx *= -1; if (p.y < 0 || p.y > H) p.vy *= -1;
            const dx = p.x - mouse.x, dy = p.y - mouse.y, d = Math.hypot(dx, dy); if (d < 140 && d > 0) { p.x += dx / d * 1.6; p.y += dy / d * 1.6; } }
        for (let i = 0; i < P.length; i++) for (let j = i + 1; j < P.length; j++) { const a = P[i], b = P[j], d = Math.hypot(a.x - b.x, a.y - b.y); if (d < 140) { cx.strokeStyle = `rgba(${a.c},${(1 - d / 140) * .32})`; cx.lineWidth = .7; cx.beginPath(); cx.moveTo(a.x, a.y); cx.lineTo(b.x, b.y); cx.stroke(); } }
        for (const p of P) { cx.fillStyle = `rgba(${p.c},.85)`; cx.beginPath(); cx.arc(p.x, p.y, p.r, 0, 7); cx.fill(); }
        const md = P.filter(p => Math.hypot(p.x - mouse.x, p.y - mouse.y) < 170); md.forEach(p => { cx.strokeStyle = 'rgba(255,255,255,.22)'; cx.beginPath(); cx.moveTo(p.x, p.y); cx.lineTo(mouse.x, mouse.y); cx.stroke(); });
        sig = sig.filter(s => (s.t += .03) < 1); for (const s of sig) { const x = s.a.x + (s.b.x - s.a.x) * s.t, y = s.a.y + (s.b.y - s.a.y) * s.t; const g = cx.createRadialGradient(x, y, 0, x, y, 12); g.addColorStop(0, 'rgba(255,255,255,.95)'); g.addColorStop(.3, `rgba(${s.a.c},.6)`); g.addColorStop(1, 'transparent'); cx.fillStyle = g; cx.beginPath(); cx.arc(x, y, 12, 0, 7); cx.fill(); }
    }
    frame();

    // ---- Texto que se escribe ----
    const frases = ['Debida diligencia en tiempo real', 'Investigación de casos con mapa de vínculos', 'Cruce masivo de información financiera', 'Auditoría inmutable y datos aislados por analista'];
    const tp = document.getElementById('mn-typed'); let fi = 0, ci = 0, del = false;
    (function tick() { if (!tp) return; const f = frases[fi]; if (reduce) { tp.textContent = f; return; }
        tp.textContent = f.slice(0, ci); if (!del && ci < f.length) ci++; else if (!del) { del = true; return setTimeout(tick, 1700); } else if (ci > 0) ci--; else { del = false; fi = (fi + 1) % frases.length; }
        setTimeout(tick, del ? 22 : 48); })();

    // ---- Reloj ----
    setInterval(() => { const c = document.getElementById('mn-clock'); if (c) c.textContent = new Date().toLocaleTimeString('es-CO', { hour12: false }); }, 1000);

    // ---- Tarjetas: tilt 3D + foco de luz ----
    document.querySelectorAll('.mn-card').forEach(c => {
        c.addEventListener('pointermove', e => { const r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
            c.style.setProperty('--mx', x * 100 + '%'); c.style.setProperty('--my', y * 100 + '%'); if (!reduce) c.style.transform = `rotateY(${(x - .5) * 14}deg) rotateX(${(.5 - y) * 14}deg) translateZ(14px)`; });
        c.addEventListener('pointerleave', () => { c.style.transform = ''; });
        c.addEventListener('click', () => ir(c.dataset.go));
    });
    function ir(m) { if (m === 'noticias') navegarA('view-noticias'); else if (m === 'cruce') navegarA('view-cliente'); else if (m === 'casos') abrirCasos(); }
    addEventListener('keydown', e => { if (!visible() || e.ctrlKey || e.metaKey || e.altKey || /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName)) return; const m = { 1: 'noticias', 2: 'cruce', 3: 'casos' }[e.key]; if (m) ir(m); });

    // ---- Contadores reales (Supabase, solo del analista) ----
    function contar(el, to) { const t0 = performance.now(), from = +el.textContent || 0; (function s(t) { const k = Math.min(1, (t - t0) / 1100); el.textContent = Math.round(from + (to - from) * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(s); })(t0); }
    async function stats() {
        try { const db = await SarlaftAuth.db(); if (!db) return;
            const q = (t, f) => f(db.from(t).select('id', { count: 'exact', head: true }));
            const [n, c, k] = await Promise.all([q('historial', x => x.eq('tipo', 'noticias')), q('historial', x => x.eq('tipo', 'cruce')), q('casos', x => x.eq('archivado', false))]);
            [['noticias', n], ['cruce', c], ['casos', k]].forEach(([id, r]) => { const el = document.querySelector(`[data-stat="${id}"]`); if (el && r.count != null) contar(el, r.count); });
        } catch (e) { /* sin sesión todavía o tablas sin crear */ }
    }
    window.menuActivar = () => { size(); stats(); };
    setTimeout(stats, 900); setTimeout(stats, 3000);
})();
