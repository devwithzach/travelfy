import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Plane, Map, DollarSign, Package, ChevronRight, X, Sparkles } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { cn } from '@/utils/cn'

const STEPS = [
  {
    icon: Plane,
    color: 'bg-blue-500',
    title: 'Track every trip detail',
    body: 'Add flights, hotels, ferries, buses — all in one place. Never lose a booking reference again.',
  },
  {
    icon: Map,
    color: 'bg-emerald-500',
    title: 'Day-by-day itinerary',
    body: 'Plan your days with activities, times, and locations. The app tells you what\'s happening right now.',
  },
  {
    icon: DollarSign,
    color: 'bg-rose-500',
    title: 'Multi-currency expenses',
    body: 'Log expenses in any currency. Live FX rates convert everything to your home currency automatically.',
  },
  {
    icon: Package,
    color: 'bg-violet-500',
    title: 'Book curated tour packages',
    body: 'Browse packages from local operators. One tap books and auto-builds your itinerary.',
  },
]

const STORAGE_KEY = 'travelfy-onboarded-v1'

export default function OnboardingWelcome() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (!user) return
    const done = localStorage.getItem(STORAGE_KEY)
    if (!done) setOpen(true)
  }, [user])

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, '1')
    setOpen(false)
  }

  const next = () => {
    if (step < STEPS.length - 1) setStep(s => s + 1)
    else dismiss()
  }

  const current = STEPS[step]
  const Icon = current.icon

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[3000] bg-black/50 backdrop-blur-sm"
            onClick={dismiss}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-[3001] bg-background rounded-t-3xl pb-safe shadow-2xl"
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 rounded-full bg-border" />
            </div>

            {/* Dismiss */}
            <button
              onClick={dismiss}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-muted flex items-center justify-center"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>

            <div className="px-6 pb-8 pt-2">
              {/* Welcome header — only on first step */}
              {step === 0 && (
                <div className="flex items-center gap-2 mb-5">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  <p className="text-xs font-semibold text-amber-600 uppercase tracking-widest">Welcome to Travelfy</p>
                </div>
              )}

              {/* Step content */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className={cn('w-14 h-14 rounded-2xl flex items-center justify-center mb-4 shadow-md', current.color)}>
                    <Icon className="h-7 w-7 text-white" />
                  </div>
                  <h2 className="text-xl font-bold mb-2">{current.title}</h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">{current.body}</p>
                </motion.div>
              </AnimatePresence>

              {/* Step dots */}
              <div className="flex items-center gap-1.5 mt-6 mb-5">
                {STEPS.map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      'h-1.5 rounded-full transition-all duration-300',
                      i === step ? 'w-6 bg-primary' : 'w-1.5 bg-border'
                    )}
                  />
                ))}
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                {step === STEPS.length - 1 ? (
                  <>
                    <Button variant="outline" className="flex-1 h-11" onClick={() => { dismiss(); navigate('/tours') }}>
                      Browse Tours
                    </Button>
                    <Button className="flex-1 h-11 gap-1.5" onClick={() => { dismiss(); navigate('/trips') }}>
                      <Plane className="h-4 w-4" />
                      Create Trip
                    </Button>
                  </>
                ) : (
                  <button
                    onClick={next}
                    className="w-full h-11 rounded-2xl bg-primary text-white font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
