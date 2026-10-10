import { describe, expect, it, vi } from 'vitest';
import { crearDiagnostico, datosDeRespuesta, diagnostico, diagnosticoActivo } from '../servicios/diagnostico.js';

function almacenamientoFalso(inicial = null) {
  let guardado = inicial;
  return {
    getItem: vi.fn(() => guardado),
    setItem: vi.fn((clave, valor) => { guardado = valor; }),
    leer: () => guardado,
  };
}

describe('historial de fallos', () => {
  it('registra cada evento con su hora', () => {
    const diagnostico = crearDiagnostico({ almacenamiento: almacenamientoFalso(), ahora: () => '2026-10-07T01:00:00.000Z' });
    diagnostico.registrar({ tipo: 'respuesta', ruta: '/panel/resumen', estado: 429 });
    expect(diagnostico.listar()).toEqual([
      { hora: '2026-10-07T01:00:00.000Z', tipo: 'respuesta', ruta: '/panel/resumen', estado: 429 },
    ]);
  });

  it('conserva solo los 30 más recientes', () => {
    const diagnostico = crearDiagnostico({ almacenamiento: almacenamientoFalso() });
    for (let i = 1; i <= 35; i += 1) diagnostico.registrar({ n: i });
    const lista = diagnostico.listar();
    expect(lista).toHaveLength(30);
    expect(lista[0].n).toBe(6);
    expect(lista[29].n).toBe(35);
  });

  it('persiste en el almacenamiento y se recupera al recargar', () => {
    const almacenamiento = almacenamientoFalso();
    crearDiagnostico({ almacenamiento }).registrar({ ruta: '/dashboard', estado: 429 });
    const despues = crearDiagnostico({ almacenamiento });
    expect(despues.listar()).toHaveLength(1);
    expect(despues.listar()[0]).toMatchObject({ ruta: '/dashboard', estado: 429 });
  });

  it('ignora un historial guardado que esté dañado', () => {
    expect(crearDiagnostico({ almacenamiento: almacenamientoFalso('{no es json') }).listar()).toEqual([]);
    expect(crearDiagnostico({ almacenamiento: almacenamientoFalso('{"a":1}') }).listar()).toEqual([]);
  });

  it('no se rompe si el almacenamiento no está disponible', () => {
    const roto = {
      getItem: () => { throw new Error('bloqueado'); },
      setItem: () => { throw new Error('bloqueado'); },
    };
    const diagnostico = crearDiagnostico({ almacenamiento: roto });
    expect(() => diagnostico.registrar({ estado: 500 })).not.toThrow();
    expect(diagnostico.listar()).toHaveLength(1);
    expect(() => crearDiagnostico({ almacenamiento: null }).registrar({ estado: 500 })).not.toThrow();
  });

  it('limpiar vacía el historial y el almacenamiento', () => {
    const almacenamiento = almacenamientoFalso();
    const diagnostico = crearDiagnostico({ almacenamiento });
    diagnostico.registrar({ estado: 500 });
    diagnostico.limpiar();
    expect(diagnostico.listar()).toEqual([]);
    expect(almacenamiento.leer()).toBe('[]');
  });

  it('entrega una copia: modificarla no altera el historial', () => {
    const diagnostico = crearDiagnostico({ almacenamiento: almacenamientoFalso() });
    diagnostico.registrar({ estado: 500 });
    diagnostico.listar().pop();
    expect(diagnostico.listar()).toHaveLength(1);
  });
});

describe('etiqueta del mensaje', () => {
  it('muestra el código y la ruta', () => {
    const diagnostico = crearDiagnostico({ almacenamiento: almacenamientoFalso() });
    expect(diagnostico.etiqueta(429, '/panel/resumen')).toBe(' (HTTP 429 · /panel/resumen)');
  });

  it('indica cuando no hubo respuesta', () => {
    const diagnostico = crearDiagnostico({ almacenamiento: almacenamientoFalso() });
    expect(diagnostico.etiqueta(0, '/dashboard')).toBe(' (sin respuesta · /dashboard)');
  });
});

describe('interruptor VITE_DIAGNOSTICO', () => {
  it('está activo por defecto y solo se apaga con "false"', () => {
    expect(diagnosticoActivo(undefined)).toBe(true);
    expect(diagnosticoActivo('true')).toBe(true);
    expect(diagnosticoActivo('false')).toBe(false);
    expect(diagnosticoActivo(' FALSE ')).toBe(false);
  });

  it('apagado no registra, no guarda ni cambia los mensajes', () => {
    const almacenamiento = almacenamientoFalso('[{"viejo":true}]');
    const diagnostico = crearDiagnostico({ activo: false, almacenamiento });
    diagnostico.registrar({ estado: 500 });
    expect(diagnostico.listar()).toEqual([]);
    expect(almacenamiento.setItem).not.toHaveBeenCalled();
    expect(diagnostico.etiqueta(500, '/x')).toBe('');
  });
});

describe('datos útiles de una respuesta', () => {
  it('extrae las cabeceras que permiten rastrear el fallo y omite las ausentes', () => {
    const cabeceras = new Map([['x-vercel-id', 'gru1::abc'], ['server', 'Vercel'], ['content-type', 'text/html']]);
    const respuesta = { status: 429, headers: { get: (nombre) => cabeceras.get(nombre) ?? null } };
    expect(datosDeRespuesta(respuesta)).toEqual({
      estado: 429, vercel: 'gru1::abc', servidor: 'Vercel', tipoContenido: 'text/html',
    });
  });

  it('tolera una respuesta sin cabeceras', () => {
    expect(datosDeRespuesta({ status: 502 })).toEqual({ estado: 502 });
  });
});

describe('urbancloudDiagnostico() en la consola', () => {
  it('devuelve el historial aunque el navegador rechace copiarlo al portapapeles', async () => {
    const rechazo = vi.fn(() => Promise.reject(new DOMException('Document is not focused.', 'NotAllowedError')));
    vi.stubGlobal('navigator', { clipboard: { writeText: rechazo } });
    const consola = vi.spyOn(console, 'log').mockImplementation(() => {});
    diagnostico.limpiar();
    diagnostico.registrar({ estado: 429, ruta: '/dashboard' });

    const historial = window.urbancloudDiagnostico();
    await new Promise((resolver) => setTimeout(resolver, 0));

    expect(historial).toHaveLength(1);
    expect(historial[0]).toMatchObject({ estado: 429, ruta: '/dashboard' });
    expect(rechazo).toHaveBeenCalledTimes(1);
    expect(consola).toHaveBeenCalledTimes(1);
    diagnostico.limpiar();
    consola.mockRestore();
    vi.unstubAllGlobals();
  });

  it('funciona también si el navegador no tiene portapapeles', () => {
    vi.stubGlobal('navigator', {});
    const consola = vi.spyOn(console, 'log').mockImplementation(() => {});
    expect(() => window.urbancloudDiagnostico()).not.toThrow();
    consola.mockRestore();
    vi.unstubAllGlobals();
  });
});
