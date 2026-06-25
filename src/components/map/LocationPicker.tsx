import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, MapPin } from 'lucide-react'
import type { Hotel } from '@/types'
import type { Location } from './types'

interface Props {
  selected: Location
  locations: Location[]
  hotels: Hotel[]
  open: boolean
  onToggle: () => void
  onSelect: (loc: Location) => void
  radius: number
  radiusOptions: number[]
  onRadiusChange: (r: number) => void
}

export default function LocationPicker({
  selected, locations, hotels, open, onToggle, onSelect,
  radius, radiusOptions, onRadiusChange,
}: Props) {
  return (
    <>
      <div className="absolute top-0 left-0 right-0 z-[1000] p-3 flex gap-2">
        <button
          onClick={onToggle}
          className="flex-1 flex items-center gap-2 bg-background/95 backdrop-blur-md border border-border rounded-xl px-3 py-2.5 shadow-lg"
        >
          <MapPin className="h-4 w-4 text-primary shrink-0" />
          <div className="flex-1 text-left min-w-0">
            <p className="text-xs text-muted-foreground leading-none">Exploring near</p>
            <p className="text-sm font-semibold truncate">{selected.name}</p>
          </div>
          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>

        <select
          value={radius}
          onChange={e => onRadiusChange(Number(e.target.value))}
          aria-label="Search radius"
          className="bg-background/95 backdrop-blur-md border border-border rounded-xl px-2 py-2.5 text-sm font-medium shadow-lg text-foreground"
        >
          {radiusOptions.map(r => (
            <option key={r} value={r}>{r}m</option>
          ))}
        </select>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="absolute top-[60px] left-3 right-3 z-[1001] bg-background border border-border rounded-2xl shadow-xl overflow-hidden"
          >
            {locations.map(loc => {
              const isHotel = hotels.some(h => h.name === loc.name)
              return (
                <button
                  key={loc.name}
                  onClick={() => onSelect(loc)}
                  className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-accent transition-colors text-left ${selected.name === loc.name ? 'bg-primary/10' : ''}`}
                >
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm ${isHotel ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-muted'}`}>
                    {isHotel ? '🏨' : '📍'}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{loc.name}</p>
                    <p className="text-xs text-muted-foreground">{loc.country}</p>
                  </div>
                  {selected.name === loc.name && <div className="ml-auto w-2 h-2 rounded-full bg-primary" />}
                </button>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
