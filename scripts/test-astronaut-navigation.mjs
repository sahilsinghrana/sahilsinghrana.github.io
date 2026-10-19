import assert from "node:assert/strict";
import test from "node:test";
import { Vector3 } from "three";
import {
  createWalker,
  createWanderSimulation,
  createRandom,
  obstacleGap,
} from "../src/components/General/Moon/3dMoon/wander.js";
import { createMoonBase } from "../src/components/General/Moon/3dMoon/base.js";
import {
  createGarden,
  GARDEN_SURFACE_NORMAL,
} from "../src/components/General/Moon/3dMoon/garden.js";

const point = (x, y = 0) => new Vector3(x, y, 1).normalize();

test("a replaced wander destination rebuilds its validated route around the house", () => {
  const a = createWalker(point(-0.23), { speed: 0.04 });
  const obstacle = {
    name: "Habitat",
    normal: point(0),
    halfWidth: 0.08,
    halfDepth: 0.055,
    radius: 0.1,
    axisX: new Vector3(1, 0, 0),
    axisY: new Vector3(0, 1, 0),
  };
  const nav = createWanderSimulation([a], [obstacle], 1);
  assert.ok(nav.wander(a, point(0.23)));
  assert.ok(a.propRouteLength > 0);
  let arrived = false;
  for (let i = 0; i < 60 * 20; i++) {
    nav.update(1 / 60);
    assert.ok(obstacleGap(a.normal, obstacle) >= a.radius - 1e-8);
    if (a.normal.angleTo(point(0.23)) < 0.035) {
      arrived = true;
      break;
    }
  }
  assert.ok(arrived);
});

test("a blocked exit retains passage priority and clears without overlapping", () => {
  const a = createWalker(point(-0.065), { speed: 0.04 }),
    b = createWalker(point(0.008), { speed: 0.04 });
  const nav = createWanderSimulation([a, b], [], 12);
  assert.ok(nav.arrive(a, point(0.25)));
  nav.hold(b, a.normal);
  a.exiting = true;
  let passage = false,
    cleared = false;
  for (let i = 0; i < 60 * 20; i++) {
    nav.update(1 / 60);
    if (nav.passageActive) {
      passage = true;
      assert.equal(a.passageRole, "proceed");
    }
    assert.ok(a.normal.angleTo(b.normal) >= a.radius + b.radius - 1e-8);
    if (a.arrived) {
      cleared = true;
      break;
    }
  }
  assert.ok(passage);
  assert.ok(cleared);
  nav.cancelPassage();
  assert.equal(a.passageRole, null);
  assert.equal(b.passageRole, null);
});

for (const fps of [30, 60, 120])
  test(`both astronauts can leave the real flower garden at ${fps} Hz`, () => {
    const saved = Math.random;
    let garden;
    try {
      Math.random = createRandom(147);
      garden = createGarden(0.4, GARDEN_SURFACE_NORMAL);
    } finally {
      Math.random = saved;
    }
    const base = createMoonBase(0.4, {
      seed: 71,
      gardenLayout: garden.userData.navigation,
      gardenInterestPoints: garden.userData.interestPoints,
    });
    const nav = base.userData.motion,
      behavior = base.userData.behavior;
    const [boy, girl] = behavior.actors;
    const center = nav.obstacles.find((o) => o.name === "Garden").normal;
    const positions = girl.views.filter((p) =>
      nav.isStaticClear(p, boy.walker, 0),
    );
    const first = positions[0],
      second = positions.find(
        (p) => p.angleTo(first) > 0.1 && p.angleTo(first) < 0.2,
      );
    assert.ok(first && second);
    for (const [i, a] of behavior.actors.entries()) {
      a.walker.normal.copy(i ? second : first);
      a.walker.forward
        .copy(center)
        .addScaledVector(a.walker.normal, -center.dot(a.walker.normal))
        .normalize();
      nav.hold(a.walker, center);
      a.state = "garden";
      a.until = 0;
      a.stopsRemaining = 0;
      a.initial = false;
      a.nextTalkAt = a.nextInspectAt = Infinity;
    }
    const escaped = [false, false];
    for (let i = 0; i < 20 * fps; i++) {
      nav.update(1 / fps);
      for (const [j, a] of behavior.actors.entries()) {
        assert.ok(
          nav.isStaticClear(a.walker.normal, a.walker, 0),
          `${a.state} intersected a prop`,
        );
        escaped[j] ||= a.walker.normal.angleTo(center) >= 0.28;
      }
      assert.ok(
        boy.walker.normal.angleTo(girl.walker.normal) >=
          boy.walker.radius + girl.walker.radius - 1e-8,
      );
      if (escaped.every(Boolean)) break;
    }
    assert.deepEqual(
      escaped,
      [true, true],
      JSON.stringify(
        behavior.actors.map((a) => ({
          state: a.state,
          distance: a.walker.normal.angleTo(center),
        })),
      ),
    );
    base.dispose();
    garden.dispose();
  });

test("reduced motion settles full-body offsets without advancing the behavior clock", () => {
  const base = createMoonBase(0.4, { seed: 123 });
  base.setReveal(1);
  const behavior = base.userData.behavior;
  const girl = behavior.actors[1];
  girl.state = "playful";
  girl.pose.turn = 1;
  girl.pose.hop = 0.01;
  girl.pose.danceLiftLeft = 0.004;
  const time = behavior.time;
  base.update(1 / 60, true);
  assert.equal(behavior.time, time);
  for (const key of [
    "hop",
    "turn",
    "danceLiftLeft",
    "danceLiftRight",
    "flip",
    "crouch",
  ])
    assert.equal(girl.pose[key], 0, key);
  base.dispose();
});
