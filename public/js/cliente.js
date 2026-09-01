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

function renderDashboardCliente(data) {
    const perfil = document.getElementById('dash-perfil');
    const alertas = document.getElementById('dash-alertas');
    const resultado = document.getElementById('dashboard-resultado');
    if (!perfil || !alertas || !resultado) return;

    const score = typeof data.score_riesgo === 'number' ? data.score_riesgo : '—';
    const ingresos = typeof data.ingresos_calculados === 'number'
        ? data.ingresos_calculados.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
        : '—';

    perfil.innerHTML = `
        <div class="flex items-center justify-between mb-3">
            <span class="text-slate-500">Score de riesgo</span>
            <span class="font-bold text-navy text-lg">${score} / 100</span>
        </div>
        <div class="flex items-center justify-between">
            <span class="text-slate-500">Ingresos mensuales estimados</span>
            <span class="font-bold text-navy">${ingresos}</span>
        </div>
    `;

    const lista = data.alertas || [];
    alertas.innerHTML = lista.length
        ? lista.map(a => `<li>${a}</li>`).join('')
        : '<li class="text-slate-400 list-none pl-0">Sin alertas detectadas.</li>';

    resultado.classList.remove('hidden');
    resultado.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
