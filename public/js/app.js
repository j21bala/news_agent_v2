// Manejo de la Navegación (SPA) 

function navegarA(idVista) { 

    // 1. Ocultar todas las vistas 

    const vistas = ['view-menu', 'view-noticias', 'view-ros', 'view-cliente']; 

    vistas.forEach(vista => { 

        document.getElementById(vista).classList.add('hidden'); 

    }); 

 

    // 2. Mostrar la vista solicitada con un scroll hacia arriba 

    const vistaActiva = document.getElementById(idVista); 

    vistaActiva.classList.remove('hidden'); 

    window.scrollTo({ top: 0, behavior: 'smooth' }); 

} 

 

// Configuración de los Drag & Drop (Zonas de archivos) 

// Implementaremos la lógica de File API en el siguiente paso. 

console.log("Aplicación inicializada y lista para conectar la lógica de IA."); 