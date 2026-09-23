import * as THREE from "three";

const MOON_RADIUS = 0.4;
const PATCH_RADIUS = 0.082;
const LUNAR_GREY = new THREE.Color(0x77736b);
const SOIL_COLOR = new THREE.Color(0x665849);
const STEM_COLOR = 0x54693f;
const LEAF_COLOR = 0x62784f;
const TULIP_COLORS = [
  0xc23b4a, // red
  0xd6a419, // yellow
  0xf5f0e6, // white
  0x7a4fa3, // purple
  0xd9647a, // pink
  0xb5542e, // orange
  0x9f5266, // dusty rose (original)
];
const REGOLITH_COLOR = 0x88837a;
const BULB_LIGHT_COLOR = 0xffd9a0;
const HEMI_SKY_COLOR = 0xbfd6ff;
const HEMI_GROUND_COLOR = 0x4a3f33;

const randomBetween = (min, max) => min + Math.random() * (max - min);

// Ground-level / decal-like meshes: they receive shadows from things above
// them but must never cast shadows themselves (self-shadowing/acne risk).
function markGroundMesh(mesh) {
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  return mesh;
}

// Above-ground props (flowers, pebbles, lamp): normal two-way shadowing.
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
    mesh: markGroundMesh(new THREE.Mesh(geometry, material)),
    geometry,
    material,
  };
}

function createStem(height, radius = 0.0025) {
  const geometry = new THREE.CylinderGeometry(radius * 0.7, radius, height, 7);
  geometry.translate(0, height / 2, 0);
  const material = makeMaterial(STEM_COLOR);
  return {
    mesh: markSurfaceMesh(new THREE.Mesh(geometry, material)),
    geometry,
    material,
  };
}

function createLeaf(length, width) {
  // Elongated, strap-like blade rather than a stubby oval — real tulip
  // leaves have a much higher length:width ratio.
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
  bud: [0.021, 0.027],
  opening: [0.029, 0.037],
  bloom: [0.036, 0.046],
};

function pickTulipPhase() {
  const roll = Math.random();
  if (roll < 0.3) return "bud";
  if (roll < 0.65) return "opening";
  return "bloom";
}

function createTulip(baseColor, phase) {
  const group = new THREE.Group();
  const geometries = [];
  const materials = [];

  const color = new THREE.Color(baseColor);
  color.offsetHSL(
    randomBetween(-0.015, 0.015),
    randomBetween(-0.05, 0.05),
    randomBetween(-0.04, 0.04),
  );

  const [minHeight, maxHeight] = TULIP_HEIGHT_RANGES[phase];
  const height = randomBetween(minHeight, maxHeight);

  const stem = createStem(height, phase === "bud" ? 0.00105 : 0.00145);
  stem.mesh.rotation.z = randomBetween(-0.05, 0.05);
  group.add(stem.mesh);
  geometries.push(stem.geometry);
  materials.push(stem.material);

  if (phase === "bud") {
    // A closed tulip bud is just the 6 tepals themselves, tightly furled —
    // there's no true calyx/sepal collar on a real tulip, so we skip that.
    const headGeometry = new THREE.SphereGeometry(
      1,
      10,
      8,
      0,
      Math.PI * 2,
      0,
      Math.PI * 0.85,
    );
    headGeometry.scale(0.0048, 0.0082, 0.0048);
    const headMaterial = makeMaterial(color, 0.55, { metalness: 0.02 });
    const head = markSurfaceMesh(new THREE.Mesh(headGeometry, headMaterial));
    head.rotation.x = Math.PI;
    head.position.y = height + 0.006;
    head.rotation.z = randomBetween(-0.15, 0.15);
    group.add(head);
    geometries.push(headGeometry);
    materials.push(headMaterial);
  } else {
    // Real tulips always have 6 tepals (3 outer + 3 inner), whether
    // half-open or fully bloomed — only the flare/tilt changes.
    const isOpening = phase === "opening";
    const petalCount = 6;
    const petalW = isOpening ? 0.0062 : 0.0082;
    const petalH = isOpening ? 0.0082 : 0.011;
    // Kept modest even at full bloom so the flower stays a cupped
    // goblet/chalice shape instead of splaying flat like a star.
    const flare = isOpening ? 0.22 : 0.4;
    const tilt = isOpening ? -0.12 : -0.32;
    const curl = isOpening ? 0.12 : 0.26;

    const coreGeometry = new THREE.SphereGeometry(1, 10, 8);
    coreGeometry.scale(petalW * 0.5, petalH * 0.6, petalW * 0.5);
    const coreMaterial = makeMaterial(color, 0.5, { metalness: 0.02 });
    const core = markSurfaceMesh(new THREE.Mesh(coreGeometry, coreMaterial));
    core.position.y = height + petalH * 0.5;
    group.add(core);
    geometries.push(coreGeometry);
    materials.push(coreMaterial);

    const petalGeometry = new THREE.SphereGeometry(
      1,
      8,
      7,
      0,
      Math.PI,
      0,
      Math.PI * 0.7,
    );
    petalGeometry.translate(0, -0.5, 0);
    petalGeometry.scale(petalW * 0.55, petalH, petalW * 0.4);
    const petalMaterial = makeMaterial(color, 0.5, {
      metalness: 0.02,
      side: THREE.DoubleSide,
    });
    geometries.push(petalGeometry);
    materials.push(petalMaterial);

    for (let index = 0; index < petalCount; index += 1) {
      const petal = markSurfaceMesh(
        new THREE.Mesh(petalGeometry, petalMaterial),
      );
      const angle =
        (index / petalCount) * Math.PI * 2 + randomBetween(-0.08, 0.08);
      petal.position.y = height + petalH * 0.42;
      petal.position.x = Math.cos(angle) * petalW * flare;
      petal.position.z = Math.sin(angle) * petalW * flare;
      petal.rotation.y = angle;
      petal.rotation.x = tilt + randomBetween(-curl * 0.3, curl * 0.3);
      petal.scale.setScalar(randomBetween(0.92, 1.08));
      group.add(petal);
    }
  }

  // Leaves sheathe the stem near its base (as on a real tulip) instead of
  // being scattered at random heights up the stem.
  const leafChance = phase === "bud" ? 0.5 : 0.85;
  for (const side of [-1, 1]) {
    if (Math.random() < leafChance) {
      const leaf = createLeaf(
        randomBetween(0.014, 0.02),
        randomBetween(0.0022, 0.0032),
      );
      leaf.mesh.position.set(
        side * 0.0015,
        height * randomBetween(0.06, 0.14),
        0,
      );
      leaf.mesh.rotation.z = side * randomBetween(0.75, 1.05);
      leaf.mesh.rotation.y = randomBetween(-0.3, 0.3);
      leaf.mesh.rotation.x = randomBetween(-0.1, 0.1);
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
    mesh: markGroundMesh(new THREE.Mesh(geometry, material)),
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

function createGardenLamp(clearanceHeight) {
  const group = new THREE.Group();
  const geometries = [];
  const materials = [];

  // Pole is tall enough to clear the tallest bloom, so the bulb lights the
  // garden from above instead of sitting inside the flower canopy.
  const poleHeight = clearanceHeight;
  const poleGeometry = new THREE.CylinderGeometry(
    0.0006,
    0.0008,
    poleHeight,
    6,
  );
  poleGeometry.translate(0, poleHeight / 2, 0);
  const poleMaterial = makeMaterial(0x3a3a3a, 0.6, { metalness: 0.3 });
  const pole = markSurfaceMesh(new THREE.Mesh(poleGeometry, poleMaterial));
  group.add(pole);
  geometries.push(poleGeometry);
  materials.push(poleMaterial);

  const bulbGeometry = new THREE.SphereGeometry(0.004, 12, 10);
  const bulbMaterial = new THREE.MeshStandardMaterial({
    color: BULB_LIGHT_COLOR,
    emissive: new THREE.Color(BULB_LIGHT_COLOR),
    emissiveIntensity: 0.6,
    roughness: 0.3,
    metalness: 0,
  });
  const bulb = markSurfaceMesh(new THREE.Mesh(bulbGeometry, bulbMaterial));
  bulb.position.y = poleHeight;
  group.add(bulb);
  geometries.push(bulbGeometry);
  materials.push(bulbMaterial);

  const glowGeometry = new THREE.SphereGeometry(0.0075, 10, 8);
  const glowMaterial = new THREE.MeshBasicMaterial({
    color: BULB_LIGHT_COLOR,
    transparent: true,
    opacity: 0.1,
    depthWrite: false,
  });
  const glow = new THREE.Mesh(glowGeometry, glowMaterial);
  glow.position.y = poleHeight;
  group.add(glow);
  geometries.push(glowGeometry);
  materials.push(glowMaterial);

  // Intensity/distance tuned down relative to the taller pole — the extra
  // height already spreads the light further, so keeping the original
  // intensity here blows out highlights and deepens shadow contrast.
  const baseIntensity = 0.22;
  const light = new THREE.PointLight(
    BULB_LIGHT_COLOR,
    baseIntensity,
    0.14,
    1.3,
  );
  light.position.y = poleHeight;
  light.castShadow = true;
  light.shadow.mapSize.set(256, 256);
  light.shadow.camera.near = 0.01;
  light.shadow.camera.far = 0.2;
  light.shadow.bias = -0.0015;
  light.shadow.radius = 3;
  group.add(light);

  return { group, geometries, materials, light, baseIntensity };
}

export function createGarden(moonRadius = MOON_RADIUS, gardenNormal) {
  const group = new THREE.Group();
  group.name = "LunarGarden";
  const geometries = [];
  const materials = [];
  const movingFlowers = [];
  const rootShadows = [];

  const surfaceNormal = (gardenNormal || new THREE.Vector3(0, 1, 0))
    .clone()
    .normalize();
  group.position.copy(surfaceNormal).multiplyScalar(moonRadius);
  group.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    surfaceNormal,
  );

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
      phase === "bud" ? 0.006 : phase === "opening" ? 0.0078 : 0.0095;
    const shadow = createRootShadow(shadowSize);
    shadow.mesh.position.set(x, 0.003, z);
    group.add(shadow.mesh);
    rootShadows.push(shadow.mesh);
    geometries.push(shadow.geometry);
    materials.push(shadow.material);

    movingFlowers.push(flower.group);
  };

  // Two tulips (user's requested reduced count), with jitter so they don't
  // read as a perfectly mirrored pair.
  const tulipPositions = [
    {
      angle: 0.25 + randomBetween(-0.15, 0.15),
      radius: PATCH_RADIUS * randomBetween(0.72, 0.88),
    },
    {
      angle: Math.PI + 0.25 + randomBetween(-0.15, 0.15),
      radius: PATCH_RADIUS * randomBetween(0.72, 0.88),
    },
  ];
  let maxTulipHeight = 0;
  for (const { angle, radius } of tulipPositions) {
    addTulip(Math.cos(angle) * radius, Math.sin(angle) * radius);
  }
  // Track tallest possible bloom so the lamp can clear it.
  maxTulipHeight = TULIP_HEIGHT_RANGES.bloom[1] + 0.011; // + petal height

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

  const lamp = createGardenLamp(maxTulipHeight + 0.006);
  lamp.group.position.set(0, 0.001, 0);
  group.add(lamp.group);
  geometries.push(...lamp.geometries);
  materials.push(...lamp.materials);

  const hemiLight = new THREE.HemisphereLight(
    HEMI_SKY_COLOR,
    HEMI_GROUND_COLOR,
    0.11,
  );
  hemiLight.position.set(0, 0.05, 0);
  group.add(hemiLight);

  let disposed = false;
  group.update = (timeMs) => {
    if (disposed) return;
    const time = timeMs * 0.001;
    movingFlowers.forEach((flower, index) => {
      flower.rotation.z = Math.sin(time * 0.55 + index * 1.7) * 0.022;
      flower.rotation.x = Math.cos(time * 0.45 + index) * 0.016;
    });
    lamp.light.intensity = lamp.baseIntensity + Math.sin(time * 1.6) * 0.06;
  };

  group.dispose = () => {
    if (disposed) return;
    disposed = true;
    geometries.forEach((geometry) => geometry.dispose());
    materials.forEach((material) => material.dispose());
    if (lamp.light.shadow?.map) {
      lamp.light.shadow.map.dispose();
    }
    geometries.length = 0;
    materials.length = 0;
    movingFlowers.length = 0;
    rootShadows.length = 0;
    group.clear();
  };

  return group;
}
