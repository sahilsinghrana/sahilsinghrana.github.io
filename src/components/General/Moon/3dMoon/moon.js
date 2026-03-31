import * as THREE from "three";
import MoonWorker from "./texture-worker.js?worker";
export class Moon {
  constructor(scene, onComplete) {
    this.scene = scene;
    this.mesh = null;
    this.init(onComplete);
  }

  init(onComplete) {
    const worker = new MoonWorker();
    const TEX_SIZE = 630;
    const ROUGH_SIZE = 490;

    worker.onmessage = (e) => {
      const diffuseTex = new THREE.DataTexture(
        new Uint8Array(e.data.diffuse),
        TEX_SIZE,
        TEX_SIZE,
        THREE.RGBAFormat,
      );
      diffuseTex.colorSpace = THREE.SRGBColorSpace;
      diffuseTex.needsUpdate = true;

      const bumpTex = new THREE.DataTexture(
        new Uint8Array(e.data.bump),
        TEX_SIZE,
        TEX_SIZE,
        THREE.RGBAFormat,
      );
      bumpTex.needsUpdate = true;

      const roughTex = new THREE.DataTexture(
        new Uint8Array(e.data.rough),
        ROUGH_SIZE,
        ROUGH_SIZE,
        THREE.RGBAFormat,
      );
      roughTex.needsUpdate = true;

      const material = new THREE.MeshStandardMaterial({
        map: diffuseTex,
        bumpMap: bumpTex,
        bumpScale: 0.045,
        roughnessMap: roughTex,
        roughness: 0.92,
      });
      const radius = 0.4;
      this.mesh = new THREE.Mesh(
        new THREE.SphereGeometry(radius, 60, 60),
        material,
      );
      this.mesh.castShadow = true;
      this.mesh.receiveShadow = true;
      this.scene.add(this.mesh);

      worker.terminate();
      if (onComplete) onComplete();
    };

    worker.postMessage({ size: TEX_SIZE, roughSize: ROUGH_SIZE });
  }

  setVisibility(visible) {
    if (this.mesh) this.mesh.visible = visible;
  }

  update(elapsed) {
    if (this.mesh) this.mesh.rotation.y = elapsed * 0.04;
  }
}
