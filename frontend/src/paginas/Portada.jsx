import { useEffect, useRef, useState } from 'react';
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router';
import { rutasPorRol, usarSesion } from '../contexto/Sesion';
import { LogoMarca } from '../componentes/LogoMarca';
import '../estilos/portada.css';
import '../estilos/portada-ajustes.css';

const documentos = {
  'Privacidad': (
    <>
      <p>UrbanCloud AI es una plataforma web para registrar y dar seguimiento a incidencias urbanas en Chimbote y Nuevo Chimbote.</p>
      <h3>Responsable del tratamiento</h3>
      <p>El responsable es el equipo desarrollador de UrbanCloud AI, estudiantes de la Universidad Nacional del Santa (UNS). Para consultas sobre privacidad o el tratamiento de datos, puedes escribir a urbancloudai@gmail.com.</p>
      <h3>Información que utilizamos</h3>
      <p>Al crear una cuenta podemos solicitar tu nombre y correo electrónico. La contraseña se almacena protegida mediante mecanismos de seguridad. Al registrar una incidencia, puedes proporcionar su título, descripción, distrito, dirección o referencia, ubicación en el mapa y fotografías de evidencia.</p>
      <p>Si eliges “Usar mi ubicación”, el navegador solicitará permiso para acceder a la ubicación de tu dispositivo. También puedes ubicar el incidente manualmente en el mapa. La ubicación del incidente corresponde al lugar que reportas y puede ser distinta de tu ubicación actual.</p>
      <h3>Para qué utilizamos la información</h3>
      <p>Utilizamos los datos para crear y proteger cuentas, registrar y gestionar incidencias, revisar la evidencia, proponer una clasificación inicial con ayuda de inteligencia artificial, asignar tareas al personal autorizado, actualizar el estado del reporte y enviar mensajes relacionados con la cuenta o la incidencia.</p>
      <p>La inteligencia artificial puede ayudar a analizar una incidencia, pero sus resultados son sugerencias sujetas a revisión por el personal responsable.</p>
      <h3>Acceso y proveedores</h3>
      <p>El acceso a la información de los reportes se limita a las personas autorizadas que participan en su revisión y atención. UrbanCloud utiliza proveedores tecnológicos para alojar y procesar información, entre ellos Supabase para los servicios de datos y almacenamiento, y Resend para el envío de correos. Estos proveedores procesan información necesaria para prestar sus servicios.</p>
      <h3>Conservación de la información</h3>
      <p>Conservamos la información mientras sea necesaria para mantener la cuenta, gestionar las incidencias y mantener el historial de atención. Cuando deje de ser necesaria, podrá eliminarse o anonimizarse, salvo que exista una razón válida para conservarla por más tiempo.</p>
      <h3>Tus consultas y solicitudes</h3>
      <p>Puedes escribir a urbancloudai@gmail.com para consultar sobre tus datos o solicitar su actualización o eliminación. Para proteger tu cuenta, podremos pedirte información que permita verificar tu identidad.</p>
    </>
  ),
  'Términos de uso': (
    <>
      <p>Al crear una cuenta o utilizar UrbanCloud AI, aceptas estos términos.</p>
      <p>UrbanCloud AI permite registrar incidencias urbanas, adjuntar evidencia, indicar su ubicación y consultar el estado de los reportes. La plataforma también ayuda al personal autorizado a revisar, clasificar, asignar y dar seguimiento a los casos.</p>
      <h3>Uso responsable</h3>
      <p>Debes proporcionar información veraz y relacionada con una incidencia urbana. No utilices la plataforma para enviar reportes deliberadamente falsos, contenido ilegal, material ofensivo o información de otras personas que no sea necesaria para describir el problema.</p>
      <p>Antes de adjuntar una fotografía, revisa que sea pertinente para el reporte y que no exponga innecesariamente información personal de terceros.</p>
      <h3>Ubicación y fotografías</h3>
      <p>La ubicación que indiques debe corresponder, en lo posible, al lugar de la incidencia. Puedes colocar o mover el pin manualmente. La función de ubicación actual requiere que concedas permiso al navegador y puede variar en precisión según el dispositivo y su conexión.</p>
      <h3>Revisión de reportes</h3>
      <p>La inteligencia artificial puede analizar la información y sugerir una categoría o prioridad. Estas sugerencias no representan una decisión definitiva: el personal autorizado revisa y gestiona los reportes. El envío de un reporte no garantiza que sea aceptado, que se atienda ni que se resuelva dentro de un plazo determinado.</p>
      <h3>Emergencias</h3>
      <p>UrbanCloud AI no es un servicio de emergencias. Si existe un peligro inmediato para una persona o la comunidad, comunícate directamente con las autoridades o servicios de emergencia correspondientes.</p>
      <h3>Disponibilidad y cambios</h3>
      <p>La plataforma puede actualizarse para corregir errores, mejorar funciones o realizar tareas de mantenimiento. El equipo procurará comunicar los cambios relevantes dentro de la aplicación.</p>
      <p>Si tienes consultas sobre estos términos, escribe a urbancloudai@gmail.com.</p>
    </>
  ),
  'Cookies y almacenamiento': (
    <>
      <p>UrbanCloud AI puede utilizar cookies o almacenamiento local estrictamente necesarios para mantener la sesión, proteger la cuenta y permitir el funcionamiento de la plataforma.</p>
      <p>Estas tecnologías no se utilizan para publicidad. Si en el futuro se incorporan herramientas opcionales de analítica o seguimiento, esta página se actualizará y podrás revisar las opciones disponibles en Preferencias de almacenamiento.</p>
    </>
  ),
  'Preferencias de almacenamiento': (
    <>
      <h3>Configuración de almacenamiento</h3>
      <p>Las tecnologías necesarias para iniciar sesión, proteger tu cuenta y utilizar las funciones de UrbanCloud AI siempre están activas.</p>
      <h3>Almacenamiento necesario</h3>
      <p>Permite mantener la sesión y aplicar medidas de seguridad. No se puede desactivar desde esta pantalla porque la plataforma lo necesita para funcionar.</p>
      <div className="lp-necessary-row"><span>Almacenamiento necesario</span><span className="lp-necessary-badge" aria-label="Siempre activo">Siempre activo</span></div>
    </>
  ),
};

const pasosRecorrido = [
  ['01', '◎', 'Cuéntanos qué pasa', 'Describe el problema y añade una referencia que ayude a reconocer el lugar.', 'Comienza tu reporte'],
  ['02', '⌕', 'Revisa casos cercanos', 'Si alguien ya reportó algo parecido, puedes conocer ese caso y seguir su avance. También puedes enviar el tuyo.', 'Antes de enviarlo'],
  ['03', '✳', 'Añade una fotografía', 'Una imagen y la ubicación ayudan a mostrar con claridad lo que ocurre. La IA puede ayudar a organizar esa información.', 'Haz visible el problema'],
  ['04', '↗', 'Sigue la atención', 'Una persona especializada revisará el reporte. Podrás consultar el estado y los avances registrados.', 'Consulta tu caso'],
  ['05', '✓', 'Conoce el resultado', 'Revisa el historial, las notificaciones y cómo se atendió la incidencia. Si es necesario, puedes solicitar una revisión motivada después del cierre.', 'Mantente informado'],
];

/** Portada pública. Los diálogos de acceso (login, registro, recuperación) se muestran encima, como hijos. */
export function Portada({ children }) {
  const navegar = useNavigate();
  const raiz = useRef(null);
  const barra = useRef(null);
  const [menuAbierto, establecerMenuAbierto] = useState(false);
  const [info, establecerInfo] = useState(null);
  const cerrarInfo = useRef(null);
  const origenInfo = useRef(null);

  const irLogin = () => navegar('/login');
  const irRegistro = () => navegar('/registro');

  useEffect(() => {
    const elementos = raiz.current?.querySelectorAll('.lp-reveal') ?? [];
    if (typeof IntersectionObserver === 'undefined') {
      elementos.forEach((el) => el.classList.add('lp-visible'));
      return undefined;
    }
    const observador = new IntersectionObserver((entradas) => entradas.forEach((entrada) => {
      if (entrada.isIntersecting) {
        entrada.target.classList.add('lp-visible');
        observador.unobserve(entrada.target);
      }
    }), { threshold: 0.12 });
    elementos.forEach((el) => observador.observe(el));
    return () => observador.disconnect();
  }, []);

  useEffect(() => {
    const reducido = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    let pendiente = false;
    function actualizar() {
      barra.current?.classList.toggle('lp-scrolled', window.scrollY > 16);
      const collage = raiz.current?.querySelector('.lp-collage');
      if (!reducido && collage) {
        const caja = collage.getBoundingClientRect();
        const avance = Math.max(0, Math.min(1, -caja.top / (caja.height - window.innerHeight || 1)));
        collage.querySelectorAll('[data-parallax]').forEach((el) => {
          el.style.translate = `0 ${(avance - 0.5) * Number(el.dataset.parallax) * 2}px`;
        });
      }
      pendiente = false;
    }
    function alDesplazar() {
      if (!pendiente) { pendiente = true; requestAnimationFrame(actualizar); }
    }
    window.addEventListener('scroll', alDesplazar, { passive: true });
    actualizar();
    return () => window.removeEventListener('scroll', alDesplazar);
  }, []);

  useEffect(() => {
    if (!info) return undefined;
    document.body.style.overflow = 'hidden';
    cerrarInfo.current?.focus();
    return () => { document.body.style.overflow = ''; };
  }, [info]);

  function abrirInfo(titulo) {
    origenInfo.current = document.activeElement;
    establecerInfo(titulo);
  }

  function cerrar() {
    establecerInfo(null);
    origenInfo.current?.focus?.();
  }

  useEffect(() => {
    if (!info) return undefined;
    function alTeclear(evento) { if (evento.key === 'Escape') cerrar(); }
    window.addEventListener('keydown', alTeclear);
    return () => window.removeEventListener('keydown', alTeclear);
  }, [info]);

  return (
    <div className="lp-root" ref={raiz}>
      <header className="lp-topbar" ref={barra}>
        <div className="lp-wrap lp-nav">
          <a className="lp-brand" href="#inicio"><LogoMarca alt="Logo UrbanCloud AI" /><span>UrbanCloud <span>AI</span></span></a>
          <nav className={`lp-navlinks${menuAbierto ? ' lp-open' : ''}`} aria-label="Navegación principal">
            {[['#donde', 'Dónde puedes utilizarlo'], ['#recorrido', 'Cómo se atiende'], ['#ia', 'Cómo ayuda la IA']].map(([destino, texto]) =>
              <a key={destino} href={destino} onClick={() => establecerMenuAbierto(false)}>{texto}</a>)}
          </nav>
          <div className="lp-navright">
            <button type="button" className="lp-text-btn" onClick={irLogin}>Iniciar sesión</button>
            <button type="button" className="lp-btn lp-btn-dark" onClick={irRegistro}>Crear cuenta <span aria-hidden="true">↗</span></button>
            <button type="button" className="lp-menu" aria-label="Abrir menú" aria-expanded={menuAbierto}
              onClick={() => establecerMenuAbierto(!menuAbierto)}>☰</button>
          </div>
        </div>
      </header>

      <main>
        <section className="lp-hero" id="inicio">
          <div className="lp-wrap">
            <LogoMarca className="lp-hero-logo" />
            <h1>¿Ves basura acumulada<br /><em>en tu barrio?</em></h1>
            <p className="lp-hero-copy">Repórtala con una foto y su ubicación. Consulta el avance mientras el equipo responsable revisa y atiende el caso.</p>
            <div className="lp-hero-actions">
              <button type="button" className="lp-btn lp-btn-blue" onClick={irRegistro}>Crear una cuenta <span aria-hidden="true">→</span></button>
              <button type="button" className="lp-btn lp-btn-light" onClick={irLogin}>Iniciar sesión</button>
            </div>
            <p className="lp-hero-note">Cada caso queda registrado para que puedas consultar su avance.</p>
          </div>
          <div className="lp-hero-stage">
            <div className="lp-stage-grid" />
            <span className="lp-stage-label">Una ciudad que se observa y se cuida</span>
            <img className="lp-stage-photo" src="/ejemplo-incidencia.jpg" alt="Acumulación de residuos en una calle de Chimbote" />
            <span className="lp-photo-tag">EJEMPLO DE INCIDENCIA</span>
            <article className="lp-incident-card">
              <div className="lp-incident-kicker"><span>Reporte de incidencia</span><span>Chimbote</span></div>
              <h2>Acumulación de residuos</h2>
              <p>Una imagen ayuda a describir el problema y orientar su ubicación.</p>
              <div className="lp-incident-bottom"><span><i className="lp-mini-dot" /> Un problema de nuestro entorno que podemos reportar</span></div>
            </article>
          </div>
        </section>

        <section className="lp-intro">
          <div className="lp-wrap lp-reveal"><p>Del problema que ves en la calle <span>al caso que puedes seguir.</span></p></div>
        </section>

        <section className="lp-collage" aria-label="UrbanCloud AI conecta evidencia y seguimiento">
          <div className="lp-collage-inner">
            <LogoMarca className="lp-collage-logo" alt="UrbanCloud AI" />
            <div className="lp-float-card lp-float-one" data-parallax="-65"><img src="/ejemplo-incidencia.jpg" alt="Basura acumulada en la vía pública" /></div>
            <div className="lp-float-card lp-float-two" data-parallax="55"><b>01 · OBSERVA</b>¿Ves basura acumulada en tu barrio?</div>
            <div className="lp-float-card lp-float-three" data-parallax="75"><strong>Fotografía adjunta</strong><span>Una imagen ayuda a describir el problema.</span></div>
            <div className="lp-float-card lp-float-four" data-parallax="-55"><b>02 · DA SEGUIMIENTO</b>Cada caso queda registrado para que puedas consultar su avance.</div>
            <span className="lp-collage-caption">Desplázate para conocer el proceso ↓</span>
          </div>
        </section>

        <section className="lp-section lp-availability" id="donde">
          <div className="lp-wrap lp-availability-grid">
            <div className="lp-reveal">
              <span className="lp-eyebrow">Dónde puedes utilizarlo</span>
              <h2>Chimbote y<br />Nuevo Chimbote.</h2>
              <p>Si encuentras basura acumulada en tu barrio o en una calle de la ciudad, puedes registrarla con una fotografía y su ubicación. UrbanCloud AI te permite consultar el avance de tu reporte desde un mismo lugar.</p>
              <button type="button" className="lp-btn lp-btn-blue" onClick={irRegistro}>Crear una cuenta <span aria-hidden="true">→</span></button>
            </div>
            <div className="lp-availability-card lp-reveal">
              <div className="lp-availability-top"><span>NUESTRAS ZONAS</span><span className="lp-mini-dot" /></div>
              <div className="lp-availability-place">Chimbote <span>↗</span></div>
              <div className="lp-availability-place">Nuevo Chimbote <span>↗</span></div>
              <p>Observa tu entorno. Comparte la evidencia. Sigue tu caso.</p>
            </div>
          </div>
        </section>

        <section className="lp-section lp-journey" id="recorrido">
          <div className="lp-wrap">
            <div className="lp-section-head lp-reveal">
              <span className="lp-eyebrow">Del reporte a la atención</span>
              <h2>Reportar lo que ves puede ser muy sencillo.</h2>
              <p>Comparte el problema con una foto y su ubicación. Después podrás consultar cómo avanza la atención de tu caso.</p>
            </div>
            <div className="lp-flow-grid">
              {pasosRecorrido.map(([numero, icono, titulo, texto, nota]) => (
                <article className="lp-flow-card lp-reveal" key={numero}>
                  <span className="lp-flow-number">{numero}</span>
                  <div className="lp-flow-icon" aria-hidden="true">{icono}</div>
                  <h3>{titulo}</h3>
                  <p>{texto}</p>
                  <small>{nota}</small>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="lp-section lp-example">
          <div className="lp-wrap lp-example-grid">
            <div className="lp-example-photo lp-reveal">
              <img src="/ejemplo-incidencia.jpg" alt="Fotografía referencial de residuos acumulados en Chimbote" />
              <span>Ejemplo de incidencia · Chimbote</span>
            </div>
            <div className="lp-example-copy lp-reveal">
              <span className="lp-eyebrow">La evidencia da contexto</span>
              <h2>Una foto puede iniciar el cambio.</h2>
              <p>Acumulación de residuos</p>
              <p>Una imagen ayuda a describir el problema y orientar su ubicación.</p>
              <div className="lp-case-note"><i /><span>Casos como este se repiten en Chimbote. Reportarlos ayuda a visibilizar el problema y dar seguimiento a su atención.</span></div>
            </div>
          </div>
        </section>

        <section className="lp-section lp-review" id="ia">
          <div className="lp-wrap">
            <span className="lp-eyebrow">Cómo ayuda la IA</span>
            <h2 className="lp-reveal">Tu fotografía ayuda a contar lo que sucede.</h2>
            <p className="lp-review-lead lp-reveal">Al adjuntar una foto y describir la incidencia, la inteligencia artificial ayuda a identificar el tipo de problema y a organizar la información de tu reporte. Así resulta más fácil comprender lo que ocurre y darle seguimiento.</p>
            <div className="lp-review-grid">
              <div className="lp-review-card lp-reveal"><strong>Una ayuda para entender la imagen.</strong><br />La IA puede sugerir una categoría y señalar si el caso necesita más atención. Sus sugerencias se revisan y pueden corregirse.</div>
              <div className="lp-review-card lp-reveal"><strong>Una persona atiende el caso.</strong><br />Una persona especializada revisará tu reporte y la evidencia antes de continuar con la atención. Podrás consultar los avances y, después del cierre, solicitar una revisión motivada si es necesario.</div>
            </div>
          </div>
        </section>

        <section className="lp-closing">
          <div className="lp-wrap lp-reveal">
            <h2>¿Tienes una incidencia que reportar?</h2>
            <p>Regístrala con evidencia y consulta cómo avanza su atención.</p>
            <div className="lp-closing-actions">
              <button type="button" className="lp-btn lp-btn-blue" onClick={irRegistro}>Crear una cuenta</button>
              <button type="button" className="lp-btn lp-btn-light" onClick={irLogin}>Iniciar sesión</button>
            </div>
          </div>
        </section>
      </main>

      <footer className="lp-footer">
        <div className="lp-wrap">
          <div className="lp-footer-grid">
            <div className="lp-footer-brand">
              <a className="lp-brand" href="#inicio"><LogoMarca /><span>UrbanCloud <span>AI</span></span></a>
              <p>Registro, atención y seguimiento de incidencias urbanas.</p>
              <p>Proyecto UrbanCloud AI · Chimbote y Nuevo Chimbote</p>
            </div>
            <nav className="lp-footer-links" aria-label="Información del servicio">
              {Object.keys(documentos).map((titulo) =>
                <button type="button" key={titulo} onClick={() => abrirInfo(titulo)}>{titulo}</button>)}
            </nav>
          </div>
          <div className="lp-footer-bottom"><span>© UrbanCloud AI</span><span>Servicio de reporte y seguimiento</span></div>
        </div>
      </footer>

      {info && (
        <div className="lp-overlay lp-open" onClick={(evento) => { if (evento.target === evento.currentTarget) cerrar(); }}>
          <section className="lp-dialog lp-legal-dialog" role="dialog" aria-modal="true" aria-labelledby="lp-info-titulo">
            <button type="button" className="lp-close" aria-label="Cerrar" ref={cerrarInfo} onClick={cerrar}>×</button>
            <div className="lp-dialog-brand"><LogoMarca /><span>UrbanCloud AI</span></div>
            <h2 id="lp-info-titulo">{info === 'Privacidad' ? 'Política de privacidad' : info}</h2>
            <div className="lp-legal-content">{documentos[info]}</div>
            <div className="lp-legal-bottom"><button type="button" className="lp-btn lp-btn-dark" onClick={cerrar}>Cerrar</button></div>
          </section>
        </div>
      )}

      {children}
    </div>
  );
}

const rutasDeAcceso = ['/', '/login', '/registro'];

/** Mantiene la portada montada mientras cambian los diálogos. Conserva el comportamiento previo de sesión. */
export function LayoutPortada() {
  const { usuario, cargando } = usarSesion();
  const ubicacion = useLocation();
  const esAcceso = rutasDeAcceso.includes(ubicacion.pathname);
  if (esAcceso && cargando) return <div className="estado-panel pantalla-carga" role="status">Cargando UrbanCloud AI…</div>;
  if (esAcceso && usuario) return <Navigate to={rutasPorRol[usuario.rol]} replace />;
  return <Portada><Outlet /></Portada>;
}
