// GENERATE USING AI

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { Moon } from "./moon.js";
import { getCurrentMoonData } from "@utils/currentMoonData.js";

console.log("SETTING UP");

const isMobile = window.innerWidth < 500;

// Setup Scene
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  45, // initial vertical FOV (will be adjusted)
  window.innerWidth / window.innerHeight,
  0.1,
  1000,
);

// FIXED CAMERA DISTANCE → moon size is controlled by width, not height
const FIXED_CAMERA_DISTANCE = isMobile ? 4.5 : 2.7;
camera.position.set(0, 0, FIXED_CAMERA_DISTANCE);

// Calculate FIXED HORIZONTAL FOV once (this is the key fix)
const FIXED_HORIZONTAL_FOV =
  2 *
  Math.atan(
    Math.tan((45 * Math.PI) / 360) * (window.innerWidth / window.innerHeight),
  ) *
  (180 / Math.PI);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: true,
  stencil: false,
  depth: true,
});

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;

const moonRoot = document.getElementById("moonRoot");
moonRoot.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enableZoom = false;
controls.enablePan = false;

// Lighting
const sunLight = new THREE.DirectionalLight(0xfff8f0, 3.1);
sunLight.position.set(5, 3, 2);
scene.add(sunLight);
scene.add(new THREE.AmbientLight(0x1a2a4a, 0.048));

const setMoonPhase = (input) => {
  let p =
    typeof input === "string"
      ? parseFloat(input.replace("%", "")) / 100
      : input;

  p = p % 1;
  if (p < 0) p += 1;

  const offset = -Math.PI / 2;
  const angle = p * Math.PI * 2 + offset;
  const radius = 5;

  if (sunLight) {
    sunLight.position.x = -Math.cos(angle) * radius;
    sunLight.position.z = Math.sin(angle) * radius;
    sunLight.position.y = 0;
    sunLight.target.position.set(0, 0, 0);
  }
};

const currentAgePercent = getCurrentMoonData().lunarAgePercent;
setMoonPhase(currentAgePercent);

const moon = new Moon(scene, () => {
  console.log("3D Moon loaded");
});

// Moon scale (user interaction only – completely independent of resize)
let moonBaseScale = 1.0;

const updateMoonScale = (delta) => {
  moonBaseScale = Math.max(0.3, Math.min(2.0, moonBaseScale + delta));

  if (moon?.mesh) {
    moon.mesh.scale.setScalar(moonBaseScale);
  }
};

// Initial scale
updateMoonScale(0);

let currentScrollY = 0;
let autoRotationY = 0;
let isVisible = true;

window.addEventListener(
  "scroll",
  () => {
    currentScrollY = window.scrollY;
  },
  { passive: true },
);

window.toggleMoon = (val) => moon.setVisibility?.(val);

const observer = new IntersectionObserver(
  (entries) => {
    isVisible = entries[0].isIntersecting;
    if (isVisible) animate();
  },
  { threshold: 0.01 },
);

observer.observe(moonRoot);

function animate() {
  if (!isVisible) return;

  if (moon.mesh) {
    autoRotationY += 0.002;
    moon.mesh.rotation.y = autoRotationY + currentScrollY * 0.005;
    moon.mesh.rotation.x = currentScrollY * 0.001;
  }

  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

animate();

// ==================== RESIZE – FIXED TO WIDTH ONLY ====================
window.addEventListener("resize", () => {
  const width = window.innerWidth;
  const height = window.innerHeight;

  camera.aspect = width / height;

  // === THIS IS THE IMPORTANT PART ===
  // Keep HORIZONTAL FOV constant → moon size stays fixed to browser WIDTH
  const tanHalfHoriz = Math.tan((FIXED_HORIZONTAL_FOV * Math.PI) / 360);
  camera.fov = 2 * Math.atan(tanHalfHoriz / camera.aspect) * (180 / Math.PI);

  camera.position.z = FIXED_CAMERA_DISTANCE; // never changes with height
  camera.updateProjectionMatrix();

  renderer.setSize(width, height);
});

// ==================== USER SCALING (Mouse Wheel + Touch) ====================
const profileImg = document.querySelector(".profileImage");

if (profileImg) {
  let touchStartY = 0;

  // Desktop: Mouse Wheel
  profileImg.addEventListener(
    "wheel",
    (event) => {
      event.preventDefault();
      const delta = event.deltaY > 0 ? -0.05 : 0.05;
      updateMoonScale(delta);
    },
    { passive: false },
  );

  // Mobile: Touch Drag
  profileImg.addEventListener(
    "touchstart",
    (e) => {
      touchStartY = e.touches[0].clientY;
    },
    { passive: true },
  );

  profileImg.addEventListener(
    "touchmove",
    (e) => {
      e.preventDefault();
      const currentY = e.touches[0].clientY;
      const delta = (touchStartY - currentY) / 180; // smooth sensitivity

      updateMoonScale(delta);
      touchStartY = currentY;
    },
    { passive: false },
  );
}
