const altEl = document.getElementById('hud-altitude');
const speedEl = document.getElementById('hud-speed');
const headingEl = document.getElementById('hud-heading');
const actionEl = document.getElementById('hud-action');
const compassRing = document.getElementById('compass-ring');

export function updateHUD(flightState, poseInput) {
  altEl.textContent = `Alt: ${Math.round(flightState.altitude)} m`;
  speedEl.textContent = `Speed: ${(flightState.speed * 100000).toFixed(1)}`;
  headingEl.innerHTML = `Heading: ${Math.round(flightState.heading)}&deg;`;
  compassRing.style.transform = `rotate(${-flightState.heading}deg)`;

  const actions = [];
  if (poseInput.flapping) actions.push('Flapping');
  if (poseInput.lean > 0.2) actions.push('Right');
  else if (poseInput.lean < -0.2) actions.push('Left');
  if (poseInput.verticalInput > 0) actions.push('Climbing');
  else if (poseInput.verticalInput < 0) actions.push('Descending');

  actionEl.textContent = actions.length > 0 ? actions.join(' | ') : 'Gliding';
}

// Draw pose landmarks on the overlay canvas
const CONNECTIONS = [
  [11, 12], [11, 13], [13, 15], [12, 14], [14, 16],
  [11, 23], [12, 24], [23, 24], [23, 25], [25, 27],
  [24, 26], [26, 28],
];

export function drawPose(canvas, landmarks) {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (!landmarks) return;

  const w = canvas.width;
  const h = canvas.height;

  // Draw connections
  ctx.strokeStyle = 'rgba(0, 255, 128, 0.7)';
  ctx.lineWidth = 2;
  for (const [i, j] of CONNECTIONS) {
    const a = landmarks[i];
    const b = landmarks[j];
    ctx.beginPath();
    ctx.moveTo(a.x * w, a.y * h);
    ctx.lineTo(b.x * w, b.y * h);
    ctx.stroke();
  }

  // Draw key landmarks
  ctx.fillStyle = 'rgba(255, 80, 80, 0.9)';
  for (const idx of [11, 12, 15, 16, 23, 24]) {
    const lm = landmarks[idx];
    ctx.beginPath();
    ctx.arc(lm.x * w, lm.y * h, 4, 0, Math.PI * 2);
    ctx.fill();
  }
}
