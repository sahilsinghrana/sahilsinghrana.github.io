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
  assert.equal(interests.length, 2);
  for (const point of interests) {
    assert.ok(point.bloom.length() > point.base.length());
    assert.ok(point.bloom.distanceTo(point.base) > 0.02);
    assert.ok(point.bloom.distanceTo(point.base) < 0.07);
    assert.ok(point.base.angleTo(GARDEN_SURFACE_NORMAL) < 0.25);
  }
});

test("garden graph reaches interior features without crossing plant, lamp or rock footprints", () => {
  const { base, navigation, controller } = fixture();
  const girl = controller.actors[1];
  assert.equal(
    gardenLayout.features.filter((item) => item.kind === "flower").length,
    2,
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
  assert.deepEqual([...reachable].sort(), ["flower", "lamp", "rock"]);
  base.dispose();
});

test("visits change features and viewpoints inside the garden, with close prop inspections", () => {
  const { base, navigation, controller } = fixture();
  const kinds = new Set(),
    viewpoints = new Set();
  let closeRocket = false,
    closeHouse = false;
  for (let tick = 0; tick < 60 * 1800; tick++) {
    navigation.update(1 / 60);
    for (const actor of controller.actors) {
      if (actor.state === "garden") {
        kinds.add(actor.lastFeature.kind);
        viewpoints.add(actor.lastView);
        assert.ok(navigation.isClear(actor.walker.normal, actor.walker));
      } else if (actor.state === "rocket" || actor.state === "house") {
        const gap =
          obstacleGap(actor.walker.normal, actor.interest) -
          actor.walker.radius;
        assert.ok(gap > 0 && gap < 0.05, `${actor.state} clearance ${gap}`);
        closeRocket ||= actor.state === "rocket";
        closeHouse ||= actor.state === "house";
      }
    }
  }
  assert.deepEqual([...kinds].sort(), ["flower", "lamp", "rock"]);
  assert.ok(viewpoints.size >= 5 && closeRocket && closeHouse);
  base.dispose();
});

test("longer conversations use quick independent hands and bounded stance changes", () => {
  const { navigation, controller } = greetingFixture();
  let talkStarted = -1,
    duration = 0,
    sawLeft = false,
    sawRight = false,
    stance = false;
  let gestureFrames = 0,
    longestGesture = 0;
  for (let tick = 0; tick < 60 * 70; tick++) {
    navigation.update(1 / 60);
    const [boy, girl] = controller.actors;
    if (girl.state === "wave")
      assert.ok(
        girl.until - girl.since >= 3.5 && girl.until - girl.since <= 5.5,
      );
    if (girl.state !== "conversation") {
      if (talkStarted >= 0) break;
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
  assert.ok(duration >= 16 && duration <= 28);
  assert.ok(sawLeft && sawRight && stance);
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
        assert.ok(actor.walker.target.distanceTo(previousView[index]) > 1e-5);
        if (
          completed[index] >= 0 &&
          actor.visitStarted === actor.since &&
          actor.state !== "showGarden" &&
          actor.state !== "gardenGuest"
        )
          assert.ok(actor.since - completed[index] >= (index ? 15 : 35));
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

test("girl initiates; boy responds only nearby; conversation alternates with safe separation", () => {
  const { base, navigation, controller } = fixture();
  let previousGirl = "wander";
  let observed = false;
  let girlGesture = false;
  let boyGesture = false;
  for (let frame = 0; frame < 60 * 1800; frame++) {
    navigation.update(1 / 60);
    const [boy, girl] = controller.actors;
    if (boy.state === "acknowledge" && previousGirl !== "conversation") {
      assert.ok(girl.state === "approach" || girl.state === "wave");
      assert.ok(boy.walker.normal.angleTo(girl.walker.normal) < 0.66);
    }
    if (girl.state === "conversation") {
      assert.equal(boy.state, "conversation");
      assert.ok(boy.walker.normal.angleTo(girl.walker.normal) >= 0.085);
      assert.ok(boy.walker.normal.angleTo(girl.walker.normal) <= 0.105);
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
      if (girl.state === "leadGarden" || girl.state === "inviteGarden") {
        assert.equal(boy.walker.softPartner, girl.walker);
        assert.equal(girl.walker.softPartner, boy.walker);
      } else {
        assert.equal(boy.walker.softPartner, null);
        assert.equal(girl.walker.softPartner, null);
      }
      assert.ok(girl.nextTalkAt - controller.time >= 17.9);
      break;
    }
    previousGirl = girl.state;
  }
  assert.ok(observed && girlGesture && boyGesture);
  base.dispose();
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

test("thirty-minute sessions preserve collision safety, diverse activities, and bounded travel", () => {
  const conversations = [];
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
    conversations.push(controller.stats.conversations);
    console.log(`30-minute seed ${seed}: ${JSON.stringify(controller.stats)}`);
    base.dispose();
  }
  assert.ok(conversations.reduce((sum, count) => sum + count, 0) >= 2);
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
  assert.equal(controller.actors[1].state, "wander");
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
      assert.ok(planted);
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
  assert.equal(triangles, 3144);
  assert.equal(calls, 17);
  assert.equal(materials.size, 5);
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

function greetingFixture(obstacles = [], facingEachOther = true) {
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
    seed: 31,
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
  assert.ok(boy.normal.angleTo(girl.normal) >= 0.085);
  assert.ok(boy.normal.angleTo(girl.normal) <= 0.105);
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
    actor.walker.normal.set(index ? 0.23 : -0.23, 0, Math.sqrt(1 - 0.23 ** 2));
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
  const model = base.getObjectByName("GirlAstronaut");
  const gloves = base.getObjectByName("AstronautGlovesAndBoots");
  const frame = new Matrix4(),
    inverse = new Matrix4(),
    glove = new Matrix4();
  const hand = new Vector3();
  let raised = false;
  for (let tick = 0; tick < 60 * 900; tick++) {
    base.update(1 / 60);
    const girl = controller.actors[1];
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
      raised ||= hand.y > 0.07 * 0.4;
    }
    if (raised) break;
  }
  assert.ok(
    raised,
    "The greeting must be visible, even before in-place turning has settled",
  );
  base.dispose();
});
