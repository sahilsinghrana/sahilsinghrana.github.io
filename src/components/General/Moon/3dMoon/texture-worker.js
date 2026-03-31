function fade(t) {
  return t * t * t * (t * (t * 6 - 15) + 10);
}
function lerp(a, b, t) {
  return a + t * (b - a);
}

const perm = new Uint8Array(512);
const p = new Uint8Array(256);
for (let i = 0; i < 256; i++) p[i] = i;
for (let i = 255; i > 0; i--) {
  const j = Math.floor(Math.random() * (i + 1));
  let temp = p[i];
  p[i] = p[j];
  p[j] = temp;
}
for (let i = 0; i < 512; i++) perm[i] = p[i & 255];

function grad(hash, x, y) {
  const h = hash & 7;
  const u = h < 4 ? x : y;
  const v = h < 4 ? y : x;
  return (h & 1 ? -u : u) + (h & 2 ? -v : v);
}

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

self.onmessage = function (e) {
  const size = e.data.size;
  const rSize = e.data.roughSize;
  const diffuseData = new Uint8ClampedArray(size * size * 4);
  const bumpData = new Uint8ClampedArray(size * size * 4);
  const roughData = new Uint8ClampedArray(rSize * rSize * 4);

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

  function craterH(nx, ny) {
    let h = 0;
    for (let i = 0; i < craters.length; i++) {
      let dx = nx - craters[i].x,
        dy = ny - craters[i].y;
      if (dx > 0.5) dx -= 1;
      else if (dx < -0.5) dx += 1;
      if (dy > 0.5) dy -= 1;
      else if (dy < -0.5) dy += 1;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const t = dist / craters[i].r;
      if (t < 1.2) {
        h +=
          t < 0.7
            ? -craters[i].d * (1 - (t / 0.7) * (t / 0.7)) * 0.7
            : t < 1.0
              ? ((t - 0.7) / 0.3) * craters[i].d * 0.3
              : ((1.2 - t) / 0.2) * craters[i].d * 0.1;
      }
    }
    return h;
  }

  for (let j = 0; j < size; j++) {
    for (let i = 0; i < size; i++) {
      const nx = i / size,
        ny = j / size;
      const cr = craterH(nx, ny);
      const idx = (j * size + i) * 4;
      const d_macro = fbm(nx * 3, ny * 3, 3, 2.1, 0.5);
      const d_clamped = Math.max(
        0,
        Math.min(1, (d_macro * 0.45 + cr * 0.5) * 0.8 + 0.35),
      );
      const gray = 80 + d_clamped * 110;
      diffuseData[idx] = diffuseData[idx + 1] = diffuseData[idx + 2] = gray;
      diffuseData[idx + 3] = 255;

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
  for (let i = 0; i < roughData.length; i += 4) {
    const v = 180 + Math.floor(Math.random() * 50);
    roughData[i] = roughData[i + 1] = roughData[i + 2] = v;
    roughData[i + 3] = 255;
  }

  self.postMessage(
    {
      diffuse: diffuseData.buffer,
      bump: bumpData.buffer,
      rough: roughData.buffer,
    },
    [diffuseData.buffer, bumpData.buffer, roughData.buffer],
  );
};
