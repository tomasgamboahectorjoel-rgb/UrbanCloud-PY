import { afterEach, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { IconoMarca } from '../componentes/Marca';
import { Portada } from '../paginas/Publico';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it('usa el logo transparente WebP con respaldo PNG como marca compartida', () => {
  const { container } = render(<IconoMarca />);
  const logo = container.querySelector('img');
  expect(logo?.getAttribute('src')).toBe('/urbancloud-logo.png');
  expect(logo?.getAttribute('alt')).toBe('');
  expect(container.querySelector('source')?.getAttribute('srcset')).toBe('/urbancloud-logo.webp');
});

it('observa secciones, anima una vez y desconecta al desmontar', () => {
  let recibir;
  const observe = vi.fn();
  const unobserve = vi.fn();
  const disconnect = vi.fn();
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
  vi.stubGlobal('IntersectionObserver', class { constructor(cb) { recibir = cb; } observe = observe; unobserve = unobserve; disconnect = disconnect; });
  const { container, unmount } = render(<MemoryRouter><Portada /></MemoryRouter>);
  const seccion = container.querySelector('#como-funciona');
  expect(observe).toHaveBeenCalledWith(seccion);
  expect(seccion.classList.contains('publico-revelado')).toBe(false);
  act(() => recibir([{ target: seccion, isIntersecting: true }]));
  expect(seccion.classList.contains('publico-revelado')).toBe(true);
  expect(unobserve).toHaveBeenCalledWith(seccion);
  act(() => recibir([{ target: seccion, isIntersecting: true }]));
  expect(unobserve).toHaveBeenCalledTimes(1);
  unmount();
  expect(disconnect).toHaveBeenCalled();
});

it('mantiene el contenido disponible sin observer y con movimiento reducido', () => {
  const observer = vi.fn();
  vi.stubGlobal('IntersectionObserver', observer);
  vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
  const { container } = render(<MemoryRouter><Portada /></MemoryRouter>);
  expect(observer).not.toHaveBeenCalled();
  expect(screen.getByRole('heading', { name: /Cada incidencia/ })).toBeTruthy();
  expect(container.querySelector('.publico-revelado')).toBeNull();
});

it('no necesita IntersectionObserver para mostrar la portada', () => {
  vi.stubGlobal('IntersectionObserver', undefined);
  render(<MemoryRouter><Portada /></MemoryRouter>);
  expect(screen.getByRole('heading', { name: /Cada incidencia/ })).toBeTruthy();
});

it('detiene el observer al activar movimiento reducido y limpia la suscripción', () => {
  let cambiar;
  const disconnect = vi.fn();
  const removeEventListener = vi.fn();
  const preferencia = { matches: false, addEventListener: vi.fn((tipo, cb) => { cambiar = cb; }), removeEventListener };
  vi.stubGlobal('matchMedia', () => preferencia);
  vi.stubGlobal('IntersectionObserver', class { observe = vi.fn(); unobserve = vi.fn(); disconnect = disconnect; });
  const { unmount } = render(<MemoryRouter><Portada /></MemoryRouter>);
  preferencia.matches = true;
  act(() => cambiar());
  expect(disconnect).toHaveBeenCalled();
  unmount();
  expect(removeEventListener).toHaveBeenCalledWith('change', cambiar);
});
