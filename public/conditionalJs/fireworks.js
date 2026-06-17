// 1. Setup Fullscreen Canvas
const canvas = document.createElement("canvas");
canvas.id = "fireworks-canvas";
canvas.style.position = "fixed";
canvas.style.top = "0";
canvas.style.left = "0";
canvas.style.width = "100vw";
canvas.style.height = "100vh";
canvas.style.pointerEvents = "none";
canvas.style.zIndex = "-997";
canvas.style.opacity = "0.5";
document.body.appendChild(canvas);

const ctx = canvas.getContext("2d");
let width = (canvas.width = window.innerWidth);
let height = (canvas.height = window.innerHeight);

window.addEventListener("resize", () => {
  width = canvas.width = window.innerWidth;
  height = canvas.height = window.innerHeight;
});

// 2. Pyrotechnic Configuration
const FIREWORK_COLORS = [
  // Original Palette
  "#FF3366",
  "#00FFCC",
  "#FFD700",
  "#FF5722",
  "#00E5FF",
  "#76FF03",
  "#EA80FC",
  "#FFFFFF",

  // High-Luminosity Pinks & Magentas
  "#FF007F",
  "#FF00FF",
  "#FF66CC",
  "#E0115F",

  // Electric Blues & Cyans
  "#1F51FF",
  "#0047AB",
  "#007FFF",
  "#0080FF",

  // Vivid Greens & Mints
  "#00FF00",
  "#39FF14",
  "#00FF66",
  "#107C41",

  // Deep Oranges & Electric Yellows
  "#FF6600",
  "#FF9900",
  "#FFFF00",
  "#FFCC00",

  // Violets & Purples
  "#7B00FF",
  "#9D00FF",
  "#6600FF",
  "#BF00FF",

  // Deep Crimson & Fire Reds
  "#FF0000",
  "#FF3333",
];
const SPAWN_INTERVAL_MS = 3200;
let particles = [];

// Track visual states to prevent alpha channel rounding freezes
let canvasAlpha = 1;
let isCanvasClean = true;

// 3. Offscreen Texture Cache Engine
const textureCache = {};

function preRenderParticles() {
  const allColors = [...FIREWORK_COLORS, "#FFFFFF"];

  allColors.forEach((color) => {
    const offscreen = document.createElement("canvas");
    offscreen.width = 16;
    offscreen.height = 16;
    const oCtx = offscreen.getContext("2d");

    oCtx.fillStyle = color;
    oCtx.shadowBlur = 6;
    oCtx.shadowColor = color;
    oCtx.beginPath();
    oCtx.arc(8, 8, 2, 0, Math.PI * 2);
    oCtx.fill();

    textureCache[color] = offscreen;
  });
}
preRenderParticles();

// 4. Optimized Particle Class
class Particle {
  constructor(x, y, color) {
    this.x = x;
    this.y = y;
    this.texture = textureCache[color] || textureCache["#FFFFFF"];

    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 8 + 2;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;

    this.friction = 0.94;
    this.gravity = 0.15;

    this.alpha = 1;
    this.decay = Math.random() * 0.015 + 0.015;
  }

  update() {
    this.vx *= this.friction;
    this.vy *= this.friction;
    this.vy += this.gravity;
    this.x += this.vx;
    this.y += this.vy;
    this.alpha -= this.decay;
  }

  draw() {
    ctx.globalAlpha = this.alpha;
    ctx.drawImage(this.texture, this.x - 8, this.y - 8);
  }
}

// 5. Spawner Logic
function createFirework() {
  isCanvasClean = false; // Mark canvas dirty to initiate render loops

  const x = Math.random() * width;
  const y = Math.random() * (height * 0.6);

  const isWhite = Math.random() > 0.9;
  const color = isWhite
    ? "#FFFFFF"
    : FIREWORK_COLORS[Math.floor(Math.random() * FIREWORK_COLORS.length)];

  const particleCount = Math.floor(Math.random() * 60) + 80;

  for (let i = 0; i < particleCount; i++) {
    particles.push(new Particle(x, y, color));
  }
}

// 6. Render Engine
function animate() {
  // Global trail interpolation
  ctx.globalCompositeOperation = "destination-out";
  ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
  ctx.fillRect(0, 0, width, height);

  ctx.globalCompositeOperation = "lighter";

  const activeParticles = [];

  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    p.update();

    if (p.alpha > 0) {
      p.draw();
      activeParticles.push(p);
    }
  }

  particles = activeParticles;

  // Active Particle Tracking & Smooth Element Fade Out
  if (particles.length === 0) {
    if (!isCanvasClean) {
      canvasAlpha -= 0.03; // Smoothly fade down element over ~33 frames
      if (canvasAlpha <= 0) {
        ctx.clearRect(0, 0, width, height); // Hard flush underlying pixels
        canvasAlpha = 1;
        canvas.style.opacity = "1"; // Reset element opacity transparently
        isCanvasClean = true; // Engine clean, freeze DOM styling
      } else {
        canvas.style.opacity = canvasAlpha;
      }
    }
  } else {
    // Force absolute visibility while particles are active
    canvasAlpha = 1;
    canvas.style.opacity = "1";
    isCanvasClean = false;
  }

  requestAnimationFrame(animate);
}

// 7. Initialization
setTimeout(createFirework, 100);
setTimeout(createFirework, 2500);
setTimeout(createFirework, 1500);
setTimeout(createFirework, 3800);

// setInterval(() => {
//   createFirework();
// }, SPAWN_INTERVAL_MS);

setInterval(() => {
  Array.from({ length: 5 }, (_, idx) => {
    setTimeout(
      createFirework,
      (SPAWN_INTERVAL_MS + Math.random() * 1500) * (idx + 1),
    );
  });
}, SPAWN_INTERVAL_MS);

animate();
