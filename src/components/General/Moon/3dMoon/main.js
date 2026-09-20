async function init3DMoon() {
  console.info("Initializing 3D moon scene...");
  try {
    await import("./scene-setup.js");
    console.info("3D moon scene module loaded successfully.");
  } catch (err) {
    console.error("Failed to setup 3dMoon", err);
  }
}

init3DMoon();
