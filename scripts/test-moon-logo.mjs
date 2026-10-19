import assert from "node:assert/strict";
import test from "node:test";
import { createMoonBaseLogo } from "../src/components/General/Moon/3dMoon/logo.js";

test("logo decoding deduplicates, cancels per owner, and bounds completed cache", async () => {
  const previous = { Image: globalThis.Image, document: globalThis.document };
  const images = [];
  const meshes = [];
  let existing = null;
  const context = new Proxy(
    {
      getImageData: () => ({ data: new Uint8ClampedArray(512 * 512 * 4) }),
    },
    { get: (target, key) => target[key] ?? (() => {}) },
  );
  try {
    globalThis.Image = class {
      constructor() {
        images.push(this);
        this.complete = false;
      }
    };
    globalThis.document = {
      querySelector: () => existing,
      createElement: () => ({ getContext: () => context }),
    };
    const first = new AbortController();
    const second = new AbortController();
    const a = createMoonBaseLogo("shared.png", 0.4, first.signal);
    const b = createMoonBaseLogo("shared.png", 0.4, second.signal);
    assert.equal(images.length, 1);
    first.abort();
    assert.equal(await a, null);
    assert.equal(
      typeof images[0].onload,
      "function",
      "other owner keeps decoding alive",
    );
    images[0].onload();
    meshes.push(await b);
    assert.ok(meshes[0]?.isMesh);
    assert.equal(images[0].onload, null);
    meshes.push(await createMoonBaseLogo("shared.png"));
    assert.equal(images.length, 1, "completed stencil is reused");
    assert.notEqual(meshes[0].material, meshes[1].material);

    existing = {
      src: "reused.png",
      crossOrigin: "anonymous",
      complete: true,
      naturalWidth: 1,
    };
    meshes.push(await createMoonBaseLogo("reused.png"));
    assert.equal(
      images.length,
      1,
      "matching CORS-safe profile avoids another request",
    );
    existing = null;
    const evicted = createMoonBaseLogo("shared.png");
    assert.equal(
      images.length,
      2,
      "only the newest completed stencil is retained",
    );
    images[1].onerror();
    assert.equal(await evicted, null);
    assert.equal(images[1].onerror, null);

    for (let i = 0; i < 10; i++) {
      const controller = new AbortController();
      const pending = createMoonBaseLogo(
        "cancelled.png",
        0.4,
        controller.signal,
      );
      const image = images.at(-1);
      controller.abort();
      assert.equal(await pending, null);
      assert.equal(image.onload, null);
      assert.equal(image.onerror, null);
    }
    existing = { src: "unsafe.png", complete: true, naturalWidth: 1 };
    const safe = createMoonBaseLogo("unsafe.png");
    assert.equal(images.at(-1).crossOrigin, "anonymous");
    images.at(-1).onerror();
    assert.equal(await safe, null);
  } finally {
    for (const mesh of meshes) {
      mesh?.geometry.dispose();
      mesh?.material.map.dispose();
      mesh?.material.dispose();
    }
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete globalThis[key];
      else globalThis[key] = value;
    }
  }
});
