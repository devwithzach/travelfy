import { supabase } from '@/lib/supabase'
import type {
  TripData, TripSummary, Flight, Hotel, ItineraryDay, ItineraryActivity,
  ChecklistItem, Expense, Document, EmergencyContact, QuickLink,
  Note, VisaInfo, CurrencyRate
} from '@/types'
import { createEmptyTrip } from '@/data/emptyTrip'

// ── Mappers: DB row → TypeScript ──────────────────────────

function mapFlight(r: Record<string, unknown>): Flight {
  return {
    id: r.id as string,
    flightNumber: r.flight_number as string || '',
    airline: r.airline as string || '',
    from: r.from_city as string || '',
    fromCode: r.from_code as string || '',
    fromAirport: r.from_airport as string || '',
    fromTerminal: r.from_terminal as string || '',
    to: r.to_city as string || '',
    toCode: r.to_code as string || '',
    toAirport: r.to_airport as string || '',
    toTerminal: r.to_terminal as string || '',
    departureDate: r.departure_date as string || '',
    departureTime: r.departure_time as string || '',
    arrivalDate: r.arrival_date as string || '',
    arrivalTime: r.arrival_time as string || '',
    arrivalDateOffset: r.arrival_date_offset as string || '',
    seat: r.seat as string || '',
    bookingReference: r.booking_reference as string || '',
    gate: r.gate as string || '',
    status: (r.status as Flight['status']) || 'upcoming',
  }
}

function mapHotel(r: Record<string, unknown>): Hotel {
  return {
    id: r.id as string,
    name: r.name as string || '',
    address: r.address as string || '',
    phone: r.phone as string || '',
    website: r.website as string || '',
    checkIn: r.check_in as string || '',
    checkOut: r.check_out as string || '',
    roomType: r.room_type as string || '',
    bookingReference: r.booking_reference as string || '',
    nights: r.nights as number || 1,
    mapsUrl: r.maps_url as string || '',
    notes: r.notes as string || '',
  }
}

function mapActivity(r: Record<string, unknown>): ItineraryActivity {
  return {
    id: r.id as string,
    time: r.time as string || '',
    title: r.title as string || '',
    description: r.description as string || '',
    type: (r.type as ItineraryActivity['type']) || 'other',
    location: r.location as string || '',
  }
}

function mapDay(r: Record<string, unknown>): ItineraryDay {
  const acts = (r.itinerary_activities as Record<string, unknown>[] | null) || []
  return {
    id: r.id as string,
    date: r.date as string || '',
    dayNumber: r.day_number as number || 1,
    title: r.title as string || '',
    subtitle: r.subtitle as string || '',
    meals: (r.meals as string[]) || [],
    hotel: r.hotel as string || '',
    activities: acts.map(mapActivity).sort((a, b) => a.time.localeCompare(b.time)),
  }
}

function mapChecklist(r: Record<string, unknown>): ChecklistItem {
  return {
    id: r.id as string,
    label: r.label as string || '',
    checked: r.checked as boolean || false,
    category: (r.category as ChecklistItem['category']) || 'custom',
  }
}

function mapExpense(r: Record<string, unknown>): Expense {
  return {
    id: r.id as string,
    title: r.title as string || '',
    amount: r.amount as number || 0,
    currency: r.currency as string || 'PHP',
    category: (r.category as Expense['category']) || 'other',
    date: r.date as string || '',
    notes: r.notes as string || '',
  }
}

function mapDocument(r: Record<string, unknown>): Document {
  return {
    id: r.id as string,
    name: r.name as string || '',
    type: (r.type as Document['type']) || 'other',
    fileName: r.file_name as string || '',
    fileType: r.file_type as string || '',
    fileSize: r.file_size as number || 0,
    uploadedAt: r.uploaded_at as string || '',
    dataUrl: r.data_url as string || '',
  }
}

function mapContact(r: Record<string, unknown>): EmergencyContact {
  return {
    id: r.id as string,
    name: r.name as string || '',
    role: r.role as string || '',
    phone: r.phone as string || '',
    type: (r.type as EmergencyContact['type']) || 'personal',
    country: r.country as string || '',
    address: r.address as string || '',
    notes: r.notes as string || '',
  }
}

function mapLink(r: Record<string, unknown>): QuickLink {
  return {
    id: r.id as string,
    title: r.title as string || '',
    url: r.url as string || '',
    icon: r.icon as string || 'link',
    category: (r.category as QuickLink['category']) || 'other',
  }
}

function mapNote(r: Record<string, unknown>): Note {
  return {
    id: r.id as string,
    title: r.title as string || '',
    content: r.content as string || '',
    color: r.color as string || '#2563EB',
    createdAt: r.created_at as string || '',
    updatedAt: r.updated_at as string || '',
  }
}

function mapVisa(r: Record<string, unknown>): VisaInfo {
  return {
    id: r.id as string,
    country: r.country as string || '',
    visaType: r.visa_type as string || '',
    visaNumber: r.visa_number as string || '',
    issueDate: r.issue_date as string || '',
    expiryDate: r.expiry_date as string || '',
    status: (r.status as VisaInfo['status']) || 'valid',
    notes: r.notes as string || '',
  }
}

function mapRate(r: Record<string, unknown>): CurrencyRate {
  return {
    from: r.from_currency as string,
    to: r.to_currency as string,
    rate: r.rate as number,
    updatedAt: r.updated_at as string || '',
  }
}

// ── Sync helpers ──────────────────────────────────────────

async function syncTable(
  table: string,
  tripId: string,
  rows: Record<string, unknown>[]
) {
  await supabase.from(table).delete().eq('trip_id', tripId)
  if (rows.length > 0) await supabase.from(table).insert(rows)
}

// ── Main service ──────────────────────────────────────────

export const storageService = {

  async listTrips(userId: string): Promise<TripSummary[]> {
    const { data } = await supabase
      .from('trips')
      .select('id, name, destination, start_date, end_date, status, cover_image')
      .eq('user_id', userId)
      .order('start_date', { ascending: false })
    return (data || []).map(r => ({
      id: r.id as string,
      name: r.name as string || '',
      destination: r.destination as string || '',
      startDate: r.start_date as string || '',
      endDate: r.end_date as string || '',
      status: (r.status as TripSummary['status']) || 'upcoming',
      coverImage: r.cover_image as string || '',
    }))
  },

  async getTripById(userId: string, tripId: string): Promise<TripData> {
    const { data: tripRow } = await supabase
      .from('trips')
      .select('*')
      .eq('user_id', userId)
      .eq('id', tripId)
      .maybeSingle()

    if (!tripRow) return createEmptyTrip(tripId)

    // Parallel fetch all related data
    const [
      { data: flights },
      { data: hotels },
      { data: days },
      { data: checklist },
      { data: expenses },
      { data: documents },
      { data: contacts },
      { data: links },
      { data: notes },
      { data: passport },
      { data: visas },
      { data: rates },
    ] = await Promise.all([
      supabase.from('flights').select('*').eq('trip_id', tripId).order('sort_order'),
      supabase.from('hotels').select('*').eq('trip_id', tripId).order('check_in'),
      supabase.from('itinerary_days').select('*, itinerary_activities(*)').eq('trip_id', tripId).order('day_number'),
      supabase.from('checklist_items').select('*').eq('trip_id', tripId).order('sort_order'),
      supabase.from('expenses').select('*').eq('trip_id', tripId).order('created_at', { ascending: false }),
      supabase.from('documents').select('*').eq('trip_id', tripId),
      supabase.from('emergency_contacts').select('*').eq('trip_id', tripId),
      supabase.from('quick_links').select('*').eq('trip_id', tripId).order('sort_order'),
      supabase.from('notes').select('*').eq('trip_id', tripId).order('updated_at', { ascending: false }),
      supabase.from('passport_info').select('*').eq('user_id', userId).maybeSingle(),
      supabase.from('visas').select('*').eq('trip_id', tripId),
      supabase.from('currency_rates').select('*').eq('user_id', userId),
    ])

    return {
      tripInfo: {
        id: tripRow.id as string,
        name: tripRow.name as string || '',
        destination: tripRow.destination as string || '',
        startDate: tripRow.start_date as string || '',
        endDate: tripRow.end_date as string || '',
        coverImage: tripRow.cover_image as string || '',
        description: tripRow.description as string || '',
        status: (tripRow.status as 'upcoming' | 'active' | 'completed') || 'upcoming',
      },
      settings: {
        travelerName: tripRow.traveler_name as string || '',
        profilePicture: tripRow.profile_picture as string || '',
        theme: 'system',
        homeCurrency: tripRow.home_currency as string || 'PHP',
        language: tripRow.language as string || 'en',
        totalBudget: tripRow.total_budget as number || 0,
      },
      tourNotes: (tripRow.tour_notes as string[]) || [],
      restrictions: (tripRow.restrictions as string[]) || [],
      flights: (flights || []).map(r => mapFlight(r as Record<string, unknown>)),
      hotels: (hotels || []).map(r => mapHotel(r as Record<string, unknown>)),
      itinerary: (days || []).map(r => mapDay(r as Record<string, unknown>)),
      checklist: (checklist || []).map(r => mapChecklist(r as Record<string, unknown>)),
      expenses: (expenses || []).map(r => mapExpense(r as Record<string, unknown>)),
      documents: (documents || []).map(r => mapDocument(r as Record<string, unknown>)),
      emergencyContacts: (contacts || []).map(r => mapContact(r as Record<string, unknown>)),
      quickLinks: (links || []).map(r => mapLink(r as Record<string, unknown>)),
      notes: (notes || []).map(r => mapNote(r as Record<string, unknown>)),
      passport: passport ? {
        fullName: passport.full_name as string || '',
        passportNumber: passport.passport_number as string || '',
        nationality: passport.nationality as string || '',
        dateOfBirth: passport.date_of_birth as string || '',
        issueDate: passport.issue_date as string || '',
        expiryDate: passport.expiry_date as string || '',
        issuingCountry: passport.issuing_country as string || '',
      } : createEmptyTrip().passport,
      visas: (visas || []).map(r => mapVisa(r as Record<string, unknown>)),
      currencyRates: (rates || []).map(r => mapRate(r as Record<string, unknown>)),
      lastUpdated: new Date().toISOString(),
    }
  },

  async createTrip(userId: string, info: { name: string; destination: string; startDate: string; endDate: string; description: string }): Promise<string> {
    const id = crypto.randomUUID()
    await supabase.from('trips').insert({
      id,
      user_id: userId,
      name: info.name,
      destination: info.destination,
      start_date: info.startDate,
      end_date: info.endDate,
      description: info.description,
      status: 'upcoming',
      home_currency: 'PHP',
      language: 'en',
      total_budget: 0,
      tour_notes: [],
      restrictions: [],
    })
    return id
  },

  async deleteTripById(tripId: string, userId: string): Promise<void> {
    await supabase.from('trips').delete().eq('id', tripId).eq('user_id', userId)
  },

  async getTrip(userId: string): Promise<TripData> {
    // Get most recent trip for user
    const { data: tripRow } = await supabase
      .from('trips')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!tripRow) return createEmptyTrip()
    const tripId = tripRow.id as string

    // Parallel fetch all related data
    const [
      { data: flights },
      { data: hotels },
      { data: days },
      { data: checklist },
      { data: expenses },
      { data: documents },
      { data: contacts },
      { data: links },
      { data: notes },
      { data: passport },
      { data: visas },
      { data: rates },
    ] = await Promise.all([
      supabase.from('flights').select('*').eq('trip_id', tripId).order('sort_order'),
      supabase.from('hotels').select('*').eq('trip_id', tripId).order('check_in'),
      supabase.from('itinerary_days').select('*, itinerary_activities(*)').eq('trip_id', tripId).order('day_number'),
      supabase.from('checklist_items').select('*').eq('trip_id', tripId).order('sort_order'),
      supabase.from('expenses').select('*').eq('trip_id', tripId).order('created_at', { ascending: false }),
      supabase.from('documents').select('*').eq('trip_id', tripId),
      supabase.from('emergency_contacts').select('*').eq('trip_id', tripId),
      supabase.from('quick_links').select('*').eq('trip_id', tripId).order('sort_order'),
      supabase.from('notes').select('*').eq('trip_id', tripId).order('updated_at', { ascending: false }),
      supabase.from('passport_info').select('*').eq('user_id', userId).maybeSingle(),
      supabase.from('visas').select('*').eq('trip_id', tripId),
      supabase.from('currency_rates').select('*').eq('user_id', userId),
    ])

    return {
      tripInfo: {
        id: tripRow.id as string,
        name: tripRow.name as string || '',
        destination: tripRow.destination as string || '',
        startDate: tripRow.start_date as string || '',
        endDate: tripRow.end_date as string || '',
        coverImage: tripRow.cover_image as string || '',
        description: tripRow.description as string || '',
        status: (tripRow.status as 'upcoming' | 'active' | 'completed') || 'upcoming',
      },
      settings: {
        travelerName: tripRow.traveler_name as string || '',
        profilePicture: tripRow.profile_picture as string || '',
        theme: 'system',
        homeCurrency: tripRow.home_currency as string || 'PHP',
        language: tripRow.language as string || 'en',
        totalBudget: tripRow.total_budget as number || 0,
      },
      tourNotes: (tripRow.tour_notes as string[]) || [],
      restrictions: (tripRow.restrictions as string[]) || [],
      flights: (flights || []).map(r => mapFlight(r as Record<string, unknown>)),
      hotels: (hotels || []).map(r => mapHotel(r as Record<string, unknown>)),
      itinerary: (days || []).map(r => mapDay(r as Record<string, unknown>)),
      checklist: (checklist || []).map(r => mapChecklist(r as Record<string, unknown>)),
      expenses: (expenses || []).map(r => mapExpense(r as Record<string, unknown>)),
      documents: (documents || []).map(r => mapDocument(r as Record<string, unknown>)),
      emergencyContacts: (contacts || []).map(r => mapContact(r as Record<string, unknown>)),
      quickLinks: (links || []).map(r => mapLink(r as Record<string, unknown>)),
      notes: (notes || []).map(r => mapNote(r as Record<string, unknown>)),
      passport: passport ? {
        fullName: passport.full_name as string || '',
        passportNumber: passport.passport_number as string || '',
        nationality: passport.nationality as string || '',
        dateOfBirth: passport.date_of_birth as string || '',
        issueDate: passport.issue_date as string || '',
        expiryDate: passport.expiry_date as string || '',
        issuingCountry: passport.issuing_country as string || '',
      } : createEmptyTrip().passport,
      visas: (visas || []).map(r => mapVisa(r as Record<string, unknown>)),
      currencyRates: (rates || []).map(r => mapRate(r as Record<string, unknown>)),
      lastUpdated: new Date().toISOString(),
    }
  },

  async saveTrip(userId: string, trip: TripData): Promise<void> {
    const tripId = trip.tripInfo.id

    // Upsert trip record
    await supabase.from('trips').upsert({
      id: tripId,
      user_id: userId,
      name: trip.tripInfo.name,
      destination: trip.tripInfo.destination,
      start_date: trip.tripInfo.startDate,
      end_date: trip.tripInfo.endDate,
      description: trip.tripInfo.description,
      cover_image: trip.tripInfo.coverImage,
      status: trip.tripInfo.status,
      total_budget: trip.settings.totalBudget,
      home_currency: trip.settings.homeCurrency,
      traveler_name: trip.settings.travelerName,
      profile_picture: trip.settings.profilePicture,
      language: trip.settings.language,
      tour_notes: trip.tourNotes,
      restrictions: trip.restrictions,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' })

    // Sync all related tables in parallel
    await Promise.all([
      // Flights
      syncTable('flights', tripId, trip.flights.map((f, i) => ({
        id: f.id, trip_id: tripId, user_id: userId,
        flight_number: f.flightNumber, airline: f.airline,
        from_city: f.from, from_code: f.fromCode, from_airport: f.fromAirport, from_terminal: f.fromTerminal,
        to_city: f.to, to_code: f.toCode, to_airport: f.toAirport, to_terminal: f.toTerminal,
        departure_date: f.departureDate, departure_time: f.departureTime,
        arrival_date: f.arrivalDate, arrival_time: f.arrivalTime,
        arrival_date_offset: f.arrivalDateOffset, seat: f.seat,
        booking_reference: f.bookingReference, gate: f.gate,
        status: f.status, sort_order: i,
      }))),

      // Hotels
      syncTable('hotels', tripId, trip.hotels.map(h => ({
        id: h.id, trip_id: tripId, user_id: userId,
        name: h.name, address: h.address, phone: h.phone,
        website: h.website, check_in: h.checkIn, check_out: h.checkOut,
        room_type: h.roomType, booking_reference: h.bookingReference,
        nights: h.nights, maps_url: h.mapsUrl, notes: h.notes,
      }))),

      // Checklist
      syncTable('checklist_items', tripId, trip.checklist.map((c, i) => ({
        id: c.id, trip_id: tripId, user_id: userId,
        label: c.label, checked: c.checked, category: c.category, sort_order: i,
      }))),

      // Expenses
      syncTable('expenses', tripId, trip.expenses.map(e => ({
        id: e.id, trip_id: tripId, user_id: userId,
        title: e.title, amount: e.amount, currency: e.currency,
        category: e.category, date: e.date, notes: e.notes,
      }))),

      // Documents
      syncTable('documents', tripId, trip.documents.map(d => ({
        id: d.id, trip_id: tripId, user_id: userId,
        name: d.name, type: d.type, file_name: d.fileName,
        file_type: d.fileType, file_size: d.fileSize,
        data_url: d.dataUrl || '', uploaded_at: d.uploadedAt,
      }))),

      // Emergency contacts
      syncTable('emergency_contacts', tripId, trip.emergencyContacts.map(c => ({
        id: c.id, trip_id: tripId, user_id: userId,
        name: c.name, role: c.role, phone: c.phone,
        type: c.type, country: c.country || '', address: c.address || '', notes: c.notes || '',
      }))),

      // Quick links
      syncTable('quick_links', tripId, trip.quickLinks.map((l, i) => ({
        id: l.id, trip_id: tripId, user_id: userId,
        title: l.title, url: l.url, icon: l.icon, category: l.category, sort_order: i,
      }))),

      // Notes
      syncTable('notes', tripId, trip.notes.map(n => ({
        id: n.id, trip_id: tripId, user_id: userId,
        title: n.title, content: n.content, color: n.color,
        created_at: n.createdAt, updated_at: n.updatedAt,
      }))),

      // Visas
      syncTable('visas', tripId, trip.visas.map(v => ({
        id: v.id, trip_id: tripId, user_id: userId,
        country: v.country, visa_type: v.visaType, visa_number: v.visaNumber,
        issue_date: v.issueDate, expiry_date: v.expiryDate, status: v.status, notes: v.notes,
      }))),

      // Currency rates
      (async () => {
        await supabase.from('currency_rates').delete().eq('user_id', userId)
        if (trip.currencyRates.length > 0) {
          await supabase.from('currency_rates').insert(
            trip.currencyRates.map(r => ({
              id: `${userId}-${r.from}-${r.to}`,
              user_id: userId,
              from_currency: r.from,
              to_currency: r.to,
              rate: r.rate,
              updated_at: r.updatedAt,
            }))
          )
        }
      })(),

      // Passport (upsert by user_id)
      supabase.from('passport_info').upsert({
        user_id: userId,
        full_name: trip.passport.fullName,
        passport_number: trip.passport.passportNumber,
        nationality: trip.passport.nationality,
        date_of_birth: trip.passport.dateOfBirth,
        issue_date: trip.passport.issueDate,
        expiry_date: trip.passport.expiryDate,
        issuing_country: trip.passport.issuingCountry,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' }),

      // Itinerary days + activities (cascade delete handles activities)
      (async () => {
        await supabase.from('itinerary_days').delete().eq('trip_id', tripId)
        if (trip.itinerary.length > 0) {
          await supabase.from('itinerary_days').insert(
            trip.itinerary.map(d => ({
              id: d.id, trip_id: tripId, user_id: userId,
              date: d.date, day_number: d.dayNumber,
              title: d.title, subtitle: d.subtitle,
              meals: d.meals, hotel: d.hotel,
            }))
          )
          const allActivities = trip.itinerary.flatMap(d =>
            d.activities.map((a, i) => ({
              id: a.id, day_id: d.id, user_id: userId,
              time: a.time, title: a.title, description: a.description,
              type: a.type, location: a.location || '', sort_order: i,
            }))
          )
          if (allActivities.length > 0) {
            await supabase.from('itinerary_activities').insert(allActivities)
          }
        }
      })(),
    ])
  },

  async resetTrip(userId: string): Promise<void> {
    await supabase.from('trips').delete().eq('user_id', userId)
    await supabase.from('passport_info').delete().eq('user_id', userId)
    await supabase.from('currency_rates').delete().eq('user_id', userId)
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
