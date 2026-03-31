// GENERATE USING AI

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { Moon } from "./moon.js";
import { getCurrentMoonData } from "@utils/currentMoonData.js";
// import { Starfield } from "./stars.js";

console.log("SETTING UP");
const isMobile = window.innerWidth < 768;
// Setup Scene
const scene = new THREE.Scene();
// scene.background = new THREE.Color(0x000005);
const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  1000,
);
camera.position.set(0, 0, 3.5);

camera.position.z = isMobile ? 4.7 : 3.5;

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: true,
  // powerPreference: "high-performance",
  stencil: false,
  depth: true,
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
document.getElementById("moonRoot").appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// Lighting
const sunLight = new THREE.DirectionalLight(0xfff8f0, 3.2);
sunLight.position.set(5, 3, 2);
scene.add(sunLight);
scene.add(new THREE.AmbientLight(0x1a2a4a, 0.048));

const setMoonPhase = (input) => {
  let p = 0;

  // 1. Handle String/Number inputs
  if (typeof input === "string") {
    p = parseFloat(input.replace("%", "")) / 100;
  } else {
    p = input;
  }

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
  console.log("3d moon loaded ");
});

let currentScrollY = 0;

window.addEventListener(
  "scroll",
  () => {
    currentScrollY = window.scrollY;
  },
  { passive: true, capture: true },
);

window.toggleMoon = (val) => moon.setVisibility(val);

function animate() {
  // Spin moon based on scroll position
  if (moon.mesh) {
    // Base rotation + Scroll-driven rotation
    moon.mesh.rotation.y = currentScrollY * 0.005;

    // Optional: Make it tilt slightly as you scroll
    moon.mesh.rotation.x = currentScrollY * 0.001;
  }

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
animate();

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const profileImg = document.querySelector(".profileImage");
let currentScale = 1.0;
let touchStartY = 0; // Track where the finger first hits the screen
const updateMoonScale = (delta) => {
  currentScale += delta;
  // Clamp between 0.3 and 2.0
  currentScale = Math.min(Math.max(currentScale, 0.3), 2.0);

  if (moon && moon.mesh) {
    moon.mesh.scale.set(currentScale, currentScale, currentScale);
  }
};

if (profileImg) {
  // --- DESKTOP: Mouse Wheel ---
  profileImg.addEventListener(
    "wheel",
    (event) => {
      event.preventDefault();
      const delta = event.deltaY > 0 ? -0.05 : 0.05;
      updateMoonScale(delta);
    },
    { passive: false },
  );

  // --- MOBILE: Touch Start ---
  profileImg.addEventListener(
    "touchstart",
    (event) => {
      // Record initial finger position
      touchStartY = event.touches[0].clientY;
      touchStartX = event.touches[0].clientX;
    },
    { passive: true },
  );

  // --- MOBILE: Touch Move (The "Drag") ---
  profileImg.addEventListener(
    "touchmove",
    (event) => {
      // Prevent the page from scrolling while dragging over the image
      event.preventDefault();
      const currentY = event.touches[0].clientY;
      const currentX = event.touches[0].clientX;
      const diff = touchStartY - currentY; // Upward drag = positive diff

      // Sensitivity: Divide by a factor (e.g., 200) so it doesn't scale too wildly
      const sensitivity = 200;
      const delta = diff / sensitivity;

      updateMoonScale(delta);

      // Reset start point to current for continuous smooth scaling
      touchStartY = currentY;
      touchStartX = currentX;
    },
    { passive: false },
  );
}
