import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import {
  ArrowLeft, ArrowRight, Check, CircleCheck, Eye, EyeOff, LockKeyhole,
  Mail, MapPin, ShieldCheck, UserRound,
} from 'lucide-react';
import { rutasPorRol, usarSesion } from '../contexto/Sesion';
import { Aviso } from '../componentes/Estado';

const correoValido = /^[A-Za-z0-9_+%-]+(?:\.[A-Za-z0-9_+%-]+)*@(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,63}$/i;

function MarcaAcceso() {
  return (
    <div className="acceso-marca-interior">
      <div className="acceso-emblema" aria-hidden="true"><MapPin size={25} strokeWidth={2.2} /></div>
      <div className="acceso-identidad">UrbanCloud <b>AI</b></div>
    </div>
  );
}

function CampoCorreo({ id, valor, alCambiar }) {
  return (
    <div className="campo-acceso">
      <label htmlFor={id}>Correo</label>
      <div className="control-acceso control-correo">
        <Mail size={17} aria-hidden="true" />
        <input id={id} name="correo" type="email" required autoComplete="email"
          value={valor} onChange={(evento) => alCambiar(evento.target.value)}
          placeholder="juan.perez@gmail.com"
          spellCheck="false" autoCapitalize="none" />
      </div>
    </div>
  );
}

function CampoClave({ id, etiqueta, valor, alCambiar, confirmacion = false }) {
  const [visible, establecerVisible] = useState(false);
  return (
    <div className="campo-acceso">
      <label htmlFor={id}>{etiqueta}</label>
      <div className="control-acceso">
        {confirmacion ? <ShieldCheck size={17} aria-hidden="true" />
          : <LockKeyhole size={17} aria-hidden="true" />}
        <input id={id} name={confirmacion ? 'confirmacion' : 'clave'}
          type={visible ? 'text' : 'password'} required minLength={confirmacion ? undefined : 8}
          autoComplete={id === 'ingreso-clave' ? 'current-password' : 'new-password'}
          value={valor} onChange={(evento) => alCambiar(evento.target.value)}
          placeholder={confirmacion ? 'Repite tu contraseña' : '••••••••'} />
        <button type="button" className="control-acceso-ojo"
          aria-label={`${visible ? 'Ocultar' : 'Mostrar'} ${confirmacion ? 'confirmación de contraseña' : 'contraseña'}`}
          onClick={() => establecerVisible(!visible)}>
          {visible ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
        </button>
      </div>
    </div>
  );
}

function EtapasRegistro({ paso }) {
  const etapas = ['Datos', 'Contraseña', 'Confirmar'];
  return (
    <div className="etapas-registro" aria-label={`Registro, paso ${paso} de 3`}>
      {etapas.map((etapa, indice) => (
        <div className={`etapa-registro${paso === indice + 1 ? ' actual' : ''}${paso > indice + 1 ? ' completa' : ''}`}
          key={etapa}>
          <span className="etapa-circulo" aria-hidden="true">
            {paso > indice + 1 ? <Check size={14} /> : indice + 1}
          </span>
          <span className="etapa-nombre">{etapa}</span>
        </div>
      ))}
    </div>
  );
}

function IndicadoresClave({ clave }) {
  const reglas = [
    ['Mínimo 8 caracteres', clave.length >= 8],
    ['Una mayúscula', /[A-Z]/.test(clave)],
    ['Un número', /[0-9]/.test(clave)],
    ['Un símbolo (recomendado)', /[^A-Za-z0-9]/.test(clave)],
  ];
  const nivel = reglas.filter(([, cumple]) => cumple).length;
  return (
    <div className="ayuda-clave">
      <div className="acceso-fortaleza" aria-hidden="true">
        {[1, 2, 3, 4].map((segmento) =>
          <span key={segmento} className={segmento <= nivel ? 'activo' : ''} />)}
      </div>
      <ul>
        {reglas.map(([texto, cumple]) => (
          <li className={cumple ? 'cumple' : ''} key={texto}>
            <CircleCheck size={14} aria-hidden="true" />{texto}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function PaginaAcceso({ registro = false }) {
  const { iniciar, registrar } = usarSesion();
  const navegar = useNavigate();
  const ubicacion = useLocation();
  const [error, establecerError] = useState('');
  const [cargando, establecerCargando] = useState(false);
  const [paso, establecerPaso] = useState(1);
  const [nombres, establecerNombres] = useState('');
  const [apellidos, establecerApellidos] = useState('');
  const [correo, establecerCorreo] = useState('');
  const [clave, establecerClave] = useState('');
  const [confirmacion, establecerConfirmacion] = useState('');
  const [correoCreado, establecerCorreoCreado] = useState('');
  const [verificacionEnviada, establecerVerificacionEnviada] = useState(false);

  async function ingresar(evento) {
    evento.preventDefault();
    establecerError('');
    if (!correo.trim()) {
      establecerError('Ingresa tu correo electrónico.');
      return;
    }
    if (!correoValido.test(correo.trim())) {
      establecerError('Escribe un correo completo y válido, por ejemplo nombre@gmail.com.');
      return;
    }
    if (!clave) {
      establecerError('Ingresa tu contraseña.');
      return;
    }
    establecerCargando(true);
    try {
      const usuario = await iniciar(correo.trim().toLowerCase(), clave);
      navegar(rutasPorRol[usuario.rol], { replace: true });
    } catch (fallo) {
      establecerError(fallo.message);
    } finally {
      establecerCargando(false);
    }
  }

  function continuarDatos(evento) {
    evento.preventDefault();
    establecerError('');
    if (!nombres.trim() || !apellidos.trim()) {
      establecerError('Ingresa tus nombres y apellidos.');
      return;
    }
    if (!correo.trim()) {
      establecerError('Ingresa tu correo.');
      return;
    }
    if (!correoValido.test(correo.trim())) {
      establecerError('Escribe un correo completo y válido, por ejemplo nombre@gmail.com.');
      return;
    }
    establecerPaso(2);
  }

  function continuarClave(evento) {
    evento.preventDefault();
    establecerError('');
    if (!clave) {
      establecerError('Ingresa una contraseña.');
      return;
    }
    if (clave.length < 8) {
      establecerError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (!confirmacion) {
      establecerError('Confirma tu contraseña.');
      return;
    }
    if (clave !== confirmacion) {
      establecerError('Las contraseñas no coinciden.');
      return;
    }
    establecerPaso(3);
  }

  async function crearCuenta() {
    establecerError('');
    establecerCargando(true);
    const email = correo.trim().toLowerCase();
    try {
      const resultado = await registrar({
        nombre: `${nombres.trim()} ${apellidos.trim()}`,
        email,
        password: clave,
        password_confirmation: confirmacion,
      });
      establecerCorreoCreado(email);
      establecerVerificacionEnviada(Boolean(resultado.correo_verificacion_enviado));
      establecerClave('');
      establecerConfirmacion('');
      establecerPaso(4);
    } catch (fallo) {
      if (fallo.errores?.email) establecerPaso(1);
      establecerError(fallo.message);
    } finally {
      establecerCargando(false);
    }
  }

  return (
    <main className="pagina-acceso">
      <section className={`tarjeta acceso-formulario${registro ? ' acceso-registro' : ''}`}>
        {!registro && (
          <>
            <MarcaAcceso />
            <h1>Iniciar sesión</h1>
            <p className="acceso-descripcion">Ingresa para continuar con tus incidencias.</p>
            <Aviso mensaje={ubicacion.state?.mensaje} tipo="exito" />
            <Aviso mensaje={error} tipo="error" />
            <form onSubmit={ingresar} className="formulario acceso-campos" noValidate>
              <CampoCorreo id="ingreso-correo" valor={correo} alCambiar={establecerCorreo} />
              <CampoClave id="ingreso-clave" etiqueta="Contraseña" valor={clave} alCambiar={establecerClave} />
              <button className="btn btn-primary acceso-enviar" type="submit" disabled={cargando}>
                {cargando ? 'Ingresando…' : 'Ingresar'}
                {!cargando && <ArrowRight size={18} aria-hidden="true" />}
              </button>
            </form>
            <div className="acceso-alterno">¿Aún no tienes cuenta? <Link to="/registro">Regístrate aquí</Link></div>
            <div className="acceso-alterno"><Link to="/olvide-clave">Olvidé mi contraseña</Link></div>
          </>
        )}

        {registro && paso < 4 && (
          <>
            <EtapasRegistro paso={paso} />
            <h1>{paso === 1 ? 'Crear cuenta' : paso === 2 ? 'Crea tu contraseña' : 'Revisa tus datos'}</h1>
            <p className="acceso-descripcion">
              {paso === 1 ? 'Paso 1: tus datos personales y correo.'
                : paso === 2 ? 'Paso 2: protege tu cuenta.'
                  : 'Paso 3: confirma antes de crear la cuenta.'}
            </p>
            <Aviso mensaje={error} tipo="error" />

            {paso === 1 && (
              <form onSubmit={continuarDatos} className="formulario acceso-campos" noValidate>
                <div className="acceso-dos-columnas">
                  <div className="campo-acceso">
                    <label htmlFor="registro-nombres">Nombres</label>
                    <div className="control-acceso"><UserRound size={17} aria-hidden="true" />
                      <input id="registro-nombres" required autoComplete="given-name" placeholder="Juan"
                        value={nombres} onChange={(evento) => establecerNombres(evento.target.value)} />
                    </div>
                  </div>
                  <div className="campo-acceso">
                    <label htmlFor="registro-apellidos">Apellidos</label>
                    <div className="control-acceso"><UserRound size={17} aria-hidden="true" />
                      <input id="registro-apellidos" required autoComplete="family-name" placeholder="Pérez"
                        value={apellidos} onChange={(evento) => establecerApellidos(evento.target.value)} />
                    </div>
                  </div>
                </div>
                <CampoCorreo id="registro-correo" valor={correo} alCambiar={establecerCorreo} />
                <button className="btn btn-primary acceso-enviar" type="submit">
                  Continuar <ArrowRight size={18} aria-hidden="true" />
                </button>
              </form>
            )}

            {paso === 2 && (
              <form onSubmit={continuarClave} className="formulario acceso-campos" noValidate>
                <CampoClave id="registro-clave" etiqueta="Contraseña" valor={clave} alCambiar={establecerClave} />
                <IndicadoresClave clave={clave} />
                <CampoClave id="registro-confirmacion" etiqueta="Confirmar contraseña"
                  valor={confirmacion} alCambiar={establecerConfirmacion} confirmacion />
                <div className="acciones-registro">
                  <button type="button" className="btn acceso-volver" aria-label="Volver a datos"
                    onClick={() => { establecerError(''); establecerPaso(1); }}>
                    <ArrowLeft size={18} aria-hidden="true" />
                  </button>
                  <button className="btn btn-primary acceso-enviar" type="submit">
                    Continuar <ArrowRight size={18} aria-hidden="true" />
                  </button>
                </div>
              </form>
            )}

            {paso === 3 && (
              <div className="acceso-campos">
                <dl className="resumen-registro">
                  <div><dt>Nombre</dt><dd>{nombres.trim()} {apellidos.trim()}</dd></div>
                  <div><dt>Correo</dt><dd>{correo.trim().toLowerCase()}</dd></div>
                  <div><dt>Contraseña</dt><dd>••••••••</dd></div>
                </dl>
                <div className="acciones-registro">
                  <button type="button" className="btn acceso-volver" aria-label="Volver a contraseña"
                    onClick={() => { establecerError(''); establecerPaso(2); }}>
                    <ArrowLeft size={18} aria-hidden="true" />
                  </button>
                  <button className="btn btn-primary acceso-enviar" type="button"
                    disabled={cargando} onClick={crearCuenta}>
                    {cargando ? 'Creando cuenta…' : 'Crear cuenta'}
                    {!cargando && <ArrowRight size={18} aria-hidden="true" />}
                  </button>
                </div>
              </div>
            )}
            <div className="acceso-alterno">¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link></div>
          </>
        )}

        {registro && paso === 4 && (
          <>
            <MarcaAcceso />
            <div className="acceso-exito-icono"><Check size={27} aria-hidden="true" /></div>
            <h1>Cuenta creada</h1>
            <p className="acceso-descripcion">Ya puedes iniciar sesión con<br /><strong>{correoCreado}</strong></p>
            <Aviso tipo={verificacionEnviada ? 'exito' : 'advertencia'} mensaje={verificacionEnviada
              ? 'Te enviamos un enlace para verificar tu correo. Revisa también la carpeta de spam.'
              : 'No pudimos enviar el correo de verificación. Inicia sesión y solicita el reenvío desde Mi cuenta.'} />
            <Link className="btn btn-primary acceso-enviar acceso-ir-login" to="/login">
              Ir a iniciar sesión <ArrowRight size={18} aria-hidden="true" />
            </Link>
          </>
        )}
      </section>
      <small className="acceso-pie">UrbanCloud AI · Chimbote y Nuevo Chimbote</small>
    </main>
  );
}
