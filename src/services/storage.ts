import type { TripData } from '@/types'
import { sampleTrip } from '@/data/sampleTrip'

const STORAGE_KEY = 'travelfy_trip_data'

export const storageService = {
  getTrip(): TripData {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return { ...sampleTrip }
      const parsed = JSON.parse(raw) as TripData
      return parsed
    } catch {
      return { ...sampleTrip }
    }
  },

  saveTrip(data: TripData): void {
    try {
      const toSave = { ...data, lastUpdated: new Date().toISOString() }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave))
    } catch (e) {
      console.error('Failed to save trip data:', e)
    }
  },

  exportTrip(): string {
    const data = storageService.getTrip()
    return JSON.stringify(data, null, 2)
  },

  importTrip(json: string): boolean {
    try {
      const parsed = JSON.parse(json) as TripData
      if (!parsed.tripInfo || !parsed.flights) return false
      storageService.saveTrip(parsed)
      return true
    } catch {
      return false
    }
  },

  resetTrip(): void {
    localStorage.removeItem(STORAGE_KEY)
  },
}
