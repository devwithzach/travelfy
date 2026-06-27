import { motion } from 'framer-motion'
import { Layers } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useTrip } from '@/contexts/TripContext'
import { cn } from '@/utils/cn'

interface PageHeaderProps {
  title: string
  subtitle?: string
  icon?: LucideIcon
  iconColor?: string
  action?: React.ReactNode
  className?: string
  /** Hide the dynamic trip breadcrumb above the title (default: show). */
  hideTripContext?: boolean
}

export default function PageHeader({
  title,
  subtitle,
  icon: Icon,
  iconColor = 'text-primary',
  action,
  className,
  hideTripContext = false,
}: PageHeaderProps) {
  const { trip } = useTrip()
  const navigate = useNavigate()
  const tripName = trip.tripInfo.name?.trim()

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      // Top padding combines the iOS safe-area inset with a 3rem floor so the
      // title isn't tucked under the status bar on notched devices.
      className={cn('px-4 pb-4 pt-[max(3rem,env(safe-area-inset-top))]', className)}
    >
      {/* Trip breadcrumb — always shown when a trip is loaded, tappable to
          switch trips. Single source of truth: the active trip in TripContext
          (loaded from Supabase, scoped to the signed-in user via RLS). */}
      {!hideTripContext && tripName && (
        <button
          onClick={() => navigate('/trips')}
          className="flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors uppercase tracking-widest mb-2 active:scale-95 origin-left"
          aria-label="Switch trip"
        >
          <Layers className="h-3 w-3" />
          <span className="truncate max-w-[70vw]">{tripName}</span>
        </button>
      )}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {Icon && (
            <div className={cn('p-2 rounded-xl bg-primary/10', iconColor.replace('text-', 'bg-').replace('primary', 'primary/10'))}>
              <Icon className={cn('h-5 w-5', iconColor)} />
            </div>
          )}
          <div>
            <h1 className="text-xl font-bold tracking-tight">{title}</h1>
            {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
          </div>
        </div>
        {action && <div>{action}</div>}
      </div>
    </motion.div>
  )
}
