import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { servicioHttp } from '../servicios/servicioHttp';

const ContextoSesion = createContext(null);

export const rutasPorRol = {
  Ciudadano: '/ciudadano',
  Operador: '/operador',
  Supervisor: '/supervisor',
  'Personal técnico': '/tecnico',
  Administrador: '/administrador',
};

export function ProveedorSesion({ children }) {
  const [usuario, establecerUsuario] = useState(null);
  const [cargando, establecerCargando] = useState(true);

  const actualizar = useCallback(async () => {
    try {
      const datos = await servicioHttp.obtener('/dashboard');
      establecerUsuario(datos.usuario);
      return datos.usuario;
    } catch (error) {
      if (error.estado === 401 || error.estado === 403) establecerUsuario(null);
      return null;
    } finally {
      establecerCargando(false);
    }
  }, []);

  useEffect(() => { actualizar(); }, [actualizar]);
  useEffect(() => {
    const caducar = () => { establecerUsuario(null); servicioHttp.limpiarCsrf(); };
    window.addEventListener('sesion-caducada', caducar);
    return () => window.removeEventListener('sesion-caducada', caducar);
  }, []);

  const iniciar = async (correo, password) => {
    const datos = await servicioHttp.publicar('/login', { email: correo, password });
    establecerUsuario(datos.usuario);
    servicioHttp.limpiarCsrf();
    return datos.usuario;
  };

  const registrar = async (datosRegistro) => {
    return servicioHttp.publicar('/registro', datosRegistro);
  };

  const salir = async () => {
    try {
      await servicioHttp.publicar('/logout', {});
    } finally {
      establecerUsuario(null);
      servicioHttp.limpiarCsrf();
    }
  };

  const valor = useMemo(() => ({ usuario, cargando, iniciar, registrar, salir, actualizar }),
    [usuario, cargando, actualizar]);

  return <ContextoSesion.Provider value={valor}>{children}</ContextoSesion.Provider>;
}

export function usarSesion() {
  return useContext(ContextoSesion);
}
