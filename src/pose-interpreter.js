import {
  FLAP_THRESHOLD,
  LEAN_THRESHOLD,
  ARM_HEIGHT_MARGIN,
} from './constants.js';

// MediaPipe pose landmark indices
const LEFT_SHOULDER = 11;
const RIGHT_SHOULDER = 12;
const LEFT_HIP = 23;
const RIGHT_HIP = 24;
const LEFT_WRIST = 15;
const RIGHT_WRIST = 16;

// Flap state: detect high → low transition
let armsWereHigh = false;

export function interpretPose(landmarks) {
  if (!landmarks) {
    return { flapping: false, lean: 0, verticalInput: 0 };
  }

  const ls = landmarks[LEFT_SHOULDER];
  const rs = landmarks[RIGHT_SHOULDER];
  const lh = landmarks[LEFT_HIP];
  const rh = landmarks[RIGHT_HIP];
  const lw = landmarks[LEFT_WRIST];
  const rw = landmarks[RIGHT_WRIST];

  // --- Flap detection: arms high → low = one flap ---
  const shoulderAvgY = (ls.y + rs.y) / 2;
  const wristAvgY = (lw.y + rw.y) / 2;
  const armsHigh = wristAvgY < shoulderAvgY - FLAP_THRESHOLD;
  const armsLow = wristAvgY > shoulderAvgY + FLAP_THRESHOLD;

  let flapping = false;
  if (armsHigh) {
    armsWereHigh = true;
  } else if (armsLow && armsWereHigh) {
    flapping = true;
    armsWereHigh = false;
  }

  // --- Lean detection ---
  const shoulderMidX = (ls.x + rs.x) / 2;
  const hipMidX = (lh.x + rh.x) / 2;
  const rawLean = shoulderMidX - hipMidX; // positive = leaning right in camera
  // Note: webcam is mirrored, so positive rawLean = user leaning LEFT
  // We invert so positive lean = turn right from user's perspective
  let lean = 0;
  if (Math.abs(rawLean) > LEAN_THRESHOLD) {
    lean = -rawLean / 0.15; // normalize to roughly -1..1
    lean = Math.max(-1, Math.min(1, lean));
  }

  // --- Vertical input (reuse shoulderAvgY / wristAvgY from above) ---
  let verticalInput = 0;
  // In MediaPipe, Y increases downward
  if (wristAvgY < shoulderAvgY - ARM_HEIGHT_MARGIN) {
    verticalInput = 1; // arms above shoulders → climb
  } else if (wristAvgY > shoulderAvgY + ARM_HEIGHT_MARGIN) {
    verticalInput = -1; // arms below shoulders → descend
  }

  return { flapping, lean, verticalInput };
}
