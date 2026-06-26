import { useEffect } from 'react'
import { useTrip } from '@/contexts/TripContext'
import { deriveFlightStatus } from '@/utils/flight'

/**
 * Self-heal flight.status in Supabase: if any flight's stored status differs
 * from the time-derived one, write the derived value back via updateTrip.
 *
 * Runs whenever the trip's flight list changes (e.g., after initial load or
 * after the user adds a flight). The update piggybacks the existing debounced
 * saveTrip — no extra round trips.
 *
 * Why opportunistic vs a DB cron: a single write-back at app open is enough
 * to keep rows consistent across devices, with zero server-side infra. Reads
 * are always correct because the UI derives at render time anyway.
 */
export function useFlightStatusSync() {
  const { trip, updateTrip } = useTrip()
  const tripId = trip.tripInfo.id
  const flights = trip.flights

  useEffect(() => {
    if (!tripId || flights.length === 0) return
    const now = new Date()
    const drifted = flights.some(f => deriveFlightStatus(f, now) !== f.status)
    if (!drifted) return
    // Defer the write so it doesn't race a fresh load setting the same flights array.
    const id = setTimeout(() => {
      updateTrip(prev => ({
        ...prev,
        flights: prev.flights.map(f => {
          const live = deriveFlightStatus(f, now)
          return live === f.status ? f : { ...f, status: live }
        }),
      }))
    }, 1500)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId, flights])
}
