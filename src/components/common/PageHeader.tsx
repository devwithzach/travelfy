import { motion } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/utils/cn'

interface PageHeaderProps {
  title: string
  subtitle?: string
  icon?: LucideIcon
  iconColor?: string
  action?: React.ReactNode
  className?: string
}

export default function PageHeader({
  title,
  subtitle,
  icon: Icon,
  iconColor = 'text-primary',
  action,
  className,
}: PageHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      // Top padding combines the iOS safe-area inset with a 3rem floor so the
      // title isn't tucked under the status bar on notched devices.
      className={cn('px-4 pb-4 pt-[max(3rem,env(safe-area-inset-top))]', className)}
    >
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
