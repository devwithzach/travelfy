import { supabase } from '@/lib/supabase'
import { compressImage } from '@/utils/image'

const BUCKET = 'trip-photos'

const MAX_RAW_BYTES = 25 * 1024 * 1024 // 25MB before compression
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/heic', 'image/webp']

export interface UploadResult {
  url: string
  path: string
}

/**
 * Upload a receipt photo to the existing trip-photos bucket under receipts/.
 * Compresses to ~2048px / 85% JPEG quality first so cellular uploads stay light.
 * Returns the public URL + storage path. Throws on size/MIME validation
 * failures or network errors.
 */
export async function uploadReceipt(file: File, userId: string): Promise<UploadResult> {
  if (file.size > MAX_RAW_BYTES) {
    throw new Error(`Receipt too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Max 25MB.`)
  }
  if (file.type && !ALLOWED_TYPES.includes(file.type)) {
    throw new Error('Receipt must be a JPEG, PNG, HEIC, or WebP image.')
  }

  const compressed = await compressImage(file, { maxDimension: 2048, quality: 0.85 })
  const ext = compressed.name.split('.').pop() || 'jpg'
  const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`
  const path = `${userId}/receipts/${id}.${ext}`

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, compressed, { contentType: compressed.type, upsert: false })
  if (error) throw error

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return { url: urlData.publicUrl, path }
}

export async function deleteReceipt(path: string): Promise<void> {
  if (!path) return
  await supabase.storage.from(BUCKET).remove([path])
}
