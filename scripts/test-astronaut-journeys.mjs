import assert from "node:assert/strict";
import test from "node:test";
import { createMoonBase } from "../src/components/General/Moon/3dMoon/base.js";
import {
  createGarden,
  GARDEN_SURFACE_NORMAL,
} from "../src/components/General/Moon/3dMoon/garden.js";
import { createRandom } from "../src/components/General/Moon/3dMoon/wander.js";

test("long journeys stay bounded while garden dances and independent visits complete", () => {
  const saved = Math.random;
  let garden;
  try {
    Math.random = createRandom(147);
    garden = createGarden(0.4, GARDEN_SURFACE_NORMAL);
  } finally {
    Math.random = saved;
  }
  try {
    for (const seed of [123, 71, 508, 42, 901]) {
      const base = createMoonBase(0.4, {
        seed,
        gardenLayout: garden.userData.navigation,
        gardenInterestPoints: garden.userData.interestPoints,
      });
      try {
        const behavior = base.userData.behavior;
        let audienceStarted = -1;
        for (let frame = 0; frame < 1800 * 30; frame++) {
          const previousGirlState = behavior.actors[1].state;
          base.userData.motion.update(1 / 30);
          const [boy, girl] = behavior.actors;
          assert.ok(
            !(
              previousGirlState.startsWith("travel") &&
              girl.state === "watchFlip"
            ),
            `seed ${seed}: a backflip must not interrupt a destination commitment`,
          );
          if (boy.state === "flipApproach")
            assert.ok(behavior.time - boy.journeyStarted < 12.21);
          if (girl.state === "watchFlip" && boy.state !== "backflip") {
            if (audienceStarted < 0) audienceStarted = behavior.time;
            assert.ok(behavior.time - audienceStarted < 6.21);
          } else audienceStarted = -1;
          for (const actor of behavior.actors) {
            if (actor.journeyStarted >= 0)
              assert.ok(
                behavior.time - actor.journeyStarted < 30.21,
                `${seed}: ${actor.state}`,
              );
            assert.ok(actor.walker.speed <= actor.cruiseSpeed * 1.96);
          }
        }
        assert.ok(
          behavior.stats.gardenPerformances >= 3,
          `seed ${seed}: dances ${behavior.stats.gardenPerformances}`,
        );
        assert.ok(behavior.stats.gardenVisits >= 8);
        assert.ok(behavior.stats.houseVisits >= 1);
        assert.ok(behavior.stats.rocketVisits >= 1);
        assert.ok(behavior.stats.backflips >= 3);
        assert.ok(behavior.stats.conversations >= 12);
        console.log(JSON.stringify({ seed, ...behavior.stats }));
      } finally {
        base.dispose();
      }
    }
  } finally {
    garden.dispose();
  }
});

test("an expired inspection cancels safely without relocating the astronaut", () => {
  const base = createMoonBase(0.4, { seed: 123 });
  try {
    const b = base.userData.behavior;
    for (let i = 0; i < 31 * 30; i++) base.userData.motion.update(1 / 30);
    const actor = b.actors[0];
    actor.state = "travelRocket";
    actor.journeyStarted = b.time - 30;
    const before = actor.walker.normal.clone();
    const previousTimeouts = b.stats.journeyTimeouts || 0;
    base.userData.motion.update(0.05);
    for (let i = 0; i < 5; i++) base.userData.motion.update(0.05);
    assert.equal(b.stats.journeyTimeouts, previousTimeouts + 1);
    assert.notEqual(actor.state, "travelRocket");
    assert.ok(before.angleTo(actor.walker.normal) < 0.02);
    assert.equal(actor.touchActive, false);
  } finally {
    base.dispose();
  }
});

// These seeds previously left the seated audience waiting 38–47 seconds.
test("seated dance preparation does not renew the audience wait indefinitely", () => {
  const saved = Math.random;
  let garden;
  try {
    Math.random = createRandom(147);
    garden = createGarden(0.4, GARDEN_SURFACE_NORMAL);
  } finally {
    Math.random = saved;
  }
  try {
    for (const seed of [508, 901]) {
      const base = createMoonBase(0.4, {
        seed,
        gardenLayout: garden.userData.navigation,
        gardenInterestPoints: garden.userData.interestPoints,
      });
      let seatedAt = -1,
        longest = 0;
      try {
        const b = base.userData.behavior;
        for (let frame = 0; frame < 1800 * 30; frame++) {
          base.userData.motion.update(1 / 30);
          if (b.actors[0].state === "sit") {
            if (seatedAt < 0) seatedAt = b.time;
            longest = Math.max(longest, b.time - seatedAt);
            assert.ok(
              b.time - seatedAt < 26.5,
              `seed ${seed}: seated ${b.time - seatedAt}`,
            );
          } else seatedAt = -1;
        }
        assert.ok(
          b.stats.gardenPerformances >= 3,
          `seed ${seed}: dances ${b.stats.gardenPerformances}`,
        );
        console.log(
          JSON.stringify({
            seed,
            longestSeat: longest,
            dances: b.stats.gardenPerformances,
          }),
        );
      } finally {
        base.dispose();
      }
    }
  } finally {
    garden.dispose();
  }
});
