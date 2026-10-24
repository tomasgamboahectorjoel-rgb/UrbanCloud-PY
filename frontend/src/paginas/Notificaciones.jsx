import { useState } from 'react';
import { Bell, Check, CheckCheck } from 'lucide-react';
import { Encabezado, Estado, Aviso } from '../componentes/Estado';
import { Paginacion } from '../componentes/Paginacion';
import { usarDatos } from '../hooks/usarDatos';
import { servicioDatos } from '../servicios/servicioDatos';
import { fecha } from '../utilidades/formato';

export function PaginaNotificaciones() {
  const [pagina, establecerPagina] = useState(1);
  const { datos, cargando, error, recargar } = usarDatos(() => servicioDatos.notificaciones(pagina), [pagina]);
  const [mensaje, establecerMensaje] = useState('');
  const [tipoMensaje, establecerTipoMensaje] = useState('info');
  const [procesando, establecerProcesando] = useState(false);
  async function leerTodas() {
    establecerProcesando(true); establecerMensaje(''); establecerTipoMensaje('exito');
    try { await servicioDatos.leerTodas(); establecerMensaje('Notificaciones marcadas como leídas.'); recargar();
      window.dispatchEvent(new Event('notificaciones-actualizadas')); }
    catch (fallo) { establecerTipoMensaje('error'); establecerMensaje(fallo.message); }
    finally { establecerProcesando(false); }
  }
  async function leer(id) {
    establecerProcesando(true); establecerMensaje(''); establecerTipoMensaje('exito');
    try { await servicioDatos.leer(id); recargar(); window.dispatchEvent(new Event('notificaciones-actualizadas')); }
    catch (fallo) { establecerTipoMensaje('error'); establecerMensaje(fallo.message); }
    finally { establecerProcesando(false); }
  }
  return <div className="soporte-pagina actividad-notificaciones"><Encabezado seccion="ACTIVIDAD" titulo="Notificaciones" descripcion="Actualizaciones sobre tus incidencias y la actividad del sistema."
    accion={<button className="btn btn-secondary" onClick={leerTodas} disabled={procesando || !datos?.no_leidas}>
      <CheckCheck size={17} aria-hidden="true" />Marcar todas como leídas</button>} />
    <Aviso mensaje={mensaje} tipo={tipoMensaje} /><Estado cargando={cargando} error={error} alReintentar={recargar}>
      {datos?.no_leidas != null && <p className="actividad-resumen"><strong>{datos.no_leidas}</strong> {datos.no_leidas === 1 ? 'notificación sin leer' : 'notificaciones sin leer'}</p>}
      {datos?.notificaciones?.data?.length ? <div className="tarjeta lista-notificaciones">
        {datos.notificaciones.data.map((notificacion) => <article className={notificacion.leida_en ? 'leida' : 'sin-leer'} key={notificacion.id}>
          <div><span className="actividad-estado">{notificacion.leida_en ? 'Leída' : 'Sin leer'}</span><h2>{notificacion.titulo}</h2><p>{notificacion.mensaje}</p>
            <small>{fecha(notificacion.created_at)}</small></div>
          {!notificacion.leida_en && <button className="enlace-tabla" disabled={procesando} onClick={() => leer(notificacion.id)}>
            <Check size={15} aria-hidden="true" />Marcar leída</button>}
        </article>)}</div> : <div className="estado-panel"><Bell size={28} aria-hidden="true" /><h2>No tienes notificaciones.</h2><p>Aquí aparecerán las actualizaciones de tus incidencias y avisos del sistema.</p></div>}
      <Paginacion datos={datos?.notificaciones} alCambiar={establecerPagina} />
    </Estado></div>;
}
