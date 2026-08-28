async function generarInformeROS() {
  const plantillaPrompt = document.getElementById('rosPlantilla').value.trim();
  const textoDocumentos = document.getElementById('rosDocumentos').value.trim();
  const statusEl = document.getElementById('rosStatus');

  if (!plantillaPrompt || !textoDocumentos) {
    alert('Ingresa tanto las indicaciones de la plantilla como el texto de los documentos.');
    return;
  }

  statusEl.textContent = 'Procesando informe con IA (Temperatura 0)...';

  try {
    const res = await fetch('/api/generar-ros', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plantillaPrompt, textoDocumentos })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    document.getElementById('rosResultadoPanel').style.display = 'block';
    document.getElementById('rosMotorBadge').textContent = `Procesado con: ${data.motor}`;
    document.getElementById('rosContenido').textContent = data.informe;
    statusEl.textContent = 'Informe completado ✓';

  } catch (err) {
    alert(`Error al generar el ROS: ${err.message}`);
    statusEl.textContent = '';
  }
}
