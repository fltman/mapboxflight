import mapboxgl from 'mapbox-gl';
import { START_LNG, START_LAT, START_ALT, START_HEADING } from './constants.js';

export function createMap(token) {
  mapboxgl.accessToken = token;

  const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/satellite-streets-v12',
    center: [START_LNG, START_LAT],
    zoom: 14,
    pitch: 70,
    bearing: START_HEADING,
    antialias: true,
  });

  map.on('style.load', () => {
    // Enable 3D terrain
    map.addSource('mapbox-dem', {
      type: 'raster-dem',
      url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
      tileSize: 512,
      maxzoom: 14,
    });

    map.setTerrain({ source: 'mapbox-dem', exaggeration: 1.5 });

    // Atmospheric fog
    map.setFog({
      color: 'rgb(186, 210, 235)',
      'high-color': 'rgb(36, 92, 223)',
      'horizon-blend': 0.02,
      'space-color': 'rgb(11, 11, 25)',
      'star-intensity': 0.6,
    });
  });

  return map;
}

// Convert altitude in meters to Mapbox mercator Z
export function altToMercatorZ(altMeters, lat) {
  const metersPerUnit = mapboxgl.MercatorCoordinate.fromLngLat(
    [0, lat],
    0
  ).meterInMercatorCoordinateUnits();
  return altMeters * metersPerUnit;
}
