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
  /** Re-fetch the active trip from Supabase (and the trips list). No-op if not authenticated. */
  refreshTrip: () => Promise<void>
  /** Clone an existing trip's structure (no expenses, no photos, no per-day dates). */
  duplicateTrip: (sourceId: string, overrides?: { name?: string }) => Promise<string>
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

  // Stable user ID — avoids re-running effects when Supabase refreshes the
  // auth token and hands back a new User object with the same ID.
  const userId = user?.id ?? null

  // Load trips list on auth
  useEffect(() => {
    if (!userId) { setLoading(false); return }
    setLoading(true)
    setError(null)
    storageService.listTrips(userId)
      .then(list => { setTrips(list) })
      .catch(err => {
        console.error('Failed to load trips:', err)
        setError(`Failed to load trips: ${err?.message ?? 'unknown error'}`)
      })
      .finally(() => setLoading(false))
  }, [userId])

  // Load full trip when activeTripId changes
  useEffect(() => {
    if (!userId || !activeTripId) { setTrip(createEmptyTrip()); return }
    setTripLoading(true)
    setError(null)
    storageService.getTripById(userId, activeTripId)
      .then(data => { setTrip(data) })
      .catch(err => {
        console.error('Failed to load trip:', err)
        setError(`Failed to load trip: ${err?.message ?? 'unknown error'}`)
      })
      .finally(() => setTripLoading(false))
  }, [userId, activeTripId])

  const selectTrip = useCallback((id: string) => {
    localStorage.setItem('activeTripId', id)
    setActiveTripId(id)
  }, [])

  const exitTrip = useCallback(() => {
    localStorage.removeItem('activeTripId')
    setActiveTripId(null)
    setTrip(createEmptyTrip())
  }, [])

  // Force a fresh read of the trip + list. Used by the visibility-change
  // listener so returning to the app (e.g., after editing on Timeline in a
  // different tab, or after the device went to sleep) shows current data.
  const refreshTrip = useCallback(async () => {
    if (!userId) return
    try {
      const list = await storageService.listTrips(userId)
      setTrips(list)
      if (activeTripId) {
        const data = await storageService.getTripById(userId, activeTripId)
        setTrip(data)
      }
    } catch (err) {
      console.warn('Failed to refresh trip:', err)
    }
  }, [userId, activeTripId])

  // Auto-refresh when the page becomes visible again (tab focus, app foregrounded).
  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === 'visible') refreshTrip()
    }
    document.addEventListener('visibilitychange', handler)
    return () => document.removeEventListener('visibilitychange', handler)
  }, [refreshTrip])

  const createNewTrip = useCallback(async (info: { name: string; destination: string; startDate: string; endDate: string; description: string }) => {
    if (!userId) throw new Error('Not authenticated')
    const id = await storageService.createTrip(userId, info)
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
  }, [userId])

  const deleteTripById = useCallback(async (id: string) => {
    if (!userId) return
    await storageService.deleteTripById(id, userId)
    setTrips(prev => prev.filter(t => t.id !== id))
    if (activeTripId === id) {
      localStorage.removeItem('activeTripId')
      setActiveTripId(null)
      setTrip(createEmptyTrip())
    }
  }, [userId, activeTripId])

  const debouncedSave = useCallback((data: TripData) => {
    if (!userId) return
    if (saveTimeout.current) clearTimeout(saveTimeout.current)
    saveTimeout.current = setTimeout(() => {
      storageService.saveTrip(userId, data).catch(err => {
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
    if (!userId || !activeTripId) return
    await storageService.deleteTripById(activeTripId, userId)
    setTrips(prev => prev.filter(t => t.id !== activeTripId))
    localStorage.removeItem('activeTripId')
    setActiveTripId(null)
    setTrip(createEmptyTrip())
  }, [userId, activeTripId])

  const exportTrip = useCallback(() => storageService.exportTrip(trip), [trip])

  // Seed a fully-populated sample trip into the user's account. All child IDs
  // are regenerated so we don't collide with any existing rows. After save the
  // new trip becomes the active trip.
  const seedSampleTrip = useCallback(async (): Promise<string> => {
    if (!userId) throw new Error('Not authenticated')
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

    await storageService.saveTrip(userId, fresh)
    const list = await storageService.listTrips(userId)
    setTrips(list)
    return newId
  }, [userId])

  // Clone an existing trip's reusable structure into a fresh trip:
  //   keeps: itinerary skeleton (days + activities, dates cleared, done false),
  //          checklist (unchecked), quick links, emergency contacts, hotels skeleton
  //   drops: expenses, photos (their own table), specific dates, flight specifics,
  //          documents, notes, visas, currency rates
  // Useful for "plan my next trip using last trip as a template".
  const duplicateTrip = useCallback(async (sourceId: string, overrides?: { name?: string }): Promise<string> => {
    if (!userId) throw new Error('Not authenticated')
    const source = await storageService.getTripById(userId, sourceId)
    const newId = crypto.randomUUID()
    const cloned: TripData = {
      tripInfo: {
        id: newId,
        name: overrides?.name?.trim() || `Copy of ${source.tripInfo.name || 'Trip'}`,
        destination: source.tripInfo.destination,
        startDate: '',
        endDate: '',
        coverImage: '',
        description: source.tripInfo.description,
        status: 'upcoming',
      },
      settings: { ...source.settings },
      tourNotes: [...source.tourNotes],
      restrictions: [...source.restrictions],
      flights: [], // flight numbers/dates rarely repeat
      hotels: source.hotels.map(h => ({
        ...h,
        id: crypto.randomUUID(),
        checkIn: '',
        checkOut: '',
        bookingReference: '',
      })),
      itinerary: source.itinerary.map(d => ({
        ...d,
        id: crypto.randomUUID(),
        date: '',
        activities: d.activities.map(a => ({ ...a, id: crypto.randomUUID(), done: false })),
      })),
      checklist: source.checklist.map(c => ({ ...c, id: crypto.randomUUID(), checked: false })),
      expenses: [],
      documents: [],
      emergencyContacts: source.emergencyContacts.map(c => ({ ...c, id: crypto.randomUUID() })),
      quickLinks: source.quickLinks.map(l => ({ ...l, id: crypto.randomUUID() })),
      notes: [],
      passport: source.passport,
      visas: [],
      currencyRates: [...source.currencyRates],
      lastUpdated: new Date().toISOString(),
    }
    await storageService.saveTrip(userId, cloned)
    const list = await storageService.listTrips(userId)
    setTrips(list)
    return newId
  }, [userId])

  const importTrip = useCallback(async (json: string) => {
    if (!userId) return false
    const ok = await storageService.importTrip(userId, json)
    if (ok && activeTripId) {
      const data = await storageService.getTripById(userId, activeTripId)
      setTrip(data)
    }
    return ok
  }, [userId, activeTripId])

  return (
    <TripContext.Provider value={{
      trip, trips, activeTripId, loading, tripLoading, error, clearError,
      selectTrip, exitTrip, createNewTrip, deleteTripById,
      updateTrip, resetTrip, exportTrip, importTrip, seedSampleTrip,
      refreshTrip, duplicateTrip,
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
