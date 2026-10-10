import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { Aviso, Encabezado } from '../componentes/Estado';
import { usarSesion } from '../contexto/Sesion';
import { servicioHttp } from '../servicios/servicioHttp';

export function MiCuenta() {
  const { usuario } = usarSesion();
  const navegar = useNavigate();
  const [mensaje, establecerMensaje] = useState('');
  const [error, establecerError] = useState('');
  const [enviando, establecerEnviando] = useState(false);
  const [clave, establecerClave] = useState({ current_password: '', password: '', password_confirmation: '' });

  async function cambiar(evento) {
    evento.preventDefault();
    establecerError('');
    if (clave.password !== clave.password_confirmation) {
      establecerError('Las contraseñas no coinciden.');
      return;
    }
    establecerEnviando(true);
    try {
      await servicioHttp.publicar('/cuenta/cambiar-clave', clave);
      window.dispatchEvent(new Event('sesion-caducada'));
      navegar('/login', { replace: true, state: { mensaje: 'Contraseña actualizada. Inicia sesión nuevamente.' } });
    } catch (fallo) { establecerError(fallo.message); }
    finally { establecerEnviando(false); }
  }

  async function reenviar() {
    establecerError('');
    establecerMensaje('');
    establecerEnviando(true);
    try {
      const respuesta = await servicioHttp.publicar('/correo/verificacion/reenviar', {});
      establecerMensaje(respuesta.mensaje);
    } catch (fallo) { establecerError(fallo.message); }
    finally { establecerEnviando(false); }
  }

  return <><Encabezado seccion="MI CUENTA" titulo="Cuenta y seguridad" />
    <div className="distribucion"><section className="tarjeta padding"><h2>Cambiar contraseña</h2>
      <p className="descripcion">Necesitas conocer tu contraseña actual. Al guardarla, tendrás que iniciar sesión de nuevo.</p>
      <Aviso mensaje={error} tipo="error" /><Aviso mensaje={mensaje} tipo="exito" />
      <form className="formulario" onSubmit={cambiar}>
        {[['current_password', 'Contraseña actual'], ['password', 'Nueva contraseña'],
          ['password_confirmation', 'Confirmar nueva contraseña']].map(([campo, etiqueta]) =>
          <label className="campo" key={campo}><span>{etiqueta}</span>
            <input type="password" required minLength={campo === 'current_password' ? undefined : 8}
              autoComplete={campo === 'current_password' ? 'current-password' : 'new-password'}
              value={clave[campo]} onChange={(evento) => establecerClave({ ...clave, [campo]: evento.target.value })} />
          </label>)}
        <button className="btn btn-primary" disabled={enviando}>Guardar contraseña</button>
      </form>
    </section>
      {usuario.rol === 'Ciudadano' && <section className="tarjeta padding"><h2>Verificación del correo</h2>
        <p className="descripcion">{usuario.correo}</p>
        <p>{usuario.correo_verificado ? 'Tu correo está verificado.'
          : 'Tu correo aún no está verificado. Verifícalo para poder recuperar tu contraseña si la olvidas.'}</p>
        {!usuario.correo_verificado && <button className="btn btn-secondary" type="button"
          disabled={enviando} onClick={reenviar}>Reenviar correo de verificación</button>}
      </section>}
    </div>
  </>;
}

export function OlvideClave() {
  const [email, establecerEmail] = useState('');
  const [mensaje, establecerMensaje] = useState('');
  const [error, establecerError] = useState('');
  const [enviando, establecerEnviando] = useState(false);

  async function solicitar(evento) {
    evento.preventDefault();
    establecerError('');
    establecerEnviando(true);
    try {
      const respuesta = await servicioHttp.publicar('/clave/recuperacion/solicitar', { email });
      establecerMensaje(respuesta.mensaje);
    } catch (fallo) { establecerError(fallo.message); }
    finally { establecerEnviando(false); }
  }

  return <main className="pagina-acceso"><section className="tarjeta acceso-formulario acceso-simple">
    <h1>Recuperar contraseña</h1>
    <p className="acceso-descripcion">Escribe el correo de tu cuenta ciudadana.</p>
    <Aviso mensaje={error} tipo="error" /><Aviso mensaje={mensaje} tipo="exito" />
    <form className="formulario acceso-campos" onSubmit={solicitar}>
      <label className="campo"><span>Correo</span><input type="email" required autoComplete="email"
        placeholder="nombre@gmail.com" value={email} onChange={(evento) => establecerEmail(evento.target.value)} /></label>
      <button className="btn btn-primary" disabled={enviando}>Enviar enlace</button>
    </form>
    <p className="acceso-alterno">La recuperación automática requiere un correo verificado. Si no lo verificaste y perdiste acceso, solicita ayuda al equipo del proyecto.</p>
    <div className="acceso-alterno"><Link to="/login">Volver al ingreso</Link></div>
  </section></main>;
}

export function RestablecerClave() {
  const [parametros] = useSearchParams();
  const token = parametros.get('token') || '';
  const [password, establecerPassword] = useState('');
  const [confirmacion, establecerConfirmacion] = useState('');
  const [mensaje, establecerMensaje] = useState('');
  const [error, establecerError] = useState('');
  const [enviando, establecerEnviando] = useState(false);

  async function confirmar(evento) {
    evento.preventDefault();
    establecerError('');
    if (password !== confirmacion) { establecerError('Las contraseñas no coinciden.'); return; }
    establecerEnviando(true);
    try {
      const respuesta = await servicioHttp.publicar('/clave/recuperacion/confirmar',
        { token, password, password_confirmation: confirmacion });
      establecerMensaje(respuesta.mensaje);
      establecerPassword(''); establecerConfirmacion('');
    } catch (fallo) { establecerError(fallo.message); }
    finally { establecerEnviando(false); }
  }

  return <main className="pagina-acceso"><section className="tarjeta acceso-formulario acceso-simple">
    <h1>Restablecer contraseña</h1>
    <Aviso mensaje={error} tipo="error" /><Aviso mensaje={mensaje} tipo="exito" />
    {!mensaje && <form className="formulario acceso-campos" onSubmit={confirmar}>
      <label className="campo"><span>Nueva contraseña</span><input type="password" required minLength={8}
        autoComplete="new-password" value={password} onChange={(evento) => establecerPassword(evento.target.value)} /></label>
      <label className="campo"><span>Confirmar contraseña</span><input type="password" required minLength={8}
        autoComplete="new-password" value={confirmacion} onChange={(evento) => establecerConfirmacion(evento.target.value)} /></label>
      <button className="btn btn-primary" disabled={enviando || !token}>Guardar contraseña</button>
    </form>}
    {!token && <Aviso mensaje="El enlace no es válido." tipo="error" />}
    <div className="acceso-alterno"><Link to="/login">Ir a iniciar sesión</Link></div>
  </section></main>;
}

export function VerificarCorreo() {
  const { actualizar } = usarSesion();
  const [parametros] = useSearchParams();
  const token = parametros.get('token') || '';
  const ejecutado = useRef(false);
  const [mensaje, establecerMensaje] = useState('Verificando correo…');
  const [error, establecerError] = useState('');

  useEffect(() => {
    if (ejecutado.current) return;
    ejecutado.current = true;
    if (!token) { establecerError('El enlace no es válido.'); establecerMensaje(''); return; }
    servicioHttp.publicar('/correo/verificar', { token })
      .then((respuesta) => { establecerMensaje(respuesta.mensaje); actualizar(); })
      .catch((fallo) => { establecerError(fallo.message); establecerMensaje(''); });
  }, [token, actualizar]);

  return <main className="pagina-acceso"><section className="tarjeta acceso-formulario acceso-simple">
    <h1>Verificar correo</h1>
    <Aviso mensaje={error} tipo="error" /><Aviso mensaje={mensaje} tipo={mensaje === 'Verificando correo…' ? 'info' : 'exito'} />
    <div className="acceso-alterno"><Link to="/login">Ir a iniciar sesión</Link></div>
  </section></main>;
}
