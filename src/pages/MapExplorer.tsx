import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import L from 'leaflet'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import { useTrip } from '@/contexts/TripContext'
import {
  MapPin, UtensilsCrossed, ShoppingBag, Camera, Gift,
  Bus, Pill, ChevronDown, Loader2, Navigation, X, Clock, Footprints,
  ArrowUp, ArrowLeft, ArrowRight, ArrowUpLeft, ArrowUpRight, RotateCcw
} from 'lucide-react'

// Fix Leaflet default icon issue with Vite
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
})

// ── Types ────────────────────────────────────────────────────

interface POI {
  id: number
  lat: number
  lon: number
  name: string
  type: string
  tags: Record<string, string>
  distance?: number
}

interface Location {
  name: string
  lat: number
  lon: number
  country: string
}

interface NavStep {
  instruction: string
  distance: number
  lat: number
  lon: number
  maneuverType: string
  maneuverModifier: string
}

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
]

const RADIUS_OPTIONS = [500, 1000, 1500, 2000]

// ── Overpass API ─────────────────────────────────────────────

async function fetchPOIs(lat: number, lon: number, categoryId: string, radius: number): Promise<POI[]> {
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

  return (data.elements as any[])
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

function TurnArrow({ modifier }: { modifier: string }) {
  const iconMap: Record<string, React.ComponentType<any>> = {
    left: ArrowLeft,
    right: ArrowRight,
    'slight left': ArrowUpLeft,
    'slight right': ArrowUpRight,
    straight: ArrowUp,
    uturn: RotateCcw,
  }
  const Icon = iconMap[modifier] || ArrowUp
  return <Icon className="h-7 w-7 text-white" strokeWidth={2.5} />
}

// ── Main Component ───────────────────────────────────────────

export default function MapExplorer() {
  const { trip } = useTrip()
  const mapRef = useRef<L.Map | null>(null)
  const mapElRef = useRef<HTMLDivElement>(null)
  const markersRef = useRef<L.Layer[]>([])
  const hotelMarkersRef = useRef<L.Layer[]>([])
  const watchIdRef = useRef<number | null>(null)
  const userMarkerRef = useRef<L.CircleMarker | null>(null)

  // Build location list from trip data
  const locations: Location[] = [
    ...trip.hotels.map(h => ({
      name: h.name,
      lat: h.name.includes('Dorsett') ? 22.3122 : 22.2015,
      lon: h.name.includes('Dorsett') ? 114.2265 : 113.5516,
      country: h.name.includes('Dorsett') ? 'Hong Kong' : 'Macau',
    })),
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
        .bindPopup(`<b>${loc.name}</b><br/>${loc.country}`)
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
        if (mapRef.current) {
          if (userMarkerRef.current) {
            userMarkerRef.current.setLatLng([lat, lon])
          } else {
            userMarkerRef.current = L.circleMarker([lat, lon], {
              radius: 10, fillColor: '#2563EB', color: 'white', weight: 3, fillOpacity: 1,
            }).addTo(mapRef.current)
          }
        }
        // Auto-advance step when within 25m of next step location
        setCurrentStepIdx(prev => {
          if (navSteps.length === 0 || prev >= navSteps.length - 1) return prev
          const next = navSteps[prev + 1]
          const dist = haversine(lat, lon, next.lat, next.lon)
          return dist < 25 ? prev + 1 : prev
        })
      },
      undefined,
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 15000 }
    )
    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current)
    }
  }, [navMode, navSteps])

  // Clear POI markers
  const clearMarkers = useCallback(() => {
    markersRef.current.forEach(m => mapRef.current?.removeLayer(m))
    markersRef.current = []
  }, [])

  // Search POIs
  const searchCategory = useCallback(async (categoryId: string) => {
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
          .bindPopup(`
            <div style="min-width:160px">
              <b style="font-size:13px">${poi.name}</b><br/>
              <span style="color:#666;font-size:11px;text-transform:capitalize">${poi.type.replace(/_/g, ' ')}</span><br/>
              <span style="color:#888;font-size:11px">${poi.distance}m away</span>
            </div>
          `)
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
  }, [activeCategory, selectedLocation, radius, clearMarkers])

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

      {/* Turn-by-turn Nav Banner */}
      <AnimatePresence>
        {navMode && navSteps.length > 0 && (
          <motion.div
            initial={{ y: -80 }}
            animate={{ y: 0 }}
            exit={{ y: -80 }}
            transition={{ type: 'spring', damping: 25 }}
            className="absolute top-0 left-0 right-0 z-[1003] bg-primary shadow-2xl"
          >
            <div className="flex items-center gap-3 px-4 pt-3 pb-2">
              <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
                <TurnArrow modifier={navSteps[currentStepIdx]?.maneuverModifier || 'straight'} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-bold text-base leading-tight">
                  {navSteps[currentStepIdx]?.instruction}
                </p>
                {navSteps[currentStepIdx]?.distance > 0 && (
                  <p className="text-white/70 text-xs mt-0.5">
                    {navSteps[currentStepIdx].distance}m
                    {currentStepIdx < navSteps.length - 1 && ` · then: ${navSteps[currentStepIdx + 1]?.instruction}`}
                  </p>
                )}
              </div>
              <button
                onClick={endNavigation}
                className="shrink-0 bg-white/20 text-white text-xs font-bold px-3 py-2 rounded-xl"
              >
                End
              </button>
            </div>
            {/* Progress bar */}
            <div className="flex items-center gap-2 px-4 pb-3">
              <div className="flex-1 h-1.5 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white rounded-full transition-all duration-500"
                  style={{ width: `${((currentStepIdx + 1) / Math.max(navSteps.length, 1)) * 100}%` }}
                />
              </div>
              <span className="text-white/60 text-[10px] font-medium">{currentStepIdx + 1}/{navSteps.length}</span>
            </div>
            {/* Manual next step button (for when no GPS) */}
            {!userPos && currentStepIdx < navSteps.length - 1 && (
              <button
                onClick={() => setCurrentStepIdx(i => Math.min(i + 1, navSteps.length - 1))}
                className="w-full text-center text-white/60 text-xs pb-2 hover:text-white/90"
              >
                Tap to advance step manually
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 z-[1000] p-3 flex gap-2" style={{ top: navMode && navSteps.length > 0 ? undefined : 0 }}>
        {/* Location Picker */}
        <button
          onClick={() => setShowLocationPicker(v => !v)}
          className="flex-1 flex items-center gap-2 bg-background/95 backdrop-blur-md border border-border rounded-xl px-3 py-2.5 shadow-lg"
        >
          <MapPin className="h-4 w-4 text-primary shrink-0" />
          <div className="flex-1 text-left min-w-0">
            <p className="text-xs text-muted-foreground leading-none">Exploring near</p>
            <p className="text-sm font-semibold truncate">{selectedLocation.name}</p>
          </div>
          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${showLocationPicker ? 'rotate-180' : ''}`} />
        </button>

        {/* Radius */}
        <select
          value={radius}
          onChange={e => setRadius(Number(e.target.value))}
          className="bg-background/95 backdrop-blur-md border border-border rounded-xl px-2 py-2.5 text-sm font-medium shadow-lg text-foreground"
        >
          {RADIUS_OPTIONS.map(r => (
            <option key={r} value={r}>{r}m</option>
          ))}
        </select>
      </div>

      {/* Location Picker Dropdown */}
      <AnimatePresence>
        {showLocationPicker && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="absolute top-[60px] left-3 right-3 z-[1001] bg-background border border-border rounded-2xl shadow-xl overflow-hidden"
          >
            {locations.map(loc => (
              <button
                key={loc.name}
                onClick={() => { setSelectedLocation(loc); setShowLocationPicker(false) }}
                className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-accent transition-colors text-left ${selectedLocation.name === loc.name ? 'bg-primary/10' : ''}`}
              >
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm ${trip.hotels.some(h => h.name === loc.name) ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-muted'}`}>
                  {trip.hotels.some(h => h.name === loc.name) ? '🏨' : '📍'}
                </div>
                <div>
                  <p className="text-sm font-medium">{loc.name}</p>
                  <p className="text-xs text-muted-foreground">{loc.country}</p>
                </div>
                {selectedLocation.name === loc.name && <div className="ml-auto w-2 h-2 rounded-full bg-primary" />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Map */}
      <div ref={mapElRef} className="flex-1 w-full" style={{ zIndex: 1 }} />

      {/* Category Filter Bar */}
      <div className="absolute bottom-0 left-0 right-0 z-[1000]">

        {/* POI Results Sheet */}
        <AnimatePresence>
          {showResults && pois.length > 0 && (
            <motion.div
              initial={{ y: 300 }}
              animate={{ y: 0 }}
              exit={{ y: 300 }}
              transition={{ type: 'spring', damping: 25 }}
              className="bg-background/95 backdrop-blur-md border-t border-border max-h-64 overflow-y-auto"
            >
              <div className="flex items-center justify-between px-4 py-2 border-b border-border/50">
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

        {/* Error */}
        {error && (
          <div className="mx-3 mb-2 px-4 py-2 bg-destructive/10 text-destructive text-sm rounded-xl text-center">
            {error}
          </div>
        )}

        {/* Category Buttons */}
        <div className="bg-background/95 backdrop-blur-md border-t border-border px-3 py-3">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
            {CATEGORIES.map(cat => {
              const isActive = activeCategory === cat.id
              return (
                <button
                  key={cat.id}
                  onClick={() => searchCategory(cat.id)}
                  disabled={loading}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all shrink-0 border"
                  style={{
                    background: isActive ? cat.color : 'transparent',
                    borderColor: isActive ? cat.color : 'var(--border)',
                    color: isActive ? 'white' : cat.color,
                  }}
                >
                  {loading && isActive
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <cat.icon className="h-3.5 w-3.5" />
                  }
                  {cat.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

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
    </div>
  )
}
