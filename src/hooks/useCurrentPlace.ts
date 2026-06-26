import { useEffect, useState } from 'react'
import { reverseGeocode } from '@/components/map/geocode'

interface State {
  label: string | null
  loading: boolean
  permissionState: 'unknown' | 'granted' | 'denied' | 'unsupported'
}

// Per-session cache so we don't re-prompt or re-fetch on every page mount.
let cached: State | null = null

/**
 * Resolve the user's current location to a short text label like
 * "Kowloon, Hong Kong" via GPS + Nominatim reverse geocode. Soft-fails:
 * returns null label on permission denied, no GPS, or network error.
 */
export function useCurrentPlace(): State {
  const [state, setState] = useState<State>(cached ?? { label: null, loading: true, permissionState: 'unknown' })

  useEffect(() => {
    if (cached) return
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      const next: State = { label: null, loading: false, permissionState: 'unsupported' }
      cached = next
      setState(next)
      return
    }
    navigator.geolocation.getCurrentPosition(
      async pos => {
        const label = await reverseGeocode(pos.coords.latitude, pos.coords.longitude)
        const next: State = { label, loading: false, permissionState: 'granted' }
        cached = next
        setState(next)
      },
      err => {
        const next: State = {
          label: null,
          loading: false,
          permissionState: err.code === err.PERMISSION_DENIED ? 'denied' : 'unknown',
        }
        cached = next
        setState(next)
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 1000 * 60 * 30 },
    )
  }, [])

  return state
}
