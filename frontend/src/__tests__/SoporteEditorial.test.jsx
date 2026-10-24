import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { TarjetasResumen } from '../componentes/Estado';
import { PaginaNotificaciones } from '../paginas/Notificaciones';
import { UsuariosAdministrador, PanelAdministrador, AuditoriaAdministrador } from '../paginas/Administrador';
import { MemoryRouter } from 'react-router';

const servicios = vi.hoisted(() => ({ notificaciones: vi.fn(), leer: vi.fn(), leerTodas: vi.fn(), usuarios: vi.fn(), catalogos: vi.fn(), resumen: vi.fn(), auditoria: vi.fn() }));
vi.mock('../servicios/servicioDatos', () => ({ servicioDatos: servicios }));
beforeEach(() => {
  servicios.catalogos.mockResolvedValue({ roles: [], areas: [] });
  servicios.usuarios.mockResolvedValue({ data: [], last_page: 1 });
  servicios.resumen.mockResolvedValue({ perfiles: 0, categorias: 0, auditorias: 0 });
  servicios.notificaciones.mockResolvedValue({ no_leidas: 1, notificaciones: { data: [
    { id: 1, titulo: 'Reporte actualizado', mensaje: 'El equipo revisó tu reporte.', created_at: '2026-10-24T12:00:00Z' },
    { id: 2, titulo: 'Reporte registrado', mensaje: 'Registro completo.', leida_en: '2026-10-24T12:00:00Z', created_at: '2026-10-24T12:00:00Z' },
  ], last_page: 1 } });
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });
it('distingue una cifra desconocida del cero real', () => {
  render(<TarjetasResumen elementos={ [['Pendientes', null, 'Sin respuesta'], ['Cerrados', 0, 'Total']] } />);
  expect(screen.getByText('—').getAttribute('aria-label')).toBe('Dato no disponible');
  expect(screen.getByText('0')).toBeTruthy();
});
it('no inventa un umbral cero cuando el resumen no contiene el dato', async () => {
  render(<MemoryRouter><PanelAdministrador /></MemoryRouter>);
  await screen.findByText('Umbral IA');
  expect(screen.queryByText('0%')).toBeNull();
  expect(screen.getByLabelText('Dato no disponible')).toBeTruthy();
});
it('identifica notificaciones leídas sin depender solo del color', async () => {
  render(<PaginaNotificaciones />);
  expect(await screen.findByText('Sin leer')).toBeTruthy();
  expect(screen.getByText('Leída')).toBeTruthy();
  expect(screen.getAllByRole('button', { name: 'Marcar leída' })).toHaveLength(1);
});
it('presenta fallos al marcar una notificación como error, no como confirmación', async () => {
  servicios.leer.mockRejectedValueOnce(new Error('No se pudo actualizar.'));
  render(<PaginaNotificaciones />);
  fireEvent.click(await screen.findByRole('button', { name: 'Marcar leída' }));
  expect((await screen.findByText('No se pudo actualizar.')).className).toContain('aviso-error');
});
it('explica el resultado vacío de usuarios y permite limpiar filtros', async () => {
  render(<UsuariosAdministrador />);
  expect(await screen.findByText('No se encontraron usuarios.')).toBeTruthy();
  fireEvent.change(screen.getByLabelText('Buscar'), { target: { value: 'Ana' } });
  fireEvent.click(screen.getByRole('button', { name: 'Limpiar filtros' }));
  expect(screen.getByLabelText('Buscar').value).toBe('');
});
it('diferencia auditoría vacía de usuarios sin resultados', async () => {
  servicios.auditoria.mockResolvedValueOnce({ data: [], last_page: 1 });
  render(<AuditoriaAdministrador />);
  expect(await screen.findByText('Todavía no hay acciones registradas.')).toBeTruthy();
  expect(screen.queryByText('No se encontraron usuarios.')).toBeNull();
});
