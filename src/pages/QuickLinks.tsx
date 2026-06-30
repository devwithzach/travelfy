import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Link2, Plus, Trash2, Edit2, ExternalLink, X,
  Plane, Building, MapPin, FileText, Shield, Bus, Star, Sparkles
} from 'lucide-react'
import { useTrip } from '@/contexts/TripContext'
import type { QuickLink } from '@/types'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { cn } from '@/utils/cn'

// Nationality → suggested quick links
// Key is a substring match against passport.nationality (case-insensitive)
type SuggestedLink = Omit<QuickLink, 'id'>

const NATIONALITY_SUGGESTIONS: Array<{ match: string[]; links: SuggestedLink[] }> = [
  {
    match: ['filipino', 'philippine'],
    links: [
      { title: 'DFA Passport Appointment', url: 'https://passport.gov.ph', icon: 'file-text', category: 'immigration' },
      { title: 'eTravel Philippines', url: 'https://etravel.gov.ph', icon: 'file-text', category: 'immigration' },
      { title: 'Bureau of Immigration', url: 'https://www.immigration.gov.ph', icon: 'shield', category: 'immigration' },
      { title: 'Philippine Airlines', url: 'https://www.philippineairlines.com', icon: 'plane', category: 'airline' },
      { title: 'Cebu Pacific', url: 'https://www.cebupacificair.com', icon: 'plane', category: 'airline' },
      { title: 'AirAsia Philippines', url: 'https://www.airasia.com', icon: 'plane', category: 'airline' },
    ],
  },
  {
    match: ['american', 'united states'],
    links: [
      { title: 'US Passport Renewal', url: 'https://travel.state.gov', icon: 'file-text', category: 'immigration' },
      { title: 'ESTA Visa Waiver', url: 'https://esta.cbp.dhs.gov', icon: 'shield', category: 'immigration' },
      { title: 'American Airlines', url: 'https://www.aa.com', icon: 'plane', category: 'airline' },
      { title: 'Delta Airlines', url: 'https://www.delta.com', icon: 'plane', category: 'airline' },
      { title: 'United Airlines', url: 'https://www.united.com', icon: 'plane', category: 'airline' },
    ],
  },
  {
    match: ['british', 'english', 'uk'],
    links: [
      { title: 'HMPO Passport', url: 'https://www.gov.uk/renew-adult-passport', icon: 'file-text', category: 'immigration' },
      { title: 'UK ETIAS', url: 'https://www.gov.uk/foreign-travel-advice', icon: 'shield', category: 'immigration' },
      { title: 'British Airways', url: 'https://www.britishairways.com', icon: 'plane', category: 'airline' },
      { title: 'easyJet', url: 'https://www.easyjet.com', icon: 'plane', category: 'airline' },
    ],
  },
  {
    match: ['australian'],
    links: [
      { title: 'Australian Passport', url: 'https://www.passports.gov.au', icon: 'file-text', category: 'immigration' },
      { title: 'SmartGate / IPC', url: 'https://www.abf.gov.au', icon: 'shield', category: 'immigration' },
      { title: 'Qantas', url: 'https://www.qantas.com', icon: 'plane', category: 'airline' },
      { title: 'Jetstar', url: 'https://www.jetstar.com', icon: 'plane', category: 'airline' },
    ],
  },
  {
    match: ['indian'],
    links: [
      { title: 'Passport Seva (India)', url: 'https://www.passportindia.gov.in', icon: 'file-text', category: 'immigration' },
      { title: 'FRRO Online', url: 'https://frro.gov.in', icon: 'shield', category: 'immigration' },
      { title: 'Air India', url: 'https://www.airindia.com', icon: 'plane', category: 'airline' },
      { title: 'IndiGo', url: 'https://www.goindigo.in', icon: 'plane', category: 'airline' },
    ],
  },
  {
    match: ['singaporean'],
    links: [
      { title: 'ICA Singapore', url: 'https://www.ica.gov.sg', icon: 'file-text', category: 'immigration' },
      { title: 'Singapore Airlines', url: 'https://www.singaporeair.com', icon: 'plane', category: 'airline' },
      { title: 'Scoot', url: 'https://www.flyscoot.com', icon: 'plane', category: 'airline' },
    ],
  },
  {
    match: ['japanese'],
    links: [
      { title: 'Japan Passport (MOFA)', url: 'https://www.mofa.go.jp', icon: 'file-text', category: 'immigration' },
      { title: 'Japan Airlines', url: 'https://www.jal.com', icon: 'plane', category: 'airline' },
      { title: 'ANA', url: 'https://www.ana.co.jp', icon: 'plane', category: 'airline' },
    ],
  },
  {
    match: ['korean'],
    links: [
      { title: 'Korean Passport (MOFA)', url: 'https://www.passport.go.kr', icon: 'file-text', category: 'immigration' },
      { title: 'Korean Air', url: 'https://www.koreanair.com', icon: 'plane', category: 'airline' },
      { title: 'Asiana Airlines', url: 'https://www.flyasiana.com', icon: 'plane', category: 'airline' },
    ],
  },
  {
    match: ['chinese'],
    links: [
      { title: 'China Passport (MPS)', url: 'https://www.mps.gov.cn', icon: 'file-text', category: 'immigration' },
      { title: 'Air China', url: 'https://www.airchina.com', icon: 'plane', category: 'airline' },
      { title: 'China Eastern', url: 'https://www.ceair.com', icon: 'plane', category: 'airline' },
    ],
  },
  {
    match: ['malaysian'],
    links: [
      { title: 'MyTravelPass (JPN)', url: 'https://www.jpn.gov.my', icon: 'file-text', category: 'immigration' },
      { title: 'Malaysia Airlines', url: 'https://www.malaysiaairlines.com', icon: 'plane', category: 'airline' },
      { title: 'AirAsia', url: 'https://www.airasia.com', icon: 'plane', category: 'airline' },
    ],
  },
  {
    match: ['indonesian'],
    links: [
      { title: 'Ditjen Imigrasi', url: 'https://www.imigrasi.go.id', icon: 'file-text', category: 'immigration' },
      { title: 'Garuda Indonesia', url: 'https://www.garuda-indonesia.com', icon: 'plane', category: 'airline' },
      { title: 'Lion Air', url: 'https://www.lionair.co.id', icon: 'plane', category: 'airline' },
    ],
  },
]

// Always-available universal suggestions
const UNIVERSAL_SUGGESTIONS: SuggestedLink[] = [
  { title: 'Google Maps', url: 'https://maps.google.com', icon: 'map-pin', category: 'maps' },
  { title: 'Google Translate', url: 'https://translate.google.com', icon: 'star', category: 'other' },
  { title: 'XE Currency Converter', url: 'https://www.xe.com', icon: 'star', category: 'other' },
  { title: 'Skyscanner', url: 'https://www.skyscanner.com', icon: 'plane', category: 'airline' },
  { title: 'Booking.com', url: 'https://www.booking.com', icon: 'building', category: 'hotel' },
  { title: 'Airbnb', url: 'https://www.airbnb.com', icon: 'building', category: 'hotel' },
  { title: 'Agoda', url: 'https://www.agoda.com', icon: 'building', category: 'hotel' },
  { title: 'Grab', url: 'https://www.grab.com', icon: 'bus', category: 'transport' },
]

function getSuggestions(nationality: string, existingUrls: Set<string>): SuggestedLink[] {
  const nat = nationality.toLowerCase()
  const natMatches = NATIONALITY_SUGGESTIONS.find(s => s.match.some(m => nat.includes(m)))
  const candidates = [...(natMatches?.links ?? []), ...UNIVERSAL_SUGGESTIONS]
  return candidates.filter(s => !existingUrls.has(s.url)).slice(0, 6)
}

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
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(new Set())

  const existingUrls = new Set(trip.quickLinks.map(l => l.url))
  const nationality = trip.passport?.nationality ?? ''
  const suggestions = getSuggestions(nationality, existingUrls)
    .filter(s => !dismissedSuggestions.has(s.url))

  const addSuggestion = (s: SuggestedLink) => {
    updateTrip(prev => ({
      ...prev,
      quickLinks: [...prev.quickLinks, { ...s, id: crypto.randomUUID() }],
    }))
  }

  const dismissSuggestion = (url: string) => {
    setDismissedSuggestions(prev => new Set([...prev, url]))
  }

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
        {/* ── Suggested Links ── */}
        {suggestions.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2 px-1">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-semibold text-primary">
                Suggested{nationality ? ` for ${nationality}` : ''}
              </span>
            </div>
            <div className="rounded-2xl bg-primary/5 border border-primary/15 overflow-hidden divide-y divide-primary/10">
              {suggestions.map(s => {
                const IconComp = iconMap[s.icon] || Link2
                const cfg = categoryConfig[s.category] ?? categoryConfig.other
                return (
                  <div key={s.url} className="flex items-center gap-3 px-4 py-3">
                    <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-white text-xs', cfg.bg)}>
                      <IconComp className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold leading-tight truncate">{s.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{domainOf(s.url)}</p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={() => addSuggestion(s)}
                        className="w-8 h-8 rounded-xl bg-primary text-white flex items-center justify-center hover:bg-primary/80 active:scale-95 transition-all"
                        aria-label="Add"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => dismissSuggestion(s.url)}
                        className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center hover:bg-accent active:scale-95 transition-all"
                        aria-label="Dismiss"
                      >
                        <X className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

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
