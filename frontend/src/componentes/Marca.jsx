import { LogoMarca } from './LogoMarca';

export function IconoMarca({ compacto = false }) {
  return (
    <span className={`marca-icono${compacto ? ' marca-icono-compacto' : ''}`} aria-hidden="true">
      <LogoMarca />
    </span>
  );
}

export function Marca() {
  return (
    <>
      <IconoMarca />
      <span className="marca-texto">
        <strong>UrbanCloud <b>AI</b></strong>
        <small>Ciudad mejor conectada</small>
      </span>
    </>
  );
}
