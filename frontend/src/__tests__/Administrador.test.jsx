import { beforeEach, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { PanelAdministrador, UsuariosAdministrador } from '../paginas/Administrador';

const servicios = vi.hoisted(() => ({
  usuarios: vi.fn(),
  catalogos: vi.fn(),
  crearUsuario: vi.fn(),
  resumen: vi.fn(),
}));

vi.mock('../servicios/servicioDatos', () => ({ servicioDatos: servicios }));

beforeEach(() => {
  servicios.usuarios.mockReset().mockResolvedValue({ data: [], last_page: 1 });
  servicios.catalogos.mockReset().mockResolvedValue({
    roles: [{ id: 2, nombre: 'Operador' }], areas: [],
  });
  servicios.crearUsuario.mockReset().mockResolvedValue({});
  servicios.resumen.mockReset().mockResolvedValue({
    perfiles: 2, categorias: 2, categorias_activas: ['Iluminación', 'Limpieza'],
    umbral_ia: 74, auditorias: 0,
  });
});

it('muestra al administrador los nombres de las categorías activas', async () => {
  render(<MemoryRouter><PanelAdministrador /></MemoryRouter>);
  await screen.findByRole('heading', { name: 'Categorías activas' });
  expect(screen.getByText('Iluminación')).toBeTruthy();
  expect(screen.getByText('Limpieza')).toBeTruthy();
});

it('permite crear usuarios internos con un correo completo', async () => {
  render(<UsuariosAdministrador />);
  const correo = await screen.findByLabelText('Correo');

  fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Ana Pérez' } });
  fireEvent.change(correo, { target: { value: 'ana.perez@otro.com' } });
  expect(correo.value).toBe('ana.perez@otro.com');
  fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'ClaveSegura123' } });
  fireEvent.change(screen.getByLabelText('Confirmar contraseña'), { target: { value: 'ClaveSegura123' } });
  fireEvent.change(screen.getByLabelText('Rol interno'), { target: { value: '2' } });
  fireEvent.click(screen.getByRole('button', { name: 'Crear usuario' }));

  await waitFor(() => expect(servicios.crearUsuario).toHaveBeenCalledWith({
    nombre: 'Ana Pérez', email: 'ana.perez@otro.com',
    password: 'ClaveSegura123', password_confirmation: 'ClaveSegura123',
    rol_id: 2, area_id: null,
  }));
});

it('abre el formulario de restablecimiento en un diálogo visible', async () => {
  servicios.usuarios.mockResolvedValue({
    data: [{ id: 7, nombre: 'Operador de prueba', correo: 'operador@gmail.com',
      rol: 'Operador', area: null, activo: true }],
    last_page: 1,
  });
  render(<UsuariosAdministrador />);

  fireEvent.click(await screen.findByRole('button', { name: 'Restablecer clave' }));
  const dialogo = screen.getByRole('dialog', { name: 'Contraseña de Operador de prueba' });
  expect(dialogo).toBeTruthy();
  expect(screen.getByLabelText('Nueva contraseña')).toBe(document.activeElement);

  fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
  expect(screen.queryByRole('dialog')).toBeNull();
});
