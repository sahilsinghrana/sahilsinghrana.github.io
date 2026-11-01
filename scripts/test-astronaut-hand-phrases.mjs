import assert from "node:assert/strict";
import test from "node:test";
import { Matrix4, Vector3 } from "three";
import { createMoonBase } from "../src/components/General/Moon/3dMoon/base.js";

const channels = [
  "phraseLeft",
  "phraseRight",
  "pathLeft",
  "pathRight",
  "phraseBody",
];

test("both astronauts coordinate asymmetric hand phrases without changing their activities", () => {
  const expressive = createMoonBase(0.4, { seed: 123 });
  const quiet = createMoonBase(0.4, { seed: 123 });
  const actors = expressive.userData.behavior.actors;
  const controls = quiet.userData.behavior.actors;
  const samples = actors.map(() => ({
    asymmetric: 0,
    body: 0,
    styles: new Set(),
    states: new Set(),
  }));
  try {
    for (let frame = 0; frame < 120 * 60; frame++) {
      for (const actor of controls) actor.handPhraseAt = 1e9;
      expressive.userData.motion.update(1 / 60);
      quiet.userData.motion.update(1 / 60);
      for (const [index, actor] of actors.entries()) {
        const pose = actor.pose,
          sample = samples[index];
        for (const key of channels) assert.ok(Number.isFinite(pose[key]), key);
        assert.ok(pose.phraseLeft >= 0 && pose.phraseLeft <= 0.65);
        assert.ok(pose.phraseRight >= 0 && pose.phraseRight <= 0.65);
        if (Math.abs(pose.phraseLeft - pose.phraseRight) > 0.03) {
          sample.asymmetric++;
          sample.styles.add(actor.handPhraseStyle);
          sample.states.add(actor.state);
        }
        if (Math.abs(pose.phraseBody) > 0.001) sample.body++;
        assert.equal(actor.state, controls[index].state);
        assert.ok(
          actor.walker.normal.distanceTo(controls[index].walker.normal) < 1e-10,
        );
      }
    }
    for (const sample of samples) {
      assert.ok(sample.asymmetric > 100);
      assert.ok(sample.body > 100);
      assert.ok(sample.styles.size >= 3);
      assert.ok(sample.states.size >= 2);
    }
    assert.deepEqual(
      expressive.userData.behavior.stats,
      quiet.userData.behavior.stats,
    );
  } finally {
    expressive.dispose();
    quiet.dispose();
  }
});

test("passage yielding and reduced motion release hand phrases", () => {
  const base = createMoonBase(0.4, { seed: 123 });
  const behavior = base.userData.behavior;
  try {
    for (const actor of behavior.actors) {
      actor.pose.phraseLeft = actor.pose.phraseRight = 0.5;
      actor.walker.passageRole = "yield";
    }
    for (let frame = 0; frame < 120; frame++) behavior.step(1 / 60);
    for (const actor of behavior.actors) {
      assert.equal(actor.handPhraseAt, -1);
      for (const key of channels)
        assert.ok(Math.abs(actor.pose[key]) < 0.00001);
      actor.pose.phraseLeft = 0.5;
    }
    const time = behavior.time;
    behavior.settleMotion();
    assert.equal(behavior.time, time);
    for (const actor of behavior.actors)
      for (const key of channels) assert.equal(actor.pose[key], 0);
  } finally {
    base.dispose();
  }
});

test("conversation turns vary hand paths and transfer weight without moving destinations", () => {
  const base = createMoonBase(0.4, { seed: 123 });
  base.setReveal(1);
  const behavior = base.userData.behavior;
  const boots = base.getObjectByName("AstronautGlovesAndBoots");
  const matrix = new Matrix4(),
    point = new Vector3();
  const samples = behavior.actors.map(() => ({
    paths: new Set(),
    bends: 0,
    asymmetric: 0,
  }));
  try {
    for (let frame = 0; frame < 600 * 60; frame++) {
      const rendered = behavior.actors.some(
        (actor) => actor.state === "conversation",
      );
      if (rendered) base.update(1 / 60);
      else base.userData.motion.update(1 / 60);
      for (const [index, actor] of behavior.actors.entries()) {
        if (actor.state !== "conversation") continue;
        if (rendered) {
          for (const boot of [index * 4, index * 4 + 2]) {
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
                "conversation boot penetrated terrain",
              );
            }
          }
        }
        const p = actor.pose;
        for (const key of ["talkX", "talkY", "talkZ", "shift", "crouch"])
          assert.ok(Number.isFinite(p[key]));
        assert.ok(Math.abs(p.talkX) < 0.011);
        assert.ok(Math.abs(p.talkY) < 0.014);
        assert.ok(Math.abs(p.talkZ) < 0.01);
        assert.ok(Math.abs(p.shift) < 0.003);
        assert.ok(p.crouch >= 0 && p.crouch < 0.001);
        if (p.crouch > 0.0002) samples[index].bends++;
        if (Math.abs(p.left - p.right) > 0.1) {
          samples[index].asymmetric++;
          samples[index].paths.add(
            `${Math.round(p.talkX * 200)},${Math.round(p.talkY * 200)},${Math.round(p.talkZ * 200)}`,
          );
        }
        const other = behavior.actors[1 - index].walker;
        assert.ok(
          actor.walker.normal.angleTo(other.normal) >=
            actor.walker.radius + other.radius - 1e-8,
        );
      }
    }
    for (const sample of samples) {
      assert.ok(
        sample.paths.size >= 4,
        "both speakers use distinct hand trajectories",
      );
      assert.ok(sample.bends > 60, "weight transfers soften the knees");
      assert.ok(
        sample.asymmetric > 60,
        "the supporting hand does not mirror the lead",
      );
    }
    behavior.settleMotion();
    for (const actor of behavior.actors)
      for (const key of ["talkX", "talkY", "talkZ", "crouch"])
        assert.equal(actor.pose[key], 0);
  } finally {
    base.dispose();
  }
});
