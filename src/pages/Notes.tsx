import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { StickyNote, Plus, Trash2, Check } from 'lucide-react'
import { useTrip } from '@/contexts/TripContext'
import type { Note } from '@/types'
import PageHeader from '@/components/common/PageHeader'
import EmptyState from '@/components/common/EmptyState'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { formatDate } from '@/utils/dateUtils'
import { cn } from '@/utils/cn'

const NOTE_COLORS = ['#2563EB', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#ef4444', '#06b6d4', '#6b7280']

const defaultNote = (): Note => ({
  id: crypto.randomUUID(),
  title: '',
  content: '',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  color: NOTE_COLORS[0],
})

export default function Notes() {
  const { trip, updateTrip } = useTrip()
  const [selectedNote, setSelectedNote] = useState<Note | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editBuffer, setEditBuffer] = useState<Note | null>(null)
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const openNote = (note: Note) => {
    setSelectedNote(note)
    setEditBuffer({ ...note })
    setIsEditing(true)
  }

  const createNote = () => {
    const note = defaultNote()
    updateTrip(prev => ({ ...prev, notes: [note, ...prev.notes] }))
    openNote(note)
  }

  const autoSave = (updated: Note) => {
    if (saveTimeout.current) clearTimeout(saveTimeout.current)
    saveTimeout.current = setTimeout(() => {
      updateTrip(prev => ({
        ...prev,
        notes: prev.notes.map(n => n.id === updated.id ? { ...updated, updatedAt: new Date().toISOString() } : n),
      }))
    }, 600)
  }

  const updateField = (field: keyof Note, value: string) => {
    if (!editBuffer) return
    const updated = { ...editBuffer, [field]: value }
    setEditBuffer(updated)
    autoSave(updated)
  }

  const deleteNote = (id: string) => {
    updateTrip(prev => ({ ...prev, notes: prev.notes.filter(n => n.id !== id) }))
    if (selectedNote?.id === id) {
      setIsEditing(false)
      setSelectedNote(null)
    }
  }

  useEffect(() => {
    return () => { if (saveTimeout.current) clearTimeout(saveTimeout.current) }
  }, [])

  if (isEditing && editBuffer) {
    return (
      <div className="flex flex-col h-screen">
        <div className="flex items-center px-4 pt-12 pb-3 gap-2 border-b">
          <Button variant="ghost" size="sm" className="text-xs" onClick={() => setIsEditing(false)}>
            ← Back
          </Button>
          <div className="flex-1" />
          <div className="flex gap-1.5">
            {NOTE_COLORS.map(c => (
              <button
                key={c}
                className={cn('w-5 h-5 rounded-full transition-transform', editBuffer.color === c ? 'scale-125 ring-2 ring-offset-1 ring-current' : 'hover:scale-110')}
                style={{ backgroundColor: c, color: c }}
                onClick={() => updateField('color', c)}
              />
            ))}
          </div>
          <Button variant="ghost" size="icon-sm" onClick={() => { updateTrip(prev => ({ ...prev, notes: prev.notes.map(n => n.id === editBuffer.id ? { ...editBuffer, updatedAt: new Date().toISOString() } : n) })); setIsEditing(false) }}>
            <Check className="h-4 w-4 text-emerald-500" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <Input
            value={editBuffer.title}
            onChange={e => updateField('title', e.target.value)}
            placeholder="Note title..."
            className="text-lg font-bold border-0 px-0 shadow-none focus-visible:ring-0 bg-transparent"
            style={{ color: editBuffer.color }}
          />
          <Textarea
            value={editBuffer.content}
            onChange={e => updateField('content', e.target.value)}
            placeholder="Write your note here..."
            className="min-h-[60vh] border-0 px-0 shadow-none focus-visible:ring-0 bg-transparent text-sm leading-relaxed"
          />
        </div>
        <div className="px-4 pb-4 text-xs text-muted-foreground text-center">
          Autosaving... · {editBuffer.updatedAt ? formatDate(editBuffer.updatedAt, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' } as Intl.DateTimeFormatOptions) : ''}
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Notes"
        subtitle={`${trip.notes.length} note${trip.notes.length !== 1 ? 's' : ''}`}
        icon={StickyNote}
        iconColor="text-amber-500"
        action={
          <Button size="icon-sm" onClick={createNote}>
            <Plus className="h-4 w-4" />
          </Button>
        }
      />

      <div className="px-4">
        {trip.notes.length === 0 ? (
          <EmptyState
            icon={StickyNote}
            title="No notes yet"
            description="Capture important info, reminders, and ideas for your trip."
            actionLabel="Create Note"
            onAction={createNote}
          />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <AnimatePresence>
              {trip.notes.map((note, i) => (
                <motion.div
                  key={note.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: i * 0.05 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <div
                    className="relative rounded-2xl p-4 cursor-pointer min-h-[140px] flex flex-col"
                    style={{ backgroundColor: note.color + '18', borderColor: note.color + '30', border: '1px solid' }}
                    onClick={() => openNote(note)}
                  >
                    <button
                      className="absolute top-2 right-2 p-1 rounded-lg hover:bg-black/10 opacity-0 hover:opacity-100 transition-opacity"
                      onClick={e => { e.stopPropagation(); deleteNote(note.id) }}
                    >
                      <Trash2 className="h-3 w-3" style={{ color: note.color }} />
                    </button>
                    {note.title && (
                      <p className="font-bold text-sm mb-1.5 line-clamp-2" style={{ color: note.color }}>{note.title}</p>
                    )}
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-5 flex-1">
                      {note.content || 'Empty note'}
                    </p>
                    <p className="text-[10px] mt-2 opacity-60" style={{ color: note.color }}>
                      {formatDate(note.updatedAt, { month: 'short', day: 'numeric' } as Intl.DateTimeFormatOptions)}
                    </p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  )
}
