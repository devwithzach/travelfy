import type { TripData } from '@/types'

export function createEmptyTrip(id = `trip-${Date.now()}`): TripData {
  return {
    tripInfo: {
      id,
      name: '',
      destination: '',
      startDate: '',
      endDate: '',
      coverImage: '',
      description: '',
      status: 'upcoming',
    },
    flights: [],
    hotels: [],
    itinerary: [],
    checklist: [],
    expenses: [],
    documents: [],
    emergencyContacts: [],
    quickLinks: [],
    notes: [],
    passport: {
      fullName: '',
      passportNumber: '',
      nationality: '',
      dateOfBirth: '',
      issueDate: '',
      expiryDate: '',
      issuingCountry: '',
    },
    visas: [],
    currencyRates: [],
    settings: {
      travelerName: '',
      profilePicture: '',
      theme: 'system',
      homeCurrency: 'PHP',
      language: 'en',
      totalBudget: 0,
    },
    tourNotes: [],
    restrictions: [],
    lastUpdated: new Date().toISOString(),
  }
}
