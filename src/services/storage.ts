import { supabase } from '@/lib/supabase'
import type {
  TripData, TripSummary, Flight, Hotel, ItineraryDay, ItineraryActivity,
  ChecklistItem, Expense, Document, EmergencyContact, QuickLink,
  Note, VisaInfo, CurrencyRate
} from '@/types'
import { createEmptyTrip } from '@/data/emptyTrip'
import {
  flightRowSchema, hotelRowSchema, activityRowSchema, dayRowSchema,
  checklistRowSchema, expenseRowSchema, documentRowSchema, contactRowSchema,
  linkRowSchema, noteRowSchema, visaRowSchema, rateRowSchema, passportRowSchema,
  tripRowSchema, tripSummaryRowSchema,
} from './schemas'

// ── Mappers: validated DB row → app type ──────────────────

function mapFlight(r: unknown): Flight {
  const v = flightRowSchema.parse(r)
  return {
    id: v.id, flightNumber: v.flight_number, airline: v.airline,
    from: v.from_city, fromCode: v.from_code, fromAirport: v.from_airport, fromTerminal: v.from_terminal,
    to: v.to_city, toCode: v.to_code, toAirport: v.to_airport, toTerminal: v.to_terminal,
    departureDate: v.departure_date, departureTime: v.departure_time,
    arrivalDate: v.arrival_date, arrivalTime: v.arrival_time,
    arrivalDateOffset: v.arrival_date_offset,
    seat: v.seat, bookingReference: v.booking_reference, gate: v.gate,
    status: v.status,
  }
}

function mapHotel(r: unknown): Hotel {
  const v = hotelRowSchema.parse(r)
  return {
    id: v.id, name: v.name, address: v.address, phone: v.phone, website: v.website,
    checkIn: v.check_in, checkOut: v.check_out, roomType: v.room_type,
    bookingReference: v.booking_reference, nights: v.nights, mapsUrl: v.maps_url, notes: v.notes,
  }
}

function mapActivity(r: unknown): ItineraryActivity {
  const v = activityRowSchema.parse(r)
  return {
    id: v.id, time: v.time, title: v.title, description: v.description,
    type: v.type, location: v.location, done: v.done,
  }
}

function mapDay(r: unknown): ItineraryDay {
  const v = dayRowSchema.parse(r)
  const acts = v.itinerary_activities ?? []
  return {
    id: v.id, date: v.date, dayNumber: v.day_number, title: v.title, subtitle: v.subtitle,
    meals: v.meals, hotel: v.hotel,
    activities: acts.map(mapActivity).sort((a, b) => a.time.localeCompare(b.time)),
  }
}

function mapChecklist(r: unknown): ChecklistItem {
  const v = checklistRowSchema.parse(r)
  return { id: v.id, label: v.label, checked: v.checked, category: v.category }
}

function mapExpense(r: unknown): Expense {
  const v = expenseRowSchema.parse(r)
  return {
    id: v.id, title: v.title, amount: v.amount, currency: v.currency,
    category: v.category, date: v.date, notes: v.notes,
  }
}

function mapDocument(r: unknown): Document {
  const v = documentRowSchema.parse(r)
  return {
    id: v.id, name: v.name, type: v.type, fileName: v.file_name,
    fileType: v.file_type, fileSize: v.file_size, uploadedAt: v.uploaded_at,
    dataUrl: v.data_url,
  }
}

function mapContact(r: unknown): EmergencyContact {
  const v = contactRowSchema.parse(r)
  return {
    id: v.id, name: v.name, role: v.role, phone: v.phone,
    type: v.type, country: v.country, address: v.address, notes: v.notes,
  }
}

function mapLink(r: unknown): QuickLink {
  const v = linkRowSchema.parse(r)
  return { id: v.id, title: v.title, url: v.url, icon: v.icon, category: v.category }
}

function mapNote(r: unknown): Note {
  const v = noteRowSchema.parse(r)
  return {
    id: v.id, title: v.title, content: v.content, color: v.color,
    createdAt: v.created_at, updatedAt: v.updated_at,
  }
}

function mapVisa(r: unknown): VisaInfo {
  const v = visaRowSchema.parse(r)
  return {
    id: v.id, country: v.country, visaType: v.visa_type, visaNumber: v.visa_number,
    issueDate: v.issue_date, expiryDate: v.expiry_date, status: v.status, notes: v.notes,
  }
}

function mapRate(r: unknown): CurrencyRate {
  const v = rateRowSchema.parse(r)
  return { from: v.from_currency, to: v.to_currency, rate: v.rate, updatedAt: v.updated_at }
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

// Fetch all the per-trip child tables in parallel and assemble a TripData.
// Shared between `getTripById` and `getTrip` to avoid duplication.
async function assembleTrip(userId: string, tripRowRaw: unknown): Promise<TripData> {
  const tripRow = tripRowSchema.parse(tripRowRaw)
  const tripId = tripRow.id

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
      id: tripRow.id,
      name: tripRow.name,
      destination: tripRow.destination,
      startDate: tripRow.start_date,
      endDate: tripRow.end_date,
      coverImage: tripRow.cover_image,
      description: tripRow.description,
      status: tripRow.status,
    },
    settings: {
      travelerName: tripRow.traveler_name,
      profilePicture: tripRow.profile_picture,
      theme: 'system',
      homeCurrency: tripRow.home_currency,
      language: tripRow.language,
      totalBudget: tripRow.total_budget,
    },
    tourNotes: tripRow.tour_notes,
    restrictions: tripRow.restrictions,
    flights: (flights ?? []).map(mapFlight),
    hotels: (hotels ?? []).map(mapHotel),
    itinerary: (days ?? []).map(mapDay),
    checklist: (checklist ?? []).map(mapChecklist),
    expenses: (expenses ?? []).map(mapExpense),
    documents: (documents ?? []).map(mapDocument),
    emergencyContacts: (contacts ?? []).map(mapContact),
    quickLinks: (links ?? []).map(mapLink),
    notes: (notes ?? []).map(mapNote),
    passport: passport
      ? (() => {
          const p = passportRowSchema.parse(passport)
          return {
            fullName: p.full_name,
            passportNumber: p.passport_number,
            nationality: p.nationality,
            dateOfBirth: p.date_of_birth,
            issueDate: p.issue_date,
            expiryDate: p.expiry_date,
            issuingCountry: p.issuing_country,
          }
        })()
      : createEmptyTrip().passport,
    visas: (visas ?? []).map(mapVisa),
    currencyRates: (rates ?? []).map(mapRate),
    lastUpdated: new Date().toISOString(),
  }
}

// ── Main service ──────────────────────────────────────────

export const storageService = {

  async listTrips(userId: string): Promise<TripSummary[]> {
    // Nested foreign-table `count` selects return the aggregate per parent row
    // in a single round trip. Saves an N+1 fan-out when rendering trip cards.
    const { data } = await supabase
      .from('trips')
      .select(`
        id, name, destination, start_date, end_date, status, cover_image,
        flights(count),
        hotels(count),
        itinerary_days(count),
        trip_photos(count)
      `)
      .eq('user_id', userId)
      .order('start_date', { ascending: false })

    const getCount = (rel: unknown): number => {
      if (Array.isArray(rel) && rel.length > 0 && typeof (rel[0] as { count?: number }).count === 'number') {
        return (rel[0] as { count: number }).count
      }
      return 0
    }

    return (data ?? []).map(r => {
      const v = tripSummaryRowSchema.parse(r)
      const row = r as Record<string, unknown>
      return {
        id: v.id,
        name: v.name,
        destination: v.destination,
        startDate: v.start_date,
        endDate: v.end_date,
        status: v.status,
        coverImage: v.cover_image,
        counts: {
          flights: getCount(row.flights),
          hotels: getCount(row.hotels),
          days: getCount(row.itinerary_days),
          photos: getCount(row.trip_photos),
        },
      }
    })
  },

  async getTripById(userId: string, tripId: string): Promise<TripData> {
    const { data: tripRow } = await supabase
      .from('trips')
      .select('*')
      .eq('user_id', userId)
      .eq('id', tripId)
      .maybeSingle()

    if (!tripRow) return createEmptyTrip(tripId)
    return assembleTrip(userId, tripRow)
  },

  async getTrip(userId: string): Promise<TripData> {
    const { data: tripRow } = await supabase
      .from('trips')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!tripRow) return createEmptyTrip()
    return assembleTrip(userId, tripRow)
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
              done: a.done ?? false,
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
