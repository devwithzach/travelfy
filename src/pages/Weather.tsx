import { useState, useEffect, useCallback } from 'react'
import { Cloud, Wind, Droplets, Thermometer, RefreshCw, ExternalLink, AlertTriangle, Info } from 'lucide-react'
import { useTrip } from '@/contexts/TripContext'
import { geocodeAddress } from '@/components/map/geocode'
import PageHeader from '@/components/common/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/utils/cn'

// WMO weather interpretation codes → display
const WMO: Record<number, { label: string; emoji: string }> = {
  0:  { label: 'Clear sky',         emoji: '☀️' },
  1:  { label: 'Mainly clear',      emoji: '🌤️' },
  2:  { label: 'Partly cloudy',     emoji: '⛅' },
  3:  { label: 'Overcast',          emoji: '🌥️' },
  45: { label: 'Foggy',             emoji: '🌫️' },
  48: { label: 'Icy fog',           emoji: '🌫️' },
  51: { label: 'Light drizzle',     emoji: '🌦️' },
  53: { label: 'Drizzle',           emoji: '🌦️' },
  55: { label: 'Heavy drizzle',     emoji: '🌧️' },
  61: { label: 'Light rain',        emoji: '🌧️' },
  63: { label: 'Moderate rain',     emoji: '🌧️' },
  65: { label: 'Heavy rain',        emoji: '🌧️' },
  71: { label: 'Light snow',        emoji: '🌨️' },
  73: { label: 'Moderate snow',     emoji: '❄️' },
  75: { label: 'Heavy snow',        emoji: '❄️' },
  80: { label: 'Rain showers',      emoji: '🌦️' },
  81: { label: 'Rain showers',      emoji: '🌧️' },
  82: { label: 'Heavy showers',     emoji: '🌧️' },
  95: { label: 'Thunderstorm',      emoji: '⛈️' },
  96: { label: 'Storm + hail',      emoji: '⛈️' },
  99: { label: 'Severe storm',      emoji: '⛈️' },
}

function wmo(code: number) {
  return WMO[code] ?? { label: 'Unknown', emoji: '🌡️' }
}

function parseLocalDate(s: string) {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

interface WeatherData {
  lat: number
  lon: number
  location: string
  current: {
    temp: number
    feelsLike: number
    humidity: number
    windSpeed: number
    code: number
  }
  daily: Array<{
    date: string
    code: number
    min: number
    max: number
    precipProb: number
  }>
  fetchedAt: number
}

const CACHE_KEY = 'travelfy-weather-v1'
const CACHE_TTL = 1000 * 60 * 60 // 1h

function readCached(location: string): WeatherData | null {
  try {
    const raw = localStorage.getItem(`${CACHE_KEY}-${location}`)
    if (!raw) return null
    const d = JSON.parse(raw) as WeatherData
    if (Date.now() - d.fetchedAt > CACHE_TTL) return null
    return d
  } catch { return null }
}

function writeCache(location: string, data: WeatherData) {
  try { localStorage.setItem(`${CACHE_KEY}-${location}`, JSON.stringify(data)) } catch { /* noop */ }
}

// Typhoon season: June (5) – November (10)
function isTyphoonSeason() {
  const m = new Date().getMonth()
  return m >= 5 && m <= 10
}

function isPeakTyphoonSeason() {
  const m = new Date().getMonth()
  return m >= 6 && m <= 9 // July–October
}

export default function Weather() {
  const { trip } = useTrip()
  const destination = trip.tripInfo.destination

  const [data, setData] = useState<WeatherData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchWeather = useCallback(async (bust = false) => {
    if (!destination) return
    const cacheKey = destination.toLowerCase()
    if (!bust) {
      const cached = readCached(cacheKey)
      if (cached) { setData(cached); return }
    }

    setLoading(true)
    setError(null)

    try {
      const coords = await geocodeAddress(destination)
      if (!coords) throw new Error(`Could not locate "${destination}"`)

      const url = new URL('https://api.open-meteo.com/v1/forecast')
      url.searchParams.set('latitude', coords.lat.toFixed(4))
      url.searchParams.set('longitude', coords.lon.toFixed(4))
      url.searchParams.set('current', 'temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code')
      url.searchParams.set('daily', 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max')
      url.searchParams.set('timezone', 'Asia/Manila')
      url.searchParams.set('forecast_days', '7')

      const res = await fetch(url.toString())
      if (!res.ok) throw new Error('Weather fetch failed')
      const json = await res.json() as {
        current: { temperature_2m: number; apparent_temperature: number; relative_humidity_2m: number; wind_speed_10m: number; weather_code: number }
        daily: { time: string[]; weather_code: number[]; temperature_2m_max: number[]; temperature_2m_min: number[]; precipitation_probability_max: number[] }
      }

      const result: WeatherData = {
        lat: coords.lat,
        lon: coords.lon,
        location: destination,
        current: {
          temp: Math.round(json.current.temperature_2m),
          feelsLike: Math.round(json.current.apparent_temperature),
          humidity: json.current.relative_humidity_2m,
          windSpeed: Math.round(json.current.wind_speed_10m),
          code: json.current.weather_code,
        },
        daily: json.daily.time.map((date, i) => ({
          date,
          code: json.daily.weather_code[i],
          min: Math.round(json.daily.temperature_2m_min[i]),
          max: Math.round(json.daily.temperature_2m_max[i]),
          precipProb: json.daily.precipitation_probability_max[i] ?? 0,
        })),
        fetchedAt: Date.now(),
      }

      writeCache(cacheKey, result)
      setData(result)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load weather')
    } finally {
      setLoading(false)
    }
  }, [destination])

  useEffect(() => { fetchWeather() }, [fetchWeather])

  const cur = data?.current
  const curWmo = cur ? wmo(cur.code) : null
  const lastFetched = data ? new Date(data.fetchedAt).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' }) : null

  return (
    <div>
      <PageHeader
        title="Weather"
        subtitle={destination || 'No destination set'}
        icon={Cloud}
        action={
          <Button size="icon-sm" variant="ghost" onClick={() => fetchWeather(true)} disabled={loading}>
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          </Button>
        }
      />

      <div className="px-4 space-y-3 pb-6">
        {/* Typhoon season banner */}
        {isTyphoonSeason() && (
          <Card className={cn('border-0', isPeakTyphoonSeason() ? 'bg-red-500/10' : 'bg-amber-500/10')}>
            <CardContent className="p-4 flex gap-3">
              <AlertTriangle className={cn('h-5 w-5 shrink-0 mt-0.5', isPeakTyphoonSeason() ? 'text-red-500' : 'text-amber-500')} />
              <div>
                <p className={cn('text-sm font-bold', isPeakTyphoonSeason() ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400')}>
                  {isPeakTyphoonSeason() ? 'Peak Typhoon Season' : 'Typhoon Season Active'}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  {isPeakTyphoonSeason()
                    ? 'July–October is peak season. Monitor PAGASA daily for storm signal updates before traveling.'
                    : 'June–November is typhoon season in the Philippines. Check PAGASA for active advisories.'
                  }
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* No destination */}
        {!destination && (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground text-sm">
              Set a trip destination to load weather forecasts.
            </CardContent>
          </Card>
        )}

        {/* Error */}
        {error && (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="p-4 text-sm text-destructive flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {error}
            </CardContent>
          </Card>
        )}

        {/* Loading skeleton */}
        {loading && !data && (
          <Card>
            <CardContent className="p-6 flex flex-col items-center gap-3">
              <RefreshCw className="h-8 w-8 text-muted-foreground/30 animate-spin" />
              <p className="text-sm text-muted-foreground">Fetching weather for {destination}…</p>
            </CardContent>
          </Card>
        )}

        {/* Current weather */}
        {cur && curWmo && (
          <Card className="overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-sky-400 to-blue-600" />
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-6xl leading-none mb-2">{curWmo.emoji}</div>
                  <div className="text-4xl font-bold tabular-nums">{cur.temp}°C</div>
                  <div className="text-sm text-muted-foreground mt-1">{curWmo.label}</div>
                  <div className="text-xs text-muted-foreground">Feels like {cur.feelsLike}°C</div>
                </div>
                <div className="text-right space-y-2 mt-2">
                  <div className="flex items-center gap-1.5 justify-end text-xs text-muted-foreground">
                    <Droplets className="h-3.5 w-3.5 text-blue-400" />
                    <span className="tabular-nums">{cur.humidity}%</span>
                  </div>
                  <div className="flex items-center gap-1.5 justify-end text-xs text-muted-foreground">
                    <Wind className="h-3.5 w-3.5 text-sky-400" />
                    <span className="tabular-nums">{cur.windSpeed} km/h</span>
                  </div>
                  <div className="flex items-center gap-1.5 justify-end text-xs text-muted-foreground">
                    <Thermometer className="h-3.5 w-3.5 text-orange-400" />
                    <span>Humidity</span>
                  </div>
                  {lastFetched && (
                    <p className="text-[10px] text-muted-foreground/50 mt-2">Updated {lastFetched}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 7-day forecast */}
        {data?.daily && data.daily.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">7-Day Forecast</p>
              <div className="space-y-2">
                {data.daily.map((day, i) => {
                  const d = parseLocalDate(day.date)
                  const label = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : DAY_SHORT[d.getDay()]
                  const w = wmo(day.code)
                  return (
                    <div key={day.date} className={cn('flex items-center gap-3 py-1.5 rounded-xl px-2', i === 0 && 'bg-primary/5')}>
                      <span className="text-xs font-medium w-16 text-muted-foreground">{label}</span>
                      <span className="text-lg">{w.emoji}</span>
                      <span className="flex-1 text-xs text-muted-foreground truncate">{w.label}</span>
                      {day.precipProb > 0 && (
                        <div className="flex items-center gap-0.5 text-[10px] text-blue-400 tabular-nums">
                          <Droplets className="h-3 w-3" />
                          {day.precipProb}%
                        </div>
                      )}
                      <span className="text-xs tabular-nums text-muted-foreground w-14 text-right">
                        {day.min}° / <span className="text-foreground font-semibold">{day.max}°</span>
                      </span>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* PAGASA storm signal guide */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Info className="h-4 w-4 text-blue-500 shrink-0" />
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">PAGASA Storm Signals</p>
            </div>
            <div className="space-y-1.5 mb-4">
              {[
                { sig: 1, kph: '30–60 kph',    color: 'text-yellow-500',  desc: 'Intermittent rains' },
                { sig: 2, kph: '61–120 kph',   color: 'text-orange-500',  desc: 'Moderate to heavy rains' },
                { sig: 3, kph: '121–185 kph',  color: 'text-red-500',     desc: 'Destructive typhoon-force winds' },
                { sig: 4, kph: '186–220 kph',  color: 'text-red-700',     desc: 'Very destructive winds' },
                { sig: 5, kph: '>220 kph',     color: 'text-purple-600',  desc: 'Catastrophic violent winds' },
              ].map(({ sig, kph, color, desc }) => (
                <div key={sig} className="flex items-center gap-2 text-xs">
                  <span className={cn('font-bold w-16 shrink-0', color)}>Signal {sig}</span>
                  <span className="text-muted-foreground tabular-nums w-24 shrink-0">{kph}</span>
                  <span className="text-muted-foreground truncate">{desc}</span>
                </div>
              ))}
            </div>
            <a
              href="https://www.pagasa.dost.gov.ph/weather-bulletin"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-semibold hover:bg-blue-500/20 active:scale-[0.98] transition-all"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Open PAGASA Official Bulletin
            </a>
          </CardContent>
        </Card>

        {/* NDRRMC link */}
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-2 font-medium">Emergency & Disaster Alerts</p>
            <div className="space-y-2">
              <a
                href="https://www.ndrrmc.gov.ph"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between w-full py-2.5 px-3 rounded-xl bg-muted hover:bg-accent active:scale-[0.98] transition-all"
              >
                <span className="text-xs font-medium">NDRRMC Advisories</span>
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
              </a>
              <a
                href="https://bagong.pagasa.dost.gov.ph/tropical-cyclone/public-storm-warning-signal"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between w-full py-2.5 px-3 rounded-xl bg-muted hover:bg-accent active:scale-[0.98] transition-all"
              >
                <span className="text-xs font-medium">Active Storm Warning Signals</span>
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
