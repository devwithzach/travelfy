import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Plane, Loader2, Sparkles, X, Trash2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useTrip } from '@/contexts/TripContext'
import BottomNav from '@/layouts/BottomNav'
import SideNav from '@/layouts/SideNav'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { TripSummary } from '@/types'
import TripCard from '@/components/common/TripCard'

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.07, duration: 0.3, ease: 'easeOut' },
  }),
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2 } },
}

const emptyForm = { name: '', destination: '', startDate: '', endDate: '', description: '', tripType: 'international' as 'international' | 'domestic' }

function SheetBackdrop({ onClose }: { onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[2000] bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    />
  )
}

export default function Trips() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { trips, loading, selectTrip, createNewTrip, deleteTripById, seedSampleTrip, duplicateTrip, updateTripBasic } = useTrip()

  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [creating, setCreating] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<TripSummary | null>(null)
  const [deleting, setDeleting] = useState(false)

  const [editTarget, setEditTarget] = useState<TripSummary | null>(null)
  const [editForm, setEditForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const [seeding, setSeeding] = useState(false)
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null)

  const handleSeed = async () => {
    setSeeding(true)
    try {
      const id = await seedSampleTrip()
      selectTrip(id)
      navigate('/')
    } catch (err) {
      console.error('Seed failed:', err)
    } finally {
      setSeeding(false)
    }
  }

  const handleDuplicate = async (trip: TripSummary) => {
    setDuplicatingId(trip.id)
    try {
      const newId = await duplicateTrip(trip.id)
      selectTrip(newId)
      navigate('/')
    } catch (err) {
      console.error('Duplicate failed:', err)
    } finally {
      setDuplicatingId(null)
    }
  }

  const handleSelect = (trip: TripSummary) => {
    selectTrip(trip.id)
    navigate('/')
  }

  const handleCreate = async () => {
    if (!form.name.trim() || !form.destination.trim()) return
    setCreating(true)
    try {
      const id = await createNewTrip(form)
      setCreateOpen(false)
      setForm(emptyForm)
      selectTrip(id)
      navigate('/')
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteTripById(deleteTarget.id)
      setDeleteTarget(null)
    } finally {
      setDeleting(false)
    }
  }

  const openEdit = (trip: TripSummary) => {
    setEditTarget(trip)
    setEditForm({
      name: trip.name || '',
      destination: trip.destination || '',
      startDate: trip.startDate || '',
      endDate: trip.endDate || '',
      description: '',
      tripType: trip.tripType ?? 'international',
    })
  }

  const handleEditSave = async () => {
    if (!editTarget || !editForm.name.trim() || !editForm.destination.trim()) return
    setSaving(true)
    try {
      await updateTripBasic(editTarget.id, editForm)
      setEditTarget(null)
    } finally {
      setSaving(false)
    }
  }

  const userEmail = user?.email ?? ''

  return (
    <div className="min-h-screen bg-background lg:flex">
      <SideNav />
      <div className="flex-1 flex flex-col min-w-0 pb-24 lg:pb-0">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-lg border-b border-border px-4 pt-safe-top">
          <div className="max-w-2xl mx-auto py-4 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">My Trips</h1>
              {userEmail && (
                <p className="text-sm text-muted-foreground mt-0.5 truncate max-w-[220px]">
                  {userEmail}
                </p>
              )}
            </div>
            <Button onClick={() => setCreateOpen(true)} size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" />
              New Trip
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-2xl mx-auto px-4 py-6 w-full">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Loading trips...</p>
            </div>
          ) : trips.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-24 gap-4 text-center"
            >
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Plane className="h-8 w-8 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-lg">No trips yet</p>
                <p className="text-sm text-muted-foreground mt-1">Create your first trip to get started!</p>
              </div>
              <Button onClick={() => setCreateOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Create your first trip
              </Button>
              <div className="flex items-center gap-2 w-full max-w-[260px]">
                <div className="h-px flex-1 bg-border" />
                <span className="text-[10px] text-muted-foreground uppercase tracking-widest">or</span>
                <div className="h-px flex-1 bg-border" />
              </div>
              <Button variant="outline" onClick={handleSeed} disabled={seeding} className="gap-2">
                {seeding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 text-amber-500" />}
                Seed sample trip
              </Button>
              <p className="text-[11px] text-muted-foreground/70 max-w-[260px]">
                Loads a fully-populated HK–Macau example with flights, hotels, itinerary, expenses, contacts, and visa info so you can poke around.
              </p>
            </motion.div>
          ) : (
            <div className="flex flex-col gap-4">
              <AnimatePresence mode="popLayout">
                {trips.map((trip, i) => (
                  <motion.div
                    key={trip.id}
                    custom={i}
                    variants={cardVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    layout
                  >
                    <TripCard
                      trip={trip}
                      onSelect={() => handleSelect(trip)}
                      onDelete={() => setDeleteTarget(trip)}
                      onDuplicate={duplicatingId === trip.id ? undefined : () => handleDuplicate(trip)}
                      onEdit={() => openEdit(trip)}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
              <Button
                variant="ghost"
                onClick={handleSeed}
                disabled={seeding}
                className="gap-2 text-xs text-muted-foreground hover:text-foreground"
              >
                {seeding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 text-amber-500" />}
                Seed another sample trip
              </Button>
            </div>
          )}
        </div>

        {/* Create Trip Sheet */}
        <AnimatePresence>
          {createOpen && (
            <>
              <SheetBackdrop onClose={() => { setCreateOpen(false); setForm(emptyForm) }} />
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                className="fixed bottom-0 left-0 right-0 z-[2001] bg-background border-t border-border rounded-t-3xl pb-safe max-h-[90vh] overflow-y-auto"
              >
                <div className="flex justify-center pt-3 pb-1">
                  <div className="w-10 h-1 rounded-full bg-border" />
                </div>
                <div className="flex items-center justify-between px-5 py-3">
                  <h2 className="text-base font-semibold">New Trip</h2>
                  <button
                    onClick={() => { setCreateOpen(false); setForm(emptyForm) }}
                    className="w-7 h-7 rounded-full bg-muted flex items-center justify-center"
                  >
                    <X className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>
                <div className="px-5 pb-8 flex flex-col gap-4">
                  {/* Trip type toggle */}
                  <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-muted">
                    {(['international', 'domestic'] as const).map(type => (
                      <button
                        key={type}
                        onClick={() => setForm(f => ({ ...f, tripType: type }))}
                        className={`py-2.5 rounded-xl text-sm font-semibold transition-all ${
                          form.tripType === type
                            ? type === 'domestic'
                              ? 'bg-amber-500 text-white shadow-sm'
                              : 'bg-blue-500 text-white shadow-sm'
                            : 'text-muted-foreground'
                        }`}
                      >
                        {type === 'international' ? '🌏 International' : '🇵🇭 Domestic PH'}
                      </button>
                    ))}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="trip-name">Trip Name *</Label>
                    <Input
                      id="trip-name"
                      placeholder="e.g. Summer Vacation 2026"
                      value={form.name}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="trip-dest">Destination *</Label>
                    <Input
                      id="trip-dest"
                      placeholder="e.g. Tokyo, Japan"
                      value={form.destination}
                      onChange={e => setForm(f => ({ ...f, destination: e.target.value }))}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="trip-start">Start Date</Label>
                      <Input
                        id="trip-start"
                        type="date"
                        value={form.startDate}
                        onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="trip-end">End Date</Label>
                      <Input
                        id="trip-end"
                        type="date"
                        value={form.endDate}
                        onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="trip-desc">Description</Label>
                    <Input
                      id="trip-desc"
                      placeholder="Optional notes about this trip"
                      value={form.description}
                      onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    />
                  </div>
                  <button
                    onClick={handleCreate}
                    disabled={creating || !form.name.trim() || !form.destination.trim()}
                    className="w-full py-3 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
                  >
                    {creating && <Loader2 className="h-4 w-4 animate-spin" />}
                    Create Trip
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Edit Trip Sheet */}
        <AnimatePresence>
          {editTarget && (
            <>
              <SheetBackdrop onClose={() => setEditTarget(null)} />
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                className="fixed bottom-0 left-0 right-0 z-[2001] bg-background border-t border-border rounded-t-3xl pb-safe max-h-[90vh] overflow-y-auto"
              >
                <div className="flex justify-center pt-3 pb-1">
                  <div className="w-10 h-1 rounded-full bg-border" />
                </div>
                <div className="flex items-center justify-between px-5 py-3">
                  <h2 className="text-base font-semibold">Edit Trip</h2>
                  <button
                    onClick={() => setEditTarget(null)}
                    className="w-7 h-7 rounded-full bg-muted flex items-center justify-center"
                  >
                    <X className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>
                <div className="px-5 pb-8 flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="edit-name">Trip Name *</Label>
                    <Input
                      id="edit-name"
                      placeholder="e.g. Summer Vacation 2026"
                      value={editForm.name}
                      onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="edit-dest">Destination *</Label>
                    <Input
                      id="edit-dest"
                      placeholder="e.g. Tokyo, Japan"
                      value={editForm.destination}
                      onChange={e => setEditForm(f => ({ ...f, destination: e.target.value }))}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="edit-start">Start Date</Label>
                      <Input
                        id="edit-start"
                        type="date"
                        value={editForm.startDate}
                        onChange={e => setEditForm(f => ({ ...f, startDate: e.target.value }))}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="edit-end">End Date</Label>
                      <Input
                        id="edit-end"
                        type="date"
                        value={editForm.endDate}
                        onChange={e => setEditForm(f => ({ ...f, endDate: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="edit-desc">Description</Label>
                    <Input
                      id="edit-desc"
                      placeholder="Optional notes about this trip"
                      value={editForm.description}
                      onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                    />
                  </div>
                  <button
                    onClick={handleEditSave}
                    disabled={saving || !editForm.name.trim() || !editForm.destination.trim()}
                    className="w-full py-3 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
                  >
                    {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                    Save Changes
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Delete Confirmation Sheet */}
        <AnimatePresence>
          {deleteTarget && (
            <>
              <SheetBackdrop onClose={() => setDeleteTarget(null)} />
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                className="fixed bottom-0 left-0 right-0 z-[2001] bg-background border-t border-border rounded-t-3xl pb-safe"
              >
                <div className="flex justify-center pt-3 pb-1">
                  <div className="w-10 h-1 rounded-full bg-border" />
                </div>
                <div className="px-5 py-4 flex flex-col gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-destructive/10 flex items-center justify-center shrink-0">
                      <Trash2 className="h-5 w-5 text-destructive" />
                    </div>
                    <div>
                      <p className="font-semibold">Delete Trip</p>
                      <p className="text-xs text-muted-foreground mt-0.5">This cannot be undone</p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Are you sure you want to delete <strong className="text-foreground">{deleteTarget.name || 'this trip'}</strong>? All trip data will be permanently removed.
                  </p>
                  <div className="flex gap-3 pb-2">
                    <button
                      onClick={() => setDeleteTarget(null)}
                      disabled={deleting}
                      className="flex-1 py-3 rounded-2xl border border-border text-sm font-semibold active:scale-[0.98] transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDelete}
                      disabled={deleting}
                      className="flex-1 py-3 rounded-2xl bg-destructive text-destructive-foreground text-sm font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50"
                    >
                      {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
                      Delete
                    </button>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <BottomNav />
      </div>
    </div>
  )
}
