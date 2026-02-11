// Starting location: Stockholm
export const START_LNG = 18.07;
export const START_LAT = 59.325;
export const START_ALT = 3000; // meters
export const START_HEADING = 180; // degrees, south

// Flight physics
export const FLAP_THRUST = 0.00002;
export const MAX_SPEED = 0.0003;
export const FRICTION = 0.995;
export const TURN_SPEED = 0.5; // degrees per frame
export const CLIMB_RATE = 3; // meters per frame
export const MIN_ALTITUDE = 200;
export const MAX_ALTITUDE = 100000;

// Smoothing
export const LERP_FACTOR = 0.03;

// Pose detection
export const POSE_FPS = 15;

// Flap detection
export const FLAP_HISTORY_LENGTH = 8;
export const FLAP_THRESHOLD = 0.03; // min wrist Y oscillation amplitude

// Lean detection
export const LEAN_THRESHOLD = 0.04; // min X offset for turning

// Arm height detection
export const ARM_HEIGHT_MARGIN = 0.03; // how far above/below shoulders wrists must be
