import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { diagnostico } from '../servicios/diagnostico.js';
import { ErrorSolicitud, servicioHttp } from '../servicios/servicioHttp.js';

function respuesta(estado, cuerpo = '', cabeceras = {}) {
  const mapa = new Map(Object.entries(cabeceras).map(([k, v]) => [k.toLowerCase(), v]));
  const texto = typeof cuerpo === 'string' ? cuerpo : JSON.stringify(cuerpo);
  return {
    status: estado,
    ok: estado >= 200 && estado < 300,
    headers: { get: (nombre) => mapa.get(nombre.toLowerCase()) ?? null },
    text: async () => texto,
    json: async () => JSON.parse(texto),
    clone() { return this; },
  };
}

async function capturar(promesa) {
  try {
    await promesa;
  } catch (error) {
    return error;
  }
  throw new Error('Se esperaba un error y la petición terminó bien');
}

beforeEach(() => {
  servicioHttp.limpiarCsrf();
  diagnostico.limpiar();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('mensajes de error con diagnóstico', () => {
  it('una lectura correcta no registra nada', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => respuesta(200, { total: 3 })));
    expect(await servicioHttp.obtener('/panel/resumen')).toEqual({ total: 3 });
    expect(diagnostico.listar()).toEqual([]);
  });

  it('un error genérico muestra el código y la ruta, y queda registrado', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => respuesta(409, '', { 'x-vercel-id': 'gru1::xyz', server: 'Vercel' })));
    const error = await capturar(servicioHttp.obtener('/panel/resumen'));
    expect(error).toBeInstanceOf(ErrorSolicitud);
    expect(error.message).toBe('No se pudo completar la solicitud. (HTTP 409 · /panel/resumen)');
    expect(error.estado).toBe(409);
    expect(diagnostico.listar()).toHaveLength(1);
    expect(diagnostico.listar()[0]).toMatchObject({
      tipo: 'respuesta', metodo: 'GET', ruta: '/panel/resumen', estado: 409, vercel: 'gru1::xyz', servidor: 'Vercel',
    });
  });

  it('un error del servidor muestra el código y guarda el inicio de la respuesta', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => respuesta(500, '<html>Error interno</html>', { 'content-type': 'text/html' })));
    const error = await capturar(servicioHttp.obtener('/dashboard'));
    expect(error.message).toBe('El servidor no pudo completar la solicitud. Inténtalo de nuevo. (HTTP 500 · /dashboard)');
    expect(diagnostico.listar()[0]).toMatchObject({ estado: 500, cuerpo: '<html>Error interno</html>', tipoContenido: 'text/html' });
  });

  it('los errores con mensaje propio no se alteran ni se registran', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => respuesta(404)));
    expect((await capturar(servicioHttp.obtener('/x'))).message).toBe('No encontramos lo que buscas.');

    vi.stubGlobal('fetch', vi.fn(async () => respuesta(422, { errors: { email: ['Correo inválido.'] } })));
    const validacion = await capturar(servicioHttp.obtener('/y'));
    expect(validacion.message).toBe('Correo inválido.');
    expect(validacion.errores).toEqual({ email: ['Correo inválido.'] });
    expect(diagnostico.listar()).toEqual([]);
  });

  it('el mensaje controlado del servidor se conserva y se le añade el código', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url) => (String(url).endsWith('/sesion/csrf')
      ? respuesta(200, { token: 'abc' })
      : respuesta(503, { mensaje: 'No se pudo analizar la imagen. Intenta de nuevo.' }))));
    const error = await capturar(servicioHttp.publicar('/incidencias', {}));
    expect(error.message).toBe('No se pudo analizar la imagen. Intenta de nuevo. (HTTP 503 · /incidencias)');
  });

  it('si la red falla muestra "sin respuesta" y lo registra', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch'); }));
    const error = await capturar(servicioHttp.obtener('/dashboard'));
    expect(error.message).toBe('No hay conexión con UrbanCloud AI. Revisa tu red. (sin respuesta · /dashboard)');
    expect(error.estado).toBe(0);
    expect(diagnostico.listar()[0]).toMatchObject({ tipo: 'red', ruta: '/dashboard', mensaje: 'Failed to fetch' });
  });
});

describe('solicitud segura (token CSRF)', () => {
  it('si el servidor falla al entregar el token, indica el código', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => respuesta(500)));
    const error = await capturar(servicioHttp.publicar('/login', {}));
    expect(error.message).toBe('No se pudo iniciar una solicitud segura. (HTTP 500 · /sesion/csrf)');
    expect(diagnostico.listar()[0]).toMatchObject({ tipo: 'csrf', ruta: '/sesion/csrf', estado: 500 });
  });

  it('si la red falla al pedir el token, lo informa como error controlado', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch'); }));
    const error = await capturar(servicioHttp.publicar('/login', {}));
    expect(error).toBeInstanceOf(ErrorSolicitud);
    expect(error.message).toBe('No se pudo iniciar una solicitud segura. (sin respuesta · /sesion/csrf)');
  });
});

describe('reintentos visibles en el diagnóstico', () => {
  it('un 429 que se recupera deja constancia de los reintentos aunque el usuario no vea error', async () => {
    vi.useFakeTimers();
    let llamadas = 0;
    vi.stubGlobal('fetch', vi.fn(async () => {
      llamadas += 1;
      return llamadas < 3 ? respuesta(429, '', { 'x-vercel-id': 'gru1::reintento' }) : respuesta(200, { ok: true });
    }));
    const resultado = servicioHttp.obtener('/panel/resumen');
    await vi.advanceTimersByTimeAsync(5000);
    expect(await resultado).toEqual({ ok: true });
    const reintentos = diagnostico.listar().filter((r) => r.tipo === 'reintento');
    expect(reintentos).toHaveLength(2);
    expect(reintentos[0]).toMatchObject({ ruta: '/panel/resumen', intento: 1, estado: 429, vercel: 'gru1::reintento' });
    expect(reintentos[1]).toMatchObject({ intento: 2, estado: 429 });
  });

  it('si el 429 persiste, el usuario ve el código y quedan reintentos y fallo final', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn(async () => respuesta(429)));
    const resultado = capturar(servicioHttp.obtener('/panel/resumen'));
    await vi.advanceTimersByTimeAsync(5000);
    const error = await resultado;
    expect(error.message).toBe('No se pudo completar la solicitud. (HTTP 429 · /panel/resumen)');
    expect(diagnostico.listar().map((r) => r.tipo)).toEqual(['reintento', 'reintento', 'respuesta']);
  });
});

describe('renovación de la sesión por cookies', () => {
  const rutas = (llamadas) => llamadas.map(([ruta]) => ruta);

  it('ante un 401 renueva la sesión y repite la lectura sin mostrar error', async () => {
    const respuestas = [respuesta(401), respuesta(200, { token: 'csrf-1' }), respuesta(200, { mensaje: 'Renovada' }), respuesta(200, { total: 7 })];
    const fetchSimulado = vi.fn(async () => respuestas.shift());
    vi.stubGlobal('fetch', fetchSimulado);
    expect(await servicioHttp.obtener('/panel/resumen')).toEqual({ total: 7 });
    expect(rutas(fetchSimulado.mock.calls)).toEqual(['/api/panel/resumen', '/api/sesion/csrf', '/api/auth/refresh', '/api/panel/resumen']);
    expect(diagnostico.listar()).toEqual([]);
  });

  it('si la renovación falla, el error de sesión vencida no lleva código ni se registra, y avisa a la aplicación', async () => {
    const respuestas = [respuesta(401), respuesta(200, { token: 'csrf-1' }), respuesta(401, { mensaje: 'Tu sesión terminó.' })];
    vi.stubGlobal('fetch', vi.fn(async () => respuestas.shift()));
    const aviso = vi.fn();
    window.addEventListener('sesion-caducada', aviso);
    const error = await capturar(servicioHttp.obtener('/dashboard'));
    window.removeEventListener('sesion-caducada', aviso);
    expect(error.message).toBe('Tu sesión terminó. Inicia sesión nuevamente.');
    expect(error.estado).toBe(401);
    expect(aviso).toHaveBeenCalledTimes(1);
    expect(diagnostico.listar()).toEqual([]);
  });

  it('el inicio de sesión incorrecto no intenta renovar nada', async () => {
    const fetchSimulado = vi.fn(async (ruta) => (String(ruta).endsWith('/sesion/csrf')
      ? respuesta(200, { token: 'csrf-1' })
      : respuesta(401, { mensaje: 'Credenciales incorrectas.' })));
    vi.stubGlobal('fetch', fetchSimulado);
    const error = await capturar(servicioHttp.publicar('/login', { email: 'a@urbancloudai.com', password: 'mala' }));
    expect(error.estado).toBe(401);
    expect(rutas(fetchSimulado.mock.calls)).toEqual(['/api/sesion/csrf', '/api/login']);
  });

  it('cerrar sesión vacía los catálogos guardados en memoria', async () => {
    const fetchSimulado = vi.fn(async () => respuesta(200, { distritos: [] }));
    vi.stubGlobal('fetch', fetchSimulado);
    await servicioHttp.obtener('/catalogos');
    await servicioHttp.obtener('/catalogos');
    expect(fetchSimulado).toHaveBeenCalledTimes(1);
    servicioHttp.limpiarCsrf();
    await servicioHttp.obtener('/catalogos');
    expect(fetchSimulado).toHaveBeenCalledTimes(2);
  });
});
