import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import type { TripData } from '@/types'
import { storageService } from '@/services/storage'

interface TripContextValue {
  trip: TripData
  updateTrip: (updater: (prev: TripData) => TripData) => void
  resetTrip: () => void
  exportTrip: () => string
  importTrip: (json: string) => boolean
}

const TripContext = createContext<TripContextValue | null>(null)

export function TripProvider({ children }: { children: React.ReactNode }) {
  const [trip, setTrip] = useState<TripData>(() => storageService.getTrip())

  useEffect(() => {
    storageService.saveTrip(trip)
  }, [trip])

  const updateTrip = useCallback((updater: (prev: TripData) => TripData) => {
    setTrip(prev => updater(prev))
  }, [])

  const resetTrip = useCallback(() => {
    storageService.resetTrip()
    const fresh = storageService.getTrip()
    setTrip(fresh)
  }, [])

  const exportTrip = useCallback(() => storageService.exportTrip(), [])

  const importTrip = useCallback((json: string) => {
    const ok = storageService.importTrip(json)
    if (ok) setTrip(storageService.getTrip())
    return ok
  }, [])

  return (
    <TripContext.Provider value={{ trip, updateTrip, resetTrip, exportTrip, importTrip }}>
      {children}
    </TripContext.Provider>
  )
}

export function useTrip() {
  const ctx = useContext(TripContext)
  if (!ctx) throw new Error('useTrip must be used within TripProvider')
  return ctx
}
