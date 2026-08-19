import sharp from "sharp";

import type { QualityReport } from "#/types";

export async function evaluatePortrait(imagePath: string): Promise<QualityReport> {
  const image = sharp(imagePath);
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });

  let totalLuminance = 0;
  let overExposedPixels = 0;
  let underExposedPixels = 0;
  const pixelCount = info.width * info.height;

  // Calculate mean luminance and clipping boundaries
  for (let i = 0; i < data.length; i += info.channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;

    totalLuminance += lum;
    if (lum > 250) overExposedPixels++;
    if (lum < 5) underExposedPixels++;
  }

  const meanLuminance = totalLuminance / pixelCount;
  const overExposedRatio = overExposedPixels / pixelCount;
  const underExposedRatio = underExposedPixels / pixelCount;

  // Calculate image sharpness using standard deviation of grayscale variance
  const stats = await image.stats();
  const avgStdDev = stats.channels.reduce((acc, c) => acc + c.stdev, 0) / stats.channels.length;

  // Compute final candidate score (0-100 scale)
  let score = 100;
  if (avgStdDev < 35) score -= 40; // Too blurry / loss of skin pore detail
  if (overExposedRatio > 0.05) score -= 30; // Blown out studio highlights
  if (underExposedRatio > 0.1) score -= 20; // Crushed shadows

  return {
    sharpnessScore: Math.round(avgStdDev),
    isOverExposed: overExposedRatio > 0.05,
    isUnderExposed: underExposedRatio > 0.1,
    overallScore: Math.max(0, score),
  };
}
