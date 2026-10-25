import {
  BoxGeometry,
  BufferGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  Euler,
  Float32BufferAttribute,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Quaternion,
  SphereGeometry,
  SpotLight,
  Vector3,
} from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import {
  PLAZA_SCALE,
  PLAZA_DIAMETER,
  HABITAT_SCALE,
  ROVER_SCALE,
  ROCKET_SCALE,
  HABITAT_POSITION,
  ROCKET_POSITION,
  ASTRONAUT_SCALES,
} from "./dimensions.js";
import { LOGO_NORMAL } from "./logo.js";
import { createAstronautBehavior } from "./astronaut-behavior.js";
import {
  createRandom,
  createWalker,
  createWanderSimulation,
} from "./wander.js";
import { ANCHOR_POSITION as FLAG_ANCHOR_POSITION } from "./flag.js";
import { GARDEN_SURFACE_NORMAL } from "./garden.js";

// Shape reference: Kenney Space Kit (CC0), rated 4.8/5 (6 ratings).
// https://kenney-assets.itch.io/space-kit
// Implementation references: threejs.org/manual/pages/{scenegraph,
// optimize-lots-of-objects,shadows,cleanup}.html. No external model payloads.
export const BASE_REVEAL_SECONDS = 0.4;
const COLORS = {
  suit: 0xc9c9bf,
  white: 0xe8e7df,
  hull: 0x999b96,
  dark: 0x252a30,
  metal: 0x77736b,
  blue: 0x8392a4,
  helmetBlue: 0x527fad,
  rose: 0x9f5266,
  warm: 0xffd9a0,
};
const UP = new Vector3(0, 1, 0);
const FRONT = new Vector3(0, 0, 1);
const TAU = Math.PI * 2;
const HEADLIGHT_INTENSITY = 0.2;
const smooth = (t) => t * t * (3 - 2 * t);

/** Local frame: X/Y span the logo; +Z points out of the Moon. */
export function placeOnSurface(
  object,
  radius,
  x,
  y,
  altitude = 0,
  heading = 0,
) {
  const z = Math.sqrt(Math.max(0, radius * radius - x * x - y * y));
  object.position.set(x, y, z);
  object.quaternion.setFromUnitVectors(UP, object.position.normalize());
  object.position.multiplyScalar(radius + altitude);
  // Rotation about the object's own up axis keeps its feet on the surface.
  object.rotateY(heading);
  object.position.z -= radius;
}

/** A tiny lunar diorama. All dimensions and routes are relative to moonRadius. */
export function createMoonBase(
  moonRadius = 0.4,
  {
    seed = Math.floor(Math.random() * 0xffffffff),
    gardenInterestPoints = [],
    gardenLayout = null,
    flagInterest = null,
  } = {},
) {
  const group = new Group();
  group.name = "LunarBase";
  group.position.copy(LOGO_NORMAL).multiplyScalar(moonRadius);
  group.quaternion.setFromUnitVectors(FRONT, LOGO_NORMAL);
  group.visible = false;
  const r = moonRadius;
  const openingRandom = createRandom(seed ^ 0x68a2d47);
  const geometries = new Set();
  const materials = new Set();
  const primitives = {
    box: new BoxGeometry(1, 1, 1),
    sphere: new SphereGeometry(1, 10, 6),
    cylinder: new CylinderGeometry(1, 1, 1, 10),
    cone: new ConeGeometry(1, 1, 10),
  };
  Object.values(primitives).forEach((geometry) => geometries.add(geometry));
  const matte = new MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.88,
    metalness: 0.08,
  });
  const glow = new MeshStandardMaterial({
    color: COLORS.warm,
    emissive: COLORS.warm,
    emissiveIntensity: 0.45,
    roughness: 0.8,
  });
  materials.add(matte);
  materials.add(glow);
  const headlampMaterial = new MeshBasicMaterial({ color: COLORS.warm });
  materials.add(headlampMaterial);
  const matrix = new Matrix4();
  const quaternion = new Quaternion();
  const position = new Vector3();
  const scale = new Vector3();
  const euler = new Euler();
  const color = new Color();

  // Bake transformed primitives and linear vertex colors once, not every frame.
  function part(kind, tint, size, at = [0, 0, 0], rotation = [0, 0, 0]) {
    const geometry = primitives[kind].toNonIndexed();
    position.fromArray(at).multiplyScalar(r);
    scale.fromArray(size).multiplyScalar(r);
    quaternion.setFromEuler(euler.fromArray(rotation));
    matrix.compose(position, quaternion, scale);
    geometry.applyMatrix4(matrix);
    color.setHex(tint);
    const values = new Float32Array(geometry.attributes.position.count * 3);
    for (let i = 0; i < values.length; i += 3) color.toArray(values, i);
    geometry.setAttribute("color", new Float32BufferAttribute(values, 3));
    return geometry;
  }
  function assembly(parts, material = matte) {
    const geometry = mergeGeometries(parts);
    parts.forEach((piece) => piece.dispose());
    geometries.add(geometry);
    const mesh = new Mesh(geometry, material);
    mesh.receiveShadow = true;
    // Miniature props do not add any shadow-map passes.
    mesh.castShadow = false;
    return mesh;
  }
  const reveals = [];
  function mount(mesh, x, y, heading = 0) {
    const anchor = new Group();
    placeOnSurface(anchor, r, x * r, y * r, 0.001 * r, heading);
    anchor.add(mesh);
    group.add(anchor);
    reveals.push(mesh);
    return anchor;
  }

  // Thin raised curb follows the sphere; never cover the stencil's center.
  const curbParts = [];
  const markerParts = [];
  const curbAnchor = new Group();
  for (let i = 0; i < 48; i++) {
    const angle = (i / 48) * TAU;
    placeOnSurface(
      curbAnchor,
      r,
      (Math.cos(angle) * r * PLAZA_DIAMETER) / 2,
      (Math.sin(angle) * r * PLAZA_DIAMETER) / 2,
      0.002 * r,
      angle + Math.PI / 2,
    );
    curbAnchor.updateMatrix();
    const curb = part(
      "box",
      COLORS.metal,
      [0.043 * PLAZA_SCALE, 0.009, 0.008],
      [0, 0.003, 0],
    );
    curb.applyMatrix4(curbAnchor.matrix);
    curbParts.push(curb);
    if (i % 8 === 0) {
      const marker = part(
        "box",
        COLORS.warm,
        [0.012, 0.003, 0.008],
        [0, 0.009, 0],
      );
      marker.applyMatrix4(curbAnchor.matrix);
      markerParts.push(marker);
    }
  }
  const curb = assembly(curbParts);
  const markers = assembly(markerParts, glow);
  group.add(curb, markers);
  // Curb stays at its surface coordinates; reveal by visibility, not scaling.

  const habitat = assembly([
    part("box", COLORS.metal, [0.24, 0.016, 0.16], [0, 0.008, 0]),
    part("box", COLORS.hull, [0.22, 0.08, 0.13], [0, 0.052, 0]),
    part(
      "cylinder",
      COLORS.suit,
      [0.066, 0.22, 0.066],
      [0, 0.08, 0],
      [0, 0, Math.PI / 2],
    ),
    part("box", COLORS.dark, [0.042, 0.083, 0.006], [0, 0.052, 0.069]),
    part("box", COLORS.blue, [0.075, 0.006, 0.055], [-0.085, 0.096, 0]),
    part("cylinder", COLORS.metal, [0.002, 0.07, 0.002], [0.075, 0.13, 0]),
    part("sphere", COLORS.metal, [0.016, 0.006, 0.016], [0.075, 0.164, 0]),
    part("box", COLORS.dark, [0.023, 0.008, 0.018], [0, 0.109, 0.081]),
  ]);
  habitat.geometry.scale(HABITAT_SCALE, HABITAT_SCALE, HABITAT_SCALE);
  const habitatAnchor = mount(
    habitat,
    HABITAT_POSITION.x,
    HABITAT_POSITION.y,
    -0.35,
  );
  const windows = assembly(
    [
      part("box", COLORS.warm, [0.035, 0.02, 0.004], [-0.066, 0.058, 0.07]),
      part("box", COLORS.warm, [0.035, 0.02, 0.004], [0.066, 0.058, 0.07]),
      part("box", COLORS.warm, [0.025, 0.005, 0.004], [0, 0.077, 0.073]),
      part("box", COLORS.warm, [0.018, 0.003, 0.013], [0, 0.104, 0.083]),
    ],
    glow,
  );
  windows.geometry.scale(HABITAT_SCALE, HABITAT_SCALE, HABITAT_SCALE);
  habitatAnchor.add(windows);
  reveals.push(windows);
  // Exterior practical: one broad warm beam, never a shadow-map allocation.
  const houseLight = new SpotLight(
    0xffd2a6,
    0.065,
    r * 0.7,
    (55 * Math.PI) / 180,
    0.9,
    2,
  );
  houseLight.name = "HabitatPorchLight";
  houseLight.castShadow = false;
  houseLight.position.set(
    0,
    0.104 * r * HABITAT_SCALE,
    0.09 * r * HABITAT_SCALE,
  );
  const houseLightTarget = new Group();
  houseLightTarget.position.set(-0.06 * r, -0.055 * r, 0.22 * r);
  houseLight.target = houseLightTarget;
  habitatAnchor.add(houseLight, houseLightTarget);

  const rocketParts = [
    part("cylinder", COLORS.suit, [0.025, 0.115, 0.025], [0, 0.096, 0]),
    part("cone", COLORS.hull, [0.025, 0.036, 0.025], [0, 0.172, 0]),
    part("cylinder", COLORS.blue, [0.026, 0.014, 0.026], [0, 0.133, 0]),
    part("sphere", COLORS.dark, [0.012, 0.016, 0.004], [0, 0.111, 0.024]),
    part(
      "cone",
      COLORS.dark,
      [0.015, 0.025, 0.015],
      [0, 0.028, 0],
      [Math.PI, 0, 0],
    ),
  ];
  for (let i = 0; i < 3; i++) {
    const angle = (i / 3) * TAU;
    rocketParts.push(
      part(
        "box",
        COLORS.hull,
        [0.008, 0.06, 0.024],
        [Math.sin(angle) * 0.027, 0.035, Math.cos(angle) * 0.027],
        [0, angle, 0],
      ),
    );
  }
  const rocket = assembly(rocketParts);
  rocket.geometry.scale(ROCKET_SCALE, ROCKET_SCALE, ROCKET_SCALE);
  const rocketAnchor = mount(
    rocket,
    ROCKET_POSITION.x,
    ROCKET_POSITION.y,
    -0.25,
  );
  const rocketBeacons = assembly(
    [
      part("box", COLORS.warm, [0.009, 0.004, 0.003], [0, 0.135, 0.027]),
      part("box", COLORS.warm, [0.006, 0.004, 0.006], [0, 0.062, 0.038]),
      part("box", COLORS.warm, [0.006, 0.004, 0.006], [0.033, 0.062, -0.019]),
      part("box", COLORS.warm, [0.006, 0.004, 0.006], [-0.033, 0.062, -0.019]),
    ],
    glow,
  );
  rocketBeacons.name = "RocketBeacons";
  rocketBeacons.geometry.scale(ROCKET_SCALE, ROCKET_SCALE, ROCKET_SCALE);
  rocketAnchor.add(rocketBeacons);
  reveals.push(rocketBeacons);

  const rover = new Group();
  rover.name = "LunarRover";
  // Scale around the ground contact, preserving wheel clearance and reveal size.
  rover.userData.revealScale = ROVER_SCALE;
  rover.add(
    assembly([
      part("box", COLORS.hull, [0.15, 0.035, 0.064], [0, 0.037, 0]),
      part("box", COLORS.suit, [0.065, 0.023, 0.05], [-0.012, 0.066, 0]),
      part("box", COLORS.blue, [0.067, 0.003, 0.047], [-0.012, 0.08, 0]),
      part("cylinder", COLORS.metal, [0.002, 0.055, 0.002], [-0.047, 0.09, 0]),
      part("sphere", COLORS.dark, [0.011, 0.007, 0.011], [-0.047, 0.119, 0]),
    ]),
  );
  rover.add(
    assembly(
      [
        part("box", COLORS.warm, [0.006, 0.008, 0.009], [0.077, 0.046, 0.02]),
        part("box", COLORS.warm, [0.006, 0.008, 0.009], [0.077, 0.046, -0.02]),
      ],
      headlampMaterial,
    ),
  );
  // Two emissive lenses share one forward beam. No extra shadow pass.
  const headlight = new SpotLight(
    0xffe5b8,
    HEADLIGHT_INTENSITY,
    r * 0.65,
    Math.PI / 5,
    0.7,
    2,
  );
  headlight.name = "RoverHeadlights";
  headlight.position.set(0.079 * r, 0.047 * r, 0);
  headlight.castShadow = false;
  const headlightTarget = new Group();
  headlightTarget.position.set(0.4 * r, -0.018 * r, 0);
  headlight.target = headlightTarget;
  rover.add(headlight, headlightTarget);
  const wheelGeometry = part(
    "cylinder",
    COLORS.dark,
    [0.02, 0.015, 0.02],
    [0, 0, 0],
    [Math.PI / 2, 0, 0],
  );
  // Off-center hub spokes make rolling visible without extra meshes.
  const hub = part("box", COLORS.metal, [0.022, 0.005, 0.016]);
  const rollingGeometry = mergeGeometries([wheelGeometry, hub]);
  wheelGeometry.dispose();
  hub.dispose();
  geometries.add(rollingGeometry);
  const wheels = new InstancedMesh(rollingGeometry, matte, 6);
  wheels.receiveShadow = true;
  rover.add(wheels);
  const roverAnchor = mount(rover, 0, 0);
  let wheelAngle = 0;
  const routeSide = new Vector3();
  const worldScale = new Vector3();

  function astronaut(tint, name) {
    const model = new Group();
    model.name = name;
    const torso = assembly([
      part(
        "box",
        COLORS.suit,
        [
          name === "GirlAstronaut" ? 0.0278 : 0.0315,
          0.034,
          name === "GirlAstronaut" ? 0.022 : 0.0226,
        ],
        [0, 0.052, 0],
      ),
      part(
        "box",
        name === "BoyAstronaut" ? COLORS.white : tint,
        [0.017, 0.013, 0.003],
        [0, 0.055, 0.013],
      ),
      part("box", tint, [0.026, 0.03, 0.013], [0, 0.052, -0.017]),
      part(
        "box",
        COLORS.suit,
        [name === "GirlAstronaut" ? 0.03 : 0.029, 0.008, 0.022],
        [0, 0.037, 0],
      ),
      part("box", COLORS.dark, [0.008, 0.009, 0.009], [0.009, 0.061, 0.015]),
    ]);
    model.add(torso);
    const head = assembly([
      part(
        "sphere",
        name === "GirlAstronaut" ? COLORS.helmetBlue : COLORS.suit,
        [name === "GirlAstronaut" ? 0.0168 : 0.0173, 0.018, 0.016],
      ),
      part("sphere", COLORS.dark, [0.013, 0.011, 0.005], [0, 0.002, 0.014]),
    ]);
    head.name = `${name}Head`;
    head.position.y = 0.079 * r;
    model.add(head);
    return {
      model,
      torso,
      head,
      frame: new Matrix4(),
      gaitBlend: 0,
      strideBlend: 0,
      gaitPhase: 0,
      lastGaitDistance: 0,
      footLifts: new Float64Array(2),
      gazeYaw: 0,
      gazePitch: 0,
      stride: name === "GirlAstronaut" ? 0.0146 : 0.0154,
      carriage: name === "GirlAstronaut" ? 0.96 : 1.04,
    };
  }
  const boy = astronaut(COLORS.dark, "BoyAstronaut");
  const girl = astronaut(COLORS.rose, "GirlAstronaut");
  boy.anchor = mount(boy.model, -0.12, -0.175, 0.7);
  girl.anchor = mount(girl.model, 0.18, -0.03, -0.7);
  boy.model.userData.revealScale = ASTRONAUT_SCALES.boy;
  girl.model.userData.revealScale = ASTRONAUT_SCALES.girl;

  // A chest torch leaves both hands available for the existing gestures.
  function createTorch(person, name, size) {
    const torchLensMaterial = new MeshStandardMaterial({
      color: COLORS.dark,
      emissive: COLORS.warm,
      emissiveIntensity: 0,
      roughness: 0.5,
    });
    materials.add(torchLensMaterial);
    const torchLens = assembly(
      [part("box", 0xffffff, [0.006, 0.006, 0.001], [0.009, 0.061, 0.02])],
      torchLensMaterial,
    );
    torchLens.name = `${name}TorchLens`;
    person.torso.add(torchLens);
    const torch = new SpotLight(0xffe5bf, 0, r * 0.55, Math.PI / 7, 0.85, 2);
    torch.name = `${name}Torch`;
    torch.userData.astronautTorch = true;
    torch.castShadow = false;
    torch.position.set(0.009 * r, 0.061 * r, 0.021 * r);
    const torchTarget = new Group();
    torchTarget.position.set(0.009 * r, -0.02 * r, 0.21 * r);
    torch.target = torchTarget;
    person.torso.add(torch, torchTarget);
    return {
      person,
      size,
      light: torch,
      material: torchLensMaterial,
      on: false,
      fade: 0,
    };
  }
  const torches = [
    createTorch(boy, "Boy", ASTRONAUT_SCALES.boy),
    createTorch(girl, "Girl", ASTRONAUT_SCALES.girl),
  ];
  const torchDarkColor = new Color(COLORS.dark);
  const torchWarmColor = new Color(COLORS.warm);
  const illuminationLights = [];
  const torchUp = new Vector3();
  const torchSample = new Vector3();
  const sourcePosition = new Vector3();
  const sourceTarget = new Vector3();
  const lightDirection = new Vector3();
  const lightToSample = new Vector3();
  let lightingRoot = null;

  // All articulated arm/leg segments and gloves/boots share two draw calls.
  const limbGeometry = part("cylinder", 0xffffff, [1, 1, 1]);
  const extremityGeometry = part("box", 0xffffff, [1, 1, 1]);
  geometries.add(limbGeometry);
  geometries.add(extremityGeometry);
  const limbs = new InstancedMesh(limbGeometry, matte, 16);
  const extremities = new InstancedMesh(extremityGeometry, matte, 8);
  const fingers = new InstancedMesh(extremityGeometry, matte, 4);
  fingers.name = "AstronautPointingFingers";
  fingers.frustumCulled = false;
  fingers.receiveShadow = true;
  for (let i = 0; i < 4; i++) fingers.setColorAt(i, color.setHex(COLORS.suit));
  limbs.name = "AstronautLimbSegments";
  extremities.name = "AstronautGlovesAndBoots";
  limbs.receiveShadow = extremities.receiveShadow = true;
  limbs.frustumCulled = extremities.frustumCulled = false;
  color.setHex(COLORS.suit);
  for (let i = 0; i < 16; i++) limbs.setColorAt(i, color);
  for (let i = 0; i < 8; i++)
    extremities.setColorAt(
      i,
      color.setHex(
        i % 2 === 0 ? (i < 4 ? COLORS.dark : COLORS.metal) : COLORS.suit,
      ),
    );
  group.add(limbs, extremities, fingers);

  // Radially feathered, curvature-mapped contact shadows, with no texture upload.
  function shadow(width, depth) {
    const points = [0, 0.0015 * r, 0];
    const alpha = [0.32];
    const indices = [];
    const segments = 16;
    for (let ring = 1; ring <= 3; ring++) {
      for (let i = 0; i < segments; i++) {
        const angle = (i / segments) * TAU;
        const x = (Math.cos(angle) * width * r * ring) / 3;
        const z = (Math.sin(angle) * depth * r * ring) / 3;
        points.push(x, Math.sqrt(r * r - x * x - z * z) - r + 0.0015 * r, z);
        alpha.push((1 - ring / 3) ** 2 * 0.32);
        const a = 1 + (ring - 1) * segments + i;
        const b = 1 + (ring - 1) * segments + ((i + 1) % segments);
        if (ring === 1) indices.push(0, b, a);
        else indices.push(a - segments, b - segments, a, b - segments, b, a);
      }
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new Float32BufferAttribute(points, 3));
    geometry.setAttribute("contactAlpha", new Float32BufferAttribute(alpha, 1));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    geometries.add(geometry);
    const material = new MeshBasicMaterial({
      color: 0x181b20,
      transparent: true,
      depthWrite: false,
    });
    material.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader
        .replace(
          "#include <common>",
          "#include <common>\nattribute float contactAlpha;\nvarying float vContactAlpha;",
        )
        .replace(
          "#include <begin_vertex>",
          "vContactAlpha = contactAlpha;\n#include <begin_vertex>",
        );
      shader.fragmentShader = shader.fragmentShader
        .replace(
          "#include <common>",
          "#include <common>\nvarying float vContactAlpha;",
        )
        .replace(
          "#include <alphatest_fragment>",
          "diffuseColor.a *= vContactAlpha;\n#include <alphatest_fragment>",
        );
    };
    material.customProgramCacheKey = () => "lunar-base-contact-shadow";
    materials.add(material);
    return new Mesh(geometry, material);
  }
  function mountShadow(x, y, width, depth) {
    const mesh = shadow(width, depth);
    const anchor = new Group();
    placeOnSurface(anchor, r, x * r, y * r);
    anchor.add(mesh);
    group.add(anchor);
    return { mesh, anchor };
  }
  mountShadow(
    HABITAT_POSITION.x,
    HABITAT_POSITION.y,
    0.15 * HABITAT_SCALE,
    0.1 * HABITAT_SCALE,
  );
  mountShadow(
    ROCKET_POSITION.x,
    ROCKET_POSITION.y,
    0.06 * ROCKET_SCALE,
    0.06 * ROCKET_SCALE,
  );
  const people = [boy, girl];
  const wheelSides = [-1, 1];
  const normalAt = (x, y) => new Vector3(x, y, Math.sqrt(1 - x * x - y * y));
  const roverWalker = createWalker(FRONT, {
    radius: 0.095 * ROVER_SCALE,
    speed: 0.065,
    boundAngle: Math.PI,
    heading: 0.32,
  });
  boy.walker = createWalker(normalAt(-0.12, -0.175), {
    radius: (0.027 * ASTRONAUT_SCALES.boy) / 0.8,
    speed: 0.0334,
    boundAngle: 1.43,
    heading: (openingRandom() - 0.5) * TAU,
  });
  girl.walker = createWalker(normalAt(0.18, -0.03), {
    radius: (0.027 * ASTRONAUT_SCALES.girl) / 0.8,
    speed: 0.0368,
    boundAngle: 1.43,
    heading: (openingRandom() - 0.5) * TAU,
  });
  boy.walker.eyeHeight = 0.079 * ASTRONAUT_SCALES.boy;
  girl.walker.eyeHeight = 0.079 * ASTRONAUT_SCALES.girl;
  const inverseFrame = group.quaternion.clone().invert();
  const obstacles = [
    {
      name: "Habitat",
      normal: normalAt(HABITAT_POSITION.x, HABITAT_POSITION.y),
      radius: 0.17 * HABITAT_SCALE,
      halfWidth: 0.12 * HABITAT_SCALE,
      halfDepth: 0.08 * HABITAT_SCALE,
      axisX: new Vector3(1, 0, 0).applyQuaternion(habitatAnchor.quaternion),
      axisY: new Vector3(0, 0, 1).applyQuaternion(habitatAnchor.quaternion),
    },
    {
      name: "Rocket",
      normal: normalAt(ROCKET_POSITION.x, ROCKET_POSITION.y),
      radius: 0.041 * ROCKET_SCALE,
    },
    {
      name: "Flag",
      normal: new Vector3(
        FLAG_ANCHOR_POSITION.x,
        FLAG_ANCHOR_POSITION.y,
        FLAG_ANCHOR_POSITION.z,
      )
        .normalize()
        .applyQuaternion(inverseFrame),
      radius: 0.34,
      roverOnly: true,
    },
    {
      name: "Garden",
      normal: GARDEN_SURFACE_NORMAL.clone().applyQuaternion(inverseFrame),
      radius: 0.24,
      roverOnly: !!gardenLayout,
    },
  ];
  const flagObstacle = {
    name: "FlagPole",
    normal: obstacles[2].normal,
    // Pole plus the low ground lamp; the cloth is safely above helmet height.
    radius: Math.max(0.105, flagInterest?.clearanceRadius || 0),
    peopleOnly: true,
  };
  obstacles.push(flagObstacle);
  if (gardenLayout) {
    for (const collider of gardenLayout.colliders) {
      // Pebbles support footsteps and seated rests; they do not seal garden exits.
      if (
        gardenLayout.features.some(
          (feature) =>
            feature.kind === "rock" &&
            feature.base.distanceToSquared(collider.position) < 1e-12,
        )
      )
        continue;
      obstacles.push({
        name: "GardenDetail",
        peopleOnly: true,
        normal: collider.position
          .clone()
          .normalize()
          .applyQuaternion(inverseFrame),
        radius: Math.asin(collider.radius / r),
      });
    }
  }
  const simulation = createWanderSimulation(
    [roverWalker, boy.walker, girl.walker],
    obstacles,
    seed,
  );
  group.userData.motion = simulation;
  const gardenObstacle = obstacles.find((item) => item.name === "Garden");
  const houseObstacle = obstacles.find((item) => item.name === "Habitat");
  const rocketObstacle = obstacles.find((item) => item.name === "Rocket");
  const gardenFocuses = gardenInterestPoints.map((point) =>
    point.bloom.clone().applyQuaternion(inverseFrame).divideScalar(r),
  );
  const gardenFeatures = gardenLayout?.features.map((feature) => ({
    kind: feature.kind,
    normal: feature.base.clone().normalize().applyQuaternion(inverseFrame),
    focus: feature.focus.clone().applyQuaternion(inverseFrame).divideScalar(r),
    radius: Math.asin(feature.radius / r),
    touches: feature.touches?.map((point) =>
      point.clone().applyQuaternion(inverseFrame).divideScalar(r),
    ),
  }));
  const walkableRocks =
    gardenFeatures
      ?.filter((feature) => feature.kind === "rock")
      .map((feature) => ({
        normal: feature.normal,
        supportRadius: feature.radius + 0.012,
        height: Math.max(0, feature.focus.length() - 1 + 0.003),
      })) || [];
  function propFocus(anchor, x, y, z, size) {
    anchor.updateMatrix();
    return new Vector3(x * r * size, y * r * size, z * r * size)
      .applyMatrix4(anchor.matrix)
      .add(new Vector3(0, 0, r))
      .divideScalar(r);
  }
  const behavior = createAstronautBehavior({
    navigation: simulation,
    boy: boy.walker,
    girl: girl.walker,
    flag: flagInterest
      ? {
          ...flagObstacle,
          focuses: [
            flagInterest.focus
              .clone()
              .applyQuaternion(inverseFrame)
              .divideScalar(r),
          ],
        }
      : null,
    garden: gardenFocuses.length
      ? { ...gardenObstacle, focuses: gardenFocuses, features: gardenFeatures }
      : null,
    rocket: {
      ...rocketObstacle,
      focuses: [
        propFocus(rocketAnchor, 0, 0.11, 0.025, ROCKET_SCALE),
        propFocus(rocketAnchor, 0.025, 0.04, 0, ROCKET_SCALE),
      ],
    },
    house: {
      ...houseObstacle,
      focuses: [
        propFocus(habitatAnchor, 0, 0.05, 0.074, HABITAT_SCALE),
        propFocus(habitatAnchor, -0.066, 0.058, 0.074, HABITAT_SCALE),
        propFocus(habitatAnchor, 0, 0.104, 0.09, HABITAT_SCALE),
      ],
    },
    seed,
  });
  const roverSpeedRandom = createRandom(seed ^ 0x4b91d23);
  let roverSpeedTime = 0;
  let nextRoverSpeedAt = 0;
  let roverCruiseSpeed = roverWalker.speed;
  simulation.beforeStep = (dt) => {
    behavior.step(dt);
    roverSpeedTime += dt;
    if (roverSpeedTime >= nextRoverSpeedAt) {
      roverCruiseSpeed = 0.052 + roverSpeedRandom() * 0.023;
      nextRoverSpeedAt = roverSpeedTime + 5 + roverSpeedRandom() * 7;
    }
    // Change cruise intent gradually; navigation retains braking and yaw limits.
    roverWalker.speed +=
      (roverCruiseSpeed - roverWalker.speed) * (1 - Math.exp(-dt * 0.8));
  };
  group.userData.behavior = behavior;

  let disposed = false;
  let motionReduced = false;
  let time = 0;
  let reveal = 0;
  const wheelPositions = [-0.05, 0, 0.05];
  const wheelScale = new Vector3(1, 1, 1);
  const wheelPosition = new Vector3();
  const wheelRotation = new Quaternion();
  const wheelAxis = new Vector3(0, 0, 1);

  function updateWheels() {
    let index = 0;
    for (const x of wheelPositions) {
      for (const side of wheelSides) {
        wheelRotation.setFromAxisAngle(
          wheelAxis,
          wheelAngle - (side * roverWalker.turnDistance * 0.042) / 0.02,
        );
        wheelPosition.set(x * r, 0.022 * r, side * 0.042 * r);
        matrix.compose(wheelPosition, wheelRotation, wheelScale);
        wheels.setMatrixAt(index++, matrix);
      }
    }
    wheels.instanceMatrix.needsUpdate = true;
  }
  updateWheels();
  wheels.computeBoundingSphere();

  function placeWalker(anchor, walker, roverFacing = false, altitude = 0) {
    if (roverFacing) {
      routeSide.crossVectors(walker.forward, walker.normal);
      matrix.makeBasis(walker.forward, walker.normal, routeSide);
    } else {
      routeSide.crossVectors(walker.normal, walker.forward);
      matrix.makeBasis(routeSide, walker.normal, walker.forward);
    }
    anchor.quaternion.setFromRotationMatrix(matrix);
    anchor.position.copy(walker.normal).multiplyScalar(r + altitude);
    anchor.position.z -= r;
  }

  function positionRover() {
    placeWalker(roverAnchor, roverWalker, true, 0.001 * r);
    wheelAngle = -roverWalker.distance / (0.02 * ROVER_SCALE);
    updateWheels();
  }
  positionRover();

  const jointA = new Vector3();
  const jointB = new Vector3();
  const direction = new Vector3();
  const attention = new Vector3();
  const attentionRotation = new Quaternion();
  const touchLocal = new Vector3();
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  function segment(person, index, ax, ay, az, bx, by, bz, width) {
    jointA.set(ax, ay, az);
    jointB.set(bx, by, bz);
    const length = jointA.distanceTo(jointB);
    direction.subVectors(jointB, jointA).normalize();
    quaternion.setFromUnitVectors(UP, direction);
    position
      .copy(jointA)
      .add(jointB)
      .multiplyScalar(r * 0.5);
    scale.set(width, length, width);
    matrix.compose(position, quaternion, scale).premultiply(person.frame);
    limbs.setMatrixAt(index, matrix);
  }
  function extremity(
    person,
    index,
    x,
    y,
    z,
    width,
    height,
    depth,
    pitch = 0,
    aim = null,
  ) {
    position.set(x * r, y * r, z * r);
    if (aim) quaternion.setFromUnitVectors(FRONT, aim);
    else quaternion.setFromEuler(euler.set(pitch, 0, 0));
    scale.set(width, height, depth);
    matrix.compose(position, quaternion, scale).premultiply(person.frame);
    extremities.setMatrixAt(index, matrix);
  }

  function updatePeople(deltaSeconds) {
    for (let index = 0; index < people.length; index++) {
      const person = people[index];
      const walker = person.walker;
      const activity = behavior.actors[index];
      const pose = activity.pose;
      const poseWeight = pose.weight * (walker.velocity < 0.003 ? 1 : 0.65);
      const gazeWeight = pose.weight;
      let surfaceLift = 0;
      for (const feature of walkableRocks) {
        const distance = Math.acos(
          clamp(walker.normal.dot(feature.normal), -1, 1),
        );
        const support = Math.max(0, 1 - distance / feature.supportRadius);
        surfaceLift = Math.max(surfaceLift, smooth(support) * feature.height);
      }
      walker.surfaceLift = surfaceLift;
      const seated = pose.sit || 0;
      const jog = motionReduced
        ? 0
        : clamp((walker.velocity / activity.cruiseSpeed - 1) / 0.8, 0, 1);
      // Integrate distance into phase so blending to a longer running stride
      // cannot reset the feet or make them slide at a speed transition.
      person.gaitPhase =
        (person.gaitPhase +
          ((walker.gaitDistance - person.lastGaitDistance) /
            (person.stride *
              4 *
              person.model.userData.revealScale *
              (1 + jog * 0.12))) *
            TAU) %
        TAU;
      person.lastGaitDistance = walker.gaitDistance;
      const gait = person.gaitPhase;
      const stridePhase = (((gait / TAU) % 0.5) + 0.5) % 0.5;
      const stanceDuty = 0.5 - jog * 0.08;
      const flightPhase =
        (stridePhase - stanceDuty) / Math.max(0.001, 0.5 - stanceDuty);
      walker.jogFlight =
        jog *
        (flightPhase > 0 && flightPhase < 1
          ? Math.sin(flightPhase * Math.PI) * 0.0028
          : 0);
      const turningStep =
        clamp(Math.abs(walker.yawVelocity) / 2, 0, 1) *
        (1 - person.strideBlend);
      const turnLead = clamp(walker.yawVelocity * 0.08, -0.14, 0.14);
      placeWalker(
        person.anchor,
        walker,
        false,
        (pose.hop + walker.jogFlight + surfaceLift * (1 - seated)) * r,
      );
      person.gaitBlend +=
        ((walker.moving || walker.turning ? 1 : 0) - person.gaitBlend) *
        (1 - Math.exp(-12 * deltaSeconds));
      person.strideBlend +=
        ((walker.moving ? 1 : 0) - person.strideBlend) *
        (1 - Math.exp(-12 * deltaSeconds));
      // Stance moves each boot back by exactly the body's traveled distance.
      const bob =
        Math.cos(gait * 2) *
        ((index === 1 ? 0.0007 : 0.0005) + jog * 0.0007) *
        person.gaitBlend;
      const weightShift = pose.shift * poseWeight;
      // Seat the bottom of the existing hip armor on the rock. Boots stay on
      // the Moon instead of raising the entire bent-leg rig above the seat.
      const seatDrop =
        seated *
          clamp(
            0.033 -
              Math.max(0, surfaceLift - 0.003) /
                Math.max(person.model.scale.y, 0.01),
            0.012,
            0.031,
          ) +
        pose.crouch;
      person.torso.position.x = weightShift * r;
      person.torso.position.y = (bob - seatDrop) * r;
      person.torso.rotation.x = pose.lean * poseWeight + jog * 0.085;
      person.torso.rotation.z =
        Math.sin(gait) * (index === 1 ? 0.032 : 0.025) * person.gaitBlend +
        pose.roll * poseWeight +
        pose.playfulSway +
        pose.phraseBody;
      person.torso.rotation.y =
        pose.yaw * poseWeight -
        turnLead * 0.35 +
        Math.sin(gait) * (index === 1 ? 0.026 : 0.017) * person.strideBlend;
      person.head.position.x = weightShift * r;
      person.head.position.y =
        (0.079 * Math.cos(person.torso.rotation.x) + bob - seatDrop) * r;
      person.head.position.z = Math.sin(person.torso.rotation.x) * 0.079 * r;
      person.head.rotation.y =
        turnLead +
        Math.sin(time * 0.65 + index * 2.1) * (walker.moving ? 0.16 : 0.3);
      person.head.rotation.x = Math.sin(gait) * 0.055 * person.gaitBlend;
      person.head.rotation.z = pose.playfulTilt;
      if (gazeWeight > 1e-5) {
        const upwardLimit =
          activity.state === "flag" || activity.state === "flagGuest"
            ? -Math.PI / 4
            : (-20 * Math.PI) / 180;
        attention.copy(activity.focus).sub(walker.normal).multiplyScalar(r);
        attentionRotation.copy(person.anchor.quaternion).invert();
        attention.applyQuaternion(attentionRotation);
        if (pose.turn !== 0) attention.applyAxisAngle(UP, -pose.turn);
        attention.y -= person.head.position.y * person.model.scale.y;
        attention.z -= person.head.position.z * person.model.scale.z;
        const gazeYaw = clamp(
          Math.atan2(attention.x, attention.z),
          (-25 * Math.PI) / 180,
          (25 * Math.PI) / 180,
        );
        const gazePitch = clamp(
          -Math.atan2(attention.y, Math.hypot(attention.x, attention.z)),
          upwardLimit,
          (20 * Math.PI) / 180,
        );
        const gazeBlend = 1 - Math.exp(-Math.max(0, deltaSeconds) / 0.18);
        person.gazeYaw += (gazeYaw - person.gazeYaw) * gazeBlend;
        person.gazePitch += (gazePitch - person.gazePitch) * gazeBlend;
        person.head.rotation.y +=
          (clamp(
            person.gazeYaw + pose.yaw + pose.shake,
            (-25 * Math.PI) / 180,
            (25 * Math.PI) / 180,
          ) -
            person.head.rotation.y) *
          gazeWeight;
        person.head.rotation.x +=
          (clamp(
            person.gazePitch +
              pose.nod * (activity.state === "conversation" ? 0.7 : 1),
            upwardLimit,
            (20 * Math.PI) / 180,
          ) -
            person.head.rotation.x) *
          gazeWeight;
        person.head.rotation.z = pose.tilt * gazeWeight + pose.playfulTilt;
      }
      person.head.rotation.y = clamp(
        person.head.rotation.y,
        (-25 * Math.PI) / 180,
        (25 * Math.PI) / 180,
      );
      // Rotate the whole articulated body about its center, not its boots.
      // The same model matrix is used below for every instanced limb.
      const flipAngle = pose.flip > 0 ? -TAU * pose.flip : 0;
      const flipCenter = 0.046 * r * person.model.scale.y;
      person.model.rotation.x = flipAngle;
      person.model.rotation.y = pose.turn;
      person.model.position.y = flipCenter * (1 - Math.cos(flipAngle));
      person.model.position.z = -flipCenter * Math.sin(flipAngle);
      person.anchor.updateMatrix();
      person.model.updateMatrix();
      person.frame.multiplyMatrices(person.anchor.matrix, person.model.matrix);
      for (let foot = 0; foot < 2; foot++) {
        const phase = (((gait / TAU + foot * 0.5) % 1) + 1) % 1;
        const swing =
          phase < stanceDuty ? 0 : (phase - stanceDuty) / (1 - stanceDuty);
        person.footLifts[foot] =
          Math.sin(swing * Math.PI) ** 2 *
            (0.006 + jog * 0.008) *
            person.gaitBlend +
          (foot === activity.variant % 2 && person.gaitBlend < 0.01
            ? Math.abs(pose.stance) * 0.2 * poseWeight
            : 0) +
          (activity.state === "gardenDance"
            ? 0
            : Math.max(0, (foot === 0 ? -1 : 1) * pose.danceStep) * 0.003) +
          (foot === 0 ? pose.danceLiftLeft : pose.danceLiftRight) +
          pose.flipTuck * 0.013;
      }
      // Crossfading gait and dance can otherwise lift both boots. Preserve a
      // supporting foot except during an explicitly animated aerial phase.
      const supportLift =
        pose.hop > 0 || jog > 0 || pose.flip > 0
          ? 0
          : Math.min(person.footLifts[0], person.footLifts[1]);
      for (let sideIndex = 0; sideIndex < 2; sideIndex++) {
        const side = sideIndex === 0 ? -1 : 1;
        const phase = (((gait / TAU + sideIndex * 0.5) % 1) + 1) % 1;
        const swing =
          phase < stanceDuty ? 0 : (phase - stanceDuty) / (1 - stanceDuty);
        const stride =
          (phase < stanceDuty
            ? 0.015 * (1 - (2 * phase) / stanceDuty)
            : -0.015 + 0.03 * smooth(swing)) *
          (1 + jog * 0.12);
        let footZ =
          stride * (person.stride / 0.015) * person.strideBlend +
          stride * turningStep * 0.2 +
          (sideIndex === activity.variant % 2 ? pose.stance * poseWeight : 0) +
          seated * 0.03 +
          side * pose.danceStep * 0.004 +
          pose.flipTuck * 0.012;
        const footX =
          side * ((index === 0 ? 0.0093 : 0.0088) + (pose.dance || 0) * 0.003) +
          Math.sin(gait) * turningStep * 0.001 +
          side * pose.danceSide;
        const bootWidth = index === 0 ? 0.0125 : 0.0115;
        const bootHeight = index === 0 ? 0.0102 : 0.0095;
        const bootDepth = index === 0 ? 0.023 : 0.021;
        const bodyScale = Math.max(person.model.scale.x, 1e-5);
        const bootEnvelope = Math.sin(walker.radius) / bodyScale - 0.0004;
        const bootSide = Math.abs(footX) + bootWidth / 2;
        const maxBootZ =
          Math.sqrt(Math.max(0, bootEnvelope ** 2 - bootSide ** 2)) -
          bootDepth / 2;
        if (seated < 0.01)
          footZ = clamp(footZ, -maxBootZ - 0.003, maxBootZ - 0.003);
        const supportX = Math.max(0, Math.abs(footX) - bootWidth / 2);
        const supportZ = Math.max(0, Math.abs(footZ + 0.003) - bootDepth / 2);
        const ground =
          (Math.sqrt(
            1 - (supportX * bodyScale) ** 2 - (supportZ * bodyScale) ** 2,
          ) -
            1) /
            bodyScale +
          0.00002;
        const lift = person.footLifts[sideIndex] - supportLift;
        const ankleY = ground + bootHeight / 2 + lift;
        const hipY = 0.037 + bob - seatDrop;
        const hipX = side * (index === 0 ? 0.0093 : 0.0088) + weightShift;
        // Two equal leg links solve ankle reach; the knee bends forward.
        const dy = ankleY - hipY;
        const length = Math.hypot(dy, footZ, hipX - footX);
        const bend = Math.sqrt(Math.max(0, 0.019 ** 2 - (length * length) / 4));
        const kneeY = (hipY + ankleY) / 2 + (footZ / length) * bend;
        const kneeZ = footZ / 2 - (dy / length) * bend;
        const limbIndex = index * 8 + sideIndex * 4;
        segment(
          person,
          limbIndex,
          hipX,
          hipY,
          0,
          (hipX + footX) / 2,
          kneeY,
          kneeZ,
          0.0048,
        );
        segment(
          person,
          limbIndex + 1,
          (hipX + footX) / 2,
          kneeY,
          kneeZ,
          footX,
          ankleY,
          footZ,
          0.0042,
        );
        extremity(
          person,
          index * 4 + sideIndex * 2,
          footX,
          ankleY,
          footZ + 0.003,
          bootWidth,
          bootHeight,
          bootDepth,
        );
        const armSwing =
          (-footZ / person.stride) *
          (0.36 + jog * 0.0355) *
          person.carriage *
          (1 - seated);
        const shoulderY =
          0.063 * Math.cos(person.torso.rotation.x) +
          bob -
          seatDrop +
          side * (pose.shoulder + pose.playfulShoulder);
        const shoulderZ =
          0.063 * Math.sin(person.torso.rotation.x) -
          side * Math.sin(person.torso.rotation.y) * 0.018;
        const elbowBend = 0.2 + jog * 0.95;
        let elbowY = shoulderY - Math.cos(armSwing) * 0.017;
        let elbowZ = shoulderZ + Math.sin(armSwing) * 0.017;
        let handY = elbowY - Math.cos(armSwing + elbowBend) * 0.015;
        let handZ = elbowZ + Math.sin(armSwing + elbowBend) * 0.015;
        let elbowX = side * 0.023;
        let handX = side * 0.024;
        // Running bends the forearm forward. Keep the entire rotating glove
        // inside the same body footprint used by collision/navigation checks.
        const handClearance = walker.radius / bodyScale - 0.007;
        const handPlanar = Math.hypot(handX, handZ);
        if (jog > 0 && handPlanar > handClearance) {
          handX *= handClearance / handPlanar;
          handZ *= handClearance / handPlanar;
        }
        const gesture = sideIndex === 0 ? pose.left : pose.right;
        const phrase = sideIndex === 0 ? pose.phraseLeft : pose.phraseRight;
        const phrasePath = sideIndex === 0 ? pose.pathLeft : pose.pathRight;
        const point =
          (sideIndex === 0 ? pose.pointLeft : pose.pointRight) * poseWeight;
        const wave = sideIndex === activity.variant % 2 ? pose.wave : 0;
        const salute = sideIndex === 1 ? pose.salute * poseWeight : 0;
        const clap = pose.clap * poseWeight;
        const push = pose.push * poseWeight;
        const touch =
          sideIndex === activity.touchArm ? pose.touch * poseWeight : 0;
        const action = Math.max(
          gesture * poseWeight,
          pose.chest * poseWeight,
          wave * pose.weight,
          touch,
          salute,
          clap,
          push,
          phrase,
        );
        if (action > 1e-5) {
          const chest = pose.chest > gesture;
          let desiredHandX =
            side *
            (wave > gesture && wave > pose.chest
              ? 0.023 +
                Math.sin(
                  (behavior.time - activity.since) *
                    8 *
                    activity.handWaveTempo +
                    activity.handWavePhase,
                ) *
                  0.006
              : chest
                ? 0.01
                : 0.021 + (pose.spread || 0) * 0.024);
          let desiredHandY =
            shoulderY +
            (wave > gesture && wave > pose.chest
              ? 0.023 +
                Math.sin(
                  (behavior.time - activity.since) *
                    7 *
                    activity.handWaveTempo +
                    activity.handWavePhase -
                    0.4,
                ) *
                  0.003
              : chest
                ? -0.005
                : -0.002);
          let desiredHandZ =
            wave > gesture && wave > pose.chest
              ? 0.012
              : chest
                ? 0.022
                : shoulderZ + 0.028 - (pose.spread || 0) * 0.016;
          if (wave < 0.01 && salute < 0.01 && point < 0.01 && touch < 0.01) {
            const expressiveness = index === 1 ? 1 : 0.65;
            const arc = pose.arc * expressiveness;
            desiredHandX += side * arc * 0.005;
            desiredHandY +=
              Math.sin(arc * Math.PI + sideIndex * 0.7) * 0.004 * gesture;
            desiredHandZ += arc * side * 0.004;
          }
          if (point > 0.01) {
            direction.copy(attention).normalize();
            desiredHandX =
              side * 0.018 + clamp(direction.x, -0.65, 0.65) * 0.027;
            desiredHandY = shoulderY + clamp(direction.y, -0.6, 0.7) * 0.027;
            desiredHandZ = Math.max(0.012, direction.z * 0.027);
          }
          // The pointing hand keeps its target. Its free partner follows a
          // delayed curved stroke, coordinated with the torso and wrist.
          if (
            point < 0.01 &&
            wave < 0.01 &&
            touch < 0.001 &&
            salute < 0.01 &&
            clap < 0.01 &&
            push < 0.01
          ) {
            desiredHandX += side * phrasePath * 0.014;
            desiredHandY += phrasePath * 0.013;
            desiredHandZ += (phrase - Math.abs(phrasePath)) * 0.014;
          }
          if (touch > 0.001) {
            touchLocal
              .copy(activity.touchTarget)
              .sub(walker.normal)
              .applyQuaternion(attentionRotation)
              .divideScalar(bodyScale);
            desiredHandX = touchLocal.x;
            desiredHandY = touchLocal.y;
            desiredHandZ = touchLocal.z;
          }
          if (salute > 0.01) {
            desiredHandX = 0.016;
            desiredHandY = 0.087 + bob;
            desiredHandZ = 0.013;
          }
          if (push > 0.01) {
            desiredHandX = side * 0.012;
            desiredHandY = shoulderY - 0.003;
            desiredHandZ =
              shoulderZ + 0.025 + Math.sin((push * Math.PI) / 2) * 0.006;
          } else if (clap > 0.01) {
            const opening = 0.5 + 0.5 * Math.cos(behavior.time * 8);
            desiredHandX = side * (0.0045 + opening * 0.009);
            desiredHandY =
              shoulderY - 0.002 + Math.sin(behavior.time * 8) * 0.001;
            desiredHandZ = shoulderZ + 0.021;
          }
          handX += (desiredHandX - handX) * action;
          handY += (desiredHandY - handY) * action;
          handZ += (desiredHandZ - handZ) * action;
          if (walker.moving && phrase > 0) {
            const planar = Math.hypot(handX, handZ);
            if (planar > handClearance) {
              handX *= handClearance / planar;
              handZ *= handClearance / planar;
            }
          }
          // Two-link arm IK: bend elbows outward without stretching suit limbs.
          let dx = handX - side * 0.018;
          let dy = handY - shoulderY;
          let dz = handZ - shoulderZ;
          const reach = Math.max(1e-6, Math.hypot(dx, dy, dz));
          const reachScale = Math.min(1, 0.0315 / reach);
          dx *= reachScale;
          dy *= reachScale;
          dz *= reachScale;
          handX = side * 0.018 + dx;
          handY = shoulderY + dy;
          handZ = shoulderZ + dz;
          const length = Math.max(1e-6, reach * reachScale);
          const along = (0.017 ** 2 - 0.015 ** 2 + length ** 2) / (2 * length);
          const bend = Math.sqrt(Math.max(0, 0.017 ** 2 - along ** 2));
          const ux = dx / length,
            uy = dy / length,
            uz = dz / length;
          const px = side * (1 - ux * ux),
            py = -side * ux * uy,
            pz = -side * ux * uz;
          const plen = Math.max(1e-6, Math.hypot(px, py, pz));
          elbowX = side * 0.018 + ux * along + (px / plen) * bend;
          elbowY = shoulderY + uy * along + (py / plen) * bend;
          elbowZ = shoulderZ + uz * along + (pz / plen) * bend;
        }
        segment(
          person,
          limbIndex + 2,
          side * 0.018,
          shoulderY,
          shoulderZ,
          elbowX,
          elbowY,
          elbowZ,
          0.004,
        );
        segment(
          person,
          limbIndex + 3,
          elbowX,
          elbowY,
          elbowZ,
          handX,
          handY,
          handZ,
          0.0035,
        );
        direction.copy(attention).normalize();
        extremity(
          person,
          index * 4 + sideIndex * 2 + 1,
          handX,
          handY,
          handZ,
          0.008,
          0.009,
          0.008,
          armSwing +
            pose.wrist * action * (index === 1 ? 0.7 : 0.45) +
            (touch > 0.001 || salute > 0.01 || clap > 0.01 || push > 0.01
              ? 0
              : phrasePath * 0.65),
          point > 0.01 ? direction : null,
        );
        // One shared four-instance batch; a folded index collapses into its glove.
        position
          .set(handX * r, handY * r, handZ * r)
          .addScaledVector(direction, 0.0058 * r * point);
        quaternion.setFromUnitVectors(
          FRONT,
          direction.lengthSq() > 0.5 ? direction : FRONT,
        );
        scale.set(0.0025 * point, 0.0025 * point, 0.007 * point);
        matrix.compose(position, quaternion, scale).premultiply(person.frame);
        fingers.setMatrixAt(index * 2 + sideIndex, matrix);
      }
    }
    limbs.instanceMatrix.needsUpdate = true;
    extremities.instanceMatrix.needsUpdate = true;
    fingers.instanceMatrix.needsUpdate = true;
  }

  group.updateLighting = (deltaSeconds = 1 / 60) => {
    if (disposed) return;
    group.getWorldScale(worldScale);
    const size = worldScale.x * ROVER_SCALE;
    headlight.distance = r * 0.65 * size;
    headlight.intensity = HEADLIGHT_INTENSITY * size * size * smooth(reveal);
    houseLight.distance = r * 0.7 * worldScale.x;
    houseLight.intensity = 0.065 * worldScale.x * worldScale.x * smooth(reveal);

    // Discover existing illumination once per attachment, never per-frame.
    let root = group;
    while (root.parent) root = root.parent;
    if (root !== lightingRoot) {
      lightingRoot = root;
      illuminationLights.length = 0;
      root.traverse((object) => {
        if (
          !object.userData.astronautTorch &&
          (object.isDirectionalLight ||
            object.isSpotLight ||
            object.isPointLight)
        )
          illuminationLights.push(object);
      });
    }
    for (const entry of torches) {
      entry.person.anchor.getWorldPosition(torchSample);
      torchUp.set(0, 1, 0).transformDirection(entry.person.anchor.matrixWorld);
      const personSize = worldScale.x * entry.size;
      torchSample.addScaledVector(torchUp, 0.05 * r * personSize);
      let illumination = 0;
      for (const light of illuminationLights) {
        if (!light.visible || light.intensity <= 0) continue;
        light.getWorldPosition(sourcePosition);
        if (light.isDirectionalLight) {
          light.target.getWorldPosition(sourceTarget);
          lightDirection.subVectors(sourcePosition, sourceTarget).normalize();
          illumination +=
            light.intensity * Math.max(0, torchUp.dot(lightDirection));
          continue;
        }
        lightToSample.subVectors(torchSample, sourcePosition);
        const distance = lightToSample.length();
        if (light.distance > 0 && distance >= light.distance) continue;
        lightToSample.normalize();
        let attenuation = Math.max(0, -torchUp.dot(lightToSample));
        if (light.isSpotLight) {
          light.target.getWorldPosition(sourceTarget);
          lightDirection.subVectors(sourceTarget, sourcePosition).normalize();
          const cosine = lightDirection.dot(lightToSample);
          const outer = Math.cos(light.angle);
          const inner = Math.cos(light.angle * (1 - light.penumbra));
          attenuation *= smooth(
            Math.max(
              0,
              Math.min(1, (cosine - outer) / Math.max(1e-6, inner - outer)),
            ),
          );
        }
        if (light.distance > 0)
          attenuation *= Math.max(0, 1 - (distance / light.distance) ** 4) ** 2;
        illumination +=
          (light.intensity * attenuation) /
          Math.max(1e-6, distance ** light.decay);
      }
      // Hysteresis prevents flicker at the terminator or the edge of a lamp pool.
      if (illumination < 0.18) entry.on = true;
      else if (illumination > 0.32) entry.on = false;
      const dt = Math.max(0, Math.min(0.05, deltaSeconds));
      entry.fade += ((entry.on ? 1 : 0) - entry.fade) * (1 - Math.exp(-dt * 7));
      entry.light.distance = r * 0.55 * personSize;
      entry.light.intensity =
        0.012 * personSize * personSize * entry.fade * smooth(reveal);
      entry.material.emissiveIntensity = entry.fade * 0.8;
      entry.material.color.lerpColors(
        torchDarkColor,
        torchWarmColor,
        entry.fade,
      );
      entry.light.userData.illumination = illumination;
      entry.light.userData.on = entry.on;
    }
  };

  group.setReveal = (progress) => {
    if (disposed) return;
    const next = Math.max(0, Math.min(1, progress));
    if (next === reveal) return;
    reveal = next;
    group.visible = reveal > 0;
    const amount = smooth(reveal);
    reveals.forEach((mesh) =>
      mesh.scale.setScalar(amount * (mesh.userData.revealScale || 1)),
    );
    updatePeople(0);
  };
  group.update = (deltaSeconds, reducedMotion = false) => {
    if (disposed || reveal === 0) return;
    if (reducedMotion !== motionReduced) {
      motionReduced = reducedMotion;
      if (reducedMotion) {
        behavior.settleMotion();
        for (const actor of behavior.actors) {
          actor.pose.hop = 0;
          actor.pose.flip = actor.pose.flipTuck = actor.pose.crouch = 0;
          actor.waveHop = false;
        }
        updatePeople(0);
      }
    }
    if (reducedMotion) return;
    time += Math.max(0, Math.min(0.05, deltaSeconds));
    simulation.update(deltaSeconds);
    positionRover();
    updatePeople(deltaSeconds);
  };
  group.dispose = () => {
    if (disposed) return;
    disposed = true;
    simulation.beforeStep = null;
    behavior.dispose();
    wheels.dispose();
    limbs.dispose();
    extremities.dispose();
    fingers.dispose();
    houseLight.dispose();
    headlight.dispose();
    for (const entry of torches) entry.light.dispose();
    torches.length = 0;
    illuminationLights.length = 0;
    lightingRoot = null;
    geometries.forEach((geometry) => geometry.dispose());
    materials.forEach((material) => material.dispose());
    geometries.clear();
    materials.clear();
    group.removeFromParent();
    group.clear();
  };
  return group;
}
