import {
  ACESFilmicToneMapping,
  AmbientLight,
  DirectionalLight,
  HemisphereLight,
  PCFShadowMap,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
} from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { Moon } from "../src/components/General/Moon/3dMoon/moon.js";
import { createAnimationClock } from "../src/components/General/Moon/3dMoon/motion.js";

const root = document.querySelector("#moonRoot");
const results = document.querySelector("#results");
const renderer = new WebGLRenderer({
  antialias: true,
  alpha: true,
  stencil: false,
  powerPreference: "high-performance",
});
renderer.setSize(root.clientWidth, root.clientHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.toneMapping = ACESFilmicToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = PCFShadowMap;
root.appendChild(renderer.domElement);
const scene = new Scene();
const camera = new PerspectiveCamera(
  36,
  root.clientWidth / root.clientHeight,
  0.1,
  1000,
);
camera.position.z = innerWidth < 500 ? 2.05 : 2;
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enablePan = false;
controls.minDistance = 0.6;
controls.maxDistance = 5;
const sun = new DirectionalLight(0xfff8f0, 3.1);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
Object.assign(sun.shadow.camera, {
  left: -1.25,
  right: 1.25,
  top: 1.25,
  bottom: -1.25,
  near: 0.5,
  far: 8,
});
sun.shadow.camera.updateProjectionMatrix();
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.02;
scene.add(sun, sun.target);
const earthshine = new DirectionalLight(0xa8b8d0, 0.08);
scene.add(earthshine, earthshine.target);
scene.add(new HemisphereLight(0x1a2848, 0x1a1c22, 0.04));
scene.add(new AmbientLight(0x1a2a4a, 0.048));
function setPhase(phase) {
  const angle = phase * Math.PI * 2 - Math.PI / 2;
  sun.position.set(Math.cos(angle) * 5, 0, Math.sin(angle) * 5);
  earthshine.position.set(-Math.cos(angle) * 5, 0.15, -Math.sin(angle) * 5);
}
setPhase(0.5);
let moon;
let ready = false;
let baseVisible = true;
let paused = false;
let elapsed = 0;
let sample = null;
let frameId;
let captureRequested = false;
let auditRequested = false;
let recreations = 0;
const clock = createAnimationClock();
const report = {};
const quantile = (values, fraction) =>
  values.slice().sort((a, b) => a - b)[
    Math.floor((values.length - 1) * fraction)
  ];
function createMoon() {
  ready = false;
  moon = new Moon(scene, () => {
    ready = !!moon.mesh;
    if (!ready) return;
    moon.mesh.rotation.y = 0.68;
    moon.setLogoOpacity(0.72);
    moon.updateBase(0, true);
    if (recreations > 0) auditRequested = true;
    results.textContent =
      "Ready. Full Moon, front of base. Drag to orbit; wheel to zoom. Measurements include existing flag and garden shadow passes.";
  });
}
createMoon();

function render(timestamp) {
  if (document.hidden) {
    clock.pause();
    frameId = requestAnimationFrame(render);
    return;
  }
  const delta = clock.tick(timestamp);
  if (ready) {
    if (!paused && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
      elapsed += delta;
      moon.updateFlag(elapsed * 1000);
      moon.updateGarden(elapsed * 1000);
      if (baseVisible) moon.updateBase(delta);
    }
    if (moon._base) moon._base.visible = baseVisible;
  }
  controls.update();
  const started = performance.now();
  renderer.render(scene, camera);
  const duration = performance.now() - started;
  if (auditRequested) {
    auditRequested = false;
    const liveGeometries = new Set();
    scene.traverse((object) => {
      if (object.geometry) liveGeometries.add(object.geometry);
    });
    results.textContent = JSON.stringify(
      {
        recreations,
        liveGeometries: liveGeometries.size,
        gpuGeometries: renderer.info.memory.geometries,
        gpuTextures: renderer.info.memory.textures,
        drawCalls: renderer.info.render.calls,
      },
      null,
      2,
    );
  }
  if (captureRequested) {
    captureRequested = false;
    const name = `moon-${document.querySelector("#phase").value}-${innerWidth < 500 ? "mobile" : "desktop"}-${baseVisible ? "base" : "baseline"}.png`;
    renderer.domElement.toBlob(async (blob) => {
      const response = await fetch(`/capture?name=${name}`, {
        method: "POST",
        body: blob,
      });
      results.textContent += `\n${await response.text()}`;
    });
  }
  if (sample && ready) {
    if (sample.warmup-- <= 0) {
      sample.cpu.push(duration);
      sample.frames.push(timestamp - sample.previous);
    }
    sample.previous = timestamp;
    if (sample.cpu.length === 240) {
      report[sample.label] = {
        cpuMedianMs: quantile(sample.cpu, 0.5),
        cpuP95Ms: quantile(sample.cpu, 0.95),
        frameMedianMs: quantile(sample.frames, 0.5),
        frameP95Ms: quantile(sample.frames, 0.95),
        drawCalls: renderer.info.render.calls,
        triangles: renderer.info.render.triangles,
        geometries: renderer.info.memory.geometries,
        textures: renderer.info.memory.textures,
      };
      if (sample.label === "baseline") {
        baseVisible = true;
        sample = {
          label: "base",
          warmup: 60,
          previous: timestamp,
          cpu: [],
          frames: [],
        };
      } else {
        sample = null;
        report.viewport = {
          width: innerWidth,
          height: innerHeight,
          dpr: renderer.getPixelRatio(),
        };
        report.frameMedianChangePercent =
          (report.base.frameMedianMs / report.baseline.frameMedianMs - 1) * 100;
        report.frameP95ChangePercent =
          (report.base.frameP95Ms / report.baseline.frameP95Ms - 1) * 100;
        results.textContent = JSON.stringify(report, null, 2);
      }
    }
  }
  frameId = requestAnimationFrame(render);
}
frameId = requestAnimationFrame(render);
document.querySelector("#compare").onclick = () => {
  if (!ready || sample) return;
  baseVisible = false;
  report.baseline = null;
  report.base = null;
  sample = {
    label: "baseline",
    warmup: 60,
    previous: performance.now(),
    cpu: [],
    frames: [],
  };
  results.textContent =
    "Measuring 240 frames per scene after 60 warmup frames. Keep this tab visible.";
};
document.querySelector("#phase").onchange = (event) =>
  setPhase(Number(event.target.value));
document.querySelector("#base").onclick = (event) => {
  baseVisible = !baseVisible;
  event.target.textContent = baseVisible ? "Hide base" : "Show base";
};
document.querySelector("#motion").onclick = (event) => {
  paused = !paused;
  event.target.textContent = paused ? "Resume motion" : "Pause motion";
};
document.querySelector("#front").onclick = () => {
  camera.position.set(0, 0, innerWidth < 500 ? 2.05 : 2);
  controls.target.set(0, 0, 0);
  moon.mesh.rotation.y = 0.68;
};
document.querySelector("#back").onclick = () => {
  moon.mesh.rotation.y = 0.68 + Math.PI;
};
document.querySelector("#zoom").onclick = () => {
  camera.position.set(0, 0, 0.85);
};
document.querySelector("#reset").onclick = () => {
  moon.dispose();
  recreations++;
  createMoon();
};
document.querySelector("#capture").onclick = () => {
  captureRequested = true;
};
const resize = new ResizeObserver(() => {
  camera.aspect = root.clientWidth / root.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(root.clientWidth, root.clientHeight);
});
resize.observe(root);
window.addEventListener("pagehide", () => {
  cancelAnimationFrame(frameId);
  resize.disconnect();
  controls.dispose();
  moon.dispose();
  sun.shadow.dispose();
  renderer.dispose();
  renderer.forceContextLoss();
});
