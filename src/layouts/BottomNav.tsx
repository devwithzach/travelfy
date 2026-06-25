import { NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  LayoutDashboard, Plane, Building2, FileText, ListChecks,
  DollarSign, AlertCircle, StickyNote, Map, Link2, Settings, MapPin
} from 'lucide-react'
import { cn } from '@/utils/cn'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Home' },
  { to: '/flights', icon: Plane, label: 'Flights' },
  { to: '/hotels', icon: Building2, label: 'Hotels' },
  { to: '/timeline', icon: Map, label: 'Timeline' },
  { to: '/map', icon: MapPin, label: 'Explore' },
  { to: '/checklist', icon: ListChecks, label: 'Checklist' },
  { to: '/expenses', icon: DollarSign, label: 'Expenses' },
  { to: '/documents', icon: FileText, label: 'Docs' },
  { to: '/emergency', icon: AlertCircle, label: 'Emergency' },
  { to: '/notes', icon: StickyNote, label: 'Notes' },
  { to: '/links', icon: Link2, label: 'Links' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg border-t border-border safe-bottom">
      <div className="flex overflow-x-auto scrollbar-hide px-1 py-1 gap-0.5">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center justify-center min-w-[60px] flex-1 py-1.5 px-1 rounded-xl transition-all duration-200 relative',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.div
                    layoutId="nav-active"
                    className="absolute inset-0 bg-primary/10 rounded-xl"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                  />
                )}
                <Icon className="h-5 w-5 relative z-10" strokeWidth={isActive ? 2.5 : 1.8} />
                <span className="text-[10px] font-medium mt-0.5 relative z-10">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
