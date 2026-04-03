// GENERATE USING AI

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

// isMobileNow / getMobileDistance are functions, not constants.
// window.innerWidth changes on device orientation flip or browser resize.
// A constant computed at load time would permanently lock the value to the initial viewport,
// giving the wrong camera depth after the user rotates their phone or resizes the window.
const isMobileNow = () => window.innerWidth < MOBILE_WIDTH_THRESHOLD;
const getMobileDistance = () =>
  isMobileNow() ? FIXED_CAMERA_DISTANCE_MOBILE : FIXED_CAMERA_DISTANCE_DESKTOP;

// Calculate FIXED HORIZONTAL FOV once, using the clamped aspect ratio.
// This acts as the anchor for all future resize math: instead of re-deriving from the
// vertical FOV on every resize (which drifts due to floating-point round trips), we lock
// the horizontal angle once and back-calculate the vertical FOV from it each time.
const FIXED_HORIZONTAL_FOV =
  2 *
  Math.atan(
    Math.tan((INITIAL_FOV * Math.PI) / 360) *
      Math.min(window.innerWidth / window.innerHeight, MAX_ASPECT_RATIO),
  ) *
  (180 / Math.PI);

// Global state variables for lifecycle management
let scene, camera, renderer, controls, sunLight, moon, observer;
let isInitialized = false;
let isVisible = false;
let currentScrollY = 0;
let autoRotationY = 0;
let moonBaseScale = MOON_INITIAL_SCALE;

// null is used instead of 0 because 0 is a valid frame ID returned by requestAnimationFrame.
// Checking (animationFrameId !== null) is therefore unambiguous; checking (animationFrameId)
// would incorrectly treat frame 0 as "no active animation".
let animationFrameId = null;

const moonRoot = document.getElementById("moonRoot");

// ===================== CORE INITIALIZATION =====================
// This function only runs when the element actually nears the viewport.
async function initThreeJS() {
  if (isInitialized) return;
  console.log("LAZY INITIALIZING 3D ENVIRONMENT");

  // Dynamic imports defer the entire three.js bundle until this function is called.
  // If the moon never enters the viewport (e.g. the user never scrolls that far), the
  // browser never downloads, parses, or compiles three.js — a significant saving on
  // initial page load, especially on mobile connections.
  // Promise.all fetches both modules in parallel rather than waiting for one before the other.
  const [THREE, { OrbitControls }] = await Promise.all([
    import("three"),
    import("three/addons/controls/OrbitControls.js"),
  ]);

  // Setup Scene
  // Creates the main 3D environment where everything will live.
  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(
    INITIAL_FOV,
    window.innerWidth / window.innerHeight,
    NEAR_CLIP,
    FAR_CLIP,
  );

  // FIXED CAMERA DISTANCE → moon size is controlled by width, not height.
  camera.position.set(0, 0, getMobileDistance());

  // WebGLRenderer Configuration
  // antialias: true -> Smooths jagged edges. Costs minor GPU overhead.
  // alpha: true -> Makes the canvas background transparent so HTML/CSS underneath shows through.
  // depth: true -> Enables the Z-buffer, ensuring polygons in front hide polygons in back.
  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    stencil: false,
    depth: true,
    powerPreference: "high-performance", // ASTRO OPTIMIZATION: Requests dedicated GPU
  });

  // Set initial size and canvas quality.
  // min(devicePixelRatio, 2) prevents high-density screens (like 3x iPhones) from rendering too many pixels and tanking frame rates.
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  // toneMapping controls how high dynamic range (HDR) colors are compressed to standard screens.
  // ACESFilmicToneMapping is the industry standard for realistic cinematic lighting.
  // Other options: THREE.NoToneMapping (flat), THREE.LinearToneMapping, THREE.ReinhardToneMapping.
  renderer.toneMapping = THREE.ACESFilmicToneMapping;

  // toneMappingExposure scales overall brightness before the tone curve is applied.
  // 1.0 is neutral. HIGHER brightens the scene before compression; LOWER darkens it.
  renderer.toneMappingExposure = 1.0;

  moonRoot.appendChild(renderer.domElement);

  // OrbitControls setup
  // Allows mouse drag to orbit around the moon without affecting camera position directly.
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; // Adds physical inertia/glide to the rotation.
  controls.enableZoom = false; // Disabled because you built custom wheel/touch scaling.
  controls.enablePan = false; // Prevents right-click dragging the moon off-center.

  // Lighting setup
  sunLight = new THREE.DirectionalLight(SUN_LIGHT_COLOR, SUN_LIGHT_INTENSITY);
  sunLight.position.set(
    SUN_LIGHT_POSITION.x,
    SUN_LIGHT_POSITION.y,
    SUN_LIGHT_POSITION.z,
  );
  scene.add(sunLight);

  // A DirectionalLight always points from its position toward its target object.
  // The target defaults to position (0,0,0) which is correct, but it must be part of
  // the scene graph for Three.js to compute its world matrix each frame. Without
  // scene.add(sunLight.target), any calls to sunLight.target.position.set() are silently
  // ignored by the renderer and the light direction never changes.
  scene.add(sunLight.target);

  scene.add(
    new THREE.AmbientLight(AMBIENT_LIGHT_COLOR, AMBIENT_LIGHT_INTENSITY),
  );

  const currentAgePercent = getCurrentMoonData().lunarAgePercent;
  setMoonPhase(currentAgePercent);

  // Load the custom Moon 3D model into the scene
  moon = new Moon(scene, () => {
    console.log("3D Moon loaded");
    updateMoonScale(0); // Apply initial scale once loaded
  });

  isInitialized = true;
  window.toggleMoon = (val) => moon?.setVisibility?.(val);
}

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

// ===================== RENDER LOOP =====================
// Main rendering loop (executes up to 60/120 times per second depending on monitor refresh rate)
function animate() {
  if (!isVisible || !isInitialized) return; // Hard kill switch if off-screen or not loaded.

  if (moon?.mesh) {
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
  animationFrameId = requestAnimationFrame(animate);
}

// ===================== EVENT LISTENERS =====================

// Stored as a named reference so it can be explicitly removed during cleanup.
// An anonymous function passed to addEventListener cannot be removed with removeEventListener later.
const onScroll = () => {
  currentScrollY = window.scrollY;
};

// Scroll listener
// { passive: true } tells the browser this listener won't call preventDefault(), allowing hardware-accelerated scrolling.
window.addEventListener("scroll", onScroll, { passive: true });

// IntersectionObserver acts as a performance guard AND a true lazy-loader.
if (moonRoot) {
  // Stored in the outer scope so cleanupThreeJS can call observer.disconnect().
  observer = new IntersectionObserver(
    (entries) => {
      isVisible = entries[0].isIntersecting;

      if (isVisible) {
        if (!isInitialized) {
          // initThreeJS is async due to dynamic imports. animate() is chained via .then()
          // so the render loop only starts after the scene is fully built.
          initThreeJS().then(() => animate());
        } else {
          animate(); // Re-ignite loop when visible.
        }
      } else if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId); // Explicitly stop frame requests
        animationFrameId = null;
      }
    },
    // rootMargin "500px" tells it to start loading 500px BEFORE it enters the screen, preventing load stutter.
    { threshold: VISIBILITY_THRESHOLD, rootMargin: "500px" },
  );

  observer.observe(moonRoot);
}

// ===================== RESIZE HANDLING =====================

// ResizeObserver watches the canvas container element directly rather than the window.
// This avoids spurious resize events triggered by the mobile browser's address bar
// sliding in and out during scroll — those change window.innerHeight but not the
// container dimensions, and would needlessly recalculate the projection matrix.
let resizeTimer = null;
const resizeObserver = new ResizeObserver(() => {
  // Debounce: wait until the resize gesture fully settles before recalculating.
  // Without this, dragging a window edge fires the callback hundreds of times per second,
  // thrashing updateProjectionMatrix and renderer.setSize on every intermediate pixel.
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(onContainerResize, 100);
});

if (moonRoot) resizeObserver.observe(moonRoot);

// Window resize execution
const onContainerResize = () => {
  if (!isInitialized) return;

  const width = window.innerWidth;
  const height = window.innerHeight;

  // 1. Update the physical aspect ratio.
  camera.aspect = width / height;

  // Math aspect is clamped to prevent massive FOV changes on ultra-wides
  const clampedAspect = Math.min(camera.aspect, MAX_ASPECT_RATIO);

  const tanHalfHoriz = Math.tan((FIXED_HORIZONTAL_FOV * Math.PI) / 360);
  camera.fov = 2 * Math.atan(tanHalfHoriz / clampedAspect) * (180 / Math.PI);

  // getMobileDistance() re-evaluates the current viewport width on every call, so the
  // camera distance correctly switches between mobile and desktop thresholds after a
  // resize or orientation change instead of staying locked to the value from page load.
  camera.position.z = getMobileDistance();
  camera.updateProjectionMatrix();

  renderer.setSize(width, height);
};

// User Input Interception (Mouse Wheel + Touch)
const profileImg = document.querySelector(".profileImage");

if (profileImg) {
  let touchStartY = 0;

  // Named handler references are required here for the same reason as onScroll above:
  // they must be individually removable during cleanup. They are stored on the element
  // itself to avoid extra module-level variables and to keep the handlers co-located
  // with the element they belong to.
  const onWheel = (event) => {
    if (!isInitialized) return;
    event.preventDefault(); // Stops the page from scrolling while zooming the moon.

    // event.deltaY > 0 means the user is pulling the wheel backwards (scroll down).
    const delta = event.deltaY > 0 ? -WHEEL_SCALE_STEP : WHEEL_SCALE_STEP;
    updateMoonScale(delta);
  };

  // Mobile: Record initial touch point
  const onTouchStart = (e) => {
    touchStartY = e.touches[0].clientY;
  };

  // Mobile: Calculate drag distance
  const onTouchMove = (e) => {
    if (!isInitialized) return;
    e.preventDefault(); // Prevents the browser from pulling the whole page down (refresh behavior) or scrolling.
    const currentY = e.touches[0].clientY;

    // Calculate pixel distance moved, then divide by sensitivity factor.
    const delta = (touchStartY - currentY) / TOUCH_SENSITIVITY;

    updateMoonScale(delta);

    // Reset origin to current point so the next frame calculates from here.
    touchStartY = currentY;
  };

  // Desktop: Intercept the physical mouse wheel
  profileImg.addEventListener("wheel", onWheel, { passive: false }); // Required to allow preventDefault().
  profileImg.addEventListener("touchstart", onTouchStart, { passive: true });
  profileImg.addEventListener("touchmove", onTouchMove, { passive: false });

  // Attach handler refs to the element so cleanupThreeJS can find and remove them.
  // Without this, each Astro page revisit would attach a fresh set of duplicate listeners
  // on top of the ones from the previous visit, multiplying scroll and wheel sensitivity.
  profileImg._moonHandlers = { onWheel, onTouchStart, onTouchMove };
}

// ===================== ASTRO MEMORY CLEANUP =====================
// Prevents memory leaks when navigating between pages in Astro (View Transitions).
const cleanupThreeJS = () => {
  if (!isInitialized) return;
  console.log("CLEANING UP 3D ENVIRONMENT");

  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }

  // Disconnect the IntersectionObserver — without this it keeps firing after cleanup and
  // would attempt to re-initialize or re-animate a scene that no longer exists.
  observer?.disconnect();

  // Disconnect the ResizeObserver and clear any debounce timer that hasn't fired yet.
  resizeObserver?.disconnect();
  clearTimeout(resizeTimer);

  window.removeEventListener("scroll", onScroll);

  // Remove the profileImg interaction listeners registered during init.
  // OrbitControls also attaches its own internal pointer and wheel listeners directly
  // to the canvas DOM element; controls.dispose() is the only way to remove those —
  // they are not accessible through any public API.
  if (profileImg?._moonHandlers) {
    const { onWheel, onTouchStart, onTouchMove } = profileImg._moonHandlers;
    profileImg.removeEventListener("wheel", onWheel);
    profileImg.removeEventListener("touchstart", onTouchStart);
    profileImg.removeEventListener("touchmove", onTouchMove);
    delete profileImg._moonHandlers;
  }

  if (moonRoot && renderer) {
    moonRoot.removeChild(renderer.domElement);
  }

  // dispose() must be called before nulling the ref — it needs the live controls object
  // to locate the DOM element it originally attached its internal listeners to.
  controls?.dispose();

  if (renderer) {
    renderer.dispose();
    renderer.forceContextLoss();
  }

  // Clear references to allow Garbage Collection
  scene = null;
  camera = null;
  renderer = null;
  controls = null;
  sunLight = null;
  moon = null;
  isInitialized = false;
};

// Named references allow these listeners to remove themselves after firing once.
// A listener stored anonymously would survive indefinitely, calling cleanupThreeJS()
// on every subsequent navigation even after the scene is already destroyed.
const onBeforeSwap = () => {
  cleanupThreeJS();
  document.removeEventListener("astro:before-swap", onBeforeSwap);
  window.removeEventListener("pagehide", onPageHide);
};

const onPageHide = () => {
  cleanupThreeJS();
  document.removeEventListener("astro:before-swap", onBeforeSwap);
  window.removeEventListener("pagehide", onPageHide);
};

// Listen for Astro's specific page swap event, or standard browser hide events
document.addEventListener("astro:before-swap", onBeforeSwap);
window.addEventListener("pagehide", onPageHide);
