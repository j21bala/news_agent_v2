let noticiaCount = 0;
let contextoReporteActual = null;

document.addEventListener("DOMContentLoaded", () => {
    window.agregarNoticia();
});

window.agregarNoticia = function() {
    noticiaCount++;
    const container = document.getElementById('noticias-container');
    if (!container) return;

    const div = document.createElement('div');
    div.className = 'bg-slate-50 border border-slate-200 rounded-lg p-4 mb-3 fade-in';
    div.id = `noticia-${noticiaCount}`;
    div.innerHTML = `
        <div class="flex justify-between items-center mb-2">
            <span class="font-bold text-sm text-navy">Fuente ${noticiaCount}</span>
            ${noticiaCount > 1 ? `<button onclick="window.eliminarNoticia(${noticiaCount})" class="text-red-500 text-xs hover:underline"><i class="fa-solid fa-trash"></i> Quitar</button>` : ''}
        </div>
        <input type="text" id="link-${noticiaCount}" class="w-full border border-slate-300 rounded-md px-3 py-2 text-sm mb-2 focus:outline-none focus:border-teal" placeholder="Enlace web (opcional)">
        <textarea id="articulo-${noticiaCount}" class="w-full border border-slate-300 rounded-md px-3 py-2 text-sm h-24 focus:outline-none focus:border-teal" placeholder="Pega el contenido de la noticia o los datos del sujeto..."></textarea>
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
        if (texto) articulos.push(texto);
    }

    if (articulos.length === 0) {
        alert("Por favor, ingresa contenido o enlaces a analizar.");
        return;
    }

    btn.disabled = true; btn.classList.add('opacity-50');
    status.innerHTML = '<i class="fa-solid fa-spinner fa-spin text-teal"></i> Investigando en la web (Tavily) y generando informe gerencial...';

    try {
        const res = await fetch('/api/analizar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ articulos })
        });

        if (!res.ok) throw new Error("Error en el servidor");
        const data = await res.json();
        
        contextoReporteActual = data; 
        document.getElementById('reporte-noticias').classList.remove('hidden');
        
        let hechosHTML = (data.hechos_clave || []).map(h => `<li class="mb-1">${h}</li>`).join('');
        let fuentesHTML = (data.fuentes || []).map(f => `<li class="truncate"><a href="${f}" target="_blank" class="text-blue-600 hover:underline">${f}</a></li>`).join('');

        // Renderizado del informe gerencial ejecutivo con tabla SARLAFT completa
        document.getElementById('contenido-noticias').innerHTML = `
            <div class="border-b pb-4 mb-4 flex justify-between items-start">
                <div>
                    <h3 class="text-2xl font-bold text-navy">${data.sujeto_nombre || 'Sujeto Investigado'}</h3>
                    <p class="text-sm text-slate-500">${data.sujeto_perfil || ''}</p>
                </div>
                <span class="bg-red-600 text-white font-bold px-3 py-1 rounded-full text-xs uppercase">${data.riesgo_general || 'ALTO'}</span>
            </div>

            <div class="mb-4">
                <h4 class="font-bold text-navy text-sm uppercase mb-1">Análisis de Riesgo:</h4>
                <p class="text-sm text-slate-700 leading-relaxed">${data.analisis_riesgo}</p>
            </div>

            <div class="mb-4 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <h4 class="font-bold text-navy text-xs uppercase mb-1">¿Por qué este nivel?</h4>
                <p class="text-xs text-slate-600 italic">${data.porque_este_nivel}</p>
            </div>

            <div class="mb-6">
                <h4 class="font-bold text-navy text-sm uppercase mb-2">Hechos Clave:</h4>
                <ul class="list-disc pl-5 text-sm text-slate-700 space-y-1">${hechosHTML}</ul>
            </div>

            <div class="overflow-x-auto mb-6">
                <table class="w-full text-left border-collapse text-xs">
                    <thead>
                        <tr class="bg-navy text-white">
                            <th class="p-2 border">TIPO ID</th>
                            <th class="p-2 border">NÚMERO ID</th>
                            <th class="p-2 border">CLIENTE BCS</th>
                            <th class="p-2 border">PRODUCTOS BCS</th>
                            <th class="p-2 border">CLIENTE FIDUCIARIA</th>
                            <th class="p-2 border">PROD. FIDUCIARIA</th>
                            <th class="p-2 border">ESTADO</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr class="bg-white text-slate-800">
                            <td class="p-2 border font-semibold">${data.tipo_id || 'CC'}</td>
                            <td class="p-2 border">${data.numero_id || 'N/A'}</td>
                            <td class="p-2 border">${data.cliente_bcs || 'No'}</td>
                            <td class="p-2 border">${data.productos_bcs || 'No aplica'}</td>
                            <td class="p-2 border">${data.cliente_fiduciaria || 'No'}</td>
                            <td class="p-2 border">${data.productos_fiduciaria || 'No aplica'}</td>
                            <td class="p-2 border font-bold text-amber-700">${data.estado || 'Investigado'}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div class="mb-6 bg-amber-50 border-l-4 border-amber-500 p-3 rounded">
                <span class="font-bold text-xs uppercase text-amber-900 block mb-1">Recomendación del analista:</span>
                <p class="text-xs text-amber-800">${data.recomendacion}</p>
            </div>

            <div>
                <h4 class="font-bold text-navy text-xs uppercase mb-2">Fuentes Consultadas (Tavily & Web):</h4>
                <ul class="list-disc pl-5 text-xs text-slate-500 space-y-1">${fuentesHTML}</ul>
            </div>
        `;

        document.getElementById('chat-historial').innerHTML = `<div class="text-center text-teal text-xs mb-3 border-b pb-2">Contexto de investigación cargado. El asistente web está listo.</div>`;
        status.textContent = '¡Informe gerencial generado con éxito!';

    } catch (error) {
        status.innerHTML = '<span class="text-red-500">Error en el análisis y búsqueda web.</span>';
    } finally {
        btn.disabled = false; btn.classList.remove('opacity-50');
    }
};

window.enviarPregunta = async function() {
    const input = document.getElementById('chat-input');
    const pregunta = input.value.trim();
    if (!pregunta) return;
    if (!contextoReporteActual) return alert("Primero debes analizar una noticia para activar el asistente.");

    const historial = document.getElementById('chat-historial');
    historial.innerHTML += `<div class="self-end bg-navy text-white px-3 py-2 rounded-lg text-xs max-w-[85%] mb-2">${pregunta}</div>`;
    input.value = '';
    historial.scrollTop = historial.scrollHeight;

    const idTemp = 'temp-' + Date.now();
    historial.innerHTML += `<div id="${idTemp}" class="self-start bg-slate-200 text-slate-500 px-3 py-2 rounded-lg text-xs max-w-[85%] mb-2"><i class="fa-solid fa-ellipsis fa-fade"></i></div>`;
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
        document.getElementById(idTemp).outerHTML = `<div class="self-start bg-red-100 text-red-600 px-3 py-2 rounded-lg text-xs max-w-[85%] mb-2">Error de conexión con el asistente.</div>`;
    }
    historial.scrollTop = historial.scrollHeight;
};

window.mostrarArchivos = function(inputId, listaId) {
    const input = document.getElementById(inputId);
    const lista = document.getElementById(listaId);
    lista.innerHTML = '';
    Array.from(input.files).forEach(file => {
        lista.innerHTML += `<li><i class="fa-solid fa-file-lines text-slate-400 mr-2"></i> ${file.name}</li>`;
    });
};

window.analizarROS = async function() {
    const btn = document.getElementById('btnAnalizarRos');
    const status = document.getElementById('status-ros');
    const plantillaPrompt = document.getElementById('rosPlantilla').value.trim();
    const files = document.getElementById('rosArchivos').files;

    if (!plantillaPrompt || files.length === 0) {
        return alert("Ingresa la plantilla y selecciona al menos un documento.");
    }

    btn.disabled = true; btn.classList.add('opacity-50');
    status.innerHTML = '<i class="fa-solid fa-spinner fa-spin text-gold"></i> Leyendo documentos y generando ROS...';

    try {
        let textoDocumentos = "";
        for (const file of files) {
            textoDocumentos += `\n--- Archivo: ${file.name} ---\n`;
            textoDocumentos += await file.text();
        }

        const res = await fetch('/api/generar-ros', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ plantillaPrompt, textoDocumentos })
        });

        if (!res.ok) throw new Error("Error en el servidor");
        const data = await res.json();

        document.getElementById('reporte-ros').classList.remove('hidden');
        document.getElementById('contenido-ros').textContent = data.informe;
        status.textContent = '¡ROS Generado exitosamente!';
    } catch (error) {
        status.innerHTML = '<span class="text-red-500">Error al generar ROS.</span>';
    } finally {
        btn.disabled = false; btn.classList.remove('opacity-50');
    }
};

let imagenesBase64 = [];
window.mostrarPreviewImagenes = function() {
    const input = document.getElementById('clienteImagenes');
    const preview = document.getElementById('preview-imagenes');
    preview.innerHTML = '';
    imagenesBase64 = [];
    
    const files = Array.from(input.files).slice(0, 6); 
    files.forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const base64String = e.target.result;
            imagenesBase64.push(base64String.split(',')[1]); 
            preview.innerHTML += `<div class="w-24 h-24 rounded-lg border border-slate-300 overflow-hidden shadow-sm"><img src="${base64String}" class="w-full h-full object-cover"></div>`;
        };
        reader.readAsDataURL(file);
    });
};

window.analizarCliente = async function() {
    const btn = document.getElementById('btnAnalizarCliente');
    const status = document.getElementById('status-cliente');
    
    if (imagenesBase64.length === 0) return alert("Sube al menos una imagen.");

    btn.disabled = true; btn.classList.add('opacity-50');
    status.innerHTML = '<i class="fa-solid fa-spinner fa-spin text-purple-600"></i> Analizando...';

    try {
        const res = await fetch('/api/analizar-cliente', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imagenes: imagenesBase64 })
        });

        if (!res.ok) throw new Error("Error en el servidor");
        const data = await res.json();

        document.getElementById('dashboard-resultado').classList.remove('hidden');
        document.getElementById('dash-perfil').innerHTML = `
            <div class="text-3xl font-bold text-teal mb-2">Score: ${data.score_riesgo || 'N/A'}/100</div>
            <p><strong>Ingresos Calculados:</strong> $${data.ingresos_calculados || '0'}</p>
        `;
        document.getElementById('dash-alertas').innerHTML = (data.alertas || []).map(a => `<li>${a}</li>`).join('');
        status.textContent = 'Dashboard generado.';
    } catch (error) {
        status.innerHTML = '<span class="text-red-500">Error procesando imágenes.</span>';
    } finally {
        btn.disabled = false; btn.classList.remove('opacity-50');
    }
};

window.exportarExcel = function(tipo) {
    if (tipo === 'noticias' && contextoReporteActual) {
        const ws = XLSX.utils.json_to_sheet([contextoReporteActual]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Informe SARLAFT");
        XLSX.writeFile(wb, "Reporte_SARLAFT.xlsx");
    } else {
        alert("No hay datos para exportar.");
    }
};
