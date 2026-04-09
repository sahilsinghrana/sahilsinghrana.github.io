async function init3DMoon() {
  try {
    await import("./scene-setup.js");
  } catch (err) {
    console.error("Failed to setup 3dMoon", err);
  }
}

init3DMoon();
