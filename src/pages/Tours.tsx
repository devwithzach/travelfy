import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Globe, MapPin, Calendar, DollarSign, Users,
  CheckCircle2, Clock, Search, Package, Bookmark, SlidersHorizontal,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useTrip } from '@/contexts/TripContext'
import PageHeader from '@/components/common/PageHeader'
import EmptyState from '@/components/common/EmptyState'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { supabase } from '@/lib/supabase'
import { cn } from '@/utils/cn'

// ---------------------------------------------------------------------------
// Local types
// ---------------------------------------------------------------------------

interface TourPackage {
  id: string
  operatorId: string
  name: string
  destination: string
  description: string
  durationDays: number
  price: number
  currency: string
  maxSlots: number
  availableSlots: number | null
  coverImage: string
  status: 'published'
  createdAt: string
}

interface MyBooking {
  id: string
  packageId: string
  packageName: string
  destination: string
  durationDays: number
  price: number
  currency: string
  status: 'pending' | 'confirmed' | 'cancelled'
  createdAt: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatPrice(price: number, currency: string) {
  return `${currency} ${price.toLocaleString()}`
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-PH', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

// ---------------------------------------------------------------------------
// Booking status badge
// ---------------------------------------------------------------------------

function BookingStatusBadge({ status }: { status: MyBooking['status'] }) {
  if (status === 'confirmed') {
    return (
      <Badge variant="success" className="flex items-center gap-1">
        <CheckCircle2 className="h-3 w-3" />
        Confirmed
      </Badge>
    )
  }
  if (status === 'cancelled') {
    return (
      <Badge variant="destructive" className="flex items-center gap-1">
        Cancelled
      </Badge>
    )
  }
  return (
    <Badge variant="warning" className="flex items-center gap-1">
      <Clock className="h-3 w-3" />
      Pending
    </Badge>
  )
}

// ---------------------------------------------------------------------------
// Spinner
// ---------------------------------------------------------------------------

function Spinner() {
  return (
    <div className="flex justify-center py-10">
      <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Star rating input
// ---------------------------------------------------------------------------

function StarRating({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className={cn(
            'text-2xl transition-colors leading-none',
            n <= value ? 'text-amber-400' : 'text-muted-foreground/30'
          )}
        >
          ★
        </button>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Push notification helpers
// ---------------------------------------------------------------------------

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const array = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) array[i] = raw.charCodeAt(i)
  return array as Uint8Array<ArrayBuffer>
}

async function registerPushSubscription(userId: string): Promise<void> {
  const VAPID_PUBLIC = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined
  if (!VAPID_PUBLIC) return

  const reg = await navigator.serviceWorker.ready
  let sub = await reg.pushManager.getSubscription()
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC),
    })
  }

  await fetch('/api/push-subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subscription: sub.toJSON(), userId }),
  })
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function Tours() {
  const { user } = useAuth()
  const { createNewTrip, updateTrip, selectTrip } = useTrip()
  const navigate = useNavigate()

  const [tab, setTab] = useState<'browse' | 'bookings'>('browse')

  // Trip creation state
  const [creatingTripForBooking, setCreatingTripForBooking] = useState<string | null>(null)
  const [tripCreatedMsg, setTripCreatedMsg] = useState<string | null>(null)

  // Browse state
  const [packages, setPackages] = useState<TourPackage[]>([])
  const [packagesLoading, setPackagesLoading] = useState(true)
  const [search, setSearch] = useState('')

  // My bookings state
  const [bookings, setBookings] = useState<MyBooking[]>([])
  const [bookingsLoading, setBookingsLoading] = useState(true)

  // Payment success redirect state
  const [paymentSuccessBanner, setPaymentSuccessBanner] = useState<string | null>(null)

  // Book dialog state
  const [bookingPkg, setBookingPkg] = useState<TourPackage | null>(null)
  const [travelerName, setTravelerName] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [paymongoLoading, setPaymongoLoading] = useState(false)
  const [bookError, setBookError] = useState<string | null>(null)

  // Review state
  const [reviewingBooking, setReviewingBooking] = useState<MyBooking | null>(null)
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewComment, setReviewComment] = useState('')
  const [submittingReview, setSubmittingReview] = useState(false)
  const [reviewError, setReviewError] = useState<string | null>(null)
  const [myReviews, setMyReviews] = useState<Record<string, number>>({})

  // Package ratings state (for Browse tab)
  const [pkgRatings, setPkgRatings] = useState<Record<string, { avg: number; count: number }>>({})

  // Operator names map for Browse tab
  const [operatorNames, setOperatorNames] = useState<Record<string, string>>({})

  // Filter / sort state
  const [filterMinPrice, setFilterMinPrice] = useState('')
  const [filterMaxPrice, setFilterMaxPrice] = useState('')
  const [filterDuration, setFilterDuration] = useState<'all' | '1-3' | '4-7' | '8+'>('all')
  const [sortBy, setSortBy] = useState<'latest' | 'price-asc' | 'price-desc' | 'rating'>('latest')
  const [showFilters, setShowFilters] = useState(false)

  // Booking cancellation state
  const [cancellingBookingId, setCancellingBookingId] = useState<string | null>(null)
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null)

  // ---------------------------------------------------------------------------
  // Push subscription: re-register if permission already granted
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!user || !('serviceWorker' in navigator) || !('PushManager' in window)) return
    if (Notification.permission === 'default') {
      // Don't auto-prompt — wait until user books something
      return
    }
    if (Notification.permission === 'granted') {
      registerPushSubscription(user.id).catch(() => {})
    }
  }, [user?.id])

  // ---------------------------------------------------------------------------
  // Fetch tour packages
  // ---------------------------------------------------------------------------
  useEffect(() => {
    let cancelled = false
    setPackagesLoading(true)
    supabase
      .from('tour_packages')
      .select('*')
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (cancelled) return
        if (!error && data) {
          const mapped = data.map((r) => ({
            id: r.id,
            operatorId: r.operator_id,
            name: r.name,
            destination: r.destination,
            description: r.description ?? '',
            durationDays: r.duration_days,
            price: Number(r.price),
            currency: r.currency ?? 'PHP',
            maxSlots: r.max_slots,
            availableSlots: r.available_slots != null ? Number(r.available_slots) : null,
            coverImage: r.cover_image ?? '',
            status: 'published' as const,
            createdAt: r.created_at,
          }))
          setPackages(mapped)

          const operatorIds = [...new Set(data.map(r => r.operator_id as string))]
          if (operatorIds.length > 0) {
            supabase.from('user_profiles')
              .select('id, full_name, email')
              .in('id', operatorIds)
              .then(({ data: profiles }) => {
                if (profiles) {
                  const map: Record<string, string> = {}
                  profiles.forEach(p => {
                    const row = p as { id: string; full_name?: string; email?: string }
                    map[row.id] = row.full_name || row.email || 'Operator'
                  })
                  setOperatorNames(map)
                }
              })
          }
        }
        setPackagesLoading(false)
      })

    supabase.from('package_reviews')
      .select('package_id, rating')
      .then(({ data: reviews }) => {
        if (!reviews) return
        const map: Record<string, { sum: number; count: number }> = {}
        reviews.forEach(r => {
          const key = String(r.package_id)
          if (!map[key]) map[key] = { sum: 0, count: 0 }
          map[key].sum += r.rating
          map[key].count++
        })
        const ratings: Record<string, { avg: number; count: number }> = {}
        Object.entries(map).forEach(([k, v]) => {
          ratings[k] = { avg: Math.round((v.sum / v.count) * 10) / 10, count: v.count }
        })
        setPkgRatings(ratings)
      })

    return () => { cancelled = true }
  }, [])

  // ---------------------------------------------------------------------------
  // Fetch my bookings
  // ---------------------------------------------------------------------------
  const fetchBookings = () => {
    if (!user) return
    setBookingsLoading(true)
    supabase
      .from('tour_bookings')
      .select('*, tour_packages(name, destination, duration_days, price, currency)')
      .eq('traveler_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (!error && data) {
          setBookings(
            data.map((r) => ({
              id: r.id,
              packageId: r.package_id,
              packageName: r.tour_packages?.name ?? '—',
              destination: r.tour_packages?.destination ?? '',
              durationDays: r.tour_packages?.duration_days ?? 0,
              price: Number(r.tour_packages?.price ?? 0),
              currency: r.tour_packages?.currency ?? 'PHP',
              status: r.status as MyBooking['status'],
              createdAt: r.created_at,
            }))
          )

          if (data.length > 0) {
            const bookingIds = data.map(r => r.id)
            supabase.from('package_reviews')
              .select('booking_id, rating')
              .in('booking_id', bookingIds)
              .then(({ data: reviews }) => {
                if (reviews) {
                  const map: Record<string, number> = {}
                  reviews.forEach(r => { map[String(r.booking_id)] = r.rating })
                  setMyReviews(map)
                }
              })
          }
        }
        setBookingsLoading(false)
      })
  }

  useEffect(() => {
    fetchBookings()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const payment = params.get('payment')
    const bookingId = params.get('booking_id')
    if (payment === 'success' && bookingId) {
      setPaymentSuccessBanner('Payment confirmed! Your booking is being processed.')
      window.history.replaceState(null, '', location.pathname)
      setTab('bookings')
      fetchBookings()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!user) return
    const channel = supabase
      .channel('my-bookings')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'tour_bookings',
        filter: `traveler_id=eq.${user.id}`,
      }, () => { fetchBookings() })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  // ---------------------------------------------------------------------------
  // Derived
  // ---------------------------------------------------------------------------

  const bookedPackageIds = useMemo(
    () => new Set(bookings.map((b) => b.packageId)),
    [bookings]
  )

  const bookingByPackageId = useMemo(
    () => new Map(bookings.map((b) => [b.packageId, b])),
    [bookings]
  )

  const filteredPackages = useMemo(() => {
    let result = packages.filter(p => {
      const q = search.toLowerCase().trim()
      const matchesSearch = !q || p.name.toLowerCase().includes(q) || p.destination.toLowerCase().includes(q)
      const minPrice = filterMinPrice ? Number(filterMinPrice) : 0
      const maxPrice = filterMaxPrice ? Number(filterMaxPrice) : Infinity
      const matchesPrice = p.price >= minPrice && p.price <= maxPrice
      const matchesDuration =
        filterDuration === 'all' ? true :
        filterDuration === '1-3' ? p.durationDays <= 3 :
        filterDuration === '4-7' ? p.durationDays >= 4 && p.durationDays <= 7 :
        p.durationDays >= 8
      return matchesSearch && matchesPrice && matchesDuration
    })

    if (sortBy === 'price-asc') result = [...result].sort((a, b) => a.price - b.price)
    else if (sortBy === 'price-desc') result = [...result].sort((a, b) => b.price - a.price)
    else if (sortBy === 'rating') {
      result = [...result].sort((a, b) => {
        const ra = pkgRatings[a.id]?.avg ?? 0
        const rb = pkgRatings[b.id]?.avg ?? 0
        return rb - ra
      })
    }

    return result
  }, [packages, search, filterMinPrice, filterMaxPrice, filterDuration, sortBy, pkgRatings])

  // ---------------------------------------------------------------------------
  // Active filter count
  // ---------------------------------------------------------------------------
  const activeFilterCount =
    (filterMinPrice ? 1 : 0) +
    (filterMaxPrice ? 1 : 0) +
    (filterDuration !== 'all' ? 1 : 0) +
    (sortBy !== 'latest' ? 1 : 0)

  // ---------------------------------------------------------------------------
  // Cancel booking
  // ---------------------------------------------------------------------------
  const cancelBooking = async (bookingId: string) => {
    setCancellingBookingId(bookingId)
    setConfirmCancelId(null)
    const { error } = await supabase
      .from('tour_bookings')
      .update({ status: 'cancelled' })
      .eq('id', bookingId)
      .eq('traveler_id', user!.id)
    if (!error) {
      setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: 'cancelled' as const } : b))
    }
    setCancellingBookingId(null)
  }

  // ---------------------------------------------------------------------------
  // Open book dialog
  // ---------------------------------------------------------------------------
  const openBookDialog = (pkg: TourPackage) => {
    setBookingPkg(pkg)
    const emailLocal = user?.email?.split('@')[0] ?? ''
    setTravelerName(emailLocal)
    setNotes('')
    setBookError(null)
  }

  const closeBookDialog = () => {
    if (submitting) return
    setBookingPkg(null)
  }

  // ---------------------------------------------------------------------------
  // Confirm booking
  // ---------------------------------------------------------------------------
  const confirmBooking = async () => {
    if (!bookingPkg || !user) return
    const name = travelerName.trim()
    if (!name) { setBookError('Please enter your name.'); return }

    setSubmitting(true)
    setBookError(null)

    const bookingId = crypto.randomUUID()
    const { error } = await supabase.from('tour_bookings').insert({
      id: bookingId,
      package_id: bookingPkg.id,
      traveler_id: user.id,
      operator_id: bookingPkg.operatorId,
      traveler_name: name,
      traveler_email: user.email ?? '',
      status: 'pending',
      notes: notes.trim(),
      created_at: new Date().toISOString(),
    })

    if (error) {
      setSubmitting(false)
      setBookError(error.message)
      return
    }

    if (bookingPkg.currency === 'PHP') {
      setPaymongoLoading(true)
      try {
        const resp = await fetch('/api/paymongo-checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bookingId,
            packageName: bookingPkg.name,
            price: bookingPkg.price,
            currency: bookingPkg.currency,
            successUrl: `${window.location.origin}/tours?payment=success&booking_id=${bookingId}`,
            cancelUrl: `${window.location.origin}/tours?payment=cancelled`,
          }),
        })
        if (resp.ok) {
          const data = await resp.json() as { checkoutUrl?: string }
          if (data.checkoutUrl) {
            window.location.href = data.checkoutUrl
            return
          }
        }
      } catch {
        // PayMongo unavailable — booking already saved as pending, fall through
      } finally {
        setPaymongoLoading(false)
      }
    }

    // Request push notification permission now that user has shown intent
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted' && user) {
          registerPushSubscription(user.id).catch(() => {})
        }
      })
    }

    setSubmitting(false)
    setBookingPkg(null)
    fetchBookings()
  }

  // ---------------------------------------------------------------------------
  // Submit review
  // ---------------------------------------------------------------------------
  const submitReview = async () => {
    if (!reviewingBooking || !user) return
    setSubmittingReview(true)
    setReviewError(null)
    const { error } = await supabase.from('package_reviews').upsert({
      package_id: reviewingBooking.packageId,
      booking_id: reviewingBooking.id,
      traveler_id: user.id,
      rating: reviewRating,
      comment: reviewComment.trim(),
    }, { onConflict: 'booking_id' })
    setSubmittingReview(false)
    if (error) { setReviewError(error.message); return }
    setMyReviews(prev => ({ ...prev, [reviewingBooking.id]: reviewRating }))
    setReviewingBooking(null)
  }

  // ---------------------------------------------------------------------------
  // Create trip from booking
  // ---------------------------------------------------------------------------

  const createTripFromBooking = async (booking: MyBooking) => {
    if (!user) return
    setCreatingTripForBooking(booking.id)
    try {
      const { data: pkgRow } = await supabase
        .from('tour_packages')
        .select('*')
        .eq('id', booking.packageId)
        .single()

      const pkg = pkgRow as Record<string, unknown> | null
      const newTripId = await createNewTrip({
        name: String(pkg?.name ?? booking.packageName),
        destination: String(pkg?.destination ?? booking.destination),
        startDate: '',
        endDate: '',
        description: String(pkg?.description ?? ''),
        tripType: 'domestic',
      })

      // Parse and populate the package itinerary into the trip
      let pkgDays: Array<{ dayNumber: number; title: string; activities: Array<{ time: string; title: string; location: string }> }> = []
      try { pkgDays = JSON.parse(String(pkg?.itinerary ?? '[]')) } catch { pkgDays = [] }

      if (pkgDays.length > 0) {
        updateTrip(prev => ({
          ...prev,
          tripInfo: { ...prev.tripInfo, id: newTripId },
          itinerary: pkgDays.map(day => ({
            id: crypto.randomUUID(),
            date: '',
            dayNumber: day.dayNumber,
            title: day.title,
            subtitle: '',
            meals: [],
            hotel: '',
            activities: day.activities.map(act => ({
              id: crypto.randomUUID(),
              time: act.time,
              title: act.title,
              description: '',
              type: 'other' as const,
              location: act.location,
              done: false,
            })),
          })),
        }))
      }

      localStorage.setItem(`travelfy-trip-from-booking-${booking.id}`, 'true')
      selectTrip(newTripId)
      setTripCreatedMsg('Trip created! Go to My Trips to set dates.')
      setTimeout(() => setTripCreatedMsg(null), 5000)
    } catch (err) {
      console.error('Failed to create trip from booking:', err)
    } finally {
      setCreatingTripForBooking(null)
    }
  }

  const tripAlreadyCreated = (bookingId: string) =>
    localStorage.getItem(`travelfy-trip-from-booking-${bookingId}`) === 'true'

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  // Suppress unused var warning — bookedPackageIds is used via bookingByPackageId
  void bookedPackageIds

  return (
    <div>
      <PageHeader
        title="Tour Packages"
        subtitle="Browse and book tours"
        icon={Globe}
        iconColor="text-emerald-600"
        hideTripContext
      />

      {paymentSuccessBanner && (
        <div className="mx-4 mb-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-300 flex items-center justify-between gap-2">
          <span>{paymentSuccessBanner}</span>
          <button
            type="button"
            onClick={() => setPaymentSuccessBanner(null)}
            className="shrink-0 text-xs font-semibold"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      )}

      {tripCreatedMsg && (
        <div className="mx-4 mb-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-300 flex items-center justify-between gap-2">
          <span>{tripCreatedMsg}</span>
          <button
            type="button"
            onClick={() => navigate('/trips')}
            className="shrink-0 text-xs font-semibold underline underline-offset-2"
          >
            My Trips
          </button>
        </div>
      )}

      <div className="px-4 space-y-4">
        <Tabs value={tab} onValueChange={(v) => setTab(v as 'browse' | 'bookings')}>
          <TabsList className="w-full">
            <TabsTrigger value="browse" className="flex-1 flex items-center gap-1.5">
              <Package className="h-3.5 w-3.5" />
              Browse Tours
            </TabsTrigger>
            <TabsTrigger value="bookings" className="flex-1 flex items-center gap-1.5">
              <Bookmark className="h-3.5 w-3.5" />
              My Bookings
              {bookings.length > 0 && (
                <span className="ml-1 tabular-nums text-[10px] bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 leading-none">
                  {bookings.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* ---------------------------------------------------------------- */}
          {/* Browse tab                                                        */}
          {/* ---------------------------------------------------------------- */}
          <TabsContent value="browse" className="space-y-3">
            {/* Search + filter row */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  className="pl-9"
                  placeholder="Search by name or destination…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <button
                type="button"
                onClick={() => setShowFilters(v => !v)}
                className={cn(
                  'relative h-10 w-10 rounded-xl border border-input flex items-center justify-center shrink-0 transition-colors',
                  showFilters ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-muted-foreground hover:bg-muted'
                )}
              >
                <SlidersHorizontal className="h-4 w-4" />
                {activeFilterCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center tabular-nums">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </div>

            {/* Filter panel */}
            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="space-y-3 pb-1">
                    <div className="flex gap-2 items-center">
                      <Input
                        placeholder="Min ₱"
                        type="number"
                        value={filterMinPrice}
                        onChange={e => setFilterMinPrice(e.target.value)}
                        className="flex-1 h-9 text-sm"
                      />
                      <span className="text-muted-foreground text-sm">–</span>
                      <Input
                        placeholder="Max ₱"
                        type="number"
                        value={filterMaxPrice}
                        onChange={e => setFilterMaxPrice(e.target.value)}
                        className="flex-1 h-9 text-sm"
                      />
                    </div>
                    <div className="flex gap-1.5 flex-wrap">
                      {(['all', '1-3', '4-7', '8+'] as const).map(d => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setFilterDuration(d)}
                          className={cn(
                            'px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
                            filterDuration === d
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted text-muted-foreground hover:bg-muted/80'
                          )}
                        >
                          {d === 'all' ? 'Any duration' : d === '1-3' ? '1–3 days' : d === '4-7' ? '4–7 days' : '8+ days'}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-1.5 flex-wrap">
                      {([
                        ['latest', 'Latest'],
                        ['price-asc', 'Price ↑'],
                        ['price-desc', 'Price ↓'],
                        ['rating', '★ Rating'],
                      ] as const).map(([val, label]) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setSortBy(val)}
                          className={cn(
                            'px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
                            sortBy === val
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted text-muted-foreground hover:bg-muted/80'
                          )}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {packagesLoading ? (
              <Spinner />
            ) : filteredPackages.length === 0 ? (
              <EmptyState
                icon={Globe}
                title={search || activeFilterCount > 0 ? 'No matching tours' : 'No tours available yet'}
                description={
                  search || activeFilterCount > 0
                    ? 'Try adjusting your search or filters.'
                    : 'Check back soon — operators will be publishing packages here.'
                }
              />
            ) : (
              <AnimatePresence>
                {filteredPackages.map((pkg, i) => {
                  const existingBooking = bookingByPackageId.get(pkg.id)
                  const isFullyBooked = pkg.availableSlots === 0
                  return (
                    <motion.div
                      key={pkg.id}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: i * 0.04 }}
                    >
                      <Card className="overflow-hidden">
                        <div className="h-1.5 bg-gradient-to-r from-emerald-500 to-teal-500" />
                        {pkg.coverImage && (
                          <img
                            src={pkg.coverImage}
                            alt={pkg.name}
                            className="w-full h-36 object-cover"
                            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                          />
                        )}
                        <CardContent className="p-4 space-y-3">
                          {/* Header row */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <h3 className="font-bold text-base leading-snug">{pkg.name}</h3>
                              <button
                                type="button"
                                onClick={() => navigate(`/operator/${pkg.operatorId}`)}
                                className="text-[11px] text-violet-600 hover:underline text-left"
                              >
                                by {operatorNames[pkg.operatorId] || 'Operator'}
                              </button>
                            </div>
                            {existingBooking ? (
                              <BookingStatusBadge status={existingBooking.status} />
                            ) : null}
                          </div>

                          {/* Meta pills */}
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                              {pkg.destination}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                              {pkg.durationDays} {pkg.durationDays === 1 ? 'day' : 'days'}
                            </span>
                            <span className="flex items-center gap-1">
                              <DollarSign className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                              <span className="font-semibold text-foreground tabular-nums">
                                {formatPrice(pkg.price, pkg.currency)}
                              </span>
                            </span>
                            <span className="flex items-center gap-1">
                              <Users className="h-3.5 w-3.5 shrink-0" />
                              {pkg.availableSlots != null
                                ? `${pkg.availableSlots} of ${pkg.maxSlots} slots left`
                                : `${pkg.maxSlots} slots`}
                            </span>
                            {pkgRatings[pkg.id] && (
                              <span className="flex items-center gap-0.5 text-amber-500 font-semibold">
                                ★ {pkgRatings[pkg.id].avg}
                                <span className="text-muted-foreground font-normal">({pkgRatings[pkg.id].count})</span>
                              </span>
                            )}
                          </div>

                          {/* Description */}
                          {pkg.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                              {pkg.description}
                            </p>
                          )}

                          {/* Action */}
                          {isFullyBooked ? (
                            <Button size="sm" className="w-full mt-1" disabled>Fully Booked</Button>
                          ) : !existingBooking ? (
                            <Button
                              size="sm"
                              className="w-full mt-1"
                              onClick={() => openBookDialog(pkg)}
                            >
                              Book Now
                            </Button>
                          ) : (
                            <p className="text-xs text-muted-foreground text-center pt-1">
                              Booking submitted · {formatDate(existingBooking.createdAt)}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            )}
          </TabsContent>

          {/* ---------------------------------------------------------------- */}
          {/* My Bookings tab                                                   */}
          {/* ---------------------------------------------------------------- */}
          <TabsContent value="bookings" className="space-y-3">
            {bookingsLoading ? (
              <Spinner />
            ) : bookings.length === 0 ? (
              <EmptyState
                icon={Bookmark}
                title="You haven't booked any tours yet"
                description="Browse the available packages and tap Book Now to get started."
                actionLabel="Browse Tours"
                onAction={() => setTab('browse')}
              />
            ) : (
              <AnimatePresence>
                {bookings.map((booking, i) => (
                  <motion.div
                    key={booking.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: i * 0.04 }}
                  >
                    <Card className="overflow-hidden">
                      <div
                        className={
                          booking.status === 'confirmed'
                            ? 'h-1.5 bg-gradient-to-r from-emerald-500 to-teal-500'
                            : booking.status === 'cancelled'
                            ? 'h-1.5 bg-gradient-to-r from-rose-500 to-pink-500'
                            : 'h-1.5 bg-gradient-to-r from-amber-500 to-orange-500'
                        }
                      />
                      <CardContent className="p-4 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-bold text-base leading-snug flex-1">
                            {booking.packageName}
                          </h3>
                          <BookingStatusBadge status={booking.status} />
                        </div>

                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          {booking.destination && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                              {booking.destination}
                            </span>
                          )}
                          {booking.durationDays > 0 && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                              {booking.durationDays} {booking.durationDays === 1 ? 'day' : 'days'}
                            </span>
                          )}
                          {booking.price > 0 && (
                            <span className="flex items-center gap-1 tabular-nums font-semibold text-foreground">
                              <DollarSign className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                              {formatPrice(booking.price, booking.currency)}
                            </span>
                          )}
                        </div>

                        <p className="text-[11px] text-muted-foreground">
                          Booked {formatDate(booking.createdAt)}
                        </p>

                        {booking.status === 'pending' && (
                          <button
                            type="button"
                            onClick={() => {
                              if (confirmCancelId === booking.id) {
                                cancelBooking(booking.id)
                              } else {
                                setConfirmCancelId(booking.id)
                                setTimeout(() => setConfirmCancelId(prev => prev === booking.id ? null : prev), 3000)
                              }
                            }}
                            disabled={cancellingBookingId === booking.id}
                            className="w-full text-xs text-rose-600 border border-rose-200 rounded-xl py-2 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors disabled:opacity-50"
                          >
                            {cancellingBookingId === booking.id
                              ? 'Cancelling…'
                              : confirmCancelId === booking.id
                              ? 'Tap again to confirm'
                              : 'Cancel Booking'}
                          </button>
                        )}

                        {booking.status === 'confirmed' && !tripAlreadyCreated(booking.id) && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full h-8 text-xs gap-1.5 text-violet-600 border-violet-200 hover:bg-violet-50 dark:hover:bg-violet-950/20"
                            disabled={creatingTripForBooking === booking.id}
                            onClick={() => createTripFromBooking(booking)}
                          >
                            {creatingTripForBooking === booking.id ? (
                              <>
                                <div className="h-3 w-3 rounded-full border-2 border-violet-600 border-t-transparent animate-spin" />
                                Creating…
                              </>
                            ) : (
                              '📅 Create Trip from Package'
                            )}
                          </Button>
                        )}

                        {booking.status === 'confirmed' && tripAlreadyCreated(booking.id) && (
                          <p className="text-[11px] text-emerald-600 text-center">
                            Trip already created
                          </p>
                        )}

                        {booking.status === 'confirmed' && (
                          myReviews[booking.id] ? (
                            <span className="text-[11px] text-amber-600 flex items-center gap-0.5">
                              {'★'.repeat(myReviews[booking.id])} You reviewed this
                            </span>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="w-full h-8 text-xs gap-1.5 text-amber-600 border-amber-200 hover:bg-amber-50 dark:hover:bg-amber-950/20"
                              onClick={() => {
                                setReviewingBooking(booking)
                                setReviewRating(5)
                                setReviewComment('')
                                setReviewError(null)
                              }}
                            >
                              ★ Write a Review
                            </Button>
                          )
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Book dialog                                                          */}
      {/* ------------------------------------------------------------------ */}
      <Dialog open={!!bookingPkg} onOpenChange={(open) => { if (!open) closeBookDialog() }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Book Tour</DialogTitle>
          </DialogHeader>

          {bookingPkg && (
            <div className="space-y-4">
              {/* Package summary */}
              <div className="rounded-xl bg-muted p-3 space-y-1.5">
                <p className="font-semibold text-base">{bookingPkg.name}</p>
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-emerald-600" />
                    {bookingPkg.destination}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5 text-emerald-600" />
                    {bookingPkg.durationDays} {bookingPkg.durationDays === 1 ? 'day' : 'days'}
                  </span>
                  <span className="flex items-center gap-1 font-semibold text-foreground tabular-nums">
                    <DollarSign className="h-3.5 w-3.5 text-emerald-600" />
                    {formatPrice(bookingPkg.price, bookingPkg.currency)}
                  </span>
                </div>
              </div>

              {/* Your name */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                  Your Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={travelerName}
                  onChange={(e) => setTravelerName(e.target.value)}
                  placeholder="Full name"
                  disabled={submitting}
                />
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                  Notes <span className="text-muted-foreground font-normal">(optional)</span>
                </Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Special requests, dietary needs, etc."
                  disabled={submitting}
                  className="min-h-[72px]"
                />
              </div>

              {/* Error */}
              {bookError && (
                <p className="text-sm text-destructive">{bookError}</p>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={closeBookDialog} disabled={submitting || paymongoLoading}>
              Cancel
            </Button>
            <Button onClick={confirmBooking} disabled={submitting || paymongoLoading}>
              {paymongoLoading
                ? 'Redirecting to payment…'
                : submitting
                ? 'Submitting…'
                : bookingPkg?.currency === 'PHP'
                ? 'Confirm & Pay'
                : 'Confirm Booking'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ------------------------------------------------------------------ */}
      {/* Review dialog                                                        */}
      {/* ------------------------------------------------------------------ */}
      <Dialog open={!!reviewingBooking} onOpenChange={open => { if (!open) setReviewingBooking(null) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Write a Review</DialogTitle>
          </DialogHeader>
          {reviewingBooking && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">{reviewingBooking.packageName}</p>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Rating</Label>
                <StarRating value={reviewRating} onChange={setReviewRating} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Comment (optional)</Label>
                <Textarea
                  value={reviewComment}
                  onChange={e => setReviewComment(e.target.value)}
                  placeholder="Share your experience…"
                  className="min-h-[80px]"
                  disabled={submittingReview}
                />
              </div>
              {reviewError && <p className="text-sm text-destructive">{reviewError}</p>}
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setReviewingBooking(null)} disabled={submittingReview}>Cancel</Button>
            <Button onClick={submitReview} disabled={submittingReview}>
              {submittingReview ? 'Submitting…' : 'Submit Review'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
