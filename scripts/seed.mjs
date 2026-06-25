// Run: node scripts/seed.mjs
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://uqlvkxyxecefbbglsbow.supabase.co'
const SUPABASE_KEY = 'sb_publishable_wYyP0w6VEVALDynYDPCoGQ_uX8VqApS'
const EMAIL = 'zcampaner@gmail.com'
const PASSWORD = 'Travelfy@2026'
const TRIP_ID = 'hk-macau-2026'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// ── Trip Data ────────────────────────────────────────────────

const trip = {
  id: TRIP_ID,
  name: 'Hong Kong – Macau Family Trip',
  destination: 'Hong Kong & Macau',
  start_date: '2026-06-26',
  end_date: '2026-06-30',
  description: '4 Days 3 Nights VIP Group Tour – 6 Travelers (4 Adults, 2 Kids)',
  cover_image: '',
  status: 'upcoming',
  total_budget: 0,
  home_currency: 'PHP',
  traveler_name: 'Zach Campaner',
  profile_picture: '',
  language: 'en',
  tour_notes: [
    'Standard hotel check-in time: 3:00 PM',
    'Standard hotel check-out time: 11:00 AM (12 noon on Days 3 & 4)',
    'Tour guide waits at Hong Kong Airport – A Exit, International Arrivals Group Pick-up Area',
    'Welcome board: "Welcome JUNE 26-29 HONG KONG-MACAU 4D3N VIP GROUP"',
    'Itinerary order may change due to traffic or weather conditions',
    'Cancellation is 100% surcharged – no refunds',
    'Most Hong Kong hotels no longer provide bottled water',
    'Hotels only provide soap – bring your own toiletries (toothpaste, toothbrush, shower cap, shaver)',
    'Day 2 has Compulsory Shopping Stop – not joining will be charged $80 USD/pax',
    'Disneyland tickets issued onsite on Day 2 (14:30–21:00)',
    'Facebook and Google accessible without VPN in Hong Kong and Macau',
    'Exchange HKD and Macau Pataca in advance in the Philippines – better rates',
    'Airport currency exchange accepts only USD',
    'Tour guide may assist with small cash exchange at airport',
  ],
  restrictions: [
    'No lighters on plane or at tourist attractions',
    'No knives, self-heating food, or alcohol on plane or tourist attractions',
    'Firearms, ammunition, police weapons, controlled substances, radioactive, oxidizing agents – strictly prohibited',
    'Flammable/explosive, corrosives, blunt materials, sharp materials, magnetized items, poisons – prohibited',
    'Checked baggage: Liquids/cosmetics single bottle above 100ml NOT allowed in carry-on',
    'Carry-on: All liquids/cosmetics must be ≤ 100ml per bottle',
    'Power banks: Maximum capacity 20,000 mAh; no more than 2 per person',
    'Lithium batteries/battery packs must NOT exceed 160 Wh',
    'Maximum 2 bottles of perfume per person',
    'Socket voltage in HK/Macau is 220V – bring appropriate adapters',
  ],
}

// ── Flights ──────────────────────────────────────────────────

const flights = [
  {
    id: 'fl-001',
    trip_id: TRIP_ID,
    flight_number: '5J110',
    airline: 'Cebu Pacific',
    from_city: 'Manila',
    from_code: 'MNL',
    from_airport: 'Ninoy Aquino International Airport',
    from_terminal: 'Terminal 3',
    to_city: 'Hong Kong',
    to_code: 'HKG',
    to_airport: 'Hong Kong International Airport',
    to_terminal: 'Terminal 1',
    departure_date: '2026-06-26',
    departure_time: '07:10',
    arrival_date: '2026-06-26',
    arrival_time: '09:45',
    arrival_date_offset: '',
    seat: '',
    booking_reference: 'MDKEFL',
    gate: '',
    status: 'upcoming',
    sort_order: 0,
  },
  {
    id: 'fl-002',
    trip_id: TRIP_ID,
    flight_number: '5J363',
    airline: 'Cebu Pacific',
    from_city: 'Macau',
    from_code: 'MFM',
    from_airport: 'Macau International Airport',
    from_terminal: '',
    to_city: 'Manila',
    to_code: 'MNL',
    to_airport: 'Ninoy Aquino International Airport',
    to_terminal: 'Terminal 3',
    departure_date: '2026-06-29',
    departure_time: '22:25',
    arrival_date: '2026-06-30',
    arrival_time: '00:50',
    arrival_date_offset: '+1',
    seat: '',
    booking_reference: 'MDKEFL',
    gate: '',
    status: 'upcoming',
    sort_order: 1,
  },
]

// ── Hotels ───────────────────────────────────────────────────

const hotels = [
  {
    id: 'ht-001',
    trip_id: TRIP_ID,
    name: 'Dorsett Kwun Tong',
    address: '9 Chong Yip St, Kwun Tong, Kowloon, Hong Kong',
    phone: '+852 3110 8380',
    website: 'https://www.dorsetthotels.com',
    check_in: '2026-06-26',
    check_out: '2026-06-28',
    room_type: 'Standard Room',
    booking_reference: '',
    nights: 2,
    maps_url: 'https://maps.google.com/?q=Dorsett+Kwun+Tong+Hong+Kong',
    notes: 'Check-in 3:00 PM. Check-out 11:00 AM. Hotel does not provide bottled water. Bring own toiletries.',
  },
  {
    id: 'ht-002',
    trip_id: TRIP_ID,
    name: 'Hotel Guia',
    address: 'Estrada Do Engenheiro Trigo, Macau',
    phone: '+853 2851 3888',
    website: '',
    check_in: '2026-06-28',
    check_out: '2026-06-29',
    room_type: 'Standard Room',
    booking_reference: '',
    nights: 1,
    maps_url: 'https://maps.google.com/?q=Hotel+Guia+Macau',
    notes: 'Check-in 3:00 PM. Check-out 12:00 noon.',
  },
]

// ── Itinerary Days ───────────────────────────────────────────

const days = [
  {
    id: 'day-1',
    trip_id: TRIP_ID,
    date: '2026-06-26',
    day_number: 1,
    title: 'Manila → Hong Kong',
    subtitle: 'Arrival Day',
    meals: [],
    hotel: 'Dorsett Kwun Tong',
  },
  {
    id: 'day-2',
    trip_id: TRIP_ID,
    date: '2026-06-27',
    day_number: 2,
    title: 'Hong Kong City Tour',
    subtitle: 'Breakfast & Lunch Included',
    meals: ['Breakfast', 'Lunch'],
    hotel: 'Dorsett Kwun Tong',
  },
  {
    id: 'day-3',
    trip_id: TRIP_ID,
    date: '2026-06-28',
    day_number: 3,
    title: 'Hong Kong → Macau',
    subtitle: 'Breakfast Included',
    meals: ['Breakfast'],
    hotel: 'Hotel Guia',
  },
  {
    id: 'day-4',
    trip_id: TRIP_ID,
    date: '2026-06-29',
    day_number: 4,
    title: 'Macau City Tour & Departure',
    subtitle: 'Breakfast & Lunch Included',
    meals: ['Breakfast', 'Lunch'],
    hotel: '',
  },
]

// ── Itinerary Activities ─────────────────────────────────────

const activities = [
  // Day 1
  { id: 'act-1-1', day_id: 'day-1', time: '05:00', title: 'Depart for Airport', description: 'Head to NAIA Terminal 3 for check-in. ParkNFly Pasay parking booked (June 26–30).', type: 'transport', location: 'NAIA Terminal 3, Manila', sort_order: 0 },
  { id: 'act-1-2', day_id: 'day-1', time: '07:10', title: 'Flight 5J110 Departs', description: 'Cebu Pacific MNL → HKG. Booking ref: MDKEFL.', type: 'transport', location: 'NAIA Terminal 3', sort_order: 1 },
  { id: 'act-1-3', day_id: 'day-1', time: '09:45', title: 'Arrive Hong Kong', description: 'HKIA Terminal 1. Tour guide waits at A Exit, International Arrivals Group Pick-up Area with board "Welcome JUNE 26-29 HONG KONG-MACAU 4D3N VIP GROUP".', type: 'transport', location: 'HKIA Terminal 1 – A Exit', sort_order: 2 },
  { id: 'act-1-4', day_id: 'day-1', time: '10:00', title: 'Meet & Greet', description: 'Meet tour guide and group. Group: Zach, Alyssa, Marceo (14), Zion (4), Zean (2), Michelle.', type: 'other', location: 'HKIA International Arrivals', sort_order: 3 },
  { id: 'act-1-5', day_id: 'day-1', time: '12:00', title: 'Transfer to Hotel', description: 'Coach transfer from airport to Dorsett Kwun Tong, Kowloon.', type: 'transport', location: 'Kwun Tong, Kowloon', sort_order: 4 },
  { id: 'act-1-6', day_id: 'day-1', time: '15:00', title: 'Hotel Check-in – Dorsett Kwun Tong', description: 'Standard check-in 3:00 PM. No bottled water provided. Bring own toiletries.', type: 'hotel', location: '9 Chong Yip St, Kwun Tong', sort_order: 5 },
  { id: 'act-1-7', day_id: 'day-1', time: '16:00', title: 'Free Time', description: 'Explore Kwun Tong or rest. Great time for the kids to settle in.', type: 'free', location: 'Kwun Tong, Hong Kong', sort_order: 6 },
  // Day 2
  { id: 'act-2-1', day_id: 'day-2', time: '07:00', title: 'Breakfast', description: 'Breakfast package – table dishes, Chinese food.', type: 'meal', location: 'Hotel Restaurant', sort_order: 0 },
  { id: 'act-2-2', day_id: 'day-2', time: '09:00', title: 'Wong Tai Sin Shrine', description: 'Famous Taoist temple known for fortune telling and beautiful architecture.', type: 'attraction', location: '2 Chuk Yuen Village, Wong Tai Sin, Hong Kong', sort_order: 1 },
  { id: 'act-2-3', day_id: 'day-2', time: '10:30', title: 'Jewelry Store (Compulsory Shopping)', description: 'Free shopping at jewelry store. Compulsory stop – not joining charged $80 USD/pax.', type: 'shopping', location: 'Hong Kong', sort_order: 2 },
  { id: 'act-2-4', day_id: 'day-2', time: '12:00', title: 'West Kowloon Cultural District', description: 'Explore the vibrant arts and cultural hub along Victoria Harbour.', type: 'attraction', location: 'West Kowloon Cultural District', sort_order: 3 },
  { id: 'act-2-5', day_id: 'day-2', time: '13:00', title: 'Lunch', description: 'Included lunch – Chinese cuisine.', type: 'meal', location: 'Hong Kong', sort_order: 4 },
  { id: 'act-2-6', day_id: 'day-2', time: '14:30', title: 'Hong Kong Disneyland', description: 'Ticket + round-trip transfer included. Tickets issued onsite. 14:30–21:00. Perfect for Zion (4) and Zean (2)!', type: 'attraction', location: 'Hong Kong Disneyland, Lantau Island', sort_order: 5 },
  { id: 'act-2-7', day_id: 'day-2', time: '21:00', title: 'Transfer Back to Hotel', description: 'Coach transfer from Disneyland back to Dorsett Kwun Tong.', type: 'transport', location: 'Kwun Tong, Kowloon', sort_order: 6 },
  // Day 3
  { id: 'act-3-1', day_id: 'day-3', time: '07:00', title: 'Breakfast', description: 'Breakfast package or refund HKD 30/pax to enjoy local Hong Kong breakfast on your own.', type: 'meal', location: 'Hotel or nearby', sort_order: 0 },
  { id: 'act-3-2', day_id: 'day-3', time: '09:00', title: 'Half Day Free Time in Hong Kong', description: 'Last chance to explore Hong Kong – shop, sightsee, or relax before check-out.', type: 'free', location: 'Hong Kong', sort_order: 1 },
  { id: 'act-3-3', day_id: 'day-3', time: '12:00', title: 'Hotel Check-out', description: 'Check out from Dorsett Kwun Tong by 12:00 noon.', type: 'hotel', location: 'Dorsett Kwun Tong', sort_order: 2 },
  { id: 'act-3-4', day_id: 'day-3', time: '16:00', title: 'Transfer to Macau', description: 'Coach transfer via Hong Kong-Zhuhai-Macau Bridge (HZMB).', type: 'transport', location: 'HZMB – Hong Kong to Macau', sort_order: 3 },
  { id: 'act-3-5', day_id: 'day-3', time: '17:30', title: 'Hong Kong–Zhuhai–Macau Bridge', description: 'Scenic drive across the 55 km HZMB mega bridge connecting HK, Zhuhai, and Macau.', type: 'attraction', location: 'HZMB, South China Sea', sort_order: 4 },
  { id: 'act-3-6', day_id: 'day-3', time: '18:30', title: 'Hotel Check-in – Hotel Guia', description: 'Check in at Hotel Guia, Macau. Check-in time 3:00 PM (may arrive later due to transfer).', type: 'hotel', location: 'Hotel Guia, Macau', sort_order: 5 },
  { id: 'act-3-7', day_id: 'day-3', time: '20:00', title: 'Free Evening in Macau', description: 'Explore Macau at night – casinos, colonial architecture, Portuguese cuisine.', type: 'free', location: 'Macau', sort_order: 6 },
  // Day 4
  { id: 'act-4-1', day_id: 'day-4', time: '07:00', title: 'Breakfast', description: 'Breakfast package or refund HKD 30/pax to enjoy local Hong Kong-style breakfast on your own.', type: 'meal', location: 'Hotel or nearby', sort_order: 0 },
  { id: 'act-4-2', day_id: 'day-4', time: '10:00', title: 'Golden Lotus Square', description: 'Iconic golden lotus sculpture – symbol of Macau\'s handover to China.', type: 'attraction', location: 'Golden Lotus Square, Macau', sort_order: 1 },
  { id: 'act-4-3', day_id: 'day-4', time: '10:30', title: 'Ruins of St. Paul\'s', description: 'Iconic 17th-century Baroque façade – Macau\'s most recognized landmark.', type: 'attraction', location: 'Ruins of St. Paul\'s, Macau', sort_order: 2 },
  { id: 'act-4-4', day_id: 'day-4', time: '11:00', title: 'Board Fortress (Monte Fort)', description: 'Historic fortress with panoramic views of Macau peninsula.', type: 'attraction', location: 'Monte Fort, Macau', sort_order: 3 },
  { id: 'act-4-5', day_id: 'day-4', time: '12:00', title: 'Hotel Check-out', description: 'Check out from Hotel Guia by 12:00 noon.', type: 'hotel', location: 'Hotel Guia, Macau', sort_order: 4 },
  { id: 'act-4-6', day_id: 'day-4', time: '12:30', title: 'Lunch', description: 'Included lunch – local Macanese cuisine.', type: 'meal', location: 'Macau', sort_order: 5 },
  { id: 'act-4-7', day_id: 'day-4', time: '14:00', title: 'Macau Outlets', description: 'Free shopping – international brands and local souvenirs.', type: 'shopping', location: 'Macau Outlets', sort_order: 6 },
  { id: 'act-4-8', day_id: 'day-4', time: '15:30', title: 'Mazu Pavilion', description: 'Grand statue of Mazu (goddess of the sea), patron deity of Macau fishermen.', type: 'attraction', location: 'Mazu Pavilion, Coloane, Macau', sort_order: 7 },
  { id: 'act-4-9', day_id: 'day-4', time: '17:00', title: 'Macao Diamond Lighting Show', description: 'Spectacular LED light show – Macau\'s iconic evening spectacle.', type: 'attraction', location: 'Macau', sort_order: 8 },
  { id: 'act-4-10', day_id: 'day-4', time: '18:00', title: 'Eiffel Tower Photo Stop', description: 'Photo opportunity at the replica Eiffel Tower at The Parisian Macao.', type: 'attraction', location: 'The Parisian Macao', sort_order: 9 },
  { id: 'act-4-11', day_id: 'day-4', time: '18:30', title: 'The Venetian Macau', description: 'Grand Canal Shoppes at the iconic Venetian resort.', type: 'attraction', location: 'The Venetian Macao', sort_order: 10 },
  { id: 'act-4-12', day_id: 'day-4', time: '19:30', title: 'Souvenir Shopping', description: 'Last chance – Macanese egg tarts, pork jerky, local gifts.', type: 'shopping', location: 'Macau', sort_order: 11 },
  { id: 'act-4-13', day_id: 'day-4', time: '20:30', title: 'Transfer to Airport', description: 'Coach transfer to Macau International Airport.', type: 'transport', location: 'Macau International Airport', sort_order: 12 },
  { id: 'act-4-14', day_id: 'day-4', time: '22:25', title: 'Flight 5J363 Departs', description: 'Cebu Pacific MFM → MNL. Arrives 12:50 AM (+1). Home Sweet Home!', type: 'transport', location: 'Macau International Airport', sort_order: 13 },
]

// ── Checklist ────────────────────────────────────────────────

const checklist = [
  // Documents
  { id: 'chk-1', label: 'Passport (all 6 travelers)', checked: false, category: 'documents', sort_order: 0 },
  { id: 'chk-2', label: 'Group Visa Copy', checked: false, category: 'documents', sort_order: 1 },
  { id: 'chk-3', label: 'Flight Itinerary Copies', checked: false, category: 'documents', sort_order: 2 },
  { id: 'chk-4', label: 'Booking Confirmation (MDKEFL)', checked: false, category: 'documents', sort_order: 3 },
  { id: 'chk-5', label: 'Travel Insurance', checked: false, category: 'documents', sort_order: 4 },
  { id: 'chk-6', label: 'ParkNFly Reservation (Pasay, June 26–30)', checked: true, category: 'documents', sort_order: 5 },
  // Essentials
  { id: 'chk-7', label: 'Hong Kong Dollar (HKD)', checked: false, category: 'essentials', sort_order: 6 },
  { id: 'chk-8', label: 'Macau Pataca (MOP)', checked: false, category: 'essentials', sort_order: 7 },
  { id: 'chk-9', label: 'Credit Card', checked: false, category: 'essentials', sort_order: 8 },
  { id: 'chk-10', label: 'Toothbrush (not provided by hotel)', checked: false, category: 'essentials', sort_order: 9 },
  { id: 'chk-11', label: 'Toothpaste (not provided by hotel)', checked: false, category: 'essentials', sort_order: 10 },
  { id: 'chk-12', label: 'Shower Cap (not provided by hotel)', checked: false, category: 'essentials', sort_order: 11 },
  { id: 'chk-13', label: 'Shaver / Razor (not provided by hotel)', checked: false, category: 'essentials', sort_order: 12 },
  { id: 'chk-14', label: 'Luggage', checked: false, category: 'essentials', sort_order: 13 },
  { id: 'chk-15', label: 'Hand Sanitizer', checked: false, category: 'essentials', sort_order: 14 },
  { id: 'chk-16', label: 'Sunscreen', checked: false, category: 'essentials', sort_order: 15 },
  { id: 'chk-17', label: 'Umbrella / Raincoat', checked: false, category: 'essentials', sort_order: 16 },
  // Kids
  { id: 'chk-18', label: 'Diapers for Zean (2yo)', checked: false, category: 'essentials', sort_order: 17 },
  { id: 'chk-19', label: 'Baby Milk / Formula (Zean – 2yo)', checked: false, category: 'essentials', sort_order: 18 },
  { id: 'chk-20', label: 'Wet Wipes', checked: false, category: 'essentials', sort_order: 19 },
  { id: 'chk-21', label: 'Stroller / Baby Carrier (Zean)', checked: false, category: 'essentials', sort_order: 20 },
  { id: 'chk-22', label: 'Kids\' Snacks', checked: false, category: 'essentials', sort_order: 21 },
  // Electronics
  { id: 'chk-23', label: 'Power Bank (max 20,000 mAh, max 2 per person)', checked: false, category: 'electronics', sort_order: 22 },
  { id: 'chk-24', label: 'Phone Charger', checked: false, category: 'electronics', sort_order: 23 },
  { id: 'chk-25', label: 'Travel Adapter (220V)', checked: false, category: 'electronics', sort_order: 24 },
  { id: 'chk-26', label: 'Camera', checked: false, category: 'electronics', sort_order: 25 },
  // Health
  { id: 'chk-27', label: 'Cold / Flu Relief', checked: false, category: 'health', sort_order: 26 },
  { id: 'chk-28', label: 'Painkillers', checked: false, category: 'health', sort_order: 27 },
  { id: 'chk-29', label: 'Anti-diarrheal Pills', checked: false, category: 'health', sort_order: 28 },
  { id: 'chk-30', label: 'Band-aids', checked: false, category: 'health', sort_order: 29 },
  { id: 'chk-31', label: 'Kids\' Medicine (fever/cough)', checked: false, category: 'health', sort_order: 30 },
  // Clothing
  { id: 'chk-32', label: 'Comfortable Walking Shoes', checked: false, category: 'clothing', sort_order: 31 },
  { id: 'chk-33', label: 'Clothes (4 days + extra for 6 pax)', checked: false, category: 'clothing', sort_order: 32 },
]

// ── Expenses ─────────────────────────────────────────────────

const expenses = [
  {
    id: 'exp-1',
    title: 'Group Tour Package (JILLAX Travel & Tours)',
    amount: 0,
    currency: 'PHP',
    category: 'hotel',
    date: '2026-06-01',
    notes: 'Booked via JILLAX Travel and Tours. Includes hotel, transfers, meals, and entrance fees per itinerary. Non-refundable.',
  },
  {
    id: 'exp-2',
    title: 'Cebu Pacific Flights – Round Trip (6 pax)',
    amount: 0,
    currency: 'PHP',
    category: 'transport',
    date: '2025-11-06',
    notes: 'Booking ref: MDKEFL. 5J110 (MNL→HKG) + 5J363 (MFM→MNL). Booked Nov 6, 2025.',
  },
  {
    id: 'exp-3',
    title: 'ParkNFly Parking – Pasay',
    amount: 0,
    currency: 'PHP',
    category: 'transport',
    date: '2026-06-26',
    notes: 'Parking at ParkNFly Pasay, June 26–30, 2026 (4 nights). Already booked.',
  },
]

// ── Emergency Contacts ───────────────────────────────────────

const contacts = [
  { id: 'ec-1', name: 'Philippine Consulate General – Hong Kong', role: 'Philippine Consulate', phone: '+852 2823 8500', type: 'embassy', country: 'Hong Kong', address: '14/F, United Centre, 95 Queensway, Admiralty, Hong Kong', notes: 'Mon–Fri 9AM–5PM. Passport, visa, citizen assistance.' },
  { id: 'ec-2', name: 'Philippine Consulate General – Macau', role: 'Philippine Consulate', phone: '+853 2855 5858', type: 'embassy', country: 'Macau', address: 'Suite 301, 3/F AIA Tower, 251A-301 Avenida Comercial de Macau', notes: '' },
  { id: 'ec-3', name: 'Hong Kong Emergency Services', role: 'Police / Fire / Ambulance', phone: '999', type: 'police', country: 'Hong Kong', address: '', notes: 'Dial 999 for any emergency in Hong Kong.' },
  { id: 'ec-4', name: 'Macau Emergency Services', role: 'Police / Fire / Ambulance', phone: '999', type: 'police', country: 'Macau', address: '', notes: 'Dial 999 for any emergency in Macau.' },
  { id: 'ec-5', name: 'Queen Elizabeth Hospital', role: 'Major Hospital', phone: '+852 2958 8888', type: 'hospital', country: 'Hong Kong', address: '30 Gascoigne Road, Yau Ma Tei, Kowloon', notes: 'Nearest major public hospital to Kwun Tong.' },
  { id: 'ec-6', name: 'Centro Hospitalar Conde S. Januário', role: 'Major Hospital', phone: '+853 2831 3731', type: 'hospital', country: 'Macau', address: 'Estrada do Visconde de S. Januário, Macau', notes: 'Main public hospital in Macau.' },
]

// ── Quick Links ──────────────────────────────────────────────

const links = [
  { id: 'ql-1', title: 'Cebu Pacific', url: 'https://www.cebupacificair.com', icon: 'plane', category: 'airline', sort_order: 0 },
  { id: 'ql-2', title: 'eTravel Philippines', url: 'https://etravel.gov.ph', icon: 'file-text', category: 'immigration', sort_order: 1 },
  { id: 'ql-3', title: 'Dorsett Kwun Tong', url: 'https://www.dorsetthotels.com/en/dorsett/kwun-tong-hong-kong', icon: 'building', category: 'hotel', sort_order: 2 },
  { id: 'ql-4', title: 'HK Disneyland', url: 'https://www.hongkongdisneyland.com', icon: 'star', category: 'other', sort_order: 3 },
  { id: 'ql-5', title: 'Google Maps', url: 'https://maps.google.com', icon: 'map-pin', category: 'maps', sort_order: 4 },
  { id: 'ql-6', title: 'XE Currency Converter', url: 'https://www.xe.com', icon: 'dollar-sign', category: 'other', sort_order: 5 },
]

// ── Notes ────────────────────────────────────────────────────

const now = new Date().toISOString()
const notes = [
  {
    id: 'note-1',
    title: 'Our Travel Group',
    content: '6 Travelers – 4 Adults, 2 Kids\n\n1. Zach Campaner (Main Traveler)\n2. Alyssa Erica Campaner – Spouse\n3. Marceo Angelo Realubit – Son (14 yrs)\n4. Zion Alexzander Campaner – Son (4 yrs)\n5. Zean Alessandro Campaner – Son (2 yrs)\n6. Michelle Lorainne Abkilin – Cousin\n\nParking: ParkNFly Pasay, June 26–30, 2026 (already booked)',
    color: '#8b5cf6',
    created_at: now,
    updated_at: now,
  },
  {
    id: 'note-2',
    title: 'Tour Guide Info',
    content: 'Tour guide meets at Hong Kong Airport – A Exit, International Arrivals Group Pick-up Area.\n\nWelcome board: "Welcome JUNE 26-29 HONG KONG-MACAU 4D3N VIP GROUP"\n\nContact tour guide immediately if separated from group.',
    color: '#2563EB',
    created_at: now,
    updated_at: now,
  },
  {
    id: 'note-3',
    title: 'Money & Currency Exchange',
    content: 'Exchange HKD and MOP in advance in the Philippines – better rates.\n\nHKD is widely accepted in Macau (almost 1:1).\nMOP NOT accepted in Hong Kong.\n\nUSD accepted for emergency exchange at airport.\nTour guide may assist with small cash exchange at airport.',
    color: '#10b981',
    created_at: now,
    updated_at: now,
  },
  {
    id: 'note-4',
    title: 'Internet & Apps',
    content: 'Hong Kong and Macau allow Facebook and Google WITHOUT a VPN.\n\nNo need to subscribe to a VPN service for this trip.\n\nGet a local SIM or roaming plan before departure.',
    color: '#f59e0b',
    created_at: now,
    updated_at: now,
  },
  {
    id: 'note-5',
    title: 'Packing Reminders',
    content: 'Hotels ONLY provide soap. Bring your own:\n- Toothbrush & toothpaste\n- Shower cap\n- Shaver/razor\n\nHotels do NOT provide bottled water.\n\nSocket voltage: 220V – bring adapters!\n\nMax 2 power banks per person (≤20,000 mAh)\nMax 2 perfume bottles per person',
    color: '#ef4444',
    created_at: now,
    updated_at: now,
  },
]

// ── Visas ────────────────────────────────────────────────────

const visas = [
  { id: 'visa-1', country: 'Hong Kong', visa_type: 'Group Tourist Visa', visa_number: '', issue_date: '', expiry_date: '2026-06-29', status: 'valid', notes: 'Group visa arranged by JILLAX Travel and Tours. Copy provided by agency.' },
  { id: 'visa-2', country: 'Macau', visa_type: 'Group Tourist Visa', visa_number: '', issue_date: '', expiry_date: '2026-06-29', status: 'valid', notes: 'Covered under same group visa package for HK–Macau tour.' },
]

// ── Currency Rates ───────────────────────────────────────────

const today = new Date().toISOString().split('T')[0]
const currencyRates = [
  { from_currency: 'PHP', to_currency: 'HKD', rate: 0.137 },
  { from_currency: 'PHP', to_currency: 'MOP', rate: 0.140 },
  { from_currency: 'PHP', to_currency: 'USD', rate: 0.017 },
  { from_currency: 'HKD', to_currency: 'PHP', rate: 7.30 },
  { from_currency: 'USD', to_currency: 'PHP', rate: 58.50 },
]

// ── Seed Function ────────────────────────────────────────────

async function seed() {
  // Try sign-in first; if no account, sign up
  console.log('🔐 Signing in...')
  let session = null
  let { data: signInData, error: authError } = await supabase.auth.signInWithPassword({ email: EMAIL, password: PASSWORD })

  if (authError) {
    console.log('   No account found – creating one...')
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ email: EMAIL, password: PASSWORD })
    if (signUpError || !signUpData.user) {
      console.error('❌ Sign up failed:', signUpError?.message)
      process.exit(1)
    }
    console.log(`✅ Account created: ${signUpData.user.email}`)
    const { data: retry, error: retryErr } = await supabase.auth.signInWithPassword({ email: EMAIL, password: PASSWORD })
    if (retryErr || !retry.session) {
      console.error('❌ Could not sign in after signup:', retryErr?.message)
      process.exit(1)
    }
    signInData = retry
  }

  session = signInData.session
  const user = signInData.user
  if (!session || !user) { console.error('❌ No session.'); process.exit(1) }
  console.log(`✅ Signed in as: ${user.email} (${user.id})`)

  // Create authenticated client with the access token
  const db = createClient(SUPABASE_URL, SUPABASE_KEY, {
    global: { headers: { Authorization: `Bearer ${session.access_token}` } }
  })

  const userId = user.id

  // Clear existing data
  console.log('\n🗑️  Clearing existing data...')
  await db.from('trips').delete().eq('user_id', userId)
  await db.from('passport_info').delete().eq('user_id', userId)
  await db.from('currency_rates').delete().eq('user_id', userId)
  console.log('   Done.')

  // Insert trip
  console.log('\n📋 Inserting trip...')
  const { error: tripErr } = await db.from('trips').insert({ ...trip, user_id: userId })
  if (tripErr) { console.error('❌ Trip:', tripErr.message); process.exit(1) }
  console.log('   ✅ Trip inserted')

  // Insert flights
  console.log('✈️  Inserting flights...')
  const { error: flightErr } = await db.from('flights').insert(flights.map(f => ({ ...f, user_id: userId })))
  if (flightErr) { console.error('❌ Flights:', flightErr.message); process.exit(1) }
  console.log(`   ✅ ${flights.length} flights inserted`)

  // Insert hotels
  console.log('🏨 Inserting hotels...')
  const { error: hotelErr } = await db.from('hotels').insert(hotels.map(h => ({ ...h, user_id: userId })))
  if (hotelErr) { console.error('❌ Hotels:', hotelErr.message); process.exit(1) }
  console.log(`   ✅ ${hotels.length} hotels inserted`)

  // Insert itinerary days
  console.log('🗓️  Inserting itinerary days...')
  const { error: daysErr } = await db.from('itinerary_days').insert(days.map(d => ({ ...d, user_id: userId })))
  if (daysErr) { console.error('❌ Days:', daysErr.message); process.exit(1) }
  console.log(`   ✅ ${days.length} days inserted`)

  // Insert activities
  console.log('📍 Inserting activities...')
  const { error: actErr } = await db.from('itinerary_activities').insert(activities.map(a => ({ ...a, user_id: userId })))
  if (actErr) { console.error('❌ Activities:', actErr.message); process.exit(1) }
  console.log(`   ✅ ${activities.length} activities inserted`)

  // Insert checklist
  console.log('✅ Inserting checklist...')
  const { error: chkErr } = await db.from('checklist_items').insert(checklist.map(c => ({ ...c, trip_id: TRIP_ID, user_id: userId })))
  if (chkErr) { console.error('❌ Checklist:', chkErr.message); process.exit(1) }
  console.log(`   ✅ ${checklist.length} checklist items inserted`)

  // Insert expenses
  console.log('💰 Inserting expenses...')
  const { error: expErr } = await db.from('expenses').insert(expenses.map(e => ({ ...e, trip_id: TRIP_ID, user_id: userId })))
  if (expErr) { console.error('❌ Expenses:', expErr.message); process.exit(1) }
  console.log(`   ✅ ${expenses.length} expenses inserted`)

  // Insert emergency contacts
  console.log('🆘 Inserting emergency contacts...')
  const { error: ecErr } = await db.from('emergency_contacts').insert(contacts.map(c => ({ ...c, trip_id: TRIP_ID, user_id: userId })))
  if (ecErr) { console.error('❌ Contacts:', ecErr.message); process.exit(1) }
  console.log(`   ✅ ${contacts.length} contacts inserted`)

  // Insert quick links
  console.log('🔗 Inserting quick links...')
  const { error: qlErr } = await db.from('quick_links').insert(links.map(l => ({ ...l, trip_id: TRIP_ID, user_id: userId })))
  if (qlErr) { console.error('❌ Links:', qlErr.message); process.exit(1) }
  console.log(`   ✅ ${links.length} links inserted`)

  // Insert notes
  console.log('📝 Inserting notes...')
  const { error: noteErr } = await db.from('notes').insert(notes.map(n => ({ ...n, trip_id: TRIP_ID, user_id: userId })))
  if (noteErr) { console.error('❌ Notes:', noteErr.message); process.exit(1) }
  console.log(`   ✅ ${notes.length} notes inserted`)

  // Insert visas
  console.log('🛂 Inserting visas...')
  const { error: visaErr } = await db.from('visas').insert(visas.map(v => ({ ...v, trip_id: TRIP_ID, user_id: userId })))
  if (visaErr) { console.error('❌ Visas:', visaErr.message); process.exit(1) }
  console.log(`   ✅ ${visas.length} visas inserted`)

  // Insert currency rates
  console.log('💱 Inserting currency rates...')
  const { error: rateErr } = await db.from('currency_rates').insert(
    currencyRates.map(r => ({
      id: `${userId}-${r.from_currency}-${r.to_currency}`,
      user_id: userId,
      ...r,
      updated_at: today,
    }))
  )
  if (rateErr) { console.error('❌ Rates:', rateErr.message); process.exit(1) }
  console.log(`   ✅ ${currencyRates.length} rates inserted`)

  console.log('\n🎉 Seed complete! Your trip data is live in Supabase.')
  process.exit(0)
}

seed().catch(err => { console.error(err); process.exit(1) })
