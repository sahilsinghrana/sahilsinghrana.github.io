import {
  CanvasTexture,
  Color,
  Group,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  CylinderGeometry,
  ConeGeometry,
  SphereGeometry,
  SpotLight,
  DoubleSide,
  SRGBColorSpace,
  LinearFilter,
  LinearMipmapLinearFilter,
  Matrix4,
  Quaternion,
  Vector3,
  MathUtils,
} from "three";

// Moon integration contract (unchanged):
//   const flag = createFlag();
//   moonMesh.add(flag);                       // local space, inherits rotation/scale/lighting
//   flag.update?.(performance.now());         // call every render frame
//   flag.dispose?.();                         // call before removing the moon

// ---------------------------------------------------------------------------
// Tuning constants
// ---------------------------------------------------------------------------

const FLAG_WIDTH = 0.1;
const FLAG_HEIGHT = 0.062; // slightly more flag-like aspect ratio than 1:1-ish
const FLAG_SEGMENTS_X = 20; // 16-24 range: enough resolution for soft cloth waves
const FLAG_SEGMENTS_Y = 10; // 8-14 range

const POLE_HEIGHT = 0.19;
const POLE_RADIUS = 0.0018; // substantially thinner than the cloth height
const POLE_RADIAL_SEGMENTS = 10;
const EMBED_DEPTH = 0.014; // sinks the pole base under the moon surface

// The cloth's hoist (pinned) edge sits flush against the pole's outer surface
// so there is never a visible seam, even while the free edge is waving.
const HOIST_GAP = POLE_RADIUS * 0.6; // tiny negative-ish overlap, not a visible gap

// Anchor on the moon surface (r = 0.4), matches the flag's planted position.
const ANCHOR_POSITION = { x: 0, y: 0.16, z: 0.35 };

// Orientation of the cloth around the pole axis (local Y after the surface
// frame is applied) and a small static lean so the pole doesn't look glued
// perfectly perpendicular to the ground.
const RANDOMIZE_FLAG_FACE = true;
const FLAG_FACE_YAW_OFFSET = -Math.PI / 5.5;
const FLAG_TILT_DEG = 6; // subtle physical lean, not a cartoon angle

// A gentle *static* outward billow baked into the per-frame deformation
// (see update()) instead of a rigid pitch on the whole cloth pivot. A rigid
// pitch rotates the hoist edge away from the pole's straight vertical
// surface as |y| grows, which is what caused the visible gap - this instead
// stays exactly zero at the hoist for every height and only bows the free
// edge outward, so the pole/cloth seam can never separate.
const STATIC_BILLOW = 0.006;

// Cloth deformation tuning - several small, cheap effects layered together.
const TWO_PI = Math.PI * 2;
const WAVE1_FREQ = 1.6;
const WAVE1_SPEED = 0.0026; // per millisecond
const WAVE1_AMP = 0.0042;

const WAVE2_FREQ = 3.1;
const WAVE2_SPEED = 0.0041;
const WAVE2_AMP = 0.0016;

const VERTICAL_WAVE_FREQ = 1.3;
const VERTICAL_WAVE_SPEED = 0.0019;
const VERTICAL_WAVE_AMP = 0.001;

const IRREGULARITY_AMP = 0.0006;
const IRREGULARITY_SPEED = 0.00058;

const SAG_AMOUNT = 0.0032; // gentle gravity droop toward the free edge/bottom

// Reused scratch objects so update()/createFlag() never allocate per frame.
const TMP_ANCHOR = new Vector3();
const TMP_NORMAL = new Vector3();
const TMP_WORLD_REF = new Vector3();
const TMP_TANGENT = new Vector3();
const TMP_BITANGENT = new Vector3();
const TMP_MATRIX = new Matrix4();
const TMP_FRAME_QUAT = new Quaternion();
const TMP_TILT_QUAT = new Quaternion();

// ---------------------------------------------------------------------------
// Flag artwork texture (restored: emoji-glyph tulip/sunflower with a
// deterministic vector fallback when the platform can't render emoji)
// ---------------------------------------------------------------------------

const supportsEmojiGlyphs = () => {
  try {
    const probe = document.createElement("canvas");
    probe.width = 32;
    probe.height = 32;
    const ctx = probe.getContext("2d");
    if (!ctx) return false;
    ctx.textBaseline = "top";
    ctx.font = "26px sans-serif";
    ctx.fillText("🌷", 0, 0);
    const data = ctx.getImageData(0, 0, 32, 32).data;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] !== 0) return true;
    }
    return false;
  } catch {
    return false;
  }
};

const drawFallbackFlowers = (context, cx, cy) => {
  context.fillStyle = "#2e7d32";
  context.fillRect(cx - 70, cy - 8, 4, 60);
  context.fillRect(cx + 66, cy - 8, 4, 60);

  context.fillStyle = "#e0457b";
  context.beginPath();
  context.ellipse(cx - 68 - 12, cy - 20, 14, 22, 0.4, 0, Math.PI * 2);
  context.fill();
  context.beginPath();
  context.ellipse(cx - 68 + 12, cy - 20, 14, 22, -0.4, 0, Math.PI * 2);
  context.fill();
  context.beginPath();
  context.ellipse(cx - 68, cy - 30, 14, 24, 0, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = "#f4b400";
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    context.beginPath();
    context.ellipse(
      cx + 68 + Math.cos(a) * 20,
      cy - 24 + Math.sin(a) * 20,
      10,
      5,
      a,
      0,
      Math.PI * 2,
    );
    context.fill();
  }
  context.fillStyle = "#6d4c1e";
  context.beginPath();
  context.arc(cx + 68, cy - 24, 14, 0, Math.PI * 2);
  context.fill();
};

const createEmojiTexture = () => {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 320;

  const context = canvas.getContext("2d");
  if (!context) return null;

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#f7dfc4";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = "rgba(0,0,0,0.15)";
  context.lineWidth = 4;
  context.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);

  context.textAlign = "center";
  context.textBaseline = "middle";

  if (supportsEmojiGlyphs()) {
    context.font =
      '180px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
    context.fillStyle = "#211b22";
    context.fillText("🌷 🌻", canvas.width / 2, canvas.height / 2);
  } else {
    drawFallbackFlowers(context, canvas.width / 2, canvas.height / 2);
  }

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.magFilter = LinearFilter;
  texture.generateMipmaps = true;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  return texture;
};

// ---------------------------------------------------------------------------
// Surface frame helper
// ---------------------------------------------------------------------------

// Builds a proper local orthonormal frame from a surface normal: normal is
// the "up" (pole) axis, tangent/bitangent span the cloth plane. Avoids
// fragile chained Euler rotations - this is a single basis construction.
function computeSurfaceFrameQuaternion(normal, outQuat) {
  // Pick a reference axis that's never parallel to the normal.
  if (Math.abs(normal.y) > 0.999) {
    TMP_WORLD_REF.set(1, 0, 0);
  } else {
    TMP_WORLD_REF.set(0, 1, 0);
  }
  TMP_TANGENT.crossVectors(TMP_WORLD_REF, normal).normalize();
  TMP_BITANGENT.crossVectors(normal, TMP_TANGENT).normalize();
  TMP_MATRIX.makeBasis(TMP_TANGENT, normal, TMP_BITANGENT);
  outQuat.setFromRotationMatrix(TMP_MATRIX);
  return TMP_TANGENT; // returned for the tilt axis below
}

// ---------------------------------------------------------------------------
// Main factory
// ---------------------------------------------------------------------------

export function createFlag() {
  const group = new Group();
  group.name = "LunarFlag";

  const createdGeometries = [];
  const createdMaterials = [];
  const createdTextures = [];

  // --- Pole -----------------------------------------------------------
  const poleGeometry = new CylinderGeometry(
    POLE_RADIUS,
    POLE_RADIUS,
    POLE_HEIGHT,
    POLE_RADIAL_SEGMENTS,
  );
  const poleMaterial = new MeshStandardMaterial({
    color: new Color("#c9c9cf"),
    roughness: 0.55,
    metalness: 0.35,
  });
  createdGeometries.push(poleGeometry);
  createdMaterials.push(poleMaterial);

  const pole = new Mesh(poleGeometry, poleMaterial);
  pole.castShadow = true;
  pole.receiveShadow = true;
  pole.position.y = POLE_HEIGHT / 2 - EMBED_DEPTH;
  group.add(pole);

  // --- Cloth ------------------------------------------------------------
  const clothGeometry = new PlaneGeometry(
    FLAG_WIDTH,
    FLAG_HEIGHT,
    FLAG_SEGMENTS_X,
    FLAG_SEGMENTS_Y,
  );
  createdGeometries.push(clothGeometry);

  const fabricTexture = createEmojiTexture();
  if (fabricTexture) createdTextures.push(fabricTexture);

  const clothMaterial = new MeshStandardMaterial({
    color: fabricTexture ? 0xffffff : 0xe9c6a8,
    map: fabricTexture,
    side: DoubleSide,
    roughness: 0.96,
    metalness: 0,
  });
  createdMaterials.push(clothMaterial);

  const cloth = new Mesh(clothGeometry, clothMaterial);
  cloth.castShadow = true;
  cloth.receiveShadow = true;

  const clothPivot = new Group();
  clothPivot.position.y = POLE_HEIGHT - EMBED_DEPTH;
  // Only yaw (rotation around the pole's own local Y axis) is applied here.
  // Rotating around Y preserves each hoist-edge vertex's distance from the
  // pole axis regardless of its height, so the cloth stays flush against
  // the pole at every point along the seam. A pitch/tilt on this pivot
  // would swing the hoist edge away from the pole as |y| grows - that was
  // the cause of the visible gap.
  clothPivot.rotation.y =
    FLAG_FACE_YAW_OFFSET +
    (RANDOMIZE_FLAG_FACE ? (Math.random() - 0.5) * Math.PI * 0.45 : 0);

  // Shift the cloth so its hoist edge (local x = -halfWidth in geometry
  // space) sits flush against the pole's outer surface instead of the
  // pole's centerline - this is what removes the visible gap.
  const halfWidth = FLAG_WIDTH / 2;
  const halfHeight = FLAG_HEIGHT / 2;
  cloth.position.set(POLE_RADIUS - HOIST_GAP + halfWidth, -halfHeight, 0);
  clothPivot.add(cloth);
  group.add(clothPivot);

  // A small target object the ground lamp aims at; it rides along with the
  // cloth so the light stays roughly centered on the fabric even as the
  // cloth's static yaw/pitch differs between instances.
  const lampTarget = new Group();
  lampTarget.position.set(0, 0, 0);
  cloth.add(lampTarget);

  // --- Orient the whole assembly to the lunar surface -------------------
  const anchorPoint = TMP_ANCHOR.set(
    ANCHOR_POSITION.x,
    ANCHOR_POSITION.y,
    ANCHOR_POSITION.z,
  );
  const normal = TMP_NORMAL.copy(anchorPoint).normalize();
  const tangentAxis = computeSurfaceFrameQuaternion(normal, TMP_FRAME_QUAT);
  TMP_TILT_QUAT.setFromAxisAngle(
    tangentAxis,
    MathUtils.degToRad(FLAG_TILT_DEG),
  );

  // Apply the surface frame first, then the small physical lean.
  group.quaternion.multiplyQuaternions(TMP_TILT_QUAT, TMP_FRAME_QUAT);
  group.position.copy(anchorPoint).addScaledVector(normal, -EMBED_DEPTH);

  // --- Local ground lamp --------------------------------------------------
  // A small, understated practical light near the base - not a stage
  // spotlight. Warm/neutral, short range, soft penumbra.
  //
  // Ground level (the exposed lunar surface) is local y = 0 in group space
  // (the pole's own base sits at y = -EMBED_DEPTH, its visible shaft runs
  // from y = 0 upward). The lamp's post/head/bulb below are all defined
  // upward from LAMP_BASE_Y so the fixture actually pokes out of the
  // surface instead of being buried under it.
  const LAMP_EMBED_DEPTH = 0.0025; // small embed, just enough to look planted
  const LAMP_POST_HEIGHT = 0.026;
  const LAMP_BASE_Y = -LAMP_EMBED_DEPTH;

  const lampPostGeometry = new CylinderGeometry(
    POLE_RADIUS * 1.4,
    POLE_RADIUS * 1.4,
    LAMP_POST_HEIGHT,
    6,
  );
  const lampHeadGeometry = new ConeGeometry(0.008, 0.011, 8);
  const lampBulbGeometry = new SphereGeometry(0.0038, 10, 8);
  createdGeometries.push(lampPostGeometry, lampHeadGeometry, lampBulbGeometry);

  const lampMetalMaterial = new MeshStandardMaterial({
    color: new Color("#7a7a80"),
    roughness: 0.45,
    metalness: 0.5,
  });
  const lampBulbMaterial = new MeshStandardMaterial({
    color: new Color("#fff3d6"),
    roughness: 0.5,
    metalness: 0,
    emissive: new Color("#ffdf9e"),
    emissiveIntensity: 1.4, // reads clearly as a small glowing lamp
  });
  createdMaterials.push(lampMetalMaterial, lampBulbMaterial);

  const lampPivot = new Group();
  // Planted near the pole base, slightly toward and in front of the cloth
  // so it's never hidden behind the pole from the flag's viewing side.
  lampPivot.position.set(POLE_RADIUS * 6, LAMP_BASE_Y, 0.026);
  group.add(lampPivot);

  const lampPost = new Mesh(lampPostGeometry, lampMetalMaterial);
  lampPost.position.y = LAMP_POST_HEIGHT / 2;
  lampPost.castShadow = false;
  lampPivot.add(lampPost);

  const lampHead = new Mesh(lampHeadGeometry, lampMetalMaterial);
  lampHead.position.y = LAMP_POST_HEIGHT + 0.004;
  lampHead.rotation.x = Math.PI; // cone opening faces downward/outward over the bulb
  lampPivot.add(lampHead);

  const lampBulb = new Mesh(lampBulbGeometry, lampBulbMaterial);
  lampBulb.position.y = LAMP_POST_HEIGHT - 0.001;
  lampPivot.add(lampBulb);

  const groundLamp = new SpotLight(
    0xffe0b0, // warm/neutral
    1.88, // boosted so it actually reads next to the moon's global light
    0.3, // short practical range
    Math.PI / 4.6, // wide-ish soft cone
    0.7, // soft penumbra
    1.4, // decay
  );
  groundLamp.position.y = LAMP_POST_HEIGHT + 0.002;
  groundLamp.target = lampTarget;
  groundLamp.castShadow = true;
  groundLamp.shadow.mapSize.set(256, 256);
  groundLamp.shadow.camera.near = 0.005;
  groundLamp.shadow.camera.far = 0.45;
  groundLamp.shadow.bias = -0.0015;
  lampPivot.add(groundLamp);

  // --- Cloth deformation state -------------------------------------------
  const positionAttr = clothGeometry.getAttribute("position");
  const basePositions = Float32Array.from(positionAttr.array);

  let disposed = false;

  group.update = (timeMs) => {
    if (disposed) return;
    const t = typeof timeMs === "number" ? timeMs : 0;
    const arr = positionAttr.array;
    const count = positionAttr.count;

    for (let i = 0; i < count; i++) {
      const ix = i * 3;
      const localX = basePositions[ix];
      const localY = basePositions[ix + 1];
      const localZ = basePositions[ix + 2];

      // 0 at the hoist (pole) edge, 1 at the free edge - keeps the luff pinned
      // and makes every effect below grow naturally toward the free edge.
      const hoistFactor = (localX + halfWidth) / FLAG_WIDTH;
      const verticalFactor = (localY + halfHeight) / FLAG_HEIGHT;

      const wave1 =
        Math.sin(hoistFactor * WAVE1_FREQ * TWO_PI + t * WAVE1_SPEED) *
        WAVE1_AMP *
        hoistFactor;

      const wave2 =
        Math.sin(
          hoistFactor * WAVE2_FREQ * TWO_PI +
            t * WAVE2_SPEED +
            verticalFactor * 1.7,
        ) *
        WAVE2_AMP *
        hoistFactor;

      const waveVertical =
        Math.sin(
          verticalFactor * VERTICAL_WAVE_FREQ * TWO_PI +
            t * VERTICAL_WAVE_SPEED,
        ) *
        VERTICAL_WAVE_AMP *
        hoistFactor;

      const irregularity =
        Math.sin(localX * 17.3 + localY * 11.7 + t * IRREGULARITY_SPEED) *
        IRREGULARITY_AMP *
        hoistFactor;

      const sag =
        SAG_AMOUNT *
        hoistFactor *
        hoistFactor *
        (0.4 + 0.6 * (1 - verticalFactor));

      // Static outward billow: exactly zero at the hoist for every height,
      // so it adds depth/readability without ever pulling the seam away
      // from the pole (see the note on clothPivot.rotation.y above).
      const staticBillow = STATIC_BILLOW * hoistFactor * hoistFactor;

      arr[ix] = localX;
      arr[ix + 1] = localY - sag;
      arr[ix + 2] =
        localZ + wave1 + wave2 + waveVertical + irregularity + staticBillow;
    }

    positionAttr.needsUpdate = true;
    clothGeometry.computeVertexNormals();
  };

  group.dispose = () => {
    if (disposed) return;
    disposed = true;
    for (const geo of createdGeometries) geo.dispose();
    for (const mat of createdMaterials) mat.dispose();
    for (const tex of createdTextures) tex.dispose();
    group.clear();
    group.parent?.remove(group);
  };

  return group;
}
