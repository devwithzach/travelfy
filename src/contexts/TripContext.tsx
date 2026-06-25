import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import type { TripData } from '@/types'
import { storageService } from '@/services/storage'
import { sampleTrip } from '@/data/sampleTrip'
import { useAuth } from '@/contexts/AuthContext'

interface TripContextValue {
  trip: TripData
  loading: boolean
  updateTrip: (updater: (prev: TripData) => TripData) => void
  resetTrip: () => Promise<void>
  exportTrip: () => string
  importTrip: (json: string) => Promise<boolean>
}

const TripContext = createContext<TripContextValue | null>(null)

export function TripProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [trip, setTrip] = useState<TripData>({ ...sampleTrip })
  const [loading, setLoading] = useState(true)
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!user) { setLoading(false); return }
    setLoading(true)
    storageService.getTrip(user.id).then(data => {
      setTrip(data)
      setLoading(false)
    })
  }, [user])

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
    if (!user) return
    await storageService.resetTrip(user.id)
    setTrip({ ...sampleTrip })
  }, [user])

  const exportTrip = useCallback(() => storageService.exportTrip(trip), [trip])

  const importTrip = useCallback(async (json: string) => {
    if (!user) return false
    const ok = await storageService.importTrip(user.id, json)
    if (ok) {
      const data = await storageService.getTrip(user.id)
      setTrip(data)
    }
    return ok
  }, [user])

  return (
    <TripContext.Provider value={{ trip, loading, updateTrip, resetTrip, exportTrip, importTrip }}>
      {children}
    </TripContext.Provider>
  )
}

export function useTrip() {
  const ctx = useContext(TripContext)
  if (!ctx) throw new Error('useTrip must be used within TripProvider')
  return ctx
}
