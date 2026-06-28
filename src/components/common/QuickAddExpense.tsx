import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Loader2, Camera, Trash2 } from 'lucide-react'
import { useTrip } from '@/contexts/TripContext'
import { useAuth } from '@/contexts/AuthContext'
import type { Expense } from '@/types'
import { guessLocalCurrency, convert } from '@/utils/currency'
import { uploadReceipt } from '@/utils/receiptUpload'
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
  const { user } = useAuth()
  const defaultCurrency = guessLocalCurrency(trip.tripInfo.destination, trip.settings.homeCurrency)

  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState(defaultCurrency)
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<Expense['category']>('food')
  const [receiptUrl, setReceiptUrl] = useState('')
  const [receiptUploading, setReceiptUploading] = useState(false)
  const [receiptError, setReceiptError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const receiptInputRef = useRef<HTMLInputElement>(null)

  const handleReceiptPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !user) return
    setReceiptError(null)
    setReceiptUploading(true)
    try {
      const { url } = await uploadReceipt(file, user.id)
      setReceiptUrl(url)
    } catch (err) {
      setReceiptError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setReceiptUploading(false)
    }
  }

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
    setReceiptUrl('')
    setReceiptError(null)
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
      receiptUrl: receiptUrl || undefined,
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
            <div className="flex gap-2 mb-1">
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
            {/* Live conversion hint while typing. Only shown when currency
                differs from home and we have a rate path. */}
            {(() => {
              const v = parseFloat(amount)
              if (!v || currency === trip.settings.homeCurrency) return <div className="h-5 mb-2" />
              const converted = convert(trip.currencyRates, v, currency, trip.settings.homeCurrency)
              return (
                <p className="h-5 mb-2 text-xs text-muted-foreground text-right tabular-nums">
                  {converted !== null
                    ? <>≈ <span className="font-semibold text-foreground">{trip.settings.homeCurrency} {converted.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span></>
                    : <span className="text-amber-600">no rate to {trip.settings.homeCurrency}</span>
                  }
                </p>
              )
            })()}

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
              className="mt-1.5 mb-3"
            />

            {/* Receipt photo (optional) */}
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Receipt (optional)</Label>
            <div className="mt-1.5 mb-4">
              {receiptUrl ? (
                <div className="relative inline-block">
                  <img
                    src={receiptUrl}
                    alt="Receipt"
                    className="h-24 rounded-xl border border-border object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setReceiptUrl('')}
                    aria-label="Remove receipt"
                    className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-destructive text-white flex items-center justify-center shadow"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => receiptInputRef.current?.click()}
                  disabled={receiptUploading}
                  className="w-full h-20 rounded-xl border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 flex items-center justify-center gap-2 text-sm text-muted-foreground transition-colors disabled:opacity-60"
                >
                  {receiptUploading
                    ? <><Loader2 className="h-4 w-4 animate-spin" /> Uploading…</>
                    : <><Camera className="h-4 w-4" /> Tap to attach receipt</>
                  }
                </button>
              )}
              <input
                ref={receiptInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleReceiptPick}
              />
              {receiptError && (
                <p className="text-xs text-destructive mt-1.5" role="alert">{receiptError}</p>
              )}
            </div>

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
