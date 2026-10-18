import assert from "node:assert/strict";
import test from "node:test";
import { Vector3, Matrix4 } from "three";
import { createMoonBase } from "../src/components/General/Moon/3dMoon/base.js";
import { createAstronautBehavior } from "../src/components/General/Moon/3dMoon/astronaut-behavior.js";
import {
  createRandom,
  createWalker,
  createWanderSimulation,
} from "../src/components/General/Moon/3dMoon/wander.js";
import {
  createGarden,
  GARDEN_SURFACE_NORMAL,
} from "../src/components/General/Moon/3dMoon/garden.js";

test("a distant boy jogs toward her without holding her activity from across the Moon", () => {
  const boy = createWalker(new Vector3(-0.48, 0, Math.sqrt(1 - 0.48 ** 2)), {
    speed: 0.0334,
    boundAngle: 1.43,
  });
  const girl = createWalker(new Vector3(0.48, 0, Math.sqrt(1 - 0.48 ** 2)), {
    speed: 0.015,
    boundAngle: 1.43,
  });
  const nav = createWanderSimulation([boy, girl], [], 31);
  const behavior = createAstronautBehavior({
    navigation: nav,
    boy,
    girl,
    seed: 31,
  });
  nav.beforeStep = behavior.step;
  for (const actor of behavior.actors) {
    actor.initial = false;
    actor.until = 1000;
    actor.nextRestAt = Infinity;
  }
  nav.hold(boy, girl.normal);
  nav.arrive(
    girl,
    girl.normal
      .clone()
      .add(new Vector3(0, 0.3, 0))
      .normalize(),
  );
  let started = -1,
    continued = false,
    jogged = false,
    separation = 0;
  for (let i = 0; i < 120 * 60; i++) {
    nav.update(1 / 60);
    const male = behavior.actors[0],
      female = behavior.actors[1];
    if (male.longApproach) {
      if (started < 0) {
        started = behavior.time;
        separation = boy.normal.angleTo(girl.normal);
      }
      if (
        behavior.time - started > 1 &&
        boy.normal.angleTo(girl.normal) > 0.3
      ) {
        continued ||= female.state === "wander" && girl.distance > 0.01;
      }
      jogged ||= boy.velocity > male.cruiseSpeed * 1.6;
    }
    assert.ok(
      boy.normal.angleTo(girl.normal) >= boy.radius + girl.radius - 1e-8,
    );
    if (behavior.stats.conversations) break;
  }
  assert.ok(separation > 0.7);
  assert.ok(continued && jogged);
  assert.ok(
    behavior.stats.distantBoyApproaches >= 1 &&
      behavior.stats.conversations >= 1,
    JSON.stringify(behavior.stats),
  );
  behavior.dispose();
});

test("completed garden inspections and seated rests use different reachable interests", () => {
  const saved = Math.random;
  let garden;
  try {
    Math.random = createRandom(147);
    garden = createGarden(0.4, GARDEN_SURFACE_NORMAL);
  } finally {
    Math.random = saved;
  }
  const base = createMoonBase(0.4, {
    seed: 123,
    gardenLayout: garden.userData.navigation,
    gardenInterestPoints: garden.userData.interestPoints,
  });
  const nav = base.userData.motion,
    behavior = base.userData.behavior;
  const flowers = new Set(),
    seats = [new Set(), new Set()];
  let lastGarden = -1;
  const lastSit = [-1, -1];
  for (let i = 0; i < 1800 * 60; i++) {
    nav.update(1 / 60);
    const girl = behavior.actors[1];
    if (girl.state === "garden" && girl.since !== lastGarden) {
      lastGarden = girl.since;
      if (girl.lastFeature.kind === "flower") flowers.add(girl.lastFeature);
    }
    behavior.actors.forEach((actor, index) => {
      if (actor.state === "sit" && actor.since !== lastSit[index]) {
        lastSit[index] = actor.since;
        seats[index].add(actor.lastSeat);
      }
    });
  }
  assert.ok(flowers.size >= 3, `Only ${flowers.size} flowers reached`);
  for (const choices of seats)
    assert.ok(choices.size >= 2, `Only ${choices.size} rest positions reached`);
  console.log(
    "Completed variety:",
    flowers.size,
    "flowers; seats",
    seats.map((s) => [...s]),
  );
  base.dispose();
  garden.dispose();
});

test("the jogging gait alternates real support with brief bounded aerial phases", () => {
  const base = createMoonBase(0.4, { seed: 123 });
  base.setReveal(1);
  const nav = base.userData.motion;
  nav.beforeStep = null;
  const actor = base.userData.behavior.actors[0],
    walker = actor.walker;
  walker.normal.set(-0.4, -0.45, Math.sqrt(1 - 0.4 ** 2 - 0.45 ** 2));
  walker.forward.set(1, 0, 0).addScaledVector(walker.normal, 0.4).normalize();
  walker.target
    .copy(walker.normal)
    .addScaledVector(walker.forward, 0.4)
    .normalize();
  walker.mode = "arrive";
  walker.speed = actor.cruiseSpeed * 1.95;
  const boots = base.getObjectByName("AstronautGlovesAndBoots"),
    matrix = new Matrix4(),
    point = new Vector3();
  let air = 0,
    support = 0;
  for (let i = 0; i < 4 * 60; i++) {
    base.update(1 / 60);
    let planted = false;
    for (const index of [0, 2]) {
      boots.getMatrixAt(index, matrix);
      let lowest = Infinity;
      for (let v = 0; v < boots.geometry.attributes.position.count; v++) {
        point
          .fromBufferAttribute(boots.geometry.attributes.position, v)
          .applyMatrix4(matrix);
        point.z += 0.4;
        lowest = Math.min(lowest, point.length());
      }
      assert.ok(lowest >= 0.4 - 1e-7);
      planted ||= lowest < 0.4001;
    }
    assert.ok(walker.jogFlight <= 0.0028);
    if (!planted && walker.jogFlight > 0) air++;
    if (planted) support++;
  }
  assert.ok(air > 5 && support > 30, JSON.stringify({ air, support }));
  base.update(0, true);
  assert.equal(walker.jogFlight, 0);
  base.dispose();
});

test("a changed destination cancels an old house recovery without abandoning the new trip", () => {
  const walker = createWalker(new Vector3(-0.3, 0, Math.sqrt(1 - 0.3 ** 2)), {
    speed: 0.04,
    boundAngle: 1.43,
  });
  const house = {
    normal: new Vector3(0, 0, 1),
    halfWidth: 0.1,
    halfDepth: 0.07,
    radius: 0.13,
    axisX: new Vector3(1, 0, 0),
    axisY: new Vector3(0, 1, 0),
  };
  const nav = createWanderSimulation([walker], [house], 31);
  walker.recoveryActive = true;
  walker.recoveryTarget.copy(house.normal);
  const destination = new Vector3(0.3, 0, Math.sqrt(1 - 0.3 ** 2));
  assert.ok(nav.arrive(walker, destination));
  assert.equal(walker.recoveryActive, false);
  for (let i = 0; i < 45 * 60 && !walker.arrived; i++) nav.update(1 / 60);
  assert.ok(walker.arrived);
  assert.ok(walker.normal.angleTo(destination) < 0.013);
});

test("only the girl initiates a palm gesture when blocked, and the boy yields without overlap", () => {
  const point = (x, y = 0) => new Vector3(x, y, 1).normalize();
  const boy = createWalker(point(0.08), { speed: 0.0334, boundAngle: 1.43 });
  const girl = createWalker(point(0), { speed: 0.0368, boundAngle: 1.43 });
  girl.forward.set(1, 0, 0);
  const nav = createWanderSimulation([boy, girl], [], 7);
  const behavior = createAstronautBehavior({
    navigation: nav,
    boy,
    girl,
    seed: 7,
  });
  const [male, female] = behavior.actors;
  for (const actor of behavior.actors) {
    actor.initial = false;
    actor.until = 100;
    actor.nextTalkAt = actor.nextInspectAt = 100;
  }
  male.state = "rest";
  female.state = "travelGarden";
  nav.hold(boy, girl.normal);
  assert.ok(nav.arrive(girl, point(0.4)));
  nav.beforeStep = behavior.step;
  let gestured = false,
    aside = false;
  // Hold a persistent blocked intent before releasing the navigation fixture.
  // Ordinary avoidance would otherwise steer her around him before a nudge.
  for (let frame = 0; frame < 180; frame++) {
    girl.blocked = true;
    behavior.step(1 / 60);
    gestured ||= female.pose.push > 0.3;
    assert.equal(male.pose.push, 0);
  }
  girl.blocked = false;
  for (let frame = 0; frame < 12 * 60; frame++) {
    nav.update(1 / 60);
    gestured ||= female.pose.push > 0.3;
    aside ||= Math.abs(boy.normal.y) > 0.025;
    assert.equal(male.pose.push, 0);
    assert.ok(
      boy.normal.angleTo(girl.normal) >= boy.radius + girl.radius - 1e-6,
    );
  }
  assert.ok(
    gestured && aside,
    JSON.stringify({ gestured, aside, stats: behavior.stats }),
  );
  assert.ok(
    girl.normal.x > 0.1,
    `She resumes the original trip: ${JSON.stringify({ normal: girl.normal, state: female.state, mode: girl.mode, target: girl.target, boy: boy.normal })}`,
  );
  assert.ok(female.pose.push < 0.01);
  behavior.dispose();
});

test("shared house visits choose the entrance side for both people", () => {
  const base = createMoonBase(0.4, { seed: 123 });
  const nav = base.userData.motion;
  const behavior = base.userData.behavior;
  const house = nav.obstacles.find((object) => object.name === "Habitat");
  let shown = false;
  for (let i = 0; i < 1200 * 60; i++) {
    nav.update(1 / 60);
    const [boy, girl] = behavior.actors;
    if (["inviteHouse", "leadHouse", "showHouse"].includes(boy.state)) {
      for (const actor of [boy, girl])
        assert.ok(
          actor.goal.dot(house.axisY) - house.normal.dot(house.axisY) >= 0.045,
        );
    }
    if (boy.state === "showHouse") {
      assert.ok(boy.until - boy.since >= 2.5 && boy.until - boy.since <= 4);
      shown = true;
      break;
    }
  }
  assert.ok(shown, "A front-side tour must actually complete");
  base.dispose();
});

test("garden dance phrases vary feet, arm spread, torso sway, and hops", () => {
  const base = createMoonBase(0.4, { seed: 123 });
  const behavior = base.userData.behavior;
  const [boy, girl] = behavior.actors;
  girl.walker.normal.copy(boy.walker.normal);
  girl.walker.mode = "hold";
  girl.walker.velocity = 0;
  const signatures = new Set();
  for (let variant = 0; variant < 4; variant++) {
    girl.state = "gardenDance";
    girl.since = behavior.time;
    girl.until = behavior.time + 8;
    girl.playVariant = variant;
    let steps = 0,
      spread = 0,
      hops = 0,
      sway = 0;
    for (let frame = 0; frame < 7 * 60; frame++) {
      behavior.step(1 / 60);
      steps += Math.abs(girl.pose.danceStep);
      spread += girl.pose.spread;
      hops += girl.pose.hop;
      sway += Math.abs(girl.pose.shift);
    }
    assert.ok(steps > 20 && spread > 50 && sway > 0.1);
    signatures.add(
      [steps, spread, hops, sway].map((value) => value.toFixed(3)).join(":"),
    );
  }
  assert.equal(signatures.size, 4);
  base.dispose();
});

test("playful routines move feet, torso, head and independent hands with four distinct signatures", () => {
  const base = createMoonBase(0.4, { seed: 123 });
  const behavior = base.userData.behavior;
  const [boy, girl] = behavior.actors;
  girl.walker.normal.copy(boy.walker.normal);
  girl.walker.mode = "hold";
  girl.walker.velocity = 0;
  const signatures = new Set();
  for (let variant = 0; variant < 4; variant++) {
    girl.state = "playful";
    girl.playfulWait = true;
    girl.playVariant = variant;
    girl.playTempo = 1;
    girl.playLead = 1;
    girl.since = behavior.time;
    girl.until = behavior.time + 4;
    let feet = 0,
      torso = 0,
      head = 0,
      hands = 0,
      hops = 0;
    for (let tick = 0; tick < 3.5 * 60; tick++) {
      behavior.step(1 / 60);
      feet += Math.abs(girl.pose.danceStep);
      torso += Math.abs(girl.pose.roll) + Math.abs(girl.pose.shift);
      head += Math.abs(girl.pose.tilt) + Math.abs(girl.pose.nod);
      hands += Math.abs(girl.pose.left - girl.pose.right);
      hops += girl.pose.hop;
      assert.ok(girl.pose.hop >= 0 && girl.pose.hop <= 0.014);
    }
    assert.ok(
      feet > 4 && torso > 1 && head > 2 && hands > 5,
      JSON.stringify({ variant, feet, torso, head, hands }),
    );
    signatures.add(
      [feet, torso, head, hands, hops]
        .map((value) => value.toFixed(3))
        .join(":"),
    );
  }
  assert.equal(signatures.size, 4);
  base.dispose();
});

test("a playful full turn is continuous, grounded, and frame-rate independent", () => {
  for (const hz of [30, 60, 120]) {
    const base = createMoonBase(0.4, { seed: 123 });
    base.setReveal(1);
    const behavior = base.userData.behavior;
    const [boy, girl] = behavior.actors;
    girl.walker.normal.copy(boy.walker.normal);
    girl.walker.forward.copy(boy.walker.forward);
    girl.walker.mode = "hold";
    girl.walker.velocity = 0;
    girl.state = "playful";
    girl.playfulWait = true;
    girl.playVariant = 4;
    girl.playLead = 1;
    girl.since = behavior.time;
    girl.until = behavior.time + 4;
    const model = base.getObjectByName("GirlAstronaut");
    const boots = base.getObjectByName("AstronautGlovesAndBoots");
    const matrix = new Matrix4(),
      point = new Vector3();
    let previous = 0,
      traveled = 0;
    for (let frame = 0; frame < 2.8 * hz; frame++) {
      behavior.step(1 / hz);
      base.update(0);
      const delta = Math.atan2(
        Math.sin(girl.pose.turn - previous),
        Math.cos(girl.pose.turn - previous),
      );
      assert.ok(Math.abs(delta) <= 9 / hz + 1e-9);
      traveled += delta;
      previous = girl.pose.turn;
      assert.equal(model.rotation.y, girl.pose.turn);
      assert.equal(girl.pose.hop, 0);
      for (const boot of [4, 6]) {
        boots.getMatrixAt(boot, matrix);
        for (
          let vertex = 0;
          vertex < boots.geometry.attributes.position.count;
          vertex++
        ) {
          point
            .fromBufferAttribute(boots.geometry.attributes.position, vertex)
            .applyMatrix4(matrix);
          point.z += 0.4;
          assert.ok(
            point.length() >= 0.4 - 1e-7,
            `${hz}Hz frame ${frame}: turn ${girl.pose.turn}, boot gap ${point.length() - 0.4}`,
          );
        }
      }
    }
    assert.ok(Math.abs(traveled - Math.PI * 2) < 0.001);
    base.update(0, true);
    const held = model.rotation.y;
    base.update(1, true);
    assert.equal(model.rotation.y, held);
    base.dispose();
  }
});

test("an interrupted playful turn recovers without snapping", () => {
  const base = createMoonBase(0.4, { seed: 123 });
  const behavior = base.userData.behavior;
  const [boy, girl] = behavior.actors;
  girl.walker.normal.copy(boy.walker.normal);
  girl.walker.mode = "hold";
  girl.walker.velocity = 0;
  girl.state = "playful";
  girl.playfulWait = true;
  girl.playVariant = 4;
  girl.playLead = 1;
  girl.since = behavior.time;
  girl.until = behavior.time + 4;
  for (let i = 0; i < 78; i++) behavior.step(1 / 60);
  assert.ok(Math.abs(girl.pose.turn) > 0.5);
  girl.state = "wander";
  girl.playfulWait = false;
  girl.until = behavior.time + 20;
  let previous = girl.pose.turn;
  for (let i = 0; i < 60; i++) {
    behavior.step(1 / 60);
    const delta = Math.atan2(
      Math.sin(girl.pose.turn - previous),
      Math.cos(girl.pose.turn - previous),
    );
    assert.ok(Math.abs(delta) <= 9 / 60 + 1e-9);
    previous = girl.pose.turn;
  }
  assert.ok(Math.abs(girl.pose.turn) < 0.001);
  base.dispose();
});

test("talking strolls include several seconds of real paired walking", () => {
  const base = createMoonBase(0.4, { seed: 123 });
  const behavior = base.userData.behavior,
    navigation = base.userData.motion;
  const [boy, girl] = behavior.actors;
  let activeSince = 0,
    startBoy = 0,
    startGirl = 0,
    gestures = 0,
    completed = 0;
  const separation = new Vector3(),
    forward = new Vector3();
  let lateralSamples = 0,
    longitudinalTotal = 0;
  for (let tick = 0; tick < 900 * 60; tick++) {
    navigation.update(1 / 60);
    if (
      girl.state === "stroll" &&
      boy.walker.velocity > 0.008 &&
      girl.walker.velocity > 0.008
    ) {
      if (!activeSince) {
        activeSince = behavior.time;
        startBoy = boy.walker.distance;
        startGirl = girl.walker.distance;
      }
      gestures += Math.max(
        boy.pose.left,
        boy.pose.right,
        girl.pose.left,
        girl.pose.right,
      );
      if (
        boy.walker.forward.dot(girl.walker.forward) > 0.9 &&
        behavior.time - activeSince > 0.5
      ) {
        separation
          .subVectors(boy.walker.normal, girl.walker.normal)
          .normalize();
        forward.copy(boy.walker.forward).add(girl.walker.forward).normalize();
        longitudinalTotal += Math.abs(separation.dot(forward));
        lateralSamples++;
      }
    } else if (activeSince && girl.state !== "stroll") {
      if (
        behavior.time - activeSince >= 2.8 &&
        boy.walker.distance - startBoy > 0.05 &&
        girl.walker.distance - startGirl > 0.05
      )
        completed++;
      activeSince = 0;
      if (completed >= 2) break;
    }
  }
  assert.ok(
    completed >= 2,
    `Expected visible, sustained strolls; started ${behavior.stats.strolls}, completed ${completed}`,
  );
  assert.ok(gestures > 3);
  assert.ok(
    lateralSamples > 60 && longitudinalTotal / lateralSamples < 0.3,
    `Stroll formation must be predominantly lateral, not single-file: samples ${lateralSamples}, longitudinal ${longitudinalTotal / lateralSamples}`,
  );
  base.dispose();
});

test("rocket attention is a short visit instead of a long multi-view routine", () => {
  const base = createMoonBase(0.4, { seed: 123 });
  const nav = base.userData.motion;
  const boy = base.userData.behavior.actors[0];
  let inspected = false;
  for (let tick = 0; tick < 900 * 60; tick++) {
    nav.update(1 / 60);
    if (boy.state === "rocket") {
      assert.ok(boy.visitDuration >= 3 && boy.visitDuration <= 5);
      assert.ok(boy.stopsRemaining <= 2);
      inspected = true;
      break;
    }
  }
  assert.ok(inspected);
  base.dispose();
});

test("the boy approaches, performs a grounded full backflip for her, and both resume", () => {
  const base = createMoonBase(0.4, { seed: 123 });
  base.setReveal(1);
  const behavior = base.userData.behavior;
  const nav = base.userData.motion;
  const [boy, girl] = behavior.actors;
  const body = base.getObjectByName("BoyAstronaut");
  const boots = base.getObjectByName("AstronautGlovesAndBoots");
  const limbs = base.getObjectByName("AstronautLimbSegments");
  const matrix = new Matrix4(),
    point = new Vector3();
  let approached = false,
    flipped = false,
    inverted = false,
    landed = false;
  let previousFlip = 0;
  for (let tick = 0; tick < 1800 * 60; tick++) {
    approached ||= boy.state === "flipApproach";
    if (boy.state === "backflip") base.update(1 / 60);
    else nav.update(1 / 60);
    if (boy.state === "backflip") {
      flipped = true;
      assert.equal(girl.state, "watchFlip");
      assert.ok(
        nav.segmentClear(girl.walker.normal, boy.walker.normal, girl.walker),
      );
      assert.ok(boy.walker.normal.angleTo(girl.walker.normal) > 0.14);
      assert.ok(boy.pose.flip >= previousFlip - 1e-9);
      previousFlip = boy.pose.flip;
      inverted ||= boy.pose.flip > 0.45 && boy.pose.flip < 0.55;
      for (const [mesh, count] of [
        [boots, 4],
        [limbs, 8],
      ]) {
        for (let part = 0; part < count; part++) {
          mesh.getMatrixAt(part, matrix);
          for (
            let vertex = 0;
            vertex < mesh.geometry.attributes.position.count;
            vertex++
          ) {
            point
              .fromBufferAttribute(mesh.geometry.attributes.position, vertex)
              .applyMatrix4(matrix);
            point.z += 0.4;
            assert.ok(
              point.length() >= 0.4 - 1e-7,
              `Part ${part} penetrated at spin ${boy.pose.flip}`,
            );
          }
        }
      }
      body.updateWorldMatrix(true, true);
      for (const mesh of [
        body.children[0],
        base.getObjectByName("BoyAstronautHead"),
      ]) {
        for (
          let vertex = 0;
          vertex < mesh.geometry.attributes.position.count;
          vertex++
        ) {
          point
            .fromBufferAttribute(mesh.geometry.attributes.position, vertex)
            .applyMatrix4(mesh.matrixWorld);
          assert.ok(point.length() >= 0.4 - 1e-7);
        }
      }
    } else if (flipped) {
      base.update(0);
      assert.equal(boy.pose.flip, 0);
      assert.equal(boy.pose.hop, 0);
      assert.equal(body.rotation.x, 0);
      assert.ok(girl.state !== "watchFlip");
      landed = true;
      break;
    }
  }
  assert.ok(
    approached && flipped && inverted && landed,
    JSON.stringify({
      approached,
      flipped,
      inverted,
      landed,
      stats: behavior.stats,
    }),
  );
  base.dispose();
});

test("reduced motion safely cancels an airborne backflip", () => {
  const base = createMoonBase(0.4, { seed: 123 });
  base.setReveal(1);
  const behavior = base.userData.behavior;
  const boy = behavior.actors[0];
  let cancelled = false;
  for (let tick = 0; tick < 1800 * 60; tick++) {
    base.userData.motion.update(1 / 60);
    if (boy.state === "backflip" && boy.pose.flip > 0.2) {
      base.update(0, true);
      assert.equal(boy.pose.flip, 0);
      assert.equal(boy.pose.flipTuck, 0);
      assert.equal(boy.pose.hop, 0);
      assert.equal(base.getObjectByName("BoyAstronaut").rotation.x, 0);
      cancelled = true;
      break;
    }
  }
  assert.ok(cancelled);
  base.dispose();
  base.dispose();
});

test("garden calls lead to a seated audience, 5�9 seconds of dancing, and visible clapping", () => {
  const saved = Math.random;
  let garden;
  try {
    Math.random = createRandom(147);
    garden = createGarden(0.4, GARDEN_SURFACE_NORMAL);
  } finally {
    Math.random = saved;
  }
  const base = createMoonBase(0.4, {
    seed: 123,
    gardenLayout: garden.userData.navigation,
    gardenInterestPoints: garden.userData.interestPoints,
  });
  base.setReveal(1);
  const nav = base.userData.motion,
    behavior = base.userData.behavior;
  let called = false,
    inspectedWhileWaiting = false,
    jogged = false,
    seated = false,
    danced = false,
    clapped = false,
    ended = false;
  const lamp = behavior.actors[1].interest.features.find(
    (feature) => feature.kind === "lamp",
  );
  let start = -1,
    duration = 0;
  const glove = base.getObjectByName("AstronautGlovesAndBoots"),
    matrix = new Matrix4();
  let minX = Infinity,
    maxX = -Infinity;
  const danceSteps = new Set();
  const point = new Vector3();
  let headMotion = 0,
    hipMotion = 0,
    shoulders = 0,
    independentHands = 0,
    alternatingFeet = 0;
  for (let i = 0; i < 1800 * 60; i++) {
    const [boy, girl] = behavior.actors;
    if (girl.state === "gardenDance") base.update(1 / 60);
    else nav.update(1 / 60);
    called ||= girl.state === "gardenCall";
    if (called && (boy.state === "travelRest" || boy.state === "sit")) {
      inspectedWhileWaiting ||= girl.state === "garden";
      jogged ||= boy.walker.velocity > boy.cruiseSpeed * 1.3;
    }
    if (girl.state === "gardenDance") {
      if (start < 0) {
        start = behavior.time;
        duration = girl.until - girl.since;
        for (let step = 0; step < girl.danceSteps.length; step++) {
          const seconds =
            girl.danceEnds[step] - (girl.danceEnds[step - 1] || 0);
          assert.ok(
            girl.danceSteps[step] === 6
              ? Math.abs(seconds - 1.25) < 0.001
              : seconds >= 0.719 && seconds <= 1.021,
          );
          if (step > 0)
            assert.notEqual(girl.danceSteps[step], girl.danceSteps[step - 1]);
          if (step > 1)
            assert.notEqual(girl.danceSteps[step], girl.danceSteps[step - 2]);
        }
        assert.ok(girl.danceSteps.filter((step) => step === 6).length <= 1);
      }
      let step = 0;
      while (step < 15 && behavior.time - girl.since >= girl.danceEnds[step])
        step++;
      danceSteps.add(girl.danceSteps[step]);
      headMotion += Math.abs(girl.pose.tilt) + Math.abs(girl.pose.nod);
      hipMotion += Math.abs(girl.pose.roll) + Math.abs(girl.pose.yaw);
      shoulders += Math.abs(girl.pose.shoulder);
      independentHands += Math.abs(girl.pose.left - girl.pose.right);
      alternatingFeet += Math.abs(
        girl.pose.danceLiftLeft - girl.pose.danceLiftRight,
      );
      // Check actual transformed boot vertices, including step transitions.
      for (const boot of [4, 6]) {
        glove.getMatrixAt(boot, matrix);
        for (
          let vertex = 0;
          vertex < glove.geometry.attributes.position.count;
          vertex++
        ) {
          point
            .fromBufferAttribute(glove.geometry.attributes.position, vertex)
            .applyMatrix4(matrix);
          point.z += 0.4;
          assert.ok(
            point.length() >= 0.4 - 1e-7,
            "Dancing boot penetrated the Moon",
          );
        }
      }
      assert.equal(boy.state, "gardenClap");
      assert.ok(
        girl.walker.normal.angleTo(lamp.normal) < 0.13,
        "Dance stays in the central lamp clearing",
      );
      seated ||= boy.pose.sit > 0.99;
      danced ||= girl.pose.dance > 0.3;
      clapped ||= boy.pose.clap > 0.9;
      glove.getMatrixAt(1, matrix);
      const x = new Vector3().setFromMatrixPosition(matrix).x;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      assert.ok(behavior.time - girl.since <= 9.3);
    } else if (start >= 0) {
      ended = true;
      break;
    }
  }
  assert.ok(
    called &&
      inspectedWhileWaiting &&
      jogged &&
      seated &&
      danced &&
      clapped &&
      ended,
    JSON.stringify({
      called,
      inspectedWhileWaiting,
      jogged,
      seated,
      danced,
      clapped,
      ended,
      stats: behavior.stats,
    }),
  );
  assert.ok(duration >= 5 && duration <= 9);
  assert.ok(maxX - minX > 0.0005, "Clapping hands must move");
  assert.ok(
    danceSteps.size >= 4,
    "One performance needs several different steps",
  );
  assert.ok(headMotion > 3 && hipMotion > 3 && shoulders > 0.03);
  assert.ok(independentHands > 5 && alternatingFeet > 0.1);
  base.dispose();
  garden.dispose();
});
