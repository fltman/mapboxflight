import mapboxgl from 'mapbox-gl';
import { altToMercatorZ } from './map-setup.js';

export function updateCamera(map, state) {
  const { lng, lat, altitude, heading } = state;

  const mercatorPos = mapboxgl.MercatorCoordinate.fromLngLat(
    [lng, lat],
    altitude
  );

  const camera = new mapboxgl.FreeCameraOptions();
  camera.position = mercatorPos;

  // Look at a point ahead on the ground
  const lookDist = 0.01; // ~1 km ahead
  const headingRad = (heading * Math.PI) / 180;
  const lookLng = lng + Math.sin(headingRad) * lookDist;
  const lookLat = lat + Math.cos(headingRad) * lookDist;

  camera.lookAtPoint([lookLng, lookLat]);

  map.setFreeCameraOptions(camera);
}
