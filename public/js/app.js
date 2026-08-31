async function analizarNoticias() {
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
    status.innerHTML = '<i class="fa-solid fa-spinner fa-spin text-teal"></i> Investigando en la web (Tavily) y analizando con IA...';

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

        // Renderizado del informe corporativo idéntico a tus estándares operativos
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

            <!-- Tabla de Datos del Cliente / Identificación -->
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
                        <tr class="bg-white">
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
}
