import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { DetalleCiudadano, ListaCiudadano, PanelCiudadano } from '../paginas/Ciudadano';
import { TablaIncidencias } from '../componentes/Incidencias';

const servicios = vi.hoisted(() => ({ resumen: vi.fn(), misReportes: vi.fn(), seguidas: vi.fn(), catalogos: vi.fn(), detalleCiudadano: vi.fn(), detalleSeguida: vi.fn(), solicitarRevision: vi.fn() }));
vi.mock('../servicios/servicioDatos', () => ({ servicioDatos: servicios }));
vi.mock('../contexto/Sesion', () => ({ usarSesion: () => ({ usuario: { nombre: 'Ana Pérez', rol: 'Ciudadano' } }) }));
vi.mock('../componentes/Mapa', () => ({ Mapa: () => <div>Mapa del reporte</div> }));
const reporte = { id: 'r1', codigo: 'URB-2026-0001', titulo: 'Poste sin iluminación', estado: 'En revisión', distrito: 'Chimbote', direccion: 'Frente al parque', fecha: '2026-10-24T12:00:00Z', prioridad: 'Alta', descripcion: 'Luminaria dañada en una esquina.', historial: [], evidencias: [] };
beforeEach(() => {
  Object.values(servicios).forEach(fn => fn.mockReset());
  servicios.resumen.mockResolvedValue({ total: 0, seguidas: 0, resueltas: 0, no_leidas: 0, recientes: [] });
  servicios.catalogos.mockResolvedValue({ estados: [{ nombre: 'Cerrado' }] });
  servicios.misReportes.mockResolvedValue({ data: [], last_page: 1 });
  servicios.seguidas.mockResolvedValue({ data: [], last_page: 1 });
  servicios.detalleCiudadano.mockResolvedValue(reporte);
  servicios.detalleSeguida.mockResolvedValue(reporte);
});
afterEach(cleanup);
function montar(ui, ruta = '/') { return render(<MemoryRouter initialEntries={[ruta]}>{ui}</MemoryRouter>); }

it('muestra resumen real con ceros, acceso a todos y vacío accionable sin hero promocional', async () => {
  montar(<PanelCiudadano />);
  expect(await screen.findByRole('heading', { name: 'Todavía no has creado reportes' })).toBeTruthy();
  expect(screen.getAllByText('0')).toHaveLength(4);
  expect(screen.getByRole('link', { name: 'Ver todos mis reportes' }).getAttribute('href')).toBe('/ciudadano/reportes');
  expect(screen.getByRole('link', { name: 'Crear mi primer reporte' }).getAttribute('href')).toBe('/ciudadano/nuevo');
  expect(screen.queryByText('REPORTAR ES CUIDAR')).toBeNull();
});
it('jerarquiza recientes y conserva su ruta existente', async () => {
  servicios.resumen.mockResolvedValue({ total: 1, recientes: [reporte] });
  montar(<PanelCiudadano />);
  const enlace = await screen.findByRole('link', { name: /URB-2026-0001.*Poste sin iluminación/ });
  expect(enlace.getAttribute('href')).toBe('/ciudadano/reportes/r1');
  expect(screen.queryByRole('link', { name: 'Crear reporte' })).toBeNull();
});
it('distingue vacío real y filtros sin coincidencias, permite restablecerlos', () => {
  const limpiar = vi.fn();
  const { rerender } = montar(<TablaIncidencias />);
  expect(screen.getByText('Todavía no hay incidencias.')).toBeTruthy();
  rerender(<MemoryRouter><TablaIncidencias buscar="poste" alLimpiar={limpiar} /></MemoryRouter>);
  expect(screen.getByText('No encontramos coincidencias.')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Limpiar filtros' }));
  expect(limpiar).toHaveBeenCalledTimes(1);
});
it('conserva una sola estructura enlazada, texto prioridad y fallback desconocido', () => {
  montar(<TablaIncidencias incidencias={[{ ...reporte, prioridad: null }, { ...reporte, id: 'r2', prioridad: 'Especial' }]} prefijo="/operador/incidencias" />);
  expect(screen.getByText('Sin prioridad asignada')).toBeTruthy();
  expect(screen.getByText('Especial')).toBeTruthy();
  expect(screen.getAllByRole('table')).toHaveLength(1);
  expect(screen.getAllByRole('link', { name: /Ver detalle/ })).toHaveLength(2);
});
it('no añade enlaces de detalle cuando sinEnlace está activo', () => {
  montar(<TablaIncidencias incidencias={[reporte]} sinEnlace />);
  expect(screen.queryByRole('link')).toBeNull();
});
it('abre el detalle por la ruta compartida existente al pulsar el enlace', () => {
  montar(<Routes><Route path="/" element={<TablaIncidencias incidencias={[reporte]} prefijo="/operador/incidencias" />} /><Route path="/operador/incidencias/:id" element={<h1>Detalle operativo</h1>} /></Routes>);
  fireEvent.click(screen.getByRole('link', { name: 'Ver detalle' }));
  expect(screen.getByRole('heading', { name: 'Detalle operativo' })).toBeTruthy();
});
it('limpia filtros aplicados en el padre y vuelve a página uno con petición vigente', async () => {
  servicios.misReportes.mockImplementation((filtros, pagina) => Promise.resolve({ data: filtros.buscar && pagina === 2 ? [] : [reporte], last_page: 2, current_page: pagina }));
  montar(<ListaCiudadano />);
  await screen.findByText(reporte.titulo);
  fireEvent.change(screen.getByLabelText('Buscar'), { target: { value: 'poste' } });
  fireEvent.click(screen.getByRole('button', { name: 'Filtrar' }));
  await waitFor(() => expect(servicios.misReportes).toHaveBeenLastCalledWith({ buscar: 'poste' }, 1));
  fireEvent.click(await screen.findByRole('button', { name: 'Siguiente' }));
  await screen.findByText('No encontramos coincidencias.');
  fireEvent.click(screen.getByRole('button', { name: 'Limpiar filtros' }));
  await waitFor(() => expect(servicios.misReportes).toHaveBeenLastCalledWith({}, 1));
  expect(screen.getByLabelText('Buscar').value).toBe('');
  expect(screen.getByLabelText('Estado').value).toBe('Todos');
});
it('ofrece vacío ciudadano propio sin confundirlo con búsqueda fallida', async () => {
  montar(<ListaCiudadano />);
  expect(await screen.findByRole('heading', { name: 'Todavía no has creado reportes' })).toBeTruthy();
  expect(screen.queryByText('No encontramos coincidencias.')).toBeNull();
});
it('distingue el vacío de reportes seguidos', async () => {
  montar(<ListaCiudadano seguidas />);
  expect(await screen.findByRole('heading', { name: 'Aún no sigues reportes' })).toBeTruthy();
  expect(servicios.misReportes).not.toHaveBeenCalled();
});
it.each([[false, 'Cerrado', true], [false, 'En revisión', false], [true, 'Cerrado', false]])('respeta revisión: seguida=%s estado=%s', async (seguida, estado, permitida) => {
  servicios.detalleCiudadano.mockResolvedValue({ ...reporte, estado, latitud: 0, longitud: 0, analisis_ia: [{ confianza: .99 }] });
  servicios.detalleSeguida.mockResolvedValue({ ...reporte, estado, latitud: 0, longitud: 0 });
  montar(<Routes><Route path="/detalle/:id" element={<DetalleCiudadano seguida={seguida} />} /></Routes>, '/detalle/r1');
  expect(await screen.findByText('Mapa del reporte')).toBeTruthy();
  expect(Boolean(screen.queryByRole('heading', { name: 'Solicitar revisión' }))).toBe(permitida);
  expect(screen.queryByText(/99%/)).toBeNull();
  expect(screen.getByRole('link', { name: /Volver a/ }).getAttribute('href')).toBe(seguida ? '/ciudadano/seguidas' : '/ciudadano/reportes');
});
