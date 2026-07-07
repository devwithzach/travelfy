import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Globe, MapPin, Calendar, DollarSign, Users,
  CheckCircle2, Clock, Search, Package, Bookmark,
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

  // Book dialog state
  const [bookingPkg, setBookingPkg] = useState<TourPackage | null>(null)
  const [travelerName, setTravelerName] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [bookError, setBookError] = useState<string | null>(null)

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
          setPackages(
            data.map((r) => ({
              id: r.id,
              operatorId: r.operator_id,
              name: r.name,
              destination: r.destination,
              description: r.description ?? '',
              durationDays: r.duration_days,
              price: Number(r.price),
              currency: r.currency ?? 'PHP',
              maxSlots: r.max_slots,
              coverImage: r.cover_image ?? '',
              status: 'published',
              createdAt: r.created_at,
            }))
          )
        }
        setPackagesLoading(false)
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
        }
        setBookingsLoading(false)
      })
  }

  useEffect(() => {
    fetchBookings()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

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
    const q = search.toLowerCase().trim()
    if (!q) return packages
    return packages.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.destination.toLowerCase().includes(q)
    )
  }, [packages, search])

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

    const { error } = await supabase.from('tour_bookings').insert({
      id: crypto.randomUUID(),
      package_id: bookingPkg.id,
      traveler_id: user.id,
      operator_id: bookingPkg.operatorId,
      traveler_name: name,
      traveler_email: user.email ?? '',
      status: 'pending',
      notes: notes.trim(),
      created_at: new Date().toISOString(),
    })

    setSubmitting(false)

    if (error) {
      setBookError(error.message)
      return
    }

    setBookingPkg(null)
    fetchBookings()
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

  return (
    <div>
      <PageHeader
        title="Tour Packages"
        subtitle="Browse and book tours"
        icon={Globe}
        iconColor="text-emerald-600"
        hideTripContext
      />

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
            {/* Search bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                className="pl-9"
                placeholder="Search by name or destination…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {packagesLoading ? (
              <Spinner />
            ) : filteredPackages.length === 0 ? (
              <EmptyState
                icon={Globe}
                title={search ? 'No matching tours' : 'No tours available yet'}
                description={
                  search
                    ? 'Try a different search term.'
                    : 'Check back soon — operators will be publishing packages here.'
                }
              />
            ) : (
              <AnimatePresence>
                {filteredPackages.map((pkg, i) => {
                  const existingBooking = bookingByPackageId.get(pkg.id)
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
                            <h3 className="font-bold text-base leading-snug flex-1">{pkg.name}</h3>
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
                              {pkg.maxSlots} slots
                            </span>
                          </div>

                          {/* Description */}
                          {pkg.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                              {pkg.description}
                            </p>
                          )}

                          {/* Action */}
                          {!existingBooking ? (
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
            <Button variant="outline" onClick={closeBookDialog} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={confirmBooking} disabled={submitting}>
              {submitting ? 'Submitting…' : 'Confirm Booking'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
