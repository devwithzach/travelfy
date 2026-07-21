import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { MapPin, Calendar, Plane, Hotel, Clock, CheckCircle2, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface SharedTrip {
  trip: Record<string, unknown>
  days: Array<Record<string, unknown>>
  hotels: Array<Record<string, unknown>>
  flights: Array<Record<string, unknown>>
}

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatTime(t: string | null | undefined) {
  if (!t) return ''
  const [h, m] = (t as string).split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`
}

export default function TripShare() {
  const { token } = useParams<{ token: string }>()
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [tripData, setTripData] = useState<SharedTrip | null>(null)

  useEffect(() => {
    if (!token) { setNotFound(true); setLoading(false); return }

    async function load() {
      const { data: trip, error } = await supabase
        .from('trips')
        .select('*')
        .eq('share_token', token)
        .single()

      if (error || !trip) { setNotFound(true); setLoading(false); return }

      const { data: days } = await supabase
        .from('itinerary_days')
        .select('*, itinerary_activities(*)')
        .eq('trip_id', trip.id)
        .order('day_number', { ascending: true })

      const { data: hotels } = await supabase
        .from('hotels')
        .select('*')
        .eq('trip_id', trip.id)

      const { data: flights } = await supabase
        .from('flights')
        .select('*')
        .eq('trip_id', trip.id)

      setTripData({ trip, days: days ?? [], hotels: hotels ?? [], flights: flights ?? [] })
      setLoading(false)
    }

    load()
  }, [token])

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
        <p className="text-sm text-muted-foreground">Loading trip...</p>
      </div>
    )
  }

  if (notFound || !tripData) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
          <MapPin className="h-8 w-8 text-muted-foreground" />
        </div>
        <h1 className="text-xl font-bold">Trip not found</h1>
        <p className="text-sm text-muted-foreground">This link may have expired or been revoked.</p>
        <a href="/" className="text-sm text-primary hover:underline">Back to Travelfy</a>
      </div>
    )
  }

  const { trip, days, hotels, flights } = tripData
  const tripName = (trip.name as string) || 'Untitled Trip'
  const destination = (trip.destination as string) || ''
  const startDate = trip.start_date as string | undefined
  const endDate = trip.end_date as string | undefined
  const tripType = trip.trip_type as string | undefined

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border px-4 py-3 flex items-center justify-between">
        <span className="text-base font-bold bg-gradient-to-r from-indigo-500 to-violet-600 bg-clip-text text-transparent">
          Travelfy
        </span>
        <a
          href="/"
          className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
        >
          Plan your own trip →
        </a>
      </header>

      <div className="px-4 py-5 space-y-4 max-w-lg mx-auto pb-12">
        {/* Hero card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card>
            <CardContent className="p-5 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h1 className="text-xl font-bold leading-tight truncate">{tripName}</h1>
                  {destination && (
                    <div className="flex items-center gap-1 mt-1">
                      <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="text-sm text-muted-foreground">{destination}</span>
                    </div>
                  )}
                </div>
                {tripType && (
                  <Badge variant="secondary" className="shrink-0 text-xs">
                    {tripType === 'domestic' ? 'Domestic PH' : 'International'}
                  </Badge>
                )}
              </div>
              {(startDate || endDate) && (
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5 shrink-0" />
                  <span>
                    {formatDate(startDate)}
                    {endDate && startDate !== endDate ? ` → ${formatDate(endDate)}` : ''}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Flights */}
        {flights.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.05 }}
          >
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <Plane className="h-3.5 w-3.5" />
              Flights ({flights.length})
            </p>
            <div className="space-y-2">
              {flights.map((f, i) => (
                <Card key={i}>
                  <CardContent className="p-4 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold">
                        {String((f.from_code as string) || (f.from as string))} → {String((f.to_code as string) || (f.to as string))}
                      </span>
                      {Boolean(f.flight_number) && (
                        <Badge variant="outline" className="text-xs font-mono shrink-0">
                          {String(f.flight_number)}
                        </Badge>
                      )}
                    </div>
                    {Boolean(f.departure_date) && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3 shrink-0" />
                        {formatDate(f.departure_date as string)}
                        {f.departure_time ? ` · Dep ${formatTime(f.departure_time as string)}` : ''}
                        {f.arrival_time ? ` → Arr ${formatTime(f.arrival_time as string)}` : ''}
                      </div>
                    )}
                    {Boolean(f.airline) && (
                      <p className="text-xs text-muted-foreground">{String(f.airline)}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.div>
        )}

        {/* Hotels */}
        {hotels.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <Hotel className="h-3.5 w-3.5" />
              Hotels ({hotels.length})
            </p>
            <div className="space-y-2">
              {hotels.map((h, i) => (
                <Card key={i}>
                  <CardContent className="p-4 space-y-1">
                    <p className="text-sm font-semibold">{String(h.name)}</p>
                    {Boolean(h.address) && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3 shrink-0" />
                        {String(h.address)}
                      </div>
                    )}
                    {Boolean(h.check_in || h.check_out) && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3 shrink-0" />
                        {h.check_in ? formatDate(h.check_in as string) : ''}
                        {h.check_out ? ` → ${formatDate(h.check_out as string)}` : ''}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.div>
        )}

        {/* Itinerary */}
        {days.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.15 }}
          >
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              Itinerary ({days.length} days)
            </p>
            <div className="space-y-3">
              {days.map((day, i) => {
                const activities = (day.itinerary_activities as Array<Record<string, unknown>>) ?? []
                return (
                  <Card key={i}>
                    <CardContent className="p-4 space-y-3">
                      <div>
                        <p className="text-sm font-semibold">
                          Day {day.day_number as number}
                          {day.date ? ` · ${formatDate(day.date as string)}` : ''}
                          {day.title ? ` — ${day.title as string}` : ''}
                        </p>
                      </div>
                      {activities.length > 0 && (
                        <div className="space-y-2">
                          {activities.map((a, j) => (
                            <div key={j} className="flex items-start gap-2">
                              <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                              <div className="min-w-0">
                                <p className="text-xs font-medium leading-snug">
                                  {a.time ? <span className="text-muted-foreground mr-1">{formatTime(a.time as string)}</span> : null}
                                  {String(a.title)}
                                </p>
                                {Boolean(a.location) && (
                                  <p className="text-xs text-muted-foreground">{String(a.location)}</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </motion.div>
        )}

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="pt-2"
        >
          <Card className="border-dashed">
            <CardContent className="p-5 text-center space-y-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center mx-auto">
                <Plane className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold">Plan your own trip</p>
                <p className="text-xs text-muted-foreground mt-0.5">Flights, hotels, itinerary, expenses — all in one place.</p>
              </div>
              <a
                href="/login"
                className="inline-flex items-center justify-center h-9 px-5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 text-white text-sm font-semibold shadow-md shadow-indigo-500/30 hover:opacity-90 transition-opacity"
              >
                Create your own trip plan →
              </a>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
