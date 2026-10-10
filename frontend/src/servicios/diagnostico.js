// Diagnóstico de fallos de red desde el propio navegador.
// Guarda los últimos fallos de las peticiones a la API para poder revisarlos después,
// y añade el código HTTP y la ruta a los mensajes de error genéricos.
// Se desactiva con VITE_DIAGNOSTICO=false (requiere recompilar).
// Para ver el historial, en la consola del navegador: urbancloudDiagnostico()

const CLAVE = 'urbancloud-diagnostico';
const MAXIMO = 30;

export function diagnosticoActivo(valor) {
  return String(valor ?? 'true').trim().toLowerCase() !== 'false';
}

function almacenamientoDelNavegador() {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

export function datosDeRespuesta(respuesta) {
  const cabecera = (nombre) => respuesta?.headers?.get?.(nombre) ?? undefined;
  const datos = {
    estado: respuesta?.status,
    vercel: cabecera('x-vercel-id'),
    servidor: cabecera('server'),
    plataforma: cabecera('platform'),
    tipoContenido: cabecera('content-type'),
    reintentarEn: cabecera('retry-after'),
  };
  return Object.fromEntries(Object.entries(datos).filter(([, valor]) => valor !== undefined));
}

export function crearDiagnostico({
  activo = true,
  almacenamiento = almacenamientoDelNavegador(),
  ahora = () => new Date().toISOString(),
} = {}) {
  function cargar() {
    try {
      const guardado = JSON.parse(almacenamiento?.getItem(CLAVE) ?? '[]');
      return Array.isArray(guardado) ? guardado : [];
    } catch {
      return [];
    }
  }

  let registros = activo ? cargar() : [];

  function guardar() {
    try {
      almacenamiento?.setItem(CLAVE, JSON.stringify(registros));
    } catch {
      // Sin almacenamiento disponible: el historial solo vive en memoria.
    }
  }

  function registrar(evento) {
    if (!activo) return;
    registros.push({ hora: ahora(), ...evento });
    if (registros.length > MAXIMO) registros.splice(0, registros.length - MAXIMO);
    guardar();
  }

  function etiqueta(estado, ruta) {
    if (!activo) return '';
    return estado ? ` (HTTP ${estado} · ${ruta})` : ` (sin respuesta · ${ruta})`;
  }

  function listar() {
    return [...registros];
  }

  function limpiar() {
    registros = [];
    guardar();
  }

  return { registrar, etiqueta, listar, limpiar };
}

export const diagnostico = crearDiagnostico({
  activo: diagnosticoActivo(import.meta.env.VITE_DIAGNOSTICO),
});

if (typeof window !== 'undefined') {
  window.urbancloudDiagnostico = () => {
    const texto = JSON.stringify(diagnostico.listar(), null, 2);
    console.log(texto);
    try {
      // Copiar puede rechazarse (por ejemplo, si la consola tiene el foco); el texto ya está en la consola.
      navigator.clipboard?.writeText(texto)?.catch(() => {});
    } catch {
      // Navegador sin portapapeles.
    }
    return diagnostico.listar();
  };
}
