async function enviarPregunta() {
    const input = document.getElementById('chat-input');
    const pregunta = input.value.trim();
    if (!pregunta) return;

    const historial = document.getElementById('chat-historial');
    historial.innerHTML += `<div style="margin-bottom: 8px;"><strong>Analista:</strong> ${pregunta}</div>`;
    input.value = '';

    // Se extrae el contexto de la primera noticia analizada
    const contextoNoticia = reportes[0] ? JSON.stringify(reportes[0]) : '';

    try {
        const res = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pregunta, contexto: contextoNoticia })
        });
        
        const data = await res.json();
        const fuentesHTML = (data.fuentes && data.fuentes.length)
            ? `<div style="margin-top:4px; font-size: 10px; color: #94a3b8;">Fuentes consultadas: ${data.fuentes.map(f => `<a href="${f}" target="_blank" rel="noopener" style="text-decoration:underline;">${f}</a>`).join(' · ')}</div>`
            : '';
        historial.innerHTML += `<div style="margin-bottom: 12px; color: var(--navy2);"><strong>IA:</strong> ${data.respuesta}${fuentesHTML}</div>`;
        historial.scrollTop = historial.scrollHeight;
    } catch (e) {
        historial.innerHTML += `<div style="color: red;">Error al consultar la IA.</div>`;
    }
}