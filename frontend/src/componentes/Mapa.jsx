import { useEffect, useRef } from 'react';
import L from 'leaflet';

const centro = [-9.087, -78.578];

export function Mapa({ latitud, longitud, alCambiar, altura = 280, posicionSolicitada = null }) {
  const contenedor = useRef(null);
  const mapa = useRef(null);
  const marcador = useRef(null);
  const funcionCambio = useRef(alCambiar);
  funcionCambio.current = alCambiar;

  useEffect(() => {
    if (!contenedor.current || mapa.current) return undefined;
    const posicion = Number.isFinite(Number(latitud)) && latitud !== null && latitud !== undefined
      && longitud !== null && longitud !== undefined
      ? [Number(latitud), Number(longitud)] : centro;
    mapa.current = L.map(contenedor.current).setView(posicion, 13);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      referrerPolicy: 'strict-origin-when-cross-origin',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a>',
    }).addTo(mapa.current);
    if (latitud !== null && latitud !== undefined && longitud !== null && longitud !== undefined) {
      marcador.current = L.circleMarker(posicion, { radius: 10, color: '#2463eb', fillColor: '#2463eb', fillOpacity: 0.8 })
        .addTo(mapa.current);
    }
    mapa.current.on('click', (evento) => {
      if (!funcionCambio.current) return;
      const nueva = [evento.latlng.lat, evento.latlng.lng];
      if (marcador.current) marcador.current.setLatLng(nueva);
      else marcador.current = L.circleMarker(nueva, { radius: 10, color: '#2463eb', fillColor: '#2463eb', fillOpacity: 0.8 })
        .addTo(mapa.current);
      funcionCambio.current(nueva[0], nueva[1]);
    });
    return () => { mapa.current?.remove(); mapa.current = null; marcador.current = null; };
  // El mapa se monta una sola vez; la selección la gestiona su escucha de clics.
  }, []);

  useEffect(() => {
    if (!mapa.current || !Array.isArray(posicionSolicitada)) return;
    const [lat, lng] = posicionSolicitada;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    const posicion = [lat, lng];
    mapa.current.setView(posicion, 16);
    if (marcador.current) marcador.current.setLatLng(posicion);
    else marcador.current = L.circleMarker(posicion, { radius: 10, color: '#2463eb', fillColor: '#2463eb', fillOpacity: 0.8 })
      .addTo(mapa.current);
  }, [posicionSolicitada]);

  return <div className="mapa" ref={contenedor} style={{ height: altura }} aria-label="Mapa de Chimbote y Nuevo Chimbote" />;
}
