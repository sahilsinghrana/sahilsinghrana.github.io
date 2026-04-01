/**
 * TULIP CONFIGURATION
 * Adjust these values to change the behavior of the background.
 */

// RANDOMIZATION FACTOR (Other than White)
// 0.1 = 10% Colored, 90% White.
// HIGHER (e.g., 0.5): 50% of flowers will be colored.
// LOWER (e.g., 0.01): Almost all flowers will be white.
const COLOR_RANDOMIZATION_FACTOR = 0.1;

// SPAWN RATE (Milliseconds)
// HIGHER (e.g., 1000): One tulip appears every second (Slow/Minimal).
// LOWER (e.g., 100): Ten tulips appear every second (Dense/Busy).
const SPAWN_INTERVAL_MS = 2700;

// COLORED PALETTE
// Add or remove hex codes here to change the variety of colored tulips.
const TULIP_COLORS = [
  "#FF4D4D",
  "#FFB6C1",
  "#FF1493",
  "#FFD700",
  "#FFA500",
  "#9370DB",
];

const tulipContainer = document.createElement("div");
tulipContainer.id = "tulip-container";

document.body.appendChild(tulipContainer);

function createTulip() {
  if (!tulipContainer) return;

  const tulip = document.createElement("div");
  tulip.className = "tulip";

  // 1. Color Logic: Determine if White or Colored
  const isWhite = Math.random() > COLOR_RANDOMIZATION_FACTOR;
  tulip.style.color = isWhite
    ? "#FFFFFF"
    : TULIP_COLORS[Math.floor(Math.random() * TULIP_COLORS.length)];

  // 2. Position Logic: Random X and Y coords
  const xPos = Math.random() * 100;
  const yPos = Math.random() * 100;
  tulip.style.left = `${xPos}vw`;
  tulip.style.top = `${yPos}vh`;

  // 3. Scaling Logic: Randomizes size (0.5x to 1.8x)
  const randomScale = Math.random() * 1.1 + 0.5;
  tulip.style.width = `${40 * randomScale}px`;
  tulip.style.height = `${40 * randomScale}px`;

  // 4. SVG Injection
  tulip.innerHTML = `
        <svg viewBox="0 0 100 100" width="100%" height="100%">
            <path d="M50,95 Q48,70 50,55" stroke="#228B22" stroke-width="4" fill="none" />
            <path d="M50,85 Q35,75 30,50 Q45,65 50,85" fill="#228B22"/>
            <path d="M50,75 Q65,65 70,40 Q55,55 50,75" fill="#228B22"/>
            <path d="M30,55 C30,75 70,75 70,55 C70,30 60,20 50,45 C40,20 30,30 30,55 Z" fill="currentColor"/>
        </svg>
    `;

  // 5. Memory Management: Remove from DOM after CSS animation finishes
  tulip.addEventListener("animationend", () => {
    tulip.remove();
  });

  tulipContainer.appendChild(tulip);
}

// Start generating
setInterval(createTulip, SPAWN_INTERVAL_MS);
