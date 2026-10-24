import { fecha } from '../utilidades/formato';
import './detalle-auditoria.css';

const acciones = {
  asignacion: 'Asignación de técnico', reasignacion: 'Reasignación de técnico',
  clasificacion_confirmada_y_derivada: 'Clasificación confirmada y derivada',
  clasificacion_corregida_y_derivada: 'Clasificación corregida y derivada',
  impedimento: 'Impedimento registrado', configuracion_actualizada: 'Configuración actualizada',
  clave_personal_restablecida: 'Contraseña del personal restablecida',
  devuelto_a_operador: 'Devuelta al operador', cierre_aprobado: 'Cierre aprobado',
  revision_solicitada: 'Revisión solicitada', revision_reabrir: 'Revisión: reabrir incidencia',
  revision_rechazar: 'Revisión rechazada',
};
const etiquetas = {
  area: 'Área', categoria: 'Categoría', prioridad: 'Prioridad', tecnico: 'Técnico',
  area_id: 'Área', categoria_id: 'Categoría', prioridad_id: 'Prioridad', tecnico_id: 'Técnico',
  usuario_id: 'Usuario', rol_id: 'Rol', distrito_id: 'Distrito', estado_id: 'Estado',
  motivo: 'Motivo', comentario: 'Comentario', fecha_cierre: 'Fecha de cierre',
  umbral_confianza_ia: 'Umbral de confianza IA', alertas_duplicados_activas: 'Alertas de duplicados',
};
const referencias = {
  area_id: ['areas', 'Área'], categoria_id: ['categorias', 'Categoría'],
  prioridad_id: ['prioridades', 'Prioridad'], tecnico_id: [null, 'Técnico'],
  usuario_id: [null, 'Usuario'], rol_id: ['roles', 'Rol'],
  distrito_id: ['distritos', 'Distrito'], estado_id: ['estados', 'Estado'],
};
function normalizar(clave) { return String(clave).toLowerCase(); }
function legible(texto) {
  const palabras = String(texto).replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ').trim().toLowerCase();
  return palabras ? palabras[0].toUpperCase() + palabras.slice(1) : 'Campo sin nombre';
}
export function accionAuditoria(accion) {
  if (accion == null || accion === '') return 'Acción no especificada';
  return acciones[normalizar(accion)] || legible(accion);
}

function Valor({ valor, campo = '', catalogos }) {
  if (valor == null) return <span>Sin valor</span>;
  if (Array.isArray(valor)) return valor.length
    ? <ul className="auditoria-lista">{valor.map((item, indice) => <li key={indice}><Valor valor={item} catalogos={catalogos} /></li>)}</ul>
    : <span>Sin elementos</span>;
  if (typeof valor === 'object') {
    const entradas = Object.entries(valor);
    return entradas.length ? <dl className="auditoria-campos">{entradas.map(([clave, item]) =>
      <div key={clave}><dt>{etiquetas[normalizar(clave)] || legible(clave)}</dt><dd><Valor valor={item} campo={normalizar(clave)} catalogos={catalogos} /></dd></div>)}</dl>
      : <span>Sin campos registrados</span>;
  }
  if (typeof valor === 'boolean') return <span>{valor ? 'Sí' : 'No'}</span>;
  if (campo === 'alertas_duplicados_activas' && ['true', 'false'].includes(String(valor).toLowerCase())) {
    return <span>{String(valor).toLowerCase() === 'true' ? 'Sí' : 'No'}</span>;
  }
  if (campo === 'umbral_confianza_ia' && String(valor).trim() !== '' && Number.isFinite(Number(valor))) return <span>{valor}%</span>;
  const referencia = referencias[campo] || (/^-?\d+$/.test(String(valor)) ? referencias[`${campo}_id`] : null);
  if (referencia && String(valor) !== '') {
    const [lista, etiqueta] = referencia;
    const opciones = lista && Array.isArray(catalogos?.[lista]) ? catalogos[lista] : [];
    const nombre = opciones.find(item => String(item.id) === String(valor))?.nombre;
    return <span>{nombre || `${etiqueta} #${valor}`}</span>;
  }
  if (campo === 'fecha_cierre' && !Number.isNaN(new Date(valor).getTime())) return <span>{fecha(valor)}</span>;
  return <span className="auditoria-texto">{String(valor) === '' ? 'Texto vacío' : String(valor)}</span>;
}

export function DetalleAuditoria({ detalle, catalogos }) {
  let valor = detalle;
  if (typeof detalle === 'string') {
    try { valor = JSON.parse(detalle); } catch { /* Un texto libre o JSON incompleto conserva su información original. */ }
  }
  return <div className="auditoria-detalle">{valor == null
    ? <span className="auditoria-sin-detalle">Sin detalle adicional</span>
    : <Valor valor={valor} catalogos={catalogos} />}</div>;
}
