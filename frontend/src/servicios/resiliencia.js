import { datosDeRespuesta, diagnostico } from './diagnostico.js';

// Esta capa de resiliencia protege las lecturas (GET) hacia la API.
// Se desactiva por completo con VITE_RESILIENCIA=false (requiere recompilar).
// VITE_MAX_PARALELAS cambia el máximo de lecturas simultáneas (por defecto 3).
// Además evita pedir dos veces lo mismo a la vez y guarda en memoria los catálogos 10 min
// (se vacía al iniciar o cerrar sesión).

const ESTADOS_REINTENTABLES = [429, 502, 503, 504];
const ESPERAS_MS = [400, 1000];
const TOPE_ESPERA_MS = 3000;
const MAX_PARALELAS = 3;
const TTL_CACHE_MS = 10 * 60 * 1000;
const RUTAS_CACHEABLES = ['/catalogos'];

export function resilienciaActiva(valor) {
  return String(valor ?? 'true').trim().toLowerCase() !== 'false';
}

export function maxParalelas(valor) {
  const numero = Number.parseInt(valor, 10);
  return Number.isInteger(numero) && numero >= 1 ? numero : MAX_PARALELAS;
}

export function rutaDe(url) {
  try {
    return new URL(url, 'http://local').pathname.replace(/^\/api(?=\/)/, '');
  } catch {
    return String(url);
  }
}

const dormir = (ms) => new Promise((resolver) => setTimeout(resolver, ms));

const copiar = (respuesta) => (typeof respuesta?.clone === 'function' ? respuesta.clone() : respuesta);

function esLectura(opciones = {}) {
  const metodo = String(opciones.method || 'GET').toUpperCase();
  return metodo === 'GET' || metodo === 'HEAD';
}

function esCacheable(url, rutasCacheables) {
  try {
    const { pathname } = new URL(url, 'http://local');
    return rutasCacheables.some((ruta) => pathname.endsWith(ruta));
  } catch {
    return false;
  }
}

function esperaDeReintento(respuesta, intento, esperasMs, topeEsperaMs) {
  const segundos = Number(respuesta.headers?.get?.('Retry-After'));
  if (Number.isFinite(segundos) && segundos > 0) {
    return Math.min(segundos * 1000, topeEsperaMs);
  }
  const base = esperasMs[Math.min(intento, esperasMs.length - 1)];
  return Math.min(base + Math.floor(Math.random() * 200), topeEsperaMs);
}

export function crearResiliencia({
  activa = true,
  esperasMs = ESPERAS_MS,
  topeEsperaMs = TOPE_ESPERA_MS,
  estadosReintentables = ESTADOS_REINTENTABLES,
  limiteParalelas = MAX_PARALELAS,
  ttlCacheMs = TTL_CACHE_MS,
  rutasCacheables = RUTAS_CACHEABLES,
  ahora = () => Date.now(),
  fetchFn = (...argumentos) => fetch(...argumentos),
  esperar = dormir,
  alReintentar = null,
} = {}) {
  const maxReintentos = esperasMs.length;
  let enCurso = 0;
  const enEspera = [];
  const enVuelo = new Map();
  const cache = new Map();

  function adquirir() {
    if (enCurso < limiteParalelas) {
      enCurso += 1;
      return Promise.resolve();
    }
    return new Promise((resolver) => enEspera.push(resolver));
  }

  function liberar() {
    const siguiente = enEspera.shift();
    if (siguiente) {
      siguiente();
    } else {
      enCurso -= 1;
    }
  }

  async function lanzar(url, opciones) {
    await adquirir();
    try {
      return await fetchFn(url, opciones);
    } finally {
      liberar();
    }
  }

  async function conReintentos(url, opciones) {
    for (let intento = 0; ; intento += 1) {
      const respuesta = await lanzar(url, opciones);
      const hayMasIntentos = intento < maxReintentos;
      if (!hayMasIntentos || !estadosReintentables.includes(respuesta.status)) {
        return respuesta;
      }
      alReintentar?.({ url, intento: intento + 1, respuesta });
      await esperar(esperaDeReintento(respuesta, intento, esperasMs, topeEsperaMs));
    }
  }

  function compartir(clave, url, opciones) {
    const promesa = conReintentos(url, opciones);
    enVuelo.set(clave, promesa);
    const terminar = () => {
      if (enVuelo.get(clave) === promesa) enVuelo.delete(clave);
    };
    promesa.then(
      (respuesta) => {
        terminar();
        if (respuesta.ok && esCacheable(url, rutasCacheables)) {
          cache.set(clave, { promesa, expira: ahora() + ttlCacheMs });
        }
      },
      terminar,
    );
    return promesa;
  }

  async function leer(url, opciones) {
    const clave = `${String(opciones.method || 'GET').toUpperCase()}:${url}`;
    const guardada = cache.get(clave);
    if (guardada) {
      if (guardada.expira > ahora()) return copiar(await guardada.promesa);
      cache.delete(clave);
    }
    const compartida = enVuelo.get(clave) ?? compartir(clave, url, opciones);
    return copiar(await compartida);
  }

  function limpiarCache() {
    cache.clear();
  }

  function peticion(url, opciones = {}) {
    if (!activa || !esLectura(opciones)) {
      return fetchFn(url, opciones);
    }
    return leer(url, opciones);
  }

  return { peticion, limpiarCache };
}

const { peticion, limpiarCache } = crearResiliencia({
  activa: resilienciaActiva(import.meta.env.VITE_RESILIENCIA),
  limiteParalelas: maxParalelas(import.meta.env.VITE_MAX_PARALELAS),
  alReintentar: ({ url, intento, respuesta }) => diagnostico.registrar({
    tipo: 'reintento',
    ruta: rutaDe(url),
    intento,
    ...datosDeRespuesta(respuesta),
  }),
});

export const peticionResiliente = peticion;
export const limpiarCacheResiliente = limpiarCache;
