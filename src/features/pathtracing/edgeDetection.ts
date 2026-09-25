/**
 * Edge Detection module
 *
 * Implements a pure TypeScript Sobel operator on ImageData.
 * 1. Grayscale luminance conversion using ITU-R BT.601 standard weights:
 *    Y = 0.299*R + 0.587*G + 0.114*B
 * 2. 3x3 Sobel kernel convolution:
 *    Gx = [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]]
 *    Gy = [[-1, -2, -1], [ 0,  0,  0], [ 1,  2,  1]]
 *    Gradient Magnitude = sqrt(Gx^2 + Gy^2)
 * 3. Thresholding:
 *    Produces a binary edge map (1 for edge, 0 for background).
 *    Default threshold is 48 (out of 255 gradient scale), balancing sharp contour
 *    retention with noise suppression for whiteboard line art and photographic subjects.
 */

export interface EdgeDetectionOptions {
  /**
   * Gradient magnitude threshold (0-255).
   * Pixels with gradient magnitude >= threshold become binary 1.
   * Default: 48
   */
  threshold?: number;
}

export interface BinaryEdgeMap {
  width: number;
  height: number;
  /**
   * Typed array of length width * height.
   * 1 = edge pixel, 0 = non-edge pixel.
   */
  data: Uint8Array;
}

export function detectEdges(
  imageData: ImageData,
  options: EdgeDetectionOptions = {},
): BinaryEdgeMap {
  const { width, height, data } = imageData;
  const threshold = options.threshold ?? 48;
  const edgeData = new Uint8Array(width * height);

  if (width < 3 || height < 3) {
    return { width, height, data: edgeData };
  }

  // Step 1: Grayscale conversion buffer (luminance values 0-255)
  const gray = new Uint8Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const r = data[i * 4]!;
    const g = data[i * 4 + 1]!;
    const b = data[i * 4 + 2]!;
    // ITU-R BT.601 luminance
    gray[i] = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
  }

  // Step 2: 3x3 Sobel convolution
  // Exclude outer 1-pixel border to avoid out-of-bounds indexing
  for (let y = 1; y < height - 1; y++) {
    const rowOffset = y * width;
    const prevRowOffset = (y - 1) * width;
    const nextRowOffset = (y + 1) * width;

    for (let x = 1; x < width - 1; x++) {
      // 3x3 neighborhood luminance values:
      // p00 p01 p02
      // p10 p11 p12
      // p20 p21 p22
      const p00 = gray[prevRowOffset + x - 1]!;
      const p01 = gray[prevRowOffset + x]!;
      const p02 = gray[prevRowOffset + x + 1]!;

      const p10 = gray[rowOffset + x - 1]!;
      const p12 = gray[rowOffset + x + 1]!;

      const p20 = gray[nextRowOffset + x - 1]!;
      const p21 = gray[nextRowOffset + x]!;
      const p22 = gray[nextRowOffset + x + 1]!;

      // Horizontal gradient Gx
      const gx = -p00 + p02 - 2 * p10 + 2 * p12 - p20 + p22;
      // Vertical gradient Gy
      const gy = -p00 - 2 * p01 - p02 + p20 + 2 * p21 + p22;

      // Approximate magnitude: Math.hypot or sqrt(gx*gx + gy*gy)
      const magnitude = Math.sqrt(gx * gx + gy * gy);

      // Binary thresholding
      if (magnitude >= threshold) {
        edgeData[rowOffset + x] = 1;
      }
    }
  }

  return {
    width,
    height,
    data: edgeData,
  };
}
