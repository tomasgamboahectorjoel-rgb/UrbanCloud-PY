import { useRef, useState } from 'react';
import { Link } from 'react-router';
import { ArrowRight, MapPin, ScanLine, ShieldCheck, Lightbulb, Trees, Trash2, Route, Building2, Check, Camera, Users, Wrench, LayoutDashboard, ClipboardCheck } from 'lucide-react';
import { diagnostico } from '../servicios/diagnostico';
import { ImagenMarca } from '../componentes/Marca';
import { usarRevelado } from '../hooks/usarRevelado';
import './publico.css';

const claveAviso = 'urbancloud-aviso-almacenamiento';
function avisoLeido() {
  try { return localStorage.getItem(claveAviso) === 'v1'; } catch { return false; }
}
function MarcaPublica() {
  return <Link className="publico-marca" to="/" aria-label="UrbanCloud AI, inicio"><span><ImagenMarca /></span>UrbanCloud <b>AI</b></Link>;
}
function PiePublico({ abrir }) {
  return <footer className="publico-pie"><div><MarcaPublica /><p>Registro, atención y seguimiento de incidencias urbanas.</p><small>Proyecto UrbanCloud AI · Chimbote y Nuevo Chimbote</small></div><nav aria-label="Información del sitio"><Link to="/privacidad">Privacidad</Link><Link to="/terminos">Términos de uso</Link><Link to="/almacenamiento">Cookies y almacenamiento</Link><button onClick={abrir}>Preferencias de almacenamiento</button></nav></footer>;
}
function AvisoAlmacenamiento({ cerrar }) {
  const [mensaje, setMensaje] = useState('');
  function entendido() {
    try { localStorage.setItem(claveAviso, 'v1'); } catch { /* El aviso volverá a aparecer si el navegador bloquea el guardado. */ }
    cerrar();
  }
  return <section className="publico-aviso" aria-label="Almacenamiento en tu navegador">
    <div><h2>Almacenamiento en tu navegador</h2><p>La sesión utiliza cookies necesarias. El diagnóstico técnico puede guardar hasta 30 fallos localmente. No incorporamos cookies publicitarias ni analítica en este frontend.</p><Link to="/almacenamiento">Ver qué se guarda</Link><p className="publico-aviso-nota">Al pulsar «Entendido» solo recordamos que viste este aviso; no es consentimiento para rastreo.</p><p role="status">{mensaje}</p></div>
    <div className="publico-aviso-acciones"><button className="publico-boton secundario" onClick={() => { diagnostico.limpiar(); setMensaje('Historial de diagnóstico local borrado. Los nuevos fallos pueden volver a registrarse.'); }}>Borrar diagnóstico local</button><button className="publico-boton" onClick={entendido}>Entendido</button></div>
  </section>;
}
function EnvolturaPublica({ children, portada = false }) {
  const [aviso, setAviso] = useState(() => !avisoLeido());
  return <div className="publico"><a className="publico-salto" href="#contenido">Saltar al contenido</a><header className="publico-cabecera"><MarcaPublica /><nav aria-label="Navegación principal">{portada && <><a href="#como-funciona">Cómo funciona</a><a href="#plataforma">La plataforma</a><a href="#preguntas">Preguntas</a></>}<Link className="publico-acceso" to="/login">Iniciar sesión <ArrowRight size={15} aria-hidden="true" /></Link></nav></header>{children}<PiePublico abrir={() => setAviso(true)} />{aviso && <AvisoAlmacenamiento cerrar={() => setAviso(false)} />}</div>;
}
const etapas = ['Registro', 'Clasificación', 'Priorización', 'Asignación', 'Atención', 'Seguimiento', 'Cierre'];
const categorias = [[Lightbulb, 'Alumbrado', 'Postes y luminarias'], [Trash2, 'Limpieza', 'Residuos y espacios públicos'], [Route, 'Vías', 'Pistas y veredas'], [Trees, 'Parques', 'Áreas verdes y mobiliario'], [Building2, 'Infraestructura', 'Instalaciones y servicios']];
const perfiles = [[Users, 'Ciudadano', 'Reporta con fotos, descripción y ubicación; consulta el avance.'], [ClipboardCheck, 'Operador', 'Valida el reporte y revisa las sugerencias de la IA.'], [LayoutDashboard, 'Supervisor', 'Organiza la atención y supervisa al equipo.'], [Wrench, 'Personal técnico', 'Atiende tareas y registra evidencias del trabajo.'], [ShieldCheck, 'Administrador', 'Gestiona usuarios y la configuración de la plataforma.']];

function PlanoBarrio() {
  return <div className="publico-mapa-dibujo" aria-hidden="true"><svg className="publico-plano" viewBox="0 0 440 190" fill="none">
    <path fill="#e8e6de" d="M0 0h440v190H0z" />
    <g fill="#f6f4ee" stroke="#d5d5cd" strokeWidth="1"><path d="M14 12h78v45H14zM110 12h72v45h-72zM201 12h99v45h-99zM322 12h103v45H322zM14 84h78v86H14zM110 84h72v86h-72zM322 84h103v35H322zM322 138h103v32H322z" /></g>
    <path d="M201 84h99v86h-99z" fill="#cfddd0" stroke="#aec4b3" />
    <path d="M250 87v80m-46-40h93" stroke="#eaf0e5" strokeWidth="7" />
    <g fill="#92b39c"><circle cx="218" cy="103" r="7" /><circle cx="280" cy="103" r="7" /><circle cx="218" cy="151" r="7" /><circle cx="280" cy="151" r="7" /></g>
    <path d="M0 70h440M101 0v190M312 0v190" stroke="#fbfaf6" strokeWidth="13" />
    <path d="M0 70h440" stroke="#bfc7c4" strokeDasharray="5 6" />
    <g fill="#5e716b" fontSize="8" fontFamily="Arial, sans-serif" letterSpacing="1"><text x="158" y="72">PASAJE DEL PARQUE</text><text x="225" y="121">PLAZA</text><text x="225" y="140">VECINAL</text><text x="24" y="160">MANZANA A</text><text x="338" y="160">MANZANA B</text></g>
    <path d="M403 22v23m-5-16 5-7 5 7" stroke="#536b65" strokeWidth="1.5" /><text x="399" y="17" fill="#536b65" fontSize="8" fontFamily="Arial, sans-serif">N</text>
    <circle cx="312" cy="70" r="23" fill="#2261df" fillOpacity=".1" /><circle cx="312" cy="70" r="14" fill="#2261df" stroke="white" strokeWidth="3" /><path d="M312 61v11m0 4v1" stroke="white" strokeWidth="2" strokeLinecap="round" />
    <path d="M16 182h40m-40-3v6m40-6v6" stroke="#536b65" /><text x="64" y="185" fill="#536b65" fontSize="8" fontFamily="Arial, sans-serif">ESQUEMA · SIN ESCALA</text>
  </svg></div>;
}

export function Portada() {
  const contenido = useRef(null);
  usarRevelado(contenido);
  return <EnvolturaPublica portada><main id="contenido" ref={contenido}>
    <section className="publico-hero"><div className="publico-hero-texto"><span className="publico-etiqueta"><span />GESTIÓN URBANA INTELIGENTE</span><h1>Una ciudad mejor empieza <em>con tu reporte.</em></h1><p>Una luminaria dañada, residuos en la vía o una vereda deteriorada. Registra el problema con fotos y ubicación, y consulta cómo avanza su atención.</p><div className="publico-acciones"><Link className="publico-boton" to="/registro">Reportar una incidencia <ArrowRight size={18} aria-hidden="true" /></Link><Link className="publico-boton secundario" to="/registro">Crear cuenta</Link></div><div className="publico-hero-detalles"><span><Camera size={17} aria-hidden="true" /> Texto y fotografías</span><span><MapPin size={17} aria-hidden="true" /> Ubicación del problema</span></div></div>
    <div className="publico-demo"><div className="publico-demo-barra"><span><span className="publico-punto" /> CUADERNO DE INCIDENCIAS</span><span>UrbanCloud AI</span></div><PlanoBarrio /><div className="publico-reporte"><div className="publico-reporte-titulo"><span className="publico-icono"><Lightbulb size={24} aria-hidden="true" /></span><div><small>ALUMBRADO PÚBLICO</small><h2>Luminaria deteriorada</h2></div></div><p>«El poste de la esquina está dañado y la calle queda sin iluminación».</p><div className="publico-ia-etiqueta"><ScanLine size={17} aria-hidden="true" /> IA: sugerencia pendiente de revisión</div><dl><div><dt>Prioridad sugerida</dt><dd>Alta</dd></div><div><dt>Área sugerida</dt><dd>Alumbrado</dd></div></dl><div className="publico-revision"><ShieldCheck size={16} aria-hidden="true" /> Un operador valida antes de derivar.</div></div><small className="publico-ejemplo">Ejemplo ilustrativo · no es un reporte real</small></div></section>
    <div className="publico-organizaciones"><span>UNA HERRAMIENTA PARA EQUIPOS RESPONSABLES</span><p>Municipalidades <i>·</i> Universidades <i>·</i> Condominios <i>·</i> Organizaciones</p></div>
    <section className="publico-seccion" id="como-funciona"><div className="publico-seccion-cabecera"><span className="publico-kicker">DEL AVISO A LA ACCIÓN</span><h2>Cada incidencia, un camino claro.</h2><p>Un solo lugar para registrar, organizar y consultar lo que sucede con cada reporte.</p></div><div className="publico-tres"><article><span className="publico-numero">01</span><h3>Muéstranos qué ocurre</h3><p>Describe el problema, añade fotografías y señala su ubicación. Evita incluir rostros, placas u otros datos personales innecesarios.</p></article><article><span className="publico-numero">02</span><h3>La IA orienta. El equipo decide.</h3><p>El análisis de texto e imagen sugiere clasificación, prioridad y área responsable. Un operador revisa la propuesta.</p></article><article><span className="publico-numero">03</span><h3>Acompaña el avance</h3><p>Consulta el estado y el seguimiento mientras el equipo responsable gestiona la atención y documenta el cierre.</p></article></div><ol className="publico-ciclo" aria-label="Ciclo de la incidencia">{etapas.map((etapa, indice) => <li key={etapa}><span>{String(indice + 1).padStart(2, '0')}</span>{etapa}</li>)}</ol></section>
    <section className="publico-seccion publico-fondo" id="plataforma"><div className="publico-seccion-cabecera"><span className="publico-kicker">INFRAESTRUCTURA Y SERVICIOS</span><h2>¿Qué ocurre en tu entorno?</h2><p>Registra incidencias de infraestructura y servicios con el contexto que el equipo necesita.</p></div><div className="publico-categorias">{categorias.map(([Icono, titulo, texto]) => <article key={titulo}><Icono size={27} aria-hidden="true" /><h3>{titulo}</h3><p>{texto}</p></article>)}</div><div className="publico-ia"><div><span className="publico-kicker">INTELIGENCIA ARTIFICIAL CON CRITERIO HUMANO</span><h2>Texto e imagen.<br />Revisión del operador.</h2><p>UrbanCloud AI analiza la descripción y las imágenes conjuntamente. Sus resultados son sugerencias: pueden contener errores y necesitan revisión humana.</p></div><ul>{['Clasificación por tipo de incidencia', 'Prioridad preliminar según el reporte', 'Sugerencia de una sola área responsable', 'Validación del operador antes de la derivación'].map(texto => <li key={texto}><Check size={19} aria-hidden="true" />{texto}</li>)}</ul></div></section>
    <section className="publico-seccion"><div className="publico-seccion-cabecera"><span className="publico-kicker">CINCO PERFILES, RESPONSABILIDADES DISTINTAS</span><h2>Cada persona tiene un papel.</h2><p>Responsabilidades claras para coordinar el ciclo completo de atención.</p></div><div className="publico-perfiles">{perfiles.map(([Icono, titulo, texto]) => <article key={titulo}><Icono size={24} aria-hidden="true" /><h3>{titulo}</h3><p>{texto}</p></article>)}</div></section>
    <section className="publico-seccion publico-preguntas" id="preguntas"><div><span className="publico-kicker">ANTES DE EMPEZAR</span><h2>¿Tienes preguntas?</h2><p>Lo importante, sin letra pequeña.</p></div><div>{[['¿Qué necesito para reportar?', 'Crea una cuenta e inicia sesión. Describe la incidencia y aporta ubicación y fotografías que ayuden a entenderla.'], ['¿La inteligencia artificial decide por sí sola?', 'No. La IA sugiere una clasificación, prioridad y área. El operador revisa el análisis y toma la decisión antes de derivar.'], ['¿Reportar garantiza una reparación?', 'No. El registro facilita la gestión interna; los tiempos y la atención dependen de la organización responsable y sus recursos. No sustituye los canales de emergencia.'], ['¿Cómo cuido mi privacidad al subir una foto?', 'Evita imágenes de personas identificables, placas, domicilios o documentos que no sean necesarios. Revisa la foto y la ubicación antes de enviarlas.']].map(([pregunta, respuesta]) => <details key={pregunta}><summary>{pregunta}</summary><p>{respuesta}</p></details>)}</div></section>
    <section className="publico-cta"><span className="publico-kicker">DEL REPORTE AL SEGUIMIENTO</span><h2>¿Encontraste un problema en tu entorno?</h2><p>Crea tu cuenta, registra la incidencia y consulta su estado.</p><Link className="publico-boton" to="/registro">Reportar una incidencia <ArrowRight size={18} aria-hidden="true" /></Link><small>¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link></small></section>
  </main></EnvolturaPublica>;
}

const documentos = {
  privacidad: { titulo: 'Privacidad', intro: 'Entiende qué información interviene al usar UrbanCloud AI.', secciones: [
    ['Información de cuenta y reportes', 'El registro solicita nombre, correo y contraseña. Las incidencias incluyen descripción, fotografías y ubicación, además de los datos de seguimiento generados durante su gestión.'],
    ['Uso de la información', 'Los datos permiten gestionar la cuenta y el ciclo de la incidencia. El texto y las imágenes se usan para el análisis de IA que orienta al operador. Evita enviar datos sensibles o información de terceros que no sea necesaria.'],
    ['Acceso y revisión humana', 'La plataforma diferencia permisos para ciudadano, operador, supervisor, personal técnico y administrador. Los resultados de IA requieren revisión humana; no garantizan exactitud.'],
    ['Información pendiente de definir', 'Antes de un despliegue público, la organización deberá identificar al responsable del tratamiento, sus canales de contacto, proveedores de IA, posibles transferencias, plazos de conservación y mecanismos para ejercer derechos. Este prototipo no define ni acredita esas condiciones.'],
  ] },
  terminos: { titulo: 'Términos de uso', intro: 'Orientaciones para un uso responsable de la plataforma.', secciones: [
    ['Finalidad', 'UrbanCloud AI facilita el registro y la gestión de incidencias urbanas por organizaciones responsables de infraestructura y servicios. No es un servicio de emergencias. Ante un peligro inmediato utiliza los canales oficiales de tu localidad.'],
    ['Responsabilidad al reportar', 'Aporta información veraz y pertinente. No adjuntes contenido ilícito, ofensivo ni datos personales innecesarios. Cuida tus credenciales y no compartas acceso a tu cuenta.'],
    ['Alcance del servicio y de la IA', 'El envío de un reporte no garantiza reparación ni plazo de atención. La organización gestiona la asignación y atención según sus competencias y recursos. La IA puede equivocarse: sus sugerencias deben ser revisadas por un operador.'],
    ['Condiciones pendientes', 'El responsable del servicio deberá revisar y publicar condiciones definitivas de disponibilidad, soporte, responsabilidades y resolución de solicitudes antes de un lanzamiento público. Este texto no constituye una validación jurídica.'],
  ] },
  almacenamiento: { titulo: 'Cookies y almacenamiento', intro: 'Información basada en el funcionamiento actual del frontend.', secciones: [
    ['Cookies necesarias de sesión', 'Las solicitudes a la API incluyen credenciales para mantener la sesión y aplicar la seguridad de acceso. Esta interfaz no administra ni permite desactivar esas cookies: su configuración y duración dependen del servidor. Puedes borrarlas desde el navegador, lo que puede cerrar tu sesión.'],
    ['Diagnóstico local', 'Cuando está habilitado, urbancloud-diagnostico guarda en localStorage los últimos 30 fallos técnicos, que pueden incluir rutas de solicitudes, mensajes y códigos de respuesta. No se envía como analítica desde este frontend. El historial puede persistir hasta que se borre; no tiene caducidad automática.'],
    ['Preferencia del aviso', 'urbancloud-aviso-almacenamiento guarda el valor v1 en localStorage para recordar que viste el aviso. Puedes volver a abrirlo desde el pie de página. Este dato no habilita publicidad ni seguimiento y no caduca automáticamente.'],
    ['Tus controles', 'El botón «Borrar diagnóstico local» vacía el historial existente, pero no desactiva el registro de nuevos fallos. Para borrar también la preferencia del aviso, utiliza los controles de datos del sitio en tu navegador. No hemos incorporado herramientas publicitarias ni de analítica en este frontend; los servicios externos que se configuren deben evaluarse antes de publicar.'],
  ] },
};
export function InformacionPublica({ tipo }) {
  const documento = documentos[tipo];
  return <EnvolturaPublica><main id="contenido" className="publico-documento"><Link to="/">Volver al inicio</Link><span className="publico-kicker">INFORMACIÓN DEL PROYECTO</span><h1>{documento.titulo}</h1><p className="publico-documento-intro">{documento.intro}</p><aside>Contenido provisional para el prototipo. Requiere revisión y aprobación de la organización responsable antes de su publicación definitiva.</aside>{documento.secciones.map(([titulo, texto]) => <section key={titulo}><h2>{titulo}</h2><p>{texto}</p></section>)}</main></EnvolturaPublica>;
}

