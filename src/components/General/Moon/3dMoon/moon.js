// Texture resolution constants live at module scope so they are visible alongside
// the worker call and can be adjusted without hunting inside the init() body.
// These must match the size values expected by the worker (e.g. texture-worker.js).
const TEX_SIZE = 630; // Resolution of the diffuse and bump textures (square).
const ROUGH_SIZE = 490; // Resolution of the roughness texture (square, can be lower).
const BUMP_SCALE = 0.065;

// Named imports instead of `import("three")` namespace - enables Rollup/Vite tree shaking.
// Only the classes actually used are included in the final bundle.
import {
  DataTexture,
  RGBAFormat,
  SRGBColorSpace,
  LinearFilter,
  MeshStandardMaterial,
  SphereGeometry,
  Mesh,
  Vector3,
} from "three";
import { createFlag } from "./flag.js";
import { createGarden, GARDEN_SURFACE_NORMAL } from "./garden.js";
import { createMoonBaseLogo, TARGET_ETCHED_OPACITY } from "./logo.js";
import { BASE_REVEAL_SECONDS, createMoonBase } from "./base.js";

function makeDataTex(buffer, size, { srgb = false } = {}) {
  const tex = new DataTexture(new Uint8Array(buffer), size, size, RGBAFormat);
  if (srgb) tex.colorSpace = SRGBColorSpace;
  tex.generateMipmaps = false;
  tex.minFilter = LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

export class Moon {
  constructor(scene, onComplete) {
    this.scene = scene;
    this.mesh = null;
    this._disposed = false;
    this._worker = null;

    // Private refs kept for dispose() - Three.js requires explicit disposal of GPU
    // resources (textures, materials, geometries) because the JS garbage collector
    // cannot free WebGL objects held by the GPU driver.
    this._geometry = null;
    this._material = null;
    this._flag = null;
    this._garden = null;
    this._logo = null;
    this._base = null;
    this._baseReveal = 0;
    this._baseReady = false;
    this._logoOpacity = 0;
    this._logoReveal = 0;
    this._logoAbort = new AbortController();
    let completed = false;
    const complete = () => {
      if (completed || this._disposed) return;
      completed = true;
      onComplete?.();
    };

    // .catch() is required because init() is async and its returned Promise is not
    // awaited by the caller. Without this, any rejection inside init() (e.g. a Worker
    // construction failure before onerror fires) becomes an unhandled Promise rejection
    // that is silently swallowed - no console error, no onComplete, no feedback.
    this.init(complete).catch((err) => {
      console.error("Moon init failed:", err);
      complete();
    });
  }

  async init(onComplete) {
    let worker;
    try {
      worker = new Worker(new URL("./texture-worker.js", import.meta.url), {
        type: "module",
      });
    } catch (err) {
      console.error("Failed to create Moon texture worker:", err);
      if (onComplete) onComplete();
      return;
    }

    this._worker = worker;

    // If the worker throws (malformed message, JS error inside the worker, etc.),
    // onmessage never fires and onComplete is never called - the scene silently stays
    // empty with no feedback. onerror surfaces that failure so the caller can react.
    worker.onerror = (err) => {
      console.error("Texture worker failed:", err);
      worker.terminate();
      if (this._worker === worker) this._worker = null;
      // Dismiss the loader so the static profile image remains usable.
      if (onComplete) onComplete();
    };

    worker.onmessage = async (e) => {
      if (this._worker !== worker) return;
      const payload = e.data;
      if (
        payload?.error ||
        payload?.diffuse?.byteLength !== TEX_SIZE * TEX_SIZE * 4 ||
        payload?.bump?.byteLength !== TEX_SIZE * TEX_SIZE * 4 ||
        payload?.rough?.byteLength !== ROUGH_SIZE * ROUGH_SIZE * 4
      ) {
        console.error(
          "Moon texture worker reported an error:",
          payload?.error || "Invalid texture buffers",
        );
        worker.terminate();
        if (this._worker === worker) this._worker = null;
        if (onComplete) onComplete();
        return;
      }

      // Teardown may have run while the worker was still generating textures.
      if (this._disposed) {
        worker.terminate();
        if (this._worker === worker) this._worker = null;
        return;
      }

      const { diffuse, bump, rough } = payload;
      worker.terminate();
      if (this._worker === worker) this._worker = null;

      const diffuseTex = makeDataTex(diffuse, TEX_SIZE, { srgb: true });
      const bumpTex = makeDataTex(bump, TEX_SIZE);
      const roughTex = makeDataTex(rough, ROUGH_SIZE);

      // Dispose again if teardown raced in while we built CPU-side textures.
      if (this._disposed) {
        diffuseTex.dispose();
        bumpTex.dispose();
        roughTex.dispose();
        worker.terminate();
        if (this._worker === worker) this._worker = null;
        return;
      }

      this._material = new MeshStandardMaterial({
        map: diffuseTex,
        bumpMap: bumpTex,
        bumpScale: BUMP_SCALE,
        roughnessMap: roughTex,
        roughness: 0.9,
      });

      // 60×60 segments gives a smooth silhouette without excessive vertex count.
      // Lower (e.g. 32): visible faceting on the edge of the sphere.
      // Higher (e.g. 128): diminishing visual return with quadratic vertex cost.
      const radius = 0.4;
      this._geometry = new SphereGeometry(radius, 60, 60);
      this.mesh = new Mesh(this._geometry, this._material);

      // castShadow / receiveShadow have no effect unless renderer.shadowMap.enabled
      // is set to true. They are kept here as an explicit opt-in flag so enabling
      // shadow maps in the future automatically picks up the moon without extra changes.
      this.mesh.castShadow = true;
      this.mesh.receiveShadow = true;

      try {
        this._flag = createFlag();
        this.mesh.add(this._flag);
      } catch (err) {
        // The flag is optional artwork; it must not prevent the moon from rendering
        // or leave the loading overlay waiting forever if browser canvas support fails.
        console.error("Flag initialization failed:", err);
        this._flag = null;
      }

      try {
        this._garden = createGarden(radius, GARDEN_SURFACE_NORMAL);
        this.mesh.add(this._garden);
      } catch (err) {
        console.error("Garden initialization failed:", err);
        this._garden = null;
      }

      try {
        this._base = createMoonBase(radius, {
          gardenInterestPoints: this._garden?.userData.interestPoints,
          gardenLayout: this._garden?.userData.navigation,
          flagInterest: this._flag?.userData.interest,
        });
        this.mesh.add(this._base);
      } catch (err) {
        console.error("Lunar base initialization failed:", err);
      }

      this.mesh.updateMatrix();
      this.scene.add(this.mesh);

      // Readiness means scene content is available; optional image decoding
      // must not delay the first rendered Moon frame or retain the worker.
      if (onComplete) onComplete();
      try {
        const profile = document.querySelector("#profilePicContainer > img");
        const source = profile?.currentSrc || profile?.src;
        if (source) {
          const logo = await createMoonBaseLogo(
            source,
            radius,
            this._logoAbort.signal,
          );
          if (logo && !this._disposed && this.mesh) {
            this._logo = logo;
            logo.setOpacity(0);
            this.mesh.add(logo);
          } else logo?.dispose();
        }
      } catch (err) {
        console.error("Logo initialization failed:", err);
      }
    };

    worker.postMessage({ size: TEX_SIZE, roughSize: ROUGH_SIZE });
  }

  // Releases all GPU-side resources owned by this Moon instance.
  // Must be called before removing the Moon from the scene to avoid WebGL memory leaks,
  // because Three.js does not garbage-collect GPU objects automatically.
  dispose() {
    this._disposed = true;
    this._logoAbort.abort();

    if (this._worker) {
      this._worker.terminate();
      this._worker = null;
    }

    if (!this.mesh) return;

    this.scene.remove(this.mesh);

    this._flag?.dispose?.();
    this._flag = null;
    this._garden?.dispose?.();
    this._garden = null;
    this._logo?.dispose?.();
    this._logo = null;
    this._base?.dispose();
    this._base = null;

    // Each texture is an independent GPU upload - each must be disposed individually.
    this._material?.map?.dispose();
    this._material?.bumpMap?.dispose();
    this._material?.roughnessMap?.dispose();
    this._material?.dispose();
    this._geometry?.dispose();

    this.mesh = null;
    this._geometry = null;
    this._material = null;
  }

  setVisibility(visible) {
    if (this.mesh) this.mesh.visible = visible;
  }

  updateFlag(timeMs) {
    this._flag?.update?.(timeMs);
  }

  updateGarden(timeMs) {
    this._garden?.update?.(timeMs);
  }

  setLogoOpacity(val) {
    this._logoOpacity = val;
    this._logo?.setOpacity?.(val * this._logoReveal);
    if (val >= TARGET_ETCHED_OPACITY) this._baseReady = true;
  }

  updateBase(deltaSeconds, reducedMotion = false) {
    if (this._logo && this._logoReveal < 1) {
      this._logoReveal = reducedMotion
        ? 1
        : Math.min(1, this._logoReveal + deltaSeconds / 0.4);
      this._logo.setOpacity(this._logoOpacity * this._logoReveal);
    }
    if (!this._base || !this._baseReady) return;
    this._baseReveal = reducedMotion
      ? 1
      : Math.min(1, this._baseReveal + deltaSeconds / BASE_REVEAL_SECONDS);
    this._base.setReveal(this._baseReveal);
    this._base.update(reducedMotion ? 0 : deltaSeconds, reducedMotion);
    this._base.updateLighting(deltaSeconds);
  }

  getLogoProjection(camera, canvas) {
    if (!this._logo || !this.mesh || !camera) return null;

    const worldPos = new Vector3();
    this._logo.getWorldPosition(worldPos);

    // Front-facing check relative to camera position at (0, 0, Z)
    const isFrontFacing = worldPos.z > -0.05;

    const rect = canvas?.getBoundingClientRect();
    const canvasWidth = rect ? rect.width : window.innerWidth;
    const canvasHeight = rect ? rect.height : window.innerHeight;
    const canvasLeft = rect ? rect.left : 0;
    const canvasTop = rect ? rect.top : 0;

    const ndc = worldPos.clone().project(camera);
    const screenX = canvasLeft + (ndc.x * 0.5 + 0.5) * canvasWidth;
    const screenY = canvasTop + (-ndc.y * 0.5 + 0.5) * canvasHeight;

    const logoWorldSize = (this._logo.logoSize || 0.16) * this.mesh.scale.x;
    const dist = camera.position.distanceTo(worldPos);
    const vFovRad = (camera.fov * Math.PI) / 180;
    const screenFraction = logoWorldSize / (2 * dist * Math.tan(vFovRad / 2));
    const targetSizePx = Math.max(30, screenFraction * canvasHeight);

    return {
      worldPos,
      isFrontFacing,
      screenX,
      screenY,
      targetSizePx,
    };
  }
}
