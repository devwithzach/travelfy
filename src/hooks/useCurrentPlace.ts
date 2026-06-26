import { useEffect, useState } from 'react'
import { reverseGeocode, type ReverseGeocodeResult } from '@/components/map/geocode'

interface State extends ReverseGeocodeResult {
  loading: boolean
  permissionState: 'unknown' | 'granted' | 'denied' | 'unsupported'
}

const EMPTY_PLACE: ReverseGeocodeResult = { label: null, region: null, country: null, countryCode: null }

// Per-session cache so we don't re-prompt or re-fetch on every page mount.
let cached: State | null = null

/**
 * Resolve the user's current location to a structured place (region, country,
 * country code for flag) via GPS + Nominatim reverse geocode. Soft-fails on
 * permission denied / no GPS / network error — all fields become null.
 */
export function useCurrentPlace(): State {
  const [state, setState] = useState<State>(
    cached ?? { ...EMPTY_PLACE, loading: true, permissionState: 'unknown' },
  )

  useEffect(() => {
    if (cached) return
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      const next: State = { ...EMPTY_PLACE, loading: false, permissionState: 'unsupported' }
      cached = next
      setState(next)
      return
    }
    navigator.geolocation.getCurrentPosition(
      async pos => {
        const place = await reverseGeocode(pos.coords.latitude, pos.coords.longitude)
        const next: State = { ...place, loading: false, permissionState: 'granted' }
        cached = next
        setState(next)
      },
      err => {
        const next: State = {
          ...EMPTY_PLACE,
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
