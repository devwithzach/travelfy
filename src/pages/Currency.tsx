import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { DollarSign, RefreshCw, ArrowUpDown, Loader2, Cloud, CloudOff, ChevronDown, X } from 'lucide-react'
import { useTrip } from '@/contexts/TripContext'
import { getRate as sharedGetRate, guessLocalCurrency } from '@/utils/currency'
import { fetchRates } from '@/utils/fxApi'
import type { CurrencyRate } from '@/types'
import { cn } from '@/utils/cn'

// Full list of common world currencies
const ALL_CURRENCIES: Array<{ code: string; name: string }> = [
  { code: 'USD', name: 'US Dollar' },
  { code: 'EUR', name: 'Euro' },
  { code: 'GBP', name: 'British Pound' },
  { code: 'JPY', name: 'Japanese Yen' },
  { code: 'CNY', name: 'Chinese Yuan' },
  { code: 'AUD', name: 'Australian Dollar' },
  { code: 'CAD', name: 'Canadian Dollar' },
  { code: 'CHF', name: 'Swiss Franc' },
  { code: 'HKD', name: 'Hong Kong Dollar' },
  { code: 'SGD', name: 'Singapore Dollar' },
  { code: 'PHP', name: 'Philippine Peso' },
  { code: 'MOP', name: 'Macanese Pataca' },
  { code: 'KRW', name: 'South Korean Won' },
  { code: 'THB', name: 'Thai Baht' },
  { code: 'MYR', name: 'Malaysian Ringgit' },
  { code: 'IDR', name: 'Indonesian Rupiah' },
  { code: 'VND', name: 'Vietnamese Dong' },
  { code: 'TWD', name: 'Taiwan Dollar' },
  { code: 'INR', name: 'Indian Rupee' },
  { code: 'BDT', name: 'Bangladeshi Taka' },
  { code: 'LKR', name: 'Sri Lankan Rupee' },
  { code: 'NPR', name: 'Nepalese Rupee' },
  { code: 'PKR', name: 'Pakistani Rupee' },
  { code: 'NZD', name: 'New Zealand Dollar' },
  { code: 'AED', name: 'UAE Dirham' },
  { code: 'SAR', name: 'Saudi Riyal' },
  { code: 'QAR', name: 'Qatari Riyal' },
  { code: 'KWD', name: 'Kuwaiti Dinar' },
  { code: 'BHD', name: 'Bahraini Dinar' },
  { code: 'OMR', name: 'Omani Rial' },
  { code: 'JOD', name: 'Jordanian Dinar' },
  { code: 'EGP', name: 'Egyptian Pound' },
  { code: 'TRY', name: 'Turkish Lira' },
  { code: 'ZAR', name: 'South African Rand' },
  { code: 'NGN', name: 'Nigerian Naira' },
  { code: 'KES', name: 'Kenyan Shilling' },
  { code: 'GHS', name: 'Ghanaian Cedi' },
  { code: 'BRL', name: 'Brazilian Real' },
  { code: 'MXN', name: 'Mexican Peso' },
  { code: 'ARS', name: 'Argentine Peso' },
  { code: 'CLP', name: 'Chilean Peso' },
  { code: 'COP', name: 'Colombian Peso' },
  { code: 'PEN', name: 'Peruvian Sol' },
  { code: 'RUB', name: 'Russian Ruble' },
  { code: 'PLN', name: 'Polish Zloty' },
  { code: 'SEK', name: 'Swedish Krona' },
  { code: 'NOK', name: 'Norwegian Krone' },
  { code: 'DKK', name: 'Danish Krone' },
  { code: 'CZK', name: 'Czech Koruna' },
  { code: 'HUF', name: 'Hungarian Forint' },
  { code: 'ILS', name: 'Israeli Shekel' },
]

// Dynamic tips per destination keyword
const DESTINATION_TIPS: Array<{ match: RegExp; tips: string[] }> = [
  {
    match: /hong\s*kong|macau|macao/i,
    tips: [
      'HKD is widely accepted in Macau at roughly 1:1 rate',
      'MOP is NOT accepted back in Hong Kong',
      'Exchange at banks or licensed money changers for better rates',
      'Octopus card (HKD) works on MTR, buses, and many shops',
      'Most malls and hotels accept Visa/Mastercard',
      'Keep HKD cash for street food and small purchases',
    ],
  },
  {
    match: /japan|tokyo|osaka|kyoto/i,
    tips: [
      'Japan is still largely a cash society — carry enough JPY',
      'IC cards (Suica/Pasmo) work on trains and convenience stores',
      '7-Eleven ATMs in Japan reliably accept foreign cards',
      'Dynamic Currency Conversion at ATMs often gives worse rates — choose JPY',
      'Avoid airport money changers — rates are poor',
    ],
  },
  {
    match: /korea|seoul|busan/i,
    tips: [
      'T-money card works on buses and subways across Korea',
      'Withdraw KRW at airport arrival ATMs for decent rates',
      'Many markets and taxis are cash-only',
      'Credit cards are widely accepted in cities',
    ],
  },
  {
    match: /thailand|bangkok|phuket|chiang\s*mai/i,
    tips: [
      'Superrich and Vasu exchange booths give the best THB rates in Bangkok',
      'Airport exchange counters have significantly worse rates',
      'ATMs charge 220 THB fee per withdrawal — withdraw larger amounts',
      'Tipping is not mandatory but appreciated in tourist areas',
    ],
  },
  {
    match: /singapore/i,
    tips: [
      'Mustafa Centre and Arcade money changers offer competitive SGD rates',
      'EZ-Link card works on MRT and buses',
      'Credit cards are accepted almost everywhere in Singapore',
      'Hawker centres are cash-only — carry small SGD notes',
    ],
  },
  {
    match: /europe|france|paris|germany|italy|spain/i,
    tips: [
      'Withdraw EUR from local ATMs for better rates than airport exchange',
      'Visa and Mastercard accepted almost universally in Europe',
      'Some small restaurants and markets are cash-only',
      'Notify your bank before travel to avoid card blocks',
    ],
  },
  {
    match: /usa|united\s*states|new\s*york/i,
    tips: [
      'Credit cards are accepted almost everywhere in the US',
      'Tipping 18–20% is standard at restaurants',
      'Most ATMs charge $3–5 foreign transaction fees',
      'Carry small USD bills for taxis and tips',
    ],
  },
  {
    match: /bali|indonesia|jakarta/i,
    tips: [
      'Use Central Kuta or Seminyak money changers for best IDR rates',
      'Beware of "too good" exchange rates — always count your notes',
      'Negotiate prices at markets before buying',
      'Credit cards accepted at larger tourist establishments',
    ],
  },
  {
    match: /malaysia|kuala\s*lumpur/i,
    tips: [
      'KLCC and Suria mall money changers offer good MYR rates',
      "Touch 'n Go card is useful for tolls and transit",
      'Cash is king at local markets and hawker stalls',
    ],
  },
]

function getDestinationTips(destination: string): string[] {
  const match = DESTINATION_TIPS.find(d => d.match.test(destination))
  if (match) return match.tips
  return [
    'Withdraw local currency from ATMs at your destination for better rates',
    'Notify your bank before international travel to avoid card blocks',
    'Keep a mix of cash and cards for flexibility',
    'Avoid airport exchange counters — rates are typically 10–15% worse',
    'Credit cards with no foreign transaction fees save money abroad',
  ]
}

// Searchable currency picker bottom sheet
function CurrencyPickerSheet({
  value,
  label,
  onSelect,
  onClose,
}: {
  value: string
  label: string
  onSelect: (code: string) => void
  onClose: () => void
}) {
  const [query, setQuery] = useState('')
  const filtered = query.length > 0
    ? ALL_CURRENCIES.filter(c =>
        c.code.toLowerCase().includes(query.toLowerCase()) ||
        c.name.toLowerCase().includes(query.toLowerCase())
      )
    : ALL_CURRENCIES

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="fixed bottom-0 left-0 right-0 z-[51] bg-background rounded-t-3xl shadow-2xl max-h-[85vh] flex flex-col"
      >
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>
        <div className="flex items-center justify-between px-5 py-3 shrink-0">
          <h2 className="text-base font-bold">{label}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
            <X className="h-4 w-4" />
          </button>
        </div>
        {/* Search */}
        <div className="px-5 pb-3 shrink-0">
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search currency…"
            autoFocus
            className="w-full px-4 py-3 rounded-xl bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        {/* List */}
        <div className="overflow-y-auto flex-1 px-5 pb-8">
          <div className="rounded-2xl bg-card border border-border overflow-hidden divide-y divide-border">
            {filtered.map(c => (
              <button
                key={c.code}
                onClick={() => { onSelect(c.code); onClose() }}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-accent transition-colors',
                  value === c.code && 'bg-primary/8'
                )}
              >
                <span className="font-mono font-bold text-sm w-10 shrink-0 text-primary">{c.code}</span>
                <span className="text-sm text-muted-foreground">{c.name}</span>
                {value === c.code && <span className="ml-auto text-primary text-xs font-bold">✓</span>}
              </button>
            ))}
          </div>
        </div>
      </motion.div>
    </>
  )
}

export default function Currency() {
  const { trip, updateTrip } = useTrip()
  const home = trip.settings.homeCurrency || 'PHP'
  const local = guessLocalCurrency(trip.tripInfo.destination, home)

  const [amount, setAmount] = useState('1000')
  const [fromCurrency, setFromCurrency] = useState(home)
  const [toCurrency, setToCurrency] = useState(local !== home ? local : 'USD')
  const [fxLoading, setFxLoading] = useState(false)
  const [fxError, setFxError] = useState<string | null>(null)
  const [lastFx, setLastFx] = useState<number | null>(null)
  const [pickerFor, setPickerFor] = useState<'from' | 'to' | null>(null)

  const rates = trip.currencyRates
  const rate = sharedGetRate(rates, fromCurrency, toCurrency)
  const converted = rate !== null ? parseFloat(amount || '0') * rate : null

  const swap = () => { setFromCurrency(toCurrency); setToCurrency(fromCurrency) }

  // Dynamic pinned pairs: home ↔ local, home ↔ USD, USD ↔ local, plus any
  // existing saved pairs so nothing gets removed when rates refresh.
  const pinnedPairs = (() => {
    const base: Array<{ from: string; to: string }> = []
    if (local !== home) base.push({ from: home, to: local })
    if (home !== 'USD' && local !== 'USD') base.push({ from: home, to: 'USD' })
    if (local !== 'USD') base.push({ from: 'USD', to: local })
    if (home !== 'EUR' && local !== 'EUR') base.push({ from: home, to: 'EUR' })
    // Add existing saved pairs not already in list
    rates.forEach(r => {
      if (!base.some(p => p.from === r.from && p.to === r.to)) {
        base.push({ from: r.from, to: r.to })
      }
    })
    return base.slice(0, 8)
  })()

  const updateRate = (from: string, to: string, newRate: number) => {
    updateTrip(prev => {
      const idx = prev.currencyRates.findIndex(r => r.from === from && r.to === to)
      const today = new Date().toISOString().split('T')[0]
      if (idx >= 0) {
        const updated = [...prev.currencyRates]
        updated[idx] = { ...updated[idx], rate: newRate, updatedAt: today }
        return { ...prev, currencyRates: updated }
      }
      return { ...prev, currencyRates: [...prev.currencyRates, { from, to, rate: newRate, updatedAt: today }] }
    })
  }

  const applyFetchedRates = (incoming: CurrencyRate[]) => {
    const today = new Date().toISOString().split('T')[0]
    updateTrip(prev => {
      const byKey = new Map(prev.currencyRates.map(r => [`${r.from}->${r.to}`, r]))
      for (const r of incoming) {
        byKey.set(`${r.from}->${r.to}`, { from: r.from, to: r.to, rate: r.rate, updatedAt: today })
      }
      return { ...prev, currencyRates: [...byKey.values()] }
    })
  }

  const refreshFromApi = async (silent = false) => {
    if (!silent) setFxLoading(true)
    setFxError(null)
    try {
      const { rates: apiRates, sourceTs } = await fetchRates(home, { force: !silent })
      const wanted = new Set<string>()
      pinnedPairs.forEach(p => { wanted.add(p.from); wanted.add(p.to) })
      rates.forEach(r => { wanted.add(r.from); wanted.add(r.to) })
      wanted.add(fromCurrency); wanted.add(toCurrency)
      const incoming: CurrencyRate[] = []
      for (const ccy of wanted) {
        if (ccy === home) continue
        const r = apiRates[ccy]
        if (typeof r === 'number' && r > 0) {
          incoming.push({ from: home, to: ccy, rate: r, updatedAt: '' })
        }
      }
      if (incoming.length === 0) {
        setFxError(`No live rates available for ${home}.`)
      } else {
        applyFetchedRates(incoming)
        setLastFx(sourceTs)
      }
    } catch (err) {
      setFxError(err instanceof Error ? err.message : 'Could not reach FX provider')
    } finally {
      if (!silent) setFxLoading(false)
    }
  }

  const autoFetched = useRef(false)
  useEffect(() => {
    if (autoFetched.current) return
    autoFetched.current = true
    const missing = pinnedPairs.some(p => sharedGetRate(rates, p.from, p.to) === null)
    if (missing) refreshFromApi(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const tips = getDestinationTips(trip.tripInfo.destination)
  const fromName = ALL_CURRENCIES.find(c => c.code === fromCurrency)?.name ?? fromCurrency
  const toName = ALL_CURRENCIES.find(c => c.code === toCurrency)?.name ?? toCurrency

  return (
    <div className="pb-6">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 flex items-center justify-center shrink-0">
            <DollarSign className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-lg font-bold leading-tight">Currency</h1>
            <p className="text-xs text-muted-foreground leading-none mt-0.5">Converter & live rates</p>
          </div>
        </div>
        <button
          onClick={() => refreshFromApi(false)}
          disabled={fxLoading}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-muted border border-border text-xs font-semibold disabled:opacity-50 active:scale-95 transition-all"
        >
          {fxLoading
            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
            : <RefreshCw className="h-3.5 w-3.5" />
          }
          {fxLoading ? 'Updating…' : 'Update rates'}
        </button>
      </div>

      <div className="px-4 space-y-4">
        {/* FX status */}
        {(lastFx || fxError) && (
          <div className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-xl text-xs',
            fxError ? 'bg-amber-500/10 text-amber-600' : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
          )}>
            {fxError ? <CloudOff className="h-3.5 w-3.5 shrink-0" /> : <Cloud className="h-3.5 w-3.5 shrink-0" />}
            {fxError ?? `Rates updated ${new Date(lastFx!).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}`}
          </div>
        )}

        {/* ── Converter ── */}
        <div className="rounded-2xl bg-card border border-border overflow-hidden">
          {/* Amount input */}
          <div className="px-4 pt-4 pb-3">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Amount</p>
            <input
              type="number"
              inputMode="decimal"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0"
              className="w-full text-4xl font-bold bg-transparent border-none outline-none text-foreground tabular-nums"
            />
          </div>

          {/* From / Swap / To */}
          <div className="flex items-stretch border-t border-border">
            {/* From */}
            <button
              onClick={() => setPickerFor('from')}
              className="flex-1 flex flex-col items-start gap-0.5 px-4 py-3 hover:bg-accent transition-colors text-left"
            >
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">From</span>
              <span className="text-2xl font-bold text-primary">{fromCurrency}</span>
              <span className="text-xs text-muted-foreground truncate max-w-[120px]">{fromName}</span>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
            </button>

            {/* Swap */}
            <div className="flex items-center px-2 border-x border-border">
              <button
                onClick={swap}
                className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary hover:bg-primary/20 active:scale-95 transition-all"
              >
                <ArrowUpDown className="h-4 w-4" />
              </button>
            </div>

            {/* To */}
            <button
              onClick={() => setPickerFor('to')}
              className="flex-1 flex flex-col items-start gap-0.5 px-4 py-3 hover:bg-accent transition-colors text-left"
            >
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">To</span>
              <span className="text-2xl font-bold text-emerald-600">{toCurrency}</span>
              <span className="text-xs text-muted-foreground truncate max-w-[120px]">{toName}</span>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
            </button>
          </div>

          {/* Result */}
          <div className="border-t border-border px-4 py-4 bg-primary/5">
            {converted !== null ? (
              <motion.div
                key={`${amount}-${fromCurrency}-${toCurrency}`}
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
              >
                <p className="text-xs text-muted-foreground mb-1">
                  {amount || '0'} {fromCurrency} =
                </p>
                <p className="text-4xl font-bold text-primary tabular-nums">
                  {Number(converted).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  <span className="text-xl ml-2 text-muted-foreground font-semibold">{toCurrency}</span>
                </p>
                <p className="text-xs text-muted-foreground mt-2 tabular-nums">
                  1 {fromCurrency} = {rate!.toFixed(4)} {toCurrency}
                  &nbsp;·&nbsp;
                  1 {toCurrency} = {(1 / rate!).toFixed(4)} {fromCurrency}
                </p>
              </motion.div>
            ) : (
              <div className="text-center py-2">
                <p className="text-sm text-muted-foreground">No rate found — tap "Update rates" above</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Saved Rates ── */}
        <div>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2 px-1">Saved Exchange Rates</p>
          <div className="rounded-2xl bg-card border border-border overflow-hidden divide-y divide-border">
            {pinnedPairs.map(({ from, to }) => {
              const r = sharedGetRate(rates, from, to)
              const invR = r !== null ? 1 / r : null
              return (
                <div key={`${from}-${to}`} className="px-4 py-3">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="font-mono font-bold text-sm text-primary">{from}</span>
                    <span className="text-muted-foreground text-xs">→</span>
                    <span className="font-mono font-bold text-sm">{to}</span>
                    {r !== null && (
                      <span className="ml-auto text-xs text-muted-foreground tabular-nums">
                        1 {to} = {invR!.toFixed(4)} {from}
                      </span>
                    )}
                  </div>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.0001"
                    value={r !== null ? r.toFixed(4) : ''}
                    onChange={e => {
                      const v = parseFloat(e.target.value)
                      if (!isNaN(v) && v > 0) updateRate(from, to, v)
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-muted border border-border text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30 tabular-nums"
                    placeholder="Enter rate…"
                  />
                </div>
              )
            })}
          </div>
          <p className="text-xs text-muted-foreground mt-2 px-1">
            Tap "Update rates" to pull today's live rates, or edit any field manually.
          </p>
        </div>

        {/* ── Money Tips ── */}
        <div>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2 px-1">
            Money Tips{trip.tripInfo.destination ? ` · ${trip.tripInfo.destination}` : ''}
          </p>
          <div className="rounded-2xl bg-card border border-border overflow-hidden divide-y divide-border">
            {tips.map((tip, i) => (
              <div key={i} className="flex items-start gap-3 px-4 py-3">
                <span className="text-primary font-bold text-sm mt-0.5 shrink-0">💡</span>
                <p className="text-sm text-muted-foreground leading-relaxed">{tip}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Currency Picker Sheet */}
      <AnimatePresence>
        {pickerFor && (
          <CurrencyPickerSheet
            value={pickerFor === 'from' ? fromCurrency : toCurrency}
            label={pickerFor === 'from' ? 'From Currency' : 'To Currency'}
            onSelect={code => pickerFor === 'from' ? setFromCurrency(code) : setToCurrency(code)}
            onClose={() => setPickerFor(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
