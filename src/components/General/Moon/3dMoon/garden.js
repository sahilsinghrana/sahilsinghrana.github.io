import * as THREE from "three";

const MOON_RADIUS = 0.4;
const PATCH_RADIUS = 0.082;
const LUNAR_GREY = new THREE.Color(0x77736b);
const SOIL_COLOR = new THREE.Color(0x665849);
const STEM_COLOR = 0x52694d;
const LEAF_COLOR = 0x687b5b;
const TULIP_COLORS = [
  0x9f5266, 0xb57983, 0xa78c91, 0x92707d, 0xc98a9c, 0x7d5a6b, 0xb26a6a,
];
const REGOLITH_COLOR = 0x88837a;

const randomBetween = (min, max) => min + Math.random() * (max - min);

function markSurfaceMesh(mesh) {
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function makeMaterial(color, roughness = 0.9, options = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness: 0,
    ...options,
  });
}

function createCurvedPatch() {
  const segments = 24;
  const rings = 4;
  const positions = [0, 0.004, 0];
  const colors = [SOIL_COLOR.r, SOIL_COLOR.g, SOIL_COLOR.b];
  const alphas = [1];
  const indices = [];

  for (let ring = 1; ring <= rings; ring += 1) {
    const radius = (PATCH_RADIUS * ring) / rings;
    const fade = 1 - ring / rings;
    const blended = SOIL_COLOR.clone().lerp(LUNAR_GREY, 1 - fade);
    for (let segment = 0; segment < segments; segment += 1) {
      const angle = (segment / segments) * Math.PI * 2;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = 0.004 - (x * x + z * z) / (2 * MOON_RADIUS);
      positions.push(x, y, z);
      colors.push(blended.r, blended.g, blended.b);
      alphas.push(Math.max(0, fade * fade));
    }
  }

  for (let segment = 0; segment < segments; segment += 1) {
    indices.push(0, 1 + segment, 1 + ((segment + 1) % segments));
  }
  for (let ring = 1; ring < rings; ring += 1) {
    const innerStart = 1 + (ring - 1) * segments;
    const outerStart = 1 + ring * segments;
    for (let segment = 0; segment < segments; segment += 1) {
      const next = (segment + 1) % segments;
      indices.push(
        innerStart + segment,
        outerStart + segment,
        outerStart + next,
        innerStart + segment,
        outerStart + next,
        innerStart + next,
      );
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.setAttribute(
    "gardenAlpha",
    new THREE.Float32BufferAttribute(alphas, 1),
  );
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  const material = makeMaterial(0xffffff, 1, {
    vertexColors: true,
    transparent: true,
    depthWrite: false,
  });
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        "#include <common>\nattribute float gardenAlpha;\nvarying float vGardenAlpha;",
      )
      .replace(
        "#include <begin_vertex>",
        "vGardenAlpha = gardenAlpha;\n#include <begin_vertex>",
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        "#include <common>\nvarying float vGardenAlpha;",
      )
      .replace(
        "#include <alphatest_fragment>",
        "diffuseColor.a *= vGardenAlpha;\n#include <alphatest_fragment>",
      );
  };
  material.customProgramCacheKey = () => "lunar-garden-curved-patch";

  return {
    mesh: markSurfaceMesh(new THREE.Mesh(geometry, material)),
    geometry,
    material,
  };
}

function createStem(height, radius = 0.0025) {
  const geometry = new THREE.CylinderGeometry(radius * 0.75, radius, height, 6);
  geometry.translate(0, height / 2, 0);
  const material = makeMaterial(STEM_COLOR);
  return {
    mesh: markSurfaceMesh(new THREE.Mesh(geometry, material)),
    geometry,
    material,
  };
}

function createLeaf(length, width) {
  const geometry = new THREE.SphereGeometry(1, 6, 4);
  geometry.scale(width, length, 0.003);
  const material = makeMaterial(LEAF_COLOR, 0.95);
  return {
    mesh: markSurfaceMesh(new THREE.Mesh(geometry, material)),
    geometry,
    material,
  };
}

const TULIP_HEIGHT_RANGES = {
  bud: [0.016, 0.021],
  opening: [0.022, 0.028],
  bloom: [0.027, 0.034],
};

function pickTulipPhase() {
  const roll = Math.random();
  if (roll < 0.3) return "bud";
  if (roll < 0.65) return "opening";
  return "bloom";
}

function createTulip(color, phase) {
  const group = new THREE.Group();
  const geometries = [];
  const materials = [];

  const [minHeight, maxHeight] = TULIP_HEIGHT_RANGES[phase];
  const height = randomBetween(minHeight, maxHeight);

  const stem = createStem(height, phase === "bud" ? 0.00095 : 0.0013);
  group.add(stem.mesh);
  geometries.push(stem.geometry);
  materials.push(stem.material);

  if (phase === "bud") {
    const headGeometry = new THREE.SphereGeometry(1, 8, 6);
    headGeometry.scale(0.0042, 0.0072, 0.0042);
    const headMaterial = makeMaterial(color, 0.85);
    const head = markSurfaceMesh(new THREE.Mesh(headGeometry, headMaterial));
    head.position.y = height + 0.0055;
    head.rotation.z = randomBetween(-0.12, 0.12);
    group.add(head);
    geometries.push(headGeometry);
    materials.push(headMaterial);
  } else {
    const isOpening = phase === "opening";
    const petalCount = isOpening ? 4 : 6;
    const petalW = isOpening ? 0.0055 : 0.0072;
    const petalH = isOpening ? 0.0072 : 0.0096;
    const flare = isOpening ? 0.32 : 0.62;
    const tilt = isOpening ? -0.18 : -0.4;

    const coreGeometry = new THREE.SphereGeometry(1, 8, 6);
    coreGeometry.scale(petalW * 0.55, petalH * 0.65, petalW * 0.55);
    const coreMaterial = makeMaterial(color, 0.88);
    const core = markSurfaceMesh(new THREE.Mesh(coreGeometry, coreMaterial));
    core.position.y = height + petalH * 0.55;
    group.add(core);
    geometries.push(coreGeometry);
    materials.push(coreMaterial);

    const petalGeometry = new THREE.SphereGeometry(1, 6, 5);
    petalGeometry.scale(petalW * 0.5, petalH, petalW * 0.35);
    const petalMaterial = makeMaterial(color, 0.86);
    geometries.push(petalGeometry);
    materials.push(petalMaterial);
    for (let index = 0; index < petalCount; index += 1) {
      const petal = markSurfaceMesh(
        new THREE.Mesh(petalGeometry, petalMaterial),
      );
      const angle = (index / petalCount) * Math.PI * 2;
      petal.position.y = height + petalH * 0.48;
      petal.position.x = Math.cos(angle) * petalW * flare;
      petal.position.z = Math.sin(angle) * petalW * flare;
      petal.rotation.y = angle;
      petal.rotation.x = tilt;
      group.add(petal);
    }
  }

  const leafChance = phase === "bud" ? 0.45 : 0.8;
  for (const side of [-1, 1]) {
    if (Math.random() < leafChance) {
      const leaf = createLeaf(
        randomBetween(0.007, 0.011),
        randomBetween(0.0025, 0.004),
      );
      leaf.mesh.position.set(
        side * 0.0018,
        height * randomBetween(0.28, 0.45),
        0,
      );
      leaf.mesh.rotation.z = side * randomBetween(0.6, 0.95);
      leaf.mesh.rotation.y = randomBetween(0, Math.PI * 2);
      group.add(leaf.mesh);
      geometries.push(leaf.geometry);
      materials.push(leaf.material);
    }
  }

  return { group, geometries, materials, height };
}

function createRootShadow(size) {
  const geometry = new THREE.CircleGeometry(size, 12);
  geometry.rotateX(-Math.PI / 2);
  const material = makeMaterial(0x3f3932, 1, {
    transparent: true,
    opacity: 0.4,
    depthWrite: false,
  });
  return {
    mesh: markSurfaceMesh(new THREE.Mesh(geometry, material)),
    geometry,
    material,
  };
}

function createPebble(size) {
  const geometry = new THREE.DodecahedronGeometry(size, 0);
  geometry.scale(1, 0.55, 0.85);
  const material = makeMaterial(REGOLITH_COLOR, 1);
  return {
    mesh: markSurfaceMesh(new THREE.Mesh(geometry, material)),
    geometry,
    material,
  };
}

function createCrater(size) {
  const geometry = new THREE.TorusGeometry(size, size * 0.22, 5, 12);
  const material = makeMaterial(0x5f5b54, 1);
  const mesh = markSurfaceMesh(new THREE.Mesh(geometry, material));
  mesh.rotation.x = Math.PI / 2;
  mesh.position.y = 0.002;
  return { mesh, geometry, material };
}

export function createGarden() {
  const group = new THREE.Group();
  group.name = "LunarGarden";
  const geometries = [];
  const materials = [];
  const movingFlowers = [];
  const rootShadows = [];

  const patch = createCurvedPatch();
  group.add(patch.mesh);
  geometries.push(patch.geometry);
  materials.push(patch.material);

  const addTulip = (x, z) => {
    const phase = pickTulipPhase();
    const color = TULIP_COLORS[Math.floor(Math.random() * TULIP_COLORS.length)];
    const flower = createTulip(color, phase);
    flower.group.position.set(x, 0.004, z);
    flower.group.rotation.y = randomBetween(0, Math.PI * 2);
    group.add(flower.group);
    geometries.push(...flower.geometries);
    materials.push(...flower.materials);

    const shadowSize =
      phase === "bud" ? 0.0055 : phase === "opening" ? 0.007 : 0.0085;
    const shadow = createRootShadow(shadowSize);
    shadow.mesh.position.set(x, 0.003, z);
    group.add(shadow.mesh);
    rootShadows.push(shadow.mesh);
    geometries.push(shadow.geometry);
    materials.push(shadow.material);

    movingFlowers.push(flower.group);
  };

  const tulipPositions = [
    { angle: 0.25, radius: PATCH_RADIUS * 0.82 },
    { angle: Math.PI + 0.25, radius: PATCH_RADIUS * 0.82 },
  ];
  for (const { angle, radius } of tulipPositions) {
    addTulip(Math.cos(angle) * radius, Math.sin(angle) * radius);
  }

  for (let index = 0; index < 6; index += 1) {
    const angle = randomBetween(0, Math.PI * 2);
    const radius = randomBetween(PATCH_RADIUS * 0.7, PATCH_RADIUS * 0.98);
    const pebble = createPebble(randomBetween(0.0035, 0.0065));
    pebble.mesh.position.set(
      Math.cos(angle) * radius,
      0.002,
      Math.sin(angle) * radius,
    );
    group.add(pebble.mesh);
    geometries.push(pebble.geometry);
    materials.push(pebble.material);
  }

  for (let index = 0; index < 2; index += 1) {
    const crater = createCrater(randomBetween(0.007, 0.011));
    const angle = randomBetween(0, Math.PI * 2);
    const radius = randomBetween(PATCH_RADIUS * 0.68, PATCH_RADIUS * 0.92);
    crater.mesh.position.x = Math.cos(angle) * radius;
    crater.mesh.position.z = Math.sin(angle) * radius;
    group.add(crater.mesh);
    geometries.push(crater.geometry);
    materials.push(crater.material);
  }

  let disposed = false;
  group.update = (timeMs) => {
    if (disposed) return;
    const time = timeMs * 0.001;
    movingFlowers.forEach((flower, index) => {
      flower.rotation.z = Math.sin(time * 0.55 + index * 1.7) * 0.022;
      flower.rotation.x = Math.cos(time * 0.45 + index) * 0.016;
    });
  };

  group.dispose = () => {
    if (disposed) return;
    disposed = true;
    geometries.forEach((geometry) => geometry.dispose());
    materials.forEach((material) => material.dispose());
    geometries.length = 0;
    materials.length = 0;
    movingFlowers.length = 0;
    rootShadows.length = 0;
    group.clear();
  };

  return group;
}
