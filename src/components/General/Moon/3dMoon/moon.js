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
import { createGarden } from "./garden.js";
import { createMoonBaseLogo } from "./logo.js";

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

    // .catch() is required because init() is async and its returned Promise is not
    // awaited by the caller. Without this, any rejection inside init() (e.g. a Worker
    // construction failure before onerror fires) becomes an unhandled Promise rejection
    // that is silently swallowed - no console error, no onComplete, no feedback.
    this.init(onComplete).catch((err) => {
      console.error("Moon init failed:", err);
      if (onComplete) onComplete();
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
      if (e.data?.error) {
        console.error("Moon texture worker reported an error:", e.data.error);
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

      const { diffuse, bump, rough } = e.data;

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
        const gardenPhi = 115 * (Math.PI / 180);
        const gardenTheta = 0.45;
        const gardenNormal = new Vector3(
          Math.sin(gardenPhi) * Math.sin(gardenTheta),
          Math.cos(gardenPhi),
          Math.sin(gardenPhi) * Math.cos(gardenTheta),
        ).normalize();
        this._garden = createGarden(radius, gardenNormal);
        this.mesh.add(this._garden);
      } catch (err) {
        console.error("Garden initialization failed:", err);
        this._garden = null;
      }

      try {
        const profileImgEl = document.querySelector(
          "#profilePicContainer > img",
        );
        const logoSrc = profileImgEl?.src || "";
        if (logoSrc) {
          const logoMesh = await createMoonBaseLogo(logoSrc, radius);
          if (logoMesh && !this._disposed && this.mesh) {
            this._logo = logoMesh;
            this.mesh.add(this._logo);
          }
        }
      } catch (err) {
        console.error("Logo initialization failed:", err);
        this._logo = null;
      }

      this.mesh.updateMatrix();
      this.scene.add(this.mesh);

      worker.terminate();
      if (this._worker === worker) this._worker = null;

      // onComplete signals that the mesh is now part of the scene graph - textures are
      // uploaded to the GPU and the geometry is registered. The actual loader dismissal
      // is deferred in main.js until after the first renderer.render() call that includes
      // this mesh, confirmed by a requestAnimationFrame callback, so the loader only hides
      // once a real painted frame has reached the screen rather than at scene.add() time.
      if (onComplete) onComplete();
    };

    worker.postMessage({ size: TEX_SIZE, roughSize: ROUGH_SIZE });
  }

  // Releases all GPU-side resources owned by this Moon instance.
  // Must be called before removing the Moon from the scene to avoid WebGL memory leaks,
  // because Three.js does not garbage-collect GPU objects automatically.
  dispose() {
    this._disposed = true;

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
    this._logo?.setOpacity?.(val);
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
