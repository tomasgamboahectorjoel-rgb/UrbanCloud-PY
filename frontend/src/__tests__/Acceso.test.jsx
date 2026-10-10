import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { PaginaAcceso } from '../paginas/Acceso';
import { Aplicacion, RutaProtegida } from '../Aplicacion';

const sesion = vi.hoisted(() => ({
  usuario: null,
  cargando: false,
  iniciar: vi.fn(),
  registrar: vi.fn(),
}));

vi.mock('../contexto/Sesion', () => ({
  usarSesion: () => sesion,
  rutasPorRol: {
    Ciudadano: '/ciudadano', Operador: '/operador', Supervisor: '/supervisor',
    'Personal técnico': '/tecnico', Administrador: '/administrador',
  },
}));
vi.mock('../componentes/Mapa', () => ({ Mapa: () => <div>Mapa</div> }));

beforeEach(() => {
  sesion.usuario = null;
  sesion.iniciar.mockReset();
  sesion.registrar.mockReset();
});

describe('acceso y navegación por rol', () => {
  it('inicia sesión y redirige según el rol devuelto por Laravel', async () => {
    sesion.iniciar.mockResolvedValue({ rol: 'Supervisor' });
    render(<MemoryRouter initialEntries={['/login']}><Routes>
      <Route path="/login" element={<PaginaAcceso />} />
      <Route path="/supervisor" element={<div>Panel supervisor</div>} />
    </Routes></MemoryRouter>);
    fireEvent.change(screen.getByLabelText('Correo'), { target: { value: 'supervisor@example.test' } });
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'ClaveSegura123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Ingresar' }));
    await waitFor(() => expect(screen.getByText('Panel supervisor')).toBeTruthy());
    expect(sesion.iniciar).toHaveBeenCalledWith('supervisor@example.test', 'ClaveSegura123');
  });

  it('usa el correo completo y muestra un error claro si falla el ingreso', async () => {
    sesion.iniciar.mockRejectedValue(new Error('Las credenciales no son válidas o la cuenta está inactiva.'));
    render(<MemoryRouter><PaginaAcceso /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText('Correo'), { target: { value: 'ana@gmail.com' } });
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'incorrecta' } });
    fireEvent.click(screen.getByRole('button', { name: 'Ingresar' }));
    await waitFor(() => expect(screen.getByText('Las credenciales no son válidas o la cuenta está inactiva.')).toBeTruthy());
    expect(sesion.iniciar).toHaveBeenCalledWith('ana@gmail.com', 'incorrecta');
  });

  it('limpia el error y los campos al pasar de un login fallido al registro', async () => {
    const mensaje = 'Las credenciales no son válidas o la cuenta está inactiva.';
    sesion.iniciar.mockRejectedValue(new Error(mensaje));
    render(<MemoryRouter initialEntries={['/login']}><Aplicacion /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText('Correo'), { target: { value: 'admin@gmail.com' } });
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'incorrecta' } });
    fireEvent.click(screen.getByRole('button', { name: 'Ingresar' }));
    await screen.findByText(mensaje);

    fireEvent.click(screen.getByRole('link', { name: 'Regístrate aquí' }));
    expect(screen.getByRole('heading', { name: 'Crear cuenta' })).toBeTruthy();
    expect(screen.queryByText(mensaje)).toBeNull();
    expect(screen.getByLabelText('Correo').value).toBe('');
    fireEvent.click(screen.getByRole('link', { name: 'Inicia sesión' }));
    expect(screen.getByRole('heading', { name: 'Iniciar sesión' })).toBeTruthy();
    expect(screen.queryByText(mensaje)).toBeNull();
  });

  it('registra en tres pasos y muestra la cuenta creada sin iniciar sesión', async () => {
    sesion.registrar.mockResolvedValue({ usuario: { rol: 'Ciudadano' }, correo_verificacion_enviado: true });
    render(<MemoryRouter initialEntries={['/registro']}><Routes>
      <Route path="/registro" element={<PaginaAcceso registro />} />
      <Route path="/login" element={<div>Pantalla de ingreso</div>} />
    </Routes></MemoryRouter>);
    fireEvent.change(screen.getByLabelText('Nombres'), { target: { value: 'Ana' } });
    fireEvent.change(screen.getByLabelText('Apellidos'), { target: { value: 'Pérez' } });
    fireEvent.change(screen.getByLabelText('Correo'), { target: { value: 'ana@gmail.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'ClaveSegura123' } });
    fireEvent.change(screen.getByLabelText('Confirmar contraseña'), { target: { value: 'ClaveSegura123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    expect(screen.getByText('ana@gmail.com')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Cuenta creada' })).toBeTruthy());
    expect(sesion.registrar).toHaveBeenCalledWith({
      nombre: 'Ana Pérez', email: 'ana@gmail.com',
      password: 'ClaveSegura123', password_confirmation: 'ClaveSegura123',
    });
    fireEvent.click(screen.getByRole('link', { name: 'Ir a iniciar sesión' }));
    expect(screen.getByText('Pantalla de ingreso')).toBeTruthy();
  });

  it('rechaza un correo mal formado antes de avanzar en el registro', () => {
    render(<MemoryRouter><PaginaAcceso registro /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText('Nombres'), { target: { value: 'Héctor' } });
    fireEvent.change(screen.getByLabelText('Apellidos'), { target: { value: 'Pérez' } });
    fireEvent.change(screen.getByLabelText('Correo'), { target: { value: 'hector@a' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    expect(screen.getByText('Escribe un correo completo y válido, por ejemplo nombre@gmail.com.')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Crear cuenta' })).toBeTruthy();
    expect(sesion.registrar).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Correo'), { target: { value: 'hector..perez@gmail.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    expect(screen.getByText('Escribe un correo completo y válido, por ejemplo nombre@gmail.com.')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Crear cuenta' })).toBeTruthy();
  });

  it('permite ver y ocultar cada contraseña sin perder el valor ingresado', () => {
    render(<MemoryRouter><PaginaAcceso registro /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText('Nombres'), { target: { value: 'Ana' } });
    fireEvent.change(screen.getByLabelText('Apellidos'), { target: { value: 'Pérez' } });
    fireEvent.change(screen.getByLabelText('Correo'), { target: { value: 'ana@gmail.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    const clave = screen.getByLabelText('Contraseña');
    const confirmacion = screen.getByLabelText('Confirmar contraseña');

    fireEvent.change(clave, { target: { value: 'ClaveSegura123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar contraseña' }));
    expect(clave.type).toBe('text');
    expect(clave.value).toBe('ClaveSegura123');
    expect(confirmacion.type).toBe('password');

    fireEvent.click(screen.getByRole('button', { name: 'Mostrar confirmación de contraseña' }));
    expect(confirmacion.type).toBe('text');
    fireEvent.click(screen.getByRole('button', { name: 'Ocultar contraseña' }));
    expect(clave.type).toBe('password');
  });

  it('muestra el correo duplicado y vuelve a los datos para corregirlo', async () => {
    sesion.registrar.mockRejectedValue({
      message: 'Este correo ya está registrado. Inicia sesión o usa otro correo.',
      errores: { email: ['Este correo ya está registrado. Inicia sesión o usa otro correo.'] },
    });
    render(<MemoryRouter><PaginaAcceso registro /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText('Nombres'), { target: { value: 'Ana' } });
    fireEvent.change(screen.getByLabelText('Apellidos'), { target: { value: 'Pérez' } });
    fireEvent.change(screen.getByLabelText('Correo'), { target: { value: 'ana@gmail.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'ClaveSegura123' } });
    fireEvent.change(screen.getByLabelText('Confirmar contraseña'), { target: { value: 'ClaveSegura123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));
    await waitFor(() => expect(screen.getByText('Este correo ya está registrado. Inicia sesión o usa otro correo.')).toBeTruthy());
    expect(screen.getByLabelText('Correo').value).toBe('ana@gmail.com');
    expect(screen.getByRole('heading', { name: 'Crear cuenta' })).toBeTruthy();
  });

  it('impide ver una página de otro rol', async () => {
    sesion.usuario = { rol: 'Ciudadano' };
    render(<MemoryRouter initialEntries={['/operador']}><Routes>
      <Route path="/operador" element={<RutaProtegida roles={['Operador']}><div>Bandeja privada</div></RutaProtegida>} />
      <Route path="/ciudadano" element={<div>Panel ciudadano</div>} />
    </Routes></MemoryRouter>);
    await waitFor(() => expect(screen.getByText('Panel ciudadano')).toBeTruthy());
    expect(screen.queryByText('Bandeja privada')).toBeNull();
  });
});
