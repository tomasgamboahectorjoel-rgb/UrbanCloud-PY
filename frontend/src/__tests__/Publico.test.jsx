import { beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { Aplicacion } from '../Aplicacion';
import { diagnostico } from '../servicios/diagnostico';

const sesion = vi.hoisted(() => ({ usuario: null, cargando: false }));
vi.mock('../contexto/Sesion', () => ({ usarSesion: () => sesion, rutasPorRol: { Ciudadano: '/ciudadano' } }));
vi.mock('../componentes/Mapa', () => ({ Mapa: () => <div>Mapa</div> }));
vi.mock('../componentes/Marco', async () => {
  const { Outlet } = await import('react-router');
  return { Marco: () => <Outlet /> };
});
vi.mock('../paginas/Ciudadano', () => ({
  PanelCiudadano: () => <h1>Panel ciudadano autenticado</h1>,
  NuevoReporte: () => null, ListaCiudadano: () => null, DetalleCiudadano: () => null,
}));
beforeEach(() => { cleanup(); localStorage.clear(); sesion.usuario = null; });
it('presenta la portada pública y accesos de registro sin exigir sesión', () => {
  render(<MemoryRouter><Aplicacion /></MemoryRouter>);
  expect(screen.getByRole('heading', { name: /Una ciudad mejor empieza/ })).toBeTruthy();
  expect(screen.getAllByRole('link', { name: /Reportar una incidencia/ })[0].getAttribute('href')).toBe('/registro');
  expect(screen.getByText('Ejemplo ilustrativo · no es un reporte real')).toBeTruthy();
  expect(screen.getByRole('link', { name: 'Iniciar sesión' }).getAttribute('href')).toBe('/login');
  expect(screen.getByRole('link', { name: 'Crear cuenta' }).getAttribute('href')).toBe('/registro');
});
it('conserva la redirección del ciudadano autenticado desde la portada', () => {
  sesion.usuario = { rol: 'Ciudadano' };
  render(<MemoryRouter><Aplicacion /></MemoryRouter>);
  expect(screen.getByRole('heading', { name: 'Panel ciudadano autenticado' })).toBeTruthy();
  expect(screen.queryByRole('heading', { name: /Una ciudad mejor empieza/ })).toBeNull();
});
it.each(['/privacidad', '/terminos', '/almacenamiento'])('ofrece información pública en %s', (ruta) => {
  render(<MemoryRouter initialEntries={[ruta]}><Aplicacion /></MemoryRouter>);
  expect(screen.getByText(/Contenido provisional/)).toBeTruthy();
  expect(screen.getByRole('link', { name: 'Volver al inicio' })).toBeTruthy();
});
it('recuerda el aviso y permite volver a abrir las preferencias', () => {
  render(<MemoryRouter><Aplicacion /></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: 'Entendido' }));
  expect(localStorage.getItem('urbancloud-aviso-almacenamiento')).toBe('v1');
  expect(screen.queryByRole('region', { name: 'Almacenamiento en tu navegador' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Preferencias de almacenamiento' }));
  expect(screen.getByRole('region', { name: 'Almacenamiento en tu navegador' })).toBeTruthy();
});
it('borra el diagnóstico sin fingir desactivar futuros registros', () => {
  diagnostico.registrar({ tipo: 'red', ruta: '/prueba' });
  render(<MemoryRouter><Aplicacion /></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: 'Borrar diagnóstico local' }));
  expect(diagnostico.listar()).toEqual([]);
  expect(JSON.parse(localStorage.getItem('urbancloud-diagnostico'))).toEqual([]);
  expect(screen.getByRole('status').textContent).toContain('Los nuevos fallos pueden volver a registrarse');
});
it('permite cerrar el aviso cuando el navegador bloquea almacenamiento', () => {
  const guardado = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Bloqueado'); });
  render(<MemoryRouter><Aplicacion /></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: 'Entendido' }));
  expect(screen.queryByRole('region', { name: 'Almacenamiento en tu navegador' })).toBeNull();
  guardado.mockRestore();
});
