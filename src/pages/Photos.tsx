import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import L from 'leaflet'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import 'leaflet/dist/leaflet.css'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useTrip } from '@/contexts/TripContext'
import {
  Camera, Plus, X, Trash2, MapPin, Tag, ChevronLeft,
  ChevronRight, Loader2, Image, Download, Layers, Star, StarOff,
  FileText, Pencil, Check
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { compressImage } from '@/utils/image'

// Fix Leaflet default icon issue with Vite
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
})

const MAX_RAW_BYTES = 25 * 1024 * 1024 // 25MB before compression
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/heic', 'image/webp', 'image/gif']

// ── Types ────────────────────────────────────────────────────

interface TripPhoto {
  id: string
  trip_id: string
  user_id: string
  storage_path: string
  public_url: string
  caption: string
  location_tag: string
  activity_tag: string
  taken_at: string
  created_at: string
}

interface NominatimResult {
  place_id: number
  display_name: string
  lat: string
  lon: string
  address?: {
    country?: string
    city?: string
    town?: string
  }
}

type UploadMode = 'camera' | 'gallery' | 'note'

// Fake stepped progress: 10 → 40 → 80 → 100
function useUploadProgress(uploading: boolean) {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (!uploading) {
      setProgress(0)
      return
    }
    setProgress(10)
    const t1 = setTimeout(() => setProgress(40), 600)
    const t2 = setTimeout(() => setProgress(80), 1400)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [uploading])

  // When upload finishes (uploading flips to false after success), caller sets 100
  return { progress, setProgress }
}

// ── Main Component ───────────────────────────────────────────

export default function Photos() {
  const { user } = useAuth()
  const { trip, updateTrip } = useTrip()
  const coverUrl = trip.tripInfo.coverImage

  const setAsCover = (url: string) => {
    updateTrip(prev => ({ ...prev, tripInfo: { ...prev.tripInfo, coverImage: url } }))
  }
  const clearCover = () => {
    updateTrip(prev => ({ ...prev, tripInfo: { ...prev.tripInfo, coverImage: '' } }))
  }
  const navigate = useNavigate()

  // Separate hidden file inputs for camera vs gallery
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)

  const [photos, setPhotos] = useState<TripPhoto[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [showUploadSheet, setShowUploadSheet] = useState(false)
  const [showActionSheet, setShowActionSheet] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [uploadMode, setUploadMode] = useState<UploadMode>('camera')
  const [successToast, setSuccessToast] = useState(false)

  // Upload form state
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [pendingPreview, setPendingPreview] = useState<string | null>(null)
  const [caption, setCaption] = useState('')
  const [locationTag, setLocationTag] = useState('')

  // GPS state
  const [photoLat, setPhotoLat] = useState<number | null>(null)
  const [photoLon, setPhotoLon] = useState<number | null>(null)
  const [gpsLoading, setGpsLoading] = useState(false)

  // Nominatim auto-suggest
  const [locationSuggestions, setLocationSuggestions] = useState<NominatimResult[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const nominatimTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Mini Leaflet map
  const miniMapRef = useRef<HTMLDivElement>(null)
  const miniMapInstance = useRef<L.Map | null>(null)
  const miniMarkerRef = useRef<L.Marker | null>(null)

  // Itinerary tag state
  const [selectedDayId, setSelectedDayId] = useState('')
  const [selectedActivityId, setSelectedActivityId] = useState('')

  // Progress bar
  const { progress, setProgress } = useUploadProgress(uploading)

  // Edit sheet state
  const [showEditSheet, setShowEditSheet] = useState(false)
  const [editCaption, setEditCaption] = useState('')
  const [editLocationTag, setEditLocationTag] = useState('')
  const [editDayId, setEditDayId] = useState('')
  const [editActivityId, setEditActivityId] = useState('')
  const [editSaving, setEditSaving] = useState(false)
  const [editSaved, setEditSaved] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  // Nominatim suggestions for edit sheet
  const [editLocationSuggestions, setEditLocationSuggestions] = useState<NominatimResult[]>([])
  const [showEditSuggestions, setShowEditSuggestions] = useState(false)
  const editNominatimTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Mini Leaflet map init / update ───────────────────────────
  useEffect(() => {
    if (!photoLat || !photoLon || !miniMapRef.current) return

    if (!miniMapInstance.current) {
      const map = L.map(miniMapRef.current, {
        zoomControl: false,
        dragging: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        touchZoom: false,
        keyboard: false,
      }).setView([photoLat, photoLon], 15)

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
        maxZoom: 19,
      }).addTo(map)

      miniMarkerRef.current = L.marker([photoLat, photoLon]).addTo(map)
      miniMapInstance.current = map
    } else {
      miniMapInstance.current.setView([photoLat, photoLon], 15)
      if (miniMarkerRef.current) {
        miniMarkerRef.current.setLatLng([photoLat, photoLon])
      }
    }
  }, [photoLat, photoLon])

  // Destroy mini map when sheet closes
  useEffect(() => {
    if (!showUploadSheet && miniMapInstance.current) {
      miniMapInstance.current.remove()
      miniMapInstance.current = null
      miniMarkerRef.current = null
    }
  }, [showUploadSheet])

  // ── Load photos ──────────────────────────────────────────────
  const loadPhotos = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data } = await supabase
      .from('trip_photos')
      .select('*')
      .eq('user_id', user.id)
      .eq('trip_id', trip.tripInfo.id)
      .order('created_at', { ascending: false })
    setPhotos((data as TripPhoto[]) || [])
    setLoading(false)
  }, [user, trip.tripInfo.id])

  useEffect(() => { loadPhotos() }, [loadPhotos])

  // ── GPS + reverse geocode ────────────────────────────────────
  const startGps = () => {
    setGpsLoading(true)
    setPhotoLat(null)
    setPhotoLon(null)
    if (!navigator.geolocation) { setGpsLoading(false); return }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude
        const lon = pos.coords.longitude
        setPhotoLat(lat)
        setPhotoLon(lon)
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=16`,
            { headers: { 'Accept-Language': 'en' } }
          )
          const data = await res.json()
          const place = data.address?.tourism || data.address?.amenity || data.address?.road || data.address?.suburb || data.address?.city || ''
          if (place) setLocationTag(place)
        } catch { /* ignore */ }
        setGpsLoading(false)
      },
      () => setGpsLoading(false),
      { enableHighAccuracy: true, timeout: 8000 }
    )
  }

  // ── File selected ────────────────────────────────────────────
  const onFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    setUploadError(null)
    if (file.size > MAX_RAW_BYTES) {
      setUploadError(`Photo too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Max 25MB.`)
      return
    }
    if (file.type && !ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setUploadError('Only JPEG, PNG, HEIC, WebP, or GIF allowed.')
      return
    }

    setPendingFile(file)
    setPendingPreview(URL.createObjectURL(file))
    setShowUploadSheet(true)
    startGps()
  }

  // ── Nominatim auto-suggest ───────────────────────────────────
  const onLocationInput = (val: string) => {
    setLocationTag(val)
    setShowSuggestions(false)
    if (nominatimTimer.current) clearTimeout(nominatimTimer.current)
    if (val.trim().length < 2) { setLocationSuggestions([]); return }
    nominatimTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(val)}&limit=5&accept-language=en`
        )
        const data: NominatimResult[] = await res.json()
        setLocationSuggestions(data)
        setShowSuggestions(data.length > 0)
      } catch { /* ignore */ }
    }, 400)
  }

  const pickSuggestion = (s: NominatimResult) => {
    setLocationTag(s.display_name.split(',')[0])
    setShowSuggestions(false)
    setLocationSuggestions([])
    const lat = parseFloat(s.lat)
    const lon = parseFloat(s.lon)
    setPhotoLat(lat)
    setPhotoLon(lon)
  }

  // ── Open action sheet ────────────────────────────────────────
  const openActionSheet = () => setShowActionSheet(true)

  const triggerCamera = () => {
    setShowActionSheet(false)
    setUploadMode('camera')
    setTimeout(() => cameraInputRef.current?.click(), 100)
  }

  const triggerGallery = () => {
    setShowActionSheet(false)
    setUploadMode('gallery')
    setTimeout(() => galleryInputRef.current?.click(), 100)
  }

  const triggerNote = () => {
    setShowActionSheet(false)
    setUploadMode('note')
    setPendingFile(null)
    setPendingPreview(null)
    setCaption('')
    setLocationTag('')
    setPhotoLat(null)
    setPhotoLon(null)
    setGpsLoading(false)
    setSelectedDayId('')
    setSelectedActivityId('')
    setUploadError(null)
    setShowUploadSheet(true)
    startGps()
  }

  // ── Cancel upload sheet ──────────────────────────────────────
  const cancelUpload = () => {
    if (uploading) return // block close while uploading
    setShowUploadSheet(false)
    setPendingFile(null)
    setPendingPreview(null)
    setCaption('')
    setLocationTag('')
    setPhotoLat(null)
    setPhotoLon(null)
    setGpsLoading(false)
    setSelectedDayId('')
    setSelectedActivityId('')
    setLocationSuggestions([])
    setShowSuggestions(false)
    setUploadError(null)
  }

  // ── Upload to Supabase Storage + insert metadata ─────────────
  const uploadPhoto = async () => {
    if (!user) return
    // For notes, no file is required
    if (uploadMode !== 'note' && !pendingFile) return

    setUploading(true)
    setUploadError(null)

    try {
      let publicUrl = ''
      let storagePath = ''
      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`

      if (pendingFile && uploadMode !== 'note') {
        const fileToUpload = await compressImage(pendingFile, { maxDimension: 2048, quality: 0.85 })
        const ext = fileToUpload.name.split('.').pop() || 'jpg'
        const path = `${user.id}/${id}.${ext}`

        const { error: uploadErr } = await supabase.storage
          .from('trip-photos')
          .upload(path, fileToUpload, { contentType: fileToUpload.type, upsert: false })

        if (uploadErr) throw uploadErr

        const { data: urlData } = supabase.storage.from('trip-photos').getPublicUrl(path)
        publicUrl = urlData.publicUrl
        storagePath = path
      }

      // Advance progress to 80 before DB insert
      setProgress(80)

      const selectedDay = trip.itinerary.find(d => d.id === selectedDayId)
      const selectedActivity = selectedDay?.activities.find(a => a.id === selectedActivityId)
      const activityLabel = selectedDay
        ? `Day ${selectedDay.dayNumber} – ${selectedDay.title}${selectedActivity ? ` · ${selectedActivity.title}` : ''}`
        : ''

      const { error: dbErr } = await supabase.from('trip_photos').insert({
        id,
        trip_id: trip.tripInfo.id,
        user_id: user.id,
        storage_path: storagePath,
        public_url: publicUrl,
        caption,
        location_tag: locationTag,
        activity_tag: activityLabel,
        lat: photoLat,
        lon: photoLon,
        taken_at: new Date().toISOString(),
      })

      if (dbErr) throw dbErr

      setProgress(100)
      await loadPhotos()

      // Show success toast then close
      setSuccessToast(true)
      setTimeout(() => {
        setSuccessToast(false)
        setUploading(false)
        cancelUpload()
      }, 2000)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      setUploadError(`Upload failed: ${msg}`)
      setUploading(false)
    }
  }

  // ── Edit photo metadata ──────────────────────────────────────
  const openEditSheet = (photo: TripPhoto) => {
    setEditCaption(photo.caption || '')
    setEditLocationTag(photo.location_tag || '')
    // Try to reverse-parse the activity_tag back to day/activity IDs
    setEditDayId('')
    setEditActivityId('')
    setEditError(null)
    setEditSaved(false)
    setShowEditSheet(true)
  }

  const onEditLocationInput = (val: string) => {
    setEditLocationTag(val)
    setShowEditSuggestions(false)
    if (editNominatimTimer.current) clearTimeout(editNominatimTimer.current)
    if (val.trim().length < 2) { setEditLocationSuggestions([]); return }
    editNominatimTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(val)}&limit=5&accept-language=en`
        )
        const data: NominatimResult[] = await res.json()
        setEditLocationSuggestions(data)
        setShowEditSuggestions(data.length > 0)
      } catch { /* ignore */ }
    }, 400)
  }

  const pickEditSuggestion = (s: NominatimResult) => {
    setEditLocationTag(s.display_name.split(',')[0])
    setShowEditSuggestions(false)
    setEditLocationSuggestions([])
  }

  const saveEdit = async () => {
    if (!lightboxPhoto) return
    setEditSaving(true)
    setEditError(null)
    try {
      const selectedDay = trip.itinerary.find(d => d.id === editDayId)
      const selectedActivity = selectedDay?.activities.find(a => a.id === editActivityId)
      const newActivityTag = selectedDay
        ? `Day ${selectedDay.dayNumber} – ${selectedDay.title}${selectedActivity ? ` · ${selectedActivity.title}` : ''}`
        : lightboxPhoto.activity_tag // keep existing if no new day selected

      const { error } = await supabase.from('trip_photos').update({
        caption: editCaption,
        location_tag: editLocationTag,
        activity_tag: newActivityTag,
      }).eq('id', lightboxPhoto.id)

      if (error) throw error

      setPhotos(prev => prev.map(p => p.id === lightboxPhoto.id
        ? { ...p, caption: editCaption, location_tag: editLocationTag, activity_tag: newActivityTag }
        : p
      ))
      setEditSaved(true)
      setTimeout(() => { setEditSaved(false); setShowEditSheet(false) }, 900)
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setEditSaving(false)
    }
  }

  // ── Delete photo ─────────────────────────────────────────────
  const deletePhoto = async (photo: TripPhoto) => {
    if (!confirm('Delete this photo?')) return
    if (photo.storage_path) {
      await supabase.storage.from('trip-photos').remove([photo.storage_path])
    }
    await supabase.from('trip_photos').delete().eq('id', photo.id)
    setPhotos(prev => prev.filter(p => p.id !== photo.id))
    if (lightboxIndex !== null) setLightboxIndex(null)
  }

  const lightboxPhoto = lightboxIndex !== null ? photos[lightboxIndex] : null

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* Header */}
      <div className="px-4 pb-4 pt-[max(1.5rem,env(safe-area-inset-top))]">
        {trip.tripInfo.name && (
          <button
            onClick={() => navigate('/trips')}
            className="flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors uppercase tracking-widest mb-2 active:scale-95 origin-left"
            aria-label="Switch trip"
          >
            <Layers className="h-3 w-3" />
            <span className="truncate max-w-[70vw]">{trip.tripInfo.name}</span>
          </button>
        )}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Trip Photos</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{photos.length} photo{photos.length !== 1 ? 's' : ''} captured</p>
          </div>
          <button
            onClick={openActionSheet}
            className="w-11 h-11 rounded-2xl gradient-brand flex items-center justify-center shadow-lg"
            aria-label="Add photo"
          >
            <Plus className="h-5 w-5 text-white" />
          </button>
        </div>
      </div>

      {/* Hidden file inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={onFileSelected}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onFileSelected}
      />

      {/* Top-level error banner (e.g., oversized photo before opening the sheet) */}
      {uploadError && !showUploadSheet && (
        <div className="mx-4 mb-3 px-3 py-2 rounded-xl bg-destructive/10 text-destructive text-xs flex items-center gap-2" role="alert">
          <span className="flex-1">{uploadError}</span>
          <button onClick={() => setUploadError(null)} aria-label="Dismiss">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading photos...</p>
        </div>
      )}

      {/* Empty */}
      {!loading && photos.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-20 gap-4 px-8"
        >
          <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center">
            <Camera className="h-10 w-10 text-primary/60" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-lg">No photos yet</p>
            <p className="text-sm text-muted-foreground mt-1">Capture your trip memories — activities, places you discover, food, moments.</p>
          </div>
          {/* Two upload mode buttons on empty state */}
          <div className="mt-2 flex flex-col gap-2 w-full max-w-xs">
            <button
              onClick={triggerCamera}
              className="w-full px-6 py-3 rounded-2xl gradient-brand text-white font-semibold text-sm shadow-lg flex items-center justify-center gap-2"
            >
              <Camera className="h-4 w-4" /> 📷 Take Photo
            </button>
            <button
              onClick={triggerGallery}
              className="w-full px-6 py-3 rounded-2xl bg-muted border border-border text-foreground font-semibold text-sm shadow flex items-center justify-center gap-2"
            >
              🖼 Choose from Gallery
            </button>
            <button
              onClick={triggerNote}
              className="w-full px-6 py-3 rounded-2xl bg-muted border border-border text-foreground font-semibold text-sm shadow flex items-center justify-center gap-2"
            >
              ✏️ Add Note / Memory
            </button>
          </div>
        </motion.div>
      )}

      {/* Photo Grid */}
      {!loading && photos.length > 0 && (
        <div className="px-3">
          <div className="grid grid-cols-3 gap-1.5">
            {photos.map((photo, i) => (
              <motion.button
                key={photo.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.03 }}
                onClick={() => setLightboxIndex(i)}
                className="relative aspect-square rounded-xl overflow-hidden bg-muted group"
              >
                {photo.public_url ? (
                  <img
                    src={photo.public_url}
                    alt={photo.caption || 'Trip photo'}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-1 bg-muted">
                    <FileText className="h-7 w-7 text-muted-foreground/60" />
                    {photo.caption && (
                      <p className="text-[9px] text-muted-foreground text-center px-1 line-clamp-2">{photo.caption}</p>
                    )}
                  </div>
                )}
                {/* Overlay on hover/tap */}
                <div className="absolute inset-0 bg-black/0 group-active:bg-black/20 transition-colors" />
                {photo.caption && photo.public_url && (
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-1.5">
                    <p className="text-white text-[10px] leading-tight truncate">{photo.caption}</p>
                  </div>
                )}
                {(photo.location_tag || photo.activity_tag) && (
                  <div className="absolute top-1.5 left-1.5 flex flex-col gap-0.5">
                    {photo.location_tag && (
                      <div className="flex items-center gap-0.5 bg-black/60 backdrop-blur-sm rounded-full px-1.5 py-0.5">
                        <MapPin className="h-2.5 w-2.5 text-white/80" />
                        <span className="text-[9px] text-white/80 truncate max-w-[60px]">{photo.location_tag}</span>
                      </div>
                    )}
                    {photo.activity_tag && (
                      <div className="flex items-center gap-0.5 bg-primary/70 backdrop-blur-sm rounded-full px-1.5 py-0.5">
                        <Tag className="h-2.5 w-2.5 text-white/80" />
                        <span className="text-[9px] text-white/80 truncate max-w-[60px]">{photo.activity_tag.split('·')[0].trim()}</span>
                      </div>
                    )}
                  </div>
                )}
              </motion.button>
            ))}
          </div>
        </div>
      )}

      {/* FAB */}
      {!loading && photos.length > 0 && (
        <button
          onClick={openActionSheet}
          className="fixed bottom-24 right-4 z-40 w-14 h-14 rounded-2xl gradient-brand flex items-center justify-center shadow-xl"
          aria-label="Add photo"
        >
          <Camera className="h-6 w-6 text-white" />
        </button>
      )}

      {/* Action Sheet — Camera / Gallery / Note */}
      <AnimatePresence>
        {showActionSheet && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/60"
              onClick={() => setShowActionSheet(false)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-background rounded-t-3xl shadow-2xl pb-safe"
            >
              <div className="flex items-center justify-between px-5 pt-5 pb-3">
                <h2 className="text-lg font-bold">Add to Photos</h2>
                <button
                  onClick={() => setShowActionSheet(false)}
                  className="w-8 h-8 rounded-full bg-muted flex items-center justify-center"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="px-5 pb-8 flex flex-col gap-3">
                <button
                  onClick={triggerCamera}
                  className="w-full py-4 rounded-2xl gradient-brand text-white font-semibold text-base flex items-center justify-center gap-3 shadow-lg"
                >
                  <Camera className="h-5 w-5" />
                  📷 Take Photo
                </button>
                <button
                  onClick={triggerGallery}
                  className="w-full py-4 rounded-2xl bg-muted border border-border text-foreground font-semibold text-base flex items-center justify-center gap-3"
                >
                  <Image className="h-5 w-5" />
                  🖼 Choose from Gallery
                </button>
                <button
                  onClick={triggerNote}
                  className="w-full py-4 rounded-2xl bg-muted border border-border text-foreground font-semibold text-base flex items-center justify-center gap-3"
                >
                  <FileText className="h-5 w-5" />
                  ✏️ Add Note / Memory
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Upload Sheet */}
      <AnimatePresence>
        {showUploadSheet && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/60"
              onClick={cancelUpload}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-background rounded-t-3xl shadow-2xl max-h-[92vh] overflow-y-auto"
            >
              {/* Success toast */}
              <AnimatePresence>
                {successToast && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="mx-5 mt-4 px-4 py-3 rounded-xl bg-green-500/15 border border-green-500/30 text-green-700 dark:text-green-400 text-sm font-semibold flex items-center gap-2"
                    role="status"
                  >
                    <span className="text-base">✓</span> Photo saved!
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex items-center justify-between px-5 pt-5 pb-3">
                <h2 className="text-lg font-bold">
                  {uploadMode === 'note' ? 'Add Note / Memory' : 'Add Photo'}
                </h2>
                <button
                  onClick={cancelUpload}
                  disabled={uploading}
                  className="w-8 h-8 rounded-full bg-muted flex items-center justify-center disabled:opacity-40"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Progress bar */}
              {uploading && (
                <div className="mx-5 mb-2">
                  <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full gradient-brand"
                      initial={{ width: '0%' }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.5, ease: 'easeInOut' }}
                    />
                  </div>
                </div>
              )}

              {/* Preview or Note placeholder */}
              {pendingPreview ? (
                <div className="mx-5 rounded-2xl overflow-hidden aspect-video bg-muted">
                  <img src={pendingPreview} alt="Preview" className="w-full h-full object-cover" />
                </div>
              ) : uploadMode === 'note' ? (
                <div className="mx-5 rounded-2xl aspect-video bg-muted flex flex-col items-center justify-center gap-2 border-2 border-dashed border-border">
                  <FileText className="h-10 w-10 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">Note / Memory entry</p>
                </div>
              ) : null}

              <div className="px-5 pt-4 pb-8 space-y-4">
                {/* Caption */}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    {uploadMode === 'note' ? 'Note / Memory' : 'Caption'}
                  </label>
                  <input
                    value={caption}
                    onChange={e => setCaption(e.target.value)}
                    placeholder={uploadMode === 'note' ? 'Write your memory or note...' : "What's happening here?"}
                    className="mt-1.5 w-full px-4 py-3 rounded-xl bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>

                {/* Location Tag with auto-suggest */}
                <div className="relative">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> Location
                    {gpsLoading && <Loader2 className="h-3 w-3 animate-spin ml-1" />}
                    {photoLat && !gpsLoading && <span className="text-primary font-normal normal-case tracking-normal ml-1">GPS detected</span>}
                  </label>
                  <input
                    value={locationTag}
                    onChange={e => onLocationInput(e.target.value)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    onFocus={() => locationSuggestions.length > 0 && setShowSuggestions(true)}
                    placeholder={gpsLoading ? 'Detecting location...' : 'e.g. Disneyland, Venetian Macau...'}
                    disabled={gpsLoading}
                    className="mt-1.5 w-full px-4 py-3 rounded-xl bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60"
                  />

                  {/* Nominatim suggestions dropdown */}
                  <AnimatePresence>
                    {showSuggestions && locationSuggestions.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        className="absolute left-0 right-0 top-full mt-1 z-10 bg-background border border-border rounded-xl shadow-xl overflow-hidden"
                      >
                        {locationSuggestions.map((s) => (
                          <button
                            key={s.place_id}
                            onMouseDown={() => pickSuggestion(s)}
                            className="w-full px-4 py-2.5 text-left text-sm hover:bg-muted transition-colors flex flex-col gap-0.5"
                          >
                            <span className="font-medium truncate">{s.display_name.split(',')[0]}</span>
                            <span className="text-xs text-muted-foreground truncate">
                              {s.display_name.split(',').slice(1, 3).join(',')}
                            </span>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Mini Leaflet map */}
                  {photoLat && photoLon && (
                    <div className="mt-2">
                      <div
                        ref={miniMapRef}
                        className="w-full rounded-xl overflow-hidden border border-border"
                        style={{ height: 100 }}
                      />
                      <p className="text-xs text-muted-foreground font-mono mt-1">
                        {photoLat.toFixed(5)}, {photoLon.toFixed(5)}
                      </p>
                    </div>
                  )}
                </div>

                {/* Itinerary Tag */}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                    <Tag className="h-3 w-3" /> Link to Itinerary
                  </label>
                  <div className="mt-1.5 flex flex-col gap-2">
                    <select
                      value={selectedDayId}
                      onChange={e => { setSelectedDayId(e.target.value); setSelectedActivityId('') }}
                      className="w-full px-4 py-3 rounded-xl bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground"
                    >
                      <option value="">— Select Day —</option>
                      {trip.itinerary.map(d => (
                        <option key={d.id} value={d.id}>Day {d.dayNumber} – {d.title}</option>
                      ))}
                    </select>
                    {selectedDayId && (
                      <select
                        value={selectedActivityId}
                        onChange={e => setSelectedActivityId(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground"
                      >
                        <option value="">— Select Activity (optional) —</option>
                        {(trip.itinerary.find(d => d.id === selectedDayId)?.activities || []).map(a => (
                          <option key={a.id} value={a.id}>{a.time} – {a.title}</option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>

                {/* Inline error */}
                {uploadError && (
                  <div className="px-3 py-2 rounded-xl bg-destructive/10 text-destructive text-xs flex items-center gap-2" role="alert">
                    <span className="flex-1">{uploadError}</span>
                    <button onClick={() => setUploadError(null)} aria-label="Dismiss">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}

                {/* Save Button */}
                <button
                  onClick={uploadPhoto}
                  disabled={uploading || successToast}
                  className="w-full py-4 rounded-2xl gradient-brand text-white font-bold text-sm shadow-lg flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Uploading… {progress}%
                    </>
                  ) : (
                    <>
                      <Image className="h-4 w-4" />
                      {uploadMode === 'note' ? 'Save Note' : 'Save Photo'}
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Edit Sheet */}
      <AnimatePresence>
        {showEditSheet && lightboxPhoto && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
              onClick={() => { if (!editSaving) setShowEditSheet(false) }}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 320 }}
              className="fixed bottom-0 left-0 right-0 z-[61] bg-background rounded-t-3xl shadow-2xl max-h-[92vh] overflow-y-auto"
            >
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-0">
                <div className="w-10 h-1 rounded-full bg-border" />
              </div>

              {/* Header with thumbnail */}
              <div className="flex items-center gap-3 px-5 pt-3 pb-4 border-b border-border">
                {lightboxPhoto.public_url ? (
                  <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-muted">
                    <img src={lightboxPhoto.public_url} alt="" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <FileText className="h-6 w-6 text-primary/60" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h2 className="text-base font-bold">Edit Details</h2>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {lightboxPhoto.caption || (lightboxPhoto.public_url ? 'No caption' : 'Note entry')}
                  </p>
                </div>
                <button
                  onClick={() => { if (!editSaving) setShowEditSheet(false) }}
                  disabled={editSaving}
                  className="w-8 h-8 rounded-full bg-muted flex items-center justify-center disabled:opacity-40 shrink-0"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="px-5 pt-5 pb-10 space-y-5">

                {/* Caption / Note */}
                <div className="space-y-1.5">
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    <FileText className="h-3 w-3" />
                    {lightboxPhoto.public_url ? 'Caption' : 'Note / Memory'}
                  </label>
                  <textarea
                    value={editCaption}
                    onChange={e => setEditCaption(e.target.value)}
                    placeholder="Describe this moment…"
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none leading-relaxed"
                  />
                </div>

                {/* Location */}
                <div className="space-y-1.5 relative">
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    <MapPin className="h-3 w-3" /> Location
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <input
                      value={editLocationTag}
                      onChange={e => onEditLocationInput(e.target.value)}
                      onBlur={() => setTimeout(() => setShowEditSuggestions(false), 200)}
                      onFocus={() => editLocationSuggestions.length > 0 && setShowEditSuggestions(true)}
                      placeholder="Search a place…"
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                  <AnimatePresence>
                    {showEditSuggestions && editLocationSuggestions.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        className="absolute left-0 right-0 top-full mt-1 z-20 bg-background border border-border rounded-xl shadow-xl overflow-hidden"
                      >
                        {editLocationSuggestions.map(s => (
                          <button
                            key={s.place_id}
                            onMouseDown={() => pickEditSuggestion(s)}
                            className="w-full px-4 py-3 text-left text-sm hover:bg-muted transition-colors flex items-start gap-3 border-b border-border last:border-0"
                          >
                            <MapPin className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                            <div className="min-w-0">
                              <p className="font-medium truncate">{s.display_name.split(',')[0]}</p>
                              <p className="text-xs text-muted-foreground truncate mt-0.5">
                                {s.display_name.split(',').slice(1, 3).join(',')}
                              </p>
                            </div>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Itinerary Tag */}
                <div className="space-y-1.5">
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    <Tag className="h-3 w-3" /> Itinerary Day
                  </label>
                  {lightboxPhoto.activity_tag && !editDayId && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary/8 border border-primary/20">
                      <Tag className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span className="text-xs text-primary font-medium truncate">{lightboxPhoto.activity_tag}</span>
                    </div>
                  )}
                  <select
                    value={editDayId}
                    onChange={e => { setEditDayId(e.target.value); setEditActivityId('') }}
                    className="w-full px-4 py-3 rounded-xl bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground"
                  >
                    <option value="">— {lightboxPhoto.activity_tag ? 'Change day' : 'Select day'} —</option>
                    {trip.itinerary.map(d => (
                      <option key={d.id} value={d.id}>Day {d.dayNumber} – {d.title}</option>
                    ))}
                  </select>
                  {editDayId && (
                    <select
                      value={editActivityId}
                      onChange={e => setEditActivityId(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground"
                    >
                      <option value="">— Activity (optional) —</option>
                      {(trip.itinerary.find(d => d.id === editDayId)?.activities || []).map(a => (
                        <option key={a.id} value={a.id}>{a.time} – {a.title}</option>
                      ))}
                    </select>
                  )}
                </div>

                {editError && (
                  <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                    <X className="h-4 w-4 shrink-0" />
                    <span>{editError}</span>
                  </div>
                )}

                <button
                  onClick={saveEdit}
                  disabled={editSaving || editSaved}
                  className="w-full py-4 rounded-2xl gradient-brand text-white font-bold text-sm shadow-lg flex items-center justify-center gap-2 disabled:opacity-60 transition-opacity"
                >
                  {editSaving
                    ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>
                    : editSaved
                    ? <><Check className="h-4 w-4" /> Saved!</>
                    : <><Check className="h-4 w-4" /> Save Changes</>
                  }
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxPhoto && lightboxIndex !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black flex flex-col"
          >
            {/* Top bar */}
            <div className="flex items-center justify-between px-4 pt-safe pt-4 pb-3 bg-black/60 gap-2">
              <button onClick={() => setLightboxIndex(null)} className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                <X className="h-5 w-5 text-white" />
              </button>
              <p className="text-white/70 text-sm flex-1 text-center">{lightboxIndex + 1} / {photos.length}</p>
              <button
                onClick={() => coverUrl === lightboxPhoto.public_url ? clearCover() : setAsCover(lightboxPhoto.public_url)}
                aria-label={coverUrl === lightboxPhoto.public_url ? 'Remove as trip cover' : 'Set as trip cover'}
                title={coverUrl === lightboxPhoto.public_url ? 'Current trip cover — tap to remove' : 'Set as trip cover'}
                className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${coverUrl === lightboxPhoto.public_url ? 'bg-amber-500/30' : 'bg-white/10'}`}
              >
                {coverUrl === lightboxPhoto.public_url
                  ? <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  : <StarOff className="h-4 w-4 text-white" />
                }
              </button>
              <button
                onClick={() => openEditSheet(lightboxPhoto)}
                aria-label="Edit photo details"
                className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center shrink-0"
              >
                <Pencil className="h-4 w-4 text-white" />
              </button>
              <button
                onClick={() => deletePhoto(lightboxPhoto)}
                aria-label="Delete photo"
                className="w-9 h-9 rounded-full bg-red-500/20 flex items-center justify-center shrink-0"
              >
                <Trash2 className="h-4 w-4 text-red-400" />
              </button>
            </div>

            {/* Image or Note */}
            <div className="flex-1 flex items-center justify-center px-2 relative">
              <button
                onClick={() => setLightboxIndex(i => i !== null && i > 0 ? i - 1 : i)}
                className="absolute left-2 z-10 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center"
                style={{ display: lightboxIndex === 0 ? 'none' : 'flex' }}
              >
                <ChevronLeft className="h-5 w-5 text-white" />
              </button>

              {lightboxPhoto.public_url ? (
                <motion.img
                  key={lightboxPhoto.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  src={lightboxPhoto.public_url}
                  alt={lightboxPhoto.caption}
                  className="max-w-full max-h-full object-contain rounded-xl"
                />
              ) : (
                <motion.div
                  key={lightboxPhoto.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="max-w-sm w-full mx-4 bg-white/10 rounded-2xl p-8 flex flex-col items-center gap-4"
                >
                  <FileText className="h-12 w-12 text-white/60" />
                  {lightboxPhoto.caption && (
                    <p className="text-white text-center text-base">{lightboxPhoto.caption}</p>
                  )}
                </motion.div>
              )}

              <button
                onClick={() => setLightboxIndex(i => i !== null && i < photos.length - 1 ? i + 1 : i)}
                className="absolute right-2 z-10 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center"
                style={{ display: lightboxIndex === photos.length - 1 ? 'none' : 'flex' }}
              >
                <ChevronRight className="h-5 w-5 text-white" />
              </button>
            </div>

            {/* Bottom info */}
            <div className="px-5 pb-8 pt-3 bg-black/60">
              {lightboxPhoto.caption && lightboxPhoto.public_url && (
                <p className="text-white font-medium text-sm">{lightboxPhoto.caption}</p>
              )}
              <div className="flex gap-3 mt-2 flex-wrap">
                {lightboxPhoto.location_tag && (
                  <span className="flex items-center gap-1 text-xs text-white/60">
                    <MapPin className="h-3 w-3" /> {lightboxPhoto.location_tag}
                  </span>
                )}
                {lightboxPhoto.activity_tag && (
                  <span className="flex items-center gap-1 text-xs text-white/60">
                    <Tag className="h-3 w-3" /> {lightboxPhoto.activity_tag}
                  </span>
                )}
                <span className="text-xs text-white/40">
                  {new Date(lightboxPhoto.created_at).toLocaleDateString()}
                </span>
              </div>
              {lightboxPhoto.public_url && (
                <a
                  href={lightboxPhoto.public_url}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 flex items-center gap-2 text-xs text-white/50 hover:text-white/80 transition-colors"
                >
                  <Download className="h-3.5 w-3.5" /> Download original
                </a>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
