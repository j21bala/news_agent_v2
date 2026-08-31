let reportes = [];
let noticiaCount = 0;

document.addEventListener("DOMContentLoaded", () => {
    if (document.getElementById('noticias-container')) {
        agregarNoticia();
    }
});

function agregarNoticia() {
    noticiaCount++;
    const id = noticiaCount;
    const container = document.getElementById('noticias-container');
    if (!container) return;

    const div = document.createElement('div');
    div.className = 'noticia-item';
    div.id = `noticia-${id}`;
    div.innerHTML = `
        <div class="noticia-item-header">
            <span>Noticia ${id}</span>
            ${id > 1 ? `<button class="danger-btn" onclick="eliminarNoticia(${id})">✕ Quitar</button>` : ''}
        </div>
        <label>Link de la noticia</label>
        <input type="text" id="link-${id}" placeholder="https://...">
        <label>Texto completo de la noticia</label>
        <textarea id="articulo-${id}" placeholder="Pega aquí el contenido de la noticia..."></textarea>
    `;
    container.appendChild(div);
}

function eliminarNoticia(id) {
    const el = document.getElementById(`noticia-${id}`);
    if (el) el.remove();
}

async function analizarTodas() {
    const items = document.querySelectorAll('.noticia-item');
    if (items.length === 0) { alert('Agrega al menos una noticia.'); return; }

    const noticias = [];
    let valido = true;
    items.forEach(item => {
        const id = item.id.replace('noticia-', '');
        const link = document.getElementById(`link-${id}`)?.value.trim() || '';
        const texto = document.getElementById(`articulo-${id}`)?.value.trim() || '';
        if (!texto) {
            document.getElementById(`articulo-${id}`).classList.add('error');
            valido = false;
        } else {
            document.getElementById(`articulo-${id}`).classList.remove('error');
        }
        noticias.push({ link, texto });
    });
    if (!valido) { alert('Pega el texto en todas las noticias.'); return; }

    const btn = document.getElementById('btnAnalizar');
    const statusEl = document.getElementById('status');
    if (btn) btn.disabled = true;
    
    reportes = [];

    for (let i = 0; i < noticias.length; i++) {
        if (statusEl) statusEl.textContent = `Analizando noticia ${i + 1} de ${noticias.length}...`;
        try {
            const res = await fetch('/api/analizar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ articulos: [noticias[i].texto] })
            });
            if (!res.ok) throw new Error("Error en el servidor backend");
            const result = await res.json();
            result._link = noticias[i].link;
            reportes.push(result);
        } catch (e) {
            alert(`Error en noticia ${i + 1}: ${e.message}`);
            if (btn) btn.disabled = false;
            if (statusEl) statusEl.textContent = '';
            return;
        }
    }

    if (statusEl) statusEl.textContent = '';
    if (btn) btn.disabled = false;
    renderTodosReportes();
    
    const inputPanel = document.getElementById('inputPanel');
    const reportPanel = document.getElementById('report');
    if (inputPanel) inputPanel.style.display = 'none';
    if (reportPanel) reportPanel.style.display = 'block';
}

function renderTodosReportes() {
    const cont = document.getElementById('reportes-container');
    if (!cont) return;
    cont.innerHTML = '';
    reportes.forEach((data, ri) => {
        const bloque = document.createElement('div');
        bloque.className = 'reporte-bloque';
        bloque.id = `reporte-${ri}`;
        bloque.innerHTML = buildReporteHTML(data, ri);
        cont.appendChild(bloque);
    });
}

const ICONOS = {
    calendario: '<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" style="vertical-align:-2px;margin-right:2px;"><path d="M7 2v2H5a2 2 0 0 0-2 2v2h18V6a2 2 0 0 0-2-2h-2V2h-2v2H9V2H7zM3 10v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V10H3z"/></svg>',
    lugar: '<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" style="vertical-align:-2px;margin-right:2px;"><path d="M12 2C7.6 2 4 5.6 4 10c0 5.4 8 12 8 12s8-6.6 8-12c0-4.4-3.6-8-8-8zm0 11a3 3 0 1 1 0-6 3 3 0 0 1 0 6z"/></svg>',
    medio: '<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" style="vertical-align:-2px;margin-right:2px;"><path d="M4 4h13a2 2 0 0 1 2 2v1h1a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4zm2 3v2h9V7H6zm0 4v2h9v-2H6zm0 4v2h6v-2H6z"/></svg>'
};

function buildReporteHTML(data, ri) {
    const personasHTML = (data.personas || []).map((p, pi) => buildPersonaHTML(p, ri, pi)).join('');
    return `
        <div class="cover">
            <h2>${data.titulo || '—'}</h2>
            <div class="meta">
                <span>${ICONOS.calendario} ${data.fecha || 'No disponible'}</span>
                <span>${ICONOS.lugar} ${data.lugar || 'No disponible'}</span>
                <span>${ICONOS.medio} ${data.medio || 'No disponible'}</span>
            </div>
            ${data._link ? `<div class="link-noticia">🔗 ${data._link}</div>` : ''}
        </div>
        <div class="resumen">
            <h3>Resumen general</h3>
            <p>${resaltar(data.resumen)}</p>
            <h3 style="margin-top:14px;">Hechos clave</h3>
            <ul>${(data.hechos_clave || []).map(h => `<li>${resaltar(h)}</li>`).join('')}</ul>
        </div>
        <div id="personas-${ri}">${personasHTML}</div>
        <button class="add-persona-btn no-print" onclick="agregarPersona(${ri})">+ Agregar involucrado</button>
        ${buildFuentesHTML(data.fuentes_consultadas)}
    `;
}

function buildFuentesHTML(fuentes) {
    if (!fuentes || fuentes.length === 0) return '';
    const items = fuentes.map(f => `<li><a href="${f}" target="_blank" rel="noopener">${f}</a></li>`).join('');
    return `<div class="resumen fuentes-consultadas"><h3>Fuentes consultadas</h3><ul>${items}</ul></div>`;
}

function claseEstado(estado) {
    const e = String(estado || '').toLowerCase();
    if (e.includes('detenid')) return 'e-detenido';
    if (e.includes('conden')) return 'e-condenado';
    if (e.includes('prófug') || e.includes('profug')) return 'e-profugo';
    if (e.includes('fallec')) return 'e-fallecido';
    if (e.includes('asesin')) return 'e-asesinado';
    return 'e-investigado';
}

function filaTablaHTML(tipo, num, bcs, fid, prodbcs, prodfid, estado) {
    const tipoVal = tipo || '<span class="desconocido">Desconocido</span>';
    const numVal = num || '<span class="desconocido">Desconocido</span>';
    const bcsVal = bcs ? '<span class="tag-si">✓ Sí</span>' : '<span class="tag-no">No</span>';
    const fidVal = fid ? '<span class="tag-si">✓ Sí</span>' : '<span class="tag-no">No</span>';
    const estadoTxt = estado || 'Investigado';
    return `
        <tr>
            <td>${tipoVal}</td>
            <td>${numVal}</td>
            <td>${bcsVal}</td>
            <td>${prodbcs || '<span class="desconocido">—</span>'}</td>
            <td>${fidVal}</td>
            <td>${prodfid || '<span class="desconocido">—</span>'}</td>
            <td><span class="badge-estado ${claseEstado(estadoTxt)}">${estadoTxt}</span></td>
        </tr>
    `;
}

function buildPersonaHTML(p, ri, pi) {
    const nivelRaw = String(p.nivel_riesgo_sugerido || 'medio').toLowerCase().trim();
    const badgeClass = nivelRaw === 'alto' ? 'b-alto' : (nivelRaw === 'bajo' ? 'b-bajo' : 'b-medio');
    const nivel = nivelRaw.toUpperCase();
    const estadoInicial = (p.estado_proceso || 'Investigado').replace(/"/g, '&quot;');
    return `
        <div class="persona-card" id="persona-${ri}-${pi}" data-estado="${estadoInicial}">
            <div class="persona-actions no-print">
                <button class="danger-btn" onclick="eliminarPersona(${ri}, ${pi})">✕ Quitar</button>
            </div>
            <div class="p-head">
                <div class="avatar">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="8" r="4" fill="#fff" opacity=".9"/>
                        <path d="M4 20c0-4 3.5-6 8-6s8 2 8 6" fill="#fff" opacity=".9"/>
                    </svg>
                </div>
                <div class="info">
                    <div class="nombre" id="nombre-display-${ri}-${pi}">${p.nombre || 'Sin identificar'}</div>
                    <div class="cargo">${p.cargo_o_actividad || ''}</div>
                </div>
                <span class="badge ${badgeClass}">${nivel}</span>
            </div>
            <div class="p-body">
                <div class="line"><strong>Hechos:</strong> ${resaltar(p.rol_en_hechos)}</div>
                <div class="line"><strong>Análisis de riesgo:</strong> ${resaltar(p.analisis_riesgo)}</div>
                <div class="line justificacion"><strong>¿Por qué este nivel?</strong> ${resaltar(p.justificacion_riesgo) || 'No especificado'}</div>
            </div>

            <div class="tabla-datos" id="tabla-${ri}-${pi}">
                <table>
                    <thead>
                        <tr>
                            <th>Tipo ID</th>
                            <th>Número ID</th>
                            <th>Cliente BCS</th>
                            <th>Productos BCS</th>
                            <th>Cliente Fiduciaria</th>
                            <th>Productos Fiduciaria</th>
                            <th>Estado</th>
                        </tr>
                    </thead>
                    <tbody id="tabla-body-${ri}-${pi}">${filaTablaHTML('', '', false, false, '', '', p.estado_proceso)}</tbody>
                </table>
            </div>

            <div class="recomendacion-box" id="recom-display-${ri}-${pi}" style="display:none;"></div>

            <div class="edit-fields no-print">
                <div class="grid-2">
                    <div>
                        <label>Tipo de identificación *</label>
                        <select id="tipo-${ri}-${pi}" onchange="actualizarTabla(${ri},${pi})">
                            <option value="">-- Seleccionar --</option>
                            <option value="Desconocido">Desconocido</option>
                            <option value="CC">Cédula de Ciudadanía</option>
                            <option value="CE">Cédula de Extranjería</option>
                            <option value="NIT">NIT</option>
                            <option value="Pasaporte">Pasaporte</option>
                            <option value="TI">Tarjeta de Identidad</option>
                        </select>
                    </div>
                    <div>
                        <label>Número de identificación *</label>
                        <input type="text" id="num-${ri}-${pi}" placeholder="Ej. 1000123456 o Desconocido" oninput="actualizarTabla(${ri},${pi})">
                    </div>
                </div>
                <div class="check-row">
                    <label><input type="checkbox" id="bcs-${ri}-${pi}" onchange="actualizarTabla(${ri},${pi})"> Cliente BCS</label>
                    <label><input type="checkbox" id="fid-${ri}-${pi}" onchange="actualizarTabla(${ri},${pi})"> Cliente Fiduciaria</label>
                </div>
                <div class="grid-2">
                    <div>
                        <label>Productos BCS</label>
                        <input type="text" id="prodbcs-${ri}-${pi}" placeholder="Ej. Cuenta corriente..." oninput="actualizarTabla(${ri},${pi})">
                    </div>
                    <div>
                        <label>Productos Fiduciaria</label>
                        <input type="text" id="prodfid-${ri}-${pi}" placeholder="Ej. Fideicomiso..." oninput="actualizarTabla(${ri},${pi})">
                    </div>
                </div>
                <div style="margin-top:10px;">
                    <label>Editar nombre del involucrado</label>
                    <input type="text" id="nombre-edit-${ri}-${pi}" value="${p.nombre || ''}" oninput="document.getElementById('nombre-display-${ri}-${pi}').textContent=this.value" placeholder="Nombre completo">
                </div>
                <div style="margin-top:10px;">
                    <label>Recomendación del analista</label>
                    <textarea id="recom-${ri}-${pi}" oninput="actualizarRecomendacion(${ri},${pi})" placeholder="Ej. Se recomienda reportar a la UIAF..."></textarea>
                </div>
            </div>
        </div>
    `;
}

function actualizarTabla(ri, pi) {
    const tipo = document.getElementById(`tipo-${ri}-${pi}`)?.value || '';
    const num = document.getElementById(`num-${ri}-${pi}`)?.value || '';
    const bcs = document.getElementById(`bcs-${ri}-${pi}`)?.checked || false;
    const fid = document.getElementById(`fid-${ri}-${pi}`)?.checked || false;
    const prodbcs = document.getElementById(`prodbcs-${ri}-${pi}`)?.value || '';
    const prodfid = document.getElementById(`prodfid-${ri}-${pi}`)?.value || '';

    document.getElementById(`tipo-${ri}-${pi}`)?.classList.remove('error');
    document.getElementById(`num-${ri}-${pi}`)?.classList.remove('error');

    const tbody = document.getElementById(`tabla-body-${ri}-${pi}`);
    const card = document.getElementById(`persona-${ri}-${pi}`);
    if (!tbody || !card) return;

    tbody.innerHTML = filaTablaHTML(tipo, num, bcs, fid, prodbcs, prodfid, card.dataset.estado);
}

function actualizarRecomendacion(ri, pi) {
    const texto = document.getElementById(`recom-${ri}-${pi}`)?.value.trim() || '';
    const disp = document.getElementById(`recom-display-${ri}-${pi}`);
    if (!disp) return;
    if (!texto) {
        disp.style.display = 'none';
        disp.innerHTML = '';
        return;
    }
    disp.innerHTML = `<strong>Recomendación del analista:</strong> ${texto}`;
    disp.style.display = 'block';
}

function validarCamposObligatorios() {
    let ok = true;
    document.querySelectorAll('.persona-card').forEach(card => {
        const [ri, pi] = card.id.replace('persona-', '').split('-');
        const tipoEl = document.getElementById(`tipo-${ri}-${pi}`);
        const numEl = document.getElementById(`num-${ri}-${pi}`);
        if (tipoEl && !tipoEl.value) { tipoEl.classList.add('error'); ok = false; }
        if (numEl && !numEl.value.trim()) { numEl.classList.add('error'); ok = false; }
    });
    return ok;
}

function agregarPersona(ri) {
    const personaVacia = {
        nombre: 'Nuevo involucrado',
        rol_en_hechos: '',
        cargo_o_actividad: '',
        analisis_riesgo: '',
        estado_proceso: 'Investigado',
        justificacion_riesgo: '',
        nivel_riesgo_sugerido: 'medio'
    };
    if (!reportes[ri].personas) reportes[ri].personas = [];
    const pi = reportes[ri].personas.length;
    reportes[ri].personas.push(personaVacia);

    const cont = document.getElementById(`personas-${ri}`);
    const div = document.createElement('div');
    div.innerHTML = buildPersonaHTML(personaVacia, ri, pi);
    cont.appendChild(div.firstElementChild);
}

function eliminarPersona(ri, pi) {
    document.getElementById(`persona-${ri}-${pi}`)?.remove();
}

function volver() {
    const inputPanel = document.getElementById('inputPanel');
    const reportPanel = document.getElementById('report');
    if (inputPanel) inputPanel.style.display = 'block';
    if (reportPanel) reportPanel.style.display = 'none';
}

function resaltar(texto) {
    if (!texto) return '';
    return String(texto).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}

function exportarExcel() {
    if (!validarCamposObligatorios()) {
        alert("Completa el Tipo y Número de identificación de todos los involucrados.");
        return;
    }

    const hoy = new Date().toLocaleDateString('es-CO');
    const filas = [];

    reportes.forEach((data, ri) => {
        (data.personas || []).forEach((p, pi) => {
            const tipo = document.getElementById(`tipo-${ri}-${pi}`)?.value || '';
            const num = document.getElementById(`num-${ri}-${pi}`)?.value || '';
            const bcs = document.getElementById(`bcs-${ri}-${pi}`)?.checked ? 'Sí' : 'No';
            const fid = document.getElementById(`fid-${ri}-${pi}`)?.checked ? 'Sí' : 'No';
            const prodbcs = document.getElementById(`prodbcs-${ri}-${pi}`)?.value || '';
            const prodfid = document.getElementById(`prodfid-${ri}-${pi}`)?.value || '';
            const nombre = document.getElementById(`nombre-edit-${ri}-${pi}`)?.value || p.nombre || '';

            filas.push({
                'Fecha Ingreso': hoy,
                'Originador': data.medio || '',
                'Enlace': data._link || (data.fuentes_consultadas || [])[0] || '',
                'Titular': data.titulo || '',
                'Personas involucradas': nombre,
                'Tipo de Documento': tipo,
                'N° Documento': num,
                'Cliente de BCS': bcs,
                'Producto en BCS': prodbcs,
                'Cliente de FIDU': fid,
                'Producto en FIDU': prodfid,
                'Estado': p.estado_proceso || '',
                'Fecha Respuesta': hoy,
                'Tipo delito': p.rol_en_hechos || ''
            });
        });
    });

    if (filas.length === 0) { alert('No hay involucrados para exportar.'); return; }

    const ws = XLSX.utils.json_to_sheet(filas);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'SARLAFT');
    XLSX.writeFile(wb, `Informes_SARLAFT_${hoy.replace(/\//g, '-')}.xlsx`);
}

function exportarPDF() {
    if (!validarCamposObligatorios()) {
        alert("Completa el Tipo y Número de identificación.");
        return;
    }

    const reporte = document.getElementById("report");
    const tituloOriginal = document.title;
    const nombreArchivo = (reportes[0]?.titulo || "Informe_SARLAFT").replace(/[^\w]/g, "_");
    document.title = nombreArchivo;

    reporte.classList.add("pdf-export");
    const limpiar = () => {
        reporte.classList.remove("pdf-export");
        document.title = tituloOriginal;
        window.removeEventListener("afterprint", limpiar);
    };
    window.addEventListener("afterprint", limpiar);
    window.print();
    setTimeout(limpiar, 1500);
}
