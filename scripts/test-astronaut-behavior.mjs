import assert from "node:assert/strict";
import test from "node:test";
import { Matrix4, Vector3 } from "three";
import { createMoonBase } from "../src/components/General/Moon/3dMoon/base.js";
import {
  createGarden,
  GARDEN_SURFACE_NORMAL,
} from "../src/components/General/Moon/3dMoon/garden.js";
import {
  createRandom,
  createWalker,
  createWanderSimulation,
  obstacleGap,
} from "../src/components/General/Moon/3dMoon/wander.js";
import { createAstronautBehavior } from "../src/components/General/Moon/3dMoon/astronaut-behavior.js";
import { createGardenRoutes } from "../src/components/General/Moon/3dMoon/garden-routes.js";

const originalRandom = Math.random;
let garden;
try {
  Math.random = createRandom(147);
  garden = createGarden(0.4, GARDEN_SURFACE_NORMAL);
} finally {
  Math.random = originalRandom;
}
// One actual garden snapshot shared by deterministic navigation fixtures.
const interests = garden.userData.interestPoints;
const gardenLayout = garden.userData.navigation;
garden.dispose();
const fixture = (seed = 123, flowers = interests) => {
  const base = createMoonBase(0.4, {
    seed,
    gardenInterestPoints: flowers,
    gardenLayout: flowers === interests ? gardenLayout : null,
  });
  base.setReveal(1);
  return {
    base,
    navigation: base.userData.motion,
    controller: base.userData.behavior,
  };
};
const advance = (navigation, seconds, fps = 60) => {
  for (let frame = 0; frame < seconds * fps; frame++)
    navigation.update(1 / fps);
};

test("garden exports actual flower interests with elevated blooms and no extra artwork", () => {
  assert.equal(interests.length, 3);
  for (const point of interests) {
    assert.ok(point.bloom.length() > point.base.length());
    assert.ok(point.bloom.distanceTo(point.base) > 0.02);
    assert.ok(point.bloom.distanceTo(point.base) < 0.07);
    assert.ok(point.base.angleTo(GARDEN_SURFACE_NORMAL) < 0.25);
  }
});

test("garden graph protects flowers and lamp while rocks remain walkable", () => {
  const { base, navigation, controller } = fixture();
  const girl = controller.actors[1];
  assert.equal(
    gardenLayout.features.filter((item) => item.kind === "flower").length,
    3,
  );
  assert.equal(
    gardenLayout.features.filter((item) => item.kind === "lamp").length,
    1,
  );
  assert.equal(
    gardenLayout.features.filter((item) => item.kind === "rock").length,
    6,
  );
  const graph = createGardenRoutes(
    navigation,
    girl.views,
    girl.interest.normal,
    girl.walker,
  );
  const route = new Int16Array(128);
  const reachable = new Set();
  for (let index = 0; index < girl.views.length; index++) {
    const length = graph.plan(girl.walker.normal, index, route);
    if (!length) continue;
    let start = girl.walker.normal;
    for (let step = 0; step < length; step++) {
      const end = graph.nodes[route[step]];
      assert.ok(navigation.segmentClear(start, end, girl.walker));
      start = end;
    }
    if (start.angleTo(girl.interest.normal) < 0.24)
      reachable.add(girl.views[index].feature.kind);
  }
  assert.deepEqual([...reachable].sort(), ["flower", "lamp"]);
  assert.ok(girl.views.every((point) => point.feature.kind !== "rock"));
  base.dispose();
});

test("visits change features and viewpoints inside the garden, with close prop inspections", () => {
  const kinds = new Set(),
    viewpoints = new Set();
  let closeRocket = false,
    closeHouse = false;
  // Adding a third flower changes the seeded schedule. Verify variety
  // across sessions rather than requiring every prop in one session.
  for (const seed of [123, 71, 508]) {
    const { base, navigation, controller } = fixture(seed);
    for (let tick = 0; tick < 60 * 1800; tick++) {
      navigation.update(1 / 60);
      for (const actor of controller.actors) {
        if (actor.state === "garden" || actor.state === "showGarden") {
          kinds.add(actor.lastFeature.kind);
          viewpoints.add(actor.lastView);
          assert.ok(navigation.isClear(actor.walker.normal, actor.walker));
        } else if (
          actor.state === "rocket" ||
          actor.state === "house" ||
          actor.state === "showHouse"
        ) {
          const obstacle =
            actor.state === "showHouse"
              ? navigation.obstacles.find((item) => item.name === "Habitat")
              : actor.interest;
          const gap =
            obstacleGap(actor.walker.normal, obstacle) - actor.walker.radius;
          assert.ok(gap > 0 && gap < 0.05, `${actor.state} clearance ${gap}`);
          closeRocket ||= actor.state === "rocket";
          closeHouse ||= actor.state === "house" || actor.state === "showHouse";
        }
      }
    }
    base.dispose();
  }
  assert.deepEqual([...kinds].sort(), ["flower", "lamp"]);
  assert.ok(
    viewpoints.size >= 5 && closeRocket && closeHouse,
    JSON.stringify({
      views: viewpoints.size,
      closeRocket,
      closeHouse,
    }),
  );
});

test("short varied conversations use quick independent hands and readable head gestures", () => {
  const { navigation, controller } = greetingFixture();
  let talkStarted = -1,
    duration = 0,
    sawLeft = false,
    sawRight = false,
    stance = false,
    boyNods = false,
    girlShakes = false;
  let gestureFrames = 0,
    longestGesture = 0;
  for (let tick = 0; tick < 60 * 120; tick++) {
    navigation.update(1 / 60);
    const [boy, girl] = controller.actors;
    boyNods ||= Math.abs(boy.pose.nod) > 0.1;
    girlShakes ||= Math.abs(girl.pose.shake) > 0.1;
    if (girl.state === "wave")
      assert.ok(
        girl.until - girl.since >= 3.5 && girl.until - girl.since <= 5.5,
      );
    if (girl.state !== "conversation") {
      continue;
    }
    if (talkStarted < 0) {
      talkStarted = girl.since;
      duration = girl.until - girl.since;
    }
    for (const actor of [boy, girl]) {
      sawLeft ||= actor.pose.left > 0.25;
      sawRight ||= actor.pose.right > 0.25;
      stance ||= Math.abs(actor.pose.stance) > 0.0005;
      assert.ok(Math.abs(actor.pose.shift) <= 0.0015);
    }
    gestureFrames = girl.pose.hand > 0.25 ? gestureFrames + 1 : 0;
    longestGesture = Math.max(longestGesture, gestureFrames);
  }
  assert.ok(duration >= 3 && duration <= 10);
  assert.ok(sawLeft && sawRight && stance && boyNods && girlShakes);
  assert.ok(longestGesture > 12 && longestGesture < 100);
  controller.dispose();
});

test("house practical is warm, soft, shadowless and scales intensity with area", () => {
  const { base } = fixture();
  const light = base.getObjectByName("HabitatPorchLight");
  base.updateLighting();
  const intensity = light.intensity;
  assert.equal(light.castShadow, false);
  assert.equal(light.shadow.map, null);
  assert.equal(light.penumbra, 0.9);
  assert.equal(light.decay, 2);
  assert.ok(light.color.r > light.color.b);
  assert.ok(Math.abs(light.angle - (55 * Math.PI) / 180) < 1e-9);
  const doorway = new Vector3(0, 0.004, 0.052).sub(light.position);
  const beam = light.target.position.clone().sub(light.position);
  assert.ok(
    doorway.angleTo(beam) < light.angle * 0.8,
    "doorstep stays inside the useful beam",
  );
  base.scale.setScalar(1.5);
  base.updateWorldMatrix(true, true);
  base.updateLighting();
  assert.ok(Math.abs(light.intensity / intensity - 2.25) < 1e-8);
  assert.ok(Math.abs(light.distance - 0.42) < 1e-8);
  base.dispose();
  base.dispose();
});

test("conversation durations include brief exchanges and longer chats", () => {
  const durations = [];
  let spread = false;
  for (const seed of [31, 42, 7]) {
    const { navigation, controller } = greetingFixture([], true, seed);
    let previous = -1;
    for (let tick = 0; tick < 60 * 180; tick++) {
      navigation.update(1 / 60);
      const female = controller.actors[1];
      spread ||= controller.actors.some(
        (actor) => actor.state === "conversation" && actor.pose.spread > 0.3,
      );
      if (female.state === "conversation" && female.since !== previous) {
        previous = female.since;
        durations.push(female.until - female.since);
      }
    }
    controller.dispose();
  }
  assert.ok(durations.every((duration) => duration >= 3 && duration <= 10));
  assert.ok(durations.some((duration) => duration <= 6));
  assert.ok(durations.some((duration) => duration >= 7));
  assert.ok(spread);
});

test("an unanswered visible approach becomes a silent calling gesture and a bounded jog", () => {
  const { navigation, controller, boy, girl } = greetingFixture();
  const female = controller.actors[1];
  female.state = "approach";
  female.approachDistance = boy.normal.angleTo(girl.normal);
  boy.forward.negate();
  let hopped = false,
    spread = false,
    jogged = false;
  for (let tick = 0; tick < 60 * 8; tick++) {
    navigation.update(1 / 60);
    hopped ||= female.pose.hop > 0.001;
    spread ||= female.pose.spread > 0.4;
    jogged ||= boy.speed > controller.actors[0].cruiseSpeed * 1.3;
    assert.ok(female.pose.hop <= 0.018);
    assert.ok(
      boy.normal.angleTo(girl.normal) >= boy.radius + girl.radius - 1e-8,
    );
  }
  assert.equal(controller.stats.calls, 1);
  assert.ok(hopped && spread && jogged);
  assert.ok(Math.abs(boy.speed - controller.actors[0].cruiseSpeed) < 0.001);
  advance(navigation, 20);
  controller.dispose();
  assert.equal(boy.speed, controller.actors[0].cruiseSpeed);
});

test("playful waiting uses both hands and small landed hops; rocks support sitting", () => {
  const { base, navigation, controller } = fixture();
  const female = controller.actors[1];
  for (const actor of controller.actors) {
    actor.initial = false;
    actor.state = "waiting";
    actor.until = 1000;
    navigation.hold(actor.walker, actor.walker.normal);
  }
  controller.actors.forEach((actor, index) => {
    actor.walker.normal.set(
      index ? 0.05 : -0.05,
      -0.55,
      Math.sqrt(1 - 0.05 ** 2 - 0.55 ** 2),
    );
    navigation.hold(actor.walker, controller.actors[1 - index].walker.normal);
  });
  female.playfulWait = true;
  female.playVariant = 1; // Exercise the bouncing variant; other variants use toe taps.
  let bothHands = false,
    hop = false,
    legs = false;
  for (let tick = 0; tick < 60 * 6; tick++) {
    base.update(1 / 60);
    bothHands ||= female.pose.left > 0.2 && female.pose.right > 0.2;
    hop ||= female.pose.hop > 0.001;
    legs ||= female.pose.dance > 0.2;
    assert.ok(female.pose.hop <= 0.014);
  }
  assert.ok(bothHands && hop && legs);
  assert.equal(female.pose.hop, 0);
  const rock = female.interest.features.find(
    (feature) =>
      feature.kind === "rock" &&
      navigation.isClear(feature.normal, female.walker),
  );
  assert.ok(rock);
  female.walker.normal.copy(rock.normal);
  female.walker.target.copy(rock.normal);
  female.state = "sit";
  female.since = controller.time;
  female.playfulWait = false;
  const head = base.getObjectByName("GirlAstronautHead");
  const standingHeight = head.position.y;
  for (let tick = 0; tick < 120; tick++) base.update(1 / 60);
  assert.ok(female.walker.surfaceLift > 0);
  assert.ok(female.pose.sit > 0.99);
  assert.ok(head.position.y < standingHeight - 0.005);
  assert.ok(female.views.every((point) => point.feature.kind !== "rock"));
  base.dispose();
});

test("his subtle height increase preserves her established size and the overall scene scale", () => {
  const { base } = fixture();
  base.updateWorldMatrix(true, true);
  const boy = base.getObjectByName("BoyAstronaut"),
    girl = base.getObjectByName("GirlAstronaut");
  const head = new Vector3(),
    feet = new Vector3();
  const height = (model) => {
    model.children[1].getWorldPosition(head);
    model.parent.getWorldPosition(feet);
    return head.distanceTo(feet);
  };
  assert.ok(Math.abs(height(girl) / height(boy) - 5.7 / (6.2 * 1.018)) < 1e-7);
  assert.ok(Math.abs((boy.scale.y + girl.scale.y) / 2 - 0.8) < 0.008);
  base.dispose();
});

test("walking gloves and boots fit the smaller physical collision footprints", () => {
  const { base, controller } = fixture();
  const extremities = base.getObjectByName("AstronautGlovesAndBoots");
  const matrix = new Matrix4(),
    point = new Vector3();
  let samples = 0;
  for (let tick = 0; tick < 60 * 30; tick++) {
    base.update(1 / 60);
    if (tick % 10) continue;
    controller.actors.forEach((actor, index) => {
      if (!actor.walker.moving || actor.pose.weight > 0.05) return;
      for (let part = 0; part < 4; part++) {
        extremities.getMatrixAt(index * 4 + part, matrix);
        for (
          let vertex = 0;
          vertex < extremities.geometry.attributes.position.count;
          vertex++
        ) {
          point
            .fromBufferAttribute(
              extremities.geometry.attributes.position,
              vertex,
            )
            .applyMatrix4(matrix);
          point.z += 0.4;
          assert.ok(
            point.angleTo(actor.walker.normal) < actor.walker.radius,
            JSON.stringify({
              tick,
              index,
              part,
              state: actor.state,
              angle: point.angleTo(actor.walker.normal),
              radius: actor.walker.radius,
            }),
          );
        }
      }
      samples++;
    });
  }
  assert.ok(samples > 20);
  base.dispose();
});

test("managed walking brakes near the destination without a slow-motion tail", () => {
  const walker = createWalker(new Vector3(0, 0, 1));
  const navigation = createWanderSimulation([walker], [], 3);
  const target = new Vector3(Math.sin(0.2), 0, Math.cos(0.2));
  navigation.arrive(walker, target);
  let nearAt = -1,
    arrivedAt = -1;
  for (let tick = 0; tick < 1800; tick++) {
    navigation.update(1 / 60);
    if (nearAt < 0 && walker.normal.angleTo(target) < 0.04) {
      nearAt = tick / 60;
      assert.ok(walker.velocity > walker.speed * 0.85);
    }
    if (walker.arrived && walker.velocity < 0.001) {
      arrivedAt = tick / 60;
      break;
    }
  }
  assert.ok(nearAt >= 0 && arrivedAt > nearAt && arrivedAt - nearAt < 1.8);
});

test("waves keep travelling, sometimes hop, and always land", () => {
  let hopping = false,
    grounded = false,
    moving = false;
  for (const seed of [31, 42, 7, 71]) {
    const { navigation, controller } = greetingFixture([], true, seed);
    let sawWave = false,
      hop = false;
    for (let tick = 0; tick < 60 * 20; tick++) {
      navigation.update(1 / 60);
      const girl = controller.actors[1];
      assert.ok(girl.pose.hop >= 0 && girl.pose.hop <= 0.018);
      if (girl.state === "wave") {
        sawWave = true;
        moving ||= girl.walker.moving && girl.pose.wave > 0.4;
        hop ||= girl.pose.hop > 0.002;
      } else if (sawWave) {
        assert.equal(girl.pose.hop, 0);
        break;
      }
    }
    hopping ||= hop;
    grounded ||= sawWave && !hop;
    controller.dispose();
  }
  assert.ok(hopping && grounded && moving);
});

test("independent and guided garden visits reach all blooms from varied viewpoints", () => {
  const { base, navigation, controller } = fixture(71);
  const blooms = new Set();
  const places = new Set();
  for (let tick = 0; tick < 60 * 900; tick++) {
    navigation.update(1 / 60);
    const girl = controller.actors[1];
    if (
      (girl.state === "garden" || girl.state === "showGarden") &&
      girl.lastFeature.kind === "flower"
    ) {
      blooms.add(girl.lastFeature);
      places.add(girl.lastView);
      if (girl.state === "garden") assert.ok(girl.until - girl.since <= 4.5);
    }
  }
  assert.equal(blooms.size, interests.length);
  assert.ok(places.size >= 3);
  base.dispose();
});

test("garden entry can route around an intervening house from a close departure", () => {
  const { base, navigation, controller } = fixture(123);
  const girl = controller.actors[1].walker;
  const house = navigation.obstacles.find((item) => item.name === "Habitat");
  const actor = controller.actors[1];
  const graph = createGardenRoutes(
    navigation,
    actor.views,
    actor.interest.normal,
    girl,
  );
  const away = house.normal.clone().addScaledVector(actor.interest.normal, -1);
  away.addScaledVector(house.normal, -away.dot(house.normal)).normalize();
  const route = new Int16Array(128);
  let found = false;
  navigation.beforeStep = null;
  for (let attempt = 0; attempt < 12 && !found; attempt++) {
    const direction = away
      .clone()
      .applyAxisAngle(
        house.normal,
        (attempt % 2 ? -1 : 1) * Math.floor(attempt / 2) * 0.15,
      );
    const from = house.normal
      .clone()
      .multiplyScalar(Math.cos(0.19))
      .addScaledVector(direction, Math.sin(0.19))
      .normalize();
    if (!navigation.isStaticClear(from, girl)) continue;
    const length = graph.plan(from, 0, route);
    if (
      !length ||
      !Array.from(route.subarray(0, length)).some(
        (index) =>
          index >= actor.views.length &&
          index < actor.views.length + navigation.propRouteNodes.length,
      )
    )
      continue;
    girl.normal.copy(from);
    girl.forward
      .copy(direction)
      .addScaledVector(from, -direction.dot(from))
      .normalize();
    girl.velocity = 0;
    let waypoint = 0;
    assert.ok(navigation.arrive(girl, graph.nodes[route[0]]));
    for (let frame = 0; frame < 60 * 60; frame++) {
      navigation.update(1 / 60);
      for (const obstacle of navigation.obstacles) {
        if (obstacle.roverOnly) continue;
        assert.ok(obstacleGap(girl.normal, obstacle) >= girl.radius - 1e-8);
      }
      if (girl.arrived) {
        if (++waypoint === length) break;
        assert.ok(navigation.arrive(girl, graph.nodes[route[waypoint]]));
      }
    }
    assert.equal(
      waypoint,
      length,
      "She must leave the house and reach the garden",
    );
    found = true;
  }
  assert.ok(found, "Exercise a garden route using an outer house waypoint");
  base.dispose();
});

test("reduced motion lands an active hop without advancing simulation", () => {
  const { base, controller } = fixture();
  const girl = controller.actors[1];
  girl.pose.hop = 0.005;
  girl.waveHop = true;
  base.update(0);
  const anchor = base.getObjectByName("GirlAstronaut").parent;
  assert.ok(
    anchor.position
      .clone()
      .add(new Vector3(0, 0, 0.4))
      .length() > 0.401,
  );
  const before = controller.time;
  base.update(0.05, true);
  assert.equal(controller.time, before);
  assert.equal(girl.pose.hop, 0);
  assert.equal(girl.waveHop, false);
  assert.ok(
    Math.abs(
      anchor.position
        .clone()
        .add(new Vector3(0, 0, 0.4))
        .length() - 0.4,
    ) < 1e-8,
  );
  base.dispose();
});

test("managed arrival brakes, keeps its destination, and holds a smooth facing", () => {
  const walker = createWalker(new Vector3(0, 0, 1));
  const nav = createWanderSimulation([walker], [], 18);
  const destination = new Vector3(0.15, 0, Math.sqrt(1 - 0.15 ** 2));
  const face = new Vector3(0.15, 0.1, Math.sqrt(1 - 0.15 ** 2 - 0.1 ** 2));
  assert.equal(nav.arrive(walker, destination, face), true);
  advance(nav, 25);
  assert.ok(walker.normal.angleTo(destination) < 0.013);
  assert.ok(walker.target.equals(destination));
  assert.ok(walker.velocity < 0.0001);
  assert.equal(walker.arrived, true);
  const before = walker.normal.clone();
  nav.hold(walker, face);
  advance(nav, 10);
  assert.ok(before.distanceTo(walker.normal) < 0.0001);
  nav.wander(walker);
  assert.equal(walker.arrived, false);
  assert.equal(walker.softPartner, null);
});

test("a stopped astronaut finishes a large inspection turn promptly without sliding", () => {
  const walker = createWalker(new Vector3(0, 0, 1));
  const navigation = createWanderSimulation([walker], [], 9);
  const target = walker.normal
    .clone()
    .addScaledVector(walker.forward.clone().negate(), 0.2)
    .normalize();
  const start = walker.normal.clone();
  navigation.hold(walker, target);
  advance(navigation, 3);
  const desired = target
    .clone()
    .addScaledVector(walker.normal, -target.dot(walker.normal))
    .normalize();
  assert.ok(walker.forward.angleTo(desired) < 0.015);
  assert.equal(walker.normal.distanceTo(start), 0);
});

test("conversation gaze follows their eye heights while nods stay relative to that gaze", () => {
  const { base, navigation, controller } = fixture(31);
  for (const [index, actor] of controller.actors.entries()) {
    actor.initial = false;
    actor.until = 1000;
    actor.since = -5;
    actor.walker.normal.set(
      index ? 0.23 : -0.23,
      -0.55,
      Math.sqrt(1 - 0.23 ** 2 - 0.55 ** 2),
    );
  }
  for (const actor of controller.actors) {
    const other = controller.actors.find((item) => item !== actor);
    actor.walker.forward
      .copy(other.walker.normal)
      .addScaledVector(
        actor.walker.normal,
        -other.walker.normal.dot(actor.walker.normal),
      )
      .normalize();
    navigation.hold(actor.walker, other.walker.normal);
  }
  let checked = false;
  for (let frame = 0; frame < 60 * 90; frame++) {
    base.update(1 / 60);
    const [boy, girl] = controller.actors;
    if (
      girl.state !== "conversation" ||
      controller.time - girl.since < 1 ||
      Math.abs(boy.pose.nod) > 0.015 ||
      Math.abs(girl.pose.nod) > 0.015
    )
      continue;
    assert.ok(base.getObjectByName("BoyAstronautHead").rotation.x > 0.02);
    assert.ok(base.getObjectByName("GirlAstronautHead").rotation.x < -0.005);
    checked = true;
    break;
  }
  assert.ok(checked);
  base.dispose();
});

test("opening activities vary across seeds instead of always starting with the same visits", () => {
  const openings = new Set();
  for (const seed of [1, 2, 3, 71, 123, 508]) {
    const { base, navigation, controller } = fixture(seed);
    advance(navigation, 12);
    openings.add(controller.actors.map((actor) => actor.state).join("/"));
    base.dispose();
  }
  assert.ok(openings.size >= 3);
});

test("garden rocks intersect the Moon surface and flower contact uses real reachable geometry", () => {
  const original = Math.random;
  let actualGarden;
  try {
    Math.random = createRandom(147);
    actualGarden = createGarden(0.4, GARDEN_SURFACE_NORMAL);
  } finally {
    Math.random = original;
  }
  actualGarden.updateWorldMatrix(true, true);
  const vertex = new Vector3();
  let rocks = 0;
  actualGarden.traverse((mesh) => {
    if (mesh.geometry?.type !== "DodecahedronGeometry") return;
    let min = Infinity,
      max = 0;
    const positions = mesh.geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      vertex.fromBufferAttribute(positions, i).applyMatrix4(mesh.matrixWorld);
      min = Math.min(min, vertex.length());
      max = Math.max(max, vertex.length());
    }
    assert.ok(min < 0.4 && max > 0.4);
    rocks++;
  });
  assert.equal(rocks, 6);
  actualGarden.dispose();
  const { base, controller } = fixture(123);
  const female = controller.actors[1];
  const gloves = base.getObjectByName("AstronautGlovesAndBoots");
  const matrix = new Matrix4();
  let touched = false;
  for (let tick = 0; tick < 60 * 1800; tick++) {
    base.update(1 / 60);
    if (!female.touchActive || female.pose.touch < 0.9) continue;
    gloves.getMatrixAt(5 + female.touchArm * 2, matrix);
    vertex.setFromMatrixPosition(matrix);
    vertex.z += 0.4;
    const distance = vertex.distanceTo(
      female.touchTarget.clone().multiplyScalar(0.4),
    );
    assert.ok(distance < 0.002);
    assert.ok(female.walker.velocity < 0.003);
    assert.ok(
      base.userData.motion.isClear(female.walker.normal, female.walker),
    );
    touched = true;
    break;
  }
  assert.ok(
    touched,
    "a reachable flower receives a bounded, gentle glove gesture",
  );
  base.dispose();
});

test("inspection destinations remain outside all colliders and differ between visits", () => {
  const { base, navigation, controller } = fixture();
  const previousView = [new Vector3(), new Vector3()];
  const previousVisit = [-1, -1];
  const completed = [-1, -1];
  let inspections = 0;
  for (let frame = 0; frame < 60 * 900; frame++) {
    navigation.update(1 / 60);
    controller.actors.forEach((actor, index) => {
      if (
        (actor.state === "garden" ||
          actor.state === "rocket" ||
          actor.state === "house" ||
          actor.state === "showGarden" ||
          actor.state === "gardenGuest") &&
        previousVisit[index] !== actor.since
      ) {
        assert.ok(actor.walker.arrived);
        assert.ok(navigation.isClear(actor.walker.target, actor.walker));
        assert.ok(
          actor.walker.target.distanceTo(previousView[index]) > 1e-5,
          `${index}: repeated ${actor.state} viewpoint at ${controller.time}`,
        );
        if (
          completed[index] >= 0 &&
          actor.visitStarted === actor.since &&
          actor.state !== "showGarden" &&
          actor.state !== "gardenGuest"
        )
          assert.ok(
            actor.since - completed[index] >= (index ? 10 : 15),
            JSON.stringify({
              index,
              state: actor.state,
              since: actor.since,
              completed: completed[index],
              nextInspectAt: actor.nextInspectAt,
            }),
          );
        previousView[index].copy(actor.walker.target);
        previousVisit[index] = actor.since;
        inspections++;
      }
      completed[index] = actor.completedAt;
    });
  }
  assert.ok(inspections >= 3);
  assert.ok(controller.stats.gardenVisits >= 1);
  assert.ok(controller.stats.rocketVisits >= 1);
  base.dispose();
});

test("either partner can initiate; conversation alternates with safe separation", () => {
  const { base, navigation, controller } = fixture();
  let previousGirl = "wander";
  let observed = false;
  let girlGesture = false;
  let boyGesture = false;
  for (let frame = 0; frame < 60 * 1800; frame++) {
    navigation.update(1 / 60);
    const [boy, girl] = controller.actors;
    if (boy.state === "acknowledge" && previousGirl !== "conversation") {
      assert.ok(
        girl.state === "approach" ||
          girl.state === "wave" ||
          girl.state === "meeting",
      );
      assert.ok(boy.walker.normal.angleTo(girl.walker.normal) < 0.66);
    }
    if (girl.state === "conversation") {
      assert.equal(boy.state, "conversation");
      const clearance = boy.walker.radius + girl.walker.radius;
      assert.ok(
        boy.walker.normal.angleTo(girl.walker.normal) >= clearance + 0.004,
      );
      assert.ok(
        boy.walker.normal.angleTo(girl.walker.normal) <= clearance + 0.02,
      );
      assert.ok(boy.walker.velocity < 0.003 && girl.walker.velocity < 0.003);
      assert.ok(!(boy.pose.hand > 0.3 && girl.pose.hand > 0.3));
      girlGesture ||= girl.pose.hand > 0.3;
      boyGesture ||= boy.pose.hand > 0.3;
      observed = true;
    }
    if (
      observed &&
      girl.state !== "conversation" &&
      previousGirl === "conversation"
    ) {
      if (
        girl.state === "leadGarden" ||
        girl.state === "inviteGarden" ||
        girl.state === "acceptHouse" ||
        girl.state === "strollDepart" ||
        girl.state === "stroll"
      ) {
        assert.equal(boy.walker.softPartner, girl.walker);
        assert.equal(girl.walker.softPartner, boy.walker);
      } else {
        assert.equal(boy.walker.softPartner, null);
        assert.equal(girl.walker.softPartner, null);
      }
      assert.ok(
        girl.nextTalkAt - controller.time >= 2.9 &&
          girl.nextTalkAt - controller.time <= 8.01,
      );
      break;
    }
    previousGirl = girl.state;
  }
  assert.ok(observed && girlGesture && boyGesture);
  base.dispose();
});

test("boy approaches, invites, and shows the house with separate safe viewing positions", () => {
  let shown = 0;
  let boyApproaches = 0;
  for (const seed of [123, 71, 508]) {
    const boy = createWalker(new Vector3(-0.11, 0, Math.sqrt(1 - 0.11 ** 2)));
    const girl = createWalker(new Vector3(0.11, 0, Math.sqrt(1 - 0.11 ** 2)));
    const house = {
      normal: new Vector3(0, 0.25, Math.sqrt(1 - 0.25 ** 2)),
      radius: 0.06,
      halfWidth: 0.06,
      halfDepth: 0.04,
      axisX: new Vector3(1, 0, 0),
      axisY: new Vector3(0, Math.sqrt(1 - 0.25 ** 2), -0.25),
      focuses: [new Vector3(0, 0.25, 1.04)],
    };
    const navigation = createWanderSimulation([boy, girl], [house], seed);
    const controller = createAstronautBehavior({
      navigation,
      boy,
      girl,
      house,
      seed,
    });
    navigation.beforeStep = controller.step;
    for (const actor of controller.actors) {
      actor.initial = false;
      actor.since = -5;
      actor.until = 1000;
      actor.nextTalkAt = 35;
      navigation.hold(actor.walker, house.normal);
    }
    const phases = new Set();
    let invitationPoint = false;
    let showingPoint = false;
    let walkingTalk = false;
    for (let frame = 0; frame < 60 * 300; frame++) {
      navigation.update(1 / 60);
      const [male, female] = controller.actors;
      phases.add(male.state);
      walkingTalk ||=
        male.state === "leadHouse" &&
        boy.moving &&
        male.pose.left + male.pose.right > 0.2;
      invitationPoint ||=
        male.state === "inviteHouse" &&
        male.pose.pointLeft + male.pose.pointRight > 0.3;
      showingPoint ||=
        male.state === "showHouse" &&
        male.pose.pointLeft + male.pose.pointRight > 0.3;
      for (const walker of [boy, girl])
        assert.ok(obstacleGap(walker.normal, house) >= walker.radius - 1e-8);
      assert.ok(
        boy.normal.angleTo(girl.normal) >= boy.radius + girl.radius - 1e-8,
      );
      if (male.state === "showHouse") {
        assert.equal(female.state, "houseGuest");
        assert.ok(male.goal.angleTo(female.goal) >= 0.085);
        assert.ok(boy.normal.angleTo(male.goal) < 0.012);
        assert.ok(
          girl.normal.angleTo(female.goal) < 0.012,
          JSON.stringify({
            seed,
            time: controller.time,
            angle: girl.normal.angleTo(female.goal),
            girlMode: girl.mode,
            target: girl.target.toArray(),
            goal: female.goal.toArray(),
            girlState: female.state,
            arrived: girl.arrived,
            recovery: girl.recoveryActive,
          }),
        );
      }
    }
    boyApproaches += controller.stats.boyApproaches;
    if (controller.stats.boyApproaches) assert.ok(phases.has("approachGirl"));
    if (controller.stats.houseTours) {
      for (const phase of [
        "conversation",
        "inviteHouse",
        "leadHouse",
        "showHouse",
      ])
        assert.ok(phases.has(phase));
      assert.ok(invitationPoint && showingPoint && walkingTalk);
      shown++;
    }
    const snapshot = boy.normal.clone();
    controller.dispose();
    controller.step(1);
    assert.equal(boy.normal.distanceTo(snapshot), 0);
  }
  assert.ok(shown >= 2);
  assert.ok(boyApproaches >= 2);
});

test("fixed steps reproduce interaction state and positions at 30, 60, and 120 Hz", () => {
  const fixtures = [fixture(71), fixture(71), fixture(71)];
  [30, 60, 120].forEach((fps, index) =>
    advance(fixtures[index].navigation, 180, fps),
  );
  for (let index = 1; index < fixtures.length; index++) {
    assert.deepEqual(
      fixtures[index].controller.stats,
      fixtures[0].controller.stats,
    );
    fixtures[index].controller.actors.forEach((actor, which) => {
      assert.equal(actor.state, fixtures[0].controller.actors[which].state);
      assert.ok(
        actor.walker.normal.distanceTo(
          fixtures[0].controller.actors[which].walker.normal,
        ) < 1e-8,
      );
    });
  }
  fixtures.forEach(({ base }) => base.dispose());
});

test("thirty-minute sessions preserve frequent conversations, diverse activities, and collision safety", () => {
  const conversations = [];
  const sharedActivities = [];
  for (const seed of [123, 71, 508]) {
    const { base, navigation, controller } = fixture(seed);
    const visitedStates = new Set();
    for (let frame = 0; frame < 60 * 1800; frame++) {
      navigation.update(1 / 60);
      for (const actor of controller.actors) {
        visitedStates.add(actor.state);
        assert.ok(actor.walker.normal.z >= actor.walker.boundCos - 1e-8);
        for (const obstacle of navigation.obstacles) {
          if (obstacle.roverOnly) continue;
          assert.ok(
            obstacleGap(actor.walker.normal, obstacle) >=
              actor.walker.radius - 1e-8,
          );
        }
        if (actor.state === "travelGarden" || actor.state === "travelRocket")
          assert.ok(controller.time - actor.since < 90.3);
        if (actor.state === "approach")
          assert.ok(controller.time - actor.since < 20.3);
        if (actor.state === "conversation")
          assert.ok(controller.time - actor.since <= 10 + 1e-8);
        if (actor.state === "travelRest")
          assert.ok(controller.time < actor.restUntil + 0.3);
      }
      for (let a = 0; a < navigation.agents.length; a++)
        for (let b = a + 1; b < navigation.agents.length; b++)
          assert.ok(
            navigation.agents[a].normal.dot(navigation.agents[b].normal) <=
              Math.cos(
                navigation.agents[a].radius + navigation.agents[b].radius,
              ) +
                1e-8,
          );
    }
    assert.ok(
      visitedStates.has("garden") &&
        visitedStates.has("rocket") &&
        visitedStates.has("wander"),
    );
    assert.ok(controller.stats.decisions === 9000);
    assert.ok(controller.stats.gardenVisits >= 8);
    assert.ok(
      controller.stats.rocketVisits + controller.stats.houseVisits >= 1,
    );
    assert.ok(controller.stats.houseVisits + controller.stats.houseTours >= 1);
    assert.ok(controller.stats.boyApproaches >= 2);
    assert.ok(controller.stats.houseTours >= 1);
    assert.ok(controller.stats.seatedRests >= 1);
    conversations.push(controller.stats.conversations);
    sharedActivities.push(
      controller.stats.conversations +
        controller.stats.gardenTours +
        controller.stats.houseTours,
    );
    console.log(`30-minute seed ${seed}: ${JSON.stringify(controller.stats)}`);
    base.dispose();
  }
  // Preserve frequent ordinary conversations alongside the new guided visits.
  // The requested breathing room between short chats also applies after tours.
  assert.ok(conversations.every((count) => count >= 18));
  assert.ok(sharedActivities.every((count) => count >= 15));
  assert.ok(new Set(conversations).size > 1);
});

test("blocked destinations recover or expire; missing garden disables only garden visits", () => {
  const { base, navigation, controller } = fixture(123, []);
  const blocker = { normal: new Vector3(0, 0, 1), radius: 0.03 };
  advance(navigation, 15);
  const boy = controller.actors[0];
  blocker.normal.copy(boy.walker.target);
  navigation.obstacles.push(blocker);
  advance(navigation, 100);
  assert.notEqual(boy.state, "travelRocket");
  assert.equal(controller.stats.gardenVisits, 0);
  assert.ok(!controller.actors[1].state.toLowerCase().includes("garden"));
  base.dispose();
});

test("controller disposal and paused base updates cannot advance activity clocks", () => {
  const { base, navigation, controller } = fixture();
  advance(navigation, 8);
  base.setReveal(0);
  const before = controller.time;
  for (let i = 0; i < 60; i++) base.update(1 / 60);
  assert.equal(controller.time, before);
  base.dispose();
  base.dispose();
  assert.equal(navigation.beforeStep, null);
  controller.step(1);
  assert.equal(controller.time, before);
  assert.equal(controller.actors[0].walker.softPartner, null);
});

test("inaccessible garden interests fall back to wandering without a stuck inspection", () => {
  const boy = createWalker(new Vector3(0, 0, 1));
  const girl = createWalker(new Vector3(0.2, 0, Math.sqrt(0.96)), {
    boundAngle: 0.3,
  });
  const navigation = createWanderSimulation([boy, girl], [], 2);
  const controller = createAstronautBehavior({
    navigation,
    boy,
    girl,
    seed: 4,
    garden: {
      normal: new Vector3(0, 0, -1),
      radius: 0.24,
      focuses: [new Vector3(0, 0, -1.1)],
    },
  });
  navigation.beforeStep = controller.step;
  advance(navigation, 20);
  assert.equal(controller.stats.gardenVisits, 0);
  assert.ok(!controller.actors[1].state.toLowerCase().includes("garden"));
  controller.dispose();
});

test("rendered inspection and conversation poses keep boots grounded, head limits, and GPU budgets", () => {
  const { base, controller } = fixture(123);
  const boots = base.getObjectByName("AstronautGlovesAndBoots");
  const transform = new Matrix4();
  const vertex = new Vector3();
  let gardenSeen = false;
  let rocketSeen = false;
  let talkSeen = false;
  for (let frame = 0; frame < 60 * 900; frame++) {
    base.update(1 / 60);
    if (frame % 6 !== 0) continue;
    for (let person = 0; person < 2; person++) {
      const actor = controller.actors[person];
      const head = base.getObjectByName(
        person ? "GirlAstronautHead" : "BoyAstronautHead",
      );
      assert.ok(Math.abs(head.rotation.y) <= (25 * Math.PI) / 180 + 1e-8);
      assert.ok(Math.abs(head.rotation.x) <= (20 * Math.PI) / 180 + 1e-8);
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
        planted ||= lowest < 0.4001;
      }
      assert.ok(
        planted ||
          actor.pose.hop > 0 ||
          actor.walker.jogFlight > 0 ||
          actor.walker.surfaceLift > 0,
        JSON.stringify({
          frame,
          person,
          state: actor.state,
          stance: actor.pose.stance,
          gait: actor.walker.gaitDistance,
          speed: actor.walker.velocity,
        }),
      );
      gardenSeen ||= actor.state === "garden";
      rocketSeen ||= actor.state === "rocket";
      talkSeen ||= actor.state === "conversation";
    }
    if (gardenSeen && rocketSeen && talkSeen) break;
  }
  assert.ok(gardenSeen && rocketSeen && talkSeen);
  let triangles = 0,
    calls = 0;
  const materials = new Set();
  base.traverse((object) => {
    if (!object.isMesh) return;
    calls++;
    triangles +=
      ((object.geometry.index?.count ??
        object.geometry.attributes.position.count) /
        3) *
      (object.isInstancedMesh ? object.count : 1);
    materials.add(object.material);
    assert.equal(object.castShadow, false);
  });
  assert.equal(triangles, 3240);
  assert.equal(calls, 20);
  assert.equal(materials.size, 7);
  base.dispose();
});

test("behavior fixed-step work stays below the CPU budget", () => {
  const { base, navigation, controller } = fixture(508);
  const times = [];
  navigation.beforeStep = (dt) => {
    const start = performance.now();
    controller.step(dt);
    times.push(performance.now() - start);
  };
  advance(navigation, 600);
  times.sort((a, b) => a - b);
  const p95 = times[Math.floor(times.length * 0.95)];
  console.log(
    `Behavior CPU: median=${times[Math.floor(times.length / 2)].toFixed(4)}ms, p95=${p95.toFixed(4)}ms (${times.length} steps)`,
  );
  assert.ok(p95 < 0.2);
  base.dispose();
});

function greetingFixture(obstacles = [], facingEachOther = true, seed = 31) {
  const boy = createWalker(new Vector3(-0.23, 0, Math.sqrt(1 - 0.23 ** 2)));
  const girl = createWalker(new Vector3(0.23, 0, Math.sqrt(1 - 0.23 ** 2)));
  const navigation = createWanderSimulation([boy, girl], obstacles, 11);
  for (const [walker, other] of [
    [boy, girl],
    [girl, boy],
  ]) {
    walker.forward
      .copy(other.normal)
      .addScaledVector(walker.normal, -other.normal.dot(walker.normal))
      .normalize();
    if (!facingEachOther) walker.forward.negate();
    const look = walker.normal
      .clone()
      .addScaledVector(walker.forward, 0.1)
      .normalize();
    navigation.hold(walker, look);
  }
  const controller = createAstronautBehavior({
    navigation,
    boy,
    girl,
    seed,
  });
  for (const actor of controller.actors) {
    actor.initial = false;
    actor.until = 1000;
    actor.since = -5;
  }
  navigation.beforeStep = controller.step;
  return { navigation, controller, boy, girl };
}

test("a distant wave brings both people to a safe meeting before talking", () => {
  const { navigation, controller, boy, girl } = greetingFixture();
  let wave = false,
    meeting = false,
    conversation = false;
  const boyStart = boy.normal.clone(),
    girlStart = girl.normal.clone();
  for (let frame = 0; frame < 60 * 40; frame++) {
    navigation.update(1 / 60);
    const [male, female] = controller.actors;
    wave ||= female.state === "wave" && female.pose.wave > 0.2;
    meeting ||= female.state === "meeting" && male.state === "meeting";
    if (female.state === "conversation") {
      conversation = true;
      break;
    }
  }
  assert.ok(wave && meeting && conversation);
  assert.ok(boyStart.angleTo(boy.normal) > 0.05);
  assert.ok(girlStart.angleTo(girl.normal) > 0.05);
  assert.ok(boy.normal.angleTo(girl.normal) >= 0.075);
  assert.ok(boy.normal.angleTo(girl.normal) <= 0.09);
  assert.equal(controller.stats.waves, 1);
  controller.dispose();
});

test("looking away or an occluding prop prevents a distant wave", () => {
  for (const setup of [
    greetingFixture([], false),
    greetingFixture([{ normal: new Vector3(0, 0, 1), radius: 0.09 }]),
  ]) {
    advance(setup.navigation, 12);
    assert.equal(setup.controller.stats.waves, 0);
    assert.equal(setup.controller.stats.conversations, 0);
    setup.controller.dispose();
  }
});

test("shared garden tours invite, lead, point at features and exchange attention", () => {
  const { base, navigation, controller } = fixture(123);
  let leading = false,
    following = false,
    showing = false,
    pointed = false,
    changedFlower = false,
    invited = false,
    response = false;
  let firstFlower = null;
  let tourSince = -1;
  for (let frame = 0; frame < 60 * 1800; frame++) {
    navigation.update(1 / 60);
    const [boy, girl] = controller.actors;
    invited ||= girl.state === "inviteGarden" && girl.pose.hand > 0.3;
    response ||= boy.state === "acceptGarden" && boy.pose.hand > 0.3;
    leading ||= girl.state === "leadGarden" && girl.walker.moving;
    following ||= boy.state === "followGarden" && boy.walker.moving;
    if (girl.state === "showGarden") {
      assert.equal(boy.state, "gardenGuest");
      assert.ok(girl.walker.normal.angleTo(boy.walker.normal) > 0.07);
      assert.ok(girl.focus.length() > 1);
      assert.ok(boy.pose.hand < 0.6);
      if (tourSince !== girl.since) {
        firstFlower = girl.focus.clone();
        tourSince = girl.since;
      }
      changedFlower ||= firstFlower.distanceTo(girl.focus) > 0.01;
      pointed ||= girl.pose.hand > 0.3;
      showing = true;
    }
    if (leading && following && showing && pointed && changedFlower) break;
  }
  assert.ok(
    invited &&
      response &&
      leading &&
      following &&
      showing &&
      pointed &&
      changedFlower,
  );
  assert.ok(controller.stats.gardenTours > 0);
  base.dispose();
});

test("the rendered wave actually lifts a glove above the shoulder while she turns", () => {
  const { base, controller } = fixture(123);
  // Arrange a visible greeting directly; random activity selection is covered
  // separately and must not make this rendered-pose regression depend on luck.
  const navigation = base.userData.motion;
  controller.actors.forEach((actor, index) => {
    actor.walker.normal.set(
      index ? 0.23 : -0.23,
      -0.55,
      Math.sqrt(1 - 0.23 ** 2 - 0.55 ** 2),
    );
    actor.initial = false;
    actor.until = 1000;
    actor.since = -5;
  });
  for (const actor of controller.actors) {
    const other = controller.actors.find((item) => item !== actor);
    actor.walker.forward
      .copy(other.walker.normal)
      .addScaledVector(
        actor.walker.normal,
        -other.walker.normal.dot(actor.walker.normal),
      )
      .normalize();
    navigation.hold(actor.walker, other.walker.normal);
  }
  controller.actors[1].state = "wave";
  controller.actors[1].since = 0;
  controller.actors[1].until = 5;
  controller.actors[0].state = "acknowledge";
  controller.actors[0].acknowledgmentAt = 10;
  const model = base.getObjectByName("GirlAstronaut");
  const gloves = base.getObjectByName("AstronautGlovesAndBoots");
  const frame = new Matrix4(),
    inverse = new Matrix4(),
    glove = new Matrix4();
  const hand = new Vector3();
  let raised = false;
  let waves = 0,
    peak = 0,
    weight = 0,
    height = 0;
  for (let tick = 0; tick < 60 * 900; tick++) {
    base.update(1 / 60);
    const girl = controller.actors[1];
    if (girl.state === "wave") {
      waves++;
      peak = Math.max(peak, girl.pose.wave);
      weight = Math.max(weight, girl.pose.weight);
    }
    if (
      girl.state !== "wave" ||
      girl.pose.wave < 0.8 ||
      girl.pose.weight < 0.99
    )
      continue;
    frame.multiplyMatrices(model.parent.matrix, model.matrix);
    inverse.copy(frame).invert();
    for (const index of [5, 7]) {
      gloves.getMatrixAt(index, glove);
      hand.setFromMatrixPosition(glove).applyMatrix4(inverse);
      height = Math.max(height, hand.y);
      raised ||= hand.y > 0.07 * 0.4;
    }
    if (raised) break;
  }
  assert.ok(
    raised,
    "The greeting must be visible, even before in-place turning has settled " +
      JSON.stringify({ waves, peak, weight, height, stats: controller.stats }),
  );
  base.dispose();
});
