import { useState } from 'react'
import { motion } from 'framer-motion'
import { DollarSign, RefreshCw, ArrowLeftRight } from 'lucide-react'
import { useTrip } from '@/contexts/TripContext'
import PageHeader from '@/components/common/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

const CURRENCIES = ['PHP', 'HKD', 'MOP', 'USD', 'EUR', 'SGD', 'JPY', 'CNY']

export default function Currency() {
  const { trip, updateTrip } = useTrip()
  const [amount, setAmount] = useState('1000')
  const [fromCurrency, setFromCurrency] = useState(trip.settings.homeCurrency || 'PHP')
  const [toCurrency, setToCurrency] = useState('HKD')

  const rates = trip.currencyRates

  const getRate = (from: string, to: string): number | null => {
    if (from === to) return 1
    const direct = rates.find(r => r.from === from && r.to === to)
    if (direct) return direct.rate
    const reverse = rates.find(r => r.from === to && r.to === from)
    if (reverse) return 1 / reverse.rate
    return null
  }

  const rate = getRate(fromCurrency, toCurrency)
  const converted = rate !== null ? parseFloat(amount || '0') * rate : null

  const swap = () => {
    setFromCurrency(toCurrency)
    setToCurrency(fromCurrency)
  }

  const updateRate = (from: string, to: string, newRate: number) => {
    updateTrip(prev => {
      const existing = prev.currencyRates.findIndex(r => r.from === from && r.to === to)
      if (existing >= 0) {
        const updated = [...prev.currencyRates]
        updated[existing] = { ...updated[existing], rate: newRate, updatedAt: new Date().toISOString().split('T')[0] }
        return { ...prev, currencyRates: updated }
      }
      return {
        ...prev,
        currencyRates: [...prev.currencyRates, { from, to, rate: newRate, updatedAt: new Date().toISOString().split('T')[0] }],
      }
    })
  }

  const commonConversions = [
    { from: 'PHP', to: 'HKD' },
    { from: 'PHP', to: 'MOP' },
    { from: 'HKD', to: 'PHP' },
    { from: 'USD', to: 'PHP' },
    { from: 'USD', to: 'HKD' },
  ]

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
              <span className="text-xs text-muted-foreground ml-auto">Tap rate to edit</span>
            </div>
            <div className="space-y-2">
              {commonConversions.map(({ from, to }) => {
                const r = getRate(from, to)
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
              💡 Rates are stored offline. Update manually based on current exchange rates.
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
