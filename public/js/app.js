// ==========================================
// 1. NAVEGACIÓN Y VARIABLES GLOBALES
// ==========================================
let reportes = [];
let noticiaCount = 0;
let contextoReporteActual = null;

window.navegarA = function(idVista) {
    const vistas = ['view-menu', 'view-noticias', 'view-ros', 'view-cliente'];
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
    if (document.getElementById('noticias-container')) {
        window.agregarNoticia();
    }
});

// ==========================================
// 2. MÓDULO DE NOTICIAS (Adaptado V1 -> V2)
// ==========================================
window.agregarNoticia = function() {
    noticiaCount++;
    const container = document.getElementById('noticias-container');
    if (!container) return;

    const div = document.createElement('div');
    div.className = 'bg-slate-50 border border-slate-200 rounded-lg p-4 mb-3';
    div.id = `noticia-${noticiaCount}`;
    div.innerHTML = `
        <div class="flex justify-between items-center mb-2">
            <span class="font-bold text-sm text-navy">Fuente ${noticiaCount}</span>
            ${noticiaCount > 1 ? `<button onclick="window.eliminarNoticia(${noticiaCount})" class="text-red-500 text-xs hover:underline"><i class="fa-solid fa-trash"></i> Quitar</button>` : ''}
        </div>
        <input type="text" id="link-${noticiaCount}" class="w-full border border-slate-300 rounded-md px-3 py-2 text-sm mb-2 focus:border-teal outline-none" placeholder="Enlace web (opcional)">
        <textarea id="articulo-${noticiaCount}" class="w-full border border-slate-300 rounded-md px-3 py-2 text-sm h-24 focus:border-teal outline-none" placeholder="Pega el texto aquí..."></textarea>
    `;
    container.appendChild(div);
};

window.eliminarNoticia = function(id) {
    document.getElementById(`noticia-${id}`)?.remove();
};

window.analizarNoticias = async function() {
    const btn = document.getElementById('btnAnalizarNoticias');
    const status = document.getElementById('status-noticias');
    
    const articulos = [];
    for (let i = 1; i <= noticiaCount; i++) {
        const texto = document.getElementById(`articulo-${i}`)?.value.trim();
        const link = document.getElementById(`link-${i}`)?.value.trim();
        if (texto) articulos.push({ texto, link });
    }

    if (articulos.length === 0) return alert("Por favor, ingresa contenido a analizar.");

    btn.disabled = true; btn.classList.add('opacity-50');
    status.innerHTML = '<i class="fa-solid fa-spinner fa-spin text-teal"></i> Analizando e investigando...';

    try {
        const res = await fetch('/api/analizar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ articulos: articulos.map(a => a.texto) })
        });

        if (!res.ok) throw new Error("Error en el servidor");
        const data = await res.json();
        
        // Guardar para exportación y chat
        data._link = articulos[0].link;
        reportes = [data]; 
        contextoReporteActual = data; 
        
        document.getElementById('reporte-noticias').classList.remove('hidden');
        renderizarInforme();
        
        document.getElementById('chat-historial').innerHTML = `<div class="text-center text-teal text-xs mb-3 border-b pb-2">Contexto cargado. Asistente listo.</div>`;
        status.textContent = '¡Análisis completado!';
    } catch (error) {
        status.innerHTML = '<span class="text-red-500">Error en el análisis.</span>';
    } finally {
        btn.disabled = false; btn.classList.remove('opacity-50');
    }
};

// ==========================================
// 3. RENDERIZADO DEL INFORME (Estilo V1 con Tailwind)
// ==========================================
function renderizarInforme() {
    const data = reportes[0];
    if (!data) return;

    let hechosHTML = (data.hechos_clave || []).map(h => `<li class="mb-1">${h}</li>`).join('');
    let fuentesHTML = (data.fuentes_consultadas || []).map(f => `<li class="truncate"><a href="${f}" target="_blank" class="text-blue-600 hover:underline">${f}</a></li>`).join('');
    let personasHTML = (data.personas || []).map((p, pi) => buildPersonaHTML(p, pi)).join('');

    document.getElementById('contenido-noticias').innerHTML = `
        <div class="bg-navy text-white rounded-lg p-6 mb-6">
            <h2 class="text-2xl font-bold mb-2">${data.titulo || 'Informe de Riesgo'}</h2>
            <div class="flex flex-wrap gap-4 text-sm opacity-80">
                <span><i class="fa-solid fa-calendar mr-1"></i> ${data.fecha || 'N/A'}</span>
                <span><i class="fa-solid fa-location-dot mr-1"></i> ${data.lugar || 'N/A'}</span>
                <span><i class="fa-solid fa-newspaper mr-1"></i> ${data.medio || 'N/A'}</span>
            </div>
        </div>

        <div class="mb-6 bg-slate-50 border-l-4 border-gold p-4 rounded shadow-sm">
            <h3 class="font-bold text-navy text-sm uppercase mb-2">Resumen General</h3>
            <p class="text-sm text-slate-700 leading-relaxed">${data.resumen}</p>
            <h3 class="font-bold text-navy text-sm uppercase mt-4 mb-2">Hechos Clave</h3>
            <ul class="list-disc pl-5 text-sm text-slate-700 space-y-1">${hechosHTML}</ul>
        </div>

        <div id="personas-container">${personasHTML}</div>
        
        <button onclick="window.agregarPersonaUI()" class="no-print mt-2 bg-green-50 text-green-700 border border-green-300 px-4 py-2 rounded-lg text-sm font-bold hover:bg-green-100">+ Agregar Involucrado Manual</button>

        <div class="mt-6 pt-4 border-t">
            <h3 class="font-bold text-navy text-sm uppercase mb-2">Fuentes Consultadas</h3>
            <ul class="list-disc pl-5 text-sm text-slate-500">${fuentesHTML}</ul>
        </div>
    `;
}

function buildPersonaHTML(p, pi) {
    const badgeColor = p.nivel_riesgo_sugerido?.toLowerCase() === 'alto' ? 'bg-red-600' : (p.nivel_riesgo_sugerido?.toLowerCase() === 'bajo' ? 'bg-green-600' : 'bg-amber-600');
    
    return `
    <div class="persona-card bg-white border border-slate-200 rounded-lg p-5 mb-5 shadow-sm" id="persona-${pi}">
        <div class="flex justify-between items-start mb-4 border-b pb-3">
            <div>
                <div class="font-bold text-lg text-navy" id="nombre-display-${pi}">${p.nombre || 'Desconocido'}</div>
                <div class="text-xs text-slate-500">${p.cargo_o_actividad || ''}</div>
            </div>
            <div class="flex gap-2 items-center">
                <span class="px-3 py-1 rounded-full text-xs font-bold text-white uppercase ${badgeColor}">${p.nivel_riesgo_sugerido || 'Medio'}</span>
                <button onclick="window.eliminarPersonaUI(${pi})" class="no-print text-red-500 hover:text-red-700"><i class="fa-solid fa-trash"></i></button>
            </div>
        </div>

        <div class="text-sm text-slate-700 mb-4 space-y-2">
            <p><strong>Hechos/Delitos:</strong> ${p.rol_en_hechos}</p>
            <p><strong>Análisis de riesgo:</strong> ${p.analisis_riesgo}</p>
            <p class="text-xs italic text-slate-500"><strong>Justificación:</strong> ${p.justificacion_riesgo}</p>
        </div>

        <!-- Campos de Edición Manual V1 (Solo visibles en pantalla) -->
        <div class="no-print bg-slate-50 p-4 rounded-lg border border-slate-200 mt-4">
            <h4 class="font-bold text-xs text-navy mb-3 uppercase">Completar Debida Diligencia</h4>
            <div class="grid grid-cols-2 gap-4 mb-3">
                <div>
                    <label class="block text-xs font-bold text-slate-600 mb-1">Tipo ID</label>
                    <select id="tipo-${pi}" class="w-full border rounded p-2 text-sm" onchange="window.actualizarCard(${pi})">
                        <option value="">Seleccionar...</option><option value="CC">CC</option><option value="NIT">NIT</option><option value="CE">CE</option><option value="Pasaporte">Pasaporte</option>
                    </select>
                </div>
                <div>
                    <label class="block text-xs font-bold text-slate-600 mb-1">Número ID</label>
                    <input type="text" id="num-${pi}" class="w-full border rounded p-2 text-sm" placeholder="Ej. 1000..." oninput="window.actualizarCard(${pi})">
                </div>
            </div>
            <div class="flex gap-4 mb-3 text-sm font-bold text-slate-700">
                <label><input type="checkbox" id="bcs-${pi}" onchange="window.actualizarCard(${pi})"> Cliente BCS</label>
                <label><input type="checkbox" id="fid-${pi}" onchange="window.actualizarCard(${pi})"> Cliente Fiduciaria</label>
            </div>
            <div class="grid grid-cols-2 gap-4 mb-3">
                <input type="text" id="prodbcs-${pi}" class="border rounded p-2 text-sm" placeholder="Productos BCS..." oninput="window.actualizarCard(${pi})">
                <input type="text" id="prodfid-${pi}" class="border rounded p-2 text-sm" placeholder="Productos Fidu..." oninput="window.actualizarCard(${pi})">
            </div>
            <input type="text" id="nombre-edit-${pi}" value="${p.nombre || ''}" class="w-full border rounded p-2 text-sm mb-3" placeholder="Editar Nombre" oninput="document.getElementById('nombre-display-${pi}').textContent=this.value">
            <textarea id="recom-${pi}" class="w-full border rounded p-2 text-sm h-16" placeholder="Recomendación del analista..." oninput="window.actualizarCard(${pi})"></textarea>
        </div>

        <!-- Renderizado de tabla y recomendación (Visible en PDF) -->
        <div class="mt-4 overflow-x-auto">
            <table class="w-full text-left text-xs border-collapse">
                <thead><tr class="bg-navy text-white"><th class="p-2 border">TIPO ID</th><th class="p-2 border">NUMERO ID</th><th class="p-2 border">CTE BCS</th><th class="p-2 border">PROD BCS</th><th class="p-2 border">CTE FIDU</th><th class="p-2 border">PROD FIDU</th><th class="p-2 border">ESTADO</th></tr></thead>
                <tbody id="tabla-body-${pi}">
                    <tr><td class="p-2 border text-slate-400 italic">Pendiente</td><td class="p-2 border text-slate-400 italic">Pendiente</td><td class="p-2 border">No</td><td class="p-2 border text-slate-400">—</td><td class="p-2 border">No</td><td class="p-2 border text-slate-400">—</td><td class="p-2 border font-bold text-amber-700">${p.estado_proceso}</td></tr>
                </tbody>
            </table>
        </div>
        <div id="recom-display-${pi}" class="hidden mt-3 p-3 bg-amber-50 border-l-4 border-amber-500 rounded text-xs text-amber-900"></div>
    </div>`;
}

window.actualizarCard = function(pi) {
    const tipo = document.getElementById(`tipo-${pi}`)?.value || '<span class="text-slate-400 italic">Pendiente</span>';
    const num = document.getElementById(`num-${pi}`)?.value || '<span class="text-slate-400 italic">Pendiente</span>';
    const bcs = document.getElementById(`bcs-${pi}`)?.checked ? 'Sí' : 'No';
    const fid = document.getElementById(`fid-${pi}`)?.checked ? 'Sí' : 'No';
    const prodbcs = document.getElementById(`prodbcs-${pi}`)?.value || '—';
    const prodfid = document.getElementById(`prodfid-${pi}`)?.value || '—';
    
    const tbody = document.getElementById(`tabla-body-${pi}`);
    if(tbody) {
        tbody.innerHTML = `<tr><td class="p-2 border font-semibold">${tipo}</td><td class="p-2 border">${num}</td><td class="p-2 border">${bcs}</td><td class="p-2 border">${prodbcs}</td><td class="p-2 border">${fid}</td><td class="p-2 border">${prodfid}</td><td class="p-2 border font-bold">${reportes[0].personas[pi].estado_proceso}</td></tr>`;
    }

    const recomText = document.getElementById(`recom-${pi}`)?.value.trim();
    const recomDisp = document.getElementById(`recom-display-${pi}`);
    if(recomDisp) {
        if(recomText) {
            recomDisp.innerHTML = `<strong>Recomendación del analista:</strong> ${recomText}`;
            recomDisp.classList.remove('hidden');
        } else {
            recomDisp.classList.add('hidden');
        }
    }
};

window.agregarPersonaUI = function() {
    if(!reportes[0]) return;
    const pi = reportes[0].personas.length;
    const nueva = { nombre: 'Nuevo involucrado', rol_en_hechos: '', cargo_o_actividad: '', analisis_riesgo: '', estado_proceso: 'Investigado', justificacion_riesgo: '', nivel_riesgo_sugerido: 'medio' };
    reportes[0].personas.push(nueva);
    const div = document.createElement('div');
    div.innerHTML = buildPersonaHTML(nueva, pi);
    document.getElementById('personas-container').appendChild(div.firstElementChild);
};

window.eliminarPersonaUI = function(pi) {
    document.getElementById(`persona-${pi}`)?.remove();
};

// ==========================================
// 4. CHAT ASISTENTE & EXPORTACIONES
// ==========================================
window.enviarPregunta = async function() {
    const input = document.getElementById('chat-input');
    const pregunta = input.value.trim();
    if (!pregunta) return;
    if (!contextoReporteActual) return alert("Analiza una noticia primero.");

    const historial = document.getElementById('chat-historial');
    historial.innerHTML += `<div class="self-end bg-navy text-white px-3 py-2 rounded-lg text-xs max-w-[85%] mb-2">${pregunta}</div>`;
    input.value = '';
    
    const idTemp = 'temp-' + Date.now();
    historial.innerHTML += `<div id="${idTemp}" class="self-start bg-slate-200 px-3 py-2 rounded-lg text-xs mb-2">...</div>`;
    historial.scrollTop = historial.scrollHeight;

    try {
        const res = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pregunta, contexto: contextoReporteActual })
        });
        const data = await res.json();
        document.getElementById(idTemp).outerHTML = `<div class="self-start bg-slate-200 text-navy px-3 py-2 rounded-lg text-xs max-w-[85%] mb-2">${data.respuesta}</div>`;
    } catch (error) {
        document.getElementById(idTemp).outerHTML = `<div class="text-red-500 text-xs mb-2">Error de conexión.</div>`;
    }
};

window.exportarExcel = function(tipo) {
    if (!reportes.length) return alert("No hay datos.");
    const filas = [];
    const data = reportes[0];
    
    document.querySelectorAll('.persona-card').forEach(card => {
        const pi = card.id.split('-')[1];
        filas.push({
            'Origen': data.medio,
            'Titular': data.titulo,
            'Persona': document.getElementById(`nombre-edit-${pi}`)?.value || '',
            'Tipo ID': document.getElementById(`tipo-${pi}`)?.value || '',
            'Num ID': document.getElementById(`num-${pi}`)?.value || '',
            'Cliente BCS': document.getElementById(`bcs-${pi}`)?.checked ? 'Sí' : 'No',
            'Prod BCS': document.getElementById(`prodbcs-${pi}`)?.value || '',
            'Cliente FIDU': document.getElementById(`fid-${pi}`)?.checked ? 'Sí' : 'No',
            'Prod FIDU': document.getElementById(`prodfid-${pi}`)?.value || '',
            'Estado': data.personas[pi].estado_proceso
        });
    });

    const ws = XLSX.utils.json_to_sheet(filas);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "SARLAFT");
    XLSX.writeFile(wb, "Reporte_SARLAFT.xlsx");
};
