import assert from "node:assert/strict";
import test from "node:test";
import { Box3, Vector3 } from "three";
import {
  createGarden,
  GARDEN_SURFACE_NORMAL,
} from "../src/components/General/Moon/3dMoon/garden.js";
import { createMoonBase } from "../src/components/General/Moon/3dMoon/base.js";
import { createRandom } from "../src/components/General/Moon/3dMoon/wander.js";
import { createGardenRoutes } from "../src/components/General/Moon/3dMoon/garden-routes.js";

function gardenWithSeed(seed) {
  const previous = Math.random;
  try {
    Math.random = createRandom(seed);
    return createGarden(0.4, GARDEN_SURFACE_NORMAL);
  } finally {
    Math.random = previous;
  }
}

test("compact sunflower fits its geometry budget and exports its real focus and footprint", () => {
  for (let seed = 1; seed <= 30; seed++) {
    const garden = gardenWithSeed(seed);
    const sunflower = garden.getObjectByName("Sunflower");
    const shadow = garden.getObjectByName("SunflowerRootShadow");
    assert.equal(sunflower.children.length, 3);
    assert.equal(garden.userData.interestPoints.length, 3);
    const parts = [...sunflower.children, shadow];
    let triangles = 0;
    const materials = new Set();
    for (const mesh of parts) {
      const { geometry, material } = mesh;
      triangles += geometry.index.count / 3;
      materials.add(material);
      for (const attribute of Object.values(geometry.attributes))
        for (const value of attribute.array) assert.ok(Number.isFinite(value));
      for (const index of geometry.index.array)
        assert.ok(index < geometry.attributes.position.count);
      assert.equal(material.map, null);
      if (mesh !== shadow) {
        assert.equal(material.transparent, false);
        assert.equal(mesh.castShadow, true);
      }
    }
    assert.ok(triangles <= 600, `${triangles} triangles`);
    assert.equal(materials.size, 4);
    garden.updateMatrixWorld(true);
    const inverse = garden.matrixWorld.clone().invert();
    const bounds = new Box3().setFromObject(sunflower);
    // Transform the plant's vertices to garden-local space for dimensions.
    bounds.makeEmpty();
    for (const mesh of sunflower.children) {
      const positions = mesh.geometry.attributes.position;
      for (let i = 0; i < positions.count; i++)
        bounds.expandByPoint(
          new Vector3()
            .fromBufferAttribute(positions, i)
            .applyMatrix4(mesh.matrixWorld)
            .applyMatrix4(inverse),
        );
    }
    assert.ok(bounds.max.y - 0.004 > 0.042);
    assert.ok(bounds.max.y - 0.004 < 0.047);
    const navigation = garden.userData.navigation;
    const flower = navigation.features
      .filter((f) => f.kind === "flower")
      .at(-1);
    assert.equal(flower.radius, 0.017);
    const focus = new Vector3(0, 0.037, 0).applyMatrix4(sunflower.matrixWorld);
    assert.ok(focus.distanceTo(flower.focus) < 1e-9);
    assert.ok(
      navigation.colliders.some(
        (c) =>
          c.position.distanceTo(flower.base) < 1e-9 &&
          c.radius === flower.radius,
      ),
    );
    for (const rock of navigation.features.filter((f) => f.kind === "rock"))
      assert.ok(
        rock.base.distanceTo(flower.base) >=
          flower.radius + rock.radius + 0.0029,
      );

    const resources = new Set(parts.flatMap((m) => [m.geometry, m.material]));
    let released = 0;
    resources.forEach((r) => r.addEventListener("dispose", () => released++));
    garden.update(1000);
    garden.dispose();
    garden.dispose();
    garden.update(2000);
    assert.equal(released, resources.size);
    assert.equal(garden.children.length, 0);
  }
});

test("astronaut routes can reach the sunflower across repeatable garden layouts", () => {
  for (const seed of [1, 7, 71, 123, 147, 508]) {
    const garden = gardenWithSeed(seed);
    const base = createMoonBase(0.4, {
      seed,
      gardenInterestPoints: garden.userData.interestPoints,
      gardenLayout: garden.userData.navigation,
    });
    const navigation = base.userData.motion;
    const actor = base.userData.behavior.actors[1];
    const graph = createGardenRoutes(
      navigation,
      actor.views,
      actor.interest.normal,
      actor.walker,
    );
    const sunflower = actor.interest.features
      .filter((f) => f.kind === "flower")
      .at(-1);
    const route = new Int16Array(128);
    let reachable = false;
    for (let i = 0; i < actor.views.length; i++) {
      if (actor.views[i].feature !== sunflower) continue;
      const length = graph.plan(actor.walker.normal, i, route);
      if (!length) continue;
      let previous = actor.walker.normal;
      for (let step = 0; step < length; step++) {
        const next = graph.nodes[route[step]];
        assert.ok(navigation.segmentClear(previous, next, actor.walker));
        previous = next;
      }
      reachable = true;
    }
    assert.ok(reachable, `sunflower unreachable with seed ${seed}`);
    base.dispose();
    garden.dispose();
  }
});
