import { Link } from 'react-router';
import { ArrowRight, SlidersHorizontal } from 'lucide-react';
import { fecha, filtrarIncidencias } from '../utilidades/formato';
import { Insignia } from './Estado';
import './incidencias.css';

export function PrioridadIncidencia({ prioridad }) {
  const nombre = typeof prioridad === 'string' && prioridad.trim() ? prioridad.trim() : 'Sin prioridad asignada';
  const tono = { alta: 'alta', media: 'media', baja: 'baja', crítica: 'alta', urgente: 'alta' }[nombre.toLocaleLowerCase('es')] || 'pendiente';
  return <span className={`incidencia-prioridad incidencia-prioridad-${tono}`}><span aria-hidden="true" />{nombre}</span>;
}

export function TablaIncidencias({ incidencias = [], buscar = '', estado = 'Todos', prefijo, sinEnlace = false, filtrosActivos = false, alLimpiar, vacio }) {
  const filas = filtrarIncidencias(incidencias, buscar, estado);
  if (!filas.length) {
    const filtrado = filtrosActivos || buscar.trim() || estado !== 'Todos';
    return filtrado ? <section className="incidencias-vacio" aria-label="Resultado de la búsqueda"><h2>No encontramos coincidencias.</h2><p>Prueba con otro código, título o estado.</p>{alLimpiar && <button type="button" className="btn btn-secondary" onClick={alLimpiar}>Limpiar filtros</button>}</section>
      : vacio || <div className="incidencias-vacio"><p>Todavía no hay incidencias.</p></div>;
  }
  return <div className="tarjeta tabla-contenedor incidencias-listado"><table className="incidencias-tabla" role="table" aria-label="Listado de incidencias">
    <thead role="rowgroup"><tr role="row"><th scope="col" role="columnheader">Código / incidencia</th><th scope="col" role="columnheader">Ubicación</th><th scope="col" role="columnheader">Fecha</th><th scope="col" role="columnheader">Prioridad</th><th scope="col" role="columnheader">Estado</th><th scope="col" role="columnheader"><span className="incidencias-solo-lectores">Acciones</span></th></tr></thead>
    <tbody role="rowgroup">{filas.map((incidencia) => <tr key={incidencia.id} role="row">
      <td role="cell" className="incidencias-identidad"><small id={`codigo-incidencia-${incidencia.id}`}>{incidencia.codigo}</small><strong>{incidencia.titulo}</strong></td>
      <td role="cell" data-etiqueta="Ubicación">{incidencia.distrito || 'Distrito no disponible'}<small>{incidencia.direccion || 'Sin referencia registrada'}</small></td>
      <td role="cell" data-etiqueta="Fecha">{fecha(incidencia.fecha)}</td><td role="cell" data-etiqueta="Prioridad"><PrioridadIncidencia prioridad={incidencia.prioridad} /></td>
      <td role="cell" data-etiqueta="Estado"><Insignia estado={incidencia.estado} /></td>
      <td role="cell" className="incidencias-enlace">{!sinEnlace && <Link className="enlace-tabla" aria-describedby={`codigo-incidencia-${incidencia.id}`} to={`${prefijo}/${incidencia.id}`}>Ver detalle <ArrowRight size={15} aria-hidden="true" /></Link>}</td>
    </tr>)}</tbody></table></div>;
}

export function FiltrosIncidencias({ buscar, alBuscar, estado, alEstado, estados = [], alFiltrar, extras, alLimpiar }) {
  return <form className="filtros" onSubmit={(evento) => { evento.preventDefault(); alFiltrar?.(); }}><label className="campo"><span>Buscar</span>
    <input value={buscar} onChange={(evento) => alBuscar(evento.target.value)} placeholder="Código, título o dirección" /></label>
    <label className="campo"><span>Estado</span><select value={estado} onChange={(evento) => alEstado(evento.target.value)}>
      <option>Todos</option>{estados.map((valor) => <option key={valor}>{valor}</option>)}
    </select></label>{extras}{alFiltrar && <button className="btn btn-secondary">
      <SlidersHorizontal size={16} aria-hidden="true" />Filtrar</button>}{alLimpiar && (buscar || estado !== 'Todos') && <button className="btn btn-secondary" type="button" onClick={alLimpiar}>Restablecer</button>}</form>;
}

export function DatosIncidencia({ incidencia, ciudadano = false }) {
  if (!incidencia) return null;
  const campos = ciudadano
    ? [['Categoría', incidencia.categoria], ['Área responsable', incidencia.area], ['Distrito', incidencia.distrito], ['Dirección', incidencia.direccion], ['Fecha de registro', fecha(incidencia.fecha)], ...(incidencia.fecha_limite ? [['Fecha límite registrada', fecha(incidencia.fecha_limite)]] : [])]
    : [['Categoría', incidencia.categoria], ['Prioridad', incidencia.prioridad], ['Área', incidencia.area], ['Distrito', incidencia.distrito], ['Dirección', incidencia.direccion], ['Plazo', fecha(incidencia.fecha_limite)]];
  return <section className={`tarjeta padding datos-incidencia${ciudadano ? ' datos-incidencia-ciudadano' : ''}`}><div className="cabecera-tarjeta"><div>
    <small className="codigo">{incidencia.codigo}</small><h2>{incidencia.titulo}</h2></div>
    <Insignia estado={incidencia.estado} /></div>
    {ciudadano && <div className="incidencia-prioridad-resumen"><span>Prioridad</span><PrioridadIncidencia prioridad={incidencia.prioridad} /></div>}
    <p className="descripcion">{incidencia.descripcion}</p>
    <div className="datos-grid">
      {campos.map(([titulo, valor]) =>
        <div className="dato" key={titulo}><small>{titulo}</small><strong>{valor || 'Pendiente'}</strong></div>)}
    </div>
  </section>;
}

export function HistorialIncidencia({ historial = [], actualizaciones = [] }) {
  return <section className="tarjeta padding incidencia-historial"><h2>Historial</h2>
    {historial?.length ? <ol className="linea-tiempo">{historial.map((evento, indice) =>
      <li key={`${evento.fecha}-${indice}`}><strong>{evento.nuevo}</strong>
        <small>{fecha(evento.fecha)}</small>{evento.comentario && <p>{evento.comentario}</p>}</li>)}</ol>
      : <p className="vacio-breve">Sin movimientos registrados.</p>}
    {actualizaciones?.length > 0 && <><h3>Avances</h3><ul className="avances">{actualizaciones.map((avance, indice) =>
      <li key={indice}><span>{avance.comentario}</span><small>{fecha(avance.fecha)}</small></li>)}</ul></>}
  </section>;
}
