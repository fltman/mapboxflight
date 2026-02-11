import {
  START_LNG,
  START_LAT,
  START_ALT,
  START_HEADING,
  FLAP_THRUST,
  MAX_SPEED,
  FRICTION,
  TURN_SPEED,
  CLIMB_RATE,
  MIN_ALTITUDE,
  MAX_ALTITUDE,
  LERP_FACTOR,
} from './constants.js';

export class FlightController {
  constructor() {
    this.lng = START_LNG;
    this.lat = START_LAT;
    this.altitude = START_ALT;
    this.heading = START_HEADING; // degrees
    this.speed = 0;
    this.wasFlapping = false;

    // Smoothed inputs
    this.smoothLean = 0;
    this.smoothVertical = 0;
  }

  update(poseInput) {
    const { flapping, lean, verticalInput } = poseInput;

    // Smooth inputs via lerp
    this.smoothLean += (lean - this.smoothLean) * LERP_FACTOR;
    this.smoothVertical += (verticalInput - this.smoothVertical) * LERP_FACTOR;

    // Thrust only on rising edge of flap (one impulse per flap)
    if (flapping && !this.wasFlapping) {
      this.speed = Math.min(this.speed + FLAP_THRUST, MAX_SPEED);
    }
    this.wasFlapping = flapping;

    // Friction
    this.speed *= FRICTION;

    // Turning
    this.heading += this.smoothLean * TURN_SPEED;
    // Normalize heading to 0-360
    this.heading = ((this.heading % 360) + 360) % 360;

    // Altitude
    this.altitude += this.smoothVertical * CLIMB_RATE;
    this.altitude = Math.max(MIN_ALTITUDE, Math.min(MAX_ALTITUDE, this.altitude));

    // Higher altitude = faster ground speed: 2x@3km, 5x@10km, 10x@20km, 20x@30km+
    const alt = this.altitude;
    let altFactor;
    if (alt <= 3000) {
      altFactor = 1 + 1 * ((alt - MIN_ALTITUDE) / (3000 - MIN_ALTITUDE));
    } else if (alt <= 10000) {
      altFactor = 2 + 3 * ((alt - 3000) / 7000);
    } else if (alt <= 20000) {
      altFactor = 5 + 5 * ((alt - 10000) / 10000);
    } else {
      altFactor = 10 + 10 * Math.min((alt - 20000) / 10000, 1);
    }

    // Move forward in heading direction
    const headingRad = (this.heading * Math.PI) / 180;
    this.lng += Math.sin(headingRad) * this.speed * altFactor;
    this.lat += Math.cos(headingRad) * this.speed * altFactor;
  }

  getState() {
    return {
      lng: this.lng,
      lat: this.lat,
      altitude: this.altitude,
      heading: this.heading,
      speed: this.speed,
    };
  }
}
