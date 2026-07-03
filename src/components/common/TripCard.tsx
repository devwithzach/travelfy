import { motion } from 'framer-motion'
import { CalendarDays, MapPin, Plane, Building2, Map as MapIcon, Camera, Trash2, ChevronRight, Copy, Pencil } from 'lucide-react'
import type { TripSummary } from '@/types'
import { formatDate, getDaysUntil, getTripStatus, getTripProgress } from '@/utils/dateUtils'
import { cn } from '@/utils/cn'

const statusGradient: Record<TripSummary['status'], string> = {
  upcoming: 'from-blue-500 to-indigo-600',
  active: 'from-emerald-500 to-teal-600',
  completed: 'from-gray-400 to-gray-500',
}

const statusLabel: Record<TripSummary['status'], string> = {
  upcoming: 'Upcoming',
  active: 'Live',
  completed: 'Completed',
}

interface Props {
  trip: TripSummary
  onSelect: () => void
  onDelete?: () => void
  onDuplicate?: () => void
  onEdit?: () => void
  /** Compact mode used on Dashboard lobby — smaller padding, no gradient hero. */
  compact?: boolean
}

export default function TripCard({ trip, onSelect, onDelete, onDuplicate, onEdit, compact = false }: Props) {
  // Status comes from getTripStatus (date-derived) rather than the stored field
  // so a row that hasn't been opened in days still shows the right phase.
  const liveStatus: TripSummary['status'] = trip.startDate && trip.endDate
    ? getTripStatus(trip.startDate, trip.endDate)
    : trip.status

  const counts = trip.counts ?? { flights: 0, hotels: 0, days: 0, photos: 0 }

  // Countdown text — different shape per phase.
  const countdown = (() => {
    if (!trip.startDate || !trip.endDate) return null
    if (liveStatus === 'upcoming') {
      const days = getDaysUntil(trip.startDate)
      if (days === 0) return 'Starts today'
      if (days === 1) return 'Tomorrow'
      return `In ${days} days`
    }
    if (liveStatus === 'active') {
      const pct = getTripProgress(trip.startDate, trip.endDate)
      return `${pct}% through trip`
    }
    return null
  })()

  if (compact) {
    return (
      <button
        onClick={onSelect}
        className="w-full flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-accent active:scale-[0.99] transition-all text-left"
      >
        <div className={cn(
          'w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center shrink-0',
          statusGradient[liveStatus],
        )}>
          <Plane className="h-4 w-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold truncate">{trip.name || 'Untitled Trip'}</p>
            <span className="text-[9px] uppercase tracking-wider font-bold text-muted-foreground shrink-0">
              {statusLabel[liveStatus]}
            </span>
          </div>
          <p className="text-xs text-muted-foreground truncate">
            {trip.destination || '—'}{countdown ? ` · ${countdown}` : ''}
          </p>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
      </button>
    )
  }

  return (
    <motion.div layout className="relative">
      <button
        onClick={onSelect}
        className="w-full text-left rounded-2xl overflow-hidden shadow-md hover:shadow-lg transition-shadow active:scale-[0.98]"
      >
        {/* Hero strip — cover photo if set, otherwise status gradient */}
        <div
          className={cn(
            'relative p-5 text-white',
            !trip.coverImage && `bg-gradient-to-br ${statusGradient[liveStatus]}`,
          )}
          style={trip.coverImage
            ? { backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.7) 100%), url(${trip.coverImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }
            : undefined}
        >
          {!trip.coverImage && (
            <>
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-10 translate-x-10" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-8 -translate-x-6" />
            </>
          )}
          <div className="relative">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-90 bg-white/15 px-2 py-0.5 rounded-full">
                  {statusLabel[liveStatus]}
                </span>
                <span className="text-[10px] font-semibold opacity-90 bg-white/15 px-2 py-0.5 rounded-full">
                  {trip.tripType === 'domestic' ? '🇵🇭 Domestic' : '🌏 Intl'}
                </span>
              </div>
              {countdown && (
                <span className="text-[10px] font-semibold opacity-95 bg-white/15 px-2 py-0.5 rounded-full">
                  {countdown}
                </span>
              )}
            </div>
            <h2 className="text-lg font-bold leading-tight truncate">{trip.name || 'Untitled Trip'}</h2>
            {trip.destination && (
              <div className="flex items-center gap-1 mt-1 opacity-90">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span className="text-sm truncate">{trip.destination}</span>
              </div>
            )}
            {(trip.startDate || trip.endDate) && (
              <div className="flex items-center gap-1 mt-1 opacity-80">
                <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                <span className="text-xs">
                  {trip.startDate ? formatDate(trip.startDate, { month: 'short', day: 'numeric' }) : '—'}
                  {' → '}
                  {trip.endDate ? formatDate(trip.endDate, { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Stats chips */}
        <div className="bg-card grid grid-cols-4 divide-x divide-border">
          <Stat icon={Plane} label="Flights" value={counts.flights} />
          <Stat icon={Building2} label="Hotels" value={counts.hotels} />
          <Stat icon={MapIcon} label="Days" value={counts.days} />
          <Stat icon={Camera} label="Photos" value={counts.photos} />
        </div>
      </button>

      <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
        {onEdit && (
          <button
            onClick={e => { e.stopPropagation(); onEdit() }}
            aria-label="Edit trip"
            title="Edit trip details"
            className="p-2.5 rounded-xl bg-black/30 hover:bg-black/50 text-white backdrop-blur-sm transition-colors active:scale-90"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        )}
        {onDuplicate && (
          <button
            onClick={e => { e.stopPropagation(); onDuplicate() }}
            aria-label="Duplicate trip as template"
            title="Use as template for a new trip"
            className="p-2.5 rounded-xl bg-black/30 hover:bg-black/50 text-white backdrop-blur-sm transition-colors active:scale-90"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
        )}
        {onDelete && (
          <button
            onClick={e => { e.stopPropagation(); onDelete() }}
            aria-label="Delete trip"
            className="p-2.5 rounded-xl bg-black/30 hover:bg-black/50 text-white backdrop-blur-sm transition-colors active:scale-90"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </motion.div>
  )
}

function Stat({ icon: Icon, label, value }: { icon: typeof Plane; label: string; value: number }) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-2.5 gap-0.5', value === 0 && 'opacity-40')}>
      <div className="flex items-center gap-1">
        <Icon className="h-3 w-3 text-muted-foreground" />
        <span className="text-sm font-bold tabular-nums">{value}</span>
      </div>
      <span className="text-[9px] text-muted-foreground uppercase tracking-wider">{label}</span>
    </div>
  )
}
