import { describe, expect, it, vi } from 'vitest';
import { crearResiliencia, maxParalelas, resilienciaActiva } from '../servicios/resiliencia.js';

function respuesta(estado, cabeceras = {}) {
  const mapa = new Map(Object.entries(cabeceras));
  return {
    status: estado,
    ok: estado >= 200 && estado < 300,
    headers: { get: (nombre) => mapa.get(nombre) ?? null },
    clone() { return this; },
  };
}

function preparar(estados, opciones = {}) {
  const cola = [...estados];
  const fetchFn = vi.fn(async () => {
    const siguiente = cola.length > 1 ? cola.shift() : cola[0];
    return typeof siguiente === 'number' ? respuesta(siguiente) : siguiente;
  });
  const esperar = vi.fn(async () => {});
  const { peticion } = crearResiliencia({ fetchFn, esperar, ...opciones });
  return { peticion, fetchFn, esperar };
}

describe('reintentos de lecturas', () => {
  it('no reintenta cuando la respuesta es correcta', async () => {
    const { peticion, fetchFn, esperar } = preparar([200]);
    const resultado = await peticion('/api/panel/resumen');
    expect(resultado.status).toBe(200);
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(esperar).not.toHaveBeenCalled();
  });

  it('reintenta un 429 y devuelve la respuesta correcta', async () => {
    const { peticion, fetchFn, esperar } = preparar([429, 200]);
    const resultado = await peticion('/api/panel/resumen');
    expect(resultado.status).toBe(200);
    expect(fetchFn).toHaveBeenCalledTimes(2);
    expect(esperar).toHaveBeenCalledTimes(1);
  });

  it.each([502, 503, 504])('reintenta un %i', async (estado) => {
    const { peticion, fetchFn } = preparar([estado, 200]);
    expect((await peticion('/api/x')).status).toBe(200);
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('se rinde tras 2 reintentos y devuelve el último error', async () => {
    const { peticion, fetchFn, esperar } = preparar([503]);
    const resultado = await peticion('/api/x');
    expect(resultado.status).toBe(503);
    expect(fetchFn).toHaveBeenCalledTimes(3);
    expect(esperar).toHaveBeenCalledTimes(2);
  });

  it.each([400, 401, 403, 404, 419, 422, 500])('no reintenta un %i', async (estado) => {
    const { peticion, fetchFn } = preparar([estado, 200]);
    expect((await peticion('/api/x')).status).toBe(estado);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it.each(['POST', 'PATCH', 'PUT', 'DELETE'])('nunca reintenta un %s', async (metodo) => {
    const { peticion, fetchFn, esperar } = preparar([429, 200]);
    const resultado = await peticion('/api/incidencias', { method: metodo });
    expect(resultado.status).toBe(429);
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(esperar).not.toHaveBeenCalled();
  });

  it('respeta Retry-After y lo limita al tope', async () => {
    const { peticion, esperar } = preparar([respuesta(429, { 'Retry-After': '2' }), 200]);
    await peticion('/api/x');
    expect(esperar).toHaveBeenCalledWith(2000);

    const largo = preparar([respuesta(429, { 'Retry-After': '60' }), 200]);
    await largo.peticion('/api/x');
    expect(largo.esperar).toHaveBeenCalledWith(3000);
  });

  it('espera más en cada reintento', async () => {
    const { peticion, esperar } = preparar([503]);
    await peticion('/api/x');
    const [primera, segunda] = esperar.mock.calls.map(([ms]) => ms);
    expect(primera).toBeGreaterThanOrEqual(400);
    expect(primera).toBeLessThan(600);
    expect(segunda).toBeGreaterThanOrEqual(1000);
    expect(segunda).toBeLessThan(1200);
  });

  it('avisa de cada reintento con su número y la respuesta recibida', async () => {
    const alReintentar = vi.fn();
    const { peticion } = preparar([429, 503, 200], { alReintentar });
    await peticion('/api/panel/resumen');
    expect(alReintentar).toHaveBeenCalledTimes(2);
    expect(alReintentar.mock.calls[0][0]).toMatchObject({ url: '/api/panel/resumen', intento: 1 });
    expect(alReintentar.mock.calls[0][0].respuesta.status).toBe(429);
    expect(alReintentar.mock.calls[1][0]).toMatchObject({ intento: 2 });
    expect(alReintentar.mock.calls[1][0].respuesta.status).toBe(503);
  });

  it('no avisa cuando no hay reintentos', async () => {
    const alReintentar = vi.fn();
    const { peticion } = preparar([200], { alReintentar });
    await peticion('/api/x');
    expect(alReintentar).not.toHaveBeenCalled();
  });

  it('con la resiliencia apagada se comporta como un fetch normal', async () => {
    const { peticion, fetchFn, esperar } = preparar([429, 200], { activa: false });
    const resultado = await peticion('/api/x');
    expect(resultado.status).toBe(429);
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(esperar).not.toHaveBeenCalled();
  });

  it('pasa la url y las opciones sin modificarlas', async () => {
    const { peticion, fetchFn } = preparar([200]);
    const opciones = { credentials: 'include', headers: { Accept: 'application/json' } };
    await peticion('/api/x?page=2', opciones);
    expect(fetchFn).toHaveBeenCalledWith('/api/x?page=2', opciones);
  });
});

describe('interruptor VITE_RESILIENCIA', () => {
  it('está activa por defecto y solo se apaga con "false"', () => {
    expect(resilienciaActiva(undefined)).toBe(true);
    expect(resilienciaActiva('true')).toBe(true);
    expect(resilienciaActiva('')).toBe(true);
    expect(resilienciaActiva('false')).toBe(false);
    expect(resilienciaActiva(' FALSE ')).toBe(false);
  });
});

function controlado() {
  const pendientes = [];
  let enVuelo = 0;
  let maximo = 0;
  const iniciadas = [];
  const fetchFn = vi.fn((url) => new Promise((resolver, rechazar) => {
    enVuelo += 1;
    maximo = Math.max(maximo, enVuelo);
    iniciadas.push(url);
    pendientes.push({
      url,
      terminar: (estado = 200) => { enVuelo -= 1; resolver(respuesta(estado)); },
      fallar: (error) => { enVuelo -= 1; rechazar(error); },
    });
  }));
  return { fetchFn, pendientes, iniciadas, maximo: () => maximo, enVuelo: () => enVuelo };
}

const turno = () => new Promise((resolver) => setTimeout(resolver, 0));

describe('cola de lecturas simultáneas', () => {
  it('nunca lanza más lecturas a la vez que el límite y las completa todas', async () => {
    const control = controlado();
    const { peticion } = crearResiliencia({ fetchFn: control.fetchFn, limiteParalelas: 3 });
    const resultados = Array.from({ length: 8 }, (_, i) => peticion(`/api/${i}`));

    await turno();
    expect(control.enVuelo()).toBe(3);

    let atendidas = 0;
    while (atendidas < 8) {
      control.pendientes[atendidas].terminar(200);
      atendidas += 1;
      await turno();
    }
    const estados = (await Promise.all(resultados)).map((r) => r.status);
    expect(estados).toEqual(Array(8).fill(200));
    expect(control.maximo()).toBe(3);
  });

  it('respeta el orden de llegada', async () => {
    const control = controlado();
    const { peticion } = crearResiliencia({ fetchFn: control.fetchFn, limiteParalelas: 1 });
    const resultados = ['a', 'b', 'c'].map((id) => peticion(`/api/${id}`));
    for (let i = 0; i < 3; i += 1) {
      await turno();
      control.pendientes[i].terminar(200);
    }
    await Promise.all(resultados);
    expect(control.iniciadas).toEqual(['/api/a', '/api/b', '/api/c']);
  });

  it('libera el hueco aunque la petición falle por la red', async () => {
    const control = controlado();
    const { peticion } = crearResiliencia({ fetchFn: control.fetchFn, limiteParalelas: 1 });
    const primera = peticion('/api/a').catch((error) => error);
    const segunda = peticion('/api/b');
    await turno();
    control.pendientes[0].fallar(new TypeError('sin red'));
    expect(await primera).toBeInstanceOf(TypeError);
    await turno();
    control.pendientes[1].terminar(200);
    expect((await segunda).status).toBe(200);
  });

  it('no mete en la cola los envíos de datos', async () => {
    const control = controlado();
    const { peticion } = crearResiliencia({ fetchFn: control.fetchFn, limiteParalelas: 1 });
    peticion('/api/lectura');
    const envio = peticion('/api/incidencias', { method: 'POST' });
    await turno();
    expect([...control.iniciadas].sort()).toEqual(['/api/incidencias', '/api/lectura']);
    control.pendientes.find((p) => p.url === '/api/incidencias').terminar(201);
    expect((await envio).status).toBe(201);
    control.pendientes.find((p) => p.url === '/api/lectura').terminar(200);
  });

  it('no ocupa un hueco mientras espera para reintentar', async () => {
    const control = controlado();
    let despertar;
    const esperar = vi.fn(() => new Promise((resolver) => { despertar = resolver; }));
    const { peticion } = crearResiliencia({ fetchFn: control.fetchFn, esperar, limiteParalelas: 1 });

    const a = peticion('/api/a');
    const b = peticion('/api/b');
    await turno();
    control.pendientes[0].terminar(429);
    await turno();
    expect(control.iniciadas).toEqual(['/api/a', '/api/b']);

    control.pendientes[1].terminar(200);
    expect((await b).status).toBe(200);
    despertar();
    await turno();
    control.pendientes[2].terminar(200);
    expect((await a).status).toBe(200);
    expect(control.iniciadas).toEqual(['/api/a', '/api/b', '/api/a']);
  });

  it('con la resiliencia apagada no limita las lecturas', async () => {
    const control = controlado();
    const { peticion } = crearResiliencia({ fetchFn: control.fetchFn, limiteParalelas: 1, activa: false });
    ['a', 'b', 'c'].forEach((id) => peticion(`/api/${id}`));
    await turno();
    expect(control.enVuelo()).toBe(3);
  });
});

describe('límite configurable VITE_MAX_PARALELAS', () => {
  it('usa 3 por defecto y acepta enteros positivos', () => {
    expect(maxParalelas(undefined)).toBe(3);
    expect(maxParalelas('')).toBe(3);
    expect(maxParalelas('abc')).toBe(3);
    expect(maxParalelas('0')).toBe(3);
    expect(maxParalelas('-2')).toBe(3);
    expect(maxParalelas('2')).toBe(2);
    expect(maxParalelas('5')).toBe(5);
  });
});

describe('peticiones repetidas y caché de catálogos', () => {
  function conCache(estados, opciones = {}) {
    const reloj = { ms: 1000 };
    const base = preparar(estados, { ahora: () => reloj.ms, ...opciones });
    return { ...base, reloj };
  }

  it('hace una sola petición cuando dos piden lo mismo a la vez', async () => {
    const control = controlado();
    const { peticion } = crearResiliencia({ fetchFn: control.fetchFn });
    const a = peticion('/api/panel/resumen');
    const b = peticion('/api/panel/resumen');
    await turno();
    expect(control.fetchFn).toHaveBeenCalledTimes(1);
    control.pendientes[0].terminar(200);
    expect((await a).status).toBe(200);
    expect((await b).status).toBe(200);
  });

  it('no comparte peticiones con direcciones distintas', async () => {
    const { peticion, fetchFn } = conCache([200]);
    await Promise.all([peticion('/api/notificaciones?page=1'), peticion('/api/notificaciones?page=2')]);
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('no guarda en caché las lecturas normales', async () => {
    const { peticion, fetchFn } = conCache([200]);
    await peticion('/api/panel/resumen');
    await peticion('/api/panel/resumen');
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('guarda en memoria los catálogos', async () => {
    const { peticion, fetchFn } = conCache([200]);
    const primera = await peticion('/api/catalogos');
    const segunda = await peticion('/api/catalogos');
    expect(primera.status).toBe(200);
    expect(segunda.status).toBe(200);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('entrega a cada quien su propia copia de la respuesta', async () => {
    const clon = vi.fn();
    const original = { ...respuesta(200), clone() { clon(); return respuesta(200); } };
    const { peticion } = crearResiliencia({ fetchFn: async () => original });
    await peticion('/api/catalogos');
    await peticion('/api/catalogos');
    expect(clon).toHaveBeenCalledTimes(2);
  });

  it('los catálogos caducan pasado el tiempo de vida', async () => {
    const { peticion, fetchFn, reloj } = conCache([200], { ttlCacheMs: 5000 });
    await peticion('/api/catalogos');
    reloj.ms += 4000;
    await peticion('/api/catalogos');
    expect(fetchFn).toHaveBeenCalledTimes(1);
    reloj.ms += 2000;
    await peticion('/api/catalogos');
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('no guarda en caché los catálogos que fallaron', async () => {
    const { peticion, fetchFn } = conCache([500, 200]);
    expect((await peticion('/api/catalogos')).status).toBe(500);
    expect((await peticion('/api/catalogos')).status).toBe(200);
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('limpiarCache obliga a volver a pedir los catálogos', async () => {
    const fetchFn = vi.fn(async () => respuesta(200));
    const { peticion, limpiarCache } = crearResiliencia({ fetchFn });
    await peticion('/api/catalogos');
    limpiarCache();
    await peticion('/api/catalogos');
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('un error de red no queda guardado ni bloquea la siguiente petición', async () => {
    let llamadas = 0;
    const fetchFn = vi.fn(async () => {
      llamadas += 1;
      if (llamadas === 1) throw new TypeError('sin red');
      return respuesta(200);
    });
    const { peticion } = crearResiliencia({ fetchFn });
    await expect(peticion('/api/catalogos')).rejects.toBeInstanceOf(TypeError);
    expect((await peticion('/api/catalogos')).status).toBe(200);
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('no comparte ni guarda los envíos de datos', async () => {
    const { peticion, fetchFn } = conCache([201]);
    await Promise.all([
      peticion('/api/catalogos', { method: 'POST' }),
      peticion('/api/catalogos', { method: 'POST' }),
    ]);
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('con la resiliencia apagada no comparte ni guarda nada', async () => {
    const { peticion, fetchFn } = conCache([200], { activa: false });
    await peticion('/api/catalogos');
    await peticion('/api/catalogos');
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });
});
