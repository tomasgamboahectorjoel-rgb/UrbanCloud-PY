import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { NuevoReporte, DetalleCiudadano } from '../paginas/Ciudadano';
import { DetalleOperador } from '../paginas/Operador';
import { DetalleSupervisor, ListaSupervisor } from '../paginas/Supervisor';
import { DetalleTecnico, PanelTecnico } from '../paginas/Tecnico';

const servicios = vi.hoisted(() => ({
  catalogos: vi.fn(), crearReporte: vi.fn(), similares: vi.fn(), seguir: vi.fn(),
  detalleCiudadano: vi.fn(), solicitarRevision: vi.fn(),
  detalleOperador: vi.fn(), revisar: vi.fn(), resolverRevision: vi.fn(),
  detalleSupervisor: vi.fn(), casosSupervisor: vi.fn(), asignar: vi.fn(), cerrar: vi.fn(), devolver: vi.fn(),
  detalleTecnico: vi.fn(), actualizarTarea: vi.fn(), historialTecnico: vi.fn(), resumen: vi.fn(),
}));

vi.mock('../servicios/servicioDatos', () => ({ servicioDatos: servicios }));
vi.mock('../componentes/Mapa', () => ({
  Mapa: ({ alCambiar }) => <button type="button" onClick={() => alCambiar?.(-9.0747, -78.5934)}>Elegir ubicación</button>,
}));
vi.mock('../componentes/Evidencias', () => ({ Evidencias: () => <div>Evidencias</div> }));

const catalogos = {
  distritos: [{ id: 1, nombre: 'Chimbote' }],
  categorias: [{ id: 1, nombre: 'Iluminación' }],
  prioridades: [{ id: 1, nombre: 'Media' }],
  areas: [{ id: 1, nombre: 'Alumbrado público' }],
};
const incidencia = {
  id: 'caso-1', codigo: 'URB-2026-0001', titulo: 'Poste apagado',
  descripcion: 'El poste no funciona desde anoche.', estado: 'En revisión',
  categoria: 'Iluminación', prioridad: 'Media', area: 'Alumbrado público',
  distrito: 'Chimbote', direccion: 'Av. Principal', historial: [], evidencias: [],
  actualizaciones: [], analisis_ia: [{ categoria_sugerida: 'Iluminación',
    prioridad_sugerida: 'Media', area_sugerida: 'Alumbrado público', confianza: 0.92 }],
};
const geolocalizacionOriginal = Object.getOwnPropertyDescriptor(navigator, 'geolocation');

function montar(ruta, elemento, destino = '') {
  return render(<MemoryRouter initialEntries={[ruta.replace(':id', 'caso-1')]}><Routes>
    <Route path={ruta} element={elemento} />
    {destino && <Route path={destino} element={<div>Destino del reporte</div>} />}
  </Routes></MemoryRouter>);
}

beforeEach(() => {
  Object.values(servicios).forEach((metodo) => metodo.mockReset());
  servicios.catalogos.mockResolvedValue(catalogos);
  servicios.detalleCiudadano.mockResolvedValue(incidencia);
  servicios.detalleOperador.mockResolvedValue(incidencia);
  servicios.detalleSupervisor.mockResolvedValue({ incidencia, tecnicos_compatibles: [{
    id: 8, nombre: 'Técnico disponible', asignaciones_activas: 0,
  }] });
  servicios.detalleTecnico.mockResolvedValue(incidencia);
  servicios.similares.mockResolvedValue({ datos: [] });
  servicios.historialTecnico.mockResolvedValue({ data: [], current_page: 1, last_page: 1, total: 0 });
  servicios.resumen.mockResolvedValue({ activas: 0, anteriores: 0, impedidas: 0, no_leidas: 0 });
});

afterEach(() => {
  if (geolocalizacionOriginal) Object.defineProperty(navigator, 'geolocation', geolocalizacionOriginal);
  else delete navigator.geolocation;
});

describe('flujo visual conectado', () => {
  it.each([
    [20, 'Ubicación detectada. Verifica que el pin marque el lugar del incidente.'],
    [500, 'Tu ubicación podría no ser precisa. Mueve el pin hasta el lugar del incidente antes de enviar.'],
    [undefined, 'No pudimos comprobar la precisión de tu ubicación. Verifica y ajusta el pin antes de enviar.'],
  ])('muestra el aviso adecuado para una precisión de %s y lo quita al ajustar el pin', async (accuracy, aviso) => {
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: { getCurrentPosition: (exito) => exito({ coords: { latitude: -9.08, longitude: -78.57, accuracy } }) },
    });
    montar('/ciudadano/nuevo', <NuevoReporte />);
    await screen.findByText('Datos de la incidencia');
    fireEvent.click(screen.getByRole('button', { name: 'Usar mi ubicación' }));
    expect(screen.getByText(aviso)).toBeTruthy();
    fireEvent.click(screen.getByText('Elegir ubicación'));
    expect(screen.queryByText(aviso)).toBeNull();
  });

  it('envía el reporte con foto y ubicación y muestra el destino del código', async () => {
    servicios.crearReporte.mockResolvedValue({ id: 'caso-1', codigo: 'URB-2026-0001' });
    montar('/ciudadano/nuevo', <NuevoReporte />, '/ciudadano/reportes/:id');
    await screen.findByText('Datos de la incidencia');
    fireEvent.change(screen.getByLabelText('¿Qué ocurrió? *'), { target: { value: 'Poste apagado' } });
    fireEvent.change(screen.getByLabelText('Describe el problema *'), { target: { value: 'El poste está apagado desde anoche.' } });
    fireEvent.change(screen.getByLabelText('Distrito *'), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText('Dirección o referencia *'), { target: { value: 'Av. Principal' } });
    fireEvent.change(screen.getByLabelText(/Fotografía \*/), { target: { files: [new File(['foto'], 'poste.jpg', { type: 'image/jpeg' })] } });
    fireEvent.click(screen.getByText('Elegir ubicación'));
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.submit(screen.getByRole('button', { name: 'Analizar y enviar' }).closest('form'));
    await waitFor(() => expect(screen.getByText('Destino del reporte')).toBeTruthy());
    const datos = servicios.crearReporte.mock.calls[0][0];
    expect(datos.get('latitud')).toBe('-9.0747');
    expect(datos.get('fotografia').name).toBe('poste.jpg');
  });

  it('muestra el motivo del rechazo sin inventar un código', async () => {
    servicios.crearReporte.mockRejectedValue(new Error('La imagen no evidencia una incidencia urbana.'));
    montar('/ciudadano/nuevo', <NuevoReporte />);
    await screen.findByText('Datos de la incidencia');
    fireEvent.change(screen.getByLabelText('¿Qué ocurrió? *'), { target: { value: 'Selfie' } });
    fireEvent.change(screen.getByLabelText('Describe el problema *'), { target: { value: 'Fotografía personal sin problema urbano.' } });
    fireEvent.change(screen.getByLabelText('Distrito *'), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText('Dirección o referencia *'), { target: { value: 'Av. Principal' } });
    fireEvent.change(screen.getByLabelText(/Fotografía \*/), { target: { files: [new File(['foto'], 'foto.jpg', { type: 'image/jpeg' })] } });
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.submit(screen.getByRole('button', { name: 'Analizar y enviar' }).closest('form'));
    await screen.findByText('La imagen no evidencia una incidencia urbana.');
    expect(screen.queryByText(/URB-2026-/)).toBeNull();
  });

  it('muestra Analizando y un error controlado cuando la integración falla', async () => {
    let rechazarSolicitud;
    servicios.crearReporte.mockImplementation(() => new Promise((_, rechazar) => {
      rechazarSolicitud = rechazar;
    }));
    montar('/ciudadano/nuevo', <NuevoReporte />);
    await screen.findByText('Datos de la incidencia');
    fireEvent.change(screen.getByLabelText('¿Qué ocurrió? *'), { target: { value: 'Poste apagado' } });
    fireEvent.change(screen.getByLabelText('Describe el problema *'), { target: { value: 'El poste está apagado desde anoche.' } });
    fireEvent.change(screen.getByLabelText('Distrito *'), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText('Dirección o referencia *'), { target: { value: 'Av. Principal' } });
    fireEvent.change(screen.getByLabelText(/Fotografía \*/), { target: { files: [new File(['foto'], 'poste.jpg', { type: 'image/jpeg' })] } });
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.submit(screen.getByRole('button', { name: 'Analizar y enviar' }).closest('form'));
    expect(screen.getByRole('button', { name: 'Analizando…' }).disabled).toBe(true);
    rechazarSolicitud(new Error('No pudimos analizar el reporte en este momento. Inténtalo nuevamente.'));
    await screen.findByText('No pudimos analizar el reporte en este momento. Inténtalo nuevamente.');
    expect(screen.getByRole('button', { name: 'Analizar y enviar' }).disabled).toBe(false);
  });

  it('permite confirmar clasificación y resolver una revisión solicitada', async () => {
    servicios.revisar.mockResolvedValue({ estado: 'Derivado' });
    montar('/operador/incidencias/:id', <DetalleOperador />);
    await screen.findByText('Confirmar o corregir clasificación');
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar y derivar' }));
    await waitFor(() => expect(servicios.revisar).toHaveBeenCalledWith('caso-1', expect.objectContaining({ categoria_id: '1' })));
  });

  it('resuelve una solicitud ciudadana manteniendo el cierre con motivo', async () => {
    servicios.detalleOperador.mockResolvedValue({ ...incidencia, estado: 'Revisión solicitada' });
    servicios.resolverRevision.mockResolvedValue({ estado: 'Cerrado' });
    montar('/operador/incidencias/:id', <DetalleOperador />);
    await screen.findByText('Resolver solicitud de revisión');
    fireEvent.change(screen.getByLabelText('Respuesta y motivo'), { target: { value: 'La reparación fue comprobada.' } });
    fireEvent.change(screen.getByLabelText('Decisión'), { target: { value: 'mantener_cierre' } });
    fireEvent.click(screen.getByRole('button', { name: 'Registrar decisión' }));
    await waitFor(() => expect(servicios.resolverRevision).toHaveBeenCalledWith('caso-1', {
      decision: 'mantener_cierre', motivo: 'La reparación fue comprobada.',
    }));
  });

  it('asigna un técnico compatible y valida un cierre', async () => {
    servicios.detalleSupervisor.mockResolvedValue({ incidencia: { ...incidencia, estado: 'Derivado' },
      tecnicos_compatibles: [{ id: 8, nombre: 'Técnico disponible', asignaciones_activas: 0 }] });
    servicios.asignar.mockResolvedValue({ estado: 'Asignado' });
    montar('/supervisor/incidencias/:id', <DetalleSupervisor />);
    await screen.findByText('Asignar técnico');
    fireEvent.change(screen.getByLabelText('Técnico compatible'), { target: { value: '8' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar asignación' }));
    await waitFor(() => expect(servicios.asignar).toHaveBeenCalledWith('caso-1', expect.objectContaining({ tecnico_id: 8 })));
  });

  it('valida un cierre después de revisar el caso atendido', async () => {
    servicios.detalleSupervisor.mockResolvedValue({ incidencia: { ...incidencia, estado: 'Atendido' },
      tecnicos_compatibles: [] });
    servicios.cerrar.mockResolvedValue({ estado: 'Cerrado' });
    montar('/supervisor/incidencias/:id', <DetalleSupervisor />);
    await screen.findByText('Validar cierre');
    fireEvent.click(screen.getByRole('button', { name: 'Aprobar cierre' }));
    await waitFor(() => expect(servicios.cerrar).toHaveBeenCalledWith('caso-1', { comentario: '' }));
  });

  it('muestra los atendidos pendientes y enlaza con el detalle de cierre', async () => {
    servicios.casosSupervisor.mockResolvedValue({
      data: [{ ...incidencia, estado: 'Atendido' }], last_page: 1,
    });
    montar('/supervisor/atendidos', <ListaSupervisor tipo="atendidos" />);
    await screen.findByRole('heading', { name: 'Pendientes de cierre' });
    await waitFor(() => expect(servicios.casosSupervisor).toHaveBeenCalledWith({ estado: 'Atendido' }, 1));
    expect(screen.getByRole('link', { name: 'Ver detalle' }).getAttribute('href'))
      .toBe('/supervisor/incidencias/caso-1');
  });

  it('solicita revisión solo en el detalle propio cerrado', async () => {
    servicios.detalleCiudadano.mockResolvedValue({ ...incidencia, estado: 'Cerrado' });
    servicios.solicitarRevision.mockResolvedValue({ estado: 'Revisión solicitada' });
    montar('/ciudadano/reportes/:id', <DetalleCiudadano />);
    await screen.findByText('Solicitar revisión');
    fireEvent.change(screen.getByLabelText('Motivo'), { target: { value: 'La luz volvió a fallar.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar solicitud' }));
    await waitFor(() => expect(servicios.solicitarRevision).toHaveBeenCalledWith('caso-1', 'La luz volvió a fallar.'));
  });

  it('registra atención técnica y solicitud de revisión ciudadana', async () => {
    servicios.detalleTecnico.mockResolvedValue({ ...incidencia, estado: 'En atención' });
    servicios.actualizarTarea.mockResolvedValue({ estado: 'Atendido' });
    montar('/tecnico/tareas/:id', <DetalleTecnico />);
    await screen.findByRole('heading', { name: 'Registrar avance' });
    fireEvent.change(screen.getByLabelText('Comentario *'), { target: { value: 'La luminaria fue reparada correctamente.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Registrar avance' }));
    await waitFor(() => expect(servicios.actualizarTarea).toHaveBeenCalled());
    expect(servicios.actualizarTarea.mock.calls[0][1].get('accion')).toBe('atendido');
  });

  it('explica al técnico cómo habilitar Atendido desde una tarea asignada', async () => {
    servicios.detalleTecnico.mockResolvedValue({ ...incidencia, estado: 'Asignado' });
    montar('/tecnico/tareas/:id', <DetalleTecnico />);
    await screen.findByText(/selecciona primero «Iniciar atención»/);
    expect(screen.queryByRole('option', { name: 'Atendido' })).toBeNull();
    expect(screen.getByRole('option', { name: 'Iniciar atención' })).toBeTruthy();
  });

  it('lleva al historial tras informar un impedimento sin recargar el detalle inaccesible', async () => {
    servicios.detalleTecnico.mockResolvedValue({ ...incidencia, estado: 'Asignado' });
    servicios.actualizarTarea.mockResolvedValue({ estado: 'Impedido' });
    render(<MemoryRouter initialEntries={['/tecnico/tareas/caso-1']}><Routes>
      <Route path="/tecnico/tareas/:id" element={<DetalleTecnico />} />
      <Route path="/tecnico/historial" element={<PanelTecnico historial />} />
    </Routes></MemoryRouter>);
    await screen.findByRole('heading', { name: 'Registrar avance' });
    fireEvent.change(screen.getByLabelText('Acción'), { target: { value: 'impedido' } });
    fireEvent.change(screen.getByLabelText('Comentario *'), {
      target: { value: 'No se pudo acceder al poste por trabajos en la vía.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Registrar avance' }));
    await screen.findByRole('heading', { name: 'Historial de tareas' });
    expect(screen.getByText('Impedimento registrado correctamente. La tarea pasó al historial.')).toBeTruthy();
    expect(servicios.actualizarTarea.mock.calls[0][1].get('accion')).toBe('impedido');
    expect(servicios.detalleTecnico).toHaveBeenCalledTimes(1);
  });
});
