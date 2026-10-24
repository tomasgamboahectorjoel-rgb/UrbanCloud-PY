export function ImagenMarca() {
  return <picture className="imagen-marca"><source srcSet="/urbancloud-logo.webp" type="image/webp" /><img src="/urbancloud-logo.png" alt="" width="512" height="512" draggable="false" /></picture>;
}

export function IconoMarca({ compacto = false }) {
  return (
    <span className={`marca-icono${compacto ? ' marca-icono-compacto' : ''}`} aria-hidden="true">
      <ImagenMarca />
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
