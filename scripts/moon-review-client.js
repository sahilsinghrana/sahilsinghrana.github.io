import {
  ACESFilmicToneMapping,
  AmbientLight,
  DirectionalLight,
  HemisphereLight,
  PCFShadowMap,
  PerspectiveCamera,
  Scene,
  Vector3,
  Quaternion,
  WebGLRenderer,
} from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { createMoonBase } from "../src/components/General/Moon/3dMoon/base.js";
import { createMoonBase as createBeforeBase } from "/@moon-before/base.js";
import {
  createGarden,
  GARDEN_SURFACE_NORMAL,
} from "../src/components/General/Moon/3dMoon/garden.js";
import { createRandom } from "../src/components/General/Moon/3dMoon/wander.js";
import { Moon } from "../src/components/General/Moon/3dMoon/moon.js";
import { createAnimationClock } from "../src/components/General/Moon/3dMoon/motion.js";

const root = document.querySelector("#moonRoot");
const revision =
  new URLSearchParams(location.search).get("revision") === "before"
    ? "before"
    : "after";
const baseFactory = revision === "before" ? createBeforeBase : createMoonBase;
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
let recording = null;
let recordingStarted = 0;
let auditRequested = false;
let recreations = 0;
let previewTarget = null;
let previewLimit = 0;
let capturedActivity = null;
let comparison = "base";
let compareAfterPreview = false;
let behaviorRunning = true;
const activityStatus = document.querySelector("#activity");
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
    moon._base.dispose();
    moon._garden.removeFromParent();
    moon._garden.dispose();
    const originalRandom = Math.random;
    try {
      Math.random = createRandom(147);
      moon._garden = createGarden(0.4, GARDEN_SURFACE_NORMAL);
    } finally {
      Math.random = originalRandom;
    }
    moon.mesh.add(moon._garden);
    moon._base = baseFactory(0.4, {
      seed: 123,
      gardenInterestPoints: moon._garden?.userData.interestPoints,
      gardenLayout: moon._garden?.userData.navigation,
    });
    moon.mesh.add(moon._base);
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
    if (previewTarget) {
      for (let i = 0; i < 120 && previewTarget; i++) {
        moon._base.update(1 / 60);
        const actor = moon._base.userData.behavior.actors.find(
          (item) =>
            item.state === previewTarget &&
            (previewTarget !== "garden" ||
              !item.interest.features ||
              item.lastFeature?.kind === "flower") &&
            item.pose.weight > 0.99 &&
            (previewTarget === "wave"
              ? item.pose.wave > 0.8
              : Math.max(item.pose.hand, item.pose.chest) > 0.35),
        );
        if (actor) {
          capturedActivity = previewTarget;
          focusActivity(actor);
          previewTarget = null;
          paused = true;
          document.querySelector("#motion").textContent = "Resume motion";
          if (compareAfterPreview) {
            compareAfterPreview = false;
            beginBehaviorComparison();
          }
        } else if (moon._base.userData.behavior.time >= previewLimit) {
          previewTarget = null;
          results.textContent = "No event found before the preview timeout.";
        }
      }
    }
    if (!sample)
      activityStatus.textContent = `${moon._base.userData.behavior.time.toFixed(1)}s | ${moon._base.userData.behavior.actors.map((actor) => actor.state).join(" / ")}`;
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
  if (
    recording?.state === "recording" &&
    performance.now() - recordingStarted >= 8000
  )
    recording.stop();
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
    const stem = capturedActivity
      ? `astronaut-${capturedActivity}-${innerWidth < 500 ? "mobile" : "desktop"}.png`
      : `moon-${document.querySelector("#phase").value}-${innerWidth < 500 ? "mobile" : "desktop"}-${baseVisible ? "base" : "baseline"}.png`;
    const name = stem.replace(".png", `-${revision}.png`);
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
        if (comparison === "behavior") setBehaviorRunning(true);
        sample = {
          label: "base",
          warmup: 60,
          previous: timestamp,
          cpu: [],
          frames: [],
        };
      } else {
        sample = null;
        if (comparison === "revision") {
          results.textContent = JSON.stringify(
            {
              revision,
              ...report.base,
              viewport: {
                width: innerWidth,
                height: innerHeight,
                dpr: renderer.getPixelRatio(),
              },
            },
            null,
            2,
          );
        } else {
          report.comparison =
            comparison === "behavior"
              ? "Same base: behavior controller off / on"
              : "Base hidden / visible";
          report.viewport = {
            width: innerWidth,
            height: innerHeight,
            dpr: renderer.getPixelRatio(),
          };
          report.frameMedianChangePercent =
            (report.base.frameMedianMs / report.baseline.frameMedianMs - 1) *
            100;
          report.frameP95ChangePercent =
            (report.base.frameP95Ms / report.baseline.frameP95Ms - 1) * 100;
          results.textContent = JSON.stringify(report, null, 2);
        }
      }
    }
  }
  frameId = requestAnimationFrame(render);
}
frameId = requestAnimationFrame(render);
document.querySelector("#revisionCompare").onclick = () => {
  if (!ready || sample) return;
  moon._base.dispose();
  moon._base = baseFactory(0.4, {
    seed: 123,
    gardenInterestPoints: moon._garden.userData.interestPoints,
    gardenLayout: moon._garden.userData.navigation,
  });
  moon.mesh.add(moon._base);
  moon._base.setReveal(1);
  moon.mesh.rotation.y = 0.68;
  moon._base.updateLighting();
  elapsed = 0;
  moon.updateGarden(0);
  moon.updateFlag(0);
  controls.target.set(0, 0, 0);
  camera.position.set(0, 0, innerWidth < 500 ? 2.05 : 2);
  comparison = "revision";
  baseVisible = true;
  paused = true;
  document.querySelector("#motion").textContent = "Resume motion";
  report.base = null;
  sample = {
    label: "base",
    warmup: 60,
    previous: performance.now(),
    cpu: [],
    frames: [],
  };
  results.textContent = `Measuring ${revision} revision, fixed scene and seeded garden.`;
};
document.querySelector("#compare").onclick = () => {
  if (!ready || sample) return;
  comparison = "base";
  capturedActivity = null;
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
function focusActivity(actor) {
  moon.mesh.updateWorldMatrix(true, true);
  const model = moon._base.getObjectByName(
    actor === moon._base.userData.behavior.actors[0]
      ? "BoyAstronaut"
      : "GirlAstronaut",
  );
  const target = model.parent.getWorldPosition(new Vector3());
  const frame = moon._base.getWorldQuaternion(new Quaternion());
  const normal = actor.walker.normal.clone().applyQuaternion(frame);
  const forward = actor.walker.forward.clone().applyQuaternion(frame);
  let distance = 0.28;
  if (
    capturedActivity === "conversation" ||
    capturedActivity === "wave" ||
    capturedActivity === "showGarden"
  ) {
    const other = moon._base
      .getObjectByName("BoyAstronaut")
      .parent.getWorldPosition(new Vector3());
    distance = Math.max(distance, target.distanceTo(other) * 2.2);
    target.add(other).multiplyScalar(0.5);
    forward.crossVectors(normal, forward).normalize();
  }
  controls.minDistance = 0.25;
  controls.target.copy(target);
  camera.position
    .copy(target)
    .addScaledVector(normal, distance * 0.86)
    .addScaledVector(forward, distance * 0.5);
  controls.update();
}
function setBehaviorRunning(enabled) {
  behaviorRunning = enabled;
  const base = moon._base;
  base.userData.motion.beforeStep = enabled
    ? base.userData.behavior.step
    : null;
  if (!enabled)
    for (const actor of base.userData.behavior.actors) actor.pose.weight = 0;
}
function beginBehaviorComparison() {
  comparison = "behavior";
  baseVisible = true;
  paused = false;
  document.querySelector("#motion").textContent = "Pause motion";
  setBehaviorRunning(false);
  report.baseline = report.base = null;
  sample = {
    label: "baseline",
    warmup: 60,
    previous: performance.now(),
    cpu: [],
    frames: [],
  };
  results.textContent =
    "Measuring the same scene with behavior logic off, then on. No GPU resources are added.";
}
for (const button of document.querySelectorAll("[data-activity]"))
  button.onclick = () => {
    if (!ready || sample) return;
    setBehaviorRunning(true);
    capturedActivity = null;
    previewTarget = button.dataset.activity;
    previewLimit = moon._base.userData.behavior.time + 1800;
    results.textContent = `Advancing the seeded simulation to ${previewTarget}...`;
  };
document.querySelector("#behaviorCompare").onclick = () => {
  if (!ready || sample) return;
  if (!behaviorRunning) setBehaviorRunning(true);
  compareAfterPreview = true;
  previewTarget = "garden";
  previewLimit = moon._base.userData.behavior.time + 1800;
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
document.querySelector("#record").onclick = () => {
  if (!ready || recording?.state === "recording") return;
  const stream = renderer.domElement.captureStream(20);
  const chunks = [];
  const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
    ? "video/webm;codecs=vp9"
    : "video/webm";
  recording = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: 900000,
  });
  recording.ondataavailable = (event) => {
    if (event.data.size) chunks.push(event.data);
  };
  recording.onstop = async () => {
    stream.getTracks().forEach((track) => track.stop());
    const name = `astronaut-motion-${innerWidth < 500 ? "mobile" : "desktop"}-${revision}.webm`;
    const response = await fetch(`/capture?name=${name}`, {
      method: "POST",
      body: new Blob(chunks, { type: mimeType }),
    });
    results.textContent = await response.text();
  };
  recordingStarted = performance.now();
  paused = false;
  document.querySelector("#motion").textContent = "Pause motion";
  results.textContent = "Recording eight seconds of the real scene…";
  recording.start();
};
const resize = new ResizeObserver(() => {
  camera.aspect = root.clientWidth / root.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(root.clientWidth, root.clientHeight);
});
resize.observe(root);
window.addEventListener("pagehide", () => {
  if (recording?.state === "recording") recording.stop();
  cancelAnimationFrame(frameId);
  resize.disconnect();
  controls.dispose();
  moon.dispose();
  sun.shadow.dispose();
  renderer.dispose();
  renderer.forceContextLoss();
});
