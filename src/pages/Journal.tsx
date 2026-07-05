import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BookOpen, Plus, Edit2, Trash2 } from 'lucide-react'
import { useTrip } from '@/contexts/TripContext'
import type { JournalEntry } from '@/types'
import PageHeader from '@/components/common/PageHeader'
import EmptyState from '@/components/common/EmptyState'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/utils/cn'

// ─── Mood config ─────────────────────────────────────────────────────────────

type Mood = JournalEntry['mood']

const MOOD_CONFIG: Record<Mood, { emoji: string; label: string; color: string }> = {
  amazing: { emoji: '🤩', label: 'Amazing', color: 'text-yellow-600 bg-yellow-100' },
  good:    { emoji: '😊', label: 'Good',    color: 'text-emerald-600 bg-emerald-100' },
  okay:    { emoji: '😐', label: 'Okay',    color: 'text-blue-600 bg-blue-100' },
  tough:   { emoji: '😔', label: 'Tough',   color: 'text-orange-600 bg-orange-100' },
  rough:   { emoji: '😢', label: 'Rough',   color: 'text-rose-600 bg-rose-100' },
}

const WEATHER_PRESETS = ['☀️', '🌤️', '⛅', '🌧️', '⛈️']

// ─── Helpers ─────────────────────────────────────────────────────────────────

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

function formatEntryDate(iso: string): string {
  // Parse as local date to avoid UTC-shift display issues
  const [year, month, day] = iso.split('-').map(Number)
  const d = new Date(year, month - 1, day)
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function blankEntry(): JournalEntry {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    date: todayISO(),
    title: '',
    body: '',
    mood: 'good',
    weather: '',
    createdAt: now,
    updatedAt: now,
  }
}

// ─── Entry Form Dialog ────────────────────────────────────────────────────────

interface EntryDialogProps {
  open: boolean
  entry: JournalEntry | null
  onClose: () => void
  onSave: (entry: JournalEntry) => void
}

function EntryDialog({ open, entry, onClose, onSave }: EntryDialogProps) {
  const isEdit = !!entry?.createdAt && entry.createdAt !== entry.updatedAt || false

  const [form, setForm] = useState<JournalEntry>(() => entry ?? blankEntry())

  // Sync form when the dialog opens with a new entry
  const [lastEntryId, setLastEntryId] = useState<string | null>(null)
  if (entry && entry.id !== lastEntryId) {
    setLastEntryId(entry.id)
    setForm(entry)
  } else if (!entry && lastEntryId !== null) {
    setLastEntryId(null)
    setForm(blankEntry())
  }

  const set = <K extends keyof JournalEntry>(key: K, value: JournalEntry[K]) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  const handleSave = () => {
    if (!form.title.trim() && !form.body.trim()) return
    onSave({ ...form, updatedAt: new Date().toISOString() })
  }

  const canSave = form.title.trim() !== '' || form.body.trim() !== ''

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="max-w-md w-[calc(100vw-2rem)] rounded-2xl p-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-3 border-b">
          <DialogTitle className="text-base font-semibold">
            {isEdit ? 'Edit Entry' : 'New Journal Entry'}
          </DialogTitle>
        </DialogHeader>

        <div className="px-5 py-4 space-y-4 overflow-y-auto max-h-[70vh]">
          {/* Date */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Date</Label>
            <Input
              type="date"
              value={form.date}
              onChange={e => set('date', e.target.value)}
              className="text-base"
            />
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Title</Label>
            <Input
              value={form.title}
              onChange={e => set('title', e.target.value)}
              placeholder="Give this day a title..."
              className="text-base"
            />
          </div>

          {/* Mood */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Mood</Label>
            <div className="flex gap-2 flex-wrap">
              {(Object.entries(MOOD_CONFIG) as [Mood, typeof MOOD_CONFIG[Mood]][]).map(([key, cfg]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => set('mood', key)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border',
                    form.mood === key
                      ? cn(cfg.color, 'border-current scale-[1.04] shadow-sm')
                      : 'bg-muted text-muted-foreground border-transparent hover:border-muted-foreground/20'
                  )}
                >
                  <span>{cfg.emoji}</span>
                  <span>{cfg.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Weather */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Weather</Label>
            <div className="flex gap-2 items-center mb-2">
              {WEATHER_PRESETS.map(emoji => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => set('weather', emoji)}
                  className={cn(
                    'w-9 h-9 rounded-xl text-lg flex items-center justify-center transition-all border',
                    form.weather === emoji
                      ? 'bg-amber-100 border-amber-300 scale-110 shadow-sm'
                      : 'bg-muted border-transparent hover:bg-muted/80 active:scale-95'
                  )}
                >
                  {emoji}
                </button>
              ))}
            </div>
            <Input
              value={form.weather}
              onChange={e => set('weather', e.target.value)}
              placeholder='e.g. "☀️ Sunny and warm"'
              className="text-base"
            />
          </div>

          {/* Body */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Entry</Label>
            <Textarea
              value={form.body}
              onChange={e => set('body', e.target.value)}
              placeholder="Write about your day..."
              rows={6}
              className="text-base leading-relaxed resize-none"
            />
          </div>
        </div>

        <DialogFooter className="px-5 py-4 border-t flex-row gap-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button className="flex-1" disabled={!canSave} onClick={handleSave}>
            Save Entry
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Journal() {
  const { trip, updateTrip } = useTrip()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  const entries = [...(trip.journal ?? [])].sort((a, b) => b.date.localeCompare(a.date))

  const openAdd = () => {
    setEditingEntry(null)
    setDialogOpen(true)
  }

  const openEdit = (entry: JournalEntry) => {
    setEditingEntry(entry)
    setDialogOpen(true)
  }

  const handleClose = () => {
    setDialogOpen(false)
    setEditingEntry(null)
  }

  const handleSave = (entry: JournalEntry) => {
    if (editingEntry) {
      // Edit — map-replace
      updateTrip(prev => ({
        ...prev,
        journal: (prev.journal ?? []).map(e => e.id === entry.id ? entry : e),
      }))
    } else {
      // Add — push to front
      updateTrip(prev => ({
        ...prev,
        journal: [entry, ...(prev.journal ?? [])],
      }))
    }
    handleClose()
  }

  const handleDelete = (id: string) => {
    updateTrip(prev => ({
      ...prev,
      journal: (prev.journal ?? []).filter(e => e.id !== id),
    }))
    setDeleteConfirmId(null)
  }

  return (
    <div className="pb-28">
      <PageHeader
        title="Travel Journal"
        subtitle={
          entries.length === 0
            ? 'No entries yet'
            : `${entries.length} entr${entries.length !== 1 ? 'ies' : 'y'}`
        }
        icon={BookOpen}
        iconColor="text-amber-600"
        action={
          <Button size="icon-sm" onClick={openAdd} aria-label="New entry">
            <Plus className="h-4 w-4" />
          </Button>
        }
      />

      <div className="px-4">
        {entries.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="No journal entries yet"
            description="Start writing about your travel experiences."
            actionLabel="Write First Entry"
            onAction={openAdd}
          />
        ) : (
          <AnimatePresence initial={false}>
            <div className="space-y-3">
              {entries.map((entry, i) => {
                const mood = MOOD_CONFIG[entry.mood]
                return (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ delay: i * 0.04 }}
                  >
                    <Card className="overflow-hidden active:scale-[0.99] transition-transform">
                      <CardContent className="p-4">
                        {/* Top row: date + mood + weather */}
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span className="text-xs text-muted-foreground font-medium tabular-nums">
                            {formatEntryDate(entry.date)}
                          </span>
                          <span
                            className={cn(
                              'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium',
                              mood.color
                            )}
                          >
                            {mood.emoji} {mood.label}
                          </span>
                          {entry.weather && (
                            <span className="text-xs text-muted-foreground">{entry.weather}</span>
                          )}
                        </div>

                        {/* Title */}
                        {entry.title && (
                          <p className="font-semibold text-sm mb-1 leading-snug">{entry.title}</p>
                        )}

                        {/* Body preview */}
                        {entry.body && (
                          <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                            {entry.body}
                          </p>
                        )}

                        {/* Actions */}
                        <div className="flex items-center justify-end gap-1 mt-3 -mb-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => openEdit(entry)}
                            aria-label="Edit entry"
                          >
                            <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => setDeleteConfirmId(entry.id)}
                            aria-label="Delete entry"
                          >
                            <Trash2 className="h-3.5 w-3.5 text-rose-400" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )
              })}
            </div>
          </AnimatePresence>
        )}
      </div>

      {/* Add / Edit Dialog */}
      <EntryDialog
        open={dialogOpen}
        entry={editingEntry}
        onClose={handleClose}
        onSave={handleSave}
      />

      {/* Delete Confirm Dialog */}
      <Dialog open={deleteConfirmId !== null} onOpenChange={v => { if (!v) setDeleteConfirmId(null) }}>
        <DialogContent className="max-w-xs w-[calc(100vw-2rem)] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base">Delete entry?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground px-1">
            This journal entry will be permanently deleted.
          </p>
          <DialogFooter className="flex-row gap-2 mt-2">
            <Button variant="outline" className="flex-1" onClick={() => setDeleteConfirmId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
