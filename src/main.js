import { createMap } from './map-setup.js';
import { initPoseDetector, getLatestLandmarks } from './pose-detector.js';
import { interpretPose } from './pose-interpreter.js';
import { FlightController } from './flight-controller.js';
import { updateCamera } from './camera-driver.js';
import { updateHUD, drawPose } from './hud.js';
import { updateNarration } from './narrator.js';

const token = import.meta.env.VITE_MAPBOX_TOKEN;
if (!token || token === 'YOUR_MAPBOX_TOKEN_HERE') {
  document.getElementById('start-screen').innerHTML =
    '<h1>MapboxFlight</h1><p style="color:#f88">Set VITE_MAPBOX_TOKEN in .env</p>';
  throw new Error('Missing Mapbox token');
}

const flight = new FlightController();

const videoEl = document.getElementById('webcam');
const poseCanvas = document.getElementById('pose-canvas');

let map = null;
let animating = false;

async function geocodeAddress(address) {
  const url = `https://api.mapbox.com/search/geocode/v6/forward?q=${encodeURIComponent(address)}&limit=1&access_token=${token}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.features && data.features.length > 0) {
    const [lng, lat] = data.features[0].geometry.coordinates;
    return { lng, lat };
  }
  return null;
}

document.getElementById('start-btn').addEventListener('click', async () => {
  // Geocode address if provided
  const addressInput = document.getElementById('address-input');
  const address = addressInput.value.trim();
  if (address) {
    const coords = await geocodeAddress(address);
    if (coords) {
      flight.lng = coords.lng;
      flight.lat = coords.lat;
    }
  }

  // Create map now (after user gesture, avoids blocking input)
  map = createMap(token);

  // Request webcam (needs user gesture)
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { width: 640, height: 480, facingMode: 'user' },
    audio: false,
  });
  videoEl.srcObject = stream;
  await videoEl.play();

  // Match canvas to video dimensions
  poseCanvas.width = videoEl.videoWidth;
  poseCanvas.height = videoEl.videoHeight;

  document.body.classList.add('flying');

  // Start pose detection (decoupled loop)
  await initPoseDetector(videoEl);

  // Start render loop
  animating = true;
  map.once('idle', () => {
    requestAnimationFrame(gameLoop);
  });
  // Also start immediately if map is already idle
  if (map.loaded()) {
    requestAnimationFrame(gameLoop);
  }
});

function gameLoop() {
  if (!animating) return;

  const landmarks = getLatestLandmarks();
  const poseInput = interpretPose(landmarks);

  flight.update(poseInput);
  const state = flight.getState();

  updateCamera(map, state);
  updateHUD(state, poseInput);
  drawPose(poseCanvas, landmarks);
  updateNarration(state);

  requestAnimationFrame(gameLoop);
}
