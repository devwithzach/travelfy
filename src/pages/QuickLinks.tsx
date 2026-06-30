import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Link2, Plus, Trash2, Edit2, ExternalLink, X,
  Plane, Building, MapPin, FileText, Shield, Bus, Star
} from 'lucide-react'
import { useTrip } from '@/contexts/TripContext'
import type { QuickLink } from '@/types'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { cn } from '@/utils/cn'

const iconMap: Record<string, React.ElementType> = {
  plane: Plane,
  building: Building,
  'map-pin': MapPin,
  'file-text': FileText,
  shield: Shield,
  bus: Bus,
  star: Star,
  link: Link2,
}

const categoryConfig: Record<string, { label: string; color: string; bg: string }> = {
  airline:     { label: 'Airline',     color: 'text-blue-600',   bg: 'bg-blue-500' },
  hotel:       { label: 'Hotel',       color: 'text-violet-600', bg: 'bg-violet-500' },
  maps:        { label: 'Maps',        color: 'text-emerald-600',bg: 'bg-emerald-500' },
  immigration: { label: 'Immigration', color: 'text-amber-600',  bg: 'bg-amber-500' },
  insurance:   { label: 'Insurance',   color: 'text-cyan-600',   bg: 'bg-cyan-500' },
  transport:   { label: 'Transport',   color: 'text-indigo-600', bg: 'bg-indigo-500' },
  other:       { label: 'Other',       color: 'text-gray-600',   bg: 'bg-gray-500' },
}

const defaultLink = (): QuickLink => ({
  id: crypto.randomUUID(),
  title: '',
  url: '',
  icon: 'link',
  category: 'other',
})

function domainOf(url: string) {
  try { return new URL(url).hostname.replace(/^www\./, '') } catch { return url }
}

export default function QuickLinks() {
  const { trip, updateTrip } = useTrip()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<QuickLink | null>(null)

  const openAdd = () => { setEditing(defaultLink()); setSheetOpen(true) }
  const openEdit = (l: QuickLink) => { setEditing({ ...l }); setSheetOpen(true) }

  const save = () => {
    if (!editing || !editing.title.trim()) return
    updateTrip(prev => {
      const exists = prev.quickLinks.find(l => l.id === editing.id)
      return {
        ...prev,
        quickLinks: exists
          ? prev.quickLinks.map(l => l.id === editing.id ? editing : l)
          : [...prev.quickLinks, editing],
      }
    })
    setSheetOpen(false)
  }

  const remove = (id: string) => {
    updateTrip(prev => ({ ...prev, quickLinks: prev.quickLinks.filter(l => l.id !== id) }))
  }

  // Group — any unknown category falls into 'other' so no link is ever lost
  const grouped: Record<string, QuickLink[]> = {}
  for (const link of trip.quickLinks) {
    const cat = link.category in categoryConfig ? link.category : 'other'
    if (!grouped[cat]) grouped[cat] = []
    grouped[cat].push(link)
  }
  // Render in defined order
  const orderedCategories = Object.keys(categoryConfig).filter(c => grouped[c]?.length)

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-cyan-500/15 flex items-center justify-center shrink-0">
            <Link2 className="h-5 w-5 text-cyan-600" />
          </div>
          <div>
            <h1 className="text-lg font-bold leading-tight">Quick Links</h1>
            <p className="text-xs text-muted-foreground leading-none mt-0.5">
              {trip.quickLinks.length} link{trip.quickLinks.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <Button
          size="icon-sm"
          onClick={openAdd}
          className="gradient-brand text-white border-0 shadow-sm"
          aria-label="Add link"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div className="px-4 pb-6 space-y-5">
        {trip.quickLinks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 px-8 text-center">
            <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center">
              <Link2 className="h-10 w-10 text-primary/40" />
            </div>
            <div>
              <p className="font-bold text-lg">No links saved</p>
              <p className="text-sm text-muted-foreground mt-1">Save airline websites, hotel bookings, maps, and more.</p>
            </div>
            <button
              onClick={openAdd}
              className="gradient-brand text-white font-bold px-6 py-3 rounded-2xl shadow-md active:scale-[0.98] transition-transform text-sm flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add First Link
            </button>
          </div>
        ) : (
          <AnimatePresence>
            {orderedCategories.map(category => {
              const cfg = categoryConfig[category]
              const links = grouped[category]
              return (
                <motion.div
                  key={category}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  {/* Category label */}
                  <div className="flex items-center gap-2 mb-2 px-1">
                    <div className={`w-2 h-2 rounded-full ${cfg.bg}`} />
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {cfg.label}
                    </span>
                    <span className="text-xs text-muted-foreground/50">({links.length})</span>
                  </div>

                  {/* Link rows */}
                  <div className="rounded-2xl bg-card border border-border overflow-hidden divide-y divide-border">
                    {links.map((link) => {
                      const IconComp = iconMap[link.icon] || Link2
                      return (
                        <div key={link.id} className="flex items-center gap-3 px-4 py-3 group active:bg-accent transition-colors">
                          {/* Icon */}
                          <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-white', cfg.bg)}>
                            <IconComp className="h-4 w-4" />
                          </div>

                          {/* Text — tapping opens link */}
                          <button
                            className="flex-1 min-w-0 text-left"
                            onClick={() => link.url && window.open(link.url, '_blank', 'noopener,noreferrer')}
                          >
                            <p className="font-semibold text-sm leading-tight truncate">{link.title}</p>
                            {link.url && (
                              <p className="text-xs text-muted-foreground mt-0.5 truncate flex items-center gap-1">
                                <ExternalLink className="h-3 w-3 shrink-0" />
                                {domainOf(link.url)}
                              </p>
                            )}
                          </button>

                          {/* Actions */}
                          <div className="flex gap-1 shrink-0">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="h-8 w-8 opacity-60 hover:opacity-100"
                              onClick={() => openEdit(link)}
                              aria-label="Edit"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="h-8 w-8 opacity-60 hover:opacity-100 text-destructive hover:text-destructive"
                              onClick={() => remove(link.id)}
                              aria-label="Delete"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        )}
      </div>

      {/* ── Bottom Sheet ── */}
      <AnimatePresence>
        {sheetOpen && (
          <>
            <motion.div
              key="ql-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
              onClick={() => setSheetOpen(false)}
            />
            <motion.div
              key="ql-sheet"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-[51] bg-background rounded-t-3xl shadow-2xl max-h-[92vh] overflow-y-auto"
            >
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-border" />
              </div>
              <div className="flex items-center justify-between px-5 py-3">
                <h2 className="text-base font-bold">
                  {editing && trip.quickLinks.find(l => l.id === editing.id) ? 'Edit Link' : 'Add Link'}
                </h2>
                <button
                  onClick={() => setSheetOpen(false)}
                  className="w-8 h-8 rounded-full bg-muted flex items-center justify-center"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {editing && (
                <div className="px-5 pb-8 space-y-4">
                  {/* Title */}
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wide">Title</Label>
                    <input
                      type="text"
                      value={editing.title}
                      onChange={e => setEditing({ ...editing, title: e.target.value })}
                      placeholder="Cebu Pacific"
                      className="w-full px-4 py-3 rounded-xl bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>

                  {/* URL */}
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wide">URL</Label>
                    <input
                      type="url"
                      inputMode="url"
                      value={editing.url}
                      onChange={e => setEditing({ ...editing, url: e.target.value })}
                      placeholder="https://..."
                      className="w-full px-4 py-3 rounded-xl bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>

                  {/* Category — tap chips */}
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wide">Category</Label>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(categoryConfig).map(([k, v]) => (
                        <button
                          key={k}
                          type="button"
                          onClick={() => setEditing({ ...editing, category: k as QuickLink['category'] })}
                          className={cn(
                            'px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all active:scale-95',
                            editing.category === k
                              ? `${v.bg} text-white border-transparent shadow-sm`
                              : 'bg-muted border-border text-muted-foreground hover:border-primary/40'
                          )}
                        >
                          {v.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Icon — tap chips with actual icon */}
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wide">Icon</Label>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(iconMap).map(([k, IconComp]) => (
                        <button
                          key={k}
                          type="button"
                          onClick={() => setEditing({ ...editing, icon: k })}
                          className={cn(
                            'w-10 h-10 rounded-xl flex items-center justify-center border transition-all active:scale-95',
                            editing.icon === k
                              ? 'bg-primary text-white border-primary shadow-sm'
                              : 'bg-muted border-border text-muted-foreground hover:border-primary/40'
                          )}
                          aria-label={k}
                        >
                          <IconComp className="h-4 w-4" />
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={save}
                    className="w-full py-4 rounded-2xl gradient-brand text-white font-bold text-sm active:scale-[0.98] transition-transform"
                  >
                    Save Link
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
