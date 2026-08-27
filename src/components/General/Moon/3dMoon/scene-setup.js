// GENERATE USING AI

import { getCurrentMoonData } from "@utils/currentMoonData.js";

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
const INITIAL_FOV = 40;

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
const FIXED_CAMERA_DISTANCE_MOBILE = 3.95;
const FIXED_CAMERA_DISTANCE_DESKTOP = 3.1;

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
const AUTO_ROTATION_SPEED = 0.0032;

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

// Minimum duration (ms) the loader ring stays visible before it is allowed to fade out.
// Prevents a jarring instant-dismiss on fast devices where textures load nearly immediately.
// The fade-out itself adds an additional ~600ms of graceful transition on top of this floor.
const LOADER_MIN_DISPLAY_MS = 2800;

// ============================================================

// isMobileNow / getMobileDistance are functions, not constants.
// window.innerWidth changes on device orientation flip or browser resize.
// A constant computed at load time would permanently lock the value to the initial viewport,
// giving the wrong camera depth after the user rotates their phone or resizes the window.
const isMobileNow = () => window.innerWidth < MOBILE_WIDTH_THRESHOLD;
const getMobileDistance = () =>
  isMobileNow() ? FIXED_CAMERA_DISTANCE_MOBILE : FIXED_CAMERA_DISTANCE_DESKTOP;

// Horizontal FOV is locked at init time (not module load) so a resize before the
// IntersectionObserver fires still uses the viewport at the moment Three starts.
let fixedHorizontalFov = null;

const computeFixedHorizontalFov = () =>
  2 *
  Math.atan(
    Math.tan((INITIAL_FOV * Math.PI) / 360) *
      Math.min(window.innerWidth / window.innerHeight, MAX_ASPECT_RATIO),
  ) *
  (180 / Math.PI);

// Global state variables for lifecycle management
let scene, camera, renderer, controls, sunLight, moon, observer;
let isInitialized = false;
let isInitializing = false;
let disposeRequested = false;
let initTimeoutId = null;
let isVisible = false;
let currentScrollY = 0;
let autoRotationY = 0;
let moonBaseScale = MOON_INITIAL_SCALE;

// null is used instead of 0 because 0 is a valid frame ID returned by requestAnimationFrame.
// Checking (animationFrameId !== null) is therefore unambiguous; checking (animationFrameId)
// would incorrectly treat frame 0 as "no active animation".
let animationFrameId = null;

// Re-queried in setupMoonLifecycle() so bfcache / Astro client nav get fresh DOM nodes.
let moonRoot = null;
let profileImg = null;

// ===================== ORBITAL LOADER =====================
// The loader ring is injected around .profileImage and removed only after the first
// fully rendered frame of the moon has been confirmed on screen (see onMoonReady).
// It uses an SVG orbital ellipse â€” a tilted planetary ring â€” with a small comet dot
// completing one slow orbit. The aesthetic references an orrery or armillary sphere:
// thin, precise, astronomical. The ellipse proportions (rx/ry ratio) mimic a ring
// viewed at ~30Â° inclination, matching the subtle tilt of a tulip's stem-to-cup angle.

// loaderStartTime records when the loader was injected so we can enforce the minimum
// display duration even when textures load faster than LOADER_MIN_DISPLAY_MS.
let loaderStartTime = 0;

// loaderEl holds the injected SVG wrapper so cleanupThreeJS can forcibly remove it
// during page transitions without waiting for the fade-out timer.
let loaderEl = null;
let loaderDismissTimeoutId = null;

// dismissLoader enforces the minimum display time then fades the loader out gracefully.
// It is safe to call multiple times â€” once loaderEl is null (already removed) it exits.
const dismissLoader = () => {
  loaderEl = document.querySelector("#profilePicContainer > .moonLoader");
  if (!loaderEl) return;

  const elapsed = performance.now() - loaderStartTime;
  const remaining = Math.max(0, LOADER_MIN_DISPLAY_MS - elapsed);

  clearTimeout(loaderDismissTimeoutId);
  loaderDismissTimeoutId = setTimeout(() => {
    loaderDismissTimeoutId = null;
    if (!loaderEl) return; // Guard: may have been force-removed by cleanupThreeJS.

    // CSS transition on opacity triggers the fade. The element is physically removed
    // from the DOM only after the transition ends to avoid a jarring snap-to-gone.
    loaderEl.style.transition = "opacity 0.6s ease-out";
    loaderEl.style.opacity = "0";

    loaderEl.addEventListener(
      "transitionend",
      () => {
        loaderEl?.remove();
        loaderEl = null;
      },
      { once: true },
    );
  }, remaining);
};

// onMoonReady is passed into the Moon constructor as its onComplete callback.
// Moon's worker.onmessage calls it after scene.add(mesh) â€” confirming the mesh is in the
// scene graph and textures are on the GPU â€” but before a frame has been painted.
// We therefore defer the actual loader dismissal until after the next renderer.render()
// call has completed and requestAnimationFrame has fired, which is the earliest moment
// a real pixel from the moon has reached the screen.
// A double-rAF is used (rAF inside rAF) because a single rAF fires at the START of the
// next paint cycle â€” the frame is not composited yet. The inner rAF fires at the start
// of the frame AFTER the paint, guaranteeing the previous frame (containing the moon)
// has been shown to the user before the loader begins its fade.
const onMoonReady = () => {
  if (disposeRequested) return;
  updateMoonScale(0); // Apply initial scale once loaded.

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      if (!disposeRequested) dismissLoader();
    });
  });
};

const disposeGpuResources = () => {
  if (moonRoot && renderer?.domElement?.parentNode === moonRoot) {
    moonRoot.removeChild(renderer.domElement);
  }

  // dispose() must be called before nulling the ref â€” it needs the live controls object
  // to locate the DOM element it originally attached its internal listeners to.
  controls?.dispose();

  // moon.dispose() removes the mesh from the scene and releases all GPU-side resources
  // (textures, material, geometry). Without this, each page navigation leaks ~3 texture
  // uploads and a geometry buffer on the GPU.
  moon?.dispose();

  if (renderer) {
    renderer.dispose();
    renderer.forceContextLoss();
  }

  scene = null;
  camera = null;
  renderer = null;
  controls = null;
  sunLight = null;
  moon = null;
  isInitialized = false;
  isInitializing = false;
  fixedHorizontalFov = null;
};

// ===================== CORE INITIALIZATION =====================
// This function only runs when the element actually nears the viewport.
async function initThreeJS() {
  if (isInitialized || isInitializing || disposeRequested) return;
  isInitializing = true;

  try {
    // Three.js core, OrbitControls, and Moon are loaded only after the visibility gate
    // fires so the homepage does not pay for WebGL until the moon is near the viewport.
    const [
      {
        PerspectiveCamera,
        Scene,
        DirectionalLight,
        AmbientLight,
        WebGLRenderer,
        ACESFilmicToneMapping,
      },
      { OrbitControls },
      { Moon },
    ] = await Promise.all([
      import("three"),
      import("three/addons/controls/OrbitControls.js"),
      import("./moon.js"),
    ]);

    if (disposeRequested) {
      return;
    }

    fixedHorizontalFov = computeFixedHorizontalFov();

    // Setup Scene
    // Creates the main 3D environment where everything will live.
    scene = new Scene();

    camera = new PerspectiveCamera(
      INITIAL_FOV,
      window.innerWidth / window.innerHeight,
      NEAR_CLIP,
      FAR_CLIP,
    );

    // FIXED CAMERA DISTANCE â†’ moon size is controlled by width, not height.
    camera.position.set(0, 0, getMobileDistance());

    // WebGLRenderer Configuration
    // antialias: true -> Smooths jagged edges. Costs minor GPU overhead.
    // alpha: true -> Makes the canvas background transparent so HTML/CSS underneath shows through.
    // depth: true -> Enables the Z-buffer, ensuring polygons in front hide polygons in back.
    renderer = new WebGLRenderer({
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
    renderer.toneMapping = ACESFilmicToneMapping;

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
    sunLight = new DirectionalLight(SUN_LIGHT_COLOR, SUN_LIGHT_INTENSITY);
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

    scene.add(new AmbientLight(AMBIENT_LIGHT_COLOR, AMBIENT_LIGHT_INTENSITY));

    const currentAgePercent = getCurrentMoonData().lunarAgePercent;
    setMoonPhase(currentAgePercent);

    // Load the custom Moon 3D model into the scene.
    // onMoonReady is used instead of an inline callback so the loader dismissal is tied
    // to a confirmed painted frame rather than to scene.add() â€” see onMoonReady() above.
    moon = new Moon(scene, onMoonReady);

    isInitialized = true;
    window.toggleMoon = (val) => moon?.setVisibility?.(val);

    // Teardown requested while we were awaiting imports / constructing the scene.
    if (disposeRequested) {
      disposeGpuResources();
    }
  } catch (err) {
    console.error("Failed to initialize 3D moon:", err);
    dismissLoader();
  } finally {
    isInitializing = false;
  }
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
    sunLight.position.x = Math.cos(angle) * radius;
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
  if (!isVisible || !isInitialized || disposeRequested) return; // Hard kill switch if off-screen or not loaded.

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

// IntersectionObserver acts as a performance guard AND a true lazy-loader.
const onVisibilityChange = (entries) => {
  isVisible = entries[0].isIntersecting;

  if (isVisible) {
    if (!isInitialized && !isInitializing) {
      clearTimeout(initTimeoutId);
      initTimeoutId = setTimeout(() => {
        initTimeoutId = null;
        initThreeJS().then(() => {
          if (!disposeRequested && isVisible) animate();
        });
      }, 10);
    } else if (isInitialized) {
      animate(); // Re-ignite loop when visible.
    }
  } else if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId); // Explicitly stop frame requests
    animationFrameId = null;
  }
};

// ===================== RESIZE HANDLING =====================

// ResizeObserver watches the canvas container element directly rather than the window.
// This avoids spurious resize events triggered by the mobile browser's address bar
// sliding in and out during scroll - those change window.innerHeight but not the
// container dimensions, and would needlessly recalculate the projection matrix.
let resizeTimer = null;
let resizeObserver = null;

// Window resize execution
const onContainerResize = () => {
  if (!isInitialized || fixedHorizontalFov == null) return;

  const width = window.innerWidth;
  const height = window.innerHeight;

  // 1. Update the physical aspect ratio.
  camera.aspect = width / height;

  // Math aspect is clamped to prevent massive FOV changes on ultra-wides
  const clampedAspect = Math.min(camera.aspect, MAX_ASPECT_RATIO);

  const tanHalfHoriz = Math.tan((fixedHorizontalFov * Math.PI) / 360);
  camera.fov = 2 * Math.atan(tanHalfHoriz / clampedAspect) * (180 / Math.PI);

  // getMobileDistance() re-evaluates the current viewport width on every call, so the
  // camera distance correctly switches between mobile and desktop thresholds after a
  // resize or orientation change instead of staying locked to the value from page load.
  camera.position.z = getMobileDistance();
  camera.updateProjectionMatrix();

  renderer.setSize(width, height);
};

const attachProfileInteraction = () => {
  if (!profileImg || profileImg._moonHandlers) return;

  let touchStartY = 0;

  // Named handler references are required for removable cleanup.
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
  profileImg._moonHandlers = { onWheel, onTouchStart, onTouchMove };
};

/**
 * (Re)bind DOM observers after first load, bfcache restore, or Astro client navigation.
 * Resets disposeRequested so initThreeJS can run again when #moonRoot is present.
 */
const setupMoonLifecycle = () => {
  moonRoot = document.getElementById("moonRoot");
  profileImg = document.querySelector(".profileImage");

  if (!moonRoot) return;

  disposeRequested = false;
  isVisible = false;

  // Scroll listener (idempotent remove+add)
  window.removeEventListener("scroll", onScroll);
  window.addEventListener("scroll", onScroll, { passive: true });

  observer?.disconnect();
  observer = new IntersectionObserver(onVisibilityChange, {
    threshold: VISIBILITY_THRESHOLD,
    rootMargin: "100px",
  });
  observer.observe(moonRoot);

  resizeObserver?.disconnect();
  resizeObserver = new ResizeObserver(() => {
    // Debounce: wait until the resize gesture fully settles before recalculating.
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(onContainerResize, 100);
  });
  resizeObserver.observe(moonRoot);

  attachProfileInteraction();
};

// ===================== ASTRO MEMORY CLEANUP =====================
// Prevents memory leaks when navigating between pages in Astro (View Transitions).
// Always clears observers/timers/DOM listeners; disposes GPU only if constructed.
const cleanupThreeJS = () => {
  disposeRequested = true;

  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }

  clearTimeout(initTimeoutId);
  initTimeoutId = null;
  clearTimeout(loaderDismissTimeoutId);
  loaderDismissTimeoutId = null;
  clearTimeout(resizeTimer);
  resizeTimer = null;

  // Disconnect the IntersectionObserver - without this it keeps firing after cleanup and
  // would attempt to re-initialize or re-animate a scene that no longer exists.
  observer?.disconnect();
  observer = null;

  // Disconnect the ResizeObserver and clear any debounce timer that hasn't fired yet.
  resizeObserver?.disconnect();
  resizeObserver = null;

  window.removeEventListener("scroll", onScroll);

  // Remove the profileImg interaction listeners registered during init.
  // OrbitControls also attaches its own internal pointer and wheel listeners directly
  // to the canvas DOM element; controls.dispose() is the only way to remove those -
  // they are not accessible through any public API.
  if (profileImg?._moonHandlers) {
    const { onWheel, onTouchStart, onTouchMove } = profileImg._moonHandlers;
    profileImg.removeEventListener("wheel", onWheel);
    profileImg.removeEventListener("touchstart", onTouchStart);
    profileImg.removeEventListener("touchmove", onTouchMove);
    delete profileImg._moonHandlers;
  }

  // Force-remove the loader immediately on page transition rather than waiting for its
  // fade-out timer. Leaving it in the DOM across a View Transition would cause it to
  // persist into the incoming page briefly before the old DOM is discarded.
  const liveLoader =
    loaderEl || document.querySelector("#profilePicContainer > .moonLoader");
  if (liveLoader) {
    liveLoader.remove();
    loaderEl = null;
  }

  if (isInitialized || renderer || moon) {
    disposeGpuResources();
  } else {
    isInitializing = false;
  }
};

// Keep lifecycle listeners for the whole session - cleanup must not remove them,
// or returning to the homepage (bfcache / client nav) can never re-bind the moon.
const onBeforeSwap = () => {
  cleanupThreeJS();
};

const onPageHide = () => {
  cleanupThreeJS();
};

const onPageLoad = () => {
  setupMoonLifecycle();
};

const onPageShow = (event) => {
  if (event.persisted) setupMoonLifecycle();
};

document.addEventListener("astro:before-swap", onBeforeSwap);
window.addEventListener("pagehide", onPageHide);
document.addEventListener("astro:page-load", onPageLoad);
window.addEventListener("pageshow", onPageShow);

setupMoonLifecycle();
