import { POSE_FPS } from './constants.js';

const MEDIAPIPE_CDN =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm';

let poseLandmarker = null;
let latestLandmarks = null;
let running = false;

export function getLatestLandmarks() {
  return latestLandmarks;
}

export async function initPoseDetector(videoEl) {
  // Dynamically import MediaPipe vision module
  const vision = await import(
    'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/vision_bundle.mjs'
  );

  const { PoseLandmarker, FilesetResolver } = vision;

  const filesetResolver = await FilesetResolver.forVisionTasks(MEDIAPIPE_CDN);

  poseLandmarker = await PoseLandmarker.createFromOptions(filesetResolver, {
    baseOptions: {
      modelAssetPath:
        'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
      delegate: 'GPU',
    },
    runningMode: 'VIDEO',
    numPoses: 1,
  });

  running = true;
  detectLoop(videoEl);
}

function detectLoop(videoEl) {
  if (!running) return;

  if (videoEl.readyState >= 2) {
    const result = poseLandmarker.detectForVideo(videoEl, performance.now());
    if (result.landmarks && result.landmarks.length > 0) {
      latestLandmarks = result.landmarks[0];
    }
  }

  setTimeout(() => detectLoop(videoEl), 1000 / POSE_FPS);
}

export function stopPoseDetector() {
  running = false;
}
