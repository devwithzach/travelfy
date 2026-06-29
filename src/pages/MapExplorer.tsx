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
  Bookmark, BookmarkCheck, Star, LocateFixed, MapPin
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
    label: 'Food',
    icon: UtensilsCrossed,
    color: '#f97316',
    markerColor: '#f97316',
    query: `nwr["amenity"~"restaurant|cafe|fast_food|food_court|bar|pub|bakery"](around:{R},{LAT},{LON});`,
  },
  {
    id: 'shopping',
    label: 'Malls',
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
    label: 'Pharmacy',
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

// ── Distance helpers ─────────────────────────────────────────

function fmtDist(m: number): string {
  return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${m} m`
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
  const posWatchRef = useRef<number | null>(null)
  const userMarkerRef = useRef<L.CircleMarker | null>(null)
  const savedMarkersRef = useRef<L.Layer[]>([])

  // Geocoded hotel coords (lazily populated when mapsUrl doesn't contain coords)
  const [geocodedHotels, setGeocodedHotels] = useState<Record<string, { lat: number; lon: number }>>({})

  // GPS state
  const [userPos, setUserPos] = useState<[number, number] | null>(null)
  const [userLocName, setUserLocName] = useState<string>('My Location')
  const [autoLocating, setAutoLocating] = useState(true)

  // Geocode any hotel whose mapsUrl doesn't yield coords.
  useEffect(() => {
    let cancelled = false
    trip.hotels.forEach(h => {
      if (parseMapsUrl(h.mapsUrl)) return
      if (geocodedHotels[h.id]) return
      const candidates = [
        [h.name, h.address].filter(Boolean).join(', '),
        [h.name, trip.tripInfo.destination].filter(Boolean).join(', '),
        h.address,
        h.name,
      ].filter((q): q is string => !!q && q.trim().length > 0)
      ;(async () => {
        for (const query of candidates) {
          const result = await geocodeAddress(query)
          if (cancelled) return
          if (result) {
            setGeocodedHotels(prev => ({ ...prev, [h.id]: result }))
            return
          }
        }
        console.warn('[MapExplorer] geocode failed for hotel:', h.name, candidates)
      })()
    })
    return () => { cancelled = true }
  }, [trip.hotels, trip.tripInfo.destination])

  // Build location list: My Location first, then trip hotels only
  const myLocationEntry: Location = {
    name: userLocName,
    lat: userPos?.[0] ?? 0,
    lon: userPos?.[1] ?? 0,
    country: '',
  }

  const hotelLocations: Location[] = trip.hotels
    .map(h => {
      const coords = parseMapsUrl(h.mapsUrl) ?? geocodedHotels[h.id]
      if (!coords) return null
      return { name: h.name, lat: coords.lat, lon: coords.lon, country: '' }
    })
    .filter((l): l is Location => l !== null)

  const locations: Location[] = [myLocationEntry, ...hotelLocations]

  // Default: first hotel if GPS not yet resolved, else My Location
  const defaultLocation: Location =
    hotelLocations.length > 0
      ? hotelLocations[0]
      : { name: 'Current Location', lat: 0, lon: 0, country: '' }

  const [selectedLocation, setSelectedLocation] = useState<Location>(defaultLocation)
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
  const [distToNext, setDistToNext] = useState<number | null>(null)
  const [showNextTurns, setShowNextTurns] = useState(false)

  // Save & Rate state
  const [savedPlaces, setSavedPlaces] = useState<SavedPlace[]>([])
  const [saveSheet, setSaveSheet] = useState<POI | null>(null)
  const [saveRating, setSaveRating] = useState(5)
  const [saveNotes, setSaveNotes] = useState('')
  const [saving, setSaving] = useState(false)

  // ── Auto-locate on mount (one-time + persistent watch) ──────
  useEffect(() => {
    if (!navigator.geolocation) {
      setAutoLocating(false)
      return
    }

    // One-time high-accuracy fix to pan map immediately
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude
        const lon = pos.coords.longitude
        setUserPos([lat, lon])
        setAutoLocating(false)
        if (mapRef.current) {
          mapRef.current.setView([lat, lon], 15)
          if (!userMarkerRef.current) {
            userMarkerRef.current = L.circleMarker([lat, lon], {
              radius: 10, fillColor: '#2563EB', color: 'white', weight: 3, fillOpacity: 1,
            }).addTo(mapRef.current)
          } else {
            userMarkerRef.current.setLatLng([lat, lon])
          }
        }
        // Set as explore center
        setSelectedLocation({ name: userLocName, lat, lon, country: '' })
      },
      () => setAutoLocating(false),
      { enableHighAccuracy: true, timeout: 12000 },
    )

    // Persistent low-frequency watch for live distances
    posWatchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const lat = pos.coords.latitude
        const lon = pos.coords.longitude
        setUserPos([lat, lon])
        if (userMarkerRef.current) {
          userMarkerRef.current.setLatLng([lat, lon])
        } else if (mapRef.current) {
          userMarkerRef.current = L.circleMarker([lat, lon], {
            radius: 10, fillColor: '#2563EB', color: 'white', weight: 3, fillOpacity: 1,
          }).addTo(mapRef.current)
        }
      },
      () => {},
      { enableHighAccuracy: false, maximumAge: 15000, timeout: 20000 },
    )

    return () => {
      if (posWatchRef.current !== null) navigator.geolocation.clearWatch(posWatchRef.current)
    }
  }, []) // once on mount only

  // Distance from user (GPS-first, fallback to selectedLocation)
  const distFromUser = useCallback((poi: POI): number => {
    if (userPos) return haversine(userPos[0], userPos[1], poi.lat, poi.lon)
    return poi.distance ?? haversine(selectedLocation.lat, selectedLocation.lon, poi.lat, poi.lon)
  }, [userPos, selectedLocation])

  // Init map
  useEffect(() => {
    if (!mapElRef.current || mapRef.current) return

    const map = L.map(mapElRef.current, {
      center: [selectedLocation.lat || 22.3193, selectedLocation.lon || 114.1694],
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

    trip.hotels.forEach(h => {
      const coords = parseMapsUrl(h.mapsUrl) ?? geocodedHotels[h.id]
      if (!coords) return
      const m = L.marker([coords.lat, coords.lon], { icon: createHotelMarker() })
        .addTo(mapRef.current!)
        .bindPopup(buildPopup([
          { tag: 'b', text: h.name },
          { tag: 'span', text: h.address || '' },
        ]))
      hotelMarkersRef.current.push(m)
    })
  }, [trip.hotels, geocodedHotels])

  // Fly to selected location
  useEffect(() => {
    if (!mapRef.current) return
    if (!selectedLocation.lat && !selectedLocation.lon) return
    mapRef.current.flyTo([selectedLocation.lat, selectedLocation.lon], 15, { duration: 1.2 })
    setPois([])
    setActiveCategory(null)
    setShowResults(false)
  }, [selectedLocation])

  // Geolocation tracking during nav (high-accuracy, separate from posWatchRef)
  useEffect(() => {
    if (!navMode || !navigator.geolocation) return
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const lat = pos.coords.latitude
        const lon = pos.coords.longitude
        setUserPos([lat, lon])

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
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 15000 },
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
      // Use user GPS position as origin if available, else selectedLocation
      const fLat = userPos ? userPos[0] : selectedLocation.lat
      const fLon = userPos ? userPos[1] : selectedLocation.lon
      const url = `https://router.project-osrm.org/route/v1/foot/${fLon},${fLat};${poi.lon},${poi.lat}?overview=full&geometries=geojson&steps=true`
      const res = await fetch(url)
      const data = await res.json()
      if (data.code !== 'Ok') throw new Error('No route')
      const route = data.routes[0]

      const coords: [number, number][] = route.geometry.coordinates.map(([lon, lat]: [number, number]) => [lat, lon])
      const poly = L.polyline(coords, { color: '#2563EB', weight: 5, opacity: 0.85, lineCap: 'round', lineJoin: 'round' }).addTo(mapRef.current)
      setRouteLayer(poly)
      setRouteInfo({ distance: Math.round(route.distance), duration: Math.round(route.duration / 60) })
      mapRef.current.fitBounds(poly.getBounds().pad(0.15))

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
  }, [routeLayer])

  const clearRoute = () => {
    if (routeLayer && mapRef.current) { mapRef.current.removeLayer(routeLayer); setRouteLayer(null) }
    setRouteInfo(null)
  }

  const locateMe = useCallback(() => {
    if (!navigator.geolocation || !mapRef.current) return
    if (userPos) {
      mapRef.current.flyTo(userPos, 16, { duration: 1 })
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude
        const lon = pos.coords.longitude
        setUserPos([lat, lon])
        if (!mapRef.current) return
        mapRef.current.flyTo([lat, lon], 16, { duration: 1 })
        if (userMarkerRef.current) {
          userMarkerRef.current.setLatLng([lat, lon])
        } else {
          userMarkerRef.current = L.circleMarker([lat, lon], {
            radius: 10, fillColor: '#2563EB', color: 'white', weight: 3, fillOpacity: 1,
          }).addTo(mapRef.current)
        }
      },
      () => {},
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 10000 },
    )
  }, [userPos])

  // ── Computed: sorted pois by distance from user ──────────────
  const sortedPois = [...pois].sort((a, b) => distFromUser(a) - distFromUser(b))

  const distanceLabel = userPos ? 'from your location' : `from ${selectedLocation.name}`

  // ── RENDER ────────────────────────────────────────────────────
  return (
    <div className="relative h-[calc(100vh-56px)] bg-background overflow-hidden">

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

      {/* ── Floating Top Bar ── */}
      {!navMode && (
        <div className="absolute top-3 left-3 right-3 z-[1010]">
          <div className="flex gap-2">
            {/* Location pill */}
            <button
              onClick={() => setShowLocationPicker(v => !v)}
              className="flex-1 flex items-center gap-2.5 bg-background/90 backdrop-blur-xl border border-border/60 rounded-2xl px-3.5 py-2.5 shadow-lg shadow-black/10"
            >
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                {autoLocating
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                  : <MapPin className="h-3.5 w-3.5 text-primary" />
                }
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="text-[10px] text-muted-foreground leading-none mb-0.5">Exploring near</p>
                <p className="text-sm font-semibold truncate leading-tight">
                  {autoLocating ? 'Locating…' : selectedLocation.name}
                </p>
              </div>
              <svg className={`h-4 w-4 text-muted-foreground transition-transform shrink-0 ${showLocationPicker ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Radius selector */}
            <select
              value={radius}
              onChange={e => setRadius(Number(e.target.value))}
              aria-label="Search radius"
              className="bg-background/90 backdrop-blur-xl border border-border/60 rounded-2xl px-3 py-2.5 text-sm font-semibold shadow-lg shadow-black/10 text-foreground"
            >
              {RADIUS_OPTIONS.map(r => (
                <option key={r} value={r}>
                  {r >= 1000 ? `${r / 1000}km` : `${r}m`}
                </option>
              ))}
            </select>
          </div>

          {/* Location picker dropdown */}
          <AnimatePresence>
            {showLocationPicker && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.97 }}
                transition={{ duration: 0.15 }}
                className="mt-2 bg-background border border-border rounded-2xl shadow-2xl overflow-hidden"
              >
                {locations.map(loc => {
                  const isHotel = trip.hotels.some(h => h.name === loc.name)
                  const isGps = loc.name === userLocName || loc.name === 'My Location'
                  const isSelected = selectedLocation.name === loc.name
                  return (
                    <button
                      key={loc.name}
                      onClick={() => {
                        setSelectedLocation(loc)
                        setShowLocationPicker(false)
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-accent transition-colors text-left ${isSelected ? 'bg-primary/8' : ''}`}
                    >
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm shrink-0 ${
                        isGps ? 'bg-blue-100 dark:bg-blue-900/30' :
                        isHotel ? 'bg-indigo-100 dark:bg-indigo-900/30' : 'bg-muted'
                      }`}>
                        {isGps ? '🎯' : isHotel ? '🏨' : '📍'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{loc.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {isGps ? 'GPS · Live location' : loc.country || 'Hotel'}
                        </p>
                      </div>
                      {isSelected && <div className="w-2 h-2 rounded-full bg-primary shrink-0" />}
                    </button>
                  )
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ── Map Canvas ── */}
      <div ref={mapElRef} className="absolute inset-0" style={{ zIndex: 1 }} />

      {/* ── Locate FAB ── */}
      {!navMode && (
        <button
          onClick={locateMe}
          aria-label="Center on my location"
          className="absolute right-3 z-[1005] w-11 h-11 rounded-full bg-background border border-border shadow-lg flex items-center justify-center active:scale-95 transition-transform"
          style={{ bottom: showResults ? '292px' : '156px' }}
        >
          <LocateFixed className={`h-5 w-5 ${userPos ? 'text-primary' : 'text-muted-foreground'}`} />
        </button>
      )}

      {/* ── Nav ETA bar ── */}
      <AnimatePresence>
        {navMode && routeInfo && (
          <motion.div
            initial={{ y: 80 }}
            animate={{ y: 0 }}
            exit={{ y: 80 }}
            className="absolute bottom-0 left-0 right-0 z-[1002] bg-[#1a1a2e] border-t border-white/10 px-5 py-4 flex items-center justify-between"
          >
            <div className="text-center">
              <p className="text-white font-black text-xl leading-none">{routeInfo.duration} min</p>
              <p className="text-white/50 text-xs mt-0.5">walk</p>
            </div>
            <div className="text-center">
              <p className="text-white font-black text-xl leading-none">{fmtDist(routeInfo.distance)}</p>
              <p className="text-white/50 text-xs mt-0.5">total</p>
            </div>
            <div className="text-center">
              <p className="text-white font-bold text-xl leading-none">
                {(() => {
                  const eta = new Date(Date.now() + routeInfo.duration * 60000)
                  return eta.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                })()}
              </p>
              <p className="text-white/50 text-xs mt-0.5">arrival</p>
            </div>
            <button
              onClick={endNavigation}
              className="bg-red-500/20 text-red-400 text-sm font-bold px-5 py-2.5 rounded-xl"
            >
              End
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Bottom Panel (categories + results) ── */}
      {!navMode && (
        <div className="absolute bottom-0 left-0 right-0 z-[1005] bg-background rounded-t-3xl shadow-2xl border-t border-border">
          {/* Drag handle */}
          <div className="flex justify-center pt-2.5 pb-1">
            <div className="w-10 h-1 bg-border rounded-full" />
          </div>

          {/* Category strip */}
          <div className="px-3 pb-3 pt-1">
            <div className="flex gap-2.5 overflow-x-auto scrollbar-hide pb-1">
              {CATEGORIES.map(cat => {
                const isActive = activeCategory === cat.id
                return (
                  <button
                    key={cat.id}
                    onClick={() => searchCategory(cat.id)}
                    disabled={loading && activeCategory !== cat.id}
                    className="flex flex-col items-center gap-1.5 shrink-0 active:scale-90 transition-transform min-w-[52px]"
                  >
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center transition-all"
                      style={{
                        background: isActive ? cat.color : cat.color + '18',
                        boxShadow: isActive ? `0 4px 14px ${cat.color}55` : 'none',
                      }}
                    >
                      {loading && isActive
                        ? <Loader2 className="h-5 w-5 animate-spin text-white" />
                        : <cat.icon
                            className="h-5 w-5"
                            style={{ color: isActive ? 'white' : cat.color }}
                          />
                      }
                    </div>
                    <span
                      className="text-[10px] font-medium leading-none text-center"
                      style={{ color: isActive ? cat.color : 'hsl(var(--muted-foreground))' }}
                    >
                      {cat.label}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Results list (slides in when available) */}
          <AnimatePresence>
            {showResults && sortedPois.length > 0 && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ type: 'spring', damping: 28, stiffness: 260 }}
                className="overflow-hidden"
              >
                {/* Results header */}
                <div className="flex items-center justify-between px-4 py-2 border-t border-border/50">
                  <p className="text-xs font-semibold text-muted-foreground">
                    {sortedPois.length} places · {distanceLabel}
                  </p>
                  <button onClick={() => setShowResults(false)} className="p-1 rounded-full hover:bg-accent">
                    <X className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                </div>

                {/* Scrollable results */}
                <div className="max-h-[240px] overflow-y-auto">
                  {sortedPois.map(poi => {
                    const cat = CATEGORIES.find(c => c.id === activeCategory)!
                    const d = distFromUser(poi)
                    const isThisSelected = selectedPoi?.id === poi.id
                    return (
                      <button
                        key={poi.id}
                        onClick={() => flyToPoi(poi)}
                        className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-accent transition-colors border-b border-border/20 text-left ${isThisSelected ? 'bg-primary/5' : ''}`}
                      >
                        {/* Icon */}
                        <div
                          className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                          style={{ background: cat.markerColor + '18' }}
                        >
                          <cat.icon className="h-5 w-5" style={{ color: cat.markerColor }} />
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">{poi.name}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span
                              className="text-[10px] font-medium px-1.5 py-0.5 rounded-md capitalize"
                              style={{ background: cat.markerColor + '18', color: cat.markerColor }}
                            >
                              {poi.type.replace(/_/g, ' ')}
                            </span>
                            {poi.tags.opening_hours && (
                              <span className="text-[10px] text-emerald-600 font-medium">· open</span>
                            )}
                          </div>
                        </div>

                        {/* Distance (right-aligned) */}
                        <div className="flex flex-col items-end shrink-0 gap-1">
                          <span className="text-sm font-bold text-primary">{fmtDist(d)}</span>
                          <Navigation className="h-3.5 w-3.5 text-muted-foreground" />
                        </div>
                      </button>
                    )
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ── POI Detail Bottom Sheet ── */}
      <AnimatePresence>
        {selectedPoi && !navMode && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 260 }}
            className="absolute left-0 right-0 z-[1020] bg-background rounded-t-3xl shadow-2xl border-t border-border"
            style={{ bottom: showResults ? '0' : '0' }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-2.5 pb-1">
              <div className="w-10 h-1 bg-border rounded-full" />
            </div>

            <div className="px-5 pb-6 pt-2">
              {/* Close */}
              <button
                onClick={() => setSelectedPoi(null)}
                className="absolute top-4 right-4 w-7 h-7 rounded-full bg-muted flex items-center justify-center"
              >
                <X className="h-3.5 w-3.5 text-muted-foreground" />
              </button>

              {/* Name + type */}
              <div className="pr-8 mb-3">
                <h3 className="text-base font-bold leading-snug">{selectedPoi.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  {(() => {
                    const cat = CATEGORIES.find(c => c.id === activeCategory)
                    return cat ? (
                      <span
                        className="text-[11px] font-semibold px-2 py-0.5 rounded-lg capitalize"
                        style={{ background: cat.markerColor + '20', color: cat.markerColor }}
                      >
                        {selectedPoi.type.replace(/_/g, ' ')}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground capitalize">{selectedPoi.type.replace(/_/g, ' ')}</span>
                    )
                  })()}
                  {/* Live distance */}
                  <span className="text-sm font-bold text-emerald-600">
                    {fmtDist(distFromUser(selectedPoi))}
                  </span>
                  <span className="text-xs text-muted-foreground">away</span>
                </div>
              </div>

              {/* Details row */}
              <div className="flex flex-wrap gap-x-4 gap-y-1 mb-3">
                {selectedPoi.tags.opening_hours && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    🕐 {selectedPoi.tags.opening_hours}
                  </span>
                )}
                {selectedPoi.tags.cuisine && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground capitalize">
                    🍽 {selectedPoi.tags.cuisine}
                  </span>
                )}
                {selectedPoi.tags.phone && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    📞 {selectedPoi.tags.phone}
                  </span>
                )}
              </div>

              {/* Saved rating */}
              {isSaved(selectedPoi.id) && (() => {
                const sp = savedPlaces.find(s => s.osm_id === selectedPoi.id)
                return sp ? (
                  <div className="flex gap-0.5 mb-3">
                    {[1, 2, 3, 4, 5].map(n => (
                      <Star key={n} className={`h-4 w-4 ${n <= sp.rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'}`} />
                    ))}
                  </div>
                ) : null
              })()}

              {/* Route summary if available */}
              {routeInfo && (
                <div className="flex items-center gap-3 bg-primary/5 rounded-xl px-3 py-2 mb-3">
                  <Footprints className="h-4 w-4 text-primary shrink-0" />
                  <span className="text-sm font-semibold text-primary">{fmtDist(routeInfo.distance)}</span>
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{routeInfo.duration} min walk</span>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-2.5">
                {/* Save/Unsave */}
                <button
                  onClick={() => {
                    if (isSaved(selectedPoi.id)) {
                      unsavePlace(selectedPoi.id)
                    } else {
                      setSaveRating(5)
                      setSaveNotes('')
                      setSaveSheet(selectedPoi)
                    }
                  }}
                  className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                    isSaved(selectedPoi.id)
                      ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600'
                      : 'bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {isSaved(selectedPoi.id)
                    ? <><BookmarkCheck className="h-4 w-4" /> Saved</>
                    : <><Bookmark className="h-4 w-4" /> Save</>
                  }
                </button>

                {/* Navigate / End Nav */}
                {navMode ? (
                  <button
                    onClick={endNavigation}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-destructive text-white text-sm font-bold"
                  >
                    <X className="h-4 w-4" /> End Navigation
                  </button>
                ) : (
                  <button
                    onClick={() => navigateToPoi(selectedPoi)}
                    disabled={navigating}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-white text-sm font-bold disabled:opacity-60"
                  >
                    {navigating
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <Navigation className="h-4 w-4" />
                    }
                    {navigating ? 'Routing…' : 'Navigate →'}
                  </button>
                )}

                {/* Clear route */}
                {routeInfo && !navMode && (
                  <button onClick={clearRoute} className="px-3 py-2.5 rounded-xl bg-muted text-xs font-medium">
                    Clear
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Error toast ── */}
      {!navMode && error && (
        <div className="absolute top-24 left-3 right-3 z-[1025] px-4 py-2.5 bg-destructive/10 text-destructive text-sm rounded-xl text-center shadow-lg">
          {error}
          <button onClick={() => setError(null)} className="ml-2 font-bold">✕</button>
        </div>
      )}

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
