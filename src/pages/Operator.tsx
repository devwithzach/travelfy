import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Building2, Package, Users, Plus, Edit2, Trash2,
  Eye, EyeOff, CheckCircle2, XCircle, Clock,
  DollarSign, MapPin, Calendar, Tag,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import PageHeader from '@/components/common/PageHeader'
import EmptyState from '@/components/common/EmptyState'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/utils/cn'
import { supabase } from '@/lib/supabase'

// ── Types ──────────────────────────────────────────────────────────────────────

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
  status: 'draft' | 'published' | 'closed'
  createdAt: string
}

interface TourBooking {
  id: string
  packageId: string
  packageName: string
  travelerId: string
  travelerName: string
  travelerEmail: string
  status: 'pending' | 'confirmed' | 'cancelled'
  notes: string
  createdAt: string
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function mapPackageRow(row: Record<string, unknown>): TourPackage {
  return {
    id: String(row.id ?? ''),
    operatorId: String(row.operator_id ?? ''),
    name: String(row.name ?? ''),
    destination: String(row.destination ?? ''),
    description: String(row.description ?? ''),
    durationDays: Number(row.duration_days ?? 1),
    price: Number(row.price ?? 0),
    currency: String(row.currency ?? 'PHP'),
    maxSlots: Number(row.max_slots ?? 10),
    coverImage: String(row.cover_image ?? ''),
    status: (row.status as TourPackage['status']) ?? 'draft',
    createdAt: String(row.created_at ?? ''),
  }
}

function mapBookingRow(row: Record<string, unknown>): TourBooking {
  const pkg = row.tour_packages as Record<string, unknown> | null
  return {
    id: String(row.id ?? ''),
    packageId: String(row.package_id ?? ''),
    packageName: String(pkg?.name ?? ''),
    travelerId: String(row.traveler_id ?? ''),
    travelerName: String(row.traveler_name ?? ''),
    travelerEmail: String(row.traveler_email ?? ''),
    status: (row.status as TourBooking['status']) ?? 'pending',
    notes: String(row.notes ?? ''),
    createdAt: String(row.created_at ?? ''),
  }
}

const defaultPackage = (): Omit<TourPackage, 'id' | 'operatorId' | 'createdAt'> => ({
  name: '',
  destination: '',
  description: '',
  durationDays: 1,
  price: 0,
  currency: 'PHP',
  maxSlots: 10,
  coverImage: '',
  status: 'draft',
})

function packageStatusBadge(status: TourPackage['status']) {
  if (status === 'published') return <Badge variant="success">Published</Badge>
  if (status === 'closed') return <Badge variant="secondary">Closed</Badge>
  return <Badge variant="warning">Draft</Badge>
}

function bookingStatusBadge(status: TourBooking['status']) {
  if (status === 'confirmed') return <Badge variant="success">Confirmed</Badge>
  if (status === 'cancelled') return <Badge variant="destructive">Cancelled</Badge>
  return <Badge variant="warning">Pending</Badge>
}

function formatDate(iso: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

// ── Package Card ───────────────────────────────────────────────────────────────

interface PackageCardProps {
  pkg: TourPackage
  onEdit: (pkg: TourPackage) => void
  onDelete: (id: string) => void
  onTogglePublish: (pkg: TourPackage) => void
}

function PackageCard({ pkg, onEdit, onDelete, onTogglePublish }: PackageCardProps) {
  const [confirmDelete, setConfirmDelete] = useState(false)

  const handleDeleteClick = () => {
    if (confirmDelete) {
      onDelete(pkg.id)
    } else {
      setConfirmDelete(true)
    }
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="overflow-hidden">
        <CardContent className="p-4 space-y-3">
          {/* Header row */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-sm truncate">{pkg.name}</span>
                {packageStatusBadge(pkg.status)}
              </div>
              <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3 shrink-0" />
                <span className="truncate">{pkg.destination}</span>
              </div>
            </div>
          </div>

          {/* Meta row */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {pkg.durationDays} {pkg.durationDays === 1 ? 'day' : 'days'}
            </span>
            <span className="flex items-center gap-1 tabular-nums">
              <DollarSign className="h-3 w-3" />
              {pkg.price.toLocaleString()} {pkg.currency}
            </span>
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {pkg.maxSlots} slots
            </span>
          </div>

          {pkg.description ? (
            <p className="text-xs text-muted-foreground line-clamp-2">{pkg.description}</p>
          ) : null}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-1">
            <Button
              size="sm"
              variant="outline"
              className="flex-1 h-8 text-xs gap-1.5"
              onClick={() => onEdit(pkg)}
            >
              <Edit2 className="h-3 w-3" />
              Edit
            </Button>

            <Button
              size="sm"
              variant="outline"
              className={cn(
                'flex-1 h-8 text-xs gap-1.5',
                pkg.status === 'published'
                  ? 'text-amber-600 border-amber-200 hover:bg-amber-50 dark:hover:bg-amber-950/20'
                  : 'text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/20',
              )}
              onClick={() => onTogglePublish(pkg)}
              disabled={pkg.status === 'closed'}
            >
              {pkg.status === 'published' ? (
                <><EyeOff className="h-3 w-3" />Unpublish</>
              ) : (
                <><Eye className="h-3 w-3" />Publish</>
              )}
            </Button>

            <Button
              size="icon"
              variant="outline"
              className={cn(
                'h-8 w-8 shrink-0',
                confirmDelete
                  ? 'text-destructive border-destructive/50 hover:bg-destructive/10'
                  : 'text-muted-foreground',
              )}
              onClick={handleDeleteClick}
              onBlur={() => setConfirmDelete(false)}
              title={confirmDelete ? 'Tap again to confirm delete' : 'Delete package'}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>

          {confirmDelete && (
            <p className="text-[10px] text-destructive text-center -mt-1">
              Tap trash again to confirm deletion
            </p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

// ── Booking Card ───────────────────────────────────────────────────────────────

interface BookingCardProps {
  booking: TourBooking
  onConfirm: (id: string) => void
  onCancel: (id: string) => void
}

function BookingCard({ booking, onConfirm, onCancel }: BookingCardProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
    >
      <Card>
        <CardContent className="p-4 space-y-2.5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-sm truncate">{booking.travelerName || 'Unknown traveler'}</p>
              <p className="text-xs text-muted-foreground truncate">{booking.travelerEmail}</p>
            </div>
            {bookingStatusBadge(booking.status)}
          </div>

          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Tag className="h-3 w-3 shrink-0" />
            <span className="truncate">{booking.packageName || booking.packageId}</span>
          </div>

          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3 shrink-0" />
            <span>{formatDate(booking.createdAt)}</span>
          </div>

          {booking.notes ? (
            <p className="text-xs text-muted-foreground line-clamp-2 bg-muted/50 rounded-lg px-2 py-1.5">
              {booking.notes}
            </p>
          ) : null}

          {booking.status === 'pending' && (
            <div className="flex gap-2 pt-0.5">
              <Button
                size="sm"
                className="flex-1 h-8 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700"
                onClick={() => onConfirm(booking.id)}
              >
                <CheckCircle2 className="h-3 w-3" />
                Confirm
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1 h-8 text-xs gap-1.5 text-rose-600 border-rose-200 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                onClick={() => onCancel(booking.id)}
              >
                <XCircle className="h-3 w-3" />
                Cancel
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

// ── Package Dialog ─────────────────────────────────────────────────────────────

type PackageDraft = Omit<TourPackage, 'id' | 'operatorId' | 'createdAt'> & { id?: string }

interface PackageDialogProps {
  open: boolean
  onClose: () => void
  draft: PackageDraft
  onChange: (draft: PackageDraft) => void
  onSave: () => void
  saving: boolean
}

function PackageDialog({ open, onClose, draft, onChange, onSave, saving }: PackageDialogProps) {
  const set = <K extends keyof PackageDraft>(k: K, v: PackageDraft[K]) =>
    onChange({ ...draft, [k]: v })

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{draft.id ? 'Edit Package' : 'New Tour Package'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="pkg-name">Package Name *</Label>
            <Input
              id="pkg-name"
              placeholder="e.g. Batanes Island Hopping"
              value={draft.name}
              onChange={e => set('name', e.target.value)}
            />
          </div>

          {/* Destination */}
          <div className="space-y-1.5">
            <Label htmlFor="pkg-dest">Destination *</Label>
            <Input
              id="pkg-dest"
              placeholder="e.g. Batanes, Philippines"
              value={draft.destination}
              onChange={e => set('destination', e.target.value)}
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="pkg-desc">Description</Label>
            <Textarea
              id="pkg-desc"
              placeholder="What's included, highlights, itinerary summary…"
              value={draft.description}
              onChange={e => set('description', e.target.value)}
              className="min-h-[80px]"
            />
          </div>

          {/* Duration + Price row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="pkg-days">Duration (days)</Label>
              <Input
                id="pkg-days"
                type="number"
                min={1}
                value={draft.durationDays}
                onChange={e => set('durationDays', Math.max(1, parseInt(e.target.value) || 1))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pkg-slots">Max Slots</Label>
              <Input
                id="pkg-slots"
                type="number"
                min={1}
                value={draft.maxSlots}
                onChange={e => set('maxSlots', Math.max(1, parseInt(e.target.value) || 1))}
              />
            </div>
          </div>

          {/* Price + Currency row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="pkg-price">Price</Label>
              <Input
                id="pkg-price"
                type="number"
                min={0}
                value={draft.price}
                onChange={e => set('price', parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pkg-currency">Currency</Label>
              <Input
                id="pkg-currency"
                placeholder="PHP"
                value={draft.currency}
                onChange={e => set('currency', e.target.value.toUpperCase().slice(0, 3))}
              />
            </div>
          </div>

          {/* Cover image URL */}
          <div className="space-y-1.5">
            <Label htmlFor="pkg-cover">Cover Image URL</Label>
            <Input
              id="pkg-cover"
              placeholder="https://…"
              value={draft.coverImage}
              onChange={e => set('coverImage', e.target.value)}
            />
          </div>

          {/* Status picker */}
          <div className="space-y-1.5">
            <Label>Status</Label>
            <div className="flex gap-2">
              {(['draft', 'published', 'closed'] as const).map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => set('status', s)}
                  className={cn(
                    'flex-1 rounded-xl border py-2 text-xs font-medium capitalize transition-colors',
                    draft.status === s
                      ? s === 'published'
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : s === 'closed'
                        ? 'bg-slate-600 text-white border-slate-600'
                        : 'bg-amber-500 text-white border-amber-500'
                      : 'border-border text-muted-foreground hover:bg-muted',
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="mt-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={onSave}
            disabled={saving || !draft.name.trim() || !draft.destination.trim()}
          >
            {saving ? 'Saving…' : draft.id ? 'Save Changes' : 'Create Package'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Stats Row ──────────────────────────────────────────────────────────────────

interface StatsRowProps {
  packages: TourPackage[]
  bookings: TourBooking[]
}

function StatsRow({ packages, bookings }: StatsRowProps) {
  const published = packages.filter(p => p.status === 'published').length
  const pending = bookings.filter(b => b.status === 'pending').length

  const stats = [
    { label: 'Packages', value: packages.length, icon: Package, color: 'text-blue-600' },
    { label: 'Published', value: published, icon: Eye, color: 'text-emerald-600' },
    { label: 'Bookings', value: bookings.length, icon: Users, color: 'text-violet-600' },
    { label: 'Pending', value: pending, icon: Clock, color: 'text-amber-600' },
  ]

  return (
    <div className="grid grid-cols-4 gap-2 px-4 mb-4">
      {stats.map(({ label, value, icon: Icon, color }) => (
        <Card key={label}>
          <CardContent className="p-2.5 flex flex-col items-center gap-1">
            <Icon className={cn('h-4 w-4', color)} />
            <span className="text-lg font-bold tabular-nums leading-none">{value}</span>
            <span className="text-[10px] text-muted-foreground text-center leading-tight">{label}</span>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function Operator() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [roleLoading, setRoleLoading] = useState(true)
  const [hasAccess, setHasAccess] = useState(false)

  const [packages, setPackages] = useState<TourPackage[]>([])
  const [bookings, setBookings] = useState<TourBooking[]>([])
  const [loadingPackages, setLoadingPackages] = useState(false)
  const [loadingBookings, setLoadingBookings] = useState(false)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [draft, setDraft] = useState<PackageDraft>(defaultPackage())
  const [saving, setSaving] = useState(false)

  // ── Access guard ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (!user) return
    ;(async () => {
      try {
        const { data } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('id', user.id)
          .single()
        const role = (data as { role?: string } | null)?.role
        setHasAccess(role === 'operator' || role === 'admin')
      } finally {
        setRoleLoading(false)
      }
    })()
  }, [user])

  // ── Data fetching ─────────────────────────────────────────────────────────

  const fetchPackages = useCallback(async () => {
    if (!user) return
    setLoadingPackages(true)
    const { data } = await supabase
      .from('tour_packages')
      .select('*')
      .eq('operator_id', user.id)
      .order('created_at', { ascending: false })
    setPackages((data ?? []).map(r => mapPackageRow(r as Record<string, unknown>)))
    setLoadingPackages(false)
  }, [user])

  const fetchBookings = useCallback(async () => {
    if (!user) return
    setLoadingBookings(true)
    const { data } = await supabase
      .from('tour_bookings')
      .select('*, tour_packages(name)')
      .eq('operator_id', user.id)
      .order('created_at', { ascending: false })
    setBookings((data ?? []).map(r => mapBookingRow(r as Record<string, unknown>)))
    setLoadingBookings(false)
  }, [user])

  useEffect(() => {
    if (hasAccess) {
      fetchPackages()
      fetchBookings()
    }
  }, [hasAccess, fetchPackages, fetchBookings])

  // ── Package mutations ─────────────────────────────────────────────────────

  const openAdd = () => {
    setDraft(defaultPackage())
    setDialogOpen(true)
  }

  const openEdit = (pkg: TourPackage) => {
    setDraft({
      id: pkg.id,
      name: pkg.name,
      destination: pkg.destination,
      description: pkg.description,
      durationDays: pkg.durationDays,
      price: pkg.price,
      currency: pkg.currency,
      maxSlots: pkg.maxSlots,
      coverImage: pkg.coverImage,
      status: pkg.status,
    })
    setDialogOpen(true)
  }

  const savePackage = async () => {
    if (!user || !draft.name.trim() || !draft.destination.trim()) return
    setSaving(true)
    const row = {
      ...(draft.id ? { id: draft.id } : { id: crypto.randomUUID() }),
      operator_id: user.id,
      name: draft.name.trim(),
      destination: draft.destination.trim(),
      description: draft.description,
      duration_days: draft.durationDays,
      price: draft.price,
      currency: draft.currency || 'PHP',
      max_slots: draft.maxSlots,
      cover_image: draft.coverImage,
      status: draft.status,
    }
    await supabase.from('tour_packages').upsert(row)
    setSaving(false)
    setDialogOpen(false)
    fetchPackages()
  }

  const deletePackage = async (id: string) => {
    await supabase.from('tour_packages').delete().eq('id', id)
    setPackages(prev => prev.filter(p => p.id !== id))
  }

  const togglePublish = async (pkg: TourPackage) => {
    const nextStatus: TourPackage['status'] = pkg.status === 'published' ? 'draft' : 'published'
    await supabase.from('tour_packages').update({ status: nextStatus }).eq('id', pkg.id)
    setPackages(prev => prev.map(p => p.id === pkg.id ? { ...p, status: nextStatus } : p))
  }

  // ── Booking mutations ─────────────────────────────────────────────────────

  const updateBookingStatus = async (id: string, status: TourBooking['status']) => {
    await supabase.from('tour_bookings').update({ status }).eq('id', id)
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status } : b))
  }

  // ── Render: loading ───────────────────────────────────────────────────────

  if (!user || roleLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // ── Render: access denied ─────────────────────────────────────────────────

  if (!hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] px-8 text-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center">
          <Building2 className="h-8 w-8 text-destructive/60" />
        </div>
        <h2 className="text-lg font-bold">Access Denied</h2>
        <p className="text-sm text-muted-foreground max-w-xs">
          This page is restricted to verified tour operators. Please contact support if you believe this is an error.
        </p>
        <Button variant="outline" onClick={() => navigate(-1)}>
          Go Back
        </Button>
      </div>
    )
  }

  // ── Render: main ──────────────────────────────────────────────────────────

  return (
    <div className="pb-24">
      <PageHeader
        title="Operator Dashboard"
        subtitle="Manage your tour packages and bookings"
        icon={Building2}
        iconColor="text-violet-600"
        hideTripContext
        action={
          <Button size="icon-sm" onClick={openAdd} title="New package">
            <Plus className="h-4 w-4" />
          </Button>
        }
      />

      <StatsRow packages={packages} bookings={bookings} />

      <div className="px-4">
        <Tabs defaultValue="packages">
          <TabsList className="w-full mb-4">
            <TabsTrigger value="packages" className="flex-1">
              My Packages
            </TabsTrigger>
            <TabsTrigger value="bookings" className="flex-1">
              Bookings
            </TabsTrigger>
          </TabsList>

          {/* ── Packages tab ─────────────────────────────────────────────── */}
          <TabsContent value="packages">
            {loadingPackages ? (
              <div className="flex justify-center py-16">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : packages.length === 0 ? (
              <EmptyState
                icon={Package}
                title="No packages yet"
                description="Create your first tour package to start accepting bookings from travellers."
                actionLabel="Create Package"
                onAction={openAdd}
              />
            ) : (
              <div className="space-y-3">
                <AnimatePresence mode="popLayout">
                  {packages.map(pkg => (
                    <PackageCard
                      key={pkg.id}
                      pkg={pkg}
                      onEdit={openEdit}
                      onDelete={deletePackage}
                      onTogglePublish={togglePublish}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </TabsContent>

          {/* ── Bookings tab ──────────────────────────────────────────────── */}
          <TabsContent value="bookings">
            {loadingBookings ? (
              <div className="flex justify-center py-16">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : bookings.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No bookings yet"
                description="Once travellers book your published packages, their reservations will appear here."
              />
            ) : (
              <div className="space-y-3">
                <AnimatePresence mode="popLayout">
                  {bookings.map(booking => (
                    <BookingCard
                      key={booking.id}
                      booking={booking}
                      onConfirm={id => updateBookingStatus(id, 'confirmed')}
                      onCancel={id => updateBookingStatus(id, 'cancelled')}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Package add/edit dialog */}
      <PackageDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        draft={draft}
        onChange={setDraft}
        onSave={savePackage}
        saving={saving}
      />
    </div>
  )
}
