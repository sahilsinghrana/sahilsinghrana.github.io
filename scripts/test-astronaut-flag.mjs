import assert from "node:assert/strict";
import test from "node:test";
import { Vector3 } from "three";
import {
  createGarden,
  GARDEN_SURFACE_NORMAL,
} from "../src/components/General/Moon/3dMoon/garden.js";
import { createMoonBase } from "../src/components/General/Moon/3dMoon/base.js";
import {
  createRandom,
  createWalker,
  createWanderSimulation,
  obstacleGap,
} from "../src/components/General/Moon/3dMoon/wander.js";

const point = (x, y = 0) => new Vector3(x, y, 1).normalize();
test("a managed walker routes around an intervening house and reaches the far side", () => {
  const walker = createWalker(point(-0.3), { speed: 0.04, boundAngle: 1.43 });
  const house = {
    normal: point(0),
    halfWidth: 0.1,
    halfDepth: 0.07,
    radius: 0.13,
    axisX: new Vector3(1, 0, 0),
    axisY: new Vector3(0, 1, 0),
  };
  const nav = createWanderSimulation([walker], [house], 123);
  walker.arrivalRadius = 0.004;
  assert.ok(nav.arrive(walker, point(0.3)));
  assert.ok(walker.propRouteLength > 0);
  for (let i = 0; i < 60 * 40 && !walker.arrived; i++) {
    nav.update(1 / 60);
    assert.ok(obstacleGap(walker.normal, house) >= walker.radius - 1e-8);
  }
  assert.ok(walker.arrived);
  assert.ok(walker.normal.angleTo(point(0.3)) < 0.005);
});

test("flag visits salute upward, sometimes bring a jogging companion, and always finish", () => {
  const savedRandom = Math.random;
  let garden;
  try {
    Math.random = createRandom(147);
    garden = createGarden(0.4, GARDEN_SURFACE_NORMAL);
  } finally {
    Math.random = savedRandom;
  }
  for (const seed of [123, 71, 508]) {
    const base = createMoonBase(0.4, {
      seed,
      gardenInterestPoints: garden.userData.interestPoints,
      gardenLayout: garden.userData.navigation,
      flagInterest: {
        base: new Vector3(0, 0.16, 0.35),
        focus: new Vector3(0.04, 0.23, 0.51),
      },
    });
    const nav = base.userData.motion,
      behavior = base.userData.behavior;
    let saluted = false,
      jogged = false,
      strolled = false;
    for (let i = 0; i < 60 * 1800; i++) {
      nav.update(1 / 60);
      const [boy, girl] = behavior.actors;
      if (girl.state === "flag") {
        assert.ok(girl.focus.length() > 1.1);
        saluted ||= girl.pose.salute > 0.8;
        assert.ok(behavior.time - girl.since < 7.3);
      }
      jogged ||=
        boy.state === "joinFlag" && boy.walker.speed > boy.cruiseSpeed * 1.2;
      if (girl.state === "stroll") {
        strolled = true;
        assert.ok(girl.until - girl.since >= 3 && girl.until - girl.since <= 5);
      }
      for (const actor of behavior.actors) {
        for (const obstacle of nav.obstacles) {
          if (obstacle.roverOnly) continue;
          assert.ok(
            obstacleGap(actor.walker.normal, obstacle) >=
              actor.walker.radius - 1e-8,
          );
        }
        assert.ok(Number.isFinite(actor.walker.normal.x));
        if (["travelFlag", "joinFlag"].includes(actor.state))
          assert.ok(behavior.time - actor.since < 60.3);
      }
    }
    assert.ok(saluted && jogged && strolled, JSON.stringify(behavior.stats));
    assert.ok(behavior.stats.boyApproaches >= 5);
    console.log("Flag/social seed", seed, JSON.stringify(behavior.stats));
    base.dispose();
  }
  garden.dispose();
});

test("close inspection endpoints can depart around houses, lamps, and flowers", () => {
  for (const kind of ["house", "lamp", "flower"]) {
    const radius = kind === "flower" ? 0.015 : 0.04;
    const obstacle =
      kind === "house"
        ? {
            normal: point(0),
            radius: 0.13,
            halfWidth: 0.1,
            halfDepth: 0.07,
            axisX: new Vector3(1, 0, 0),
            axisY: new Vector3(0, 1, 0),
          }
        : { normal: point(0), radius };
    const angle = (kind === "house" ? 0.1 : radius) + 0.035 + 0.001;
    const start = new Vector3(Math.sin(angle), 0, Math.cos(angle));
    const walker = createWalker(start, { speed: 0.04, boundAngle: 1.43 });
    const nav = createWanderSimulation([walker], [obstacle], 71);
    walker.arrivalRadius = 0.004;
    assert.ok(nav.isClear(start, walker));
    assert.ok(!nav.isStaticClear(start, walker));
    assert.ok(nav.arrive(walker, point(-0.3)), kind + " must find an exit");
    for (let i = 0; i < 60 * 45 && !walker.arrived; i++) {
      nav.update(1 / 60);
      assert.ok(obstacleGap(walker.normal, obstacle) >= walker.radius - 1e-8);
    }
    assert.ok(walker.arrived, kind + " must leave the close inspection spot");
  }
});
