// ===================== NOISE INFRASTRUCTURE =====================

// Quintic fade curve used by Perlin noise.
// Replaces the cubic 3t²-2t³ with 6t⁵-15t⁴+10t³, which has zero first AND second
// derivatives at t=0 and t=1. This eliminates the visible grid artifacts that the
// cubic curve produces by making the interpolation blend more smoothly at lattice edges.
function fade(t) {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function lerp(a, b, t) {
  return a + t * (b - a);
}

// Permutation table — a shuffled lookup of 0..255 doubled to 512 entries.
// Doubling avoids a modulo operation on every lookup: perm[X + 1] is always safe
// even when X = 255, because the table extends to index 511.
const perm = new Uint8Array(512);
const p = new Uint8Array(256);
for (let i = 0; i < 256; i++) p[i] = i;

// Fisher-Yates shuffle produces a uniformly random permutation.
for (let i = 255; i > 0; i--) {
  const j = Math.floor(Math.random() * (i + 1));
  let temp = p[i];
  p[i] = p[j];
  p[j] = temp;
}
for (let i = 0; i < 512; i++) perm[i] = p[i & 255];

// Perlin gradient function for 2D.
// hash & 7 selects one of 8 gradient directions arranged around the unit square.
// The bit tricks (h & 1, h & 2) replace a lookup table with branchless sign selection.
function grad(hash, x, y) {
  const h = hash & 7;
  const u = h < 4 ? x : y;
  const v = h < 4 ? y : x;
  return (h & 1 ? -u : u) + (h & 2 ? -v : v);
}

// Single-octave 2D Perlin noise, remapped from [-1, 1] to [0, 1].
function noise2d(x, y) {
  const X = Math.floor(x) & 255,
    Y = Math.floor(y) & 255;
  x -= Math.floor(x);
  y -= Math.floor(y);
  const u = fade(x),
    v = fade(y);
  const a = perm[X] + Y,
    b = perm[X + 1] + Y;
  return (
    lerp(
      lerp(grad(perm[a], x, y), grad(perm[b], x - 1, y), u),
      lerp(grad(perm[a + 1], x, y - 1), grad(perm[b + 1], x - 1, y - 1), u),
      v,
    ) *
      0.5 +
    0.5
  );
}

// Fractional Brownian Motion — stacks multiple noise octaves at increasing frequencies
// and decreasing amplitudes to produce a natural-looking, self-similar surface.
// lacunarity: how fast frequency grows per octave (typically ~2). HIGHER → finer detail.
// gain: how fast amplitude shrinks per octave (typically ~0.5). HIGHER → rougher surface.
// The result is normalized by the theoretical maximum amplitude so it stays in [0, 1].
function fbm(x, y, octaves, lacunarity, gain) {
  let val = 0,
    amp = 0.5,
    freq = 1,
    max = 0;
  for (let i = 0; i < octaves; i++) {
    val += noise2d(x * freq, y * freq) * amp;
    max += amp;
    amp *= gain;
    freq *= lacunarity;
  }
  return val / max;
}

// ===================== MAIN WORKER MESSAGE HANDLER =====================

self.onmessage = function (e) {
  const size = e.data.size;
  const rSize = e.data.roughSize;
  const diffuseData = new Uint8ClampedArray(size * size * 4);
  const bumpData = new Uint8ClampedArray(size * size * 4);
  const roughData = new Uint8ClampedArray(rSize * rSize * 4);

  // ===================== CRATER GENERATION =====================
  // Three tiers of craters by radius — large, medium, and micro.
  // Each crater stores:
  //   x, y  — normalized [0,1] center position on the texture.
  //   r     — influence radius in normalized texture space.
  //   d     — depth multiplier (controls how deep/prominent the crater is).
  const craters = [];
  for (let i = 0; i < 20; i++)
    craters.push({
      x: Math.random(),
      y: Math.random(),
      r: 0.03 + Math.random() * 0.08,
      d: 0.8,
    });
  for (let i = 0; i < 50; i++)
    craters.push({
      x: Math.random(),
      y: Math.random(),
      r: 0.01 + Math.random() * 0.03,
      d: 0.6,
    });
  for (let i = 0; i < 140; i++)
    craters.push({
      x: Math.random(),
      y: Math.random(),
      r: 0.002 + Math.random() * 0.01,
      d: 0.5,
    });

  // Pre-compute derived radius thresholds on each crater so they are not
  // recalculated inside the per-pixel inner loop (called millions of times).
  for (let i = 0; i < craters.length; i++) {
    const c = craters[i];
    c.r12 = c.r * 1.2; // Outer influence boundary (where the crater fades to zero).
    c.r12sq = c.r12 * c.r12; // Squared outer radius — used for fast pre-sqrt rejection.
    c.r07 = c.r * 0.7; // Inner floor boundary (deepest part of the bowl).
  }

  // ===================== SPATIAL GRID =====================
  // Without a grid, craterH iterates all 210 craters for every pixel:
  //   630 × 630 × 210 ≈ 83 million distance tests.
  //
  // The grid divides [0,1]² into GRID×GRID cells. Each crater registers itself
  // in every cell its bounding box overlaps. Each pixel then only checks the
  // craters stored in its own cell — typically 3–5 instead of 210.
  //
  // The modulo indexing in both the registration loop and the lookup handles
  // craters whose bounding boxes straddle the 0/1 wrap edge, consistent with
  // the toroidal distance correction (dx > 0.5, etc.) inside craterH.
  const GRID = 16; // 16×16 = 256 cells; each cell covers 1/16 ≈ 6.25% of texture space.
  const grid = Array.from({ length: GRID * GRID }, () => []);

  for (let i = 0; i < craters.length; i++) {
    const c = craters[i];
    // Convert the crater's [0,1] bounding box to grid cell indices.
    // Using floor on both ends ensures partially covered cells are included.
    const x0 = Math.floor((c.x - c.r12) * GRID);
    const x1 = Math.floor((c.x + c.r12) * GRID);
    const y0 = Math.floor((c.y - c.r12) * GRID);
    const y1 = Math.floor((c.y + c.r12) * GRID);
    for (let gy = y0; gy <= y1; gy++) {
      for (let gx = x0; gx <= x1; gx++) {
        // ((n % GRID) + GRID) % GRID safely wraps negative indices.
        const cell =
          (((gy % GRID) + GRID) % GRID) * GRID + (((gx % GRID) + GRID) % GRID);
        grid[cell].push(i);
      }
    }
  }

  // ===================== CRATER HEIGHT FUNCTION =====================
  // Returns the combined height displacement [typically negative in bowl, positive on rim]
  // contributed by all craters that influence the point (nx, ny) in [0,1]² space.
  //
  // The profile per crater has three zones:
  //   t < 0.7   → parabolic bowl (depression)
  //   0.7–1.0   → linear rim rise (ejecta wall)
  //   1.0–1.2   → linear fade back to zero (outer falloff)
  function craterH(nx, ny) {
    // Look up only the craters registered to this pixel's grid cell.
    const cell =
      (Math.floor(ny * GRID) % GRID) * GRID + (Math.floor(nx * GRID) % GRID);
    const candidates = grid[cell];

    let h = 0;
    for (let k = 0; k < candidates.length; k++) {
      const c = craters[candidates[k]];
      let dx = nx - c.x;
      let dy = ny - c.y;

      // Toroidal (wrap-around) distance correction.
      // Ensures craters near the 0/1 texture edge correctly influence pixels on the
      // opposite edge, matching the tiled nature of the UV-mapped sphere texture.
      if (dx > 0.5) dx -= 1;
      else if (dx < -0.5) dx += 1;
      if (dy > 0.5) dy -= 1;
      else if (dy < -0.5) dy += 1;

      const distSq = dx * dx + dy * dy;

      // Squared-distance early rejection avoids Math.sqrt for candidates that are
      // clearly outside the influence radius — the most common case even with the grid.
      if (distSq >= c.r12sq) continue;

      const dist = Math.sqrt(distSq);
      const t = dist / c.r;

      if (t < 0.7) {
        const t07 = t / 0.7; // Cached — used twice in this branch.
        h += -c.d * (1 - t07 * t07) * 0.7;
      } else if (t < 1.0) {
        h += ((t - 0.7) / 0.3) * c.d * 0.3;
      } else {
        h += ((1.2 - t) / 0.2) * c.d * 0.1;
      }
    }
    return h;
  }

  // ===================== TEXTURE GENERATION =====================
  // Diffuse and bump share the same pixel loop to avoid computing craterH twice
  // per pixel and to keep both passes in CPU cache at the same time.
  for (let j = 0; j < size; j++) {
    for (let i = 0; i < size; i++) {
      const nx = i / size,
        ny = j / size;
      const cr = craterH(nx, ny);
      const idx = (j * size + i) * 4;

      // --- Diffuse (albedo) ---
      // Low-frequency macro variation gives broad light/dark maria regions.
      // Crater contribution shifts those regions darker at impact sites.
      const d_macro = fbm(nx * 3, ny * 3, 3, 2.1, 0.5);
      const d_clamped = Math.max(
        0,
        Math.min(1, (d_macro * 0.45 + cr * 0.5) * 0.8 + 0.35),
      );
      const gray = 80 + d_clamped * 110; // Maps [0,1] to the lunar gray range [80, 190].
      diffuseData[idx] = diffuseData[idx + 1] = diffuseData[idx + 2] = gray;
      diffuseData[idx + 3] = 255;

      // --- Bump ---
      // Higher frequency (6×) and more octaves (4) than diffuse to capture fine surface
      // detail like micro-ridges and pitting without affecting the broader color regions.
      const b_val = Math.max(
        0,
        Math.min(
          255,
          ((fbm(nx * 6, ny * 6, 4, 2.1, 0.5) * 0.5 + cr * 0.6) * 0.6 + 0.45) *
            255,
        ),
      );
      bumpData[idx] = bumpData[idx + 1] = bumpData[idx + 2] = b_val;
      bumpData[idx + 3] = 255;
    }
  }

  // --- Roughness ---
  // Pure random noise: the moon surface has no large-scale specular variation,
  // just micro-scale texture. A uniform random field achieves this without any
  // noise function overhead. The range 180–229 keeps roughness high (non-shiny)
  // while introducing just enough micro-variation to break up specular uniformity.
  for (let i = 0; i < roughData.length; i += 4) {
    const v = 180 + Math.floor(Math.random() * 50);
    roughData[i] = roughData[i + 1] = roughData[i + 2] = v;
    roughData[i + 3] = 255;
  }

  // Transfer ownership of the underlying ArrayBuffers to the main thread instead of
  // copying them. After this call, diffuseData/bumpData/roughData are neutered (zero-length)
  // in the worker — the main thread now owns the memory, with no copy overhead.
  self.postMessage(
    {
      diffuse: diffuseData.buffer,
      bump: bumpData.buffer,
      rough: roughData.buffer,
    },
    [diffuseData.buffer, bumpData.buffer, roughData.buffer],
  );
};
