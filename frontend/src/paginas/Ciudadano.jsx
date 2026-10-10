import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { CirclePlus, LocateFixed, Search, Sparkles } from 'lucide-react';
import { usarSesion } from '../contexto/Sesion';
import { Aviso, Encabezado, Estado, Insignia, TarjetasResumen } from '../componentes/Estado';
import { DatosIncidencia, FiltrosIncidencias, HistorialIncidencia, TablaIncidencias } from '../componentes/Incidencias';
import { Evidencias } from '../componentes/Evidencias';
import { Mapa } from '../componentes/Mapa';
import { Paginacion } from '../componentes/Paginacion';
import { usarDatos } from '../hooks/usarDatos';
import { servicioDatos } from '../servicios/servicioDatos';
import { fecha } from '../utilidades/formato';

export function PanelCiudadano() {
  const { usuario } = usarSesion();
  const { datos, cargando, error, recargar } = usarDatos(servicioDatos.resumen, []);
  return <><Encabezado seccion="MI ESPACIO" titulo={`Hola, ${usuario.nombre.split(' ')[0]}`}
    descripcion="Sigue tus reportes y conoce su progreso."
    accion={<Link className="btn btn-primary" to="/ciudadano/nuevo">
      <CirclePlus size={17} aria-hidden="true" />Nuevo reporte</Link>} />
    <Estado cargando={cargando} error={error} alReintentar={recargar}>
      <TarjetasResumen elementos={[
        ['Mis reportes', datos?.total, 'Registrados'], ['En seguimiento', datos?.seguidas, 'Reportes existentes'],
        ['Resueltos', datos?.resueltas, 'Cerrados'], ['Notificaciones', datos?.no_leidas, 'Sin leer'],
      ]} />
      <div className="distribucion"><section className="tarjeta padding"><h2>Reportes recientes</h2>
        {datos?.recientes?.length ? datos.recientes.map((incidencia) =>
          <Link className="fila-reporte" key={incidencia.id} to={`/ciudadano/reportes/${incidencia.id}`}>
            <div><strong>{incidencia.titulo}</strong><small>{incidencia.codigo} · {fecha(incidencia.fecha)}</small></div>
            <Insignia estado={incidencia.estado} /></Link>) : <p className="vacio-breve">Aún no tienes reportes. Crea el primero.</p>}
      </section><section className="tarjeta hero"><span className="eyebrow">REPORTAR ES CUIDAR</span>
        <h2>Ayúdanos a mejorar tu ciudad</h2><p>Reporta un problema urbano con una fotografía y su ubicación.</p>
        <Link className="btn btn-blanco" to="/ciudadano/nuevo">Crear reporte</Link></section></div>
    </Estado></>;
}

const emergencias = [
  ['Serenazgo Chimbote', '914 782 543 · 914 782 677'],
  ['Serenazgo Nuevo Chimbote', '935 912 001 · 927 420 002 · 916 140 004 · 927 640 006'],
  ['Nacionales', 'Policía 105 · Bomberos 116 · SAMU 106'],
];

export function NuevoReporte() {
  const navegar = useNavigate();
  const { datos: catalogos, cargando, error } = usarDatos(servicioDatos.catalogos, []);
  const [formulario, establecerFormulario] = useState({ titulo: '', descripcion: '', direccion: '', distrito_id: '' });
  const [ubicacion, establecerUbicacion] = useState(null);
  const [ubicacionSolicitada, establecerUbicacionSolicitada] = useState(null);
  const [buscandoUbicacion, establecerBuscandoUbicacion] = useState(false);
  const [errorUbicacion, establecerErrorUbicacion] = useState('');
  const [avisoUbicacion, establecerAvisoUbicacion] = useState(null);
  const [fotografia, establecerFotografia] = useState(null);
  const [similares, establecerSimilares] = useState([]);
  const [buscando, establecerBuscando] = useState(false);
  const [omitir, establecerOmitir] = useState(false);
  const [fase, establecerFase] = useState('');
  const [mensaje, establecerMensaje] = useState('');

  function usarMiUbicacion() {
    if (!navigator.geolocation) {
      establecerErrorUbicacion('Tu navegador no permite obtener la ubicación. Puedes colocar el pin directamente en el mapa.');
      return;
    }
    establecerErrorUbicacion('');
    establecerAvisoUbicacion(null);
    establecerBuscandoUbicacion(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const posicion = [coords.latitude, coords.longitude];
        establecerUbicacion(posicion);
        establecerUbicacionSolicitada(posicion);
        establecerAvisoUbicacion(Number.isFinite(coords.accuracy)
          ? coords.accuracy <= 100
            ? { tipo: 'info', mensaje: 'Ubicación detectada. Verifica que el pin marque el lugar del incidente.' }
            : { tipo: 'advertencia', mensaje: 'Tu ubicación podría no ser precisa. Mueve el pin hasta el lugar del incidente antes de enviar.' }
          : { tipo: 'advertencia', mensaje: 'No pudimos comprobar la precisión de tu ubicación. Verifica y ajusta el pin antes de enviar.' });
        establecerSimilares([]);
        establecerBuscandoUbicacion(false);
      },
      (error) => {
        const mensajes = {
          1: 'No se concedió permiso para acceder a tu ubicación. Puedes colocar el pin directamente en el mapa.',
          2: 'No pudimos determinar tu ubicación. Puedes colocar el pin directamente en el mapa.',
          3: 'La búsqueda de tu ubicación tardó demasiado. Intenta de nuevo o coloca el pin en el mapa.',
        };
        establecerErrorUbicacion(mensajes[error.code] || 'No pudimos obtener tu ubicación. Coloca el pin en el mapa.');
        establecerBuscandoUbicacion(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  }

  async function buscarSimilares() {
    if (!formulario.distrito_id || !ubicacion || formulario.titulo.trim().length < 4) return;
    establecerBuscando(true);
    try {
      const respuesta = await servicioDatos.similares({ titulo: formulario.titulo,
        distrito_id: formulario.distrito_id, latitud: ubicacion[0], longitud: ubicacion[1] });
      establecerSimilares(respuesta.datos || []);
      establecerOmitir(false);
    } catch (fallo) { establecerMensaje(fallo.message); }
    finally { establecerBuscando(false); }
  }

  async function seguir(incidencia) {
    try {
      await servicioDatos.seguir(incidencia.id);
      navegar('/ciudadano/seguidas');
    } catch (fallo) { establecerMensaje(fallo.message); }
  }

  async function enviar(evento) {
    evento.preventDefault();
    establecerMensaje('');
    establecerFase('Analizando…');
    const datos = new FormData();
    Object.entries(formulario).forEach(([clave, valor]) => datos.append(clave, valor));
    if (ubicacion) { datos.append('latitud', ubicacion[0]); datos.append('longitud', ubicacion[1]); }
    datos.append('fotografia', fotografia);
    try {
      const resultado = await servicioDatos.crearReporte(datos);
      navegar(`/ciudadano/reportes/${resultado.id}?creado=${encodeURIComponent(resultado.codigo)}`);
    } catch (fallo) {
      establecerMensaje(fallo.message);
      establecerFase('');
    }
  }

  return <><Encabezado seccion="CIUDADANO" titulo="Nuevo reporte" descripcion="Cuéntanos qué sucede y dónde podemos encontrarlo." />
    <Estado cargando={cargando} error={error}>
      <div className="distribucion"><section className="tarjeta padding"><h2>Datos de la incidencia</h2>
        <Aviso mensaje={mensaje} tipo="error" />
        <form className="formulario" onSubmit={enviar}>
          <label className="campo"><span>¿Qué ocurrió? *</span><input required maxLength={90} value={formulario.titulo}
            onChange={(evento) => establecerFormulario({ ...formulario, titulo: evento.target.value })} placeholder="Ej. Poste de luz apagado" /></label>
          <label className="campo"><span>Describe el problema *</span><textarea required minLength={15} maxLength={800}
            value={formulario.descripcion} onChange={(evento) => establecerFormulario({ ...formulario, descripcion: evento.target.value })}
            placeholder="¿Qué observaste?" /></label>
          <div className="formulario-dos"><label className="campo"><span>Distrito *</span><select required value={formulario.distrito_id}
            onChange={(evento) => establecerFormulario({ ...formulario, distrito_id: evento.target.value })}>
            <option value="">Selecciona un distrito</option>{catalogos?.distritos?.map((distrito) =>
              <option key={distrito.id} value={distrito.id}>{distrito.nombre}</option>)}</select></label>
            <label className="campo"><span>Dirección o referencia *</span><input required maxLength={255} value={formulario.direccion}
              onChange={(evento) => establecerFormulario({ ...formulario, direccion: evento.target.value })} placeholder="Av. Pacífico, frente al parque" /></label></div>
          <label className="campo"><span>Fotografía *</span><input type="file" required accept="image/jpeg,image/png"
            onChange={(evento) => establecerFotografia(evento.target.files?.[0] || null)} /><small>JPG o PNG · máximo 3 MiB</small></label>
          <div className="campo"><span>Ubicación del incidente en el mapa</span>
            <small>Pulsa el mapa para colocar o mover el pin. Si estás cerca del incidente, puedes usar tu ubicación actual.</small>
            <button type="button" className="btn btn-secondary boton-ubicacion" onClick={usarMiUbicacion} disabled={buscandoUbicacion}>
              <LocateFixed size={17} aria-hidden="true" />{buscandoUbicacion ? 'Buscando ubicación…' : 'Usar mi ubicación'}
            </button></div>
          {errorUbicacion && <div className="aviso aviso-error" role="alert">{errorUbicacion}</div>}
          <Mapa latitud={null} longitud={null} posicionSolicitada={ubicacionSolicitada}
            alCambiar={(latitud, longitud) => {
              establecerUbicacion([latitud, longitud]);
              establecerSimilares([]);
              establecerErrorUbicacion('');
              establecerAvisoUbicacion(null);
            }} />
          {avisoUbicacion && <Aviso mensaje={avisoUbicacion.mensaje} tipo={avisoUbicacion.tipo} />}
          {ubicacion && <small className="muted">Coordenadas: {ubicacion.map((valor) => valor.toFixed(5)).join(', ')}</small>}
          <button type="button" className="btn btn-secondary" onClick={buscarSimilares} disabled={buscando || !ubicacion}>
            <Search size={17} aria-hidden="true" />{buscando ? 'Buscando…' : 'Buscar reportes cercanos'}</button>
          {similares.length > 0 && !omitir && <div className="aviso aviso-advertencia"><strong>Posibles reportes cercanos</strong>
            {similares.map((incidencia) => <div className="coincidencia" key={incidencia.id}>
              <span>{incidencia.codigo} · {incidencia.titulo} · {incidencia.distancia_metros} m</span>
              <button type="button" className="btn btn-secondary" onClick={() => seguir(incidencia)}>Seguir</button></div>)}
            <button type="button" className="enlace-tabla" onClick={() => establecerOmitir(true)}>Es otro problema</button></div>}
          <label className="confirmacion"><input type="checkbox" required /> Confirmo que la información proporcionada es correcta.</label>
          <button className="btn btn-primary" type="submit" disabled={Boolean(fase) || !fotografia}>
            <Sparkles size={17} aria-hidden="true" />{fase || 'Analizar y enviar'}</button>
        </form>
      </section><aside className="columna-lateral"><section className="tarjeta padding emergencias"><h2>Números de emergencia</h2>
        {emergencias.map(([nombre, numeros]) => <p key={nombre}><strong>{nombre}</strong><br />{numeros}</p>)}
        <small>Para emergencias, llama directamente a estos servicios.</small></section>
        <section className="tarjeta padding"><h2>¿Qué ocurre después?</h2><ol className="pasos">
          <li>Validamos la evidencia</li><li>Registramos el reporte válido</li><li>Un operador revisa la clasificación</li></ol></section></aside></div>
    </Estado></>;
}

export function ListaCiudadano({ seguidas = false }) {
  const [pagina, establecerPagina] = useState(1);
  const [buscar, establecerBuscar] = useState('');
  const [estado, establecerEstado] = useState('Todos');
  const [aplicados, establecerAplicados] = useState({});
  const { datos, cargando, error, recargar } = usarDatos(() => seguidas
    ? servicioDatos.seguidas(aplicados, pagina) : servicioDatos.misReportes(aplicados, pagina),
  [seguidas, pagina, JSON.stringify(aplicados)]);
  const { datos: catalogos } = usarDatos(servicioDatos.catalogos, []);
  return <><Encabezado seccion="CIUDADANO" titulo={seguidas ? 'En seguimiento' : 'Mis reportes'}
    accion={!seguidas && <Link className="btn btn-primary" to="/ciudadano/nuevo">
      <CirclePlus size={17} aria-hidden="true" />Nuevo reporte</Link>} />
    <FiltrosIncidencias buscar={buscar} alBuscar={establecerBuscar} estado={estado} alEstado={establecerEstado}
      estados={catalogos?.estados?.map((item) => item.nombre) || []}
      alFiltrar={() => { establecerPagina(1); establecerAplicados({ ...(buscar.trim() && { buscar: buscar.trim() }),
        ...(estado !== 'Todos' && { estado }) }); }} />
    <Estado cargando={cargando} error={error} alReintentar={recargar}>
      <TablaIncidencias incidencias={datos?.data || []}
        prefijo={seguidas ? '/ciudadano/seguidas' : '/ciudadano/reportes'} />
      <Paginacion datos={datos} alCambiar={establecerPagina} />
    </Estado></>;
}

export function DetalleCiudadano({ seguida = false }) {
  const { id } = useParams();
  const { datos, cargando, error, recargar } = usarDatos(() => seguida
    ? servicioDatos.detalleSeguida(id) : servicioDatos.detalleCiudadano(id), [id, seguida]);
  const [motivo, establecerMotivo] = useState('');
  const [mensaje, establecerMensaje] = useState('');
  const [enviando, establecerEnviando] = useState(false);
  async function pedirRevision(evento) {
    evento.preventDefault(); establecerEnviando(true); establecerMensaje('');
    try { await servicioDatos.solicitarRevision(id, motivo); establecerMotivo(''); establecerMensaje('Solicitud registrada.'); recargar(); }
    catch (fallo) { establecerMensaje(fallo.message); }
    finally { establecerEnviando(false); }
  }
  return <><Encabezado seccion="CIUDADANO" titulo="Seguimiento del reporte" />
    {new URLSearchParams(location.search).get('creado') && <Aviso tipo="exito" mensaje={`Reporte registrado: ${new URLSearchParams(location.search).get('creado')}. Estado: En revisión.`} />}
    <Estado cargando={cargando} error={error} alReintentar={recargar}>
      <div className="distribucion"><div className="columna-lateral"><DatosIncidencia incidencia={datos} />
        {datos?.latitud && datos?.longitud && <section className="tarjeta padding"><h2>Ubicación</h2><Mapa latitud={datos.latitud} longitud={datos.longitud} /></section>}
        <Evidencias evidencias={datos?.evidencias} /></div>
        <div className="columna-lateral"><HistorialIncidencia historial={datos?.historial} />
          <section className="tarjeta padding"><h2>Último avance</h2><p>{datos?.ultimo_avance || 'Aún no hay avances técnicos.'}</p></section>
          {!seguida && datos?.estado === 'Cerrado' && <section className="tarjeta padding"><h2>Solicitar revisión</h2>
            <form onSubmit={pedirRevision} className="formulario"><label className="campo"><span>Motivo</span>
              <textarea required minLength={10} value={motivo} onChange={(evento) => establecerMotivo(evento.target.value)} /></label>
              <button className="btn btn-primary" disabled={enviando}>Enviar solicitud</button></form></section>}
          <Aviso mensaje={mensaje} tipo="info" /></div></div>
    </Estado></>;
}
