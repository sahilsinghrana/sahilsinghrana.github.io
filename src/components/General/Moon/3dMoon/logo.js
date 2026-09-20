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

export const LOGO_NORMAL = new Vector3(-0.25, -0.04, 0.31).normalize();
export const TARGET_ETCHED_OPACITY = 0.72;

/**
 * Creates an etched moon-base logo stencil and projects it onto the moon mesh.
 * The logo is rendered with transparent negative space and semi-transparent charcoal
 * pigment, so craters, bumps, and lunar texture underneath remain visible.
 *
 * @param {string} imageSrc - Image URL for the profile picture
 * @param {number} moonRadius - Radius of the moon sphere (typically 0.4)
 * @returns {Promise<Mesh|null>} Three.js Mesh containing the etched insignia, or null if loading fails
 */
export function createMoonBaseLogo(imageSrc, moonRadius = 0.4) {
  return new Promise((resolve) => {
    if (!imageSrc) {
      resolve(null);
      return;
    }

    let settled = false;
    const safeResolve = (val) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(val);
    };

    // Timeout guard: never hang scene initialization if image loading stalls
    const timer = setTimeout(() => {
      safeResolve(null);
    }, 2000);

    const onImageLoaded = (img) => {
      try {
        const size = 512;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) {
          safeResolve(null);
          return;
        }

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

        // 2. Convert to lunar etched / painted stencil:
        try {
          const imgData = ctx.getImageData(0, 0, size, size);
          const data = imgData.data;

          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const a = data[i + 3];

            if (a === 0) continue;

            // Perceptual luminance
            const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

            // Darkness drives etching density: dark lines have pigment, light areas vanish
            let etch = 1 - lum;

            // Non-linear contrast curve to enhance stencil outlines
            etch = Math.pow(Math.max(0, etch), 1.35);

            if (etch < 0.12) {
              data[i + 3] = 0;
            } else {
              data[i] = 22;
              data[i + 1] = 25;
              data[i + 2] = 30;
              data[i + 3] = Math.round(
                Math.min(155, Math.max(0, (etch - 0.12) * 175)),
              );
            }
          }

          ctx.putImageData(imgData, 0, 0);
        } catch (e) {
          console.warn(
            "CORS or canvas security prevented pixel etching manipulation; falling back to direct render.",
            e,
          );
        }

        // 3. Stenciled Mission Insignia border rings
        ctx.save();
        ctx.strokeStyle = "rgba(24, 28, 34, 0.65)";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(center, center, innerRadius + 6, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = "rgba(24, 28, 34, 0.4)";
        ctx.lineWidth = 2;
        ctx.setLineDash([12, 8]);
        ctx.beginPath();
        ctx.arc(center, center, outerRadius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        // 4. Create Three.js Texture & Material
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

        // 5. Geometry & Spherical Curvature
        const logoSize = moonRadius * 0.7;
        const segments = 24;
        const geometry = new PlaneGeometry(
          logoSize,
          logoSize,
          segments,
          segments,
        );

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

        // Position on the SIDE flank of the moon
        const normal = LOGO_NORMAL.clone();
        const surfacePos = normal.clone().multiplyScalar(moonRadius + 0.0008);
        mesh.position.copy(surfacePos);

        const quat = new Quaternion();
        quat.setFromUnitVectors(new Vector3(0, 0, 1), normal);
        mesh.quaternion.copy(quat);

        mesh.setOpacity = (val) => {
          material.opacity = val;
          material.needsUpdate = true;
        };

        mesh.dispose = () => {
          texture.dispose();
          material.dispose();
          geometry.dispose();
        };

        safeResolve(mesh);
      } catch (err) {
        console.error("Failed to render moon base logo canvas:", err);
        safeResolve(null);
      }
    };

    // First try: reuse the already-loaded DOM image if available
    const domImg = document.querySelector("#profilePicContainer > img");
    if (domImg && domImg.complete && domImg.naturalWidth > 0) {
      onImageLoaded(domImg);
      return;
    }

    // Second try: load fresh Image object with correct event order
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => onImageLoaded(img);
    img.onerror = (err) => {
      console.error("Failed to load profile image for moon base logo:", err);
      safeResolve(null);
    };
    img.src = imageSrc;
    if (img.complete && img.naturalWidth > 0) {
      onImageLoaded(img);
    }
  });
}
