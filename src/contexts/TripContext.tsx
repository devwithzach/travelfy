import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import type { TripData, TripSummary } from '@/types'
import { storageService } from '@/services/storage'
import { createEmptyTrip } from '@/data/emptyTrip'
import { sampleTrip } from '@/data/sampleTrip'
import { useAuth } from '@/contexts/AuthContext'

interface TripContextValue {
  trip: TripData
  trips: TripSummary[]
  activeTripId: string | null
  loading: boolean
  tripLoading: boolean
  error: string | null
  clearError: () => void
  selectTrip: (id: string) => void
  /** Drop the active trip without deleting it — returns to the lobby. */
  exitTrip: () => void
  createNewTrip: (info: { name: string; destination: string; startDate: string; endDate: string; description: string }) => Promise<string>
  deleteTripById: (id: string) => Promise<void>
  updateTrip: (updater: (prev: TripData) => TripData) => void
  resetTrip: () => Promise<void>
  exportTrip: () => string
  importTrip: (json: string) => Promise<boolean>
  seedSampleTrip: () => Promise<string>
}

const TripContext = createContext<TripContextValue | null>(null)

export function TripProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [trips, setTrips] = useState<TripSummary[]>([])
  const [activeTripId, setActiveTripId] = useState<string | null>(
    () => localStorage.getItem('activeTripId')
  )
  const [trip, setTrip] = useState<TripData>(createEmptyTrip)
  const [loading, setLoading] = useState(true)
  const [tripLoading, setTripLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearError = useCallback(() => setError(null), [])

  // Load trips list on auth
  useEffect(() => {
    if (!user) { setLoading(false); return }
    setLoading(true)
    setError(null)
    storageService.listTrips(user.id)
      .then(list => { setTrips(list) })
      .catch(err => {
        console.error('Failed to load trips:', err)
        setError(`Failed to load trips: ${err?.message ?? 'unknown error'}`)
      })
      .finally(() => setLoading(false))
  }, [user])

  // Load full trip when activeTripId changes
  useEffect(() => {
    if (!user || !activeTripId) { setTrip(createEmptyTrip()); return }
    setTripLoading(true)
    setError(null)
    storageService.getTripById(user.id, activeTripId)
      .then(data => { setTrip(data) })
      .catch(err => {
        console.error('Failed to load trip:', err)
        setError(`Failed to load trip: ${err?.message ?? 'unknown error'}`)
      })
      .finally(() => setTripLoading(false))
  }, [user, activeTripId])

  const selectTrip = useCallback((id: string) => {
    localStorage.setItem('activeTripId', id)
    setActiveTripId(id)
  }, [])

  const exitTrip = useCallback(() => {
    localStorage.removeItem('activeTripId')
    setActiveTripId(null)
    setTrip(createEmptyTrip())
  }, [])

  const createNewTrip = useCallback(async (info: { name: string; destination: string; startDate: string; endDate: string; description: string }) => {
    if (!user) throw new Error('Not authenticated')
    const id = await storageService.createTrip(user.id, info)
    const newSummary: TripSummary = {
      id,
      name: info.name,
      destination: info.destination,
      startDate: info.startDate,
      endDate: info.endDate,
      status: 'upcoming',
      coverImage: '',
    }
    setTrips(prev => [newSummary, ...prev])
    return id
  }, [user])

  const deleteTripById = useCallback(async (id: string) => {
    if (!user) return
    await storageService.deleteTripById(id, user.id)
    setTrips(prev => prev.filter(t => t.id !== id))
    if (activeTripId === id) {
      localStorage.removeItem('activeTripId')
      setActiveTripId(null)
      setTrip(createEmptyTrip())
    }
  }, [user, activeTripId])

  const debouncedSave = useCallback((data: TripData) => {
    if (!user) return
    if (saveTimeout.current) clearTimeout(saveTimeout.current)
    saveTimeout.current = setTimeout(() => {
      storageService.saveTrip(user.id, data).catch(err => {
        console.error('Failed to save trip:', err)
        setError(`Failed to save trip: ${err?.message ?? 'unknown error'}`)
      })
    }, 800)
  }, [user])

  const updateTrip = useCallback((updater: (prev: TripData) => TripData) => {
    setTrip(prev => {
      const next = updater(prev)
      debouncedSave(next)
      return next
    })
  }, [debouncedSave])

  const resetTrip = useCallback(async () => {
    if (!user || !activeTripId) return
    await storageService.deleteTripById(activeTripId, user.id)
    setTrips(prev => prev.filter(t => t.id !== activeTripId))
    localStorage.removeItem('activeTripId')
    setActiveTripId(null)
    setTrip(createEmptyTrip())
  }, [user, activeTripId])

  const exportTrip = useCallback(() => storageService.exportTrip(trip), [trip])

  // Seed a fully-populated sample trip into the user's account. All child IDs
  // are regenerated so we don't collide with any existing rows. After save the
  // new trip becomes the active trip.
  const seedSampleTrip = useCallback(async (): Promise<string> => {
    if (!user) throw new Error('Not authenticated')
    const newId = crypto.randomUUID()
    const fresh: TripData = JSON.parse(JSON.stringify(sampleTrip))
    fresh.tripInfo.id = newId
    fresh.flights = fresh.flights.map(f => ({ ...f, id: crypto.randomUUID() }))
    fresh.hotels = fresh.hotels.map(h => ({ ...h, id: crypto.randomUUID() }))
    fresh.itinerary = fresh.itinerary.map(d => ({
      ...d,
      id: crypto.randomUUID(),
      activities: d.activities.map(a => ({ ...a, id: crypto.randomUUID() })),
    }))
    fresh.checklist = fresh.checklist.map(c => ({ ...c, id: crypto.randomUUID() }))
    fresh.expenses = fresh.expenses.map(e => ({ ...e, id: crypto.randomUUID() }))
    fresh.documents = fresh.documents.map(d => ({ ...d, id: crypto.randomUUID() }))
    fresh.emergencyContacts = fresh.emergencyContacts.map(c => ({ ...c, id: crypto.randomUUID() }))
    fresh.quickLinks = fresh.quickLinks.map(l => ({ ...l, id: crypto.randomUUID() }))
    fresh.notes = fresh.notes.map(n => ({ ...n, id: crypto.randomUUID() }))
    fresh.visas = fresh.visas.map(v => ({ ...v, id: crypto.randomUUID() }))

    await storageService.saveTrip(user.id, fresh)
    const list = await storageService.listTrips(user.id)
    setTrips(list)
    return newId
  }, [user])

  const importTrip = useCallback(async (json: string) => {
    if (!user) return false
    const ok = await storageService.importTrip(user.id, json)
    if (ok && activeTripId) {
      const data = await storageService.getTripById(user.id, activeTripId)
      setTrip(data)
    }
    return ok
  }, [user, activeTripId])

  return (
    <TripContext.Provider value={{
      trip, trips, activeTripId, loading, tripLoading, error, clearError,
      selectTrip, exitTrip, createNewTrip, deleteTripById,
      updateTrip, resetTrip, exportTrip, importTrip, seedSampleTrip,
    }}>
      {children}
    </TripContext.Provider>
  )
}

export function useTrip() {
  const ctx = useContext(TripContext)
  if (!ctx) throw new Error('useTrip must be used within TripProvider')
  return ctx
}
