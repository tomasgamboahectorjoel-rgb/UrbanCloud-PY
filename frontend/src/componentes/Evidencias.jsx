import { useEffect, useState } from 'react';
import { servicioHttp } from '../servicios/servicioHttp';

function ImagenEvidencia({ evidencia }) {
  const [url, establecerUrl] = useState('');
  const [error, establecerError] = useState(false);

  useEffect(() => {
    let activa = true;
    let creada = '';
    servicioHttp.archivo(evidencia.vista).then((blob) => {
      creada = URL.createObjectURL(blob);
      if (activa) establecerUrl(creada);
      else URL.revokeObjectURL(creada);
    }).catch(() => { if (activa) establecerError(true); });
    return () => { activa = false; if (creada) URL.revokeObjectURL(creada); };
  }, [evidencia.vista]);

  return <div className="evidencia">
    {url && !error ? <img src={url} alt={`Evidencia ${evidencia.tipo}`} onError={() => establecerError(true)} />
      : <div className="sin-imagen">{error ? 'Imagen no disponible' : 'Cargando imagen…'}</div>}
    <small>{evidencia.tipo}</small>
    {url && !error && <a className="evidencia-ver" href={url} target="_blank" rel="noopener noreferrer">Ver imagen completa</a>}
  </div>;
}

export function Evidencias({ evidencias = [] }) {
  return <section className="tarjeta padding"><h2>Evidencias</h2>
    {evidencias?.length ? <div className="rejilla-evidencias">{evidencias.map((evidencia) =>
      <ImagenEvidencia key={evidencia.id} evidencia={evidencia} />)}</div>
      : <div className="evidencia-vacia"><p className="vacio-breve">Aún no hay evidencias disponibles.</p><p className="descripcion">Aquí se muestran las fotografías asociadas al reporte.</p></div>}
  </section>;
}
