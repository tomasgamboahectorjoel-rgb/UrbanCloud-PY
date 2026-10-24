import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';
import { Aviso, Encabezado, Estado, TarjetasResumen } from '../componentes/Estado';
import { DatosIncidencia, HistorialIncidencia, TablaIncidencias } from '../componentes/Incidencias';
import { Evidencias } from '../componentes/Evidencias';
import { Mapa } from '../componentes/Mapa';
import { Paginacion } from '../componentes/Paginacion';
import { usarDatos } from '../hooks/usarDatos';
import { servicioDatos } from '../servicios/servicioDatos';
import './operaciones.css';

export function PanelTecnico({ historial = false }) {
  const ubicacion = useLocation();
  const [pagina, establecerPagina] = useState(1);
  const { datos, cargando, error, recargar } = usarDatos(() => historial
    ? servicioDatos.historialTecnico(pagina) : servicioDatos.tareas(pagina), [historial, pagina]);
  const { datos: resumen } = usarDatos(servicioDatos.resumen, []);
  return <div className="operacion-editorial operacion-lista"><Encabezado seccion="PERSONAL TÉCNICO" titulo={historial ? 'Historial de tareas' : 'Mis tareas'}
    descripcion={historial ? 'Intervenciones anteriores.' : 'Casos asignados para atención.'} />
    <Aviso mensaje={ubicacion.state?.aviso} tipo="exito" />
    {!historial && <TarjetasResumen elementos={[
      ['Activas', resumen?.activas, 'Tareas asignadas'], ['Anteriores', resumen?.anteriores, 'Intervenciones pasadas'],
      ['Impedidas', resumen?.impedidas, 'Con impedimento'], ['Avisos', resumen?.no_leidas, 'Sin leer'],
    ]} />}
    <Estado cargando={cargando} error={error} alReintentar={recargar}>
      <TablaIncidencias incidencias={datos?.data || []} prefijo="/tecnico/tareas" sinEnlace={historial}
        vacio={<section className="incidencias-vacio"><h2>{historial ? 'Todavía no hay intervenciones anteriores' : 'No tienes tareas asignadas'}</h2><p>{historial ? 'Las intervenciones que dejen de estar activas se mostrarán en este historial.' : 'Las incidencias asignadas por supervisión aparecerán aquí con su ubicación y estado.'}</p></section>} />
      <Paginacion datos={datos} alCambiar={establecerPagina} />
    </Estado></div>;
}

export function DetalleTecnico() {
  const { id } = useParams();
  const navegar = useNavigate();
  const { datos, cargando, error, recargar } = usarDatos(() => servicioDatos.detalleTecnico(id), [id]);
  const [accion, establecerAccion] = useState('en_camino');
  const [comentario, establecerComentario] = useState('');
  const [foto, establecerFoto] = useState(null);
  const [tipo, establecerTipo] = useState('ATENCION');
  const [mensaje, establecerMensaje] = useState('');
  const [enviando, establecerEnviando] = useState(false);

  async function registrar(evento) {
    evento.preventDefault();
    if (!accionSeleccionada) return;
    establecerEnviando(true); establecerMensaje('');
    const datosEnvio = new FormData();
    datosEnvio.append('accion', accionSeleccionada);
    datosEnvio.append('comentario', comentario);
    if (foto) { datosEnvio.append('fotografia', foto); datosEnvio.append('tipo_evidencia', accionSeleccionada === 'atendido' ? 'CIERRE' : tipo); }
    try {
      const resultado = await servicioDatos.actualizarTarea(id, datosEnvio);
      if (resultado.estado === 'Impedido') {
        navegar('/tecnico/historial', { replace: true,
          state: { aviso: 'Impedimento registrado correctamente. La tarea pasó al historial.' } });
        return;
      }
      establecerMensaje('Avance registrado correctamente.'); establecerComentario(''); establecerFoto(null);
      recargar();
    } catch (fallo) { establecerMensaje(fallo.message); }
    finally { establecerEnviando(false); }
  }

  const opciones = datos?.estado === 'Asignado'
    ? [['en_camino', 'En camino'], ['iniciar', 'Iniciar atención'], ['impedido', 'Impedido']]
    : datos?.estado === 'En atención'
      ? [['atendido', 'Atendido'], ['impedido', 'Impedido']] : [];
  const accionSeleccionada = opciones.some(([clave]) => clave === accion) ? accion : opciones[0]?.[0];

  useEffect(() => {
    if (datos?.estado === 'En atención') establecerAccion('atendido');
  }, [datos?.estado]);

  return <div className="operacion-editorial operacion-detalle"><Encabezado seccion="PERSONAL TÉCNICO" titulo="Detalle de tarea"
    accion={<button className="btn btn-secondary" onClick={() => navegar(-1)}>Volver</button>} />
    <Aviso mensaje={mensaje} tipo={mensaje.includes('correctamente') ? 'exito' : 'error'} />
    <Estado cargando={cargando} error={error} alReintentar={recargar}>
      <div className="distribucion"><div className="columna-lateral"><DatosIncidencia incidencia={datos} />
        {datos?.latitud != null && datos?.longitud != null && Number.isFinite(Number(datos.latitud)) && Number.isFinite(Number(datos.longitud)) && <section className="tarjeta padding"><h2>Ubicación</h2>
          <Mapa latitud={datos.latitud} longitud={datos.longitud} /></section>}
        <Evidencias evidencias={datos?.evidencias} /></div>
        <div className="columna-lateral">{opciones.length > 0 && <section className="tarjeta padding operacion-decision"><span className="eyebrow">TRABAJO EN CAMPO</span><h2>Registrar avance</h2>
          {datos?.estado === 'Asignado' && <p className="descripcion">Para marcar este reporte como Atendido, selecciona primero «Iniciar atención» y registra el avance. Después aparecerá la opción «Atendido».</p>}
          <form className="formulario" onSubmit={registrar}>
            <label className="campo"><span>Acción</span><select value={accionSeleccionada}
              onChange={(evento) => establecerAccion(evento.target.value)}>{opciones.map(([clave, etiqueta]) =>
                <option key={clave} value={clave}>{etiqueta}</option>)}</select></label>
            {accionSeleccionada === 'impedido' && <p className="operacion-nota">El impedimento dejará la tarea en tu historial y requiere explicar el motivo.</p>}
            <label className="campo"><span>Comentario *</span><textarea required minLength={10} value={comentario}
              onChange={(evento) => establecerComentario(evento.target.value)} /></label>
            <label className="campo"><span>Fotografía de evidencia</span><input type="file" accept="image/jpeg,image/png,image/webp"
              onChange={(evento) => establecerFoto(evento.target.files?.[0] || null)} />
              <small>Opcional, recomendado para marcar Atendido.</small></label>
            {foto && accionSeleccionada !== 'atendido' && <label className="campo"><span>Tipo de evidencia</span><select value={tipo}
              onChange={(evento) => establecerTipo(evento.target.value)}><option value="ATENCION">Atención</option><option value="OTRA">Otra</option></select></label>}
            <button className={`btn btn-primary${accionSeleccionada === 'impedido' ? ' operacion-accion-precaucion' : ''}`} disabled={enviando}>{enviando ? 'Guardando…' : 'Registrar avance'}</button>
          </form></section>}
          {!opciones.length && <section className="tarjeta padding"><h2>Estado de la tarea</h2><p className="descripcion">No hay acciones técnicas disponibles para el estado registrado. Puedes consultar las evidencias y el historial.</p></section>}
          <HistorialIncidencia historial={datos?.historial} actualizaciones={datos?.actualizaciones} /></div></div>
    </Estado></div>;
}
