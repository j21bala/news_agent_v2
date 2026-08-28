let noticiaCount = 0; 
let reportesMemoria = []; 
 
// Iniciar aplicación 
window.onload = function () { 
    agregarNoticia(); 
}; 
 
// ========================================== 
// MÓDULO 1: NOTICIAS 
// ========================================== 
function agregarNoticia() { 
    noticiaCount++; 
    const container = document.getElementById('noticias-container'); 
    const div = document.createElement('div'); 
    div.className = 'noticia-item'; 
    div.id = `noticia-${noticiaCount}`; 
    div.innerHTML = ` 
        <div class="noticia-item-header"> 
            <span>Noticia ${noticiaCount}</span> 
            ${noticiaCount > 1 ? `<button class="danger-btn" onclick="eliminarNoticia(${noticiaCount})">✕ Quitar</button>` : ''} 
        </div> 
        <label>Link de la noticia</label> 
        <input type="text" id="link-${noticiaCount}" placeholder="https://..."> 
        <label>Texto completo de la noticia</label> 
        <textarea id="articulo-${noticiaCount}" placeholder="Pega aquí el contenido..."></textarea> 
    `; 
    container.appendChild(div); 
} 
 
function eliminarNoticia(id) { 
    const el = document.getElementById(`noticia-${id}`); 
    if (el) el.remove(); 
} 
 
async function analizarTodas() { 
    const btn = document.getElementById('btnAnalizar'); 
    const statusEl = document.getElementById('status'); 
    btn.disabled = true; 
    statusEl.textContent = 'Analizando con IA (Backend Serverless)...'; 
     
    // Aquí irá el fetch('/api/analizar') cuando probemos las rutas. 
    // Simulamos éxito para comprobar renderizado: 
    setTimeout(() => { 
        statusEl.textContent = '¡Renderizado exitoso! Listo para conectar API.'; 
        btn.disabled = false; 
    }, 1000); 
} 
 
// ========================================== 
// MÓDULO 2: ROS 
// ========================================== 
async function generarInformeROS() { 
    const plantilla = document.getElementById('rosPlantilla').value.trim(); 
    const docs = document.getElementById('rosDocumentos').value.trim(); 
    const statusEl = document.getElementById('rosStatus'); 
 
    if (!plantilla || !docs) { 
        alert('Ingresa la plantilla y los documentos.'); 
        return; 
    } 
 
    statusEl.textContent = 'Generando informe...'; 
     
    // Aquí irá el fetch('/api/generar-ros') 
    setTimeout(() => { 
        document.getElementById('rosResultadoPanel').style.display = 'block'; 
        document.getElementById('rosContenido').textContent = "Resultados del backend irán aquí."; 
        statusEl.textContent = 'Completado.'; 
    }, 1000); 
} 
 
// ========================================== 
// MÓDULO 3: CHAT ASISTENTE 
// ========================================== 
async function enviarPregunta() { 
    const input = document.getElementById('chat-input'); 
    const pregunta = input.value.trim(); 
    if (!pregunta) return; 
 
    const historial = document.getElementById('chat-historial'); 
    historial.innerHTML += `<div style="margin-bottom: 8px;"><strong>Tú:</strong> ${pregunta}</div>`; 
    input.value = ''; 
 
    // Aquí irá el fetch('/api/chat') 
    setTimeout(() => { 
        historial.innerHTML += `<div style="margin-bottom: 12px; color: var(--navy2);"><strong>IA:</strong> Conexión UI exitosa.</div>`; 
        historial.scrollTop = historial.scrollHeight; 
    }, 500); 
} 

 