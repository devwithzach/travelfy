import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, X } from 'lucide-react'
import TurnArrow from './TurnArrow'
import type { NavStep } from './types'

interface Props {
  steps: NavStep[]
  currentStepIdx: number
  distToNext: number | null
  showNextTurns: boolean
  onToggleNextTurns: () => void
  onEnd: () => void
}

function formatDistance(meters: number): string {
  return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${meters} m`
}

export default function NavigationBanner({
  steps,
  currentStepIdx,
  distToNext,
  showNextTurns,
  onToggleNextTurns,
  onEnd,
}: Props) {
  if (steps.length === 0) return null
  const current = steps[currentStepIdx]
  const next = steps[currentStepIdx + 1]

  const distanceLabel =
    distToNext !== null
      ? formatDistance(distToNext)
      : current?.distance
        ? formatDistance(current.distance)
        : '—'

  return (
    <motion.div
      initial={{ y: -120 }}
      animate={{ y: 0 }}
      exit={{ y: -120 }}
      transition={{ type: 'spring', damping: 28 }}
      className="absolute top-0 left-0 right-0 z-[1003]"
    >
      <div className="bg-[#1a1a2e] shadow-2xl">
        <div className="flex items-center gap-0 px-0">
          <div className="w-20 h-20 bg-primary flex items-center justify-center shrink-0">
            <TurnArrow modifier={current?.maneuverModifier || 'straight'} />
          </div>
          <div className="flex-1 px-4 py-3">
            <p className="text-white font-black text-4xl leading-none tracking-tight">
              {distanceLabel}
            </p>
            <p className="text-white/80 text-sm font-semibold mt-0.5 leading-tight">
              {current?.instruction}
            </p>
          </div>
          <button
            onClick={onEnd}
            aria-label="End navigation"
            className="w-16 h-20 bg-white/10 flex items-center justify-center shrink-0 border-l border-white/10"
          >
            <X className="h-5 w-5 text-white/70" />
          </button>
        </div>

        {next && (
          <button
            onClick={onToggleNextTurns}
            className="w-full flex items-center gap-3 px-4 py-2 border-t border-white/10 hover:bg-white/5"
          >
            <div className="w-6 h-6 rounded bg-white/20 flex items-center justify-center shrink-0">
              <TurnArrow modifier={next.maneuverModifier || 'straight'} />
            </div>
            <span className="flex-1 text-left text-white/60 text-xs truncate">
              Then: {next.instruction}
              {next.distance ? ` · ${next.distance}m` : ''}
            </span>
            <ChevronDown className={`h-4 w-4 text-white/40 transition-transform ${showNextTurns ? 'rotate-180' : ''}`} />
          </button>
        )}
      </div>

      <AnimatePresence>
        {showNextTurns && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-[#1a1a2e]/95 backdrop-blur-md overflow-hidden max-h-64 overflow-y-auto"
          >
            {steps.slice(currentStepIdx + 1).map((step, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-2.5 border-t border-white/10">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                  <TurnArrow modifier={step.maneuverModifier} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white/80 text-sm font-medium leading-tight">{step.instruction}</p>
                  {step.distance > 0 && (
                    <p className="text-white/40 text-xs mt-0.5">{step.distance}m</p>
                  )}
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
