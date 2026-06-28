export interface Flight {
  id: string
  flightNumber: string
  airline: string
  from: string
  fromCode: string
  fromAirport: string
  fromTerminal: string
  to: string
  toCode: string
  toAirport: string
  toTerminal: string
  departureDate: string
  departureTime: string
  arrivalDate: string
  arrivalTime: string
  arrivalDateOffset?: string
  seat: string
  bookingReference: string
  gate: string
  status: 'upcoming' | 'boarding' | 'departed' | 'arrived'
}

export interface Hotel {
  id: string
  name: string
  address: string
  phone: string
  website: string
  checkIn: string
  checkOut: string
  roomType: string
  bookingReference: string
  nights: number
  mapsUrl: string
  notes: string
}

export interface ItineraryActivity {
  id: string
  time: string
  title: string
  description: string
  type: 'transport' | 'attraction' | 'meal' | 'hotel' | 'shopping' | 'free' | 'other'
  location?: string
  done?: boolean
}

export interface ItineraryDay {
  id: string
  date: string
  dayNumber: number
  title: string
  subtitle: string
  meals: string[]
  hotel: string
  activities: ItineraryActivity[]
}

export interface ChecklistItem {
  id: string
  label: string
  checked: boolean
  category: 'documents' | 'essentials' | 'electronics' | 'health' | 'clothing' | 'custom'
}

export interface Expense {
  id: string
  title: string
  amount: number
  currency: string
  category: 'food' | 'transport' | 'shopping' | 'hotel' | 'activities' | 'other'
  date: string
  notes: string
  /** Optional public URL of a receipt photo stored in trip-photos/receipts/. */
  receiptUrl?: string
}

export interface Document {
  id: string
  name: string
  type: 'passport' | 'boarding_pass' | 'visa' | 'hotel_voucher' | 'insurance' | 'other'
  fileName: string
  fileType: string
  fileSize: number
  uploadedAt: string
  dataUrl?: string
}

export interface EmergencyContact {
  id: string
  name: string
  role: string
  phone: string
  type: 'personal' | 'embassy' | 'police' | 'hospital' | 'tour_guide'
  country?: string
  address?: string
  notes?: string
}

export interface QuickLink {
  id: string
  title: string
  url: string
  icon: string
  category: 'airline' | 'hotel' | 'maps' | 'immigration' | 'insurance' | 'transport' | 'other'
}

export interface Note {
  id: string
  title: string
  content: string
  createdAt: string
  updatedAt: string
  color: string
}

export interface PassportInfo {
  fullName: string
  passportNumber: string
  nationality: string
  dateOfBirth: string
  issueDate: string
  expiryDate: string
  issuingCountry: string
}

export interface VisaInfo {
  id: string
  country: string
  visaType: string
  visaNumber: string
  issueDate: string
  expiryDate: string
  status: 'valid' | 'expired' | 'pending'
  notes: string
}

export interface CurrencyRate {
  from: string
  to: string
  rate: number
  updatedAt: string
}

export interface TripSettings {
  travelerName: string
  profilePicture: string
  theme: 'light' | 'dark' | 'system'
  homeCurrency: string
  language: string
  totalBudget: number
}

export interface TripSummary {
  id: string
  name: string
  destination: string
  startDate: string
  endDate: string
  status: 'upcoming' | 'active' | 'completed'
  coverImage: string
  /** Optional per-trip aggregates loaded by listTrips. Zero when unset. */
  counts?: {
    flights: number
    hotels: number
    days: number
    photos: number
  }
}

export interface TripInfo {
  id: string
  name: string
  destination: string
  startDate: string
  endDate: string
  coverImage: string
  description: string
  status: 'upcoming' | 'active' | 'completed'
}

export interface TripData {
  tripInfo: TripInfo
  flights: Flight[]
  hotels: Hotel[]
  itinerary: ItineraryDay[]
  checklist: ChecklistItem[]
  expenses: Expense[]
  documents: Document[]
  emergencyContacts: EmergencyContact[]
  quickLinks: QuickLink[]
  notes: Note[]
  passport: PassportInfo
  visas: VisaInfo[]
  currencyRates: CurrencyRate[]
  settings: TripSettings
  tourNotes: string[]
  restrictions: string[]
  lastUpdated: string
}
