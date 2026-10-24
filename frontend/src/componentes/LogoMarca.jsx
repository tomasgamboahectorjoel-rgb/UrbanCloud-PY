export function LogoMarca({ className = '', alt = '' }) {
  return (
    <picture>
      <source srcSet="/urbancloud-logo.webp" type="image/webp" />
      <img className={className} src="/urbancloud-logo.png" alt={alt} width="512" height="512" decoding="async" />
    </picture>
  );
}
