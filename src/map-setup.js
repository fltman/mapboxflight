import mapboxgl from 'mapbox-gl';
import { START_LNG, START_LAT, START_ALT, START_HEADING } from './constants.js';

export function createMap(token) {
  mapboxgl.accessToken = token;

  const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/standard-satellite',
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

    // Enable 3D buildings and landmarks via Standard style config
    try {
      map.setConfigProperty('basemap', 'show3dObjects', true);
    } catch (e) {
      // Fallback if config API not available
    }
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
