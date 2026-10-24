import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { Aplicacion } from '../Aplicacion';

const sesion = vi.hoisted(() => ({ usuario: null, cargando: true }));
vi.mock('../contexto/Sesion', () => ({ usarSesion: () => sesion, rutasPorRol: { Ciudadano: '/ciudadano' } }));
vi.mock('../componentes/Mapa', () => ({ Mapa: () => null }));
afterEach(() => { cleanup(); sesion.cargando = true; });

it.each(['/', '/login', '/registro', '/operador'])('presenta la carga de marca accesible en %s mientras se comprueba la sesión', (ruta) => {
  const { container } = render(<MemoryRouter initialEntries={[ruta]}><Aplicacion /></MemoryRouter>);
  const estado = screen.getByRole('status');
  expect(estado.textContent).toBe('Cargando UrbanCloud AI…');
  expect(screen.getAllByText('Cargando UrbanCloud AI…')).toHaveLength(1);
  expect(estado.querySelector('source')?.getAttribute('srcset')).toBe('/urbancloud-logo.webp');
  expect(estado.querySelector('img')?.getAttribute('alt')).toBe('');
  expect(container.querySelector('.carga-marca-indicador')?.getAttribute('aria-hidden')).toBe('true');
  expect(screen.queryByRole('heading', { name: /Una ciudad mejor empieza/ })).toBeNull();
});

it('muestra la portada inmediatamente al terminar la comprobación de sesión', () => {
  const { rerender } = render(<MemoryRouter><Aplicacion /></MemoryRouter>);
  expect(screen.getByText('Cargando UrbanCloud AI…')).toBeTruthy();
  sesion.cargando = false;
  rerender(<MemoryRouter><Aplicacion /></MemoryRouter>);
  expect(screen.queryByText('Cargando UrbanCloud AI…')).toBeNull();
  expect(screen.getByRole('heading', { name: /Una ciudad mejor empieza/ })).toBeTruthy();
});
