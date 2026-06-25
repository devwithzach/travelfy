import { supabase } from '@/lib/supabase'
import type { TripData } from '@/types'
import { sampleTrip } from '@/data/sampleTrip'

export const storageService = {
  async getTrip(userId: string): Promise<TripData> {
    const { data, error } = await supabase
      .from('trips')
      .select('data')
      .eq('user_id', userId)
      .single()

    if (error || !data) return { ...sampleTrip }
    return data.data as TripData
  },

  async saveTrip(userId: string, trip: TripData): Promise<void> {
    const payload = { ...trip, lastUpdated: new Date().toISOString() }
    await supabase
      .from('trips')
      .upsert({ user_id: userId, data: payload }, { onConflict: 'user_id' })
  },

  async resetTrip(userId: string): Promise<void> {
    await supabase
      .from('trips')
      .upsert({ user_id: userId, data: { ...sampleTrip } }, { onConflict: 'user_id' })
  },

  exportTrip(trip: TripData): string {
    return JSON.stringify(trip, null, 2)
  },

  async importTrip(userId: string, json: string): Promise<boolean> {
    try {
      const parsed = JSON.parse(json) as TripData
      if (!parsed.tripInfo || !parsed.flights) return false
      await storageService.saveTrip(userId, parsed)
      return true
    } catch {
      return false
    }
  },
}
