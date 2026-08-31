let reportes = [];
let noticiaCount = 0;
let contextoReporteActual = null;

window.navegarA = function(idVista) {
    const vistas = ['view-menu', 'view-noticias', 'view-reporte', 'view-ros', 'view-cliente'];
    vistas.forEach(vista => {
        const el = document.getElementById(vista);
        if (el) el.classList.add('hidden');
    });
    const destino = document.getElementById(idVista);
    if (destino) {
        destino.classList.remove('hidden');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
};

document.addEventListener("DOMContentLoaded", () => {
    const container = document.getElementById('noticias-container');
    if (container && container.children.length === 0) {
        window.agregarNoticia();
    }
});

window.agregarNoticia = function() {
    noticiaCount++;
    const id = noticiaCount;
    const container = document.getElementById('noticias-container');
    if (!container) return;

    const div = document.createElement('div');
    // CLASE CLAVE: Añadido 'noticia-item' para que el selector la encuentre siempre
    div.className = 'noticia-item bg-slate-50 border border-slate-200 rounded-lg p-5 mb-4';
    div.id = `noticia-${id}`;
    div.innerHTML = `
        <div class="flex justify-between items-center mb-3">
            <span class="font-bold text-sm text-navy">Fuente ${id}</span>
            ${id > 1 ? `<button onclick="window.eliminarNoticia(${id})" class="text-red-500 text-xs hover:underline font-bold"><i class="fa-solid fa-trash"></i> Quitar</button>` : ''}
        </div>
        <input type="text" id="link-${id}" class="w-full border border-slate-300 rounded-md px-3 py-2 text-sm mb-3 focus:outline-none focus:border-teal" placeholder="Enlace web de la noticia (opcional)">
        <textarea id="articulo-${id}" class="w-full border border-slate-300 rounded-md px-3 py-2 text-sm h-32 focus:outline-none focus:border-teal" placeholder="Pega el texto completo de la noticia aquí..."></textarea>
    `;
    container.appendChild(div);
};

window.eliminarNoticia = function(id) {
    document.getElementById(`noticia-${id}`)?.remove();
};

window.analizarTodas = async function() {
    const btn = document.getElementById('btnAnalizar');
    const status = document.getElementById('status');
    
    // Selector blindado que busca las cajas de noticias
    const items = document.querySelectorAll('.noticia-item');
    if (items.length === 0) {
        alert('Agrega al menos una noticia.');
        return;
    }

    const noticias = [];
    let valido = true;

    items.forEach(item => {
        const id = item.id.replace('noticia-', '');
        const linkEl = document.getElementById(`link-${id}`);
        const textoEl = document.getElementById(`articulo-${id}`);
        
        const link = linkEl ? linkEl.value.trim() : '';
        const texto = textoEl ? textoEl.value.trim() : '';

        if (!texto) {
            if (textoEl) textoEl.classList.add('border-red-500');
            valido = false;
        } else {
            if (textoEl) textoEl.classList.remove('border-red-500');
            noticias.push({ link, texto });
        }
    });

    if (!valido || noticias.length === 0) {
        alert('Por favor, completa el texto de la noticia en todas las fuentes agregadas.');
        return;
    }

    if (btn) { btn.disabled = true; btn.classList.add('opacity-50'); }
    reportes = [];

    for (let i = 0; i < noticias.length; i++) {
        if (status) status.innerHTML = `<i class="fa-solid fa-spinner fa-spin text-teal"></i> Analizando fuente ${i + 1} de ${noticias.length}...`;
        try {
            const res = await fetch('/api/analizar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ articulos: [noticias[i].texto], link: noticias[i].link })
            });
            if (!res.ok) throw new Error("Error en el servidor");
            const result = await res.json();
            result._link = noticias[i].link;
            reportes.push(result);
        } catch (e) {
            alert(`Error procesando fuente ${i + 1}: ${e.message}`);
            if (btn) { btn.disabled = false; btn.classList.remove('opacity-50'); }
            if (status) status.textContent = '';
            return;
        }
    }

    if (status) status.textContent = '';
    if (btn) { btn.disabled = false; btn.classList.remove('opacity-50'); }
    
    contextoReporteActual = reportes[0];
    
    renderTodosReportes();
    window.navegarA('view-reporte');
    document.getElementById('asistente-flotante').classList.remove('hidden');
};

window.volverNoticias = function() {
    window.navegarA('view-noticias');
    document.getElementById('asistente-flotante').classList.add('hidden');
    document.getElementById('panel-chat').classList.add('hidden');
};

window.toggleChat = function() {
    const panel = document.getElementById('panel-chat');
    if (panel.classList.contains('hidden')) {
        panel.classList.remove('hidden');
        panel.style.display = 'flex';
    } else {
        panel.classList.add('hidden');
        panel.style.display = 'none';
    }
};

function renderTodosReportes() {
    const cont = document.getElementById('reportes-container');
    if (!cont) return;
    cont.innerHTML = '';
    reportes.forEach((data, ri) => {
        const bloque = document.createElement('div');
        bloque.className = 'reporte-bloque mb-10';
        bloque.id = `reporte-${ri}`;
        bloque.innerHTML = buildReporteHTML(data, ri);
        cont.appendChild(bloque);
    });
}

function resaltar(texto) {
    if (!texto) return '';
    return String(texto).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}

function buildReporteHTML(data, ri) {
    const personasHTML = (data.personas || []).map((p, pi) => buildPersonaHTML(p, ri, pi)).join('');
    const iconos = {
        cal: '<i class="fa-solid fa-calendar text-teal mr-1"></i>',
        lug: '<i class="fa-solid fa-location-dot text-teal mr-1"></i>',
        med: '<i class="fa-solid fa-newspaper text-teal mr-1"></i>'
    };
    
    return `
    <div class="cover bg-navy text-white rounded-xl p-8 mb-6 shadow-md" style="-webkit-print-color-adjust: exact; print-color-adjust: exact; background-color: #0f1b2d !important; color: white !important;">
        <h2 class="text-2xl font-extrabold mb-3">${data.titulo || '—'}</h2>
        <div class="meta flex flex-wrap gap-5 text-sm opacity-90">
            <span>${iconos.cal} ${data.fecha || 'No disponible'}</span>
            <span>${iconos.lug} ${data.lugar || 'No disponible'}</span>
            <span>${iconos.med} ${data.medio || 'No disponible'}</span>
        </div>
        ${data._link ? `<div class="mt-4 text-xs opacity-70 break-all"><i class="fa-solid fa-link mr-1"></i> ${data._link}</div>` : ''}
    </div>
    <div class="resumen bg-white border border-slate-200 border-l-4 border-l-gold rounded-lg p-6 mb-6 shadow-sm" style="-webkit-print-color-adjust: exact; print-color-adjust: exact; border-left-color: #c9a227 !important;">
        <h3 class="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Resumen general</h3>
        <p class="text-sm text-navy leading-relaxed">${resaltar(data.resumen)}</p>
        <h3 class="text-xs font-bold text-slate-500 uppercase tracking-widest mt-5 mb-2">Hechos clave</h3>
        <ul class="list-disc pl-5 text-sm text-navy leading-relaxed space-y-1">${(data.hechos_clave || []).map(h => `<li>${resaltar(h)}</li>`).join('')}</ul>
    </div>
    <div id="personas-${ri}">${personasHTML}</div>
    <button class="add-persona-btn no-print mt-2 bg-green-50 text-green-700 border border-green-300 px-4 py-2 rounded-lg text-sm font-bold hover:bg-green-100 transition-colors" onclick="window.agregarPersona(${ri})">+ Agregar involucrado manualmente</button>
    ${buildFuentesHTML(data.fuentes_consultadas)}
    `;
}

function buildFuentesHTML(fuentes) {
    if (!fuentes || fuentes.length === 0) return '';
    const items = fuentes.map(f => `<li class="truncate"><a href="${f}" target="_blank" class="text-teal hover:underline">${f}</a></li>`).join('');
    return `
    <div class="resumen fuentes-consultadas bg-white border border-slate-200 rounded-lg p-6 mt-6 shadow-sm">
        <h3 class="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Fuentes consultadas</h3>
        <ul class="list-disc pl-5 text-sm space-y-1">${items}</ul>
    </div>`;
}

function claseEstadoStyle(estado) {
    const e = String(estado || '').toLowerCase();
    if (e.includes('detenid')) return 'background-color: #b9770e !important; color: white !important;';
    if (e.includes('conden')) return 'background-color: #b3261e !important; color: white !important;';
    if (e.includes('prófug') || e.includes('profug')) return 'background-color: #6b21a8 !important; color: white !important;';
    if (e.includes('fallec')) return 'background-color: #6b7280 !important; color: white !important;';
    if (e.includes('asesin')) return 'background-color: #111827 !important; color: white !important;';
    return 'background-color: #3b5b7a !important; color: white !important;';
}

function filaTablaHTML(tipo, num, bcs, fid, prodbcs, prodfid, estado) {
    const tipoVal = tipo || '<span class="text-slate-400 italic">Pendiente</span>';
    const numVal = num || '<span class="text-slate-400 italic">Pendiente</span>';
    const bcsVal = bcs ? '<span class="font-bold text-green-700">✓ Sí</span>' : '<span class="text-slate-500">No</span>';
    const fidVal = fid ? '<span class="font-bold text-green-700">✓ Sí</span>' : '<span class="text-slate-500">No</span>';
    const estadoTxt = estado || 'Investigado';
    return `
    <tr class="bg-white border-b">
        <td class="p-2 border font-semibold text-navy">${tipoVal}</td>
        <td class="p-2 border text-navy">${numVal}</td>
        <td class="p-2 border">${bcsVal}</td>
        <td class="p-2 border text-navy">${prodbcs || '—'}</td>
        <td class="p-2 border">${fidVal}</td>
        <td class="p-2 border text-navy">${prodfid || '—'}</td>
        <td class="p-2 border text-center"><span class="px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider" style="-webkit-print-color-adjust: exact; print-color-adjust: exact; ${claseEstadoStyle(estadoTxt)}">${estadoTxt}</span></td>
    </tr>`;
}

function buildPersonaHTML(p, ri, pi) {
    const nivelRaw = String(p.nivel_riesgo_sugerido || 'medio').toLowerCase().trim();
    let badgeStyle = 'background-color: #b9770e !important; color: white !important;';
    if (nivelRaw === 'alto') badgeStyle = 'background-color: #b3261e !important; color: white !important;';
    if (nivelRaw === 'bajo') badgeStyle = 'background-color: #2e7d32 !important; color: white !important;';
    
    return `
    <div class="persona-card bg-white border border-slate-200 rounded-xl p-6 mb-5 shadow-sm break-inside-avoid" id="persona-${ri}-${pi}" data-estado="${p.estado_proceso || 'Investigado'}">
        <div class="flex justify-between items-start mb-4">
            <div class="flex gap-4 items-center">
                <div class="w-12 h-12 rounded-full bg-navy text-white flex items-center justify-center shadow" style="-webkit-print-color-adjust: exact; print-color-adjust: exact; background-color: #0f1b2d !important;"><i class="fa-solid fa-user"></i></div>
                <div>
                    <div class="font-bold text-lg text-navy" id="nombre-display-${ri}-${pi}">${p.nombre || 'Sin identificar'}</div>
                    <div class="text-xs text-slate-500">${p.cargo_o_actividad || ''}</div>
                </div>
            </div>
            <div class="flex gap-3 items-center">
                <span class="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest shadow-sm" style="-webkit-print-color-adjust: exact; print-color-adjust: exact; ${badgeStyle}">${nivelRaw.toUpperCase()}</span>
                <button class="no-print text-red-500 hover:text-red-700 bg-red-50 p-2 rounded" onclick="window.eliminarPersona(${ri}, ${pi})"><i class="fa-solid fa-trash"></i></button>
            </div>
        </div>
        
        <div class="text-sm text-navy mb-5 space-y-2 leading-relaxed">
            <div><strong class="text-slate-800">Hechos / Delitos:</strong> ${resaltar(p.rol_en_hechos)}</div>
            <div><strong class="text-slate-800">Análisis de riesgo:</strong> ${resaltar(p.analisis_riesgo)}</div>
            <div class="text-xs text-slate-500 italic mt-2"><strong class="text-slate-600">¿Por qué este nivel?</strong> ${resaltar(p.justificacion_riesgo) || 'No especificado'}</div>
        </div>

        <div class="tabla-datos mt-4 overflow-x-auto rounded border">
            <table class="w-full text-left text-xs">
                <thead>
                    <tr class="bg-slate-50 text-navy" style="-webkit-print-color-adjust: exact; print-color-adjust: exact; background-color: #f8fafc !important;">
                        <th class="p-2 border">TIPO ID</th><th class="p-2 border">NÚMERO ID</th><th class="p-2 border">CTE BCS</th><th class="p-2 border">PROD BCS</th><th class="p-2 border">CTE FIDU</th><th class="p-2 border">PROD FIDU</th><th class="p-2 border text-center">ESTADO</th>
                    </tr>
                </thead>
                <tbody id="tabla-body-${ri}-${pi}">${filaTablaHTML('', '', false, false, '', '', p.estado_proceso)}</tbody>
            </table>
        </div>

        <div class="recomendacion-box hidden mt-4 bg-amber-50 border-l-4 border-amber-500 p-4 rounded text-sm text-navy shadow-inner" id="recom-display-${ri}-${pi}" style="-webkit-print-color-adjust: exact; print-color-adjust: exact; background-color: #fffbeb !important; border-left-color: #f59e0b !important;"></div>

        <div class="edit-fields no-print bg-slate-50 p-5 rounded-lg border border-slate-200 mt-5 shadow-inner">
            <h4 class="font-bold text-xs text-navy mb-3 uppercase tracking-wider">Completar Debida Diligencia Manual</h4>
            <div class="grid grid-cols-2 gap-4 mb-3">
                <div>
                    <label class="block text-xs font-bold text-slate-600 mb-1">Tipo de identificación *</label>
                    <select id="tipo-${ri}-${pi}" class="w-full border border-slate-300 rounded p-2 text-sm focus:border-navy outline-none" onchange="window.actualizarTabla(${ri},${pi})">
                        <option value="">Seleccionar...</option><option value="?">Desconocido</option><option value="CC">Cédula de Ciudadanía</option><option value= "CE">Cédula de Extranjería</option><option value="NIT">NIT</option><option value="Pasaporte">Pasaporte</option>
                    </select>
                </div>
                <div>
                    <label class="block text-xs font-bold text-slate-600 mb-1">Número de identificación *</label>
                    <input type="text" id="num-${ri}-${pi}" class="w-full border border-slate-300 rounded p-2 text-sm focus:border-navy outline-none" placeholder="Ej. 1000123456" oninput="window.actualizarTabla(${ri},${pi})">
                </div>
            </div>
            <div class="flex gap-6 mb-3 text-sm font-bold text-slate-700">
                <label class="flex items-center gap-2 cursor-pointer"><input type="checkbox" id="bcs-${ri}-${pi}" onchange="window.actualizarTabla(${ri},${pi})"> Cliente Banco (BCS)</label>
                <label class="flex items-center gap-2 cursor-pointer"><input type="checkbox" id="fid-${ri}-${pi}" onchange="window.actualizarTabla(${ri},${pi})"> Cliente Fiduciaria</label>
            </div>
            <div class="grid grid-cols-2 gap-4 mb-3">
                <div>
                    <label class="block text-xs font-bold text-slate-600 mb-1">Productos BCS</label>
                    <input type="text" id="prodbcs-${ri}-${pi}" class="w-full border border-slate-300 rounded p-2 text-sm focus:border-navy outline-none" placeholder="Ej. Cuenta de ahorros" oninput="window.actualizarTabla(${ri},${pi})">
                </div>
                <div>
                    <label class="block text-xs font-bold text-slate-600 mb-1">Productos Fiduciaria</label>
                    <input type="text" id="prodfid-${ri}-${pi}" class="w-full border border-slate-300 rounded p-2 text-sm focus:border-navy outline-none" placeholder="Ej. Fideicomiso X" oninput="window.actualizarTabla(${ri},${pi})">
                </div>
            </div>
            <div class="mb-3">
                <label class="block text-xs font-bold text-slate-600 mb-1">Editar nombre del involucrado</label>
                <input type="text" id="nombre-edit-${ri}-${pi}" value="${p.nombre || ''}" class="w-full border border-slate-300 rounded p-2 text-sm focus:border-navy outline-none" placeholder="Nombre completo" oninput="document.getElementById('nombre-display-${ri}-${pi}').textContent=this.value">
            </div>
            <div>
                <label class="block text-xs font-bold text-slate-600 mb-1">Recomendación del analista para el Comité</label>
                <textarea id="recom-${ri}-${pi}" class="w-full border border-slate-300 rounded p-3 text-sm h-20 focus:border-navy outline-none" placeholder="Escribe tu recomendación..." oninput="window.actualizarRecomendacion(${ri},${pi})"></textarea>
            </div>
        </div>
    </div>`;
}

window.actualizarTabla = function(ri, pi) {
    const tipo = document.getElementById(`tipo-${ri}-${pi}`)?.value || '';
    const num = document.getElementById(`num-${ri}-${pi}`)?.value || '';
    const bcs = document.getElementById(`bcs-${ri}-${pi}`)?.checked || false;
    const fid = document.getElementById(`fid-${ri}-${pi}`)?.checked || false;
    const prodbcs = document.getElementById(`prodbcs-${ri}-${pi}`)?.value || '';
    const prodfid = document.getElementById(`prodfid-${ri}-${pi}`)?.value || '';

    const tbody = document.getElementById(`tabla-body-${ri}-${pi}`);
    const card = document.getElementById(`persona-${ri}-${pi}`);
    if (tbody && card) {
        tbody.innerHTML = filaTablaHTML(tipo, num, bcs, fid, prodbcs, prodfid, card.dataset.estado);
    }
};

window.actualizarRecomendacion = function(ri, pi) {
    const texto = document.getElementById(`recom-${ri}-${pi}`)?.value.trim();
    const disp = document.getElementById(`recom-display-${ri}-${pi}`);
    if (!disp) return;
    if (texto) {
        disp.innerHTML = `<strong class="text-amber-900 block mb-1">Recomendación del analista:</strong> ${texto.replace(/\n/g, '<br>')}`;
        disp.classList.remove('hidden');
        disp.style.display = 'block';
    } else {
        disp.classList.add('hidden');
        disp.style.display = 'none';
    }
};

window.agregarPersona = function(ri) {
    const personaVacia = { nombre: 'Nuevo involucrado', rol_en_hechos: '', cargo_o_actividad: '', analisis_riesgo: '', estado_proceso: 'Investigado', justificacion_riesgo: '', nivel_riesgo_sugerido: 'medio' };
    if (!reportes[ri].personas) reportes[ri].personas = [];
    const pi = reportes[ri].personas.length;
    reportes[ri].personas.push(personaVacia);

    const cont = document.getElementById(`personas-${ri}`);
    const div = document.createElement('div');
    div.innerHTML = buildPersonaHTML(personaVacia, ri, pi);
    cont.appendChild(div.firstElementChild);
};

window.eliminarPersona = function(ri, pi) {
    document.getElementById(`persona-${ri}-${pi}`)?.remove();
};

window.enviarPregunta = async function() {
    const input = document.getElementById('chat-input');
    const pregunta = input.value.trim();
    if (!pregunta) return;
    if (!contextoReporteActual) return alert("Primero debes generar un reporte.");

    const historial = document.getElementById('chat-historial');
    historial.innerHTML += `<div class="self-end bg-navy text-white px-3 py-2 rounded-lg text-xs max-w-[85%] mb-2 shadow-sm">${pregunta}</div>`;
    input.value = '';
    
    const idTemp = 'temp-' + Date.now();
    historial.innerHTML += `<div id="${idTemp}" class="self-start bg-slate-200 text-slate-500 px-3 py-2 rounded-lg text-xs max-w-[85%] mb-2 shadow-sm"><i class="fa-solid fa-ellipsis fa-fade"></i></div>`;
    historial.scrollTop = historial.scrollHeight;

    try {
        const res = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pregunta, contexto: contextoReporteActual })
        });
        const data = await res.json();
        const fuentesHTML = (data.fuentes && data.fuentes.length)
            ? `<div class="mt-2 pt-2 border-t border-slate-100 text-[10px] text-slate-400">Fuentes consultadas: ${data.fuentes.map(f => `<a href="${f}" target="_blank" rel="noopener" class="underline hover:text-teal">${f}</a>`).join(' · ')}</div>`
            : '';
        document.getElementById(idTemp).outerHTML = `<div class="self-start bg-white border border-slate-200 text-navy px-3 py-2 rounded-lg text-xs max-w-[85%] mb-2 shadow-sm">${data.respuesta}${fuentesHTML}</div>`;
    } catch (error) {
        document.getElementById(idTemp).outerHTML = `<div class="self-start bg-red-50 text-red-600 px-3 py-2 rounded-lg text-xs max-w-[85%] mb-2 shadow-sm">Error de conexión.</div>`;
    }
    historial.scrollTop = historial.scrollHeight;
};

window.exportarExcel = function() {
    let ok = true;
    const filas = [];
    const hoy = new Date().toLocaleDateString('es-CO');

    reportes.forEach((data, ri) => {
        (data.personas || []).forEach((p, pi) => {
            const card = document.getElementById(`persona-${ri}-${pi}`);
            if(!card) return;
            const tipo = document.getElementById(`tipo-${ri}-${pi}`)?.value || '';
            const num = document.getElementById(`num-${ri}-${pi}`)?.value || '';
            
            if (!tipo || !num.trim()) ok = false;

            filas.push({
                'Fecha Ingreso': hoy,
                'Originador': data.medio || '',
                'Enlace': data._link || (data.fuentes_consultadas || [])[0] || '',
                'Titular': data.titulo || '',
                'Personas involucradas': document.getElementById(`nombre-edit-${ri}-${pi}`)?.value || p.nombre || '',
                'Tipo de Documento': tipo,
                'N° Documento': num,
                'Cliente de BCS': document.getElementById(`bcs-${ri}-${pi}`)?.checked ? 'Sí' : 'No',
                'Producto en BCS': document.getElementById(`prodbcs-${ri}-${pi}`)?.value || '',
                'Cliente de FIDU': document.getElementById(`fid-${ri}-${pi}`)?.checked ? 'Sí' : 'No',
                'Producto en FIDU': document.getElementById(`prodfid-${ri}-${pi}`)?.value || '',
                'Estado': p.estado_proceso || '',
                'Fecha Respuesta': hoy,
                'Tipo delito': p.rol_en_hechos || ''
            });
        });
    });

    if (!ok) return alert("Completa el Tipo y Número de identificación de todos los involucrados antes de exportar.");
    if (filas.length === 0) return alert('No hay datos.');

    const ws = XLSX.utils.json_to_sheet(filas);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "SARLAFT");
    XLSX.writeFile(wb, `Reporte_SARLAFT_${hoy.replace(/\//g, '-')}.xlsx`);
};

window.exportarPDF = function() {
    let ok = true;
    document.querySelectorAll('.persona-card').forEach(card => {
        const [ri, pi] = card.id.replace('persona-', '').split('-');
        if (!document.getElementById(`tipo-${ri}-${pi}`)?.value || !document.getElementById(`num-${ri}-${pi}`)?.value.trim()) ok = false;
    });
    if (!ok) return alert("Completa el Tipo y Número de identificación de todos los involucrados antes de exportar el PDF.");

    const tituloOriginal = document.title;
    document.title = (reportes[0]?.titulo || "Informe_SARLAFT").replace(/[^\w]/g, "_");
    
    document.getElementById('asistente-flotante').classList.add('hidden');
    window.print();
    document.title = tituloOriginal;
    document.getElementById('asistente-flotante').classList.remove('hidden');
};