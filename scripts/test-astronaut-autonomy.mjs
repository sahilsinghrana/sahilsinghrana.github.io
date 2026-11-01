import assert from "node:assert/strict";
import test from "node:test";
import { createMoonBase } from "../src/components/General/Moon/3dMoon/base.js";
import {
  createGarden,
  GARDEN_SURFACE_NORMAL,
} from "../src/components/General/Moon/3dMoon/garden.js";
import { createRandom } from "../src/components/General/Moon/3dMoon/wander.js";

test("garden journeys survive spontaneous invitations across multiple seeded sessions", () => {
  const original = Math.random;
  let garden;
  try {
    Math.random = createRandom(147);
    garden = createGarden(0.4, GARDEN_SURFACE_NORMAL);
  } finally {
    Math.random = original;
  }
  const reports = [];
  try {
    for (const seed of [123, 71, 508, 42, 901]) {
      const base = createMoonBase(0.4, {
        seed,
        gardenLayout: garden.userData.navigation,
        gardenInterestPoints: garden.userData.interestPoints,
      });
      const behavior = base.userData.behavior;
      const girl = behavior.actors[1];
      let interruptedTrips = 0;
      const social = new Set([
        "wave",
        "meeting",
        "acknowledge",
        "approach",
        "conversation",
      ]);
      for (let frame = 0; frame < 600 * 60; frame++) {
        const previous = girl.state;
        base.userData.motion.update(1 / 60);
        if (previous === "travelGarden" && social.has(girl.state))
          interruptedTrips++;
      }
      reports.push({
        seed,
        interruptedTrips,
        gardenVisits: behavior.stats.gardenVisits,
        conversations: behavior.stats.conversations,
        boyApproaches: behavior.stats.boyApproaches,
      });
      base.dispose();
    }
    console.log(JSON.stringify(reports));
    for (const report of reports) {
      assert.equal(report.interruptedTrips, 0, JSON.stringify(report));
      assert.ok(report.gardenVisits >= 2, JSON.stringify(report));
      assert.ok(report.conversations >= 2, JSON.stringify(report));
    }
    assert.ok(
      new Set(reports.map((r) => `${r.gardenVisits}:${r.conversations}`))
        .size >= 3,
    );
  } finally {
    garden.dispose();
  }
});
