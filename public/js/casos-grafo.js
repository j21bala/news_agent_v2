// Casos — Mapa de vínculos: grafo interactivo con física, rutas, filtros y ficha editable.
(function () {
    const { esc, T_NODO, T_VINC, RIESGO, uid } = CS;
    const rk = r => (RIESGO[r] || RIESGO.na)[1];
    const fotoUrl = value => {
        const raw = String(value || '').trim();
        if (!raw) return '';
        try {
            const url = new URL(raw, window.location.href);
            const sameOriginHttp = url.protocol === 'http:' && url.origin === window.location.origin;
            if ((url.protocol !== 'https:' && !sameOriginHttp) || url.username || url.password) return '';
            return url.href;
        } catch { return ''; }
    };

    CS.tabs.mapa = el => {
        const d = CS.d(); let v = d.vista || { x: 0, y: 0, k: .8 }, modo = null, pend = null, ruta = null, q = '', ocultos = {}, anim = null;
        el.innerHTML = `<div class="cs-map"><div class="cs-stage" id="g-stage">
            <div class="cs-tools"><button class="cs-btn" data-add="persona">+ Persona</button><button class="cs-btn" data-add="empresa">+ Empresa</button>
              <select class="cs-in" id="g-mas" style="width:auto"><option value="">+ Otro…</option>${Object.entries(T_NODO).filter(([k]) => k !== 'persona' && k !== 'empresa').map(([k, t]) => `<option value="${k}">${t.n}</option>`).join('')}</select>
              <button class="cs-btn" id="g-link" title="Clic en origen y luego en destino"><i class="fa-solid fa-link"></i> Vincular</button>
              <button class="cs-btn" id="g-path" title="Ruta más corta entre dos sujetos"><i class="fa-solid fa-route"></i> Ruta</button>
              <button class="cs-btn" id="g-org"><i class="fa-solid fa-wand-magic-sparkles"></i> Organizar</button><button class="cs-btn" id="g-fit"><i class="fa-solid fa-expand"></i> Ajustar</button>
              <button class="cs-btn" id="g-svg" title="Descargar SVG"><i class="fa-solid fa-image"></i></button><input class="cs-in" id="g-q" placeholder="Buscar en el mapa…"></div>
            <svg id="g-svg-el"></svg><div class="cs-legend" id="g-leg"></div>
            <div class="cs-hint">Arrastra el fondo · rueda = zoom · clic = ficha<br><span id="g-msg"></span></div></div>
            <aside class="cs-card cs-insp" id="g-insp"></aside></div>`;
        const svg = el.querySelector('#g-svg-el'), stage = el.querySelector('#g-stage'), nod = id => d.nodos.find(n => n.id === id);
        const msg = t => el.querySelector('#g-msg').textContent = t || '';

        // posiciones iniciales (anillos) para nodos sin coordenadas
        const colocar = () => { const sin = d.nodos.filter(n => n.x == null); sin.forEach((n, i) => { const a = i * 2.4, r = 140 + 34 * Math.sqrt(i + d.nodos.length - sin.length); n.x = 600 + r * Math.cos(a); n.y = 400 + r * Math.sin(a); }); if (sin.length) CS.dirty('nodos'); };
        const vecinos = id => { const s = new Set([id]); d.vinculos.forEach(e => { if (e.de === id) s.add(e.a); if (e.a === id) s.add(e.de); }); return s; };

        function dibujar() {
            const s = CS.sel, foco = s?.k === 'n' ? vecinos(s.id) : null, hit = q ? d.nodos.filter(n => (n.nombre + n.doc + n.rol).toLowerCase().includes(q)).map(n => n.id) : null;
            const vis = n => !ocultos[n.tipo]; let h = `<defs>${Object.entries(T_VINC).map(([k, t]) => `<marker id="ar-${k}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="${t[1]}"/></marker>`).join('')}${d.nodos.map((n, i) => fotoUrl(n.foto) ? `<clipPath id="node-photo-${i}"><circle r="26"/></clipPath>` : '').join('')}<filter id="glow"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><g transform="translate(${v.x},${v.y}) scale(${v.k})">`;
            d.vinculos.forEach(e => { const a = nod(e.de), b = nod(e.a); if (!a || !b || !vis(a) || !vis(b)) return;
                const t = T_VINC[e.tipo] || T_VINC.otro, dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, x1 = a.x + ux * 34, y1 = a.y + uy * 34, x2 = b.x - ux * 38, y2 = b.y - uy * 38;
                const enR = ruta && ruta.es.has(e.id), sel = s?.k === 'e' && s.id === e.id, op = foco ? (foco.has(e.de) && foco.has(e.a) ? 1 : .08) : ruta ? (enR ? 1 : .12) : .85;
                h += `<g class="cs-edge" data-e="${e.id}" opacity="${op}"><line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${enR ? '#fff' : t[1]}" stroke-width="${sel || enR ? 4 : 2}" ${e.tipo === 'otro' ? 'stroke-dasharray="6 4"' : ''} marker-end="url(#ar-${e.tipo in T_VINC ? e.tipo : 'otro'})"/><line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="transparent" stroke-width="16"/>
                <text x="${(x1 + x2) / 2}" y="${(y1 + y2) / 2 - 5}" text-anchor="middle" font-size="10.5" fill="#cbd5e1" paint-order="stroke" stroke="#0a1426" stroke-width="3">${esc(e.etq || t[0])}</text></g>`; });
            d.nodos.forEach((n, idx) => { if (!vis(n)) return; const t = T_NODO[n.tipo] || T_NODO.persona, sel = s?.k === 'n' && s.id === n.id, enR = ruta && ruta.ns.has(n.id);
                const op = foco ? (foco.has(n.id) ? 1 : .12) : ruta ? (enR ? 1 : .15) : hit ? (hit.includes(n.id) ? 1 : .15) : 1, r = 30;
                const photo = fotoUrl(n.foto);
                h += `<g class="cs-node" data-n="${n.id}" transform="translate(${n.x},${n.y})" opacity="${op}" ${sel || (hit && hit.includes(n.id)) ? 'filter="url(#glow)"' : ''}>
                  <circle r="${r + 5}" fill="none" stroke="${rk(n.riesgo)}" stroke-width="${n.riesgo === 'alto' ? 3 : 1.6}" ${n.riesgo === 'na' ? 'stroke-dasharray="3 4"' : ''} opacity=".9"/>
                  <circle r="${r}" fill="#111f38"/>
                  ${photo ? `<text data-avatar-fallback="${idx}" text-anchor="middle" y="7" font-family="'Font Awesome 6 Free'" font-weight="900" font-size="22" fill="${t.c}" style="display:none">${t.i}</text><image data-avatar="${idx}" href="${esc(photo)}" referrerpolicy="no-referrer" x="${-(r - 4)}" y="${-(r - 4)}" width="${(r - 4) * 2}" height="${(r - 4) * 2}" preserveAspectRatio="xMidYMid slice" clip-path="url(#node-photo-${idx})"/>` : `<text text-anchor="middle" y="7" font-family="'Font Awesome 6 Free'" font-weight="900" font-size="22" fill="${t.c}">${t.i}</text>`}
                  <circle r="${r}" fill="none" stroke="${sel ? '#fff' : t.c}" stroke-width="${sel ? 4 : 2.5}"/>
                  ${n.pep ? `<g transform="translate(${r * .75},${-r * .75})"><rect x="-13" y="-8" width="26" height="15" rx="7" fill="#c9a227"/><text text-anchor="middle" y="3" font-size="9" font-weight="800" fill="#111">PEP</text></g>` : ''}
                  ${n.banco ? `<g transform="translate(${-r * .8},${r * .8})"><circle r="8" fill="#16a34a"/><text y="3" font-size="9" font-weight="800" fill="#fff" text-anchor="middle">B</text></g>` : ''}
                  ${n.fid ? `<g transform="translate(${r * .8},${r * .8})"><circle r="8" fill="#2563eb"/><text y="3" font-size="9" font-weight="800" fill="#fff" text-anchor="middle">F</text></g>` : ''}
                  <text text-anchor="middle" y="${r + 22}" font-size="12.5" font-weight="600" fill="#e2e8f0" paint-order="stroke" stroke="#0a1426" stroke-width="4">${esc(n.nombre.length > 24 ? n.nombre.slice(0, 23) + '…' : n.nombre)}</text></g>`; });
            svg.innerHTML = h + '</g>';
            svg.querySelectorAll('image[data-avatar]').forEach(image => image.addEventListener('error', () => {
                image.remove();
                const fallback = svg.querySelector(`[data-avatar-fallback="${image.dataset.avatar}"]`);
                if (fallback) fallback.style.display = '';
            }, { once: true }));
        }
        function leyenda() { el.querySelector('#g-leg').innerHTML = Object.entries(T_NODO).filter(([k]) => d.nodos.some(n => n.tipo === k)).map(([k, t]) => `<button data-o="${k}" style="--c:${t.c};opacity:${ocultos[k] ? .35 : 1}">${t.n}</button>`).join(''); }
        const centrar = () => { const ns = d.nodos.filter(n => n.x != null); if (!ns.length) return; const r = svg.getBoundingClientRect(), xs = ns.map(n => n.x), ys = ns.map(n => n.y), w = Math.max(...xs) - Math.min(...xs) + 240, h = Math.max(...ys) - Math.min(...ys) + 240;
            v.k = Math.min(1.4, Math.max(.2, Math.min(r.width / w, r.height / h))); v.x = r.width / 2 - ((Math.max(...xs) + Math.min(...xs)) / 2) * v.k; v.y = r.height / 2 - ((Math.max(...ys) + Math.min(...ys)) / 2) * v.k; dibujar(); };

        // Física (Fruchterman–Reingold simplificado), animada
        function organizar() { cancelAnimationFrame(anim); const ns = d.nodos; if (ns.length < 2) return; let it = 0, K = 150 + Math.sqrt(ns.length) * 10;
            ns.forEach(n => { if (n.x == null) { n.x = 600 + Math.random() * 100; n.y = 400 + Math.random() * 100; } });
            const paso = () => { const f = new Map(ns.map(n => [n.id, [0, 0]]));
                for (let i = 0; i < ns.length; i++) for (let j = i + 1; j < ns.length; j++) { const a = ns[i], b = ns[j]; let dx = a.x - b.x, dy = a.y - b.y, L = Math.hypot(dx, dy) || .1, F = K * K / L; dx /= L; dy /= L; f.get(a.id)[0] += dx * F; f.get(a.id)[1] += dy * F; f.get(b.id)[0] -= dx * F; f.get(b.id)[1] -= dy * F; }
                d.vinculos.forEach(e => { const a = nod(e.de), b = nod(e.a); if (!a || !b) return; let dx = a.x - b.x, dy = a.y - b.y, L = Math.hypot(dx, dy) || .1, F = L * L / K; dx /= L; dy /= L; f.get(a.id)[0] -= dx * F; f.get(a.id)[1] -= dy * F; f.get(b.id)[0] += dx * F; f.get(b.id)[1] += dy * F; });
                const T = 40 * (1 - it / 140) + 1; ns.forEach(n => { const [fx, fy] = f.get(n.id), L = Math.hypot(fx, fy) || 1; n.x += fx / L * Math.min(L, T) + (600 - n.x) * .004; n.y += fy / L * Math.min(L, T) + (400 - n.y) * .004; });
                dibujar(); if (++it < 140) anim = requestAnimationFrame(paso); else { CS.dirty('nodos'); centrar(); } };
            paso(); }

        // Ruta más corta (BFS, vínculos no dirigidos)
        function rutaEntre(a, b) { const prev = { [a]: null }, qq = [a]; while (qq.length) { const c = qq.shift(); if (c === b) break; d.vinculos.forEach(e => { const o = e.de === c ? e.a : e.a === c ? e.de : null; if (o && !(o in prev)) { prev[o] = { c, e: e.id }; qq.push(o); } }); }
            if (!(b in prev)) return null; const ns = new Set([b]), es = new Set(); let c = b; while (prev[c]) { es.add(prev[c].e); ns.add(prev[c].c); c = prev[c].c; } return { ns, es, saltos: es.size }; }

        // Ficha lateral
        function ficha() {
            const box = el.querySelector('#g-insp'), s = CS.sel;
            if (!s) { box.innerHTML = `<h3><i class="fa-solid fa-circle-info"></i> Ficha</h3><p class="cs-mu cs-sm">Selecciona un sujeto o un vínculo para editarlo.<br><br><b>Tips</b><br>• “Vincular”: clic en origen y luego destino.<br>• “Ruta”: descubre cómo se conectan dos sujetos.<br>• “Organizar” ordena el mapa por física de fuerzas.<br>• Al seleccionar, se resaltan sus conexiones.</p>`; return; }
            if (s.k === 'e') { const i = d.vinculos.findIndex(e => e.id === s.id), e = d.vinculos[i]; if (!e) return;
                box.innerHTML = `<h3><i class="fa-solid fa-link"></i> Vínculo</h3><p class="cs-sm"><b>${esc(CS.nombreNodo(e.de))}</b> → <b>${esc(CS.nombreNodo(e.a))}</b></p><div class="cs-grid">${CS.f('Tipo', `vinculos.${i}.tipo`, { t: 'sel', o: Object.entries(T_VINC).map(([k, t]) => [k, t[0]]) })}${CS.f('Etiqueta visible', `vinculos.${i}.etq`, { ph: 'Ej. Hijo, 40% acciones, giró $…' })}${CS.f('Valor / porcentaje', `vinculos.${i}.valor`)}${CS.f('Fecha', `vinculos.${i}.fecha`, { t: 'date' })}${CS.f('Soporte / nota', `vinculos.${i}.nota`, { t: 'area', r: 3 })}<button class="cs-btn" id="i-inv">⇄ Invertir dirección</button><button class="cs-btn red" id="i-del">Eliminar vínculo</button></div>`;
                box.querySelector('#i-inv').onclick = () => { [e.de, e.a] = [e.a, e.de]; CS.dirty('vinculos'); ficha(); dibujar(); }; box.querySelector('#i-del').onclick = () => { d.vinculos.splice(i, 1); CS.sel = null; CS.dirty('vinculos'); ficha(); dibujar(); }; return; }
            const i = d.nodos.findIndex(n => n.id === s.id), n = d.nodos[i]; if (!n) return; const t = T_NODO[n.tipo] || T_NODO.persona, ps = n.tipo === 'persona';
            const rel = d.vinculos.filter(e => e.de === n.id || e.a === n.id);
            box.innerHTML = `<h3 style="color:${t.c}"><i class="fa-solid fa-id-badge"></i> ${t.n}</h3><div class="cs-grid">
              ${CS.f('Nombre / razón social', `nodos.${i}.nombre`)}<div class="cs-grid g2">${CS.f('Tipo', `nodos.${i}.tipo`, { t: 'sel', o: Object.entries(T_NODO).map(([k, x]) => [k, x.n]) })}${CS.f('Riesgo', `nodos.${i}.riesgo`, { t: 'sel', o: Object.entries(RIESGO).map(([k, x]) => [k, x[0]]) })}</div>
              <div class="cs-grid g2">${CS.f('Documento / NIT', `nodos.${i}.doc`)}${CS.f('Rol en el caso', `nodos.${i}.rol`, { ph: 'Titular, beneficiario…' })}</div>
              <div class="cs-row">${ps ? CS.f('PEP', `nodos.${i}.pep`, { t: 'chk' }) : ''}${CS.f('Cliente banco', `nodos.${i}.banco`, { t: 'chk' })}${CS.f('Cliente fiduciaria', `nodos.${i}.fid`, { t: 'chk' })}</div>
              ${CS.f('Foto del nodo (URL HTTPS)', `nodos.${i}.foto`, { ph: 'https://sitio.com/foto.jpg' })}<p class="cs-sm cs-mu">La imagen debe ser accesible desde el navegador. Se muestra dentro del círculo del nodo.</p>
              ${CS.f('Descripción', `nodos.${i}.desc`, { t: 'area' })}${CS.f('Señales de alerta', `nodos.${i}.flags`, { t: 'area', r: 2 })}${CS.f('Evidencia / fuente', `nodos.${i}.src`, { t: 'area', r: 2 })}
              <details><summary class="cs-sm" style="cursor:pointer;color:var(--ac);font-weight:600">Productos del titular (${(n.prods || []).length})</summary><div class="cs-grid" style="margin-top:8px">${(n.prods || []).map((p, j) => `<div class="cs-grid g2" style="border:1px solid var(--bd);border-radius:10px;padding:8px">${CS.f('Tipo', `nodos.${i}.prods.${j}.tipo`)}${CS.f('N.º', `nodos.${i}.prods.${j}.numero`)}${CS.f('Apertura', `nodos.${i}.prods.${j}.apertura`, { t: 'date' })}${CS.f('Estado', `nodos.${i}.prods.${j}.estado`)}${CS.f('Oficina', `nodos.${i}.prods.${j}.oficina`)}${CS.f('Saldo', `nodos.${i}.prods.${j}.saldo`, { t: 'number' })}<button class="cs-btn sm red" data-pd="${j}">Quitar</button></div>`).join('')}<button class="cs-btn sm" id="i-pa">+ Producto</button></div></details>
              ${ps ? `<details><summary class="cs-sm" style="cursor:pointer;color:var(--ac);font-weight:600">Formulario de vinculación (SARLAFT)</summary><div class="cs-grid g2" style="margin-top:8px">${CS.FICHA.map(([k, l, ty]) => CS.f(l, `nodos.${i}.ficha.${k}`, { t: ty || 'text' })).join('')}</div></details>` : ''}
              <div><div class="cs-sm cs-mu" style="margin-bottom:6px;font-weight:600;text-transform:uppercase;letter-spacing:.06em">Vínculos (${rel.length})</div>${rel.map(e => { const o = e.de === n.id ? e.a : e.de; return `<div class="cs-row between cs-sm" style="margin-bottom:5px"><span style="cursor:pointer" data-go="${e.id}"><span style="color:${(T_VINC[e.tipo] || T_VINC.otro)[1]}">●</span> ${e.de === n.id ? '→' : '←'} ${esc(CS.nombreNodo(o))} <span class="cs-mu">(${esc(e.etq || (T_VINC[e.tipo] || T_VINC.otro)[0])})</span></span></div>`; }).join('') || '<span class="cs-mu cs-sm">Sin vínculos. Usa “Vincular”.</span>'}</div>
              <button class="cs-btn red" id="i-del">Eliminar sujeto</button></div>`;
            box.querySelector('#i-pa').onclick = () => { (n.prods = n.prods || []).push({ tipo: '', numero: '', apertura: '', estado: '', oficina: '', saldo: '' }); CS.dirty('nodos'); ficha(); };
            box.querySelectorAll('[data-pd]').forEach(b => b.onclick = () => { n.prods.splice(+b.dataset.pd, 1); CS.dirty('nodos'); ficha(); });
            box.querySelectorAll('[data-go]').forEach(b => b.onclick = () => { CS.sel = { k: 'e', id: b.dataset.go }; ficha(); dibujar(); });
            box.querySelector('#i-del').onclick = () => { if (!confirm(`¿Eliminar a ${n.nombre} y sus vínculos?`)) return; CS.delNodo(n.id); CS.sel = null; ficha(); dibujar(); leyenda(); };
        }
        CS.hooks.push(p => { if (p.startsWith('nodos') || p.startsWith('vinculos')) { dibujar(); leyenda(); if (/\.(nombre|tipo)$/.test(p) === false) return; } });

        // Interacción
        let drag = null;
        svg.addEventListener('pointerdown', e => { const g = e.target.closest('.cs-node'), ed = e.target.closest('.cs-edge'); drag = { n: g && nod(g.dataset.n), e: ed?.dataset.e, sx: e.clientX, sy: e.clientY, ox: v.x, oy: v.y, mv: 0 }; if (drag.n) { drag.nx = drag.n.x; drag.ny = drag.n.y; } svg.setPointerCapture(e.pointerId); });
        svg.addEventListener('pointermove', e => { if (!drag) return; const dx = e.clientX - drag.sx, dy = e.clientY - drag.sy; drag.mv = Math.abs(dx) + Math.abs(dy); if (drag.mv < 4) return; if (drag.n) { drag.n.x = drag.nx + dx / v.k; drag.n.y = drag.ny + dy / v.k; } else { v.x = drag.ox + dx; v.y = drag.oy + dy; } dibujar(); });
        svg.addEventListener('pointerup', () => { if (!drag) return; const o = drag; drag = null; d.vista = v;
            if (o.mv >= 4) { if (o.n) CS.dirty('nodos.pos'); return; }
            if (o.n) { if (modo === 'link') { if (!pend) { pend = o.n.id; msg('Elige el sujeto destino…'); } else if (pend !== o.n.id) { const e = { id: uid(), de: pend, a: o.n.id, tipo: 'otro', etq: '', valor: '', fecha: '', nota: '' }; d.vinculos.push(e); pend = null; modo = null; el.querySelector('#g-link').classList.remove('on'); msg(''); CS.sel = { k: 'e', id: e.id }; CS.dirty('vinculos'); } }
                else if (modo === 'path') { if (!pend) { pend = o.n.id; msg('Elige el segundo sujeto…'); } else { ruta = rutaEntre(pend, o.n.id); msg(ruta ? `Ruta: ${ruta.saltos} salto(s)` : 'Sin conexión entre ambos'); pend = null; } }
                else CS.sel = { k: 'n', id: o.n.id }; }
            else if (o.e) CS.sel = { k: 'e', id: o.e }; else { CS.sel = null; ruta = null; msg(''); }
            ficha(); dibujar(); });
        svg.addEventListener('wheel', e => { e.preventDefault(); const r = svg.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top, k = Math.min(3, Math.max(.2, v.k * (e.deltaY < 0 ? 1.1 : .9))); v.x = mx - (mx - v.x) * k / v.k; v.y = my - (my - v.y) * k / v.k; v.k = k; dibujar(); }, { passive: false });
        const modoBtn = m => { modo = modo === m ? null : m; pend = null; ruta = null; el.querySelector('#g-link').classList.toggle('on', modo === 'link'); el.querySelector('#g-path').classList.toggle('on', modo === 'path'); msg(modo === 'link' ? 'Elige el sujeto origen…' : modo === 'path' ? 'Elige el primer sujeto…' : ''); dibujar(); };
        el.querySelector('#g-link').onclick = () => modoBtn('link'); el.querySelector('#g-path').onclick = () => modoBtn('path');
        el.querySelector('#g-org').onclick = organizar; el.querySelector('#g-fit').onclick = centrar;
        el.querySelector('#g-q').oninput = e => { q = e.target.value.toLowerCase(); dibujar(); };
        el.querySelector('#g-leg').onclick = e => { const b = e.target.closest('[data-o]'); if (b) { ocultos[b.dataset.o] = !ocultos[b.dataset.o]; leyenda(); dibujar(); } };
        const add = tipo => { const n = CS.addNodo(tipo); const r = svg.getBoundingClientRect(); n.x = (r.width / 2 - v.x) / v.k + (Math.random() - .5) * 120; n.y = (r.height / 2 - v.y) / v.k + (Math.random() - .5) * 120; CS.sel = { k: 'n', id: n.id }; ficha(); dibujar(); leyenda(); setTimeout(() => el.querySelector('[data-p$=".nombre"]')?.select(), 30); };
        stage.querySelectorAll('[data-add]').forEach(b => b.onclick = () => add(b.dataset.add));
        el.querySelector('#g-mas').onchange = e => { if (e.target.value) add(e.target.value); e.target.value = ''; };
        el.querySelector('#g-svg').onclick = () => { CS.audit('exportar_mapa'); const c = svg.cloneNode(true); c.setAttribute('xmlns', 'http://www.w3.org/2000/svg'); c.setAttribute('style', 'background:#0a1020'); c.setAttribute('width', 1600); c.setAttribute('height', 1000); CS.dl(new Blob([c.outerHTML], { type: 'image/svg+xml' }), `${d.meta.numero}_mapa.svg`); };
        window.addEventListener('resize', dibujar, { once: true });

        colocar(); leyenda(); ficha();
        if (d.vista) dibujar(); else { dibujar(); setTimeout(centrar, 30); }
    };
})();
