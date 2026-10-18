// Keep the engraved plaza and surface-mounted props in the same local layout.
// Rebuild curved geometry at these dimensions; scaling a curved patch would
// pull its vertices away from the Moon surface.
export const PLAZA_SCALE = 0.875;
export const PLAZA_DIAMETER = 0.7 * PLAZA_SCALE;
export const HABITAT_SCALE = 0.84;
export const ROVER_SCALE = 0.79;
export const ROCKET_SCALE = 0.93;
// Keep her established size; give him a further subtle 1.8% height increase.
const HEIGHT_RATIO = 5.7 / 6.2;
export const ASTRONAUT_SCALES = {
  boy: (1.6 / (1 + HEIGHT_RATIO)) * 1.018,
  girl: (1.6 * HEIGHT_RATIO) / (1 + HEIGHT_RATIO),
};
export const HABITAT_POSITION = {
  x: 0.27 * PLAZA_SCALE,
  y: 0.29 * PLAZA_SCALE,
};
export const ROCKET_POSITION = { x: -0.33 * PLAZA_SCALE, y: 0.1 * PLAZA_SCALE };
