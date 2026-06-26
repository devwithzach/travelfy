// Client-side image compression. Important for mobile users on cellular data
// in foreign countries — iPhone HEIC/JPEG photos are routinely 3–8MB; we cut
// them to ~300-700KB before uploading to Supabase Storage.

interface CompressOptions {
  maxDimension?: number // longest edge in px
  quality?: number      // JPEG quality 0–1
  mimeType?: 'image/jpeg' | 'image/webp'
}

export async function compressImage(
  file: File,
  opts: CompressOptions = {},
): Promise<File> {
  const { maxDimension = 2048, quality = 0.85, mimeType = 'image/jpeg' } = opts

  // GIFs and SVGs lose data when re-encoded — pass through.
  if (file.type === 'image/gif' || file.type === 'image/svg+xml') return file

  const bitmap = await loadBitmap(file)
  const { width: w0, height: h0 } = bitmap
  const scale = Math.min(1, maxDimension / Math.max(w0, h0))
  const w = Math.round(w0 * scale)
  const h = Math.round(h0 * scale)

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) return file
  ctx.drawImage(bitmap, 0, 0, w, h)
  // Free the source bitmap promptly.
  if ('close' in bitmap) (bitmap as ImageBitmap).close()

  const blob = await new Promise<Blob | null>(resolve =>
    canvas.toBlob(resolve, mimeType, quality),
  )
  if (!blob) return file

  // If compression made it bigger (rare for small inputs), keep the original.
  if (blob.size >= file.size) return file

  const newName = file.name.replace(/\.\w+$/, '') + (mimeType === 'image/webp' ? '.webp' : '.jpg')
  return new File([blob], newName, { type: mimeType, lastModified: Date.now() })
}

async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === 'function') {
    try {
      // imageOrientation: 'from-image' respects EXIF rotation on iPhone JPEGs.
      return await createImageBitmap(file, { imageOrientation: 'from-image' })
    } catch {
      // fall through
    }
  }
  // Fallback for older browsers.
  return await new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => { URL.revokeObjectURL(url); resolve(img) }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('image load failed')) }
    img.src = url
  })
}
