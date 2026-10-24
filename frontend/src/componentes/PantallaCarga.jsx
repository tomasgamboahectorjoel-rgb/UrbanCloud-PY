import { ImagenMarca } from './Marca';
import './pantalla-carga.css';

export function PantallaCarga() {
  return <div className="carga-marca" role="status" aria-live="polite" aria-atomic="true">
    <div className="carga-marca-logo" aria-hidden="true"><ImagenMarca /></div>
    <p>Cargando UrbanCloud AI…</p>
    <span className="carga-marca-indicador" aria-hidden="true" />
  </div>;
}
