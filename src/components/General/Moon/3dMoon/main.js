// GENERATE USING AI

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { Moon } from "./moon.js";
import { getCurrentMoonData } from "@utils/currentMoonData.js";

console.log("SETTING UP");

/* ====================== TWEAKABLE OPTIONS ======================
   All values you can safely change are listed here.
   Feel free to modify them in the future.
   No other logic has been changed.
*/

// Mobile detection threshold (in pixels)
// HIGHER: Treats larger screens (like tablets) as mobile devices.
// LOWER: Strictly forces only small phones into the mobile layout.
const MOBILE_WIDTH_THRESHOLD = 500;

// Maximum aspect ratio clamp for ultra-wide monitors.
// 16:9 monitors are ~1.77. Setting this to 1.8 prevents ultra-wide monitors (21:9)
// from forcing the vertical FOV too low and blowing up the moon size.
const MAX_ASPECT_RATIO = 1.8;

// Camera settings
// INITIAL_FOV (Field of View in degrees)
// HIGHER (> 60): Wider camera angle. The moon will appear smaller, and edge distortion (fisheye) increases.
// LOWER (< 30): Narrower camera angle. The moon will appear larger, flattening the 3D perspective (orthographic feel).
const INITIAL_FOV = 45;

// NEAR_CLIP / FAR_CLIP (Frustum rendering limits)
// Objects closer than NEAR_CLIP or further than FAR_CLIP are not rendered by the GPU.
// NEAR HIGHER: Risks slicing the front off the moon if the camera gets too close.
// FAR LOWER: Risks the moon disappearing if it scales or moves too far back.
const NEAR_CLIP = 0.1;
const FAR_CLIP = 1000;

// Moon size & distance (Controls how big the moon appears relative to the camera)
// Technically, this moves the camera backward/forward on the Z-axis.
// HIGHER: Camera moves further back -> Moon looks smaller.
// LOWER: Camera moves closer -> Moon looks larger.
const FIXED_CAMERA_DISTANCE_MOBILE = 4.2;
const FIXED_CAMERA_DISTANCE_DESKTOP = 2.7;

// Lighting
// Colors must be in hex format (0xRRGGBB).
const SUN_LIGHT_COLOR = 0xfff8f0; // Warm white.

// SUN_LIGHT_INTENSITY
// HIGHER: Washes out the texture details, making the moon bright white.
// LOWER: Makes the lit side of the moon dim and muddy.
const SUN_LIGHT_INTENSITY = 3.1;

// SUN_LIGHT_POSITION (Vector3)
// Dictates the angle of the light before the phase logic overrides it.
const SUN_LIGHT_POSITION = { x: 5, y: 3, z: 2 };

// AMBIENT_LIGHT_COLOR / INTENSITY
// Ambient light hits all surfaces equally. It prevents the dark side of the moon from being pitch black (0x000000).
// HIGHER: Removes shadows entirely, destroying the 3D depth illusion.
// LOWER (near 0): The unlit side of the moon becomes pure black.
const AMBIENT_LIGHT_COLOR = 0x1a2a4a; // Deep space blue.
const AMBIENT_LIGHT_INTENSITY = 0.048;

// Moon phase light settings
// PHASE_LIGHT_RADIUS: Distance of the directional sunlight from the 0,0,0 origin.
// Because it's a DirectionalLight, distance doesn't affect falloff/brightness, just the calculation angle.
const PHASE_LIGHT_RADIUS = 5;

// Animation & interaction speeds
// AUTO_ROTATION_SPEED (Radians per frame)
// HIGHER: Moon spins like a top.
// LOWER: Barely noticeable drift. Negative values reverse the spin direction.
const AUTO_ROTATION_SPEED = 0.002;

// SCROLL_ROTATION_MULTIPLIER (Radians per pixel scrolled)
// HIGHER: Scrolling causes rapid, dizzying spins.
// LOWER: Scrolling has a subtle, weighty effect on rotation.
const SCROLL_ROTATION_MULTIPLIER = 0.005;

// SCROLL_TILT_MULTIPLIER
// HIGHER: Moon flips heavily over the X-axis (somersaults) as you scroll.
// LOWER: Moon stays relatively locked to the Y-axis spin.
const SCROLL_TILT_MULTIPLIER = 0.001;

// User scaling limits (Multiplier applied to the base geometry)
// Prevents the user from shrinking the moon to a microscopic dot or blowing it up past the viewport.
const MOON_SCALE_MIN = 0.3;
const MOON_SCALE_MAX = 2.0;
const MOON_INITIAL_SCALE = 1.0;

// Touch drag sensitivity (Used as a Divisor)
// COUNTER-INTUITIVE WARNING: Because this divides the touch delta, a HIGHER value makes scaling SLOWER.
// HIGHER (e.g., 500): Requires long finger swipes to scale.
// LOWER (e.g., 50): A tiny swipe will blow the moon up instantly.
const TOUCH_SENSITIVITY = 180;

// Wheel scroll sensitivity
// HIGHER: One mouse wheel click scales the moon drastically.
// LOWER: Requires aggressive scrolling to see size changes.
const WHEEL_SCALE_STEP = 0.05;

// Visibility threshold for IntersectionObserver
// 0.01 = 1% of the canvas must be visible to trigger the animation loop.
// HIGHER (e.g., 1.0): The entire canvas must be on screen, or the animation pauses.
const VISIBILITY_THRESHOLD = 0.01;

// ============================================================

const isMobile = window.innerWidth < MOBILE_WIDTH_THRESHOLD;

// Setup Scene
// Creates the main 3D environment where everything will live.
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  INITIAL_FOV,
  window.innerWidth / window.innerHeight,
  NEAR_CLIP,
  FAR_CLIP,
);

// FIXED CAMERA DISTANCE → moon size is controlled by width, not height.
const FIXED_CAMERA_DISTANCE = isMobile
  ? FIXED_CAMERA_DISTANCE_MOBILE
  : FIXED_CAMERA_DISTANCE_DESKTOP;

camera.position.set(0, 0, FIXED_CAMERA_DISTANCE);

// Calculate FIXED HORIZONTAL FOV once, using the clamped aspect ratio.
const initialAspect = window.innerWidth / window.innerHeight;
const clampedInitialAspect = Math.min(initialAspect, MAX_ASPECT_RATIO);

const FIXED_HORIZONTAL_FOV =
  2 *
  Math.atan(Math.tan((INITIAL_FOV * Math.PI) / 360) * clampedInitialAspect) *
  (180 / Math.PI);

// WebGLRenderer Configuration
// antialias: true -> Smooths jagged edges. Costs minor GPU overhead.
// alpha: true -> Makes the canvas background transparent so HTML/CSS underneath shows through.
// depth: true -> Enables the Z-buffer, ensuring polygons in front hide polygons in back.
const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: true,
  stencil: false,
  depth: true,
});

// Set initial size and canvas quality.
// min(devicePixelRatio, 2) prevents high-density screens (like 3x iPhones) from rendering too many pixels and tanking frame rates.
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// toneMapping controls how high dynamic range (HDR) colors are compressed to standard screens.
// ACESFilmicToneMapping is the industry standard for realistic cinematic lighting.
// Other options: THREE.NoToneMapping (flat), THREE.LinearToneMapping, THREE.ReinhardToneMapping.
renderer.toneMapping = THREE.ACESFilmicToneMapping;

const moonRoot = document.getElementById("moonRoot");
moonRoot.appendChild(renderer.domElement);

// OrbitControls setup
// Allows mouse drag to orbit around the moon without affecting camera position directly.
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; // Adds physical inertia/glide to the rotation.
controls.enableZoom = false; // Disabled because you built custom wheel/touch scaling.
controls.enablePan = false; // Prevents right-click dragging the moon off-center.

// Lighting setup
const sunLight = new THREE.DirectionalLight(
  SUN_LIGHT_COLOR,
  SUN_LIGHT_INTENSITY,
);
sunLight.position.set(
  SUN_LIGHT_POSITION.x,
  SUN_LIGHT_POSITION.y,
  SUN_LIGHT_POSITION.z,
);
scene.add(sunLight);
scene.add(new THREE.AmbientLight(AMBIENT_LIGHT_COLOR, AMBIENT_LIGHT_INTENSITY));

// Dynamic Phase Controller
// Translates a percentage (0 to 1) into a 360-degree orbit for the sunLight around the moon.
const setMoonPhase = (input) => {
  let p =
    typeof input === "string"
      ? parseFloat(input.replace("%", "")) / 100
      : input;

  // Clamps value strictly between 0 and 1.
  p = p % 1;
  if (p < 0) p += 1;

  // offset offsets the light so phase 0 starts at the correct side.
  const offset = -Math.PI / 2;
  const angle = p * Math.PI * 2 + offset;
  const radius = PHASE_LIGHT_RADIUS;

  // Orbit the light source around the Y-axis using basic trigonometry.
  if (sunLight) {
    sunLight.position.x = -Math.cos(angle) * radius;
    sunLight.position.z = Math.sin(angle) * radius;
    sunLight.position.y = 0;
    sunLight.target.position.set(0, 0, 0); // Forces the light to always point directly at the moon center.
  }
};

const currentAgePercent = getCurrentMoonData().lunarAgePercent;
setMoonPhase(currentAgePercent);

// Load the custom Moon 3D model into the scene
const moon = new Moon(scene, () => {
  console.log("3D Moon loaded");
});

// Moon scale tracking
let moonBaseScale = MOON_INITIAL_SCALE;

const updateMoonScale = (delta) => {
  // Math.max/min clamps the final scale strictly between the defined limits.
  moonBaseScale = Math.max(
    MOON_SCALE_MIN,
    Math.min(MOON_SCALE_MAX, moonBaseScale + delta),
  );

  if (moon?.mesh) {
    // setScalar applies the scale uniformly to X, Y, and Z.
    moon.mesh.scale.setScalar(moonBaseScale);
  }
};

updateMoonScale(0);

let currentScrollY = 0;
let autoRotationY = 0;
let isVisible = true;

// Scroll listener
// { passive: true } tells the browser this listener won't call preventDefault(), allowing hardware-accelerated scrolling.
window.addEventListener(
  "scroll",
  () => {
    currentScrollY = window.scrollY;
  },
  { passive: true },
);

window.toggleMoon = (val) => moon.setVisibility?.(val);

// IntersectionObserver acts as a performance guard.
// If the canvas div is scrolled out of view, it immediately halts the heavy animate() loop.
const observer = new IntersectionObserver(
  (entries) => {
    isVisible = entries[0].isIntersecting;
    if (isVisible) animate(); // Re-ignite loop when visible.
  },
  { threshold: VISIBILITY_THRESHOLD },
);

observer.observe(moonRoot);

// Main rendering loop (executes up to 60/120 times per second depending on monitor refresh rate)
function animate() {
  if (!isVisible) return; // Hard kill switch if off-screen.

  if (moon.mesh) {
    // Add continuous base spin.
    autoRotationY += AUTO_ROTATION_SPEED;

    // Combine base spin with scroll-driven rotation.
    moon.mesh.rotation.y =
      autoRotationY + currentScrollY * SCROLL_ROTATION_MULTIPLIER;
    moon.mesh.rotation.x = currentScrollY * SCROLL_TILT_MULTIPLIER;
  }

  // Required for enableDamping to glide smoothly.
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

animate();

// Window resize execution
window.addEventListener("resize", () => {
  const width = window.innerWidth;
  const height = window.innerHeight;

  // 1. Update the physical aspect ratio.
  camera.aspect = width / height;

  // Math aspect is clamped to prevent massive FOV changes on ultra-wides
  const clampedAspect = Math.min(camera.aspect, MAX_ASPECT_RATIO);

  const tanHalfHoriz = Math.tan((FIXED_HORIZONTAL_FOV * Math.PI) / 360);
  camera.fov = 2 * Math.atan(tanHalfHoriz / clampedAspect) * (180 / Math.PI);

  camera.position.z = FIXED_CAMERA_DISTANCE;
  camera.updateProjectionMatrix();

  renderer.setSize(width, height);
});

// User Input Interception (Mouse Wheel + Touch)
const profileImg = document.querySelector(".profileImage");

if (profileImg) {
  let touchStartY = 0;

  // Desktop: Intercept the physical mouse wheel
  profileImg.addEventListener(
    "wheel",
    (event) => {
      event.preventDefault(); // Stops the page from scrolling while zooming the moon.

      // event.deltaY > 0 means the user is pulling the wheel backwards (scroll down).
      const delta = event.deltaY > 0 ? -WHEEL_SCALE_STEP : WHEEL_SCALE_STEP;
      updateMoonScale(delta);
    },
    { passive: false }, // Required to allow preventDefault().
  );

  // Mobile: Record initial touch point
  profileImg.addEventListener(
    "touchstart",
    (e) => {
      touchStartY = e.touches[0].clientY;
    },
    { passive: true },
  );

  // Mobile: Calculate drag distance
  profileImg.addEventListener(
    "touchmove",
    (e) => {
      e.preventDefault(); // Prevents the browser from pulling the whole page down (refresh behavior) or scrolling.
      const currentY = e.touches[0].clientY;

      // Calculate pixel distance moved, then divide by sensitivity factor.
      const delta = (touchStartY - currentY) / TOUCH_SENSITIVITY;

      updateMoonScale(delta);

      // Reset origin to current point so the next frame calculates from here.
      touchStartY = currentY;
    },
    { passive: false },
  );
}
