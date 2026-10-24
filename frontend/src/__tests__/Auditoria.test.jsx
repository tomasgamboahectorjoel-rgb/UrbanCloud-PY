import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { AuditoriaAdministrador } from '../paginas/Administrador';

const servicios = vi.hoisted(() => ({ auditoria: vi.fn(), catalogos: vi.fn(), usuarios: vi.fn() }));
vi.mock('../servicios/servicioDatos', () => ({ servicioDatos: servicios }));
beforeEach(() => {
  servicios.catalogos.mockReset().mockResolvedValue({ areas: [{ id: 1, nombre: 'Alumbrado público' }], categorias: [{ id: 1, nombre: 'Iluminación' }], prioridades: [{ id: 2, nombre: 'Alta' }] });
  servicios.auditoria.mockReset(); servicios.usuarios.mockClear();
});
afterEach(cleanup);
function montar(detalle, accion = 'asignacion') {
  servicios.auditoria.mockResolvedValue({ data: [{ id: 1, accion, fecha: '2026-10-24T12:00:00Z', detalle }], last_page: 1 });
  return render(<AuditoriaAdministrador />);
}
it('traduce asignación y muestra referencia técnica sin inventar nombre ni consultar usuarios', async () => {
  montar({ tecnico_id: 4 });
  expect(await screen.findByText('Asignación de técnico')).toBeTruthy();
  expect(screen.getByText('Técnico #4')).toBeTruthy();
  expect(servicios.usuarios).not.toHaveBeenCalled();
});
it('resuelve clasificación con catálogos actuales y acepta identificadores de texto', async () => {
  montar({ area_id: '1', categoria_id: '1', prioridad_id: '2' }, 'clasificacion_confirmada_y_derivada');
  expect(await screen.findByText('Alumbrado público')).toBeTruthy();
  expect(screen.getByText('Iluminación')).toBeTruthy();
  expect(screen.getByText('Alta')).toBeTruthy();
  expect(screen.getByText('Clasificación confirmada y derivada')).toBeTruthy();
});
it('reconoce identificadores de clasificación con claves cortas sin alterar nombres ya legibles', async () => {
  montar({ area_id: '1', categoria: '1', prioridad: '2', tecnico: 'Ana Pérez' });
  expect(await screen.findByText('Iluminación')).toBeTruthy();
  expect(screen.getByText('Alta')).toBeTruthy();
  expect(screen.getByText('Ana Pérez')).toBeTruthy();
});
it('presenta configuración como porcentaje y decisiones Sí/No sin JSON', async () => {
  montar('{"umbral_confianza_ia":71,"alertas_duplicados_activas":true}', 'configuracion_actualizada');
  expect(await screen.findByText('71%')).toBeTruthy();
  expect(screen.getByText('Umbral de confianza IA')).toBeTruthy();
  expect(screen.getByText('Alertas de duplicados')).toBeTruthy();
  expect(screen.getByText('Sí')).toBeTruthy();
});
it('preserva motivos y campos desconocidos anidados, arrays, false y cero', async () => {
  montar({ motivo: 'Sin acceso al poste', resultado_extra: { intentos: 0, revisado: false }, evidencias: ['Foto A', { nota_interna: 'Verificar acceso' }] }, 'accion_nueva');
  expect(await screen.findByText('Accion nueva')).toBeTruthy();
  expect(screen.getByText('Motivo')).toBeTruthy();
  expect(screen.getByText('Sin acceso al poste')).toBeTruthy();
  expect(screen.getByText('Resultado extra')).toBeTruthy();
  expect(screen.getByText('0')).toBeTruthy();
  expect(screen.getByText('No')).toBeTruthy();
  expect(screen.getByText('Foto A')).toBeTruthy();
  expect(screen.getByText('Verificar acceso')).toBeTruthy();
  expect(document.body.textContent).not.toContain('[object Object]');
});
it.each([null, undefined])('explica la ausencia de detalle %s', async detalle => {
  montar(detalle);
  expect(await screen.findByText('Sin detalle adicional')).toBeTruthy();
});
it.each([[0, '0'], [false, 'No'], [[], 'Sin elementos'], [{}, 'Sin campos registrados']])('conserva detalles primitivos o vacíos: %j', async (detalle, esperado) => {
  montar(detalle);
  expect(await screen.findByText(esperado)).toBeTruthy();
});
it.each(['Observación manual', '{JSON incompleto'])('conserva texto sin JSON válido: %s', async detalle => {
  montar(detalle, 'impedimento');
  expect(await screen.findByText(detalle)).toBeTruthy();
  expect(screen.getByText('Impedimento registrado')).toBeTruthy();
});
it('no bloquea auditoría si falla catálogo y usa referencias explícitas', async () => {
  servicios.catalogos.mockRejectedValue(new Error('Catálogos no disponibles'));
  montar({ area_id: 1, categoria_id: 99, prioridad_id: 0 });
  expect(await screen.findByText('Área #1')).toBeTruthy();
  expect(screen.getByText('Categoría #99')).toBeTruthy();
  expect(screen.getByText('Prioridad #0')).toBeTruthy();
});
