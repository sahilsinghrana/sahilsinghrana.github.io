import { getCurrentMoonData } from "@utils/currentMoonData";

const lunarAgePercent =
  getCurrentMoonData().lunarAgePercent?.replace("%", "") || "0";
const canvas = document.getElementById("moonPhaseCanvas");
const ctx = canvas.getContext("2d");
const moonImg = document.getElementById("moonPhaseImage");

let moonImageLoaded = moonImg.complete && moonImg.naturalWidth !== 0;

if (!moonImageLoaded) {
  moonImg.onload = () => {
    moonImageLoaded = true;
    setMoonPhase(lunarAgePercent);
  };
  moonImg.onerror = () => {
    moonImageLoaded = false;
    setMoonPhase(lunarAgePercent);
  };
} else {
  setMoonPhase(lunarAgePercent);
}

function setMoonPhase(phasePercent) {
  const radius = canvas.width / 2;
  const centerX = radius;
  const centerY = radius;
  const renderPhase = phasePercent % 100;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const isWaxing = renderPhase < 50;

  if (renderPhase === 0 || renderPhase === 100) {
    drawNewMoonPlaceholder();
    return;
  }

  if (renderPhase === 50) {
    drawFullMoonPlaceholder();
    return;
  }

  if (moonImageLoaded) {
    ctx.drawImage(moonImg, 0, 0, canvas.width, canvas.height);
  } else {
    drawFallbackMoon();
  }

  drawLitGlow(centerX, centerY, radius, isWaxing);
  drawPhaseShadow(renderPhase);
}

function drawFallbackMoon() {
  const radius = canvas.width / 2;
  const gradient = ctx.createRadialGradient(
    radius,
    radius,
    10,
    radius,
    radius,
    radius,
  );
  gradient.addColorStop(0, "#fff");
  gradient.addColorStop(1, "#ccc");

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(radius, radius, radius, 0, Math.PI * 2);
  ctx.fill();
}

function drawNewMoonPlaceholder() {
  const radius = canvas.width / 2;
  const centerX = radius;
  const centerY = radius;

  ctx.save();

  const outerGlow = ctx.createRadialGradient(
    centerX,
    centerY,
    radius * 0.9,
    centerX,
    centerY,
    radius * 1.5,
  );
  outerGlow.addColorStop(0, "rgba(255, 255, 255, 0.15)");
  outerGlow.addColorStop(0.6, "rgba(255, 255, 255, 0.05)");
  outerGlow.addColorStop(1, "rgba(255, 255, 255, 0)");

  ctx.fillStyle = outerGlow;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius * 1.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowColor = "rgba(255,255,255,0.4)";
  ctx.shadowBlur = 60;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius * 0.95, 0, Math.PI * 2);
  ctx.fillStyle = "#111";
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = "#888";
}

function drawFullMoonPlaceholder() {
  const radius = canvas.width / 2;
  const centerX = radius;
  const centerY = radius;

  ctx.save();
  const glowGradient = ctx.createRadialGradient(
    centerX,
    centerY,
    radius * 0.2,
    centerX,
    centerY,
    radius * 1.3,
  );
  glowGradient.addColorStop(0, "rgba(255, 255, 255, 0.9)");
  glowGradient.addColorStop(1, "rgba(255, 255, 255, 0)");

  ctx.fillStyle = glowGradient;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius * 1.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  const grad = ctx.createRadialGradient(
    centerX,
    centerY,
    10,
    centerX,
    centerY,
    radius,
  );
  grad.addColorStop(0, "#fff");
  grad.addColorStop(1, "#ddd");

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius * 0.95, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#fff";
  ctx.font = "18px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("🌕 Full Moon", centerX, centerY + radius + 20);
}

function drawLitGlow(centerX, centerY, radius, isWaxing) {
  ctx.save();
  const glowGradient = ctx.createRadialGradient(
    isWaxing ? centerX + radius / 2 : centerX - radius / 2,
    centerY,
    radius * 0.3,
    centerX,
    centerY,
    radius * 1.2,
  );

  glowGradient.addColorStop(0, "rgba(255,255,255,0.4)");
  glowGradient.addColorStop(1, "rgba(255,255,255,0)");

  ctx.globalCompositeOperation = "lighter";
  ctx.fillStyle = glowGradient;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius * 1.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawPhaseShadow(phasePercent) {
  const radius = canvas.width / 2;
  const centerX = radius;
  const centerY = radius;
  const phase = phasePercent % 100;

  if (phase === 0 || phase === 100 || phase === 50) return;

  const isWaxing = phase < 50;
  const visibleFraction = isWaxing ? phase / 50 : (100 - phase) / 50;

  const offset = radius * 2 * visibleFraction;
  const maskX = centerX + (isWaxing ? offset : -offset);
  const featherSize = 6;

  const shadowCanvas = document.createElement("canvas");
  shadowCanvas.width = canvas.width;
  shadowCanvas.height = canvas.height;
  const sctx = shadowCanvas.getContext("2d");

  sctx.beginPath();
  sctx.arc(centerX, centerY, radius, 0, Math.PI * 2, false);
  sctx.arc(maskX, centerY, radius, 0, Math.PI * 2, true);
  sctx.closePath();

  sctx.fillStyle = "black";
  sctx.shadowColor = "black";
  sctx.shadowBlur = featherSize;
  sctx.fill();

  ctx.save();
  ctx.globalCompositeOperation = "destination-in";
  ctx.drawImage(shadowCanvas, 0, 0);
  ctx.restore();

  ctx.save();
  ctx.globalCompositeOperation = "destination-over";
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();
}
