import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { Aviso, Encabezado, Estado, TarjetasResumen } from '../componentes/Estado';
import { DatosIncidencia, HistorialIncidencia, TablaIncidencias } from '../componentes/Incidencias';
import { Evidencias } from '../componentes/Evidencias';
import { Mapa } from '../componentes/Mapa';
import { Paginacion } from '../componentes/Paginacion';
import { usarDatos } from '../hooks/usarDatos';
import { servicioDatos } from '../servicios/servicioDatos';
import './operaciones.css';

export function PanelSupervisor() {
  const { datos, cargando, error, recargar } = usarDatos(servicioDatos.resumen, []);
  return <div className="operacion-editorial operacion-panel"><Encabezado seccion="SUPERVISOR" titulo="Resumen operativo" descripcion="Asigna la atención, revisa impedimentos y valida los cierres documentados."
    accion={<><Link className="btn btn-primary" to="/supervisor/derivados">Ver casos derivados</Link>
      <Link className="btn btn-secondary" to="/supervisor/atendidos">Ver cierres pendientes</Link></>} />
    <Estado cargando={cargando} error={error} alReintentar={recargar}>
      <TarjetasResumen elementos={[
        ['Abiertas', datos?.abiertas, 'Casos activos'], ['Próximas a vencer', datos?.proximas_vencer, 'Dentro de 48 horas'],
        ['Sin responsable', datos?.sin_responsable, 'Asignación pendiente'], ['Cierres validados', datos?.cerradas, 'Finalizados'],
      ]} />
      <div className="distribucion"><section className="tarjeta padding operacion-guia"><span className="eyebrow">COORDINACIÓN DE LA ATENCIÓN</span><h2>Atención prioritaria</h2>
        <p className="descripcion">Consulta las incidencias impedidas, sin responsable y los vencimientos próximos.</p>
        <Link className="btn btn-secondary" to="/supervisor/riesgos">Ver riesgos</Link></section>
        <section className="tarjeta padding"><h2>Capacidad por área</h2>
          {datos?.carga_por_area?.length ? datos.carga_por_area.map((area) => <div className="fila-metrica" key={area.id}>
            <span>{area.nombre}</span><strong>{area.tecnicos_activos == null ? 'Sin dato' : `${area.tecnicos_activos} técnicos activos`}</strong></div>) : <p className="vacio-breve">No hay capacidad por área registrada.</p>}</section></div>
    </Estado></div>;
}

export function ListaSupervisor({ tipo = 'derivados' }) {
  const [pagina, establecerPagina] = useState(1);
  const { datos, cargando, error, recargar } = usarDatos(() => servicioDatos.casosSupervisor(
    tipo === 'derivados' ? { estado: 'Derivado' }
      : tipo === 'atendidos' ? { estado: 'Atendido' } : { riesgos: 1 }, pagina), [tipo, pagina]);
  const titulo = tipo === 'derivados' ? 'Casos derivados'
    : tipo === 'atendidos' ? 'Pendientes de cierre' : 'Riesgos y SLA';
  const vacios = { derivados: ['Sin incidencias por asignar', 'Las incidencias derivadas para asignación aparecerán aquí.'], atendidos: ['No hay cierres pendientes', 'Aquí se muestran las incidencias atendidas que requieren validación de cierre.'], riesgos: ['Sin incidencias en esta consulta de riesgos', 'La consulta incluye incidencias impedidas, sin responsable o próximas a vencer.'] };
  const contexto = vacios[tipo] || vacios.riesgos;
  return <div className="operacion-editorial operacion-lista"><Encabezado seccion="SUPERVISOR" titulo={titulo} descripcion={tipo === 'derivados' ? 'Organiza la asignación de cada incidencia al personal compatible.' : tipo === 'atendidos' ? 'Revisa notas y evidencias antes de aprobar el cierre.' : 'Consulta los riesgos operativos y las fechas límite registradas.'} />
    <Estado cargando={cargando} error={error} alReintentar={recargar}>
      <TablaIncidencias incidencias={datos?.data || []} prefijo="/supervisor/incidencias" vacio={<section className="incidencias-vacio"><h2>{contexto[0]}</h2><p>{contexto[1]}</p></section>} />
      <Paginacion datos={datos} alCambiar={establecerPagina} />
    </Estado></div>;
}

export function EquipoSupervisor() {
  const { datos, cargando, error, recargar } = usarDatos(servicioDatos.equipo, []);
  return <div className="operacion-editorial operacion-equipo"><Encabezado seccion="SUPERVISOR" titulo="Carga del equipo" descripcion="Consulta las tareas activas del personal técnico por área." />
    <Estado cargando={cargando} error={error} alReintentar={recargar}>
      {datos?.length ? <div className="tarjeta tabla-contenedor operacion-equipo-contenedor"><table className="operacion-equipo-tabla" role="table" aria-label="Personal técnico y carga activa"><thead role="rowgroup"><tr role="row"><th scope="col" role="columnheader">Técnico</th><th scope="col" role="columnheader">Área</th><th scope="col" role="columnheader">Tareas activas</th><th scope="col" role="columnheader">Disponibilidad</th></tr></thead>
        <tbody role="rowgroup">{datos.map((tecnico) => <tr key={tecnico.id} role="row"><td role="cell" className="operacion-equipo-nombre"><strong>{tecnico.nombre}</strong></td>
          <td role="cell" data-etiqueta="Área">{tecnico.area || 'Sin área registrada'}</td><td role="cell" data-etiqueta="Tareas activas">{tecnico.tareas_activas ?? 'Sin dato'}</td>
          <td role="cell" data-etiqueta="Disponibilidad">{tecnico.tareas_activas == null ? 'Carga no disponible' : tecnico.tareas_activas === 0 ? 'Disponible' : 'En servicio'}</td></tr>)}</tbody></table></div> : <section className="incidencias-vacio"><h2>Todavía no hay personal técnico en el equipo.</h2><p>El personal técnico disponible en esta consulta aparecerá con su carga de tareas.</p></section>}
    </Estado></div>;
}

function AccionesSupervisor({ incidencia, tecnicos, alCompletar }) {
  const [tecnicoId, establecerTecnicoId] = useState('');
  const [comentario, establecerComentario] = useState('');
  const [error, establecerError] = useState('');
  const [enviando, establecerEnviando] = useState(false);
  async function ejecutar(accion, datos) {
    establecerError(''); establecerEnviando(true);
    try {
      if (accion === 'asignar') await servicioDatos.asignar(incidencia.id, datos);
      if (accion === 'cerrar') await servicioDatos.cerrar(incidencia.id, datos);
      if (accion === 'devolver') await servicioDatos.devolver(incidencia.id, datos);
      alCompletar();
    } catch (fallo) { establecerError(fallo.message); }
    finally { establecerEnviando(false); }
  }
  if (!incidencia) return null;
  return <div className="columna-lateral operacion-acciones"><Aviso mensaje={error} tipo="error" />
    {['Derivado', 'Asignado', 'En atención', 'Impedido'].includes(incidencia.estado) &&
      <section className="tarjeta padding operacion-decision"><span className="eyebrow">RESPONSABLE DE ATENCIÓN</span><h2>{incidencia.estado === 'Derivado' ? 'Asignar técnico' : 'Reasignar técnico'}</h2>
        <p className="descripcion">Selecciona personal compatible con el área responsable y deja el contexto necesario para la intervención.</p>
        {!tecnicos?.length && <p className="operacion-nota">No hay técnicos compatibles disponibles para esta incidencia.</p>}
        <form className="formulario" onSubmit={(evento) => { evento.preventDefault(); ejecutar('asignar', { tecnico_id: Number(tecnicoId), comentario }); }}>
          <label className="campo"><span>Técnico compatible</span><select required value={tecnicoId}
            onChange={(evento) => establecerTecnicoId(evento.target.value)}><option value="">Selecciona</option>
            {tecnicos?.map((tecnico) => <option key={tecnico.id} value={tecnico.id}>
              {tecnico.nombre} · {tecnico.asignaciones_activas} tareas</option>)}</select></label>
          <label className="campo"><span>Comentario</span><textarea value={comentario}
            onChange={(evento) => establecerComentario(evento.target.value)} /></label>
          <button className="btn btn-primary" disabled={enviando || !tecnicos?.length}>Confirmar asignación</button>
        </form></section>}
    {incidencia.estado === 'Impedido' && <section className="tarjeta padding"><h2>Devolver al Operador</h2>
      <p className="descripcion">Úsalo cuando el caso requiera nueva clasificación. La incidencia regresará a revisión del operador.</p>
      <form className="formulario" onSubmit={(evento) => { evento.preventDefault(); ejecutar('devolver', { motivo: comentario }); }}>
        <label className="campo"><span>Motivo</span><textarea required minLength={10} value={comentario}
          onChange={(evento) => establecerComentario(evento.target.value)} /></label>
        <button className="btn btn-secondary operacion-accion-precaucion" disabled={enviando}>Devolver</button></form></section>}
    {incidencia.estado === 'Atendido' && <section className="tarjeta padding"><h2>Validar cierre</h2>
      <p className="descripcion">Revisa las notas y evidencias antes de aprobar.</p>
      <form className="formulario" onSubmit={(evento) => { evento.preventDefault(); ejecutar('cerrar', { comentario }); }}>
        <label className="campo"><span>Comentario</span><textarea value={comentario}
          onChange={(evento) => establecerComentario(evento.target.value)} /></label>
        <button className="btn btn-primary operacion-accion-cierre" disabled={enviando}>Aprobar cierre</button></form></section>}
    {!['Derivado', 'Asignado', 'En atención', 'Impedido', 'Atendido'].includes(incidencia.estado) && <section className="tarjeta padding"><h2>Consulta de la incidencia</h2><p className="descripcion">No hay acciones de supervisión disponibles para el estado registrado.</p></section>}
  </div>;
}

export function DetalleSupervisor() {
  const { id } = useParams();
  const navegar = useNavigate();
  const { datos, cargando, error, recargar } = usarDatos(() => servicioDatos.detalleSupervisor(id), [id]);
  const [mensaje, establecerMensaje] = useState('');
  return <div className="operacion-editorial operacion-detalle"><Encabezado seccion="SUPERVISOR" titulo="Detalle de incidencia"
    accion={<button className="btn btn-secondary" onClick={() => navegar(-1)}>Volver</button>} />
    <Aviso mensaje={mensaje} tipo="exito" />
    <Estado cargando={cargando} error={error} alReintentar={recargar}>
      <div className="distribucion"><div className="columna-lateral"><DatosIncidencia incidencia={datos?.incidencia} />
        {datos?.incidencia?.latitud != null && datos?.incidencia?.longitud != null && Number.isFinite(Number(datos.incidencia.latitud)) && Number.isFinite(Number(datos.incidencia.longitud)) && <section className="tarjeta padding"><h2>Ubicación</h2>
          <Mapa latitud={datos.incidencia.latitud} longitud={datos.incidencia.longitud} /></section>}
        <Evidencias evidencias={datos?.incidencia?.evidencias} />
        <HistorialIncidencia historial={datos?.incidencia?.historial} actualizaciones={datos?.incidencia?.actualizaciones} /></div>
        <AccionesSupervisor incidencia={datos?.incidencia} tecnicos={datos?.tecnicos_compatibles}
          alCompletar={() => { establecerMensaje('Decisión registrada.'); recargar(); }} /></div>
    </Estado></div>;
}
