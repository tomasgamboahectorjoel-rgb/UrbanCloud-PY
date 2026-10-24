import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Link, MemoryRouter, Route, Routes } from 'react-router';
import { DetalleOperador, ListaOperador, PanelOperador } from '../paginas/Operador';
import { DetalleSupervisor, EquipoSupervisor, ListaSupervisor } from '../paginas/Supervisor';
import { DetalleTecnico, PanelTecnico } from '../paginas/Tecnico';
const servicios = vi.hoisted(() => ({ resumen:vi.fn(), catalogos:vi.fn(), detalleOperador:vi.fn(), revisar:vi.fn(), todasOperador:vi.fn(), bandejaOperador:vi.fn(), detalleSupervisor:vi.fn(), equipo:vi.fn(), casosSupervisor:vi.fn(), asignar:vi.fn(), cerrar:vi.fn(), devolver:vi.fn(), tareas:vi.fn(), historialTecnico:vi.fn(), detalleTecnico:vi.fn(), actualizarTarea:vi.fn() }));
vi.mock('../servicios/servicioDatos',()=>({servicioDatos:servicios}));
vi.mock('../componentes/Mapa',()=>({Mapa:()=> <div>Mapa operativo</div>}));
vi.mock('../componentes/Evidencias',()=>({Evidencias:()=> <div>Evidencias operativas</div>}));
const incidencia={id:'r1',codigo:'URB-2026-0001',titulo:'Poste deteriorado',estado:'En revisión',categoria:'Iluminación',prioridad:'Alta',area:'Alumbrado',descripcion:'Luminaria apagada en la esquina.',latitud:0,longitud:0,historial:[],evidencias:[],analisis_ia:[{confianza:null}]};
const catalogos={categorias:[{id:1,nombre:'Iluminación'},{id:2,nombre:'Limpieza'}],prioridades:[{id:1,nombre:'Alta'}],areas:[{id:1,nombre:'Alumbrado'}],estados:[]};
beforeEach(()=>{
 Object.values(servicios).forEach(fn=>fn.mockReset());
 servicios.resumen.mockResolvedValue({pendientes:0,por_categoria:[]});
 servicios.catalogos.mockResolvedValue(catalogos);
 servicios.detalleOperador.mockResolvedValue(incidencia);
 servicios.todasOperador.mockResolvedValue({data:[],last_page:1});
 servicios.bandejaOperador.mockResolvedValue({data:[],last_page:1});
 servicios.detalleSupervisor.mockResolvedValue({incidencia:{...incidencia,estado:'Derivado'},tecnicos_compatibles:[]});
 servicios.equipo.mockResolvedValue([]);
 servicios.casosSupervisor.mockResolvedValue({data:[],last_page:1});
 servicios.tareas.mockResolvedValue({data:[],last_page:1});
 servicios.historialTecnico.mockResolvedValue({data:[],last_page:1});
 servicios.detalleTecnico.mockResolvedValue({...incidencia,estado:'Asignado'});
 servicios.actualizarTarea.mockResolvedValue({estado:'Impedido'});
});
afterEach(cleanup);
function montar(ui,detalle=false) {return render(<MemoryRouter initialEntries={[detalle?'/detalle/r1':'/']}><Routes><Route path={detalle?'/detalle/:id':'/'} element={ui}/><Route path="/tecnico/historial" element={<h1>Historial técnico</h1>}/></Routes></MemoryRouter>);}
it('orienta el panel operador sin duplicar CTA y explica categorías vacías',async()=>{
 montar(<PanelOperador/>);
 expect(await screen.findByText('No hay incidencias clasificadas por categoría.')).toBeTruthy();
 expect(screen.getByRole('link',{name:'Ir a la bandeja'})).toBeTruthy();
 expect(screen.queryByRole('link',{name:'Abrir bandeja'})).toBeNull();
});
it('limpia todos los filtros de operador incluidos área y prioridad',async()=>{
 montar(<ListaOperador tipo="todos"/>);
 await screen.findByRole('heading',{name:'Sin incidencias registradas'});
 fireEvent.change(screen.getByLabelText('Área'),{target:{value:'1'}});
 fireEvent.change(screen.getByLabelText('Prioridad'),{target:{value:'1'}});
 fireEvent.click(screen.getByRole('button',{name:'Filtrar'}));
 await screen.findByText('No encontramos coincidencias.');
 fireEvent.click(screen.getByRole('button',{name:'Limpiar filtros'}));
 await waitFor(()=>expect(servicios.todasOperador).toHaveBeenLastCalledWith({},1));
 expect(screen.getByLabelText('Área').value).toBe('');expect(screen.getByLabelText('Prioridad').value).toBe('');
});
it('no convierte confianza IA ausente en cero y muestra coordenadas cero válidas',async()=>{
 montar(<DetalleOperador/>,true);
 await screen.findByText('Mapa operativo');
 expect(screen.getAllByText('No disponible').length).toBeGreaterThan(0);
 expect(screen.queryByText('0%')).toBeNull();
 expect(screen.getByText('Datos registrados en la incidencia')).toBeTruthy();
});
it('exige motivo al corregir clasificación antes de enviar el contrato vigente',async()=>{
 montar(<DetalleOperador/>,true);
 fireEvent.change(await screen.findByLabelText('Categoría'),{target:{value:'2'}});
 const boton=screen.getByRole('button',{name:'Confirmar y derivar'});
 fireEvent.submit(boton.closest('form'));
 expect(await screen.findByText('Explica la corrección con al menos 10 caracteres.')).toBeTruthy();
 expect(servicios.revisar).not.toHaveBeenCalled();
 servicios.revisar.mockResolvedValue({});
 fireEvent.change(screen.getByLabelText('Motivo de corrección'),{target:{value:'La fotografía muestra residuos.'}});
 fireEvent.submit(boton.closest('form'));
 await waitFor(()=>expect(servicios.revisar).toHaveBeenCalledWith('r1',{categoria_id:'2',prioridad_id:'1',area_id:'1',motivo:'La fotografía muestra residuos.'}));
});
it('mantiene datos de incidencia si fallan catálogos y permite reintentarlos',async()=>{
 servicios.catalogos.mockRejectedValue(new Error('Catálogos fuera de línea'));
 montar(<DetalleOperador/>,true);
 expect(await screen.findByText('Poste deteriorado')).toBeTruthy();
 expect(screen.getByText('Catálogos fuera de línea')).toBeTruthy();
 expect(screen.getByRole('button',{name:'Reintentar catálogos'})).toBeTruthy();
 expect(screen.queryByRole('button',{name:'Confirmar y derivar'})).toBeNull();
});
it('explica un análisis IA no disponible sin fabricar sugerencias',async()=>{
 servicios.detalleOperador.mockResolvedValue({...incidencia,analisis_ia:[]});
 montar(<DetalleOperador/>,true);
 expect(await screen.findByText('No hay un análisis de IA disponible para esta incidencia.')).toBeTruthy();
});
it.each([['Derivado',true,false],['Atendido',false,true],['Cerrado',false,false]])('preserva acciones supervisor para %s',async(estado,asignar,cerrar)=>{
 servicios.detalleSupervisor.mockResolvedValue({incidencia:{...incidencia,estado},tecnicos_compatibles:[]});
 montar(<DetalleSupervisor/>,true);
 await screen.findByText('Mapa operativo');
 expect(Boolean(screen.queryByRole('button',{name:'Confirmar asignación'}))).toBe(asignar);
 expect(Boolean(screen.queryByRole('button',{name:'Aprobar cierre'}))).toBe(cerrar);
 if(asignar) {expect(screen.getByText('No hay técnicos compatibles disponibles para esta incidencia.')).toBeTruthy();expect(screen.getByRole('button',{name:'Confirmar asignación'}).disabled).toBe(true);}
});
it('explica equipo vacío y consulta de riesgos sin resultados',async()=>{
 const {unmount}=montar(<EquipoSupervisor/>);
 expect(await screen.findByText('Todavía no hay personal técnico en el equipo.')).toBeTruthy();
 unmount();montar(<ListaSupervisor tipo="riesgos"/>);
 expect(await screen.findByRole('heading',{name:'Sin incidencias en esta consulta de riesgos'})).toBeTruthy();
});
it('explica tareas vacías y mantiene historial sin enlaces',async()=>{
 const {unmount}=montar(<PanelTecnico/>);
 expect(await screen.findByRole('heading',{name:'No tienes tareas asignadas'})).toBeTruthy();
 unmount();servicios.historialTecnico.mockResolvedValue({data:[incidencia],last_page:1});
 montar(<PanelTecnico historial/>);
 await screen.findByText('Poste deteriorado');
 expect(screen.queryByRole('link',{name:/Ver detalle/})).toBeNull();
});
it('advierte impedimento sin alterar opciones ni envío técnico',async()=>{
 montar(<DetalleTecnico/>,true);
 await screen.findByText('Mapa operativo');
 fireEvent.change(screen.getByLabelText('Acción'),{target:{value:'impedido'}});
 expect(screen.getByText('El impedimento dejará la tarea en tu historial y requiere explicar el motivo.')).toBeTruthy();
 fireEvent.change(screen.getByLabelText('Comentario *'),{target:{value:'Acceso restringido al poste.'}});
 fireEvent.click(screen.getByRole('button',{name:'Registrar avance'}));
 await waitFor(()=>expect(servicios.actualizarTarea).toHaveBeenCalled());
 expect(servicios.actualizarTarea.mock.calls[0][1].get('accion')).toBe('impedido');
});
it('envía la acción visible permitida al cambiar entre tareas con estados distintos',async()=>{
 servicios.detalleTecnico.mockImplementation(id=>Promise.resolve({...incidencia,id,estado:id==='r1'?'En atención':'Asignado'}));
 servicios.actualizarTarea.mockResolvedValue({estado:'Asignado'});
 render(<MemoryRouter initialEntries={['/detalle/r1']}><Link to="/detalle/r2">Otra tarea</Link><Routes><Route path="/detalle/:id" element={<DetalleTecnico/>}/></Routes></MemoryRouter>);
 await waitFor(()=>expect(screen.getByLabelText('Acción').value).toBe('atendido'));
 fireEvent.click(screen.getByRole('link',{name:'Otra tarea'}));
 await waitFor(()=>expect(screen.getByLabelText('Acción').value).toBe('en_camino'));
 fireEvent.change(screen.getByLabelText('Comentario *'),{target:{value:'En camino al lugar de atención.'}});
 fireEvent.click(screen.getByRole('button',{name:'Registrar avance'}));
 await waitFor(()=>expect(servicios.actualizarTarea).toHaveBeenCalled());
 expect(servicios.actualizarTarea.mock.calls[0][1].get('accion')).toBe('en_camino');
});
