import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { MapPin, Plus, Trash2, Plane, Loader2, CalendarDays } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useTrip } from '@/contexts/TripContext'
import BottomNav from '@/layouts/BottomNav'
import { formatDate } from '@/utils/dateUtils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import type { TripSummary } from '@/types'

const statusGradient: Record<TripSummary['status'], string> = {
  upcoming: 'from-blue-500 to-indigo-600',
  active: 'from-emerald-500 to-teal-600',
  completed: 'from-gray-400 to-gray-500',
}

const statusLabel: Record<TripSummary['status'], string> = {
  upcoming: 'Upcoming',
  active: 'Active',
  completed: 'Completed',
}

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.07, duration: 0.3, ease: 'easeOut' },
  }),
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2 } },
}

const emptyForm = { name: '', destination: '', startDate: '', endDate: '', description: '' }

export default function Trips() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { trips, loading, selectTrip, createNewTrip, deleteTripById } = useTrip()

  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [creating, setCreating] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<TripSummary | null>(null)
  const [deleting, setDeleting] = useState(false)

  const handleSelect = (trip: TripSummary) => {
    selectTrip(trip.id)
    navigate('/dashboard')
  }

  const handleCreate = async () => {
    if (!form.name.trim() || !form.destination.trim()) return
    setCreating(true)
    try {
      const id = await createNewTrip(form)
      setCreateOpen(false)
      setForm(emptyForm)
      selectTrip(id)
      navigate('/dashboard')
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

  const userEmail = user?.email ?? ''

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-lg border-b border-border px-4 pt-safe-top">
        <div className="max-w-lg mx-auto py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">My Trips</h1>
            {userEmail && (
              <p className="text-sm text-muted-foreground mt-0.5 truncate max-w-[220px]">
                {userEmail}
              </p>
            )}
          </div>
          <Button
            onClick={() => setCreateOpen(true)}
            size="sm"
            className="gap-1.5"
          >
            <Plus className="h-4 w-4" />
            New Trip
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto px-4 py-6">
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
                  <div
                    className="relative rounded-2xl overflow-hidden cursor-pointer shadow-md hover:shadow-lg transition-shadow active:scale-[0.98] transition-transform"
                    onClick={() => handleSelect(trip)}
                  >
                    {/* Gradient background */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${statusGradient[trip.status]} opacity-90`} />

                    {/* Content */}
                    <div className="relative z-10 p-5 text-white">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium uppercase tracking-wider opacity-80 mb-1">
                            {statusLabel[trip.status]}
                          </p>
                          <h2 className="text-xl font-bold leading-tight truncate">{trip.name || 'Untitled Trip'}</h2>
                          {trip.destination && (
                            <div className="flex items-center gap-1 mt-1.5 opacity-90">
                              <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                              <span className="text-sm truncate">{trip.destination}</span>
                            </div>
                          )}
                          {(trip.startDate || trip.endDate) && (
                            <div className="flex items-center gap-1 mt-1 opacity-80">
                              <CalendarDays className="h-3.5 w-3.5 flex-shrink-0" />
                              <span className="text-xs">
                                {trip.startDate ? formatDate(trip.startDate, { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                                {' → '}
                                {trip.endDate ? formatDate(trip.endDate, { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Delete button */}
                        <button
                          className="p-2 rounded-xl bg-white/20 hover:bg-white/30 transition-colors flex-shrink-0"
                          onClick={e => {
                            e.stopPropagation()
                            setDeleteTarget(trip)
                          }}
                          aria-label="Delete trip"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Create Trip Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle>Create New Trip</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
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
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setCreateOpen(false); setForm(emptyForm) }}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={creating || !form.name.trim() || !form.destination.trim()}
              className="gap-2"
            >
              {creating && <Loader2 className="h-4 w-4 animate-spin" />}
              Create Trip
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle>Delete Trip</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete <strong>{deleteTarget?.name || 'this trip'}</strong>? This action cannot be undone and all trip data will be permanently removed.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
              className="gap-2"
            >
              {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  )
}
