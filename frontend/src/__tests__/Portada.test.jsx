import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { LayoutPortada } from '../paginas/Portada';
import { PaginaAcceso } from '../paginas/Acceso';

const sesion = vi.hoisted(() => ({ usuario: null, cargando: false, iniciar: vi.fn(), registrar: vi.fn() }));

vi.mock('../contexto/Sesion', () => ({
  usarSesion: () => sesion,
  rutasPorRol: { Ciudadano: '/ciudadano', Operador: '/operador' },
}));

function Ubicacion() {
  return <p data-testid="ruta">{useLocation().pathname}</p>;
}

function montar(ruta) {
  return render(<MemoryRouter initialEntries={[ruta]}>
    <Ubicacion />
    <Routes>
      <Route element={<LayoutPortada />}>
        <Route path="/" element={null} />
        <Route path="/login" element={<PaginaAcceso />} />
        <Route path="/registro" element={<PaginaAcceso registro />} />
      </Route>
      <Route path="/ciudadano" element={<div>Panel ciudadano</div>} />
    </Routes>
  </MemoryRouter>);
}

beforeEach(() => {
  sesion.usuario = null;
  sesion.cargando = false;
});

describe('portada y diálogos de acceso', () => {
  it('en / muestra la portada sin diálogo', () => {
    montar('/');
    expect(screen.getByRole('heading', { level: 1 })).toBeTruthy();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('los botones de la portada abren los diálogos de ingreso y registro', () => {
    montar('/');
    fireEvent.click(screen.getAllByRole('button', { name: 'Iniciar sesión' })[0]);
    expect(screen.getByTestId('ruta').textContent).toBe('/login');
    expect(screen.getByRole('dialog', { name: 'Iniciar sesión' })).toBeTruthy();
  });

  it('/registro muestra el diálogo con el paso 1 de 3 sobre la portada', () => {
    montar('/registro');
    expect(screen.getByRole('dialog', { name: 'Crear cuenta' })).toBeTruthy();
    expect(screen.getByLabelText('Registro, paso 1 de 3')).toBeTruthy();
    expect(screen.getByRole('heading', { level: 1 })).toBeTruthy();
  });

  it('cierra con la X y vuelve a /', () => {
    montar('/login');
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }));
    expect(screen.getByTestId('ruta').textContent).toBe('/');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('cierra con Esc y vuelve a /', () => {
    montar('/login');
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(screen.getByTestId('ruta').textContent).toBe('/');
  });

  it('cierra con Esc aunque el foco haya pasado a <body> (tras enviar el formulario)', () => {
    montar('/login');
    document.activeElement?.blur();
    fireEvent.keyDown(document.body, { key: 'Escape' });
    expect(screen.getByTestId('ruta').textContent).toBe('/');
  });

  it('cierra con clic fuera del diálogo y vuelve a /', () => {
    const { container } = montar('/login');
    fireEvent.mouseDown(container.querySelector('.lp-overlay'));
    expect(screen.getByTestId('ruta').textContent).toBe('/');
  });

  it('con sesión iniciada, / y /login llevan al panel del rol', () => {
    sesion.usuario = { rol: 'Ciudadano' };
    montar('/login');
    expect(screen.getByText('Panel ciudadano')).toBeTruthy();
  });

  it('mientras se comprueba la sesión no muestra la portada en las rutas de acceso', () => {
    sesion.cargando = true;
    montar('/login');
    expect(screen.getByRole('status').textContent).toContain('Cargando');
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
