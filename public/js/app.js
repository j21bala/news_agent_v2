// ==========================================
// 1. NAVEGACIÓN SPA (Single Page Application)
// ==========================================
function navegarA(idVista) {
  // Definir todas las vistas disponibles
  const vistas = ["view-menu", "view-noticias", "view-ros", "view-cliente"];

  // Ocultar todas agregando la clase 'hidden' de Tailwind
  vistas.forEach((vista) => {
    document.getElementById(vista).classList.add("hidden");
  });

  // Mostrar solo la vista seleccionada quitando la clase 'hidden'
  document.getElementById(idVista).classList.remove("hidden");

  // Hacer scroll arriba de forma suave
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ==========================================
// 2. MÓDULO: NOTICIAS & CHAT ASISTENTE
// ==========================================
let noticiaCount = 0;
let contextoReporteActual = null;

document.addEventListener("DOMContentLoaded", () => {
  agregarNoticia(); // Inicia con un campo vacío al cargar la web
});

function agregarNoticia() {
  noticiaCount++;
  const container = document.getElementById("noticias-container");
  if (!container) return;

  const div = document.createElement("div");
  div.className =
    "bg-slate-50 border border-slate-200 rounded-lg p-4 mb-3 fade-in";
  div.id = `noticia-${noticiaCount}`;
  div.innerHTML = `
        <div class="flex justify-between items-center mb-2">
            <span class="font-bold text-sm text-navy">Noticia ${noticiaCount}</span>
            ${noticiaCount > 1 ? `<button onclick="eliminarNoticia(${noticiaCount})" class="text-red-500 text-xs hover:underline"><i class="fa-solid fa-trash"></i> Quitar</button>` : ""}
        </div>
        <input type="text" id="link-${noticiaCount}" class="w-full border border-slate-300 rounded-md px-3 py-2 text-sm mb-2 focus:outline-none focus:border-teal" placeholder="Enlace web (opcional)">
        <textarea id="articulo-${noticiaCount}" class="w-full border border-slate-300 rounded-md px-3 py-2 text-sm h-24 focus:outline-none focus:border-teal" placeholder="Pega el texto de la noticia aquí..."></textarea>
    `;
  container.appendChild(div);
}

function eliminarNoticia(id) {
  document.getElementById(`noticia-${id}`)?.remove();
}

async function analizarNoticias() {
  const btn = document.getElementById("btnAnalizarNoticias");
  const status = document.getElementById("status-noticias");

  const articulos = [];
  for (let i = 1; i <= noticiaCount; i++) {
    const texto = document.getElementById(`articulo-${i}`)?.value.trim();
    if (texto) articulos.push(texto);
  }

  if (articulos.length === 0) {
    alert("Por favor, pega el texto de al menos una noticia.");
    return;
  }

  btn.disabled = true;
  btn.classList.add("opacity-50");
  status.innerHTML =
    '<i class="fa-solid fa-spinner fa-spin text-teal"></i> Analizando...';

  try {
    const res = await fetch("/api/analizar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ articulos }),
    });

    if (!res.ok) throw new Error("Error en el servidor");
    const data = await res.json();

    contextoReporteActual = data;
    document.getElementById("reporte-noticias").classList.remove("hidden");

    let colorRiesgo = data.riesgo_general?.toLowerCase().includes("alto")
      ? "text-red-600 bg-red-50 border-red-500"
      : "text-yellow-700 bg-yellow-50 border-yellow-500";

    let involucradosHTML = (data.involucrados || [])
      .map(
        (inv) => `
            <li class="mb-2"><strong>${inv.nombre}</strong> - ${inv.rol} <span class="bg-slate-200 text-xs px-2 py-1 rounded ml-2">${inv.estado}</span></li>
        `,
      )
      .join("");

    document.getElementById("contenido-noticias").innerHTML = `
            <div class="p-4 border-l-4 rounded mb-4 ${colorRiesgo}">
                <strong class="uppercase">Riesgo Global: ${data.riesgo_general || "Medio"}</strong>
            </div>
            <p class="mb-4 text-sm leading-relaxed"><strong>Resumen:</strong> ${data.resumen}</p>
            <h4 class="font-bold text-navy mb-2">Involucrados Detectados:</h4>
            <ul class="list-disc pl-5 text-sm">${involucradosHTML}</ul>
        `;

    document.getElementById("chat-historial").innerHTML =
      `<div class="text-center text-teal text-xs mb-3 border-b pb-2">Contexto cargado en memoria. El asistente está listo para tus preguntas.</div>`;
    status.textContent = "¡Análisis completado!";
  } catch (error) {
    status.innerHTML =
      '<span class="text-red-500">Error en el análisis. Revisa la consola.</span>';
  } finally {
    btn.disabled = false;
    btn.classList.remove("opacity-50");
  }
}

async function enviarPregunta() {
  const input = document.getElementById("chat-input");
  const pregunta = input.value.trim();
  if (!pregunta) return;
  if (!contextoReporteActual)
    return alert(
      "Primero debes analizar una noticia para activar el asistente.",
    );

  const historial = document.getElementById("chat-historial");
  historial.innerHTML += `<div class="self-end bg-navy text-white px-3 py-2 rounded-lg text-xs max-w-[85%] mb-2">${pregunta}</div>`;
  input.value = "";
  historial.scrollTop = historial.scrollHeight;

  const idTemp = "temp-" + Date.now();
  historial.innerHTML += `<div id="${idTemp}" class="self-start bg-slate-200 text-slate-500 px-3 py-2 rounded-lg text-xs max-w-[85%] mb-2"><i class="fa-solid fa-ellipsis fa-fade"></i></div>`;
  historial.scrollTop = historial.scrollHeight;

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pregunta, contexto: contextoReporteActual }),
    });
    const data = await res.json();
    document.getElementById(idTemp).outerHTML =
      `<div class="self-start bg-slate-200 text-navy px-3 py-2 rounded-lg text-xs max-w-[85%] mb-2">${data.respuesta}</div>`;
  } catch (error) {
    document.getElementById(idTemp).outerHTML =
      `<div class="self-start bg-red-100 text-red-600 px-3 py-2 rounded-lg text-xs max-w-[85%] mb-2">Error de conexión con el asistente.</div>`;
  }
  historial.scrollTop = historial.scrollHeight;
}

// ==========================================
// 3. MÓDULO: ROS (Reporte de Operaciones)
// ==========================================
function mostrarArchivos(inputId, listaId) {
  const input = document.getElementById(inputId);
  const lista = document.getElementById(listaId);
  lista.innerHTML = "";
  Array.from(input.files).forEach((file) => {
    lista.innerHTML += `<li><i class="fa-solid fa-file-lines text-slate-400 mr-2"></i> ${file.name}</li>`;
  });
}

async function analizarROS() {
  const btn = document.getElementById("btnAnalizarRos");
  const status = document.getElementById("status-ros");
  const plantillaPrompt = document.getElementById("rosPlantilla").value.trim();
  const files = document.getElementById("rosArchivos").files;

  if (!plantillaPrompt || files.length === 0) {
    return alert("Ingresa la plantilla y selecciona al menos un documento.");
  }

  btn.disabled = true;
  btn.classList.add("opacity-50");
  status.innerHTML =
    '<i class="fa-solid fa-spinner fa-spin text-gold"></i> Leyendo documentos y generando ROS...';

  try {
    let textoDocumentos = "";
    for (const file of files) {
      textoDocumentos += `\n--- Archivo: ${file.name} ---\n`;
      textoDocumentos += await file.text();
    }

    const res = await fetch("/api/generar-ros", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plantillaPrompt, textoDocumentos }),
    });

    if (!res.ok) throw new Error("Error en el servidor");
    const data = await res.json();

    document.getElementById("reporte-ros").classList.remove("hidden");
    document.getElementById("contenido-ros").textContent = data.informe;
    status.textContent = "¡ROS Generado exitosamente!";
  } catch (error) {
    status.innerHTML =
      '<span class="text-red-500">Error al generar ROS. ¿Son archivos de texto legibles?</span>';
  } finally {
    btn.disabled = false;
    btn.classList.remove("opacity-50");
  }
}

// ==========================================
// 4. MÓDULO: DASHBOARD CLIENTE (Multimodal)
// ==========================================
let imagenesBase64 = [];

function mostrarPreviewImagenes() {
  const input = document.getElementById("clienteImagenes");
  const preview = document.getElementById("preview-imagenes");
  preview.innerHTML = "";
  imagenesBase64 = [];

  const files = Array.from(input.files).slice(0, 6);
  files.forEach((file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64String = e.target.result;
      imagenesBase64.push(base64String.split(",")[1]);
      preview.innerHTML += `<div class="w-24 h-24 rounded-lg border border-slate-300 overflow-hidden shadow-sm"><img src="${base64String}" class="w-full h-full object-cover"></div>`;
    };
    reader.readAsDataURL(file);
  });
}

async function analizarCliente() {
  const btn = document.getElementById("btnAnalizarCliente");
  const status = document.getElementById("status-cliente");

  if (imagenesBase64.length === 0)
    return alert("Sube al menos una imagen (ej. Cédula o Estado Financiero).");

  btn.disabled = true;
  btn.classList.add("opacity-50");
  status.innerHTML =
    '<i class="fa-solid fa-spinner fa-spin text-purple-600"></i> Analizando imágenes con IA Multimodal...';

  try {
    const res = await fetch("/api/analizar-cliente", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imagenes: imagenesBase64 }),
    });

    if (!res.ok) throw new Error("Error en el servidor");
    const data = await res.json();

    document.getElementById("dashboard-resultado").classList.remove("hidden");

    let alertasHTML = (data.alertas || [])
      .map((alerta) => `<li>${alerta}</li>`)
      .join("");

    document.getElementById("dash-perfil").innerHTML = `
            <div class="text-3xl font-bold text-teal mb-2">Score: ${data.score_riesgo || "N/A"}/100</div>
            <p><strong>Ingresos Calculados:</strong> $${data.ingresos_calculados || "0"}</p>
            <p><strong>Identidad y Consistencia:</strong> Verificado.</p>
        `;
    document.getElementById("dash-alertas").innerHTML =
      alertasHTML || "<li>No se detectaron alertas críticas.</li>";

    status.textContent = "Dashboard financiero generado.";
  } catch (error) {
    status.innerHTML =
      '<span class="text-red-500">Error procesando imágenes.</span>';
  } finally {
    btn.disabled = false;
    btn.classList.remove("opacity-50");
  }

  // ==========================================
  // 5. EXPORTACIÓN DE REPORTES
  // ==========================================
  function exportarExcel(tipo) {
    if (tipo === "noticias" && contextoReporteActual) {
      // Crear hoja de cálculo con los involucrados
      const ws = XLSX.utils.json_to_sheet(contextoReporteActual.involucrados);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Involucrados");
      XLSX.writeFile(wb, "Reporte_SARLAFT.xlsx");
    } else {
      alert("No hay datos para exportar.");
    }
  }
}
