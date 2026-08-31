/**
 * Animación de fondo "red de datos" para el landing de Inteligencia SARLAFT.
 * Nodos que se desplazan lentamente y se conectan cuando están cerca,
 * evocando un grafo de relaciones/transacciones. Discreta y de bajo contraste
 * a propósito: es ambientación, no el foco de atención.
 */
(function () {
  function iniciar() {
    const canvas = document.getElementById('data-bg-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let ancho, alto, nodos, dpr;
    const DENSIDAD = 9000; // px^2 por nodo: controla cuántos nodos según tamaño de pantalla
    const DIST_MAX = 150;

    function medir() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      ancho = canvas.clientWidth;
      alto = canvas.clientHeight;
      canvas.width = ancho * dpr;
      canvas.height = alto * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function crearNodos() {
      const total = Math.min(70, Math.max(28, Math.floor((ancho * alto) / DENSIDAD)));
      nodos = Array.from({ length: total }, () => ({
        x: Math.random() * ancho,
        y: Math.random() * alto,
        vx: (Math.random() - 0.5) * 0.18,
        vy: (Math.random() - 0.5) * 0.18,
        r: Math.random() * 1.4 + 0.6,
      }));
    }

    function paso() {
      ctx.clearRect(0, 0, ancho, alto);

      for (const n of nodos) {
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < 0 || n.x > ancho) n.vx *= -1;
        if (n.y < 0 || n.y > alto) n.vy *= -1;
      }

      for (let i = 0; i < nodos.length; i++) {
        for (let j = i + 1; j < nodos.length; j++) {
          const a = nodos[i], b = nodos[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < DIST_MAX) {
            const op = (1 - dist / DIST_MAX) * 0.16;
            ctx.strokeStyle = `rgba(56,189,208,${op})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      for (const n of nodos) {
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(94,211,230,0.55)';
        ctx.fill();
      }

      if (!reduceMotion) requestAnimationFrame(paso);
    }

    function resize() {
      medir();
      crearNodos();
    }

    window.addEventListener('resize', resize);
    resize();
    // Si el usuario prefiere menos movimiento, dibujamos un solo frame estático.
    paso();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
  } else {
    iniciar();
  }
})();
