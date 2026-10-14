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
import { LOGO_NORMAL } from "./logo.js";
import { createWalker, createWanderSimulation } from "./wander.js";
import { ANCHOR_POSITION as FLAG_ANCHOR_POSITION } from "./flag.js";
import { GARDEN_SURFACE_NORMAL } from "./garden.js";

// Shape reference: Kenney Space Kit (CC0), rated 4.8/5 (6 ratings).
// https://kenney-assets.itch.io/space-kit
// Implementation references: threejs.org/manual/pages/{scenegraph,
// optimize-lots-of-objects,shadows,cleanup}.html. No external model payloads.
export const BASE_REVEAL_SECONDS = 0.4;
const COLORS = {
  suit: 0xc9c9bf,
  hull: 0x999b96,
  dark: 0x252a30,
  metal: 0x77736b,
  blue: 0x8392a4,
  rose: 0x9f5266,
  warm: 0xffd9a0,
};
const UP = new Vector3(0, 1, 0);
const FRONT = new Vector3(0, 0, 1);
const TAU = Math.PI * 2;
const HEADLIGHT_INTENSITY = 0.02;
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
  { seed = Math.floor(Math.random() * 0xffffffff) } = {},
) {
  const group = new Group();
  group.name = "LunarBase";
  group.position.copy(LOGO_NORMAL).multiplyScalar(moonRadius);
  group.quaternion.setFromUnitVectors(FRONT, LOGO_NORMAL);
  group.visible = false;
  const r = moonRadius;
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
      Math.cos(angle) * r * 0.35,
      Math.sin(angle) * r * 0.35,
      0.002 * r,
      angle + Math.PI / 2,
    );
    curbAnchor.updateMatrix();
    const curb = part(
      "box",
      COLORS.metal,
      [0.043, 0.009, 0.008],
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
    part("box", COLORS.dark, [0.042, 0.054, 0.006], [0, 0.043, 0.069]),
    part("box", COLORS.blue, [0.075, 0.006, 0.055], [-0.085, 0.096, 0]),
    part("cylinder", COLORS.metal, [0.002, 0.07, 0.002], [0.075, 0.13, 0]),
    part("sphere", COLORS.metal, [0.016, 0.006, 0.016], [0.075, 0.164, 0]),
  ]);
  const habitatAnchor = mount(habitat, 0.27, 0.29, -0.35);
  const windows = assembly(
    [
      part("box", COLORS.warm, [0.035, 0.02, 0.004], [-0.066, 0.058, 0.07]),
      part("box", COLORS.warm, [0.035, 0.02, 0.004], [0.066, 0.058, 0.07]),
      part("box", COLORS.warm, [0.025, 0.005, 0.004], [0, 0.077, 0.073]),
    ],
    glow,
  );
  habitatAnchor.add(windows);
  reveals.push(windows);

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
  mount(assembly(rocketParts), -0.33, 0.1, -0.25);

  const rover = new Group();
  rover.name = "LunarRover";
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
  // Two emissive lenses share one short-range beam. No extra shadow pass.
  const headlight = new SpotLight(
    0xffe5b8,
    HEADLIGHT_INTENSITY,
    r * 0.3,
    Math.PI / 5,
    0.7,
    2,
  );
  headlight.name = "RoverHeadlights";
  headlight.position.set(0.079 * r, 0.047 * r, 0);
  headlight.castShadow = false;
  const headlightTarget = new Group();
  headlightTarget.position.set(0.24 * r, -0.018 * r, 0);
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
      part("box", COLORS.suit, [0.029, 0.034, 0.022], [0, 0.052, 0]),
      part("box", tint, [0.017, 0.013, 0.003], [0, 0.055, 0.013]),
      part("box", tint, [0.026, 0.03, 0.013], [0, 0.052, -0.017]),
    ]);
    model.add(torso);
    const head = assembly([
      part("sphere", COLORS.suit, [0.017, 0.018, 0.016]),
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
    };
  }
  const boy = astronaut(COLORS.blue, "BoyAstronaut");
  const girl = astronaut(COLORS.rose, "GirlAstronaut");
  boy.anchor = mount(boy.model, -0.12, -0.175, 0.7);
  girl.anchor = mount(girl.model, 0.18, -0.03, -0.7);
  boy.model.userData.revealScale = 0.8;
  girl.model.userData.revealScale = 0.8;

  // All articulated arm/leg segments and gloves/boots share two draw calls.
  const limbGeometry = part("cylinder", 0xffffff, [1, 1, 1]);
  const extremityGeometry = part("box", 0xffffff, [1, 1, 1]);
  geometries.add(limbGeometry);
  geometries.add(extremityGeometry);
  const limbs = new InstancedMesh(limbGeometry, matte, 16);
  const extremities = new InstancedMesh(extremityGeometry, matte, 8);
  limbs.name = "AstronautLimbSegments";
  extremities.name = "AstronautGlovesAndBoots";
  limbs.receiveShadow = extremities.receiveShadow = true;
  limbs.frustumCulled = extremities.frustumCulled = false;
  color.setHex(COLORS.suit);
  for (let i = 0; i < 16; i++) limbs.setColorAt(i, color);
  for (let i = 0; i < 8; i++)
    extremities.setColorAt(
      i,
      color.setHex(i % 2 === 0 ? COLORS.dark : COLORS.suit),
    );
  group.add(limbs, extremities);

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
  mountShadow(0.27, 0.29, 0.15, 0.1);
  mountShadow(-0.33, 0.1, 0.06, 0.06);
  const people = [boy, girl];
  const wheelSides = [-1, 1];
  const normalAt = (x, y) => new Vector3(x, y, Math.sqrt(1 - x * x - y * y));
  const roverWalker = createWalker(FRONT, {
    radius: 0.095,
    speed: 0.065,
    heading: 0.32,
  });
  boy.walker = createWalker(normalAt(-0.12, -0.175), {
    radius: 0.035,
    speed: 0.029,
    boundAngle: 0.95,
    heading: 0.7,
  });
  girl.walker = createWalker(normalAt(0.18, -0.03), {
    radius: 0.035,
    speed: 0.032,
    boundAngle: 0.95,
    heading: -0.7,
  });
  const inverseFrame = group.quaternion.clone().invert();
  const obstacles = [
    { name: "Habitat", normal: normalAt(0.27, 0.29), radius: 0.17 },
    { name: "Rocket", normal: normalAt(-0.33, 0.1), radius: 0.065 },
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
    },
    {
      name: "Garden",
      normal: GARDEN_SURFACE_NORMAL.clone().applyQuaternion(inverseFrame),
      radius: 0.24,
    },
  ];
  const simulation = createWanderSimulation(
    [roverWalker, boy.walker, girl.walker],
    obstacles,
    seed,
  );
  group.userData.motion = simulation;

  let disposed = false;
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
    wheelAngle = -roverWalker.distance / 0.02;
    updateWheels();
  }
  positionRover();

  const jointA = new Vector3();
  const jointB = new Vector3();
  const direction = new Vector3();
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
  function extremity(person, index, x, y, z, width, height, depth, pitch = 0) {
    position.set(x * r, y * r, z * r);
    quaternion.setFromEuler(euler.set(pitch, 0, 0));
    scale.set(width, height, depth);
    matrix.compose(position, quaternion, scale).premultiply(person.frame);
    extremities.setMatrixAt(index, matrix);
  }

  function updatePeople(deltaSeconds) {
    for (let index = 0; index < people.length; index++) {
      const person = people[index];
      const walker = person.walker;
      placeWalker(person.anchor, walker);
      person.gaitBlend +=
        ((walker.moving || walker.turning ? 1 : 0) - person.gaitBlend) *
        (1 - Math.exp(-12 * deltaSeconds));
      person.strideBlend +=
        ((walker.moving ? 1 : 0) - person.strideBlend) *
        (1 - Math.exp(-12 * deltaSeconds));
      // Stance moves each boot back by exactly the body's traveled distance.
      const gait = (walker.gaitDistance / 0.048) * TAU;
      const bob = Math.cos(gait * 2) * 0.0005 * person.gaitBlend;
      person.torso.position.y = bob * r;
      person.torso.rotation.z = Math.sin(gait) * 0.025 * person.gaitBlend;
      person.head.position.y = (0.079 + bob) * r;
      person.head.rotation.y =
        Math.sin(time * 0.65 + index * 2.1) * (walker.moving ? 0.16 : 0.3);
      person.head.rotation.x = Math.sin(gait) * 0.055 * person.gaitBlend;
      person.anchor.updateMatrix();
      person.model.updateMatrix();
      person.frame.multiplyMatrices(person.anchor.matrix, person.model.matrix);
      for (let sideIndex = 0; sideIndex < 2; sideIndex++) {
        const side = sideIndex === 0 ? -1 : 1;
        const phase = (((gait / TAU + sideIndex * 0.5) % 1) + 1) % 1;
        const swing = phase < 0.5 ? 0 : (phase - 0.5) * 2;
        const stride =
          phase < 0.5 ? 0.015 * (1 - phase * 4) : -0.015 + 0.03 * smooth(swing);
        const footZ = stride * person.strideBlend;
        const footX = side * 0.009;
        const bodyScale = Math.max(person.model.scale.x, 1e-5);
        const supportX = Math.max(0, Math.abs(footX) - 0.006);
        const supportZ = Math.max(0, Math.abs(footZ + 0.003) - 0.011);
        const ground =
          (Math.sqrt(
            1 - (supportX * bodyScale) ** 2 - (supportZ * bodyScale) ** 2,
          ) -
            1) /
            bodyScale +
          0.00002;
        const lift = Math.sin(swing * Math.PI) ** 2 * 0.006 * person.gaitBlend;
        const ankleY = ground + 0.005 + lift;
        const hipY = 0.037 + bob;
        // Two equal leg links solve ankle reach; the knee bends forward.
        const dy = ankleY - hipY;
        const length = Math.hypot(dy, footZ);
        const bend = Math.sqrt(Math.max(0, 0.019 ** 2 - (length * length) / 4));
        const kneeY = (hipY + ankleY) / 2 + (footZ / length) * bend;
        const kneeZ = footZ / 2 - (dy / length) * bend;
        const limbIndex = index * 8 + sideIndex * 4;
        segment(person, limbIndex, footX, hipY, 0, footX, kneeY, kneeZ, 0.0048);
        segment(
          person,
          limbIndex + 1,
          footX,
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
          0.012,
          0.01,
          0.022,
        );
        const armSwing = (-footZ / 0.015) * 0.36;
        const shoulderY = 0.063 + bob;
        let elbowY = shoulderY - Math.cos(armSwing) * 0.017;
        let elbowZ = Math.sin(armSwing) * 0.017;
        let handY = elbowY - Math.cos(armSwing + 0.2) * 0.015;
        let handZ = elbowZ + Math.sin(armSwing + 0.2) * 0.015;
        if (
          !walker.moving &&
          sideIndex === 1 &&
          Math.sin(time * 0.35 + index) > 0.93
        ) {
          elbowY = shoulderY + 0.005;
          elbowZ = 0.011;
          handY = elbowY + 0.012;
          handZ = elbowZ + Math.sin(time * 3) * 0.004;
        }
        segment(
          person,
          limbIndex + 2,
          side * 0.018,
          shoulderY,
          0,
          side * 0.023,
          elbowY,
          elbowZ,
          0.004,
        );
        segment(
          person,
          limbIndex + 3,
          side * 0.023,
          elbowY,
          elbowZ,
          side * 0.024,
          handY,
          handZ,
          0.0035,
        );
        extremity(
          person,
          index * 4 + sideIndex * 2 + 1,
          side * 0.024,
          handY,
          handZ,
          0.008,
          0.009,
          0.008,
          armSwing,
        );
      }
    }
    limbs.instanceMatrix.needsUpdate = true;
    extremities.instanceMatrix.needsUpdate = true;
  }

  group.updateLighting = () => {
    if (disposed) return;
    group.getWorldScale(worldScale);
    const size = worldScale.x;
    headlight.distance = r * 0.3 * size;
    headlight.intensity = HEADLIGHT_INTENSITY * size * size * smooth(reveal);
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
  group.update = (deltaSeconds) => {
    if (disposed || reveal === 0) return;
    time += Math.max(0, Math.min(0.05, deltaSeconds));
    simulation.update(deltaSeconds);
    positionRover();
    updatePeople(deltaSeconds);
  };
  group.dispose = () => {
    if (disposed) return;
    disposed = true;
    wheels.dispose();
    limbs.dispose();
    extremities.dispose();
    geometries.forEach((geometry) => geometry.dispose());
    materials.forEach((material) => material.dispose());
    geometries.clear();
    materials.clear();
    group.removeFromParent();
    group.clear();
  };
  return group;
}
