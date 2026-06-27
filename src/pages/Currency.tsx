import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { DollarSign, RefreshCw, ArrowLeftRight, Loader2, Cloud, CloudOff } from 'lucide-react'
import { useTrip } from '@/contexts/TripContext'
import PageHeader from '@/components/common/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { getRate as sharedGetRate, guessLocalCurrency } from '@/utils/currency'
import { fetchRates } from '@/utils/fxApi'
import type { CurrencyRate } from '@/types'

const CURRENCIES = ['PHP', 'HKD', 'MOP', 'USD', 'EUR', 'SGD', 'JPY', 'CNY']

export default function Currency() {
  const { trip, updateTrip } = useTrip()
  const home = trip.settings.homeCurrency || 'PHP'
  const local = guessLocalCurrency(trip.tripInfo.destination, home)
  const [amount, setAmount] = useState('1000')
  const [fromCurrency, setFromCurrency] = useState(home)
  const [toCurrency, setToCurrency] = useState(local !== home ? local : 'HKD')
  const [fxLoading, setFxLoading] = useState(false)
  const [fxError, setFxError] = useState<string | null>(null)
  const [lastFx, setLastFx] = useState<number | null>(null)

  const rates = trip.currencyRates

  const rate = sharedGetRate(rates, fromCurrency, toCurrency)
  const converted = rate !== null ? parseFloat(amount || '0') * rate : null

  const swap = () => {
    setFromCurrency(toCurrency)
    setToCurrency(fromCurrency)
  }

  // Common conversions are pinned + augmented with the destination's likely
  // local currency (so a trip to JPY shows PHP↔JPY in the saved rates list).
  const commonConversions = (() => {
    const base = [
      { from: home, to: 'HKD' },
      { from: home, to: 'MOP' },
      { from: 'USD', to: home },
      { from: 'USD', to: 'HKD' },
    ]
    if (local !== home && !base.some(p => p.from === home && p.to === local)) {
      base.unshift({ from: home, to: local })
    }
    return base.filter((p, i, arr) => arr.findIndex(q => q.from === p.from && q.to === p.to) === i)
  })()

  const updateRate = (from: string, to: string, newRate: number) => {
    updateTrip(prev => {
      const existing = prev.currencyRates.findIndex(r => r.from === from && r.to === to)
      const today = new Date().toISOString().split('T')[0]
      if (existing >= 0) {
        const updated = [...prev.currencyRates]
        updated[existing] = { ...updated[existing], rate: newRate, updatedAt: today }
        return { ...prev, currencyRates: updated }
      }
      return {
        ...prev,
        currencyRates: [...prev.currencyRates, { from, to, rate: newRate, updatedAt: today }],
      }
    })
  }

  // Replace the currency rate list with a fresh batch in a single updateTrip
  // call (avoids debounce thrashing). Inserts any missing pairs.
  const applyFetchedRates = (incoming: Array<{ from: string; to: string; rate: number }>) => {
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
      commonConversions.forEach(p => { wanted.add(p.from); wanted.add(p.to) })
      // Also pull anything the user already has rates for.
      rates.forEach(r => { wanted.add(r.from); wanted.add(r.to) })
      // Build pairs: home <-> each known currency. UI's getRate handles
      // direct/inverse/two-hop, so this is enough to convert anywhere.
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

  // Auto-fetch on first mount when no rates exist for the common conversions.
  // Silent: no spinner, errors are swallowed (user can retry manually).
  const autoFetched = useRef(false)
  useEffect(() => {
    if (autoFetched.current) return
    autoFetched.current = true
    const missing = commonConversions.some(p => sharedGetRate(rates, p.from, p.to) === null)
    if (missing) refreshFromApi(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div>
      <PageHeader
        title="Currency"
        subtitle="Converter & rates"
        icon={DollarSign}
        iconColor="text-emerald-600"
      />

      <div className="px-4 space-y-4">
        {/* Converter */}
        <Card>
          <CardContent className="p-4">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Amount</Label>
                <Input
                  type="number"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="0"
                  className="text-xl font-bold h-14"
                />
              </div>

              <div className="flex items-center gap-2">
                <div className="flex-1 space-y-1.5">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">From</Label>
                  <Select value={fromCurrency} onValueChange={setFromCurrency}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <Button variant="outline" size="icon" className="mt-5 shrink-0" onClick={swap}>
                  <ArrowLeftRight className="h-4 w-4" />
                </Button>

                <div className="flex-1 space-y-1.5">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">To</Label>
                  <Select value={toCurrency} onValueChange={setToCurrency}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Result */}
              <div className="bg-primary/5 rounded-2xl p-4 text-center">
                <p className="text-sm text-muted-foreground mb-1">
                  {amount || '0'} {fromCurrency} =
                </p>
                {converted !== null ? (
                  <motion.p
                    key={`${amount}-${fromCurrency}-${toCurrency}`}
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-3xl font-bold text-primary"
                  >
                    {converted.toFixed(2)} <span className="text-xl">{toCurrency}</span>
                  </motion.p>
                ) : (
                  <p className="text-sm text-muted-foreground">No rate available — add rate below</p>
                )}
                {rate && (
                  <p className="text-xs text-muted-foreground mt-1">
                    1 {fromCurrency} = {rate.toFixed(4)} {toCurrency}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Saved Rates */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <RefreshCw className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-semibold">Saved Exchange Rates</p>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 ml-auto text-xs gap-1.5"
                onClick={() => refreshFromApi(false)}
                disabled={fxLoading}
              >
                {fxLoading
                  ? <><Loader2 className="h-3 w-3 animate-spin" /> Fetching…</>
                  : <><Cloud className="h-3 w-3" /> Update from web</>
                }
              </Button>
            </div>
            {(lastFx || fxError) && (
              <p className={`text-[10px] mb-2 flex items-center gap-1 ${fxError ? 'text-amber-600' : 'text-muted-foreground'}`}>
                {fxError ? <CloudOff className="h-3 w-3" /> : <Cloud className="h-3 w-3" />}
                {fxError ?? `Live rates updated ${new Date(lastFx!).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}`}
              </p>
            )}
            <div className="space-y-2">
              {commonConversions.map(({ from, to }) => {
                const r = sharedGetRate(rates, from, to)
                return (
                  <div key={`${from}-${to}`} className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/50">
                    <span className="text-sm font-semibold w-8">{from}</span>
                    <ArrowLeftRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="text-sm font-semibold w-8">{to}</span>
                    <div className="flex-1">
                      <Input
                        type="number"
                        step="0.0001"
                        value={r !== null ? r.toFixed(4) : ''}
                        onChange={e => {
                          const v = parseFloat(e.target.value)
                          if (!isNaN(v) && v > 0) updateRate(from, to, v)
                        }}
                        className="h-7 text-xs font-mono"
                        placeholder="0.0000"
                      />
                    </div>
                    <span className="text-xs text-muted-foreground w-6">{to}</span>
                  </div>
                )
              })}
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              💡 Tap “Update from web” to pull today’s rates from open.er-api.com, or tap a value to override manually. Rates are cached offline for your trip.
            </p>
          </CardContent>
        </Card>

        {/* Travel money tips */}
        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-semibold mb-3">Money Tips for HK & Macau</p>
            <div className="space-y-2">
              {[
                'Exchange HKD and MOP before leaving the Philippines for better rates',
                'HKD is widely accepted in Macau at roughly 1:1 rate',
                'MOP is NOT accepted back in Hong Kong',
                'USD can be exchanged at the airport with tour guide assistance',
                'Most malls and hotels accept credit cards',
                'Keep some HKD cash for street food and small purchases',
              ].map((tip, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                  <span className="text-primary mt-0.5">•</span>
                  <span>{tip}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
