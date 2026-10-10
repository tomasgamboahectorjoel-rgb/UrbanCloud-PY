import { Navigate, Route, Routes, useLocation } from 'react-router';
import { Marco } from './componentes/Marco';
import { rutasPorRol, usarSesion } from './contexto/Sesion';
import { PaginaAcceso } from './paginas/Acceso';
import { PanelCiudadano, NuevoReporte, ListaCiudadano, DetalleCiudadano } from './paginas/Ciudadano';
import { PanelOperador, ListaOperador, DetalleOperador } from './paginas/Operador';
import { PanelSupervisor, ListaSupervisor, EquipoSupervisor, DetalleSupervisor } from './paginas/Supervisor';
import { PanelTecnico, DetalleTecnico } from './paginas/Tecnico';
import { PanelAdministrador, UsuariosAdministrador, ConfiguracionAdministrador, AuditoriaAdministrador } from './paginas/Administrador';
import { PaginaNotificaciones } from './paginas/Notificaciones';
import { MiCuenta, OlvideClave, RestablecerClave, VerificarCorreo } from './paginas/Cuenta';

export function RutaProtegida({ roles, children }) {
  const { usuario, cargando } = usarSesion();
  const ubicacion = useLocation();
  if (cargando) return <div className="estado-panel pantalla-carga" role="status">Cargando UrbanCloud AI…</div>;
  if (!usuario) return <Navigate to="/login" replace state={{ desde: ubicacion.pathname }} />;
  if (roles && !roles.includes(usuario.rol)) return <Navigate to={rutasPorRol[usuario.rol]} replace />;
  return children;
}

function Inicio() {
  const { usuario, cargando } = usarSesion();
  if (cargando) return <div className="estado-panel pantalla-carga">Cargando UrbanCloud AI…</div>;
  return <Navigate to={usuario ? rutasPorRol[usuario.rol] : '/login'} replace />;
}

function AccesoPublico({ registro }) {
  const { usuario, cargando } = usarSesion();
  if (cargando) return <div className="estado-panel pantalla-carga">Cargando UrbanCloud AI…</div>;
  if (usuario) return <Navigate to={rutasPorRol[usuario.rol]} replace />;
  return <PaginaAcceso key={registro ? 'registro' : 'login'} registro={registro} />;
}

export function Aplicacion() {
  return <Routes>
    <Route path="/" element={<Inicio />} />
    <Route path="/login" element={<AccesoPublico />} />
    <Route path="/registro" element={<AccesoPublico registro />} />
    <Route path="/olvide-clave" element={<OlvideClave />} />
    <Route path="/restablecer-clave" element={<RestablecerClave />} />
    <Route path="/verificar-correo" element={<VerificarCorreo />} />
    <Route element={<RutaProtegida><Marco /></RutaProtegida>}>
      <Route path="/notificaciones" element={<PaginaNotificaciones />} />
      <Route path="/cuenta" element={<RutaProtegida roles={['Ciudadano', 'Administrador']}><MiCuenta /></RutaProtegida>} />
      <Route path="/ciudadano" element={<RutaProtegida roles={['Ciudadano']}><PanelCiudadano /></RutaProtegida>} />
      <Route path="/ciudadano/nuevo" element={<RutaProtegida roles={['Ciudadano']}><NuevoReporte /></RutaProtegida>} />
      <Route path="/ciudadano/reportes" element={<RutaProtegida roles={['Ciudadano']}><ListaCiudadano /></RutaProtegida>} />
      <Route path="/ciudadano/reportes/:id" element={<RutaProtegida roles={['Ciudadano']}><DetalleCiudadano /></RutaProtegida>} />
      <Route path="/ciudadano/seguidas" element={<RutaProtegida roles={['Ciudadano']}><ListaCiudadano seguidas /></RutaProtegida>} />
      <Route path="/ciudadano/seguidas/:id" element={<RutaProtegida roles={['Ciudadano']}><DetalleCiudadano seguida /></RutaProtegida>} />
      <Route path="/operador" element={<RutaProtegida roles={['Operador']}><PanelOperador /></RutaProtegida>} />
      <Route path="/operador/bandeja" element={<RutaProtegida roles={['Operador']}><ListaOperador /></RutaProtegida>} />
      <Route path="/operador/incidencias" element={<RutaProtegida roles={['Operador']}><ListaOperador tipo="todos" /></RutaProtegida>} />
      <Route path="/operador/alertas" element={<RutaProtegida roles={['Operador']}><ListaOperador tipo="alertas" /></RutaProtegida>} />
      <Route path="/operador/incidencias/:id" element={<RutaProtegida roles={['Operador']}><DetalleOperador /></RutaProtegida>} />
      <Route path="/supervisor" element={<RutaProtegida roles={['Supervisor']}><PanelSupervisor /></RutaProtegida>} />
      <Route path="/supervisor/derivados" element={<RutaProtegida roles={['Supervisor']}><ListaSupervisor /></RutaProtegida>} />
      <Route path="/supervisor/atendidos" element={<RutaProtegida roles={['Supervisor']}><ListaSupervisor tipo="atendidos" /></RutaProtegida>} />
      <Route path="/supervisor/equipo" element={<RutaProtegida roles={['Supervisor']}><EquipoSupervisor /></RutaProtegida>} />
      <Route path="/supervisor/riesgos" element={<RutaProtegida roles={['Supervisor']}><ListaSupervisor tipo="riesgos" /></RutaProtegida>} />
      <Route path="/supervisor/incidencias/:id" element={<RutaProtegida roles={['Supervisor']}><DetalleSupervisor /></RutaProtegida>} />
      <Route path="/tecnico" element={<RutaProtegida roles={['Personal técnico']}><PanelTecnico /></RutaProtegida>} />
      <Route path="/tecnico/tareas/:id" element={<RutaProtegida roles={['Personal técnico']}><DetalleTecnico /></RutaProtegida>} />
      <Route path="/tecnico/historial" element={<RutaProtegida roles={['Personal técnico']}><PanelTecnico historial /></RutaProtegida>} />
      <Route path="/administrador" element={<RutaProtegida roles={['Administrador']}><PanelAdministrador /></RutaProtegida>} />
      <Route path="/administrador/usuarios" element={<RutaProtegida roles={['Administrador']}><UsuariosAdministrador /></RutaProtegida>} />
      <Route path="/administrador/configuracion" element={<RutaProtegida roles={['Administrador']}><ConfiguracionAdministrador /></RutaProtegida>} />
      <Route path="/administrador/auditoria" element={<RutaProtegida roles={['Administrador']}><AuditoriaAdministrador /></RutaProtegida>} />
    </Route>
    <Route path="*" element={<div className="estado-panel pantalla-carga">Página no encontrada. <a href="/">Volver al inicio</a></div>} />
  </Routes>;
}
