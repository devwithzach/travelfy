import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import type { TripData, TripSummary } from '@/types'
import { storageService } from '@/services/storage'
import { createEmptyTrip } from '@/data/emptyTrip'
import { useAuth } from '@/contexts/AuthContext'

interface TripContextValue {
  trip: TripData
  trips: TripSummary[]
  activeTripId: string | null
  loading: boolean
  tripLoading: boolean
  selectTrip: (id: string) => void
  createNewTrip: (info: { name: string; destination: string; startDate: string; endDate: string; description: string }) => Promise<string>
  deleteTripById: (id: string) => Promise<void>
  updateTrip: (updater: (prev: TripData) => TripData) => void
  resetTrip: () => Promise<void>
  exportTrip: () => string
  importTrip: (json: string) => Promise<boolean>
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
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load trips list on auth
  useEffect(() => {
    if (!user) { setLoading(false); return }
    setLoading(true)
    storageService.listTrips(user.id)
      .then(list => { setTrips(list) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [user])

  // Load full trip when activeTripId changes
  useEffect(() => {
    if (!user || !activeTripId) { setTrip(createEmptyTrip()); return }
    setTripLoading(true)
    storageService.getTripById(user.id, activeTripId)
      .then(data => { setTrip(data) })
      .catch(() => {})
      .finally(() => setTripLoading(false))
  }, [user, activeTripId])

  const selectTrip = useCallback((id: string) => {
    localStorage.setItem('activeTripId', id)
    setActiveTripId(id)
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
      storageService.saveTrip(user.id, data)
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
      trip, trips, activeTripId, loading, tripLoading,
      selectTrip, createNewTrip, deleteTripById,
      updateTrip, resetTrip, exportTrip, importTrip,
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
