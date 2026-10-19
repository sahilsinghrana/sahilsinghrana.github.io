import assert from "node:assert/strict";
import test from "node:test";
import {
  Color,
  DirectionalLight,
  Group,
  Matrix4,
  Scene,
  SpotLight,
  Vector3,
} from "three";
import { Moon } from "../src/components/General/Moon/3dMoon/moon.js";
import {
  createMoonBase,
  placeOnSurface,
} from "../src/components/General/Moon/3dMoon/base.js";
import { createAnimationClock } from "../src/components/General/Moon/3dMoon/motion.js";
import { ASTRONAUT_SCALES } from "../src/components/General/Moon/3dMoon/dimensions.js";
import {
  createWalker,
  createWanderSimulation,
  obstacleGap,
} from "../src/components/General/Moon/3dMoon/wander.js";

const near = (actual, expected, epsilon = 1e-8) =>
  assert.ok(Math.abs(actual - expected) < epsilon, `${actual} != ${expected}`);

test("surface anchors retain radius and align their up axis, including at the pole", () => {
  for (const [x, y] of [
    [0, 0],
    [0.12, -0.08],
    [0, 0.4],
  ]) {
    const anchor = new Group();
    placeOnSurface(anchor, 0.4, x, y, 0.014, 0.7);
    const radial = anchor.position.clone().add(new Vector3(0, 0, 0.4));
    near(radial.length(), 0.414);
    const up = new Vector3(0, 1, 0).applyQuaternion(anchor.quaternion);
    near(up.dot(radial.normalize()), 1);
  }
});

test("shared clock pauses without catch-up and clamps delayed frames", () => {
  const clock = createAnimationClock();
  near(clock.tick(0), 0);
  near(clock.tick(16), 0.016);
  clock.pause();
  near(clock.tick(10000), 0);
  near(clock.elapsed, 0.016);
  near(clock.tick(11000), 0.05);
  near(clock.tick(10900), 0);
  clock.reset();
  near(clock.elapsed, 0);
});

test("the rover can reach the far pole without an artificial return-to-base boundary", () => {
  const rover = createWalker(new Vector3(0, 0, 1), {
    radius: 0.08,
    speed: 0.065,
    boundAngle: Math.PI,
  });
  const nav = createWanderSimulation([rover], [], 71);
  const destination = new Vector3(0.015, -0.02, -1).normalize();
  assert.ok(nav.arrive(rover, destination));
  for (let i = 0; i < 110 * 60 && !rover.arrived; i++) nav.update(1 / 60);
  assert.ok(rover.arrived, JSON.stringify(rover.normal));
  assert.ok(rover.normal.z < -0.995);
});

test("fresh scenes vary their opening headings while explicit seeds remain reproducible", () => {
  const savedRandom = Math.random;
  const bases = [];
  try {
    let value = 0.1;
    Math.random = () => {
      value += 0.2;
      return value;
    };
    bases.push(
      createMoonBase(),
      createMoonBase(),
      createMoonBase(0.4, { seed: 123 }),
      createMoonBase(0.4, { seed: 123 }),
    );
    const forward = (base) => base.userData.behavior.actors[0].walker.forward;
    assert.ok(forward(bases[0]).angleTo(forward(bases[1])) > 0.1);
    assert.ok(forward(bases[2]).angleTo(forward(bases[3])) < 1e-7);
  } finally {
    Math.random = savedRandom;
    for (const base of bases) base.dispose();
  }
});

test("base stays within geometry, draw-call, material and lighting budgets", () => {
  const base = createMoonBase();
  base.setReveal(1);
  let triangles = 0;
  let calls = 0;
  let lights = 0;
  const palette = new Set();
  base.traverse((object) => {
    if (object.isLight) {
      lights++;
      assert.equal(object.castShadow, false);
    }
    if (!object.isMesh) return;
    triangles +=
      ((object.geometry.index?.count ??
        object.geometry.attributes.position.count) /
        3) *
      (object.isInstancedMesh ? object.count : 1);
    calls++;
    palette.add(object.material);
    assert.equal(object.castShadow, false);
  });
  assert.ok(triangles <= 8000);
  assert.ok(calls <= 30);
  assert.ok(palette.size <= 9);
  assert.equal(lights, 4);
  console.log(
    `Base budget: ${triangles} triangles, ${calls} draw calls, ${palette.size} materials, ${lights} lights`,
  );
  base.dispose();
});

test("reveal clamps, hidden models do not advance, and motion is frame-rate independent", () => {
  const slow = createMoonBase(0.4, { seed: 123 });
  const fast = createMoonBase(0.4, { seed: 123 });
  assert.equal(slow.visible, false);
  const before = slow.getObjectByName("LunarRover").parent.position.clone();
  slow.update(0.05);
  assert.ok(before.equals(slow.getObjectByName("LunarRover").parent.position));
  slow.setReveal(2);
  fast.setReveal(1);
  for (let i = 0; i < 600; i++) slow.update(1 / 60);
  for (let i = 0; i < 1200; i++) fast.update(1 / 120);
  for (const name of ["LunarRover", "BoyAstronaut", "GirlAstronaut"]) {
    assert.ok(
      slow
        .getObjectByName(name)
        .parent.position.distanceTo(
          fast.getObjectByName(name).parent.position,
        ) < 1e-8,
    );
  }
  slow.setReveal(-1);
  assert.equal(slow.visible, false);
  slow.dispose();
  fast.dispose();
});

test("walkers stay grounded, clear other movers, and animate heads, arms and legs", () => {
  const base = createMoonBase(0.4, { seed: 123 });
  base.setReveal(1);
  const center = new Vector3(0, 0, 0.4);
  const head = base.getObjectByName("BoyAstronautHead");
  const initialHead = head.quaternion.clone();
  const limbs = base.getObjectByName("AstronautLimbSegments");
  const initialLimbs = Array.from(limbs.instanceMatrix.array);
  let changed = false;
  for (let i = 0; i < 1800; i++) {
    base.update(1 / 60);
    const rover = base.getObjectByName("LunarRover").parent;
    for (const name of ["BoyAstronaut", "GirlAstronaut"]) {
      const person = base.getObjectByName(name).parent;
      const altitude = person.position.clone().add(center).length() - 0.4;
      const actor =
        base.userData.behavior.actors[name === "BoyAstronaut" ? 0 : 1];
      near(altitude, (actor.pose.hop + actor.walker.jogFlight) * 0.4);
      assert.ok(person.position.distanceTo(rover.position) > 0.025);
    }
    if (
      limbs.instanceMatrix.array.some(
        (value, index) => Math.abs(value - initialLimbs[index]) > 1e-6,
      )
    )
      changed = true;
  }
  assert.ok(changed);
  assert.ok(initialHead.angleTo(head.quaternion) > 0.01);
  near(base.getObjectByName("BoyAstronaut").scale.x, ASTRONAUT_SCALES.boy);
  near(base.getObjectByName("GirlAstronaut").scale.x, ASTRONAUT_SCALES.girl);
  base.dispose();
});

test("random wandering explores beyond the plaza and avoids every stationary object", () => {
  const base = createMoonBase(0.4, { seed: 123 });
  base.setReveal(1);
  const rover = base.getObjectByName("LunarRover").parent;
  const simulation = base.userData.motion;
  // Isolate spherical navigation from random social activity choices. The
  // full controller's collisions and exploration have separate long-run tests.
  simulation.beforeStep = null;
  let backReached = false;
  let wideWalkingReached = false;
  for (let i = 0; i < 600 * 60; i++) {
    const rotation = rover.quaternion.clone();
    base.update(1 / 60);
    assert.ok(rotation.angleTo(rover.quaternion) < 0.04);
    const radial = rover.position.clone().add(new Vector3(0, 0, 0.4));
    near(radial.length(), 0.4004);
    near(
      new Vector3(0, 1, 0)
        .applyQuaternion(rover.quaternion)
        .dot(radial.normalize()),
      1,
    );
    if (rover.position.z < -0.7) backReached = true;
    for (const agent of simulation.agents) {
      assert.ok(agent.normal.z >= agent.boundCos - 1e-8);
      for (const obstacle of simulation.obstacles) {
        if (
          (obstacle.roverOnly && agent.radius < 0.06) ||
          (obstacle.peopleOnly && agent.radius >= 0.06)
        )
          continue;
        assert.ok(obstacleGap(agent.normal, obstacle) >= agent.radius - 1e-8);
      }
      for (const other of simulation.agents)
        if (agent !== other)
          assert.ok(
            agent.normal.dot(other.normal) <=
              Math.cos(agent.radius + other.radius) + 1e-8,
          );
    }
    if (
      simulation.agents.slice(1).some((agent) => agent.normal.z < Math.cos(0.6))
    )
      wideWalkingReached = true;
  }
  assert.ok(backReached);
  assert.ok(wideWalkingReached);
  base.dispose();
});

test("collision steering changes direction and escapes an initial overlap", () => {
  const agent = createWalker(new Vector3(0, 0, 1), {
    radius: 0.04,
    speed: 0.04,
  });
  const obstacle = {
    normal: new Vector3(0.08, 0, Math.sqrt(1 - 0.08 ** 2)),
    radius: 0.08,
  };
  const simulation = createWanderSimulation([agent], [obstacle], 12);
  agent.pause = 0;
  agent.target.copy(obstacle.normal);
  const facing = agent.forward.clone();
  let turned = false;
  for (let i = 0; i < 600; i++) {
    simulation.update(1 / 60);
    if (facing.dot(agent.forward) < 0.8) turned = true;
  }
  assert.ok(agent.collisions > 0);
  assert.ok(
    agent.normal.dot(obstacle.normal) <=
      Math.cos(agent.radius + obstacle.radius),
  );
  assert.ok(turned);
  assert.ok(agent.distance > 0.05);
});

test("different seeds produce different routes; identical seeds reproduce them", () => {
  const make = (seed) => {
    const walker = createWalker(new Vector3(0, 0, 1), {
      radius: 0.03,
      speed: 0.04,
    });
    const simulation = createWanderSimulation([walker], [], seed);
    for (let i = 0; i < 600; i++) simulation.update(1 / 60);
    return walker.normal;
  };
  assert.ok(make(1).distanceTo(make(2)) > 0.01);
  near(make(1).distanceTo(make(1)), 0);
});

test("each walking astronaut keeps a planted boot without penetrating the Moon", () => {
  const base = createMoonBase(0.4, { seed: 123 });
  base.setReveal(1);
  const boots = base.getObjectByName("AstronautGlovesAndBoots");
  const transform = new Matrix4();
  const vertex = new Vector3();
  for (let frame = 0; frame < 1200; frame++) {
    base.update(1 / 60);
    for (let person = 0; person < 2; person++) {
      let planted = false;
      for (let side = 0; side < 2; side++) {
        boots.getMatrixAt(person * 4 + side * 2, transform);
        let lowest = Infinity;
        for (let i = 0; i < boots.geometry.attributes.position.count; i++) {
          vertex
            .fromBufferAttribute(boots.geometry.attributes.position, i)
            .applyMatrix4(transform);
          vertex.z += 0.4;
          lowest = Math.min(lowest, vertex.length());
        }
        assert.ok(lowest >= 0.4 - 1e-7);
        if (lowest < 0.4001) planted = true;
      }
      assert.ok(
        planted ||
          base.userData.behavior.actors[person].pose.hop > 0 ||
          base.userData.behavior.actors[person].walker.jogFlight > 0,
      );
    }
  }
  base.dispose();
});

test("two movers approaching head-on turn without intersecting", () => {
  const left = createWalker(new Vector3(-0.1, 0, Math.sqrt(0.99)), {
    radius: 0.04,
    speed: 0.05,
  });
  const right = createWalker(new Vector3(0.1, 0, Math.sqrt(0.99)), {
    radius: 0.04,
    speed: 0.05,
    heading: Math.PI,
  });
  const simulation = createWanderSimulation([left, right], [], 4);
  left.pause = right.pause = 0;
  left.target.copy(right.normal);
  right.target.copy(left.normal);
  for (let i = 0; i < 1200; i++) {
    simulation.update(1 / 60);
    assert.ok(
      left.normal.dot(right.normal) <=
        Math.cos(left.radius + right.radius) + 1e-8,
    );
  }
  assert.ok(left.distance > 0.1 && right.distance > 0.1);
});

test("headlights illuminate forward, remain shadowless and scale with the Moon", () => {
  const parent = new Group();
  const base = createMoonBase();
  parent.add(base);
  base.setReveal(1);
  parent.scale.setScalar(2);
  base.updateLighting();
  const light = base.getObjectByName("RoverHeadlights");
  near(light.intensity, 0.49928);
  near(light.distance, 0.4108);
  assert.equal(light.castShadow, false);
  assert.ok(light.target.position.x > light.position.x);
  assert.ok(light.target.position.y < light.position.y);
  base.dispose();
});

test("rover cruise varies smoothly, reaches a higher maximum, and is frame-rate independent", () => {
  const traces = [];
  for (const hz of [30, 60, 120]) {
    const base = createMoonBase(0.4, { seed: 123 });
    const navigation = base.userData.motion;
    const rover = navigation.agents[0];
    const trace = [];
    let previous = rover.speed;
    for (let frame = 0; frame < 120 * hz; frame++) {
      navigation.update(1 / hz);
      assert.ok(rover.speed >= 0.052 && rover.speed <= 0.075);
      assert.ok(
        Math.abs(rover.speed - previous) < 0.02 * Math.max(1 / hz, 1 / 60),
      );
      previous = rover.speed;
      if ((frame + 1) % hz === 0) trace.push(rover.speed);
    }
    assert.ok(Math.max(...trace) > 0.07);
    assert.ok(Math.max(...trace) - Math.min(...trace) > 0.012);
    traces.push(trace);
    base.dispose();
  }
  for (let frame = 0; frame < traces[0].length; frame++) {
    near(traces[0][frame], traces[1][frame]);
    near(traces[1][frame], traces[2][frame]);
  }
});

test("suit accents change independently without changing either character's height", () => {
  const base = createMoonBase();
  base.setReveal(1);
  const boy = base.getObjectByName("BoyAstronaut");
  const girl = base.getObjectByName("GirlAstronaut");
  const vertexColor = (mesh, index = 0) =>
    new Color().fromBufferAttribute(mesh.geometry.attributes.color, index);
  const closeColor = (actual, hex) => {
    const expected = new Color(hex);
    near(actual.r, expected.r, 1e-6);
    near(actual.g, expected.g, 1e-6);
    near(actual.b, expected.b, 1e-6);
  };
  closeColor(vertexColor(base.getObjectByName("GirlAstronautHead")), 0x527fad);
  closeColor(vertexColor(base.getObjectByName("BoyAstronautHead")), 0xc9c9bf);
  for (const offset of [36, 72]) {
    closeColor(
      vertexColor(boy.children[0], offset),
      offset === 36 ? 0xe8e7df : 0x252a30,
    );
    closeColor(vertexColor(girl.children[0], offset), 0x9f5266);
  }
  near(boy.scale.y, ASTRONAUT_SCALES.boy);
  near(girl.scale.y, ASTRONAUT_SCALES.girl);
  base.dispose();
});

test("boy's torch follows local daylight and nearby illumination without shadows or flicker", () => {
  const scene = new Scene();
  const base = createMoonBase();
  scene.add(base);
  base.setReveal(1);
  const boy = base.getObjectByName("BoyAstronaut");
  const torch = base.getObjectByName("BoyTorch");
  // Isolate the probe from existing practical lights, without rebuilding the scene.
  base.traverse((object) => {
    if (object.isLight && object !== torch) object.visible = false;
  });
  const sun = new DirectionalLight(0xffffff, 3.1);
  const up = new Vector3(0, 1, 0);
  scene.updateMatrixWorld(true);
  up.transformDirection(boy.parent.matrixWorld);
  sun.position.copy(up).multiplyScalar(5);
  scene.add(sun, sun.target);
  const lamp = new SpotLight(0xffffff, 0, 0.2, Math.PI / 3, 0.8);
  boy.getWorldPosition(lamp.position).addScaledVector(up, 0.03);
  lamp.target.position.copy(boy.parent.position).applyMatrix4(base.matrixWorld);
  scene.add(lamp, lamp.target);
  const tick = () => {
    base.updateLighting(1 / 60);
  };
  for (let i = 0; i < 120; i++) tick();
  assert.equal(torch.userData.on, false);
  near(torch.intensity, 0);
  sun.position.negate();
  for (let i = 0; i < 120; i++) tick();
  assert.equal(torch.userData.on, true);
  assert.ok(torch.intensity > 0);
  assert.equal(torch.castShadow, false);
  assert.ok(torch.target.position.z > torch.position.z);
  assert.ok(torch.target.position.y < torch.position.y);
  sun.position.negate();
  sun.intensity = 0.24;
  tick();
  assert.equal(torch.userData.on, true);
  sun.intensity = 0;
  lamp.intensity = 0.1;
  for (let i = 0; i < 120; i++) tick();
  assert.equal(torch.userData.on, false);
  assert.ok(torch.intensity < 1e-6);
  lamp.intensity = 0;
  sun.intensity = 3.1;
  base.updateLighting(1 / 60);
  assert.equal(torch.userData.on, false);
  base.dispose();
});

test("both torches have increased reach, switch independently, and cannot light each other's sensors", () => {
  const scene = new Scene();
  const base = createMoonBase();
  scene.add(base);
  base.setReveal(1);
  base.traverse((object) => {
    if (object.isLight && !object.userData.astronautTorch)
      object.visible = false;
  });
  for (let i = 0; i < 120; i++) base.updateLighting(1 / 60);
  for (const [name, size] of [
    ["Boy", ASTRONAUT_SCALES.boy],
    ["Girl", ASTRONAUT_SCALES.girl],
  ]) {
    const torch = base.getObjectByName(`${name}Torch`);
    assert.equal(torch.userData.on, true);
    near(torch.distance, 0.4 * 0.55 * size);
    assert.ok(torch.intensity > 0.0119 * size * size);
    assert.ok(torch.intensity <= 0.012 * size * size);
    assert.equal(torch.castShadow, false);
    near(torch.userData.illumination, 0);
  }
  const beacons = base.getObjectByName("RocketBeacons");
  assert.ok(beacons.material.emissiveIntensity > 0);
  assert.equal(beacons.castShadow, false);
  base.dispose();
});

test("disposal releases shared resources exactly once and removes the group", () => {
  const parent = new Group();
  const base = createMoonBase();
  parent.add(base);
  const resources = new Set();
  base.traverse((object) => {
    if (object.isMesh) {
      resources.add(object.geometry);
      resources.add(object.material);
    }
  });
  let releases = 0;
  for (const resource of resources)
    resource.addEventListener("dispose", () => releases++);
  base.dispose();
  base.dispose();
  base.setReveal(1);
  base.update(1);
  assert.equal(releases, resources.size);
  assert.equal(parent.children.length, 0);
  assert.equal(base.children.length, 0);
});

test("reduced motion reveals the base without advancing travel or hover", () => {
  const moon = Object.create(Moon.prototype);
  moon._base = createMoonBase();
  moon._baseReveal = 0;
  moon._baseReady = false;
  moon.updateBase(0.05);
  assert.equal(moon._base.visible, false);
  moon.setLogoOpacity(0.72);
  moon.updateBase(0.05, true);
  assert.equal(moon._base.visible, true);
  const anchor = moon._base.getObjectByName("BoyAstronaut").parent;
  const original = anchor.position.clone();
  for (let i = 0; i < 100; i++) moon.updateBase(0.05, true);
  assert.ok(anchor.position.equals(original));
  moon._base.dispose();
});

test("navigation during logo loading disposes late artwork and does not resurrect the Moon", async () => {
  const previous = {
    Worker: globalThis.Worker,
    Image: globalThis.Image,
    document: globalThis.document,
  };
  const previousError = console.error;
  let worker;
  let image;
  let completed = 0;
  const errors = [];
  try {
    console.error = (...args) => errors.push(args[0]);
    globalThis.Worker = class {
      constructor() {
        worker = this;
      }
      postMessage() {}
      terminate() {
        this.terminated = true;
      }
    };
    globalThis.Image = class {
      constructor() {
        image = this;
        this.complete = false;
      }
    };
    globalThis.document = {
      querySelector: () => ({ src: "moon-race-test.png" }),
      createElement: () => {
        throw new Error("No canvas in Node");
      },
    };
    const scene = new Scene();
    const moon = new Moon(scene, () => completed++);
    const pending = worker.onmessage({
      data: {
        diffuse: new ArrayBuffer(630 * 630 * 4),
        bump: new ArrayBuffer(630 * 630 * 4),
        rough: new ArrayBuffer(490 * 490 * 4),
      },
    });
    assert.ok(image);
    const queuedLoad = image.onload;
    moon.dispose();
    await pending;
    assert.equal(
      image.onload,
      null,
      "disposal releases pending image handlers",
    );
    assert.equal(image.onerror, null);
    queuedLoad();
    assert.equal(worker.terminated, true);
    assert.equal(moon.mesh, null);
    assert.equal(scene.children.length, 0);
    assert.equal(completed, 1, "scene is ready before optional logo decoding");
    assert.ok(errors.includes("Flag initialization failed:"));
  } finally {
    console.error = previousError;
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete globalThis[key];
      else globalThis[key] = value;
    }
  }
});

test("worker failures finish readiness once and release the worker", async () => {
  const previousWorker = globalThis.Worker;
  const previousError = console.error;
  try {
    console.error = () => {};
    for (const payload of [{ error: "generation failed" }, {}, null]) {
      let worker;
      globalThis.Worker = class {
        constructor() { worker = this; }
        postMessage() {}
        terminate() { this.terminated = true; }
      };
      let completed = 0;
      const scene = new Scene();
      const moon = new Moon(scene, () => completed++);
      await worker.onmessage({ data: payload });
      await worker.onmessage({ data: payload });
      assert.equal(completed, 1);
      assert.equal(worker.terminated, true);
      assert.equal(moon._worker, null);
      assert.equal(scene.children.length, 0);
      moon.dispose();
    }
    globalThis.Worker = class { constructor() { throw new Error("unavailable"); } };
    let completed = 0;
    const moon = new Moon(new Scene(), () => completed++);
    await Promise.resolve();
    assert.equal(completed, 1);
    moon.dispose();
  } finally {
    console.error = previousError;
    if (previousWorker === undefined) delete globalThis.Worker;
    else globalThis.Worker = previousWorker;
  }
});

test("rover brakes for a reversal, limits yaw, and makes progress beyond a blocking object", () => {
  const normal = (angle) => new Vector3(Math.sin(angle), 0, Math.cos(angle));
  const rover = createWalker(normal(-0.55), {
    radius: 0.095,
    speed: 0.065,
    heading: Math.PI,
  });
  const simulation = createWanderSimulation(
    [rover],
    [{ normal: normal(0), radius: 0.15 }],
    12,
  );
  rover.target.copy(normal(0.65));
  rover.pause = 0;
  let crossed = false;
  let previousTurn = 0;
  for (let frame = 0; frame < 18000; frame++) {
    simulation.update(1 / 60);
    assert.ok(Math.abs(rover.turnDistance - previousTurn) <= 0.26 / 60 + 1e-10);
    previousTurn = rover.turnDistance;
    assert.ok(rover.normal.dot(normal(0)) <= Math.cos(0.245) + 1e-8);
    if (rover.normal.distanceTo(normal(0.65)) < 0.05) {
      crossed = true;
      break;
    }
  }
  assert.ok(
    crossed,
    "The rover must reach the destination rather than orbit the blocker",
  );
});
