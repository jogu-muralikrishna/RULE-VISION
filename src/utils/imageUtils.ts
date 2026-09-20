import { ImageQualityReport, PackagingGeometry } from '../types';

/**
 * Calculates high-frequency edge variance (Laplacian proxy) to assess image blur.
 */
function calculateEdgeSharpness(data: Uint8ClampedArray, width: number, height: number): number {
  let edgeSum = 0;
  let count = 0;

  // Sample a central grid to compute horizontal and vertical gradient differences
  const step = Math.max(1, Math.floor(width / 120));
  for (let y = 1; y < height - 1; y += step) {
    for (let x = 1; x < width - 1; x += step) {
      const idx = (y * width + x) * 4;
      const left = ((y * width + (x - 1)) * 4);
      const right = ((y * width + (x + 1)) * 4);
      const top = (((y - 1) * width + x) * 4);
      const bottom = (((y + 1) * width + x) * 4);

      const lumCenter = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
      const lumLeft = 0.299 * data[left] + 0.587 * data[left + 1] + 0.114 * data[left + 2];
      const lumRight = 0.299 * data[right] + 0.587 * data[right + 1] + 0.114 * data[right + 2];
      const lumTop = 0.299 * data[top] + 0.587 * data[top + 1] + 0.114 * data[top + 2];
      const lumBottom = 0.299 * data[bottom] + 0.587 * data[bottom + 1] + 0.114 * data[bottom + 2];

      const dx = Math.abs(lumRight - lumLeft);
      const dy = Math.abs(lumBottom - lumTop);
      const grad = dx + dy;

      edgeSum += grad;
      count++;
    }
  }

  return count > 0 ? (edgeSum / count) : 50;
}

/**
 * Detects packaging surface geometry (flat, cylindrical bottle, curved pouch, etc.)
 * based on aspect ratio and horizontal luminance shading curves.
 */
function inferPackagingGeometry(
  imgWidth: number,
  imgHeight: number,
  data: Uint8ClampedArray,
  sampleWidth: number,
  sampleHeight: number
): { geometry: PackagingGeometry; description: string } {
  const aspect = imgHeight / imgWidth;

  // Measure horizontal luminance variation across middle third
  let middleLum = 0;
  let edgeLum = 0;
  let midSamples = 0;
  let edgeSamples = 0;

  const midYStart = Math.floor(sampleHeight * 0.35);
  const midYEnd = Math.floor(sampleHeight * 0.65);

  for (let y = midYStart; y < midYEnd; y += 2) {
    for (let x = 0; x < sampleWidth; x += 2) {
      const idx = (y * sampleWidth + x) * 4;
      const lum = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
      if (x > sampleWidth * 0.3 && x < sampleWidth * 0.7) {
        middleLum += lum;
        midSamples++;
      } else {
        edgeLum += lum;
        edgeSamples++;
      }
    }
  }

  const avgMid = midSamples > 0 ? middleLum / midSamples : 128;
  const avgEdge = edgeSamples > 0 ? edgeLum / edgeSamples : 128;
  const horizontalFalloff = Math.abs(avgMid - avgEdge);

  if (aspect > 1.6 && horizontalFalloff > 18) {
    return {
      geometry: 'cylindrical',
      description: 'Cylindrical Packaging (Bottle / Can) — Radial perspective distortion detected near edges. Multi-angle capture recommended.'
    };
  }

  if (aspect > 1.3 && horizontalFalloff > 12) {
    return {
      geometry: 'curved',
      description: 'Curved Container / Jar — Curvature detected across label panel.'
    };
  }

  if (aspect > 1.1 && horizontalFalloff < 10) {
    return {
      geometry: 'pouch',
      description: 'Flexible Pouch / Packet — Irregular surface boundaries detected.'
    };
  }

  return {
    geometry: 'flat',
    description: 'Standard Flat Surface (Box / Carton / Rectangular Label).'
  };
}

/**
 * Comprehensive evaluation of image usability, sharpness, lighting, glare, and packaging geometry.
 */
export async function analyzeImageQuality(fileOrDataUrl: File | string): Promise<ImageQualityReport> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      const width = img.naturalWidth || img.width;
      const height = img.naturalHeight || img.height;

      const isLowResolution = width < 480 || height < 480;

      // Sample pixels on canvas
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const sampleW = 120;
      const sampleH = Math.max(80, Math.floor(sampleW * (height / width)));
      canvas.width = sampleW;
      canvas.height = sampleH;

      let avgBrightness = 128;
      let sharpnessScore = 50;
      let glarePixelCount = 0;
      let geometryInfo = {
        geometry: 'flat' as PackagingGeometry,
        description: 'Standard Flat Packaging'
      };

      if (ctx) {
        ctx.drawImage(img, 0, 0, sampleW, sampleH);
        try {
          const imgData = ctx.getImageData(0, 0, sampleW, sampleH);
          const data = imgData.data;
          let totalLuminance = 0;
          const totalPixels = data.length / 4;

          for (let i = 0; i < data.length; i += 4) {
            const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
            totalLuminance += lum;
            if (lum > 242) {
              glarePixelCount++;
            }
          }
          avgBrightness = totalLuminance / totalPixels;

          sharpnessScore = calculateEdgeSharpness(data, sampleW, sampleH);
          geometryInfo = inferPackagingGeometry(width, height, data, sampleW, sampleH);
        } catch (e) {
          avgBrightness = 128;
        }
      }

      const isTooDark = avgBrightness < 45;
      const isTooBright = avgBrightness > 230;
      const isBlurry = sharpnessScore < 14;
      const glareDetected = (glarePixelCount / ((sampleW * sampleH) || 1)) > 0.08;
      const severePerspective = (width / height > 2.8) || (height / width > 3.2);

      const qualityIssues: string[] = [];
      if (isLowResolution) {
        qualityIssues.push(`Low resolution (${width}×${height}px) — fine statutory declarations may be illegible.`);
      }
      if (isBlurry) {
        qualityIssues.push('Motion blur or camera defocus detected — label text may be unclear.');
      }
      if (isTooDark) {
        qualityIssues.push('Underexposed / low lighting — declarations in shaded areas may be missed.');
      }
      if (isTooBright || glareDetected) {
        qualityIssues.push('High specular glare / reflection detected on packaging surface.');
      }
      if (severePerspective) {
        qualityIssues.push('Extreme perspective angle detected — text appears skewed or foreshortened.');
      }

      const isValid = !isBlurry && !isTooDark && !isLowResolution;
      const warningMessage = qualityIssues.length > 0 ? qualityIssues.join(' ') : null;

      resolve({
        isValid,
        width,
        height,
        isLowResolution,
        isTooDark,
        isTooBright,
        blurScore: Math.round(sharpnessScore),
        isBlurry,
        glareDetected,
        severePerspective,
        packagingGeometry: geometryInfo.geometry,
        geometryDescription: geometryInfo.description,
        warningMessage,
        qualityIssues
      });
    };

    img.onerror = () => {
      resolve({
        isValid: false,
        width: 0,
        height: 0,
        isLowResolution: true,
        isTooDark: false,
        isTooBright: false,
        warningMessage: 'Invalid image format or unreadable file.',
        qualityIssues: ['Unreadable file format']
      });
    };

    if (typeof fileOrDataUrl === 'string') {
      img.src = fileOrDataUrl;
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(fileOrDataUrl);
    }
  });
}

/**
 * Rotates an image Data URL by 90-degree increments
 */
export async function rotateImage(dataUrl: string, degrees: number = 90): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(dataUrl);

      if (degrees === 90 || degrees === 270) {
        canvas.width = img.height;
        canvas.height = img.width;
      } else {
        canvas.width = img.width;
        canvas.height = img.height;
      }

      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((degrees * Math.PI) / 180);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);

      resolve(canvas.toDataURL('image/jpeg', 0.92));
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}

/**
 * Adjusts contrast and brightness on an image canvas
 */
export async function enhanceImageContrast(dataUrl: string, contrastPercent: number = 115): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(dataUrl);

      canvas.width = img.width;
      canvas.height = img.height;

      // Apply CSS filter on context
      ctx.filter = `contrast(${contrastPercent}%) brightness(105%)`;
      ctx.drawImage(img, 0, 0);

      resolve(canvas.toDataURL('image/jpeg', 0.92));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

/**
 * Cylindrical & Perspective Dewarping for curved pouches, cans and bottle packaging.
 * Compensates for radial distortion on curved cylindrical surfaces.
 */
export async function dewarpPackageImage(dataUrl: string, curvatureFactor: number = 0.12): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(dataUrl);

      const w = img.width;
      const h = img.height;
      canvas.width = w;
      canvas.height = h;

      // Slice the image into vertical strips and apply inverse cylindrical transformation
      const slices = Math.min(100, Math.floor(w / 4));
      const sliceWidth = w / slices;

      for (let i = 0; i < slices; i++) {
        const sx = i * sliceWidth;
        const normalizedX = (sx - w / 2) / (w / 2); // -1.0 to 1.0
        // Parabolic vertical offset for pouch curvature
        const yOffset = (1 - normalizedX * normalizedX) * (h * curvatureFactor * 0.5);
        const stretchHeight = h + yOffset * 0.6;

        ctx.drawImage(
          img,
          sx, 0, sliceWidth, h,
          sx, -yOffset * 0.3, sliceWidth, stretchHeight
        );
      }

      resolve(canvas.toDataURL('image/jpeg', 0.92));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

/**
 * Dedicated Cylindrical Bottle / Can Label Rectification:
 * Unrolls horizontal curvature distortion on cylindrical containers by applying
 * an inverse arc projection, expanding horizontally compressed text towards label edges.
 */
export async function dewarpCylindricalSurface(dataUrl: string, curvatureStrength: number = 0.18): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(dataUrl);

      const w = img.width;
      const h = img.height;
      canvas.width = w;
      canvas.height = h;

      // Draw background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);

      // Perform horizontal cylinder unrolling
      const slices = Math.min(120, Math.floor(w / 3));
      const sliceWidth = w / slices;

      for (let i = 0; i < slices; i++) {
        // Compute non-linear position from cylinder angle
        const theta = (i / slices - 0.5) * Math.PI * 0.82; // -74 to +74 degrees
        const sinTheta = Math.sin(theta);
        const sourceX = (sinTheta / Math.sin(Math.PI * 0.41) * 0.5 + 0.5) * w;
        const nextTheta = ((i + 1) / slices - 0.5) * Math.PI * 0.82;
        const nextSourceX = (Math.sin(nextTheta) / Math.sin(Math.PI * 0.41) * 0.5 + 0.5) * w;
        const sourceWidth = Math.max(1, nextSourceX - sourceX);

        // Vertical barrel correction for bottle perspective
        const normX = (i / slices) * 2 - 1;
        const vertSag = (1 - normX * normX) * (h * curvatureStrength * 0.25);

        ctx.drawImage(
          img,
          Math.max(0, Math.min(w - 1, sourceX)),
          0,
          Math.max(1, Math.min(w - sourceX, sourceWidth)),
          h,
          i * sliceWidth,
          -vertSag * 0.2,
          sliceWidth + 0.5,
          h + vertSag * 0.4
        );
      }

      resolve(canvas.toDataURL('image/jpeg', 0.92));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

/**
 * Adaptive Thresholding & Specular Glare Reduction:
 * Enhances contrast on shiny, reflective metallic foil and plastic packaging.
 */
export async function applyAdaptiveThresholding(dataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(dataUrl);

      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      try {
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;

        // Apply CLAHE-like dynamic range expansion
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const lum = 0.299 * r + 0.587 * g + 0.114 * b;

          // Suppress washed out specular glare (lum > 240) and boost dark ink print (lum < 110)
          let factor = 1.0;
          if (lum > 220) {
            factor = 0.88; // subdue glare wash
          } else if (lum < 120) {
            factor = 1.25; // boost text ink
          }

          data[i] = Math.min(255, Math.max(0, r * factor));
          data[i + 1] = Math.min(255, Math.max(0, g * factor));
          data[i + 2] = Math.min(255, Math.max(0, b * factor));
        }

        ctx.putImageData(imgData, 0, 0);
        resolve(canvas.toDataURL('image/jpeg', 0.92));
      } catch (err) {
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

/**
 * Auto-orientation helper: Ensures packaging image orientation is upright
 */
export async function autoOrientImage(dataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      // If image is excessively wide landscape (> 2:1), portrait packaging might be sideways
      if (img.width > img.height * 2.2) {
        rotateImage(dataUrl, 90).then(resolve).catch(() => resolve(dataUrl));
      } else {
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}
