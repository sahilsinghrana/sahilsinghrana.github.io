import * as THREE from "three";

const MOON_RADIUS = 0.4;
export const GARDEN_SURFACE_NORMAL = new THREE.Vector3(
  Math.sin((115 * Math.PI) / 180) * Math.sin(0.45),
  Math.cos((115 * Math.PI) / 180),
  Math.sin((115 * Math.PI) / 180) * Math.cos(0.45),
).normalize();
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
  // Rooted at the origin: a thin, cupped blade that rises along the stem
  // before bending outward, with a broad middle and a pointed tip.
  const positions = [];
  const indices = [];
  const rows = 8;
  const columns = 2;
  for (let row = 0; row <= rows; row += 1) {
    const t = row / rows;
    const breadth = Math.sin(Math.PI * t) ** 0.8;
    for (let column = 0; column <= columns; column += 1) {
      const u = column - 1;
      positions.push(
        u * width * breadth,
        t * length,
        length * (0.14 * t + 0.23 * t * t) +
          width * 0.2 * (1 - u * u) * breadth,
      );
    }
  }
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const a = row * (columns + 1) + column;
      const b = a + columns + 1;
      if (row > 0) indices.push(a, a + 1, b);
      if (row < rows - 1) indices.push(a + 1, b + 1, b);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const material = makeMaterial(LEAF_COLOR, 0.95, { side: THREE.DoubleSide });
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
const TULIP_SCALE = 0.9;
const TULIP_HEIGHT_SCALE = 0.85;

function pickTulipPhase() {
  const roll = Math.random();
  if (roll < 0.3) return "bud";
  if (roll < 0.65) return "opening";
  return "bloom";
}

function createPetalGeometry(width, height, opening, inner) {
  const positions = [];
  const indices = [];
  const rows = 8;
  const columns = 6;
  for (let row = 0; row <= rows; row += 1) {
    const t = row / rows;
    // A rounded belly narrows gently toward the rim; all six bases meet
    // at the stem instead of surrounding a separate, solid-looking core.
    const radius =
      width *
      Math.sin(t * Math.PI * 0.5) *
      (1 + 0.22 * Math.sin(t * Math.PI) - (opening ? 0.32 : 0.18) * t ** 3) *
      (inner ? 0.91 : 1);
    const halfAngle = 0.82 + 0.35 * Math.sin(t * Math.PI);
    for (let column = 0; column <= columns; column += 1) {
      const u = (column / columns) * 2 - 1;
      const angle = u * halfAngle;
      positions.push(
        Math.sin(angle) * radius,
        height * (t - 0.16 * t ** 5 * u * u) * (inner ? 1.035 : 1),
        Math.cos(angle) * radius,
      );
    }
  }
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const a = row * (columns + 1) + column;
      const b = a + columns + 1;
      // Skip the collapsed triangle along the shared, pointed base.
      if (row > 0) indices.push(a, a + 1, b);
      indices.push(a + 1, b + 1, b);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function createTulip(baseColor, phase) {
  const group = new THREE.Group();
  group.scale.set(TULIP_SCALE, TULIP_HEIGHT_SCALE, TULIP_SCALE);
  const geometries = [];
  const materials = [];

  const color = new THREE.Color(baseColor);
  color.offsetHSL(
    randomBetween(-0.015, 0.015),
    randomBetween(-0.05, 0.05),
    randomBetween(-0.04, 0.04),
  );

  const [minHeight, maxHeight] = TULIP_HEIGHT_RANGES[phase];
  const height = randomBetween(minHeight, maxHeight) * 0.85;

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
    const petalW = isOpening ? 0.0062 : 0.0082;
    const petalH = isOpening ? 0.0082 : 0.011;
    const petalGeometries = [false, true].map((inner) =>
      createPetalGeometry(petalW * 0.86, petalH * 1.1, isOpening, inner),
    );
    const petalMaterial = makeMaterial(color, 0.5, {
      metalness: 0.02,
      side: THREE.DoubleSide,
    });
    geometries.push(...petalGeometries);
    materials.push(petalMaterial);

    for (let index = 0; index < 6; index += 1) {
      const inner = index % 2;
      const petal = markSurfaceMesh(
        new THREE.Mesh(petalGeometries[inner], petalMaterial),
      );
      petal.position.y = height - 0.001;
      petal.rotation.y =
        (index / 6) * Math.PI * 2 + randomBetween(-0.025, 0.025);
      petal.scale.y = randomBetween(0.98, 1.02);
      const breadth = randomBetween(0.98, 1.02);
      petal.scale.x = breadth;
      petal.scale.z = breadth;
      group.add(petal);
    }
  }

  // Alternate, clasping leaves rise toward the head rather than forming
  // a flat rosette below the stem.
  for (const side of [-1, 1]) {
    const leaf = createLeaf(
      height * randomBetween(0.62, 0.72),
      randomBetween(0.0026, 0.0033),
    );
    leaf.mesh.position.set(
      side * 0.0006,
      height * (side === -1 ? 0.18 : 0.3),
      0,
    );
    leaf.mesh.rotation.z = side * randomBetween(0.05, 0.12);
    leaf.mesh.rotation.y = (side * Math.PI) / 2 + randomBetween(-0.2, 0.2);
    leaf.mesh.rotation.x = randomBetween(-0.08, 0.08);
    group.add(leaf.mesh);
    geometries.push(leaf.geometry);
    materials.push(leaf.material);
  }

  // Nominal contact points on the existing leaf/petal surfaces, prepared once.
  const touchPoints = Array.from({ length: 4 }, () => new THREE.Vector3());
  const scores = new Float64Array(4).fill(-Infinity);
  const vertex = new THREE.Vector3();
  for (const mesh of group.children) {
    mesh.updateMatrix();
    const positions = mesh.geometry?.attributes.position;
    if (!positions) continue;
    for (let i = 0; i < positions.count; i++) {
      vertex.fromBufferAttribute(positions, i).applyMatrix4(mesh.matrix);
      const y = vertex.y * TULIP_HEIGHT_SCALE;
      if (y < 0.014 || y > 0.028) continue;
      for (let side = 0; side < 4; side++) {
        const score = (side < 2 ? vertex.x : vertex.z) * (side % 2 ? -1 : 1);
        if (score > scores[side]) {
          scores[side] = score;
          touchPoints[side].copy(vertex);
        }
      }
    }
  }
  return {
    group,
    geometries,
    materials,
    height,
    touchPoints: touchPoints.filter((_, i) => scores[i] > 0.001),
  };
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

function createSunflower() {
  const group = new THREE.Group();
  group.name = "Sunflower";
  const headHeight = 0.037;
  const headRotation = new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(1, 0, 0),
    (-35 * Math.PI) / 180,
  );
  const headPoint = (x, y, z) =>
    new THREE.Vector3(x, y, z)
      .applyQuaternion(headRotation)
      .add(new THREE.Vector3(0, headHeight, 0));
  const buffer = () => ({ positions: [], colors: [], indices: [] });
  const petals = buffer();
  const center = buffer();
  const green = buffer();
  // Bake disconnected surfaces into one indexed buffer per material.
  // No petal objects, instance buffers, textures, or animated vertices.
  const surface = (data, rows, columns, point, color) => {
    const start = data.positions.length / 3;
    for (let row = 0; row <= rows; row++) {
      for (let column = 0; column <= columns; column++) {
        const t = row / rows;
        const u = column / columns;
        data.positions.push(...point(t, u).toArray());
        const shade = color(t, u);
        data.colors.push(shade.r, shade.g, shade.b);
      }
    }
    for (let row = 0; row < rows; row++) {
      for (let column = 0; column < columns; column++) {
        const a = start + row * (columns + 1) + column;
        const b = a + columns + 1;
        data.indices.push(a, b, a + 1, a + 1, b, b + 1);
      }
    }
  };
  const gold = new THREE.Color(0xd9ac42);
  const goldBase = new THREE.Color(0xb88a28);
  for (let petal = 0; petal < 18; petal++) {
    const angle = (petal * Math.PI * 2) / 18 + Math.sin(petal * 2.4) * 0.018;
    const length = 0.0051 + Math.sin(petal * 2.3) * 0.0002;
    surface(
      petals,
      5,
      2,
      (t, u) => {
        const radius = 0.0037 + length * t;
        const across = (u * 2 - 1) * 0.001 * Math.sin(Math.PI * t) ** 0.7;
        return headPoint(
          Math.cos(angle) * radius - Math.sin(angle) * across,
          Math.sin(angle) * radius + Math.cos(angle) * across,
          0.0002 +
            Math.sin(t * Math.PI) * 0.0006 -
            t * t * 0.0007 +
            (1 - (u * 2 - 1) ** 2) * 0.0002,
        );
      },
      (t) => goldBase.clone().lerp(gold, 0.35 + t * 0.65),
    );
  }
  const brown = new THREE.Color(0x3f2d1a);
  surface(
    center,
    3,
    20,
    (t, u) => {
      const angle = u * Math.PI * 2;
      return headPoint(
        Math.cos(angle) * t * 0.0044,
        Math.sin(angle) * t * 0.0044,
        0.0007 + 0.0011 * (1 - t * t),
      );
    },
    (t, u) =>
      brown
        .clone()
        .multiplyScalar(
          0.85 + t * 0.12 + 0.09 * Math.sin(u * Math.PI * 34 + t * 19),
        ),
  );

  const leafColor = new THREE.Color(LEAF_COLOR);
  const stemColor = new THREE.Color(STEM_COLOR);
  // Six-sided tapered stem; its ends are buried in the soil and head.
  surface(
    green,
    1,
    6,
    (t, u) => {
      const angle = u * Math.PI * 2;
      const radius = 0.0011 - t * 0.00025;
      return new THREE.Vector3(
        Math.cos(angle) * radius,
        t * headHeight,
        Math.sin(angle) * radius,
      );
    },
    () => stemColor,
  );
  for (const side of [-1, 1]) {
    surface(
      green,
      5,
      2,
      (t, u) => {
        // Broad shoulders low on the blade suggest a heart-shaped leaf.
        const breadth =
          Math.sin(Math.PI * t) ** 0.65 *
          (1 + 0.25 * Math.sin(t * Math.PI * 2));
        return new THREE.Vector3(
          side * (0.0008 + 0.008 * t),
          (side < 0 ? 0.012 : 0.022) + 0.011 * t,
          (u * 2 - 1) * 0.0043 * breadth + Math.sin(t * Math.PI) * 0.001,
        );
      },
      () => leafColor,
    );
  }
  surface(
    green,
    1,
    16,
    (t, u) =>
      headPoint(
        Math.cos(u * Math.PI * 2) * t * 0.0048,
        Math.sin(u * Math.PI * 2) * t * 0.0048,
        -0.00065,
      ),
    () => stemColor,
  );

  const geometries = [];
  const materials = [];
  for (const [name, data, roughness] of [
    ["SunflowerPetals", petals, 0.8],
    ["SunflowerCenter", center, 0.98],
    ["SunflowerGreen", green, 0.95],
  ]) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(data.positions, 3),
    );
    geometry.setAttribute(
      "color",
      new THREE.Float32BufferAttribute(data.colors, 3),
    );
    geometry.setIndex(data.indices);
    geometry.computeVertexNormals();
    const material = makeMaterial(0xffffff, roughness, {
      vertexColors: true,
      side: THREE.DoubleSide,
    });
    const mesh = markSurfaceMesh(new THREE.Mesh(geometry, material));
    mesh.name = name;
    group.add(mesh);
    geometries.push(geometry);
    materials.push(material);
  }
  return { group, geometries, materials, headHeight };
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
  // Nominal bloom centers, captured once for nearby astronaut attention.
  const interestPoints = [];
  group.userData.interestPoints = interestPoints;
  const features = [];
  const colliders = [];
  group.userData.navigation = { features, colliders };

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

  group.updateMatrix();
  const addTulip = (x, z) => {
    const phase = pickTulipPhase();
    const color = TULIP_COLORS[Math.floor(Math.random() * TULIP_COLORS.length)];
    const flower = createTulip(color, phase);
    flower.group.position.set(x, 0.004, z);
    flower.group.rotation.y = randomBetween(0, Math.PI * 2);
    flower.group.updateMatrix();
    group.add(flower.group);
    geometries.push(...flower.geometries);
    materials.push(...flower.materials);

    const shadowSize =
      phase === "bud" ? 0.006 : phase === "opening" ? 0.0078 : 0.0095;
    const shadow = createRootShadow(shadowSize * TULIP_SCALE);
    shadow.mesh.position.set(x, 0.003, z);
    group.add(shadow.mesh);
    rootShadows.push(shadow.mesh);
    geometries.push(shadow.geometry);
    materials.push(shadow.material);

    interestPoints.push({
      base: new THREE.Vector3(x, 0.004, z).applyMatrix4(group.matrix),
      bloom: new THREE.Vector3(
        x,
        0.004 + (flower.height + 0.008) * TULIP_HEIGHT_SCALE,
        z,
      ).applyMatrix4(group.matrix),
    });
    features.push({
      kind: "flower",
      base: interestPoints[interestPoints.length - 1].base.clone(),
      focus: interestPoints[interestPoints.length - 1].bloom.clone(),
      radius: 0.0045,
      touches: flower.touchPoints.map((point) =>
        point
          .clone()
          .applyMatrix4(flower.group.matrix)
          .applyMatrix4(group.matrix),
      ),
    });
    colliders.push({
      position: features[features.length - 1].base,
      radius: 0.0045,
    });
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
  for (const { angle, radius } of tulipPositions) {
    addTulip(Math.cos(angle) * radius, Math.sin(angle) * radius);
  }
  // Track tallest possible bloom so the lamp can clear it.
  const maxTulipHeight = TULIP_HEIGHT_RANGES.bloom[1] + 0.011; // + petal height
  const sunflowerAngle = 1.82;
  const sunflowerRadius = PATCH_RADIUS * 0.78;
  const sunflowerX = Math.cos(sunflowerAngle) * sunflowerRadius;
  const sunflowerZ = Math.sin(sunflowerAngle) * sunflowerRadius;
  const sunflowerFootprint = 0.017;

  for (let index = 0; index < 6; index += 1) {
    let angle = randomBetween(0, Math.PI * 2);
    const radius = randomBetween(PATCH_RADIUS * 0.7, PATCH_RADIUS * 0.98);
    const pebbleSize = randomBetween(0.0035, 0.0065);
    for (let attempt = 0; attempt < 12; attempt++) {
      if (
        Math.hypot(
          Math.cos(angle) * radius - sunflowerX,
          Math.sin(angle) * radius - sunflowerZ,
        ) >=
        sunflowerFootprint + pebbleSize + 0.003
      )
        break;
      angle += Math.PI / 6;
    }
    const pebble = createPebble(pebbleSize);
    const rockX = Math.cos(angle) * radius;
    const rockZ = Math.sin(angle) * radius;
    const rockGround =
      Math.sqrt(moonRadius * moonRadius - rockX * rockX - rockZ * rockZ) -
      moonRadius;
    const rockY = rockGround + pebbleSize * 0.12;
    pebble.mesh.position.set(rockX, rockY, rockZ);
    group.add(pebble.mesh);
    geometries.push(pebble.geometry);
    materials.push(pebble.material);
    const rockBase = pebble.mesh.position.clone().applyMatrix4(group.matrix);
    colliders.push({ position: rockBase, radius: pebbleSize });
    features.push({
      kind: "rock",
      base: rockBase,
      focus: new THREE.Vector3(
        pebble.mesh.position.x,
        rockY + pebbleSize * 0.55,
        pebble.mesh.position.z,
      ).applyMatrix4(group.matrix),
      radius: pebbleSize,
    });
  }

  const lamp = createGardenLamp(maxTulipHeight + 0.006);
  lamp.group.position.set(0, 0.001, 0);
  group.add(lamp.group);
  geometries.push(...lamp.geometries);
  materials.push(...lamp.materials);
  const lampBase = new THREE.Vector3(0, 0.001, 0).applyMatrix4(group.matrix);
  colliders.push({ position: lampBase, radius: 0.003 });
  features.push({
    kind: "lamp",
    base: lampBase,
    focus: new THREE.Vector3(0, 0.001 + maxTulipHeight + 0.006, 0).applyMatrix4(
      group.matrix,
    ),
    radius: 0.003,
  });

  // Construct last so the two existing tulips keep their random choices.
  const sunflower = createSunflower();
  sunflower.group.position.set(sunflowerX, 0.004, sunflowerZ);
  sunflower.group.rotation.y = -sunflowerAngle - Math.PI / 2;
  group.add(sunflower.group);
  geometries.push(...sunflower.geometries);
  materials.push(...sunflower.materials);
  movingFlowers.push(sunflower.group);
  const sunflowerBase = sunflower.group.position
    .clone()
    .applyMatrix4(group.matrix);
  const sunflowerBloom = new THREE.Vector3(
    sunflowerX,
    0.004 + sunflower.headHeight,
    sunflowerZ,
  ).applyMatrix4(group.matrix);
  interestPoints.push({ base: sunflowerBase, bloom: sunflowerBloom });
  features.push({
    kind: "flower",
    base: sunflowerBase.clone(),
    focus: sunflowerBloom.clone(),
    radius: sunflowerFootprint,
  });
  colliders.push({
    position: sunflowerBase.clone(),
    radius: sunflowerFootprint,
  });
  const sunflowerShadow = createRootShadow(0.008);
  sunflowerShadow.mesh.name = "SunflowerRootShadow";
  sunflowerShadow.mesh.position.set(sunflowerX, 0.003, sunflowerZ);
  group.add(sunflowerShadow.mesh);
  rootShadows.push(sunflowerShadow.mesh);
  geometries.push(sunflowerShadow.geometry);
  materials.push(sunflowerShadow.material);

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
