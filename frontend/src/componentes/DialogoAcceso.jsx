import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { LogoMarca } from './LogoMarca';

/**
 * Marco visual de los diálogos de acceso (inicio de sesión, registro y recuperación).
 * Solo aporta el diseño: la lógica de cada formulario permanece en su propio componente.
 * Cerrar (X, Esc o clic fuera) devuelve a la portada.
 */
export function DialogoAcceso({ tituloId, ancho = 'normal', children }) {
  const navegar = useNavigate();
  const dialogo = useRef(null);
  const origen = useRef(null);

  useEffect(() => {
    origen.current = document.activeElement;
    document.body.style.overflow = 'hidden';
    dialogo.current?.focus();
    return () => {
      document.body.style.overflow = '';
      origen.current?.focus?.();
    };
  }, []);

  function alTeclear(evento) {
    if (evento.key === 'Escape') { navegar('/'); return; }
    if (evento.key !== 'Tab' || !dialogo.current) return;
    const enfocables = [...dialogo.current.querySelectorAll('button:not([disabled]),input:not([disabled]),a[href]')];
    if (!enfocables.length) return;
    const primero = enfocables[0];
    const ultimo = enfocables[enfocables.length - 1];
    if (evento.shiftKey && (document.activeElement === primero || document.activeElement === dialogo.current)) { evento.preventDefault(); ultimo.focus(); }
    else if (!evento.shiftKey && document.activeElement === ultimo) { evento.preventDefault(); primero.focus(); }
  }

  return (
    <div className="lp-overlay lp-open" onKeyDown={alTeclear}
      onMouseDown={(evento) => { if (evento.target === evento.currentTarget) navegar('/'); }}>
      <section className={`lp-dialog lp-dialog-acceso${ancho === 'registro' ? ' lp-signup' : ''}`}
        role="dialog" aria-modal="true" aria-labelledby={tituloId} ref={dialogo} tabIndex={-1}>
        <button type="button" className="lp-close" aria-label="Cerrar" onClick={() => navegar('/')}>×</button>
        <div className="lp-dialog-brand"><LogoMarca /><span>UrbanCloud AI</span></div>
        {children}
      </section>
    </div>
  );
}
