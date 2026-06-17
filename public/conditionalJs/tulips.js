/**
 * TULIP CONFIGURATION
 * Adjust these values to change the behavior of the background.
 */

// RANDOMIZATION FACTOR (Other than White)
// 0.1 = 10% Colored, 90% White.
// HIGHER (e.g., 0.5): 50% of flowers will be colored.
// LOWER (e.g., 0.01): Almost all flowers will be white.
const COLOR_RANDOMIZATION_FACTOR = 0.9;

// SPAWN RATE (Milliseconds)
// HIGHER (e.g., 1000): One tulip appears every second (Slow/Minimal).
// LOWER (e.g., 100): Ten tulips appear every second (Dense/Busy).
const SPAWN_INTERVAL_MS = 1300;

// COLORED PALETTE
const TULIP_COLORS = [
  // --- Original Colors ---
  "#FF4D4D", // Red
  "#FFB6C1", // Light Pink
  "#FF1493", // Deep Pink
  "#FFD700", // Gold/Yellow
  "#FFA500", // Orange
  "#9370DB", // Medium Purple

  // --- Classic Additions ---
  "#E60026", // Queen of Night / Deep Crimson
  "#D87093", // Pale Violet Red / Soft Magenta
  "#FF69B4", // Hot Pink
  "#F4A460", // Sandy Orange / Apricot

  "#2E0854", // Deep Velvet Purple
  "#1A001A", // Near-Black / "Queen of Night" Tulip
  "#4B0082", // Indigo / Royal Purple
  "#800020", // Burgundy / Maroon

  "#FFFDD0", // Cream
  "#FFE4E1", // Misty Rose / Blush
  "#F0E68C", // Khaki / Pale Yellow
  "#E6E6FA", // Lavender

  "#FF4500", // Orange Red (Flame tulip base)
  "#B22222", // Firebrick Red
  "#DEB887", // Burlywood / Raw Silk
  "#FF7F50", // Coral
];

const tulipContainer = document.createElement("div");
tulipContainer.id = "tulip-container";

document.body.appendChild(tulipContainer);

const TriumphTulip = `
        <svg viewBox="0 0 100 100" width="100%" height="100%">
            <path d="M50,95 Q48,70 50,55" stroke="#228B22" stroke-width="4" fill="none" />
            <path d="M50,85 Q35,75 30,50 Q45,65 50,85" fill="#228B22"/>
            <path d="M50,75 Q65,65 70,40 Q55,55 50,75" fill="#228B22"/>
            <path d="M30,55 C30,75 70,75 70,55 C70,30 60,20 50,45 C40,20 30,30 30,55 Z" fill="currentColor"/>
        </svg>
    `;

const FringedTulip = `
    <svg viewBox="0 0 100 100" width="100%" height="100%">
        <path d="M50,95 Q48,70 50,55" stroke="#228B22" stroke-width="4" fill="none" />

        <path d="M50,85 Q35,75 30,50 Q45,65 50,85" fill="#228B22"/>
        <path d="M50,75 Q65,65 70,40 Q55,55 50,75" fill="#228B22"/>

        <path d="M30,55 
                 C30,65 35,70 50,70 C65,70 70,65 70,55 
                 Q71,45 66,41 L67,37 Q60,30 57,38 L54,34 Q50,25 46,34 L43,30 Q40,30 33,37 L34,41 Q29,45 30,55 Z" 
              fill="currentColor" stroke="currentColor" stroke-width="0.5" linejoin="round"/>
    </svg>
`;

const ParrotTulip = `
    <svg viewBox="0 0 100 100" width="100%" height="100%">
        <!-- Stem -->
        <path d="M50,95 Q48,70 50,55" stroke="#228B22" stroke-width="4" fill="none" />
        <!-- Leaves -->
        <path d="M50,85 Q35,75 30,50 Q45,65 50,85" fill="#228B22"/>
        <path d="M50,75 Q65,65 70,40 Q55,55 50,75" fill="#228B22"/>

        <!-- Flower Head: PARROT VARIETY (Layered & Ruffled) -->
        <g linejoin="round">
            <!-- Back Left Petal -->
            <path d="M32,55 C25,40 38,25 46,38 C42,48 40,55 50,68 C38,68 32,62 32,55 Z" fill="currentColor" opacity="0.85"/>
            <!-- Back Right Petal -->
            <path d="M68,55 C75,40 62,25 54,38 C58,48 60,55 50,68 C62,68 68,62 68,55 Z" fill="currentColor" opacity="0.75"/>
            <!-- Front Center Ruffled Petal -->
            <path d="M35,52 Q28,48 33,40 Q40,43 45,32 Q50,42 55,30 Q60,43 67,40 Q72,48 65,52 C60,65 40,65 35,52 Z" fill="currentColor"/>
        </g>
    </svg>
`;

const LilyTulip = `
    <svg viewBox="0 0 100 100" width="100%" height="100%">
        <!-- Stem -->
        <path d="M50,95 Q48,70 50,55" stroke="#228B22" stroke-width="4" fill="none" />
        <!-- Leaves -->
        <path d="M50,85 Q35,75 30,50 Q45,65 50,85" fill="#228B22"/>
        <path d="M50,75 Q65,65 70,40 Q55,55 50,75" fill="#228B22"/>

        <!-- Flower Head: LILY-FLOWERED VARIETY (Flared & Pointed) -->
        <g linejoin="round">
            <!-- Left Flared Petal Tip -->
            <path d="M50,68 C42,65 35,55 24,42 C30,42 40,50 46,55 Z" fill="currentColor" opacity="0.9"/>
            <!-- Right Flared Petal Tip -->
            <path d="M50,68 C58,65 65,55 76,42 C70,42 60,50 54,55 Z" fill="currentColor" opacity="0.9"/>
            <!-- Main Elegant Center Body -->
            <path d="M36,55 Q36,68 50,68 Q64,68 64,55 C64,42 58,35 50,18 C42,35 36,42 36,55 Z" fill="currentColor"/>
        </g>
    </svg>
`;

const PeonyTulip = `
    <svg viewBox="0 0 100 100" width="100%" height="100%">
        <path d="M50,95 Q48,70 50,55" stroke="#228B22" stroke-width="4" fill="none" />
        <path d="M50,85 Q35,75 30,50 Q45,65 50,85" fill="#228B22"/>
        <path d="M50,75 Q65,65 70,40 Q55,55 50,75" fill="#228B22"/>

        <g linejoin="round">
            <path d="M30,52 C22,40 35,28 50,34 C65,28 78,40 70,52 C70,68 30,68 30,52 Z" fill="currentColor" opacity="0.7"/>
            
            <path d="M34,50 C28,38 42,32 50,40 C58,32 72,38 66,50 C62,62 38,62 34,50 Z" fill="currentColor" opacity="0.85"/>
            <path d="M42,56 C32,48 40,36 50,44 C60,36 68,48 58,56 C54,60 46,60 42,56 Z" fill="currentColor" opacity="0.9"/>
            
            <path d="M44,48 C44,42 47,40 50,43 C53,40 56,42 56,48 C56,53 44,53 44,48 Z" fill="currentColor"/>
        </g>
    </svg>
`;

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
  tulip.innerHTML = [
    TriumphTulip,
    FringedTulip,
    ParrotTulip,
    LilyTulip,
    LilyTulip,
    PeonyTulip,
  ][Math.floor(Math.random() * 6)];

  // 5. Memory Management: Remove from DOM after CSS animation finishes
  tulip.addEventListener("animationend", () => {
    tulip.remove();
  });

  tulipContainer.appendChild(tulip);
}

createTulip();

// Start generating
setInterval(() => {
  Array.from({ length: 20 }, (_, idx) => {
    setTimeout(createTulip, 1700 * (idx + 1));
  });
}, SPAWN_INTERVAL_MS);
