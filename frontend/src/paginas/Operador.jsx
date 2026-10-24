import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { Aviso, Encabezado, Estado, TarjetasResumen } from '../componentes/Estado';
import { DatosIncidencia, FiltrosIncidencias, HistorialIncidencia, TablaIncidencias } from '../componentes/Incidencias';
import { Evidencias } from '../componentes/Evidencias';
import { Mapa } from '../componentes/Mapa';
import { Paginacion } from '../componentes/Paginacion';
import { usarDatos } from '../hooks/usarDatos';
import { servicioDatos } from '../servicios/servicioDatos';
import { fecha } from '../utilidades/formato';
import './operaciones.css';

export function PanelOperador() {
  const { datos, cargando, error, recargar } = usarDatos(servicioDatos.resumen, []);
  return <div className="operacion-editorial operacion-panel"><Encabezado seccion="OPERADOR" titulo="Resumen de incidencias"
    descripcion="Prioriza la revisión y confirma las sugerencias del análisis inicial."
    accion={<Link to="/operador/bandeja" className="btn btn-primary">Ir a la bandeja</Link>} />
    <Estado cargando={cargando} error={error} alReintentar={recargar}>
      <TarjetasResumen elementos={[
        ['Abiertas', datos?.abiertas, 'En curso'], ['Por revisar', datos?.pendientes, 'Incluye solicitudes de revisión'],
        ['Prioridad alta', datos?.prioridad_alta, 'Requieren atención'], ['Cerradas', datos?.cerradas, 'Finalizadas'],
      ]} />
      <div className="distribucion"><section className="tarjeta padding operacion-guia"><span className="eyebrow">CRITERIO DEL OPERADOR</span><h2>Qué revisar primero</h2>
        <p className="descripcion">{datos?.pendientes === 0 ? 'La bandeja no tiene incidencias pendientes de revisión.' : 'Revisa el contexto de cada reporte antes de confirmar su derivación.'}</p>
        <ol><li>Contrasta la descripción con las evidencias.</li><li>Revisa categoría, prioridad y área responsable.</li><li>Registra la decisión y explica las correcciones.</li></ol></section>
        <section className="tarjeta padding"><h2>Por categoría</h2>
          {datos?.por_categoria?.length ? datos.por_categoria.map((categoria) => <div className="fila-metrica" key={categoria.nombre}>
            <span>{categoria.nombre}</span><strong>{categoria.total}</strong></div>) : <p className="vacio-breve">No hay incidencias clasificadas por categoría.</p>}</section></div>
    </Estado></div>;
}

export function ListaOperador({ tipo = 'bandeja' }) {
  const [pagina, establecerPagina] = useState(1);
  const [buscar, establecerBuscar] = useState('');
  const [estado, establecerEstado] = useState('Todos');
  const [area, establecerArea] = useState('');
  const [prioridad, establecerPrioridad] = useState('');
  const [aplicados, establecerAplicados] = useState({});
  const { datos, cargando, error, recargar } = usarDatos(() => tipo === 'todos'
    ? servicioDatos.todasOperador(aplicados, pagina) : servicioDatos.bandejaOperador(pagina),
  [tipo, pagina, JSON.stringify(aplicados)]);
  const { datos: catalogos } = usarDatos(servicioDatos.catalogos, []);
  const titulos = { bandeja: 'Bandeja de revisión', todos: 'Todas las incidencias', alertas: 'Alertas' };
  function limpiar() { establecerBuscar(''); establecerEstado('Todos'); establecerArea(''); establecerPrioridad(''); establecerAplicados({}); establecerPagina(1); }
  const vacios = { todos: ['Sin incidencias registradas', 'Las incidencias registradas aparecerán en este listado.'], bandeja: ['Sin incidencias pendientes en la bandeja', 'Cuando haya reportes por revisar, podrás consultarlos aquí.'], alertas: ['Sin incidencias en esta consulta de alertas', 'Este listado utiliza la bandeja de revisión disponible.'] };
  return <div className="operacion-editorial operacion-lista"><Encabezado seccion="OPERADOR" titulo={titulos[tipo]} descripcion="Consulta los registros y abre el detalle para revisar su contexto." />
    {tipo === 'todos' && <FiltrosIncidencias buscar={buscar} alBuscar={establecerBuscar} estado={estado} alEstado={establecerEstado}
      estados={catalogos?.estados?.map((item) => item.nombre) || []}
      extras={<><label className="campo"><span>Área</span><select value={area} onChange={(evento) => establecerArea(evento.target.value)}>
        <option value="">Todas</option>{catalogos?.areas?.map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}</select></label>
        <label className="campo"><span>Prioridad</span><select value={prioridad} onChange={(evento) => establecerPrioridad(evento.target.value)}>
          <option value="">Todas</option>{catalogos?.prioridades?.map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}</select></label>{(area || prioridad) && !buscar && estado === 'Todos' && <button className="btn btn-secondary" type="button" onClick={limpiar}>Restablecer</button>}</>}
      alLimpiar={limpiar}
      alFiltrar={() => { establecerPagina(1); establecerAplicados({ ...(buscar.trim() && { buscar: buscar.trim() }),
        ...(estado !== 'Todos' && { estado }), ...(area && { area_id: area }), ...(prioridad && { prioridad_id: prioridad }) }); }} />}
    <Estado cargando={cargando} error={error} alReintentar={recargar}>
      <TablaIncidencias incidencias={datos?.data || []} prefijo="/operador/incidencias" filtrosActivos={tipo === 'todos' && Object.keys(aplicados).length > 0} alLimpiar={limpiar}
        vacio={<section className="incidencias-vacio"><h2>{vacios[tipo][0]}</h2><p>{vacios[tipo][1]}</p></section>} />
      <Paginacion datos={datos} alCambiar={establecerPagina} />
    </Estado></div>;
}

function FormularioRevision({ incidencia, catalogos, alCompletar }) {
  const iniciales = { categoria_id: String(catalogos.categorias?.find(item => item.nombre === incidencia.categoria)?.id ?? ''), prioridad_id: String(catalogos.prioridades?.find(item => item.nombre === incidencia.prioridad)?.id ?? ''), area_id: String(catalogos.areas?.find(item => item.nombre === incidencia.area)?.id ?? '') };
  const [valores, establecerValores] = useState({ ...iniciales, motivo: '' });
  const corregida = Object.keys(iniciales).some(clave => valores[clave] !== iniciales[clave]);
  const [error, establecerError] = useState('');
  const [enviando, establecerEnviando] = useState(false);

  async function enviar(evento) {
    evento.preventDefault(); establecerError('');
    if (!valores.categoria_id || !valores.prioridad_id || !valores.area_id) { establecerError('Selecciona categoría, prioridad y área responsable.'); return; }
    if (corregida && valores.motivo.trim().length < 10) { establecerError('Explica la corrección con al menos 10 caracteres.'); return; }
    establecerEnviando(true);
    try { await servicioDatos.revisar(incidencia.id, valores); alCompletar(); }
    catch (fallo) { establecerError(fallo.message); }
    finally { establecerEnviando(false); }
  }

  return <section className="tarjeta padding operacion-decision"><span className="eyebrow">DECISIÓN HUMANA</span><h2>Confirmar o corregir clasificación</h2>
    <p className="descripcion">La selección que confirmes se registrará y derivará al área responsable.</p>
    <Aviso mensaje={error} tipo="error" /><form className="formulario" onSubmit={enviar}>
      {[['categoria_id', 'Categoría', catalogos.categorias], ['prioridad_id', 'Prioridad', catalogos.prioridades],
        ['area_id', 'Área responsable', catalogos.areas]].map(([clave, titulo, opciones]) =>
        <label className="campo" key={clave}><span>{titulo}</span><select required value={valores[clave]}
          onChange={(evento) => establecerValores({ ...valores, [clave]: evento.target.value })}>
          <option value="">Selecciona</option>{opciones?.map((opcion) =>
            <option value={opcion.id} key={opcion.id}>{opcion.nombre}</option>)}</select></label>)}
      <label className="campo"><span>Motivo de corrección</span><textarea aria-describedby="revision-motivo-ayuda" required={corregida} minLength={corregida ? 10 : undefined} value={valores.motivo}
        onChange={(evento) => establecerValores({ ...valores, motivo: evento.target.value })}
        placeholder="Explica qué cambiaste y por qué" /></label><small className="operacion-ayuda-campo" id="revision-motivo-ayuda">{corregida ? 'Obligatorio: al menos 10 caracteres para explicar el cambio.' : 'Opcional si mantienes la clasificación registrada.'}</small>
      <button className="btn btn-primary" disabled={enviando}>Confirmar y derivar</button>
    </form></section>;
}

function ResolverRevision({ incidencia, alCompletar }) {
  const [decision, establecerDecision] = useState('reabrir');
  const [motivo, establecerMotivo] = useState('');
  const [error, establecerError] = useState('');
  const [enviando, establecerEnviando] = useState(false);
  async function enviar(evento) {
    evento.preventDefault(); establecerError(''); establecerEnviando(true);
    try { await servicioDatos.resolverRevision(incidencia.id, { decision, motivo }); alCompletar(); }
    catch (fallo) { establecerError(fallo.message); }
    finally { establecerEnviando(false); }
  }
  return <section className="tarjeta padding"><h2>Resolver solicitud de revisión</h2>
    <Aviso mensaje={error} tipo="error" /><form className="formulario" onSubmit={enviar}>
      <label className="campo"><span>Decisión</span><select value={decision} onChange={(evento) => establecerDecision(evento.target.value)}>
        <option value="reabrir">Reabrir caso</option><option value="mantener_cierre">Mantener cierre</option></select></label>
      <label className="campo"><span>Respuesta y motivo</span><textarea required minLength={10} value={motivo}
        onChange={(evento) => establecerMotivo(evento.target.value)} /></label>
      <button className="btn btn-primary" disabled={enviando}>Registrar decisión</button></form></section>;
}

export function DetalleOperador() {
  const { id } = useParams();
  const navegar = useNavigate();
  const { datos, cargando, error, recargar } = usarDatos(() => servicioDatos.detalleOperador(id), [id]);
  const { datos: catalogos, cargando: cargandoCatalogos, error: errorCatalogos, recargar: recargarCatalogos } = usarDatos(servicioDatos.catalogos, []);
  const [mensaje, establecerMensaje] = useState('');
  useEffect(() => { establecerMensaje(''); }, [id]);
  function completar() { establecerMensaje('Decisión registrada.'); recargar(); }
  return <div className="operacion-editorial operacion-detalle"><Encabezado seccion="OPERADOR" titulo="Detalle de incidencia"
    accion={<button className="btn btn-secondary" onClick={() => navegar(-1)}>Volver</button>} />
    <Aviso mensaje={mensaje} tipo="exito" />
    <Estado cargando={cargando} error={error} alReintentar={recargar}>
      <div className="distribucion"><div className="columna-lateral"><p className="operacion-contexto">Datos registrados en la incidencia</p><DatosIncidencia incidencia={datos} />
        {datos?.latitud != null && datos?.longitud != null && Number.isFinite(Number(datos.latitud)) && Number.isFinite(Number(datos.longitud)) && <section className="tarjeta padding"><h2>Ubicación</h2><Mapa latitud={datos.latitud} longitud={datos.longitud} /></section>}
        <Evidencias evidencias={datos?.evidencias} /><HistorialIncidencia historial={datos?.historial} actualizaciones={datos?.actualizaciones} /></div>
        <div className="columna-lateral"><section className="tarjeta padding operacion-ia"><span className="eyebrow">ANÁLISIS AUTOMÁTICO</span><h2>Sugerencia de IA</h2><p className="descripcion">Es una orientación para tu revisión, no una decisión confirmada.</p>
          {datos?.analisis_ia?.length ? datos.analisis_ia.map((analisis, indice) => <article key={indice} className="operacion-analisis">{analisis.fecha && <time dateTime={analisis.fecha}>{fecha(analisis.fecha)}</time>}<div className="datos-grid">
            {[['Categoría', analisis.categoria_sugerida], ['Prioridad', analisis.prioridad_sugerida],
              ['Área', analisis.area_sugerida], ['Confianza', analisis.confianza != null && analisis.confianza !== '' && Number.isFinite(Number(analisis.confianza)) && Number(analisis.confianza) >= 0 && Number(analisis.confianza) <= 1 ? `${Math.round(Number(analisis.confianza) * 100)}%` : 'No disponible']]
              .map(([titulo, valor]) => <div className="dato" key={titulo}><small>{titulo}</small><strong>{valor || 'No disponible'}</strong></div>)}
          </div></article>) : <p className="vacio-breve">No hay un análisis de IA disponible para esta incidencia.</p>}</section>
          {datos?.estado === 'En revisión' && cargandoCatalogos && <p role="status">Cargando catálogos de clasificación…</p>}
          {datos?.estado === 'En revisión' && errorCatalogos && <section className="tarjeta padding"><h2>Catálogos de clasificación</h2><Aviso mensaje={errorCatalogos} tipo="error" /><button className="btn btn-secondary" onClick={recargarCatalogos}>Reintentar catálogos</button></section>}
          {datos?.estado === 'En revisión' && catalogos && !errorCatalogos && <FormularioRevision key={datos.id} incidencia={datos} catalogos={catalogos} alCompletar={completar} />}
          {datos?.estado === 'Revisión solicitada' && <ResolverRevision incidencia={datos} alCompletar={completar} />}
        </div></div>
    </Estado></div>;
}
