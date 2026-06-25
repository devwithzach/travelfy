import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import L from 'leaflet'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import { useTrip } from '@/contexts/TripContext'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import {
  UtensilsCrossed, ShoppingBag, Camera, Gift,
  Bus, Pill, Loader2, Navigation, X, Clock, Footprints,
  Bookmark, BookmarkCheck, Star
} from 'lucide-react'
import NavigationBanner from '@/components/map/NavigationBanner'
import SavePlaceSheet from '@/components/map/SavePlaceSheet'
import LocationPicker from '@/components/map/LocationPicker'
import { geocodeAddress } from '@/components/map/geocode'
import type { POI, Location, NavStep, SavedPlace } from '@/components/map/types'

// Fix Leaflet default icon issue with Vite
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
})

// ── Categories ───────────────────────────────────────────────

const CATEGORIES = [
  {
    id: 'food',
    label: 'Food & Dining',
    icon: UtensilsCrossed,
    color: '#f97316',
    markerColor: '#f97316',
    query: `nwr["amenity"~"restaurant|cafe|fast_food|food_court|bar|pub|bakery"](around:{R},{LAT},{LON});`,
  },
  {
    id: 'shopping',
    label: 'Malls & Shops',
    icon: ShoppingBag,
    color: '#8b5cf6',
    markerColor: '#8b5cf6',
    query: `nwr["shop"~"mall|supermarket|department_store|clothes|shoes|jewelry|convenience"](around:{R},{LAT},{LON});`,
  },
  {
    id: 'attractions',
    label: 'Attractions',
    icon: Camera,
    color: '#06b6d4',
    markerColor: '#06b6d4',
    query: `nwr["tourism"~"attraction|museum|viewpoint|gallery|theme_park|zoo"](around:{R},{LAT},{LON});`,
  },
  {
    id: 'souvenirs',
    label: 'Souvenirs',
    icon: Gift,
    color: '#ec4899',
    markerColor: '#ec4899',
    query: `nwr["shop"~"gift|souvenir|art|craft|books|antiques"](around:{R},{LAT},{LON});`,
  },
  {
    id: 'transport',
    label: 'Transport',
    icon: Bus,
    color: '#10b981',
    markerColor: '#10b981',
    query: `nwr["railway"~"station|subway_entrance|tram_stop"](around:{R},{LAT},{LON});`,
  },
  {
    id: 'pharmacy',
    label: 'Pharmacy & Medical',
    icon: Pill,
    color: '#ef4444',
    markerColor: '#ef4444',
    query: `nwr["amenity"~"pharmacy|hospital|clinic|doctors|dentist"](around:{R},{LAT},{LON});`,
  },
  {
    id: 'saved',
    label: 'Saved',
    icon: Bookmark,
    color: '#f59e0b',
    markerColor: '#f59e0b',
    query: '', // handled specially
  },
]

const RADIUS_OPTIONS = [500, 1000, 1500, 2000]

// ── POI cache (session-level LRU, avoids re-fetching same location+category) ──
const POI_CACHE_MAX = 50
const poiCache = new Map<string, POI[]>()

function poiCacheGet(key: string): POI[] | undefined {
  const v = poiCache.get(key)
  if (v) {
    poiCache.delete(key)
    poiCache.set(key, v) // mark as recently used
  }
  return v
}

function poiCacheSet(key: string, value: POI[]) {
  if (poiCache.has(key)) poiCache.delete(key)
  poiCache.set(key, value)
  while (poiCache.size > POI_CACHE_MAX) {
    const oldest = poiCache.keys().next().value
    if (oldest === undefined) break
    poiCache.delete(oldest)
  }
}

// ── Overpass API ─────────────────────────────────────────────

async function fetchPOIs(lat: number, lon: number, categoryId: string, radius: number): Promise<POI[]> {
  const cacheKey = `${categoryId}:${lat.toFixed(3)}:${lon.toFixed(3)}:${radius}`
  const cached = poiCacheGet(cacheKey)
  if (cached) return cached
  const cat = CATEGORIES.find(c => c.id === categoryId)
  if (!cat) return []

  const queryBody = cat.query
    .replace(/{R}/g, String(radius))
    .replace(/{LAT}/g, String(lat))
    .replace(/{LON}/g, String(lon))

  const overpassQuery = `[out:json][timeout:15];
(
  ${queryBody}
);
out center 25;`

  const res = await fetch('/api/overpass', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: overpassQuery }),
  })
  if (!res.ok) throw new Error('Overpass API error')
  const data = await res.json()

  const results = (data.elements as any[])
    .filter((el: any) => el.tags?.name)
    .map((el: any) => {
      const elLat = el.lat ?? el.center?.lat
      const elLon = el.lon ?? el.center?.lon
      const dist = haversine(lat, lon, elLat, elLon)
      return {
        id: el.id,
        lat: elLat,
        lon: elLon,
        name: el.tags.name,
        type: el.tags.amenity || el.tags.shop || el.tags.tourism || el.tags.historic || el.tags.public_transport || el.tags.railway || '',
        tags: el.tags,
        distance: dist,
      }
    })
    .filter((p: POI) => p.lat && p.lon)
    .sort((a: POI, b: POI) => (a.distance ?? 0) - (b.distance ?? 0))

  poiCacheSet(cacheKey, results)
  return results
}

function buildPopup(parts: Array<{ text: string; style?: string; tag?: 'b' | 'span' | 'div' }>): HTMLElement {
  const root = document.createElement('div')
  root.style.minWidth = '160px'
  parts.forEach((p, i) => {
    const el = document.createElement(p.tag ?? 'span')
    el.textContent = p.text
    if (p.style) el.setAttribute('style', p.style)
    root.appendChild(el)
    if (i < parts.length - 1) root.appendChild(document.createElement('br'))
  })
  return root
}

// Parse a Google Maps URL for coordinates. Supports @lat,lon ; ?q=lat,lon ; ?ll=lat,lon ; !3dlat!4dlon.
function parseMapsUrl(url: string | undefined): { lat: number; lon: number } | null {
  if (!url) return null
  const patterns = [
    /[@?&](?:ll|q)=(-?\d+\.\d+),(-?\d+\.\d+)/,
    /@(-?\d+\.\d+),(-?\d+\.\d+)/,
    /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/,
  ]
  for (const re of patterns) {
    const m = url.match(re)
    if (m) {
      const lat = Number(m[1])
      const lon = Number(m[2])
      if (Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180) {
        return { lat, lon }
      }
    }
  }
  return null
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)))
}

function createColorMarker(color: string) {
  return L.divIcon({
    html: `<div style="
      width:28px;height:28px;border-radius:50% 50% 50% 0;
      background:${color};transform:rotate(-45deg);
      border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.4);
    "></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    className: '',
  })
}

function createHotelMarker() {
  return L.divIcon({
    html: `<div style="
      background:#2563EB;color:white;padding:4px 8px;
      border-radius:8px;font-size:11px;font-weight:700;
      white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.4);
      border:2px solid white;
    ">🏨 Hotel</div>`,
    iconAnchor: [30, 20],
    className: '',
  })
}

// ── Nav helpers ──────────────────────────────────────────────

function formatInstruction(step: any): string {
  const type: string = step.maneuver.type
  const mod: string = step.maneuver.modifier || 'straight'
  const name: string = step.name ? ` onto ${step.name}` : ''
  if (type === 'depart') return `Head ${mod}${name}`
  if (type === 'arrive') return 'You have arrived'
  if (type === 'turn') return `Turn ${mod}${name}`
  if (type === 'new name') return `Continue${name}`
  if (type === 'continue') return `Continue ${mod}${name}`
  if (type === 'merge') return `Merge ${mod}${name}`
  if (type === 'roundabout') return `Take roundabout${name}`
  return `${type}${name}`
}

// ── Main Component ───────────────────────────────────────────

export default function MapExplorer() {
  const { trip } = useTrip()
  const { user } = useAuth()
  const mapRef = useRef<L.Map | null>(null)
  const mapElRef = useRef<HTMLDivElement>(null)
  const markersRef = useRef<L.Layer[]>([])
  const hotelMarkersRef = useRef<L.Layer[]>([])
  const watchIdRef = useRef<number | null>(null)
  const userMarkerRef = useRef<L.CircleMarker | null>(null)
  const savedMarkersRef = useRef<L.Layer[]>([])

  // Geocoded hotel coords (lazily populated when mapsUrl doesn't contain coords)
  const [geocodedHotels, setGeocodedHotels] = useState<Record<string, { lat: number; lon: number }>>({})

  // Geocode any hotel whose mapsUrl doesn't yield coords.
  useEffect(() => {
    let cancelled = false
    trip.hotels.forEach(h => {
      if (parseMapsUrl(h.mapsUrl)) return
      if (geocodedHotels[h.id]) return
      const query = h.address?.trim() || `${h.name} ${h.address ?? ''}`.trim() || h.name
      if (!query) return
      geocodeAddress(query).then(result => {
        if (cancelled || !result) return
        setGeocodedHotels(prev => ({ ...prev, [h.id]: result }))
      })
    })
    return () => { cancelled = true }
  }, [trip.hotels])

  // Build location list from trip data. Hotels appear if mapsUrl contains coords
  // OR if address geocoding has resolved them.
  const locations: Location[] = [
    ...trip.hotels
      .map(h => {
        const coords = parseMapsUrl(h.mapsUrl) ?? geocodedHotels[h.id]
        if (!coords) return null
        return { name: h.name, lat: coords.lat, lon: coords.lon, country: '' }
      })
      .filter((l): l is Location => l !== null),
    { name: 'Wong Tai Sin Shrine', lat: 22.3420, lon: 114.1934, country: 'Hong Kong' },
    { name: 'West Kowloon Cultural District', lat: 22.3033, lon: 114.1603, country: 'Hong Kong' },
    { name: 'HK Disneyland', lat: 22.3130, lon: 114.0448, country: 'Hong Kong' },
    { name: 'Ruins of St. Paul\'s', lat: 22.1975, lon: 113.5388, country: 'Macau' },
    { name: 'The Venetian Macau', lat: 22.1496, lon: 113.5668, country: 'Macau' },
    { name: 'Golden Lotus Square', lat: 22.1969, lon: 113.5514, country: 'Macau' },
  ]

  const [selectedLocation, setSelectedLocation] = useState<Location>(locations[0] ?? { name: 'Hong Kong', lat: 22.3193, lon: 114.1694, country: 'Hong Kong' })
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [pois, setPois] = useState<POI[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [radius, setRadius] = useState(1000)
  const [showLocationPicker, setShowLocationPicker] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [selectedPoi, setSelectedPoi] = useState<POI | null>(null)
  const [routeInfo, setRouteInfo] = useState<{ distance: number; duration: number } | null>(null)
  const [routeLayer, setRouteLayer] = useState<L.Polyline | null>(null)
  const [navigating, setNavigating] = useState(false)

  // Nav state
  const [navMode, setNavMode] = useState(false)
  const [navSteps, setNavSteps] = useState<NavStep[]>([])
  const [currentStepIdx, setCurrentStepIdx] = useState(0)
  const [userPos, setUserPos] = useState<[number, number] | null>(null)
  const [distToNext, setDistToNext] = useState<number | null>(null)
  const [showNextTurns, setShowNextTurns] = useState(false)

  // Save & Rate state
  const [savedPlaces, setSavedPlaces] = useState<SavedPlace[]>([])
  const [saveSheet, setSaveSheet] = useState<POI | null>(null)
  const [saveRating, setSaveRating] = useState(5)
  const [saveNotes, setSaveNotes] = useState('')
  const [saving, setSaving] = useState(false)

  // Init map
  useEffect(() => {
    if (!mapElRef.current || mapRef.current) return

    const map = L.map(mapElRef.current, {
      center: [selectedLocation.lat, selectedLocation.lon],
      zoom: 15,
      zoomControl: false,
    })

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map)

    L.control.zoom({ position: 'bottomright' }).addTo(map)

    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  // Add hotel markers
  useEffect(() => {
    if (!mapRef.current) return
    hotelMarkersRef.current.forEach(m => mapRef.current!.removeLayer(m))
    hotelMarkersRef.current = []

    locations.forEach(loc => {
      if (!trip.hotels.some(h => h.name === loc.name)) return
      const m = L.marker([loc.lat, loc.lon], { icon: createHotelMarker() })
        .addTo(mapRef.current!)
        .bindPopup(buildPopup([
          { tag: 'b', text: loc.name },
          { tag: 'span', text: loc.country },
        ]))
      hotelMarkersRef.current.push(m)
    })
  }, [trip.hotels])

  // Fly to selected location
  useEffect(() => {
    if (!mapRef.current) return
    mapRef.current.flyTo([selectedLocation.lat, selectedLocation.lon], 15, { duration: 1.2 })
    setPois([])
    setActiveCategory(null)
    setShowResults(false)
  }, [selectedLocation])

  // Geolocation tracking during nav
  useEffect(() => {
    if (!navMode || !navigator.geolocation) return
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const lat = pos.coords.latitude
        const lon = pos.coords.longitude
        setUserPos([lat, lon])

        // Auto-pan map to follow user
        if (mapRef.current) {
          mapRef.current.setView([lat, lon], 17, { animate: true, duration: 0.5 })
          if (userMarkerRef.current) {
            userMarkerRef.current.setLatLng([lat, lon])
          } else {
            userMarkerRef.current = L.circleMarker([lat, lon], {
              radius: 10, fillColor: '#2563EB', color: 'white', weight: 3, fillOpacity: 1,
            }).addTo(mapRef.current)
          }
        }

        // Calculate live distance to next maneuver point
        setCurrentStepIdx(prev => {
          if (navSteps.length === 0 || prev >= navSteps.length - 1) return prev
          const next = navSteps[prev + 1]
          const dist = haversine(lat, lon, next.lat, next.lon)
          setDistToNext(dist)
          return dist < 25 ? prev + 1 : prev
        })
      },
      (err) => {
        const msg =
          err.code === err.PERMISSION_DENIED
            ? 'Location permission denied — turn-by-turn nav cannot track you.'
            : err.code === err.POSITION_UNAVAILABLE
              ? 'Location unavailable. Check GPS or try outdoors.'
              : err.code === err.TIMEOUT
                ? 'Location timed out. Retrying…'
                : 'Could not get your location.'
        setError(msg)
      },
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 15000 }
    )
    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current)
    }
  }, [navMode, navSteps])

  // Load saved places on mount
  useEffect(() => {
    if (!user) return
    supabase
      .from('saved_places')
      .select('*')
      .eq('user_id', user.id)
      .eq('trip_id', trip.tripInfo.id)
      .then(({ data }) => setSavedPlaces((data as SavedPlace[]) || []))
  }, [user, trip.tripInfo.id])

  // Clear POI markers
  const clearMarkers = useCallback(() => {
    markersRef.current.forEach(m => mapRef.current?.removeLayer(m))
    markersRef.current = []
  }, [])

  // Check if a POI is already saved
  const isSaved = useCallback((osmId: number) =>
    savedPlaces.some(s => s.osm_id === osmId), [savedPlaces])

  // Save a POI
  const savePlace = useCallback(async () => {
    if (!saveSheet || !user) return
    setSaving(true)
    const { data, error } = await supabase.from('saved_places').insert({
      user_id: user.id,
      trip_id: trip.tripInfo.id,
      osm_id: saveSheet.id,
      name: saveSheet.name,
      type: saveSheet.type,
      lat: saveSheet.lat,
      lon: saveSheet.lon,
      tags: saveSheet.tags,
      rating: saveRating,
      notes: saveNotes,
    }).select().single()
    if (!error && data) setSavedPlaces(prev => [...prev, data as SavedPlace])
    setSaving(false)
    setSaveSheet(null)
    setSaveNotes('')
    setSaveRating(5)
  }, [saveSheet, user, trip.tripInfo.id, saveRating, saveNotes])

  // Remove a saved place
  const unsavePlace = useCallback(async (osmId: number) => {
    if (!user) return
    const place = savedPlaces.find(s => s.osm_id === osmId)
    if (!place) return
    await supabase.from('saved_places').delete().eq('id', place.id)
    setSavedPlaces(prev => prev.filter(s => s.osm_id !== osmId))
  }, [user, savedPlaces])

  // Search POIs
  const searchCategory = useCallback(async (categoryId: string) => {
    if (categoryId === 'saved') {
      if (activeCategory === 'saved') {
        clearMarkers()
        setActiveCategory(null)
        setPois([])
        setShowResults(false)
        return
      }
      setActiveCategory('saved')
      clearMarkers()
      const savedAsPois: POI[] = savedPlaces.map(s => ({
        id: s.osm_id,
        lat: s.lat,
        lon: s.lon,
        name: s.name,
        type: s.type,
        tags: s.tags,
        distance: haversine(selectedLocation.lat, selectedLocation.lon, s.lat, s.lon),
      }))
      setPois(savedAsPois)
      setShowResults(true)
      savedAsPois.forEach(poi => {
        const icon = createColorMarker('#f59e0b')
        const marker = L.marker([poi.lat, poi.lon], { icon })
          .addTo(mapRef.current!)
          .bindPopup(buildPopup([
            { tag: 'b', text: poi.name },
            { tag: 'span', text: '⭐ Saved', style: 'color:#f59e0b' },
          ]))
        marker.on('click', () => setSelectedPoi(poi))
        markersRef.current.push(marker)
      })
      if (savedAsPois.length > 0 && mapRef.current) {
        const group = L.featureGroup(markersRef.current)
        mapRef.current.fitBounds(group.getBounds().pad(0.1), { maxZoom: 16 })
      }
      return
    }

    if (activeCategory === categoryId) {
      clearMarkers()
      setActiveCategory(null)
      setPois([])
      setShowResults(false)
      return
    }

    setActiveCategory(categoryId)
    setLoading(true)
    setError(null)
    clearMarkers()
    setPois([])

    try {
      const results = await fetchPOIs(selectedLocation.lat, selectedLocation.lon, categoryId, radius)
      setPois(results)
      setShowResults(true)

      const cat = CATEGORIES.find(c => c.id === categoryId)!
      const icon = createColorMarker(cat.markerColor)

      results.forEach(poi => {
        const marker = L.marker([poi.lat, poi.lon], { icon })
          .addTo(mapRef.current!)
          .bindPopup(buildPopup([
            { tag: 'b', text: poi.name, style: 'font-size:13px' },
            { tag: 'span', text: poi.type.replace(/_/g, ' '), style: 'color:#666;font-size:11px;text-transform:capitalize' },
            { tag: 'span', text: `${poi.distance}m away`, style: 'color:#888;font-size:11px' },
          ]))
        marker.on('click', () => setSelectedPoi(poi))
        markersRef.current.push(marker)
      })

      if (results.length > 0 && mapRef.current) {
        const group = L.featureGroup(markersRef.current)
        mapRef.current.fitBounds(group.getBounds().pad(0.1), { maxZoom: 16 })
      }
    } catch {
      setError('Could not load places. Try again.')
    } finally {
      setLoading(false)
    }
  }, [activeCategory, selectedLocation, radius, clearMarkers, savedPlaces])

  const flyToPoi = (poi: POI) => {
    setSelectedPoi(poi)
    setRouteInfo(null)
    if (routeLayer && mapRef.current) { mapRef.current.removeLayer(routeLayer); setRouteLayer(null) }
    mapRef.current?.flyTo([poi.lat, poi.lon], 17, { duration: 0.8 })
  }

  const navigateToPoi = async (poi: POI) => {
    if (!mapRef.current) return
    setNavigating(true)
    if (routeLayer) { mapRef.current.removeLayer(routeLayer); setRouteLayer(null) }
    setRouteInfo(null)
    try {
      const { lat: fLat, lon: fLon } = selectedLocation
      const url = `https://router.project-osrm.org/route/v1/foot/${fLon},${fLat};${poi.lon},${poi.lat}?overview=full&geometries=geojson&steps=true`
      const res = await fetch(url)
      const data = await res.json()
      if (data.code !== 'Ok') throw new Error('No route')
      const route = data.routes[0]

      // Draw polyline
      const coords: [number, number][] = route.geometry.coordinates.map(([lon, lat]: [number, number]) => [lat, lon])
      const poly = L.polyline(coords, { color: '#2563EB', weight: 5, opacity: 0.85, lineCap: 'round', lineJoin: 'round' }).addTo(mapRef.current)
      setRouteLayer(poly)
      setRouteInfo({ distance: Math.round(route.distance), duration: Math.round(route.duration / 60) })
      mapRef.current.fitBounds(poly.getBounds().pad(0.15))

      // Parse steps
      const steps: NavStep[] = (route.legs[0]?.steps || []).map((step: any) => ({
        instruction: formatInstruction(step),
        distance: Math.round(step.distance),
        lat: step.maneuver.location[1],
        lon: step.maneuver.location[0],
        maneuverType: step.maneuver.type,
        maneuverModifier: step.maneuver.modifier || 'straight',
      }))
      setNavSteps(steps)
      setCurrentStepIdx(0)
      setNavMode(true)
    } catch {
      alert('Could not find a walking route.')
    } finally {
      setNavigating(false)
    }
  }

  const endNavigation = useCallback(() => {
    setNavMode(false)
    setNavSteps([])
    setCurrentStepIdx(0)
    setDistToNext(null)
    setShowNextTurns(false)
    if (routeLayer && mapRef.current) { mapRef.current.removeLayer(routeLayer); setRouteLayer(null) }
    setRouteInfo(null)
    if (watchIdRef.current !== null) { navigator.geolocation.clearWatch(watchIdRef.current); watchIdRef.current = null }
    if (userMarkerRef.current && mapRef.current) { mapRef.current.removeLayer(userMarkerRef.current); userMarkerRef.current = null }
    setUserPos(null)
  }, [routeLayer])

  const clearRoute = () => {
    if (routeLayer && mapRef.current) { mapRef.current.removeLayer(routeLayer); setRouteLayer(null) }
    setRouteInfo(null)
  }

  return (
    <div className="relative flex flex-col h-[calc(100vh-6rem)] bg-background overflow-hidden">

      {/* Waze-style Nav Banner */}
      <AnimatePresence>
        {navMode && navSteps.length > 0 && (
          <NavigationBanner
            steps={navSteps}
            currentStepIdx={currentStepIdx}
            distToNext={distToNext}
            showNextTurns={showNextTurns}
            onToggleNextTurns={() => setShowNextTurns(v => !v)}
            onEnd={endNavigation}
          />
        )}
      </AnimatePresence>

      {/* Top Bar + Location Picker */}
      {!navMode && (
        <LocationPicker
          selected={selectedLocation}
          locations={locations}
          hotels={trip.hotels}
          open={showLocationPicker}
          onToggle={() => setShowLocationPicker(v => !v)}
          onSelect={loc => { setSelectedLocation(loc); setShowLocationPicker(false) }}
          radius={radius}
          radiusOptions={RADIUS_OPTIONS}
          onRadiusChange={setRadius}
        />
      )}

      {/* Map */}
      <div ref={mapElRef} className="flex-1 w-full" style={{ zIndex: 1 }} />

      {/* Nav bottom ETA bar */}
      <AnimatePresence>
        {navMode && routeInfo && (
          <motion.div
            initial={{ y: 80 }}
            animate={{ y: 0 }}
            exit={{ y: 80 }}
            className="absolute bottom-[72px] left-0 right-0 z-[1002] bg-[#1a1a2e] border-t border-white/10 px-5 py-3 flex items-center justify-between"
          >
            <div className="text-center">
              <p className="text-white font-black text-lg leading-none">{routeInfo.duration} min</p>
              <p className="text-white/50 text-xs mt-0.5">walk</p>
            </div>
            <div className="text-center">
              <p className="text-white font-black text-lg leading-none">
                {routeInfo.distance >= 1000
                  ? `${(routeInfo.distance / 1000).toFixed(1)} km`
                  : `${routeInfo.distance} m`}
              </p>
              <p className="text-white/50 text-xs mt-0.5">total</p>
            </div>
            <div className="text-center">
              <p className="text-white font-bold text-lg leading-none">
                {(() => {
                  const eta = new Date(Date.now() + routeInfo.duration * 60000)
                  return eta.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                })()}
              </p>
              <p className="text-white/50 text-xs mt-0.5">arrival</p>
            </div>
            <button
              onClick={endNavigation}
              className="bg-red-500/20 text-red-400 text-xs font-bold px-4 py-2 rounded-xl"
            >
              End
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Category Filter Bar — fixed at bottom */}
      {!navMode && (
        <div className="absolute bottom-0 left-0 right-0 z-[1000] bg-background/95 backdrop-blur-md border-t border-border px-3 pt-2.5 pb-2.5">
          <div className="flex gap-3 overflow-x-auto scrollbar-hide">
            {CATEGORIES.map(cat => {
              const isActive = activeCategory === cat.id
              return (
                <button
                  key={cat.id}
                  onClick={() => searchCategory(cat.id)}
                  disabled={loading}
                  className="flex flex-col items-center gap-1 shrink-0 active:scale-90 transition-transform"
                >
                  <div
                    className="w-11 h-11 rounded-2xl flex items-center justify-center"
                    style={{
                      background: isActive ? cat.color : cat.color + '22',
                      boxShadow: isActive ? `0 3px 10px ${cat.color}55` : 'none',
                    }}
                  >
                    {loading && isActive
                      ? <Loader2 className="h-4.5 w-4.5 animate-spin text-white" />
                      : <cat.icon className="h-[18px] w-[18px]" style={{ color: isActive ? 'white' : cat.color }} />
                    }
                  </div>
                  <span className="text-[10px] font-medium leading-none" style={{ color: isActive ? cat.color : 'hsl(var(--muted-foreground))' }}>
                    {cat.label.split(' ')[0]}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* POI Results Sheet — slides up above filter bar */}
      {!navMode && (
        <AnimatePresence>
          {showResults && pois.length > 0 && (
            <motion.div
              initial={{ y: 300 }}
              animate={{ y: 0 }}
              exit={{ y: 300 }}
              transition={{ type: 'spring', damping: 25 }}
              className="absolute bottom-[72px] left-0 right-0 z-[999] bg-background/95 backdrop-blur-md border-t border-border max-h-56 overflow-y-auto"
            >
              <div className="flex items-center justify-between px-4 py-2 border-b border-border/50 sticky top-0 bg-background/95">
                <p className="text-sm font-semibold">{pois.length} places found</p>
                <button onClick={() => setShowResults(false)}>
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
              {pois.map(poi => {
                const cat = CATEGORIES.find(c => c.id === activeCategory)!
                return (
                  <button
                    key={poi.id}
                    onClick={() => flyToPoi(poi)}
                    className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-accent transition-colors border-b border-border/30 text-left ${selectedPoi?.id === poi.id ? 'bg-primary/5' : ''}`}
                  >
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: cat.markerColor + '20' }}>
                      <cat.icon className="h-4 w-4" style={{ color: cat.markerColor }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{poi.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{poi.type.replace(/_/g, ' ')} · {poi.distance}m away</p>
                    </div>
                    <Navigation className="h-4 w-4 text-muted-foreground shrink-0" />
                  </button>
                )
              })}
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* Error */}
      {!navMode && error && (
        <div className="absolute bottom-[80px] left-3 right-3 z-[999] px-4 py-2 bg-destructive/10 text-destructive text-sm rounded-xl text-center">
          {error}
        </div>
      )}

      {/* Selected POI Detail Card */}
      <AnimatePresence>
        {selectedPoi && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="absolute top-16 right-3 z-[1002] bg-background border border-border rounded-2xl shadow-xl p-4 max-w-[220px]"
          >
            <button
              onClick={() => setSelectedPoi(null)}
              className="absolute top-2 right-2 p-1 rounded-full hover:bg-accent"
            >
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
            <div className="pr-5">
              <p className="text-sm font-bold leading-tight">{selectedPoi.name}</p>
              <p className="text-xs text-muted-foreground capitalize mt-0.5">{selectedPoi.type.replace(/_/g, ' ')}</p>
              <p className="text-xs text-primary font-medium mt-1">{selectedPoi.distance}m away</p>
              {/* Save / Unsave button */}
              <button
                onClick={() => {
                  if (selectedPoi && isSaved(selectedPoi.id)) {
                    unsavePlace(selectedPoi.id)
                  } else if (selectedPoi) {
                    setSaveRating(5)
                    setSaveNotes('')
                    setSaveSheet(selectedPoi)
                  }
                }}
                className={`flex items-center gap-1.5 mt-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                  selectedPoi && isSaved(selectedPoi.id)
                    ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600'
                    : 'bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                {selectedPoi && isSaved(selectedPoi.id)
                  ? <><BookmarkCheck className="h-3.5 w-3.5" /> Saved</>
                  : <><Bookmark className="h-3.5 w-3.5" /> Save Place</>
                }
              </button>
              {selectedPoi && isSaved(selectedPoi.id) && (() => {
                const sp = savedPlaces.find(s => s.osm_id === selectedPoi.id)
                return sp ? (
                  <div className="flex gap-0.5 mt-1">
                    {[1,2,3,4,5].map(n => (
                      <Star key={n} className={`h-3 w-3 ${n <= sp.rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'}`} />
                    ))}
                  </div>
                ) : null
              })()}
              {selectedPoi.tags.opening_hours && (
                <p className="text-xs text-muted-foreground mt-1">🕐 {selectedPoi.tags.opening_hours}</p>
              )}
              {selectedPoi.tags.phone && (
                <p className="text-xs text-muted-foreground mt-0.5">📞 {selectedPoi.tags.phone}</p>
              )}
              {selectedPoi.tags.cuisine && (
                <p className="text-xs text-muted-foreground mt-0.5 capitalize">🍽 {selectedPoi.tags.cuisine}</p>
              )}
            </div>
            {routeInfo && (
              <div className="mt-2 flex gap-2">
                <span className="flex items-center gap-1 text-xs font-semibold text-primary">
                  <Footprints className="h-3 w-3" />{routeInfo.distance}m
                </span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />{routeInfo.duration} min walk
                </span>
              </div>
            )}
            <div className="mt-3 flex gap-2">
              {navMode ? (
                <button
                  onClick={endNavigation}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-destructive text-white text-xs font-bold"
                >
                  <X className="h-3.5 w-3.5" /> End Nav
                </button>
              ) : (
                <button
                  onClick={() => navigateToPoi(selectedPoi)}
                  disabled={navigating}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-primary text-white text-xs font-bold disabled:opacity-60"
                >
                  {navigating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Navigation className="h-3.5 w-3.5" />}
                  {navigating ? 'Routing…' : 'Navigate'}
                </button>
              )}
              {routeInfo && !navMode && (
                <button onClick={clearRoute} className="px-3 py-2 rounded-xl bg-muted text-xs font-medium">
                  Clear
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Save Place Sheet */}
      <AnimatePresence>
        {saveSheet && (
          <SavePlaceSheet
            poi={saveSheet}
            rating={saveRating}
            notes={saveNotes}
            saving={saving}
            onRatingChange={setSaveRating}
            onNotesChange={setSaveNotes}
            onCancel={() => setSaveSheet(null)}
            onSave={savePlace}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
