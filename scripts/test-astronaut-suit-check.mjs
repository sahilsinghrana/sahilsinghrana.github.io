import assert from "node:assert/strict";
import test from "node:test";
import { createMoonBase } from "../src/components/General/Moon/3dMoon/base.js";

test("both astronauts use quiet suit checks and scenic glances without changing activity choices", () => {
  const base = createMoonBase(0.4, { seed: 123 });
  const control = createMoonBase(0.4, { seed: 123 });
  const actors = base.userData.behavior.actors;
  const seen = [0, 0];
  const viewSeen = [0, 0];
  const wasMoving = [false, false];
  try {
    for (let frame = 0; frame < 600 * 30; frame++) {
      for (const actor of control.userData.behavior.actors) {
        actor.nextSuitCheckAt = Infinity;
        actor.nextViewAt = Infinity;
      }
      base.userData.motion.update(1 / 30);
      control.userData.motion.update(1 / 30);
      actors.forEach((actor, i) => {
        for (const key of ["suitCheck", "suitLook", "suitStroke"]) {
          assert.ok(Number.isFinite(actor.pose[key]), key);
          assert.ok(actor.pose[key] >= 0 && actor.pose[key] <= 1, key);
        }
        assert.ok(actor.pose.suitCheck >= 0 && actor.pose.suitCheck <= 1);
        if (actor.pose.suitCheck > 0.2) seen[i]++;
        assert.ok(Number.isFinite(actor.pose.viewYaw));
        assert.ok(Math.abs(actor.pose.viewYaw) <= 0.28);
        assert.ok(Math.abs(actor.pose.viewBody) <= 0.045);
        if (Math.abs(actor.pose.viewYaw) > 0.08) viewSeen[i]++;
        if (actor.pose.suitCheck > 0.1)
          assert.ok(Math.abs(actor.pose.viewYaw) < 0.01);
        const other = control.userData.behavior.actors[i];
        assert.equal(actor.state, other.state);
        assert.ok(actor.walker.normal.distanceTo(other.walker.normal) < 1e-10);
        if (actor.walker.moving && wasMoving[i])
          assert.equal(actor.suitCheckStarted, -100);
        wasMoving[i] = actor.walker.moving;
      });
    }
    assert.ok(
      seen.every((n) => n > 10),
      JSON.stringify(seen),
    );
    assert.ok(
      viewSeen.every((n) => n > 10),
      JSON.stringify(viewSeen),
    );
    base.userData.behavior.settleMotion();
    for (const actor of actors) {
      assert.equal(actor.pose.suitCheck, 0);
      assert.equal(actor.suitCheckStarted, -100);
    }
  } finally {
    base.dispose();
    control.dispose();
  }
});
