import { motion } from 'framer-motion'
import { BookmarkCheck, Loader2, Star } from 'lucide-react'
import type { POI } from './types'

interface Props {
  poi: POI
  rating: number
  notes: string
  saving: boolean
  onRatingChange: (n: number) => void
  onNotesChange: (s: string) => void
  onCancel: () => void
  onSave: () => void
}

export default function SavePlaceSheet({
  poi, rating, notes, saving,
  onRatingChange, onNotesChange, onCancel, onSave,
}: Props) {
  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[1010] bg-black/50"
        onClick={onCancel}
      />
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28 }}
        className="fixed bottom-0 left-0 right-0 z-[1011] bg-background rounded-t-3xl p-5 pb-8 shadow-2xl"
      >
        <div className="w-10 h-1 rounded-full bg-border mx-auto mb-4" />
        <h3 className="font-bold text-base mb-0.5">{poi.name}</h3>
        <p className="text-xs text-muted-foreground capitalize mb-4">{poi.type.replace(/_/g, ' ')}</p>

        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Rating</p>
        <div className="flex gap-2 mb-4">
          {[1, 2, 3, 4, 5].map(n => (
            <button
              key={n}
              onClick={() => onRatingChange(n)}
              aria-label={`Rate ${n} star${n === 1 ? '' : 's'}`}
              className="focus:outline-none"
            >
              <Star className={`h-8 w-8 transition-colors ${n <= rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'}`} />
            </button>
          ))}
        </div>

        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Notes (optional)</p>
        <textarea
          value={notes}
          onChange={e => onNotesChange(e.target.value)}
          placeholder="What did you think? Great food, must visit again..."
          rows={2}
          className="w-full px-4 py-3 rounded-xl bg-muted border border-border text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 mb-4"
        />

        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-xl bg-muted text-sm font-medium"
          >Cancel</button>
          <button
            onClick={onSave}
            disabled={saving}
            className="flex-1 py-3 rounded-xl bg-amber-500 text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <BookmarkCheck className="h-4 w-4" />}
            Save Place
          </button>
        </div>
      </motion.div>
    </>
  )
}
