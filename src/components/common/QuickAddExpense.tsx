import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Loader2 } from 'lucide-react'
import { useTrip } from '@/contexts/TripContext'
import type { Expense } from '@/types'
import { guessLocalCurrency } from '@/utils/currency'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const CATEGORIES = ['food', 'transport', 'shopping', 'hotel', 'activities', 'other'] as const
const CURRENCIES = ['PHP', 'HKD', 'MOP', 'USD', 'EUR', 'SGD', 'JPY', 'CNY', 'THB', 'KRW', 'TWD', 'GBP', 'AUD']

interface Props {
  open: boolean
  onClose: () => void
}

export default function QuickAddExpense({ open, onClose }: Props) {
  const { trip, updateTrip } = useTrip()
  const defaultCurrency = guessLocalCurrency(trip.tripInfo.destination, trip.settings.homeCurrency)

  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState(defaultCurrency)
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<Expense['category']>('food')
  const [saving, setSaving] = useState(false)

  // When the sheet opens fresh (no in-flight input), reset currency to the
  // current best guess for the active trip. Avoids stale state across trips.
  useEffect(() => {
    if (open && amount === '' && title === '') setCurrency(defaultCurrency)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaultCurrency])

  const reset = () => {
    setAmount('')
    setTitle('')
    setCategory('food')
    setCurrency(defaultCurrency)
  }

  const save = () => {
    const value = parseFloat(amount)
    if (!value || value <= 0) return
    setSaving(true)
    const expense: Expense = {
      id: crypto.randomUUID(),
      title: title.trim() || category.charAt(0).toUpperCase() + category.slice(1),
      amount: value,
      currency,
      category,
      date: new Date().toISOString().split('T')[0],
      notes: '',
    }
    updateTrip(prev => ({ ...prev, expenses: [expense, ...prev.expenses] }))
    setSaving(false)
    reset()
    onClose()
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[2000] bg-black/50"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28 }}
            className="fixed bottom-0 left-0 right-0 z-[2001] bg-background rounded-t-3xl p-5 pb-8 shadow-2xl max-w-lg mx-auto"
            role="dialog"
            aria-label="Quick add expense"
          >
            <div className="w-10 h-1 rounded-full bg-border mx-auto mb-4" />
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-base">Quick Add Expense</h3>
              <button onClick={onClose} aria-label="Close" className="p-1 rounded-lg hover:bg-muted">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>

            {/* Amount + Currency, big primary input */}
            <div className="flex gap-2 mb-3">
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Amount</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="0"
                  className="text-2xl font-bold h-14 mt-1.5"
                  autoFocus
                />
              </div>
              <div className="w-24">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Currency</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger className="h-14 mt-1.5 font-semibold"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Category pills */}
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Category</Label>
            <div className="flex gap-1.5 flex-wrap mt-1.5 mb-3">
              {CATEGORIES.map(c => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={
                    'px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors capitalize ' +
                    (c === category
                      ? 'bg-primary text-white border-primary'
                      : 'bg-background border-border text-muted-foreground hover:text-foreground')
                  }
                >{c}</button>
              ))}
            </div>

            {/* Optional title */}
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Note (optional)</Label>
            <Input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Dinner at Tim Ho Wan"
              className="mt-1.5 mb-4"
            />

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
              <Button
                className="flex-1 gap-2"
                onClick={save}
                disabled={saving || !amount || parseFloat(amount) <= 0}
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Save
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
