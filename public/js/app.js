// Agrega esta función para llamar al backend
async function guardarEnBaseDeDatos(reporte) {
    // Determinar el riesgo más alto entre los involucrados
    const niveles = reporte.personas.map(p => p.nivel_riesgo_sugerido.toLowerCase());
    const riesgoMaximo = niveles.includes('alto') ? 'Alto' : niveles.includes('medio') ? 'Medio' : 'Bajo';

    try {
        await fetch('/api/guardar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                titulo_noticia: reporte.titulo,
                url_noticia: reporte._link,
                riesgo_general: riesgoMaximo,
                datos_json: reporte
            })
        });
        console.log("Informe guardado exitosamente.");
    } catch (error) {
        console.error("Error guardando el informe:", error);
    }
}
