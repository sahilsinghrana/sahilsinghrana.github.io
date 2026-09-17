import {
  CanvasTexture,
  Color,
  Group,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  CylinderGeometry,
  DoubleSide,
  SRGBColorSpace,
  LinearFilter,
  LinearMipmapLinearFilter,
  Quaternion,
  Vector3,
  MathUtils,
} from "three";

// Moon integration contract:
//   const flag = createFlag();
//   moonMesh.add(flag);                       // local space, inherits rotation/scale/lighting
//   flag.update?.(performance.now());         // call every render frame
//   flag.dispose?.();                         // call before removing the moon

const FLAG_WIDTH = 0.1;
const FLAG_HEIGHT = 0.065;
const FLAG_SEGMENTS_X = 16; // minimum practical density for readable cloth displacement
const FLAG_SEGMENTS_Y = 12;

const POLE_HEIGHT = 0.18;
const POLE_RADIUS = 0.006;
const EMBED_DEPTH = 0.015; // sinks pole base under the moon surface to avoid z-fighting

// Anchor on the moon (r ≈ 0.4), slightly below the original upper position.
// Keep this point on the sphere surface when trying alternate placements.
const ANCHOR_POSITION = { x: 0, y: 0.1, z: 0.385 };
// Set false for a consistent camera-facing flag. When true, each flag instance
// gets one random face direction around its pole while staying planted.
const RANDOMIZE_FLAG_FACE = true;
const FLAG_FACE_YAW_OFFSET = -Math.PI / 5.5; // tilt the cloth toward the default viewer
const FLAG_FACE_PITCH = -Math.PI / 14; // subtle depth cue so the emblem reads instead of lying flat
const FLAG_TILT_DEG = 8; // small off-axis lean keeps mounts from feeling rigidly computer-generated

// Waving animation tuning.
const WAVE_AMPLITUDE = 0.01;
const WAVE_SPATIAL_FREQ = 2.2;
const WAVE_SPEED = 0.0026; // per millisecond

const TEMP_ANCHOR_POINT = new Vector3();
const TEMP_ANCHOR_NORMAL = new Vector3();
const TEMP_POLE_UP = new Vector3(0, 1, 0);
const TEMP_TILT_AXIS = new Vector3(1, 0, 0);
const TEMP_QUAT = new Quaternion();

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

export function createFlag() {
  const group = new Group();
  group.name = "LunarFlag";

  const poleGeometry = new CylinderGeometry(
    POLE_RADIUS,
    POLE_RADIUS,
    POLE_HEIGHT,
    12,
  );
  const poleMaterial = new MeshStandardMaterial({
    color: new Color("#d7bd8b"),
  });
  const pole = new Mesh(poleGeometry, poleMaterial);
  pole.castShadow = true;
  pole.receiveShadow = true;
  // Sink base slightly into the surface to prevent gaps / z-fighting while keeping
  // the flag visibly planted in the terrain.
  pole.position.y = POLE_HEIGHT / 2 - EMBED_DEPTH;
  group.add(pole);

  const clothGeometry = new PlaneGeometry(
    FLAG_WIDTH,
    FLAG_HEIGHT,
    FLAG_SEGMENTS_X,
    FLAG_SEGMENTS_Y,
  );
  const texture = createEmojiTexture();
  const clothMaterial = new MeshStandardMaterial({
    color: texture ? 0xffffff : 0xe9c6a8,
    map: texture,
    side: DoubleSide,
    roughness: 0.96,
    metalness: 0,
  });
  const cloth = new Mesh(clothGeometry, clothMaterial);
  cloth.castShadow = true;
  cloth.receiveShadow = true;
  const clothPivot = new Group();
  clothPivot.position.y = POLE_HEIGHT - EMBED_DEPTH;
  // Keep the cloth in the pole's local frame so its vertical hoist edge is
  // always collinear with the pole after the moon-surface rotation is applied.
  // Bias the face toward the default viewer so the emblem is readable from the main page angle.
  clothPivot.rotation.x = FLAG_FACE_PITCH;
  clothPivot.rotation.y =
    FLAG_FACE_YAW_OFFSET +
    (RANDOMIZE_FLAG_FACE ? (Math.random() - 0.5) * Math.PI * 0.45 : 0);
  cloth.position.set(FLAG_WIDTH / 2, -FLAG_HEIGHT / 2, 0);
  clothPivot.add(cloth);
  group.add(clothPivot);

  const anchorPoint = TEMP_ANCHOR_POINT.set(
    ANCHOR_POSITION.x,
    ANCHOR_POSITION.y,
    ANCHOR_POSITION.z,
  );
  const anchorNormal = TEMP_ANCHOR_NORMAL.copy(anchorPoint).normalize();
  const poleBasis = TEMP_QUAT.setFromUnitVectors(TEMP_POLE_UP, anchorNormal);
  const tiltAxis = TEMP_TILT_AXIS.set(1, 0, 0).cross(anchorNormal).normalize();
  const tilt = new Quaternion().setFromAxisAngle(
    tiltAxis,
    MathUtils.degToRad(FLAG_TILT_DEG),
  );
  group.quaternion.copy(poleBasis).multiply(tilt);
  group.position.copy(anchorPoint).addScaledVector(anchorNormal, -EMBED_DEPTH);

  // Cache rest pose for the wave deformation.
  const positionAttr = clothGeometry.getAttribute("position");
  const basePositions = Float32Array.from(positionAttr.array);
  const halfWidth = FLAG_WIDTH / 2;

  let disposed = false;

  group.update = (timeMs) => {
    if (disposed) return;
    const t = typeof timeMs === "number" ? timeMs : 0;
    const arr = positionAttr.array;

    for (let i = 0; i < positionAttr.count; i++) {
      const ix = i * 3;
      const localX = basePositions[ix];
      const localY = basePositions[ix + 1];
      const localZ = basePositions[ix + 2];

      // 0 at the hoist (pole) edge, 1 at the free edge — keeps the luff pinned.
      const hoistFactor = (localX + halfWidth) / FLAG_WIDTH;
      const wave =
        Math.sin(
          hoistFactor * WAVE_SPATIAL_FREQ * Math.PI * 2 + t * WAVE_SPEED,
        ) *
        WAVE_AMPLITUDE *
        hoistFactor;

      arr[ix] = localX;
      arr[ix + 1] = localY;
      arr[ix + 2] = localZ + wave;
    }

    positionAttr.needsUpdate = true;
    clothGeometry.computeVertexNormals();
  };

  group.dispose = () => {
    if (disposed) return;
    disposed = true;
    poleGeometry.dispose();
    poleMaterial.dispose();
    clothGeometry.dispose();
    clothMaterial.dispose();
    texture?.dispose();
    group.clear();
  };

  return group;
}
