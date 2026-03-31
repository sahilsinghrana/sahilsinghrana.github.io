import * as THREE from "three";

export class Starfield {
  constructor(scene) {
    this.scene = scene;
    this.container = new THREE.Group();
    this.points = null;
    this.init();
  }

  init() {
    const starCount = 8000;
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 200 + Math.random() * 300;
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);

      const warm = Math.random();
      colors[i * 3] = 0.8 + warm * 0.2;
      colors[i * 3 + 1] = 0.8 + (1 - warm) * 0.1;
      colors[i * 3 + 2] = 0.85 + Math.random() * 0.15;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    this.points = new THREE.Points(
      geo,
      new THREE.PointsMaterial({
        size: 0.5,
        vertexColors: true,
        transparent: true,
        opacity: 0.9,
      }),
    );
    this.container.add(this.points);
    this.scene.add(this.container);
    // this.scene.add(this.points);
  }

  setVisibility(visible) {
    if (this.points) this.points.visible = visible;
  }
  updateScroll(scrollY) {
    // Subtle vertical parallax for stars
    this.container.position.y = scrollY * 0.05;
  }
}
