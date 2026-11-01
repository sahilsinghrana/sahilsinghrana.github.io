import assert from "node:assert/strict";
import test from "node:test";
import { createMoonBase } from "../src/components/General/Moon/3dMoon/base.js";

const channels = ["playfulSway", "playfulTilt", "playfulShoulder"];

test("an inspection yields as travel and returns to its destination before inspecting again", () => {
  const base = createMoonBase(0.4, { seed: 123 });
  try {
    const navigation = base.userData.motion;
    const actor = base.userData.behavior.actors[0];
    const target = actor.walker.normal.clone();
    actor.walker.target.copy(target);
    actor.state = "rocket";
    actor.visitUntil = actor.visitEnd = 30;
    navigation.hold(actor.walker, actor.walker.lookTarget);
    navigation.onPassageStart(actor.walker);
    assert.equal(actor.state, "yieldInspection");
    navigation.onPassageEnd(actor.walker);
    assert.equal(actor.state, "travelRocket");
    assert.equal(actor.walker.mode, "arrive");
    assert.ok(actor.walker.target.equals(target));
  } finally {
    base.dispose();
  }
});

test("playful phrases accompany walking without changing routes or activity decisions", () => {
  const animated = createMoonBase(0.4, { seed: 123 });
  const quiet = createMoonBase(0.4, { seed: 123 });
  const behavior = animated.userData.behavior;
  const reference = quiet.userData.behavior;
  reference.actors[1].nextWalkingPlayAt = Infinity;
  let movingExpressions = 0;
  let otherExpressions = 0;
  const styles = new Set();
  let previousStyle = null;
  try {
    for (let frame = 0; frame < 180 * 60; frame++) {
      const previousStart = behavior.actors[1].walkingPlayStarted;
      animated.userData.motion.update(1 / 60);
      quiet.userData.motion.update(1 / 60);
      const girl = behavior.actors[1];
      if (
        girl.walkingPlayStarted !== previousStart &&
        girl.walkingPlayDuration > 0
      ) {
        assert.notEqual(girl.walkingPlayStyle, previousStyle);
        previousStyle = girl.walkingPlayStyle;
      }
      const active = channels.some((key) => Math.abs(girl.pose[key]) > 0.0001);
      if (active && girl.walker.moving) movingExpressions++;
      if (active && girl.state !== "wander") otherExpressions++;
      if (active) styles.add(girl.walkingPlayStyle);
      for (let index = 0; index < 2; index++) {
        assert.equal(
          behavior.actors[index].state,
          reference.actors[index].state,
        );
        assert.ok(
          behavior.actors[index].walker.normal.distanceTo(
            reference.actors[index].walker.normal,
          ) < 1e-10,
        );
      }
      for (const key of channels) assert.equal(behavior.actors[0].pose[key], 0);
    }
    assert.ok(
      movingExpressions > 60,
      "expressions must be visible during travel",
    );
    assert.ok(
      otherExpressions > 60,
      "existing activities can carry expressions too",
    );
    assert.ok(
      styles.size >= 2,
      "short phrases vary instead of repeating one pose",
    );
    assert.deepEqual(behavior.stats, reference.stats);
  } finally {
    animated.dispose();
    quiet.dispose();
  }
});

test("playful overlays release on interruption and reduced motion never replays a phrase", () => {
  const base = createMoonBase(0.4, { seed: 123 });
  const behavior = base.userData.behavior;
  const girl = behavior.actors[1];
  try {
    for (let frame = 0; frame < 6 * 60; frame++)
      base.userData.motion.update(1 / 60);
    girl.walker.passageRole = "yield";
    for (let frame = 0; frame < 120; frame++) behavior.step(1 / 60);
    assert.equal(girl.walkingPlayDuration, 0);
    for (const key of channels) assert.ok(Math.abs(girl.pose[key]) < 0.00001);
    girl.walker.passageRole = null;
    girl.walkingPlayDuration = 4;
    girl.walkingPlayStarted = behavior.time;
    girl.pose.playfulSway = 0.05;
    const time = behavior.time;
    behavior.settleMotion();
    assert.equal(behavior.time, time);
    assert.equal(girl.walkingPlayDuration, 0);
    for (const key of channels) assert.equal(girl.pose[key], 0);
    assert.ok(girl.nextWalkingPlayAt >= time + 3);
  } finally {
    base.dispose();
  }
});
