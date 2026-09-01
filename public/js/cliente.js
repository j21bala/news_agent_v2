// Lógica de "Cruce Masivo": preview de imágenes documentales y envío a /api/analizar-cliente

let clienteImagenes = []; // { id, base64, nombre, mimeType }
let clienteImgCount = 0;

function leerArchivoBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]); // sin el prefijo data:...;base64,
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

window.mostrarPreviewImagenes = async function () {
    const input = document.getElementById('clienteImagenes');
    const cont = document.getElementById('preview-imagenes');
    if (!input || !cont || !input.files || input.files.length === 0) return;

    const disponibles = 6 - clienteImagenes.length;
    if (disponibles <= 0) {
        alert('Ya alcanzaste el máximo de 6 imágenes. Quita alguna para agregar otra.');
        input.value = '';
        return;
    }

    const archivos = Array.from(input.files).slice(0, disponibles);
    if (input.files.length > archivos.length) {
        alert(`Solo se agregaron ${archivos.length} imagen(es): el máximo es 6 en total.`);
    }

    for (const file of archivos) {
        try {
            const base64 = await leerArchivoBase64(file);
            clienteImgCount++;
            const id = clienteImgCount;
            clienteImagenes.push({ id, base64, nombre: file.name, mimeType: file.type || 'image/jpeg' });

            const div = document.createElement('div');
            div.id = `img-cliente-${id}`;
            div.className = 'relative w-24 h-24 rounded-xl overflow-hidden border border-slate-200 shadow-sm group';
            div.innerHTML = `
                <img src="data:${file.type || 'image/jpeg'};base64,${base64}" class="w-full h-full object-cover" alt="${file.name}">
                <button type="button" onclick="window.quitarImagenCliente(${id})" class="absolute top-1 right-1 w-5 h-5 bg-navy/80 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            `;
            cont.appendChild(div);
        } catch (e) {
            console.error('Error leyendo imagen', e);
        }
    }
    input.value = ''; // permite volver a elegir el mismo archivo si lo quitó y lo quiere reagregar
};

window.quitarImagenCliente = function (id) {
    clienteImagenes = clienteImagenes.filter(img => img.id !== id);
    document.getElementById(`img-cliente-${id}`)?.remove();
};

window.analizarCliente = async function () {
    const btn = document.getElementById('btnAnalizarCliente');
    const status = document.getElementById('status-cliente');

    if (clienteImagenes.length === 0) {
        alert('Agrega al menos una imagen documental.');
        return;
    }

    if (btn) { btn.disabled = true; btn.classList.add('opacity-50'); }
    if (status) status.innerHTML = '<i class="fa-solid fa-spinner fa-spin text-purple-600"></i> Analizando documentos...';

    try {
        const res = await fetch('/api/analizar-cliente', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imagenes: clienteImagenes.map(i => ({ data: i.base64, mimeType: i.mimeType })) })
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || 'Error en el servidor');
        }
        const data = await res.json();
        renderDashboardCliente(data);
    } catch (e) {
        alert(`Error analizando documentos: ${e.message}`);
    } finally {
        if (btn) { btn.disabled = false; btn.classList.remove('opacity-50'); }
        if (status) status.textContent = '';
    }
};

function fmtMoneda(v) {
    return typeof v === 'number'
        ? v.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
        : '—';
}

function campoCliente(etiqueta, valor) {
    const v = (valor === null || valor === undefined || valor === '') ? '—' : valor;
    return `<div><span class="block text-[11px] uppercase tracking-wide text-slate-400 font-semibold">${etiqueta}</span><span class="text-slate-800 font-medium">${v}</span></div>`;
}

function renderDashboardCliente(data) {
    const resultado = document.getElementById('dashboard-resultado');
    if (!resultado) return;

    const cliente = data.cliente || {};
    const score = typeof data.score_riesgo === 'number' ? data.score_riesgo : null;

    // --- Score circular con semáforo ---
    const circulo = document.getElementById('dash-score-circulo');
    const nivelBadge = document.getElementById('dash-nivel-riesgo');
    if (circulo) {
        let color = '#6b7280', bg = '#f1f5f9';
        if (score !== null) {
            if (score >= 70) { color = '#2e7d32'; bg = '#eafaf0'; }
            else if (score >= 40) { color = '#b9770e'; bg = '#fff7e6'; }
            else { color = '#b3261e'; bg = '#fdecea'; }
        }
        circulo.style.borderColor = color;
        circulo.style.color = color;
        circulo.style.background = bg;
        circulo.textContent = score !== null ? score : '—';
    }
    if (nivelBadge) {
        const nivel = cliente.nivel_riesgo || (score !== null ? (score >= 70 ? 'BAJO' : score >= 40 ? 'MEDIO' : 'ALTO') : '—');
        const nivelUp = String(nivel).toUpperCase();
        const clases = nivelUp.includes('ALT') ? 'bg-red-100 text-red-700'
            : nivelUp.includes('MED') ? 'bg-amber-100 text-amber-700'
            : nivelUp.includes('BAJ') ? 'bg-green-100 text-green-700'
            : 'bg-slate-100 text-slate-600';
        nivelBadge.className = `text-xs font-bold px-3 py-1 rounded-full uppercase ${clases}`;
        nivelBadge.textContent = `Riesgo ${nivelUp}`;
    }

    // --- Narrativa ---
    const narrativa = document.getElementById('dash-narrativa');
    if (narrativa) narrativa.textContent = data.analisis_narrativo || 'Sin análisis narrativo disponible.';

    // --- Datos generales del cliente ---
    const info = document.getElementById('dash-cliente-info');
    if (info) {
        info.innerHTML = [
            campoCliente('Nombre', cliente.nombre),
            campoCliente('Identificación', cliente.identificacion ? `${cliente.tipo_id || ''} ${cliente.identificacion}`.trim() : null),
            campoCliente('Fecha de nacimiento', cliente.fecha_nacimiento),
            campoCliente('Edad', cliente.edad),
            campoCliente('Género', cliente.genero),
            campoCliente('Lugar de nacimiento', cliente.lugar_nacimiento),
            campoCliente('Estado civil', cliente.estado_civil),
            campoCliente('Profesión', cliente.profesion),
            campoCliente('Actividad económica', cliente.actividad_economica),
            campoCliente('Dirección', cliente.direccion),
            campoCliente('Teléfono', cliente.telefono),
            campoCliente('Segmento', cliente.segmento),
            campoCliente('Capacidad económica', cliente.capacidad_economica),
            campoCliente('¿Es PEP?', cliente.es_pep === true ? 'Sí' : cliente.es_pep === false ? 'No' : null),
        ].join('');
    }

    // --- Indicadores financieros ---
    const financiero = document.getElementById('dash-financiero');
    if (financiero) {
        const items = [
            ['Ingresos', data.ingresos_calculados],
            ['Egresos', data.egresos_calculados],
            ['Activos', data.valor_activos],
            ['Pasivos', data.valor_pasivos],
        ];
        financiero.innerHTML = items.map(([label, val]) => `
            <div class="panel-cristal p-4 rounded-2xl border border-slate-200/70 text-center">
                <span class="block text-[11px] uppercase tracking-wide text-slate-400 font-semibold mb-1">${label}</span>
                <span class="block text-navy font-bold text-sm">${fmtMoneda(val)}</span>
            </div>`).join('');
    }

    // --- Productos ---
    const productosBody = document.getElementById('dash-productos');
    if (productosBody) {
        const productos = data.productos || [];
        productosBody.innerHTML = productos.length
            ? productos.map(p => `<tr class="border-t border-slate-100"><td class="p-2 font-semibold text-navy">${p.tipo || '—'}</td><td class="p-2">${p.numero || '—'}</td><td class="p-2 text-slate-500">${p.detalle || '—'}</td></tr>`).join('')
            : '<tr><td class="p-3 text-slate-400 text-center" colspan="3">Sin productos identificados.</td></tr>';
    }

    // --- Movimientos ---
    const movimientosBody = document.getElementById('dash-movimientos');
    if (movimientosBody) {
        const movimientos = data.movimientos || [];
        movimientosBody.innerHTML = movimientos.length
            ? movimientos.map(m => {
                const esCredito = (m.naturaleza || '').toLowerCase().startsWith('cred');
                const colorValor = esCredito ? 'text-green-600' : 'text-red-600';
                return `<tr class="border-t border-slate-100"><td class="p-2">${m.fecha || '—'}</td><td class="p-2 text-slate-600">${m.descripcion || '—'}</td><td class="p-2 text-right font-semibold ${colorValor}">${fmtMoneda(m.valor)}</td></tr>`;
            }).join('')
            : '<tr><td class="p-3 text-slate-400 text-center" colspan="3">Sin movimientos identificados.</td></tr>';
    }

    // --- Alertas ---
    const alertas = document.getElementById('dash-alertas');
    if (alertas) {
        const lista = data.alertas || [];
        alertas.innerHTML = lista.length
            ? lista.map(a => `<li>${a}</li>`).join('')
            : '<li class="text-slate-400 list-none pl-0">Sin alertas detectadas.</li>';
    }

    resultado.classList.remove('hidden');
    resultado.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
