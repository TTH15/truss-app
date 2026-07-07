/**
 * キャンバス上の指定座標にモザイク（ピクセル平均化）を適用する（AdminEvents / AdminGallery 共通）
 */
export function applyMosaicAtPoint(
  canvas: HTMLCanvasElement,
  centerX: number,
  centerY: number,
  brushSize: number
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const blockSize = Math.max(2, Math.floor(brushSize / 6));
  const half = Math.floor(brushSize / 2);
  const startX = Math.max(0, Math.floor(centerX - half));
  const startY = Math.max(0, Math.floor(centerY - half));
  const width = Math.min(canvas.width - startX, brushSize);
  const height = Math.min(canvas.height - startY, brushSize);
  if (width <= 0 || height <= 0) return;
  const imageData = ctx.getImageData(startX, startY, width, height);
  const { data } = imageData;
  for (let y = 0; y < height; y += blockSize) {
    for (let x = 0; x < width; x += blockSize) {
      const px = (y * width + x) * 4;
      const r = data[px];
      const g = data[px + 1];
      const b = data[px + 2];
      const a = data[px + 3];
      for (let by = 0; by < blockSize && y + by < height; by++) {
        for (let bx = 0; bx < blockSize && x + bx < width; bx++) {
          const i = ((y + by) * width + (x + bx)) * 4;
          data[i] = r;
          data[i + 1] = g;
          data[i + 2] = b;
          data[i + 3] = a;
        }
      }
    }
  }
  ctx.putImageData(imageData, startX, startY);
}
