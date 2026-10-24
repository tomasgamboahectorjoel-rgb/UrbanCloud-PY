export function Estado({ cargando, error, vacio, children, alReintentar }) {
  if (cargando) return <div className="estado-panel" role="status">Cargando información…</div>;
  if (error) return <div className="estado-panel error" role="alert"><p>{error}</p>
    {alReintentar && <button className="btn btn-secondary" onClick={alReintentar}>Reintentar</button>}
  </div>;
  if (vacio) return <div className="estado-panel">Todavía no hay datos para mostrar.</div>;
  return children;
}

export function Aviso({ mensaje, tipo = 'info' }) {
  return mensaje ? <div className={`aviso aviso-${tipo}`} role="status">{mensaje}</div> : null;
}

export function Encabezado({ seccion, titulo, descripcion, accion }) {
  return <div className="encabezado">
    <div><span className="eyebrow">{seccion}</span><h1>{titulo}</h1>{descripcion && <p>{descripcion}</p>}</div>
    {accion && <div className="acciones-encabezado">{accion}</div>}
  </div>;
}

export function Insignia({ estado }) {
  const tono = ['Cerrado', 'Atendido'].includes(estado) ? 'verde'
    : ['Impedido', 'Revisión solicitada'].includes(estado) ? 'rojo'
      : ['En revisión', 'Derivado'].includes(estado) ? 'ambar' : 'azul';
  return <span className={`insignia insignia-${tono}`}>{estado || 'Sin estado'}</span>;
}

export function TarjetasResumen({ elementos }) {
  return <div className="tarjetas-resumen">{elementos.map(([titulo, valor, nota]) =>
    <div className="tarjeta cifra" key={titulo}><span>{titulo}</span><strong aria-label={valor == null ? 'Dato no disponible' : undefined}>{valor ?? '—'}</strong><small>{nota}</small></div>)}</div>;
}
