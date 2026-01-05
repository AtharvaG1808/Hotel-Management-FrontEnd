
export async function compressImageFile(file, {
  maxWidth = 1280,
  quality = 0.7,              // 0.0 - 1.0; adjust for size vs quality
  mimeType = 'image/jpeg',    // 'image/webp' is even smaller if browser supports it
} = {}) {
  const imageBitmap = await createImageBitmap(file);

  const scale = Math.min(1, maxWidth / imageBitmap.width);
  const targetW = Math.round(imageBitmap.width * scale);
  const targetH = Math.round(imageBitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(imageBitmap, 0, 0, targetW, targetH);

  // dataURL base64 (what your backend expects)
  const dataUrl = canvas.toDataURL(mimeType, quality);
  return { dataUrl, mimeType };
}
