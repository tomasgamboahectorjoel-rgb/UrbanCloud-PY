import { useEffect } from 'react';

// Mejora progresiva: nunca ocultamos secciones esperando JavaScript o el observer.
export function usarRevelado(contenedor) {
  useEffect(() => {
    if (!contenedor.current || typeof window.IntersectionObserver !== 'function') return;
    const secciones = [...contenedor.current.querySelectorAll('.publico-seccion, .publico-cta')];
    const vistos = new WeakSet();
    const preferencia = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    let observer;

    function configurar() {
      observer?.disconnect();
      if (preferencia?.matches) {
        secciones.forEach(seccion => seccion.classList.remove('publico-revelado'));
        return;
      }
      observer = new IntersectionObserver(entradas => {
        entradas.forEach(({ target, isIntersecting }) => {
          if (!isIntersecting || vistos.has(target)) return;
          vistos.add(target);
          target.classList.add('publico-revelado');
          observer.unobserve(target);
        });
      }, { threshold: 0.08, rootMargin: '0px 0px -24px 0px' });
      secciones.forEach(seccion => { if (!vistos.has(seccion)) observer.observe(seccion); });
    }

    configurar();
    preferencia?.addEventListener?.('change', configurar);
    return () => {
      observer?.disconnect();
      preferencia?.removeEventListener?.('change', configurar);
    };
  }, [contenedor]);
}
