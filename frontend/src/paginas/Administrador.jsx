import { useState } from 'react';
import { Link } from 'react-router';
import { KeyRound, Plus, SlidersHorizontal, UserCheck, UserX } from 'lucide-react';
import { Aviso, Encabezado, Estado, TarjetasResumen } from '../componentes/Estado';
import { Paginacion } from '../componentes/Paginacion';
import { usarDatos } from '../hooks/usarDatos';
import { servicioDatos } from '../servicios/servicioDatos';
import { fecha } from '../utilidades/formato';

export function PanelAdministrador() {
  const { datos, cargando, error, recargar } = usarDatos(servicioDatos.resumen, []);
  return <><Encabezado seccion="ADMINISTRADOR" titulo="Administración"
    descripcion="Usuarios, configuración y trazabilidad del sistema." />
    <Estado cargando={cargando} error={error} alReintentar={recargar}>
      <TarjetasResumen elementos={[
        ['Perfiles', datos?.perfiles, 'Usuarios registrados'], ['Categorías', datos?.categorias, 'Activas'],
        ['Umbral IA', `${datos?.umbral_ia || 0}%`, 'Configuración actual'], ['Auditoría', datos?.auditorias, 'Acciones registradas'],
      ]} />
      <section className="tarjeta padding categorias-activas"><h2>Categorías activas</h2>
        {datos?.categorias_activas?.length
          ? <ul>{datos.categorias_activas.map((nombre) => <li key={nombre}>{nombre}</li>)}</ul>
          : <p className="vacio-breve">No hay categorías activas.</p>}
      </section>
      <div className="distribucion"><section className="tarjeta padding"><h2>Usuarios y roles</h2>
        <p className="descripcion">Crea perfiles internos y administra el acceso.</p>
        <Link to="/administrador/usuarios" className="btn btn-primary">Administrar usuarios</Link></section>
        <section className="tarjeta padding"><h2>Auditoría</h2><p className="descripcion">Consulta las decisiones y cambios registrados.</p>
          <Link to="/administrador/auditoria" className="btn btn-secondary">Ver auditoría</Link></section></div>
    </Estado></>;
}

function FormularioUsuario({ catalogos, alCompletar }) {
  const [datos, establecerDatos] = useState({ nombre: '', email: '', password: '', password_confirmation: '', rol_id: '', area_id: '' });
  const [error, establecerError] = useState('');
  const [enviando, establecerEnviando] = useState(false);
  const rol = catalogos.roles.find((item) => String(item.id) === datos.rol_id)?.nombre;
  async function enviar(evento) {
    evento.preventDefault(); establecerError(''); establecerEnviando(true);
    try {
      await servicioDatos.crearUsuario({ ...datos, email: datos.email.trim().toLowerCase(),
        rol_id: Number(datos.rol_id),
        area_id: rol === 'Personal técnico' ? Number(datos.area_id) : null });
      establecerDatos({ nombre: '', email: '', password: '', password_confirmation: '', rol_id: '', area_id: '' });
      alCompletar();
    } catch (fallo) { establecerError(fallo.message); }
    finally { establecerEnviando(false); }
  }
  return <section className="tarjeta padding"><h2>Crear usuario interno</h2><Aviso mensaje={error} tipo="error" />
    <form className="formulario" onSubmit={enviar}>
      <label className="campo"><span>Nombre</span><input required type="text" value={datos.nombre}
        onChange={(evento) => establecerDatos({ ...datos, nombre: evento.target.value })} /></label>
      <label className="campo"><span>Correo</span>
        <input required type="email" autoComplete="off" autoCapitalize="none"
          spellCheck="false" placeholder="nombre@ejemplo.com" value={datos.email}
          onChange={(evento) => establecerDatos({ ...datos, email: evento.target.value })} />
      </label>
      {[['password', 'Contraseña'], ['password_confirmation', 'Confirmar contraseña']].map(([clave, etiqueta]) =>
        <label className="campo" key={clave}><span>{etiqueta}</span><input required type="password" value={datos[clave]}
          onChange={(evento) => establecerDatos({ ...datos, [clave]: evento.target.value })} /></label>)}
      <label className="campo"><span>Rol interno</span><select required value={datos.rol_id}
        onChange={(evento) => establecerDatos({ ...datos, rol_id: evento.target.value, area_id: '' })}>
        <option value="">Selecciona</option>{catalogos.roles.filter((item) => item.nombre !== 'Ciudadano')
          .map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}</select></label>
      {rol === 'Personal técnico' && <label className="campo"><span>Área</span><select required value={datos.area_id}
        onChange={(evento) => establecerDatos({ ...datos, area_id: evento.target.value })}>
        <option value="">Selecciona</option>{catalogos.areas.map((area) =>
          <option key={area.id} value={area.id}>{area.nombre}</option>)}</select></label>}
      <button className="btn btn-primary" disabled={enviando}>
        <Plus size={17} aria-hidden="true" />Crear usuario</button>
    </form></section>;
}

export function UsuariosAdministrador() {
  const [filtros, establecerFiltros] = useState({ buscar: '', rol_id: '', activo: '' });
  const [aplicados, establecerAplicados] = useState({});
  const [pagina, establecerPagina] = useState(1);
  const { datos, cargando, error, recargar } = usarDatos(() => servicioDatos.usuarios(aplicados, pagina), [JSON.stringify(aplicados), pagina]);
  const { datos: catalogos } = usarDatos(servicioDatos.catalogos, []);
  const [mensaje, establecerMensaje] = useState('');
  const [trabajadorClave, establecerTrabajadorClave] = useState(null);
  const [claves, establecerClaves] = useState({ password: '', password_confirmation: '' });
  const [errorClave, establecerErrorClave] = useState('');
  async function cambiar(usuario) {
    try { await servicioDatos.cambiarUsuario(usuario.id, !usuario.activo);
      establecerMensaje('Estado actualizado.'); recargar(); }
    catch (fallo) { establecerMensaje(fallo.message); }
  }
  async function restablecerClave(evento) {
    evento.preventDefault();
    if (claves.password !== claves.password_confirmation) {
      establecerErrorClave('Las contraseñas no coinciden.'); return;
    }
    try {
      const respuesta = await servicioDatos.restablecerClaveUsuario(trabajadorClave.id, claves);
      establecerMensaje(respuesta.mensaje);
      establecerTrabajadorClave(null);
      establecerClaves({ password: '', password_confirmation: '' });
      establecerErrorClave('');
    } catch (fallo) { establecerErrorClave(fallo.message); }
  }
  return <><Encabezado seccion="ADMINISTRADOR" titulo="Usuarios y roles" />
    <Aviso mensaje={mensaje} />
    <form className="filtros" onSubmit={(evento) => { evento.preventDefault(); establecerPagina(1); establecerAplicados(Object.fromEntries(
      Object.entries(filtros).filter(([, valor]) => valor !== ''))); }}>
      <label className="campo"><span>Buscar</span><input value={filtros.buscar}
        onChange={(evento) => establecerFiltros({ ...filtros, buscar: evento.target.value })} placeholder="Nombre o correo" /></label>
      <label className="campo"><span>Rol</span><select value={filtros.rol_id}
        onChange={(evento) => establecerFiltros({ ...filtros, rol_id: evento.target.value })}>
        <option value="">Todos</option>{catalogos?.roles?.map((rol) => <option key={rol.id} value={rol.id}>{rol.nombre}</option>)}</select></label>
      <label className="campo"><span>Estado</span><select value={filtros.activo}
        onChange={(evento) => establecerFiltros({ ...filtros, activo: evento.target.value })}>
        <option value="">Todos</option><option value="1">Activo</option><option value="0">Inactivo</option></select></label>
      <button className="btn btn-secondary"><SlidersHorizontal size={16} aria-hidden="true" />Filtrar</button></form>
    <div className="distribucion"><div className="columna-lateral"><Estado cargando={cargando} error={error} alReintentar={recargar}>
      <div className="tarjeta tabla-contenedor"><table><thead><tr><th>Usuario</th><th>Rol</th><th>Área</th><th>Estado</th><th></th></tr></thead>
        <tbody>{datos?.data?.map((usuario) => <tr key={usuario.id}><td><strong>{usuario.nombre}</strong><small>{usuario.correo}</small></td>
          <td>{usuario.rol}</td><td>{usuario.area || '—'}</td><td>{usuario.activo ? 'Activo' : 'Inactivo'}</td>
          <td><button className="enlace-tabla" onClick={() => cambiar(usuario)}>
            {usuario.activo ? <UserX size={15} aria-hidden="true" /> : <UserCheck size={15} aria-hidden="true" />}
            {usuario.activo ? 'Desactivar' : 'Activar'}</button>
            {['Operador', 'Supervisor', 'Personal técnico'].includes(usuario.rol) &&
              <button type="button" className="enlace-tabla" onClick={() => {
                establecerTrabajadorClave(usuario);
                establecerMensaje('');
                establecerErrorClave('');
                establecerClaves({ password: '', password_confirmation: '' });
              }}>
                <KeyRound size={15} aria-hidden="true" /> Restablecer clave</button>}</td></tr>)}</tbody></table></div>
      {trabajadorClave && <div className="modal-fondo" onMouseDown={(evento) => {
        if (evento.target === evento.currentTarget) establecerTrabajadorClave(null);
      }}>
        <section className="tarjeta padding modal-clave" role="dialog" aria-modal="true"
          aria-labelledby="titulo-restablecer-clave" onKeyDown={(evento) => {
            if (evento.key === 'Escape') establecerTrabajadorClave(null);
          }}>
          <h2 id="titulo-restablecer-clave">Contraseña de {trabajadorClave.nombre}</h2>
          <p className="descripcion">El trabajador deberá usar la nueva contraseña en su próximo ingreso. Sus sesiones actuales se cerrarán.</p>
          <Aviso mensaje={errorClave} tipo="error" />
          <form className="formulario" onSubmit={restablecerClave}>
            <label className="campo"><span>Nueva contraseña</span><input type="password" required minLength={8} autoFocus
              value={claves.password} onChange={(evento) => establecerClaves({ ...claves, password: evento.target.value })} /></label>
            <label className="campo"><span>Confirmar contraseña</span><input type="password" required minLength={8}
              value={claves.password_confirmation} onChange={(evento) => establecerClaves({ ...claves, password_confirmation: evento.target.value })} /></label>
            <div className="acciones-encabezado"><button className="btn btn-primary">Guardar contraseña</button>
              <button type="button" className="btn btn-secondary" onClick={() => establecerTrabajadorClave(null)}>Cancelar</button></div>
          </form>
        </section>
      </div>}
      <Paginacion datos={datos} alCambiar={establecerPagina} />
    </Estado></div>{catalogos && <FormularioUsuario catalogos={catalogos} alCompletar={() => { establecerMensaje('Usuario creado.'); recargar(); }} />}</div>
  </>;
}

export function ConfiguracionAdministrador() {
  const { datos, cargando, error, recargar } = usarDatos(servicioDatos.configuracion, []);
  const [valores, establecerValores] = useState(null);
  const [mensaje, establecerMensaje] = useState('');
  const base = valores || {
    umbral_confianza_ia: Number(datos?.find((item) => item.clave === 'UMBRAL_CONFIANZA_IA')?.valor || 70),
    alertas_duplicados_activas: datos?.find((item) => item.clave === 'ALERTAS_DUPLICADOS_ACTIVAS')?.valor === 'true',
  };
  async function guardar(evento) {
    evento.preventDefault();
    try { await servicioDatos.guardarConfiguracion(base); establecerMensaje('Configuración guardada.'); recargar(); }
    catch (fallo) { establecerMensaje(fallo.message); }
  }
  return <><Encabezado seccion="ADMINISTRADOR" titulo="Configuración" />
    <Aviso mensaje={mensaje} /><Estado cargando={cargando} error={error} alReintentar={recargar}>
      <div className="distribucion"><section className="tarjeta padding"><h2>Reglas del sistema</h2>
        <form className="formulario" onSubmit={guardar}><label className="campo"><span>Umbral de confianza IA (%)</span>
          <input type="number" min="0" max="100" value={base.umbral_confianza_ia}
            onChange={(evento) => establecerValores({ ...base, umbral_confianza_ia: Number(evento.target.value) })} /></label>
          <label className="confirmacion"><input type="checkbox" checked={base.alertas_duplicados_activas}
            onChange={(evento) => establecerValores({ ...base, alertas_duplicados_activas: evento.target.checked })} /> Alertas de duplicados activas</label>
          <button className="btn btn-primary">Guardar</button></form></section>
        <section className="tarjeta padding"><h2>Estados públicos</h2>
          {['En revisión', 'Derivado', 'Asignado', 'En atención', 'Atendido', 'Cerrado', 'Revisión solicitada', 'Impedido']
            .map((estado) => <div className="fila-metrica" key={estado}>{estado}</div>)}</section></div>
    </Estado></>;
}

export function AuditoriaAdministrador() {
  const [pagina, establecerPagina] = useState(1);
  const { datos, cargando, error, recargar } = usarDatos(() => servicioDatos.auditoria(pagina), [pagina]);
  return <><Encabezado seccion="ADMINISTRADOR" titulo="Auditoría" />
    <Estado cargando={cargando} error={error} alReintentar={recargar}>
      <div className="tarjeta tabla-contenedor"><table><thead><tr><th>Momento</th><th>Acción</th><th>Responsable</th><th>Incidencia</th><th>Detalle</th></tr></thead>
        <tbody>{datos?.data?.map((item) => <tr key={item.id}><td>{fecha(item.fecha)}</td><td>{item.accion}</td>
          <td>{item.responsable || 'Sistema'}</td><td>{item.incidencia || '—'}</td>
          <td><small>{item.detalle ? JSON.stringify(item.detalle) : '—'}</small></td></tr>)}</tbody></table></div>
      <Paginacion datos={datos} alCambiar={establecerPagina} />
    </Estado></>;
}
