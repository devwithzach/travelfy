import { z } from 'zod'

// Tolerant DB-row schemas: every field has a default fallback so schema drift
// (renamed column, null where string was expected) degrades gracefully instead
// of crashing the app. Validation still happens — the warning lives in
// `validateRow` below, which logs whenever a row needed any fallback.

const str = (def = '') => z.string().catch(def)
const num = (def = 0) => z.number().catch(def)
const bool = (def = false) => z.boolean().catch(def)
const strArr = () => z.array(z.string()).catch([])

export const localTransportRowSchema = z.object({
  id: str(),
  type: z.enum(['grab', 'tricycle', 'jeepney', 'habal-habal', 'uv-express', 'pedicab', 'taxi', 'fx', 'other']).catch('other'),
  from_place: str(),
  to_place: str(),
  fare: num(),
  currency: str('PHP'),
  notes: str(),
  date: str(),
})

export const busRowSchema = z.object({
  id: str(),
  operator: str(),
  bus_type: str(),
  from_city: str(),
  from_terminal: str(),
  to_city: str(),
  to_terminal: str(),
  departure_date: str(),
  departure_time: str(),
  arrival_date: str(),
  arrival_time: str(),
  seat_number: str(),
  booking_reference: str(),
  status: z.enum(['upcoming', 'boarding', 'in-transit', 'arrived']).catch('upcoming'),
  notes: str(),
})

export const ferryRowSchema = z.object({
  id: str(),
  operator: str(),
  vessel_name: str(),
  from_port: str(),
  from_terminal: str(),
  to_port: str(),
  to_terminal: str(),
  departure_date: str(),
  departure_time: str(),
  arrival_date: str(),
  arrival_time: str(),
  accommodation: str(),
  booking_reference: str(),
  ticket_number: str(),
  status: z.enum(['upcoming', 'boarding', 'in-transit', 'arrived']).catch('upcoming'),
  notes: str(),
})

export const flightRowSchema = z.object({
  id: str(),
  flight_number: str(),
  airline: str(),
  from_city: str(),
  from_code: str(),
  from_airport: str(),
  from_terminal: str(),
  to_city: str(),
  to_code: str(),
  to_airport: str(),
  to_terminal: str(),
  departure_date: str(),
  departure_time: str(),
  arrival_date: str(),
  arrival_time: str(),
  arrival_date_offset: str(),
  seat: str(),
  booking_reference: str(),
  gate: str(),
  status: z.enum(['upcoming', 'boarding', 'departed', 'arrived']).catch('upcoming'),
})

export const hotelRowSchema = z.object({
  id: str(),
  name: str(),
  address: str(),
  phone: str(),
  website: str(),
  check_in: str(),
  check_out: str(),
  room_type: str(),
  booking_reference: str(),
  nights: num(1),
  maps_url: str(),
  notes: str(),
})

export const activityRowSchema = z.object({
  id: str(),
  time: str(),
  title: str(),
  description: str(),
  type: z.enum(['transport', 'attraction', 'meal', 'hotel', 'shopping', 'free', 'other']).catch('other'),
  location: str(),
  done: bool(),
})

export const dayRowSchema = z.object({
  id: str(),
  date: str(),
  day_number: num(1),
  title: str(),
  subtitle: str(),
  meals: strArr(),
  hotel: str(),
  itinerary_activities: z.array(z.unknown()).nullable().catch(null),
})

export const checklistRowSchema = z.object({
  id: str(),
  label: str(),
  checked: bool(),
  category: z.enum(['documents', 'essentials', 'electronics', 'health', 'clothing', 'custom']).catch('custom'),
  weight_grams: num(),
})

export const journalRowSchema = z.object({
  id: str(),
  date: str(),
  title: str(),
  body: str(),
  mood: z.enum(['amazing', 'good', 'okay', 'tough', 'rough']).catch('good'),
  weather: str(),
  created_at: str(),
  updated_at: str(),
})

export const expenseRowSchema = z.object({
  id: str(),
  title: str(),
  amount: num(),
  currency: str('PHP'),
  category: z.enum(['food', 'transport', 'shopping', 'hotel', 'activities', 'other']).catch('other'),
  date: str(),
  notes: str(),
  receipt_url: str(),
})

export const documentRowSchema = z.object({
  id: str(),
  name: str(),
  type: z.enum(['passport', 'boarding_pass', 'visa', 'hotel_voucher', 'insurance', 'other']).catch('other'),
  file_name: str(),
  file_type: str(),
  file_size: num(),
  uploaded_at: str(),
  data_url: str(),
})

export const contactRowSchema = z.object({
  id: str(),
  name: str(),
  role: str(),
  phone: str(),
  type: z.enum(['personal', 'embassy', 'police', 'hospital', 'tour_guide']).catch('personal'),
  country: str(),
  address: str(),
  notes: str(),
})

export const linkRowSchema = z.object({
  id: str(),
  title: str(),
  url: str(),
  icon: str('link'),
  category: z.enum(['airline', 'hotel', 'maps', 'immigration', 'insurance', 'transport', 'other']).catch('other'),
})

export const noteRowSchema = z.object({
  id: str(),
  title: str(),
  content: str(),
  color: str('#2563EB'),
  created_at: str(),
  updated_at: str(),
})

export const visaRowSchema = z.object({
  id: str(),
  country: str(),
  visa_type: str(),
  visa_number: str(),
  issue_date: str(),
  expiry_date: str(),
  status: z.enum(['valid', 'expired', 'pending']).catch('valid'),
  notes: str(),
})

export const rateRowSchema = z.object({
  from_currency: str(),
  to_currency: str(),
  rate: num(),
  updated_at: str(),
})

export const passportRowSchema = z.object({
  full_name: str(),
  passport_number: str(),
  nationality: str(),
  date_of_birth: str(),
  issue_date: str(),
  expiry_date: str(),
  issuing_country: str(),
  gender: str(),
  place_of_birth: str(),
  mrz: str(),
  issuing_authority: str(),
  passport_type: str(),
})

export const tripRowSchema = z.object({
  id: str(),
  name: str(),
  destination: str(),
  start_date: str(),
  end_date: str(),
  description: str(),
  cover_image: str(),
  status: z.enum(['upcoming', 'active', 'completed']).catch('upcoming'),
  trip_type: z.enum(['international', 'domestic']).catch('international'),
  traveler_name: str(),
  profile_picture: str(),
  home_currency: str('PHP'),
  language: str('en'),
  total_budget: num(),
  baggage_limit_kg: num(),
  travelers: strArr(),
  tour_notes: strArr(),
  restrictions: strArr(),
})

export const tripSummaryRowSchema = z.object({
  id: str(),
  name: str(),
  destination: str(),
  start_date: str(),
  end_date: str(),
  status: z.enum(['upcoming', 'active', 'completed']).catch('upcoming'),
  cover_image: str(),
  trip_type: z.enum(['international', 'domestic']).catch('international'),
})

