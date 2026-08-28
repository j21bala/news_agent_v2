// ========================================== 

// NAVEGACIÓN SPA 

// ========================================== 

function navegarA(idVista) { 

    document.querySelectorAll('.vista').forEach(v => v.classList.remove('activa')); 

    document.getElementById(idVista).classList.add('activa'); 

    window.scrollTo({ top: 0, behavior: 'smooth' }); 

} 

 

// ========================================== 

// MÓDULO 1: NOTICIAS & CHAT 

// ========================================== 

let noticiaCount = 0; 

 

document.addEventListener("DOMContentLoaded", () => { 

    agregarNoticia(); // Inicia con un campo 

}); 

 

function agregarNoticia() { 

    noticiaCount++; 

    const container = document.getElementById('noticias-container'); 

    const div = document.createElement('div'); 

    div.className = 'bg-slate-50 border border-slate-200 rounded-lg p-4 mb-3 fade-in'; 

    div.id = `noticia-${noticiaCount}`; 

    div.innerHTML = ` 

        <div class="flex justify-between items-center mb-2"> 

            <span class="font-bold text-sm text-navy">Noticia ${noticiaCount}</span> 

            ${noticiaCount > 1 ? `<button onclick="eliminarNoticia(${noticiaCount})" class="text-red-500 text-xs hover:underline"><i class="fa-solid fa-trash"></i> Quitar</button>` : ''} 

        </div> 

        <input type="text" id="link-${noticiaCount}" class="w-full border border-slate-300 rounded-md px-3 py-2 text-sm mb-2" placeholder="Enlace web (opcional)"> 

        <textarea id="articulo-${noticiaCount}" class="w-full border border-slate-300 rounded-md px-3 py-2 text-sm h-24" placeholder="Pega el texto de la noticia..."></textarea> 

    `; 

    container.appendChild(div); 

} 

 

function eliminarNoticia(id) { document.getElementById(`noticia-${id}`)?.remove(); } 

 

function analizarNoticias() { 

    const btn = document.getElementById('btnAnalizarNoticias'); 

    const status = document.getElementById('status-noticias'); 

    btn.disabled = true; btn.classList.add('opacity-50'); 

    status.innerHTML = '<i class="fa-solid fa-spinner fa-spin text-teal"></i> Analizando...'; 

 

    // Simulación de respuesta Backend (Sustituir por fetch) 

    setTimeout(() => { 

        btn.disabled = false; btn.classList.remove('opacity-50'); 

        status.textContent = '¡Completado!'; 

         

        document.getElementById('reporte-noticias').classList.remove('hidden'); 

        document.getElementById('contenido-noticias').innerHTML = ` 

            <div class="p-4 bg-red-50 border-l-4 border-red-500 rounded text-red-900 mb-4"> 

                <strong>Riesgo Detectado: ALTO</strong> - Posibles vínculos con financiamiento ilícito. 

            </div> 

            <p><strong>Entidades detectadas:</strong> Juan Pérez, Inversiones XYZ.</p> 

        `; 

 

        document.getElementById('chat-historial').innerHTML = `<div class="text-center text-teal text-xs mb-3 border-b pb-2">Contexto de la noticia cargado. Puedes preguntar.</div>`; 

    }, 1500); 

} 

 

function enviarPregunta() { 

    const input = document.getElementById('chat-input'); 

    const pregunta = input.value.trim(); 

    if (!pregunta) return; 

 

    const historial = document.getElementById('chat-historial'); 

    historial.innerHTML += `<div class="self-end bg-navy text-white px-3 py-2 rounded-lg text-xs max-w-[85%]">${pregunta}</div>`; 

    input.value = ''; 

 

    setTimeout(() => { 

        historial.innerHTML += `<div class="self-start bg-slate-200 text-navy px-3 py-2 rounded-lg text-xs max-w-[85%]">Basado en el informe, no se detectan transacciones internacionales para las entidades mencionadas.</div>`; 

        historial.scrollTop = historial.scrollHeight; 

    }, 800); 

} 

 

// ========================================== 

// MÓDULO 2: ROS 

// ========================================== 

function mostrarArchivos(inputId, listaId) { 

    const input = document.getElementById(inputId); 

    const lista = document.getElementById(listaId); 

    lista.innerHTML = ''; 

    Array.from(input.files).forEach(file => { 

        lista.innerHTML += `<li><i class="fa-solid fa-file-lines text-slate-400 mr-2"></i> ${file.name}</li>`; 

    }); 

} 

 

function analizarROS() { 

    const btn = document.getElementById('btnAnalizarRos'); 

    const status = document.getElementById('status-ros'); 

    btn.disabled = true; btn.classList.add('opacity-50'); 

    status.innerHTML = '<i class="fa-solid fa-spinner fa-spin text-gold"></i> Consolidando evidencias...'; 

 

    setTimeout(() => { 

        btn.disabled = false; btn.classList.remove('opacity-50'); 

        status.textContent = '¡ROS Generado!'; 

        document.getElementById('reporte-ros').classList.remove('hidden'); 

        document.getElementById('contenido-ros').textContent = "1. RESUMEN EJECUTIVO\nSe han analizado 3 documentos. No se evidencian inconsistencias mayores, sin embargo, el origen de fondos en el documento 2 (Balance) requiere justificación adicional.\n\n[Informe generado con Temperatura 0 - Imparcialidad garantizada]"; 

    }, 2000); 

} 

 

// ========================================== 

// MÓDULO 3: DASHBOARD CLIENTE 

// ========================================== 

function mostrarPreviewImagenes() { 

    const input = document.getElementById('clienteImagenes'); 

    const preview = document.getElementById('preview-imagenes'); 

    preview.innerHTML = ''; 

     

    // Limitar a 6 

    const files = Array.from(input.files).slice(0, 6);  

    files.forEach(file => { 

        const reader = new FileReader(); 

        reader.onload = (e) => { 

            preview.innerHTML += `<div class="w-24 h-24 rounded-lg border border-slate-300 overflow-hidden shadow-sm"><img src="${e.target.result}" class="w-full h-full object-cover"></div>`; 

        }; 

        reader.readAsDataURL(file); 

    }); 

} 

 

function analizarCliente() { 

    const btn = document.getElementById('btnAnalizarCliente'); 

    const status = document.getElementById('status-cliente'); 

    btn.disabled = true; btn.classList.add('opacity-50'); 

    status.innerHTML = '<i class="fa-solid fa-spinner fa-spin text-purple-600"></i> Procesando imágenes...'; 

 

    setTimeout(() => { 

        btn.disabled = false; btn.classList.remove('opacity-50'); 

        status.textContent = 'Dashboard listo.'; 

        document.getElementById('dashboard-resultado').classList.remove('hidden'); 

         

        document.getElementById('dash-perfil').innerHTML = ` 

            <div class="text-3xl font-bold text-teal mb-2">Score: 85/100</div> 

            <p><strong>Ingresos calculados:</strong> $15,000,000 COP</p> 

            <p><strong>Identidad:</strong> Verificada y consistente.</p> 

        `; 

        document.getElementById('dash-alertas').innerHTML = ` 

            <li>El certificado de ingresos vence en 15 días.</li> 

            <li>Diferencia menor detectada entre cédula y contrato (nombres secundarios).</li> 

        `; 

    }, 2000); 

} 