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
const INITIAL_FOV = 36;

// NEAR_CLIP / FAR_CLIP (Frustum rendering limits)
// Objects closer than NEAR_CLIP or further than FAR_CLIP are not rendered by the GPU.
// NEAR HIGHER: Risks slicing the front off the moon if the camera gets too close.
// FAR LOWER: Risks the moon disappearing if it scales or moves too far back.
const NEAR_CLIP = 0.1;
const FAR_CLIP = 1000;

// Moon size & distance (Controls how big the moon appears relative to the camera)
// Technically, this moves the camera backward/forward on the Z-axis.
// In the 250px container with 36 deg FOV, distance ~2.0 gives ~150px moon diameter.
const FIXED_CAMERA_DISTANCE_MOBILE = 2.05;
const FIXED_CAMERA_DISTANCE_DESKTOP = 2.0;

// Lighting — original warm-white sun + deep-space ambient.
const SUN_LIGHT_COLOR = 0xfff8f0; // Warm white.
const SUN_LIGHT_INTENSITY = 3.1;

const ROSE_GOLD_SUN_DATES = [
  { day: 28, month: 11 },
  { day: 20, month: 1 },
  { day: 19, month: 6 },
];
const ROSE_GOLD_SUN_COLOR = 0xffe4d4;

const isRoseGoldSunDay = () => {
  const now = new Date();
  const day = now.getDate();
  const month = now.getMonth() + 1;
  return ROSE_GOLD_SUN_DATES.some(
    (entry) => entry.day === day && entry.month === month,
  );
};

const getSunLightColor = () =>
  isRoseGoldSunDay() ? ROSE_GOLD_SUN_COLOR : SUN_LIGHT_COLOR;

// SUN_LIGHT_POSITION (Vector3)
// Dictates the angle of the light before the phase logic overrides it.
const SUN_LIGHT_POSITION = { x: 5, y: 3, z: 2 };

// AMBIENT_LIGHT_COLOR / INTENSITY
const AMBIENT_LIGHT_COLOR = 0x1a2a4a; // Deep space blue.
const AMBIENT_LIGHT_INTENSITY = 0.048;

// Soft fill opposite the sun (kept subtle so original gray albedo dominates).
const EARTHSHINE_COLOR = 0xa8b8d0;
const EARTHSHINE_INTENSITY = 0.08;

// Cool hemisphere fill — low so it does not recolor the moon.
const HEMI_SKY_COLOR = 0x1a2848;
const HEMI_GROUND_COLOR = 0x1a1c22;
const HEMI_INTENSITY = 0.04;

// Moon phase light settings
const PHASE_LIGHT_RADIUS = 5;

// Animation & interaction speeds
const AUTO_ROTATION_SPEED = 0.004;

// Intro handoff: ease from slightly undersized into moonBaseScale as the loader fades.
const INTRO_SCALE_FROM = 0.9;
const INTRO_DURATION_MS = 700;

// Idle breath — quieter scale, longer period.
const BREATH_AMPLITUDE = 0.008;
const BREATH_SPEED = 0.00085;

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

// Two-finger pinch sensitivity (Used as a Divisor)
// Same divisor logic as TOUCH_SENSITIVITY, but applied to the change in distance
// between the two touch points instead of a single-finger vertical swipe.
// HIGHER: Requires a bigger pinch gesture to scale the moon.
// LOWER: A small pinch will scale the moon quickly.
const PINCH_SENSITIVITY = 220;

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
const LOADER_MIN_DISPLAY_MS = 350;

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
let scene,
  camera,
  renderer,
  controls,
  sunLight,
  earthshineLight,
  hemiLight,
  moon,
  observer;
let isInitialized = false;
let isInitializing = false;
let disposeRequested = false;
let initTimeoutId = null;
let isVisible = false;
let currentScrollY = 0;
let autoRotationY = 0;
let moonBaseScale = MOON_INITIAL_SCALE;
let introStartTime = null;

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
let flightAnimId = null;

const removeElementGracefully = (el, fadeMs = 400) => {
  if (!el) return;
  el.style.transition = `opacity ${fadeMs}ms ease-out`;
  el.style.opacity = "0";
  el.style.pointerEvents = "none";
  let removed = false;
  const finish = () => {
    if (removed) return;
    removed = true;
    el.remove();
  };
  el.addEventListener("transitionend", finish, { once: true });
  setTimeout(finish, fadeMs + 60);
};

const animateProfileToMoon = () => {
  if (disposeRequested) return;
  console.info("Starting animateProfileToMoon...");

  // 1. Immediately dismiss loader SVG with guaranteed timeout cleanup
  loaderEl = document.querySelector("#profilePicContainer > .moonLoader");
  if (loaderEl) {
    removeElementGracefully(loaderEl, 350);
    loaderEl = null;
  }

  // 2. Identify the profile image
  const profileImgEl =
    profileImg ||
    document.querySelector("#profilePicContainer > img.profileImage");

  if (!profileImgEl) {
    console.info("No profileImgEl found, revealing 3D logo directly.");
    moon?.setLogoOpacity(0.72);
    return;
  }

  // 3. Detach all moon interaction listeners
  if (profileImgEl._moonHandlers) {
    const { onWheel, onTouchStart, onTouchMove, onTouchEnd } =
      profileImgEl._moonHandlers;
    profileImgEl.removeEventListener("wheel", onWheel);
    profileImgEl.removeEventListener("touchstart", onTouchStart);
    profileImgEl.removeEventListener("touchmove", onTouchMove);
    profileImgEl.removeEventListener("touchend", onTouchEnd);
    profileImgEl.removeEventListener("touchcancel", onTouchEnd);
    delete profileImgEl._moonHandlers;
  }

  // 4. Capture current DOM geometry before promoting to fixed position
  const startRect = profileImgEl.getBoundingClientRect();
  const startX = startRect.left;
  const startY = startRect.top;
  const startWidth = startRect.width || 150;
  const startHeight = startRect.height || 150;

  // Check if logo projection is available
  const initialProj = moon?.getLogoProjection(camera, renderer?.domElement);
  console.info("Moon logo initial projection:", initialProj);

  // If projection is unavailable or moon is behind camera, fallback to direct fade
  if (!initialProj || !moon?.mesh) {
    console.info("Falling back to direct fade for profile image.");
    removeElementGracefully(profileImgEl, 400);
    if (profileImg === profileImgEl) profileImg = null;
    moon?.setLogoOpacity(0.72);
    return;
  }

  // Promote element to position: fixed at the exact same coordinates (no visual jump)
  profileImgEl.style.position = "fixed";
  profileImgEl.style.left = `${startX}px`;
  profileImgEl.style.top = `${startY}px`;
  profileImgEl.style.width = `${startWidth}px`;
  profileImgEl.style.height = `${startHeight}px`;
  profileImgEl.style.margin = "0";
  profileImgEl.style.pointerEvents = "none";
  profileImgEl.style.zIndex = "100";
  profileImgEl.style.transformOrigin = "center center";
  profileImgEl.style.willChange = "transform, opacity, filter";
  profileImgEl.style.transition = "none";

  const SHRINK_DURATION_MS = 750;
  const shrinkStartTime = performance.now();

  const shrinkStep = () => {
    if (disposeRequested || !profileImgEl.parentNode) {
      if (flightAnimId !== null) {
        cancelAnimationFrame(flightAnimId);
        flightAnimId = null;
      }
      return;
    }

    const elapsed = performance.now() - shrinkStartTime;
    const linearT = Math.min(1, elapsed / SHRINK_DURATION_MS);

    // Natural cubic ease-in-out curve
    const easeT =
      linearT < 0.5
        ? 4 * linearT * linearT * linearT
        : 1 - Math.pow(-2 * linearT + 2, 3) / 2;

    // Shrink down smoothly from 1 to 0 (no downward translation)
    const curScale = Math.max(0, 1 - easeT);

    // Smooth opacity fade
    const curOpacity = Math.max(0, 1 - Math.pow(linearT, 1.4));

    // Progressively transform appearance from photo into etched stencil
    const grayscale = easeT * 100;
    const contrast = 100 + easeT * 80;
    const brightness = 100 - easeT * 30;

    profileImgEl.style.transform = `scale(${curScale})`;
    profileImgEl.style.opacity = `${curOpacity}`;
    profileImgEl.style.filter = `grayscale(${grayscale}%) contrast(${contrast}%) brightness(${brightness}%)`;

    // Seamlessly fade in the etched moon base logo on the 3D surface
    moon?.setLogoOpacity(Math.min(0.72, easeT * 0.72));

    if (linearT < 1) {
      flightAnimId = requestAnimationFrame(shrinkStep);
    } else {
      // Complete: profile logo is fully absorbed/etched into the moon
      flightAnimId = null;
      moon?.setLogoOpacity(0.72);
      profileImgEl.remove();
      if (profileImg === profileImgEl) profileImg = null;
    }
  };

  flightAnimId = requestAnimationFrame(shrinkStep);
};

// dismissLoader enforces the minimum display time then initiates the profile flight to the moon.
// It is safe to call multiple times — once triggered it exits.
const dismissLoader = () => {
  try {
    loaderEl = document.querySelector("#profilePicContainer > .moonLoader");
    const profileImgEl =
      profileImg ||
      document.querySelector("#profilePicContainer > img.profileImage");
    if (!loaderEl && !profileImgEl) return;

    const elapsed = performance.now() - loaderStartTime;
    const remaining = Math.max(0, LOADER_MIN_DISPLAY_MS - elapsed);

    clearTimeout(loaderDismissTimeoutId);
    loaderDismissTimeoutId = setTimeout(() => {
      loaderDismissTimeoutId = null;
      try {
        animateProfileToMoon();
      } catch (err) {
        console.error("animateProfileToMoon error:", err);
        removeElementGracefully(loaderEl, 300);
        removeElementGracefully(profileImgEl, 300);
        moon?.setLogoOpacity(0.72);
      }
    }, remaining);
  } catch (err) {
    console.error("dismissLoader error:", err);
    document.querySelector("#profilePicContainer > .moonLoader")?.remove();
    document.querySelector("#profilePicContainer > img.profileImage")?.remove();
    moon?.setLogoOpacity(0.72);
  }
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

  // Seed scale undersized; animate() eases into moonBaseScale.
  introStartTime = null;
  applyMoonScale(INTRO_SCALE_FROM * moonBaseScale);

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
  earthshineLight = null;
  hemiLight = null;
  moon = null;
  isInitialized = false;
  isInitializing = false;
  fixedHorizontalFov = null;
  introStartTime = null;
};

// ===================== CORE INITIALIZATION =====================
// This function only runs when the element actually nears the viewport.
async function initThreeJS() {
  if (isInitialized || isInitializing || disposeRequested) return;
  isInitializing = true;
  console.info("Starting 3D moon initialization.");

  try {
    // Three.js core, OrbitControls, and Moon are loaded only after the visibility gate
    // fires so the homepage does not pay for WebGL until the moon is near the viewport.
    const [
      {
        PerspectiveCamera,
        Scene,
        DirectionalLight,
        AmbientLight,
        HemisphereLight,
        WebGLRenderer,
        ACESFilmicToneMapping,
        PCFSoftShadowMap,
        TOUCH,
      },
      { OrbitControls },
      { Moon },
    ] = await Promise.all([
      import("three"),
      import("three/addons/controls/OrbitControls.js"),
      import("./moon.js"),
    ]);

    if (disposeRequested) {
      console.info(
        "Moon init aborted because teardown was requested before scene creation.",
      );
      return;
    }

    fixedHorizontalFov = computeFixedHorizontalFov();
    console.info(
      "Moon camera FOV configured:",
      INITIAL_FOV,
      "fixedHorizontalFov:",
      fixedHorizontalFov,
    );

    // Setup Scene
    // Creates the main 3D environment where everything will live.
    scene = new Scene();

    const containerWidth = moonRoot?.clientWidth || 340;
    const containerHeight = moonRoot?.clientHeight || 250;

    camera = new PerspectiveCamera(
      INITIAL_FOV,
      containerWidth / containerHeight,
      NEAR_CLIP,
      FAR_CLIP,
    );

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
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = PCFSoftShadowMap;
    renderer.shadowMap.autoUpdate = true;

    // Set initial size and canvas quality matching the container dimensions.
    renderer.setSize(containerWidth, containerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));

    // toneMapping controls how high dynamic range (HDR) colors are compressed to standard screens.
    // ACESFilmicToneMapping is the industry standard for realistic cinematic lighting.
    // Other options: THREE.NoToneMapping (flat), THREE.LinearToneMapping, THREE.ReinhardToneMapping.
    renderer.toneMapping = ACESFilmicToneMapping;

    // toneMappingExposure scales overall brightness before the tone curve is applied.
    // 1.0 is neutral. HIGHER brightens the scene before compression; LOWER darkens it.
    renderer.toneMappingExposure = 1.0;

    moonRoot.appendChild(renderer.domElement);

    // OrbitControls setup
    // Allows mouse drag / single-finger touch drag to orbit around the moon without
    // affecting camera position directly.
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; // Adds physical inertia/glide to the rotation.
    controls.enableRotate = true; // Explicit: single-finger touch drag / mouse drag orbits the camera.
    controls.enableZoom = true; // Allows mouse wheel and touch pinch to zoom in and out.
    controls.enablePan = false; // Disables panning so the moon remains fixed in position (no left/right/top/bottom shift).
    controls.minDistance = 0.6; // Prevents zooming inside the moon mesh.
    controls.maxDistance = 5.0; // Prevents zooming out indefinitely.

    // Touch gesture mapping:
    // ONE finger  -> orbit rotate
    // TWO fingers -> pinch to zoom (dolly only; pan is disabled above)
    controls.touches = {
      ONE: TOUCH.ROTATE,
      TWO: TOUCH.DOLLY_PAN,
    };

    // Lighting setup
    sunLight = new DirectionalLight(getSunLightColor(), SUN_LIGHT_INTENSITY);
    sunLight.position.set(
      SUN_LIGHT_POSITION.x,
      SUN_LIGHT_POSITION.y,
      SUN_LIGHT_POSITION.z,
    );
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.set(1024, 1024);
    sunLight.shadow.camera.left = -1.25;
    sunLight.shadow.camera.right = 1.25;
    sunLight.shadow.camera.top = 1.25;
    sunLight.shadow.camera.bottom = -1.25;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 8;
    sunLight.shadow.camera.updateProjectionMatrix();
    sunLight.shadow.bias = -0.0004;
    sunLight.shadow.normalBias = 0.02;
    sunLight.shadow.autoUpdate = true;
    scene.add(sunLight);

    // A DirectionalLight always points from its position toward its target object.
    // The target defaults to position (0,0,0) which is correct, but it must be part of
    // the scene graph for Three.js to compute its world matrix each frame. Without
    // scene.add(sunLight.target), any calls to sunLight.target.position.set() are silently
    // ignored by the renderer and the light direction never changes.
    scene.add(sunLight.target);

    earthshineLight = new DirectionalLight(
      EARTHSHINE_COLOR,
      EARTHSHINE_INTENSITY,
    );
    scene.add(earthshineLight);
    scene.add(earthshineLight.target);

    hemiLight = new HemisphereLight(
      HEMI_SKY_COLOR,
      HEMI_GROUND_COLOR,
      HEMI_INTENSITY,
    );
    scene.add(hemiLight);

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
    console.info(
      "3D moon initialization finished. isInitialized:",
      isInitialized,
      "isInitializing:",
      isInitializing,
    );
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
    sunLight.shadow.needsUpdate = true;
  }

  // Earthshine sits opposite the sun so the dark limb stays faintly lit.
  if (earthshineLight) {
    earthshineLight.position.x = Math.cos(angle + Math.PI) * radius;
    earthshineLight.position.z = Math.sin(angle + Math.PI) * radius;
    earthshineLight.position.y = 0.15;
    earthshineLight.target.position.set(0, 0, 0);
  }

  if (renderer) {
    renderer.shadowMap.needsUpdate = true;
  }
};

const applyMoonScale = (scale) => {
  if (moon?.mesh) {
    moon.mesh.scale.setScalar(scale);
  }
};

const updateMoonScale = (delta) => {
  // Math.max/min clamps the final scale strictly between the defined limits.
  // animate() applies intro + breath from moonBaseScale each frame.
  moonBaseScale = Math.max(
    MOON_SCALE_MIN,
    Math.min(MOON_SCALE_MAX, moonBaseScale + delta),
  );
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
    moon.updateFlag(performance.now());
    moon.updateGarden(performance.now());

    // Loader handoff intro + quiet idle breath (heartbeat cadence).
    const now = performance.now();
    if (introStartTime == null) introStartTime = now;

    let introT = (now - introStartTime) / INTRO_DURATION_MS;
    if (introT > 1) introT = 1;
    // Ease-out cubic so the settle feels like the orbit loader resolving into the sphere.
    const eased = 1 - (1 - introT) ** 3;
    const introScale =
      INTRO_SCALE_FROM + (moonBaseScale - INTRO_SCALE_FROM) * eased;

    const breathWave = Math.sin(now * BREATH_SPEED);
    const breath = introT >= 1 ? 1 + breathWave * BREATH_AMPLITUDE : 1;

    applyMoonScale(introScale * breath);
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
        console.info("Moon visibility triggered; beginning Three.js init.");
        initThreeJS()
          .then(() => {
            if (!disposeRequested && isVisible) animate();
          })
          .catch((err) => {
            console.error("Moon initialization promise rejected:", err);
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

// Container resize execution
const onContainerResize = () => {
  if (!isInitialized || !moonRoot || !camera || !renderer) return;

  const width = moonRoot.clientWidth;
  const height = moonRoot.clientHeight;
  if (!width || !height) return;

  camera.aspect = width / height;
  camera.fov = INITIAL_FOV;
  camera.updateProjectionMatrix();

  renderer.setSize(width, height);
};

const attachProfileInteraction = () => {
  if (!profileImg || profileImg._moonHandlers) return;

  let touchStartY = 0;
  let pinchStartDistance = 0;

  // Distance in pixels between two touch points (Pythagorean theorem).
  const getPinchDistance = (touches) => {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // Named handler references are required for removable cleanup.
  const onWheel = (event) => {
    if (!isInitialized) return;
    event.preventDefault(); // Stops the page from scrolling while zooming the moon.

    // event.deltaY > 0 means the user is pulling the wheel backwards (scroll down).
    const delta = event.deltaY > 0 ? -WHEEL_SCALE_STEP : WHEEL_SCALE_STEP;
    updateMoonScale(delta);
  };

  // Mobile: Record the starting reference point(s) for whichever gesture is beginning.
  // Fires on every new finger contact (e.g. going from 1 finger to 2), so the baseline
  // is always re-captured for the gesture that is actually happening right now.
  const onTouchStart = (e) => {
    if (e.touches.length === 2) {
      pinchStartDistance = getPinchDistance(e.touches);
    } else if (e.touches.length === 1) {
      touchStartY = e.touches[0].clientY;
    }
  };

  // Mobile: Two-finger pinch scales the moon (real pinch-to-zoom). Single-finger
  // vertical drag also scales it, kept as a one-thumb fallback alongside the pinch.
  const onTouchMove = (e) => {
    if (!isInitialized) return;
    e.preventDefault(); // Prevents the browser from pulling the whole page down (refresh behavior) or scrolling.

    if (e.touches.length === 2) {
      // True two-finger pinch: compare the current finger spread to the last-known spread.
      const currentDistance = getPinchDistance(e.touches);
      const delta = (currentDistance - pinchStartDistance) / PINCH_SENSITIVITY;

      updateMoonScale(delta);

      // Reset origin to current spread so the next frame calculates incrementally.
      pinchStartDistance = currentDistance;
    } else if (e.touches.length === 1) {
      const currentY = e.touches[0].clientY;

      // Calculate pixel distance moved, then divide by sensitivity factor.
      const delta = (touchStartY - currentY) / TOUCH_SENSITIVITY;

      updateMoonScale(delta);

      // Reset origin to current point so the next frame calculates from here.
      touchStartY = currentY;
    }
  };

  // Re-baseline whenever the finger count changes mid-gesture (e.g. lifting one finger
  // out of a pinch), so the next move event doesn't read as a sudden jump in distance
  // or Y position.
  const onTouchEnd = (e) => {
    if (e.touches.length === 2) {
      pinchStartDistance = getPinchDistance(e.touches);
    } else if (e.touches.length === 1) {
      touchStartY = e.touches[0].clientY;
    }
  };

  // Desktop: Intercept the physical mouse wheel
  profileImg.addEventListener("wheel", onWheel, { passive: false }); // Required to allow preventDefault().
  profileImg.addEventListener("touchstart", onTouchStart, { passive: true });
  profileImg.addEventListener("touchmove", onTouchMove, { passive: false });
  profileImg.addEventListener("touchend", onTouchEnd, { passive: true });
  profileImg.addEventListener("touchcancel", onTouchEnd, { passive: true });

  // Attach handler refs to the element so cleanupThreeJS can find and remove them.
  profileImg._moonHandlers = { onWheel, onTouchStart, onTouchMove, onTouchEnd };
};

/**
 * (Re)bind DOM observers after first load, bfcache restore, or Astro client navigation.
 * Resets disposeRequested so initThreeJS can run again when #moonRoot is present.
 */
const setupMoonLifecycle = () => {
  moonRoot = document.getElementById("moonRoot");
  profileImg = document.querySelector(".profileImage");

  if (!moonRoot) {
    console.error(
      "Moon lifecycle setup failed: #moonRoot was not found in the DOM.",
    );
    return;
  }

  if (!profileImg) {
    console.warn(
      "Moon lifecycle: .profileImage was not found in the DOM (may have transitioned to moon logo).",
    );
  }

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

  if (flightAnimId !== null) {
    cancelAnimationFrame(flightAnimId);
    flightAnimId = null;
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
    const { onWheel, onTouchStart, onTouchMove, onTouchEnd } =
      profileImg._moonHandlers;
    profileImg.removeEventListener("wheel", onWheel);
    profileImg.removeEventListener("touchstart", onTouchStart);
    profileImg.removeEventListener("touchmove", onTouchMove);
    profileImg.removeEventListener("touchend", onTouchEnd);
    profileImg.removeEventListener("touchcancel", onTouchEnd);
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
