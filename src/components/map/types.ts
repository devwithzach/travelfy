export interface POI {
  id: number
  lat: number
  lon: number
  name: string
  type: string
  tags: Record<string, string>
  distance?: number
}

export interface Location {
  name: string
  lat: number
  lon: number
  country: string
}

export interface NavStep {
  instruction: string
  distance: number
  lat: number
  lon: number
  maneuverType: string
  maneuverModifier: string
}

export interface SavedPlace {
  id: string
  user_id: string
  trip_id: string
  osm_id: number
  name: string
  type: string
  lat: number
  lon: number
  tags: Record<string, string>
  rating: number
  notes: string
  saved_at: string
}
