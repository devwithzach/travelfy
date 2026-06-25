import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useTrip } from '@/contexts/TripContext'
import {
  Camera, Plus, X, Trash2, MapPin, Tag, ChevronLeft,
  ChevronRight, Loader2, Image, Download, ZoomIn
} from 'lucide-react'

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

// ── Main Component ───────────────────────────────────────────

export default function Photos() {
  const { user } = useAuth()
  const { trip } = useTrip()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [photos, setPhotos] = useState<TripPhoto[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [showUploadSheet, setShowUploadSheet] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  // Upload form state
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [pendingPreview, setPendingPreview] = useState<string | null>(null)
  const [caption, setCaption] = useState('')
  const [locationTag, setLocationTag] = useState('')

  // GPS state
  const [photoLat, setPhotoLat] = useState<number | null>(null)
  const [photoLon, setPhotoLon] = useState<number | null>(null)
  const [gpsLoading, setGpsLoading] = useState(false)

  // Itinerary tag state
  const [selectedDayId, setSelectedDayId] = useState('')
  const [selectedActivityId, setSelectedActivityId] = useState('')

  // Load photos
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

  // File selected
  const onFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPendingFile(file)
    setPendingPreview(URL.createObjectURL(file))
    setShowUploadSheet(true)
    e.target.value = ''

    // Auto-GPS
    setGpsLoading(true)
    setPhotoLat(null)
    setPhotoLon(null)
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude
          const lon = pos.coords.longitude
          setPhotoLat(lat)
          setPhotoLon(lon)
          // Reverse geocode with Nominatim
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
    } else {
      setGpsLoading(false)
    }
  }

  const cancelUpload = () => {
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
  }

  // Upload to Supabase Storage + insert metadata
  const uploadPhoto = async () => {
    if (!pendingFile || !user) return
    setUploading(true)

    try {
      const ext = pendingFile.name.split('.').pop() || 'jpg'
      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`
      const path = `${user.id}/${id}.${ext}`

      const { error: uploadErr } = await supabase.storage
        .from('trip-photos')
        .upload(path, pendingFile, { contentType: pendingFile.type, upsert: false })

      if (uploadErr) throw uploadErr

      const { data: urlData } = supabase.storage.from('trip-photos').getPublicUrl(path)

      const selectedDay = trip.itinerary.find(d => d.id === selectedDayId)
      const selectedActivity = selectedDay?.activities.find(a => a.id === selectedActivityId)
      const activityLabel = selectedDay
        ? `Day ${selectedDay.dayNumber} – ${selectedDay.title}${selectedActivity ? ` · ${selectedActivity.title}` : ''}`
        : ''

      const { error: dbErr } = await supabase.from('trip_photos').insert({
        id,
        trip_id: trip.tripInfo.id,
        user_id: user.id,
        storage_path: path,
        public_url: urlData.publicUrl,
        caption,
        location_tag: locationTag,
        activity_tag: activityLabel,
        lat: photoLat,
        lon: photoLon,
        taken_at: new Date().toISOString(),
      })

      if (dbErr) throw dbErr

      await loadPhotos()
      cancelUpload()
    } catch (err: any) {
      alert('Upload failed: ' + (err.message || 'Unknown error'))
    } finally {
      setUploading(false)
    }
  }

  // Delete photo
  const deletePhoto = async (photo: TripPhoto) => {
    if (!confirm('Delete this photo?')) return
    await supabase.storage.from('trip-photos').remove([photo.storage_path])
    await supabase.from('trip_photos').delete().eq('id', photo.id)
    setPhotos(prev => prev.filter(p => p.id !== photo.id))
    if (lightboxIndex !== null) setLightboxIndex(null)
  }

  const lightboxPhoto = lightboxIndex !== null ? photos[lightboxIndex] : null

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* Header */}
      <div className="px-4 pt-6 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Trip Photos</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{photos.length} photo{photos.length !== 1 ? 's' : ''} captured</p>
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-11 h-11 rounded-2xl gradient-brand flex items-center justify-center shadow-lg"
          >
            <Plus className="h-5 w-5 text-white" />
          </button>
        </div>
      </div>

      {/* Hidden file input — accepts images + camera on mobile */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={onFileSelected}
      />

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
          <button
            onClick={() => fileInputRef.current?.click()}
            className="mt-2 px-6 py-3 rounded-2xl gradient-brand text-white font-semibold text-sm shadow-lg flex items-center gap-2"
          >
            <Camera className="h-4 w-4" /> Take a Photo
          </button>
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
                <img
                  src={photo.public_url}
                  alt={photo.caption || 'Trip photo'}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                {/* Overlay on hover/tap */}
                <div className="absolute inset-0 bg-black/0 group-active:bg-black/20 transition-colors" />
                {photo.caption && (
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
          onClick={() => fileInputRef.current?.click()}
          className="fixed bottom-24 right-4 z-40 w-14 h-14 rounded-2xl gradient-brand flex items-center justify-center shadow-xl"
        >
          <Camera className="h-6 w-6 text-white" />
        </button>
      )}

      {/* Upload Sheet */}
      <AnimatePresence>
        {showUploadSheet && pendingPreview && (
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
              <div className="flex items-center justify-between px-5 pt-5 pb-3">
                <h2 className="text-lg font-bold">Add Photo</h2>
                <button onClick={cancelUpload} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Preview */}
              <div className="mx-5 rounded-2xl overflow-hidden aspect-video bg-muted">
                <img src={pendingPreview} alt="Preview" className="w-full h-full object-cover" />
              </div>

              <div className="px-5 pt-4 pb-8 space-y-4">
                {/* Caption */}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Caption</label>
                  <input
                    value={caption}
                    onChange={e => setCaption(e.target.value)}
                    placeholder="What's happening here?"
                    className="mt-1.5 w-full px-4 py-3 rounded-xl bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>

                {/* Location Tag */}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> Location
                    {gpsLoading && <Loader2 className="h-3 w-3 animate-spin ml-1" />}
                    {photoLat && !gpsLoading && <span className="text-primary font-normal normal-case tracking-normal ml-1">GPS detected</span>}
                  </label>
                  <input
                    value={locationTag}
                    onChange={e => setLocationTag(e.target.value)}
                    placeholder={gpsLoading ? 'Detecting location...' : 'e.g. Disneyland, Venetian Macau...'}
                    disabled={gpsLoading}
                    className="mt-1.5 w-full px-4 py-3 rounded-xl bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60"
                  />
                  {photoLat && photoLon && (
                    <p className="text-xs text-muted-foreground mt-1 font-mono">{photoLat.toFixed(5)}, {photoLon.toFixed(5)}</p>
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

                {/* Upload Button */}
                <button
                  onClick={uploadPhoto}
                  disabled={uploading}
                  className="w-full py-4 rounded-2xl gradient-brand text-white font-bold text-sm shadow-lg flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {uploading ? <><Loader2 className="h-4 w-4 animate-spin" /> Uploading...</> : <><Image className="h-4 w-4" /> Save Photo</>}
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
            <div className="flex items-center justify-between px-4 pt-safe pt-4 pb-3 bg-black/60">
              <button onClick={() => setLightboxIndex(null)} className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center">
                <X className="h-5 w-5 text-white" />
              </button>
              <p className="text-white/70 text-sm">{lightboxIndex + 1} / {photos.length}</p>
              <button
                onClick={() => deletePhoto(lightboxPhoto)}
                className="w-9 h-9 rounded-full bg-red-500/20 flex items-center justify-center"
              >
                <Trash2 className="h-4 w-4 text-red-400" />
              </button>
            </div>

            {/* Image */}
            <div className="flex-1 flex items-center justify-center px-2 relative">
              <button
                onClick={() => setLightboxIndex(i => i !== null && i > 0 ? i - 1 : i)}
                className="absolute left-2 z-10 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center"
                style={{ display: lightboxIndex === 0 ? 'none' : 'flex' }}
              >
                <ChevronLeft className="h-5 w-5 text-white" />
              </button>

              <motion.img
                key={lightboxPhoto.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                src={lightboxPhoto.public_url}
                alt={lightboxPhoto.caption}
                className="max-w-full max-h-full object-contain rounded-xl"
              />

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
              {lightboxPhoto.caption && (
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
              <a
                href={lightboxPhoto.public_url}
                download
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 flex items-center gap-2 text-xs text-white/50 hover:text-white/80 transition-colors"
              >
                <Download className="h-3.5 w-3.5" /> Download original
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
