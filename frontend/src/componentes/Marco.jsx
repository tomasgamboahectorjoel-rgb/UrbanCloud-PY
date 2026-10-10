import { useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router';
import {
  ArrowRightLeft, Bell, CirclePlus, ClipboardList, FileSearch, History,
  House, LayoutDashboard, List, ListChecks, LogOut, Settings, KeyRound,
  TriangleAlert, Users,
} from 'lucide-react';
import { usarSesion } from '../contexto/Sesion';
import { usarDatos } from '../hooks/usarDatos';
import { servicioDatos } from '../servicios/servicioDatos';
import { IconoMarca, Marca } from './Marca';

const menus = {
  Ciudadano: [
    ['/ciudadano', 'Inicio', House],
    ['/ciudadano/nuevo', 'Nuevo reporte', CirclePlus],
    ['/ciudadano/reportes', 'Mis reportes', List],
    ['/ciudadano/seguidas', 'En seguimiento', ListChecks],
    ['/cuenta', 'Mi cuenta', KeyRound],
    ['/notificaciones', 'Notificaciones', Bell],
  ],
  Operador: [
    ['/operador', 'Resumen', LayoutDashboard],
    ['/operador/bandeja', 'Bandeja de revisión', ClipboardList],
    ['/operador/incidencias', 'Todos los incidentes', ListChecks],
    ['/operador/alertas', 'Alertas', TriangleAlert],
    ['/notificaciones', 'Notificaciones', Bell],
  ],
  Supervisor: [
    ['/supervisor', 'Resumen', LayoutDashboard],
    ['/supervisor/derivados', 'Derivados', ArrowRightLeft],
    ['/supervisor/atendidos', 'Pendientes de cierre', ListChecks],
    ['/supervisor/equipo', 'Carga del equipo', Users],
    ['/supervisor/riesgos', 'Riesgos y SLA', TriangleAlert],
    ['/notificaciones', 'Notificaciones', Bell],
  ],
  'Personal técnico': [
    ['/tecnico', 'Mis tareas', ClipboardList],
    ['/tecnico/historial', 'Historial', History],
    ['/notificaciones', 'Avisos', Bell],
  ],
  Administrador: [
    ['/administrador', 'Administración', LayoutDashboard],
    ['/administrador/usuarios', 'Usuarios y roles', Users],
    ['/administrador/configuracion', 'Configuración', Settings],
    ['/administrador/auditoria', 'Auditoría', FileSearch],
    ['/cuenta', 'Mi cuenta', KeyRound],
    ['/notificaciones', 'Notificaciones', Bell],
  ],
};

export function Marco() {
  const { usuario, salir } = usarSesion();
  const navegar = useNavigate();
  const { datos, recargar } = usarDatos(servicioDatos.notificaciones, [usuario?.id]);
  const contador = datos?.no_leidas || 0;

  useEffect(() => {
    window.addEventListener('notificaciones-actualizadas', recargar);
    return () => window.removeEventListener('notificaciones-actualizadas', recargar);
  }, [recargar]);

  async function cerrarSesion() {
    await salir();
    navegar('/login', { replace: true });
  }

  return <div className="aplicacion">
    <aside className="lateral">
      <NavLink to={menus[usuario.rol][0][0]} className="marca"><Marca /></NavLink>
      <div className="titulo-menu">{usuario.rol === 'Ciudadano' ? 'MI ESPACIO' : 'ESPACIO DE TRABAJO'}</div>
      <nav aria-label="Navegación principal">{menus[usuario.rol].map(([ruta, etiqueta, Icono]) =>
        <NavLink key={ruta} to={ruta} end className={({ isActive }) => `enlace-menu ${isActive ? 'activo' : ''}`}>
          <Icono className="icono-menu" size={18} strokeWidth={2} aria-hidden="true" />
          <span>{etiqueta}</span>{ruta === '/notificaciones' && contador > 0 &&
            <span className="contador">{contador}</span>}
        </NavLink>)}</nav>
      <div className="usuario-lateral"><span className="avatar">{usuario.nombre.slice(0, 2).toUpperCase()}</span>
        <span><strong>{usuario.nombre}</strong><small>{usuario.rol}</small></span></div>
    </aside>
    <div className="principal">
      <header className="barra-superior">
        <div className="membrete"><IconoMarca compacto /><span>UrbanCloud AI</span>
          <span className="membrete-separador">/</span><strong>{usuario.rol}</strong></div>
        <div className="barra-acciones"><NavLink to="/notificaciones" className="boton-icono" aria-label={`Notificaciones: ${contador} sin leer`}>
          <Bell size={19} strokeWidth={2} aria-hidden="true" />{contador > 0 && <i aria-hidden="true" />}</NavLink>
          <button type="button" className="btn btn-salir" onClick={cerrarSesion}>
            <LogOut size={17} aria-hidden="true" />Cerrar sesión</button></div>
      </header>
      <main className="contenido"><Outlet /></main>
    </div>
  </div>;
}
