export default function dateBasedClassInjector(
  day = 28,
  month = 11,
  className = "colorful",
) {
  try {
    if (!className) return;

    const body = document.body;

    const currentDate = new Date();

    const isTargetDate =
      day == currentDate.getDate() && month - 1 == currentDate.getMonth();

    if (isTargetDate && !body.classList.contains(className)) {
      body.classList.add(className);
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = `/conditionalCss/${className}.css`;
      document.head.appendChild(link);
    }

    return isTargetDate;
  } catch (err) {
    console.error(err);
  }
}

export async function dateBasedJsInjector(
  day = 28,
  month = 11,
  fileName = "tulips",
) {
  try {
    if (!fileName) return false;

    const currentDate = new Date();
    const isTargetDate =
      day === currentDate.getDate() && month - 1 === currentDate.getMonth();

    // Check if the script is already present to avoid duplicate execution
    const scriptId = `js-injector-${fileName}`;
    if (isTargetDate && !document.getElementById(scriptId)) {
      return new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.id = scriptId;
        script.type = "module";
        script.src = `/conditionalJs/${fileName}.js`;
        script.async = true;

        script.onload = () => {
          console.log(`Successfully injected: ${fileName}.js`);
          resolve(true);
        };

        script.onerror = () => {
          console.error(`Failed to load script: ${fileName}.js`);
          reject(new Error(`Load failure for ${fileName}`));
        };

        document.head.appendChild(script);
      });
    }

    return isTargetDate;
  } catch (err) {
    console.error("JS Injector Error:", err);
    return false;
  }
}
