import {
  CanvasTexture,
  DoubleSide,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  Quaternion,
  SRGBColorSpace,
  Vector3,
} from "three";

import { PLAZA_DIAMETER } from "./dimensions.js";

export const LOGO_NORMAL = new Vector3(-0.25, -0.04, 0.31).normalize();
export { TARGET_ETCHED_OPACITY } from "./motion.js";

// Keep one completed stencil, not GPU resources. Concurrent callers share
// decoding but each owns its mesh/material/texture and can dispose independently.
let cachedKey = "";
let cachedCanvas = null;
const pending = new Map();

export async function createMoonBaseLogo(imageSrc, moonRadius = 0.4, signal) {
  if (!imageSrc || signal?.aborted) return null;
  const key = `${imageSrc}::${moonRadius}`;
  if (cachedKey === key && cachedCanvas)
    return buildMeshFromCanvas(cachedCanvas, moonRadius);
  let work = pending.get(key);
  if (!work) {
    work = { controller: new AbortController(), users: 0, promise: null };
    pending.set(key, work);
    const entry = work;
    work.promise = loadStencil(imageSrc, work.controller.signal)
      .then((canvas) => {
        if (canvas && !entry.controller.signal.aborted) {
          cachedKey = key;
          cachedCanvas = canvas;
        }
        return canvas;
      })
      .finally(() => {
        if (pending.get(key) === entry) pending.delete(key);
      });
  }
  work.users++;
  let onAbort;
  try {
    const canvas = signal
      ? await Promise.race([
          work.promise,
          new Promise((resolve) => {
            onAbort = () => resolve(null);
            signal.addEventListener("abort", onAbort, { once: true });
          }),
        ])
      : await work.promise;
    return canvas && !signal?.aborted
      ? buildMeshFromCanvas(canvas, moonRadius)
      : null;
  } finally {
    signal?.removeEventListener("abort", onAbort);
    if (--work.users === 0) {
      if (pending.get(key) === work) pending.delete(key);
      work.controller.abort();
    }
  }
}

function loadStencil(imageSrc, signal) {
  return new Promise((resolve) => {
    let settled = false;
    let image = null;
    const finish = (canvas) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal.removeEventListener("abort", abort);
      if (image) image.onload = image.onerror = null;
      resolve(canvas);
    };
    const abort = () => finish(null);
    const timer = setTimeout(abort, 2000);
    signal.addEventListener("abort", abort, { once: true });
    const loaded = (source) => {
      if (settled) return;
      try {
        finish(etchImageToStencil(source));
      } catch (err) {
        console.error("Failed to render moon base logo canvas:", err);
        finish(null);
      }
    };
    const existing = document.querySelector("#profilePicContainer > img");
    // Matching CORS-mode plus successful canvas readback is the safety check.
    if (
      existing?.crossOrigin === "anonymous" &&
      existing.complete &&
      existing.naturalWidth > 0 &&
      (existing.currentSrc || existing.src) === imageSrc
    ) {
      loaded(existing);
      return;
    }
    image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => loaded(image);
    image.onerror = () => finish(null);
    image.src = imageSrc;
    if (image.complete && image.naturalWidth > 0) loaded(image);
  });
}

/**
 * Rasterizes a source image into a posterized, edge-accented stencil canvas.
 * Returns null (rather than a half-processed canvas) if the canvas is tainted,
 * so callers never silently render an unetched photo.
 */
function etchImageToStencil(img) {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;

  const center = size / 2;
  const outerRadius = size / 2 - 8;
  const innerRadius = outerRadius - 16;

  // 1. Draw source image clipped inside inner circle
  ctx.save();
  ctx.beginPath();
  ctx.arc(center, center, innerRadius, 0, Math.PI * 2);
  ctx.clip();

  const aspect =
    (img.naturalWidth || img.width || 1) /
    (img.naturalHeight || img.height || 1);
  let drawW = innerRadius * 2;
  let drawH = innerRadius * 2;
  let drawX = center - innerRadius;
  let drawY = center - innerRadius;

  if (aspect > 1) {
    drawW = innerRadius * 2 * aspect;
    drawX = center - drawW / 2;
  } else if (aspect < 1) {
    drawH = (innerRadius * 2) / aspect;
    drawY = center - drawH / 2;
  }

  ctx.drawImage(img, drawX, drawY, drawW, drawH);
  ctx.restore();

  // 2. Convert to a lunar etched stencil.
  // FIX: If getImageData throws (tainted canvas), we now bail out with
  // `null` instead of catching-and-continuing with the raw image still
  // painted on the canvas. A missing logo is far less broken-looking than
  // a faded, unprocessed profile photo pretending to be an engraving.
  let imgData;
  try {
    imgData = ctx.getImageData(0, 0, size, size);
  } catch (e) {
    console.warn(
      "Canvas is tainted (CORS) — cannot etch this image. Skipping logo rather than rendering an unprocessed photo.",
      e,
    );
    return null;
  }

  const data = imgData.data;
  const pixelCount = size * size;
  const lum = new Float32Array(pixelCount);

  // First pass: compute luminance and build a coarse histogram so we can
  // contrast-stretch against ROBUST percentiles instead of raw min/max.
  // FIX: raw min/max let a single near-black pixel (a shadow, a pupil)
  // define "0", crushing every other midtone toward black on the stretch.
  const HIST_BINS = 256;
  const hist = new Uint32Array(HIST_BINS);
  let validCount = 0;
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    if (data[i + 3] === 0) {
      lum[p] = -1; // marker for "outside/transparent"
      continue;
    }
    const l =
      (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) / 255;
    lum[p] = l;
    hist[Math.min(HIST_BINS - 1, (l * HIST_BINS) | 0)]++;
    validCount++;
  }

  // Walk the histogram to find the 3rd and 97th percentile luminance —
  // this ignores small clumps of outlier pixels instead of anchoring to them.
  const loTarget = validCount * 0.03;
  const hiTarget = validCount * 0.97;
  let running = 0;
  let loPct = 0;
  let hiPct = 1;
  for (let b = 0; b < HIST_BINS; b++) {
    running += hist[b];
    if (running >= loTarget) {
      loPct = b / HIST_BINS;
      break;
    }
  }
  running = 0;
  for (let b = 0; b < HIST_BINS; b++) {
    running += hist[b];
    if (running >= hiTarget) {
      hiPct = b / HIST_BINS;
      break;
    }
  }
  const range = Math.max(0.05, hiPct - loPct);

  // Second pass: contrast-stretch against the robust range, add a light
  // edge accent so outlines read crisply, then feather between a banded
  // (engraved-step) look and the smooth continuous value. Feathering
  // (rather than hard Math.ceil banding) avoids large solid-black fills —
  // the previous version rounded every pixel UP to the next darkest band,
  // which is what turned the whole photo into a black disc.
  const bands = 5;
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    const l = lum[p];
    if (l < 0) {
      data[i + 3] = 0;
      continue;
    }

    const stretched = Math.min(1, Math.max(0, (l - loPct) / range));
    let etch = 1 - stretched; // dark source pixels = more pigment
    etch = Math.pow(etch, 1.2);

    // Cheap edge detection: compare to right/down neighbor to emphasize outlines.
    // FIX: multiplier reduced 1.6 -> 0.45, so edges accent linework instead
    // of saturating whole regions to full opacity.
    const x = p % size;
    const y = (p / size) | 0;
    let edge = 0;
    if (x < size - 1 && y < size - 1) {
      const right = lum[p + 1];
      const down = lum[p + size];
      if (right >= 0 && down >= 0) {
        edge = Math.abs(l - right) + Math.abs(l - down);
      }
    }
    etch = Math.min(1, etch + edge * 0.45);

    if (etch < 0.08) {
      data[i + 3] = 0;
      continue;
    }

    // FIX: unbiased rounding (was Math.ceil, always rounding darker) blended
    // 60/40 with the continuous value, so shading steps are visible without
    // flattening large areas into one solid tone.
    const banded = Math.round(etch * bands) / bands;
    const shaped = banded * 0.6 + etch * 0.4;

    data[i] = 22;
    data[i + 1] = 25;
    data[i + 2] = 30;
    // Alpha ceiling kept moderate (was briefly raised to 235 — reverted,
    // since the real fix is the unbiased shading above, not more opacity).
    data[i + 3] = Math.round(Math.min(200, Math.max(0, (shaped - 0.08) * 220)));
  }

  ctx.putImageData(imgData, 0, 0);

  // 3. Stenciled mission insignia border rings
  ctx.save();
  ctx.strokeStyle = "rgba(24, 28, 34, 0.8)";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(center, center, innerRadius + 6, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = "rgba(24, 28, 34, 0.55)";
  ctx.lineWidth = 2;
  ctx.setLineDash([12, 8]);
  ctx.beginPath();
  ctx.arc(center, center, outerRadius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  return canvas;
}

/** Builds the textured, curvature-mapped mesh from a finished stencil canvas. */
function buildMeshFromCanvas(canvas, moonRadius) {
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.needsUpdate = true;

  const material = new MeshStandardMaterial({
    map: texture,
    transparent: true,
    opacity: 0, // Starts invisible; faded in during flight transition
    roughness: 0.95, // matte lunar regolith finish
    metalness: 0.05,
    side: DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
    depthWrite: false,
  });

  const logoSize = moonRadius * PLAZA_DIAMETER;
  const segments = 24;
  const geometry = new PlaneGeometry(logoSize, logoSize, segments, segments);

  const posAttr = geometry.attributes.position;
  const rSq = (moonRadius + 0.0008) * (moonRadius + 0.0008);

  for (let i = 0; i < posAttr.count; i++) {
    const vx = posAttr.getX(i);
    const vy = posAttr.getY(i);
    const dSq = vx * vx + vy * vy;
    const vz = Math.sqrt(Math.max(0, rSq - dSq)) - (moonRadius + 0.0008);
    posAttr.setZ(i, vz);
  }
  posAttr.needsUpdate = true;
  geometry.computeVertexNormals();

  const mesh = new Mesh(geometry, material);
  mesh.logoSize = logoSize;

  // Position on the side flank of the moon
  const normal = LOGO_NORMAL.clone();
  const surfacePos = normal.clone().multiplyScalar(moonRadius + 0.0008);
  mesh.position.copy(surfacePos);

  const quat = new Quaternion();
  quat.setFromUnitVectors(new Vector3(0, 0, 1), normal);
  mesh.quaternion.copy(quat);

  mesh.setOpacity = (val) => {
    material.opacity = val;
  };

  mesh.dispose = () => {
    texture.dispose();
    material.dispose();
    geometry.dispose();
  };

  return mesh;
}
