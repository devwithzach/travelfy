import { useState } from 'react'
import { Share2, Copy, Check, Download, FileText, Plane, Building2, Map, Phone, DollarSign, ListChecks } from 'lucide-react'
import PageHeader from '@/components/common/PageHeader'
import { useTrip } from '@/contexts/TripContext'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/utils/cn'
import { formatDate } from '@/utils/dateUtils'

function formatTime(t: string) {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`
}

const SECTIONS = [
  { id: 'overview',   label: 'Overview',   icon: FileText },
  { id: 'flights',    label: 'Flights',    icon: Plane },
  { id: 'hotels',     label: 'Hotels',     icon: Building2 },
  { id: 'itinerary',  label: 'Itinerary',  icon: Map },
  { id: 'expenses',   label: 'Expenses',   icon: DollarSign },
  { id: 'contacts',   label: 'Emergency',  icon: Phone },
  { id: 'checklist',  label: 'Checklist',  icon: ListChecks },
]

export default function TripExport() {
  const { trip } = useTrip()
  const [selected, setSelected] = useState<string[]>(['overview', 'flights', 'hotels', 'itinerary', 'contacts'])
  const [copied, setCopied] = useState(false)
  const [shared, setShared] = useState(false)

  const toggle = (id: string) =>
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  const buildText = () => {
    const lines: string[] = []
    const { tripInfo, flights, hotels, itinerary, expenses, emergencyContacts, checklist, settings } = trip

    lines.push(`✈️ TRIP SUMMARY`)
    lines.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━`)
    lines.push('')

    if (selected.includes('overview')) {
      lines.push(`📌 ${tripInfo.name || 'Untitled Trip'}`)
      lines.push(`📍 Destination: ${tripInfo.destination || '—'}`)
      if (tripInfo.startDate) lines.push(`📅 Dates: ${formatDate(tripInfo.startDate, { month: 'short', day: 'numeric', year: 'numeric' })} → ${formatDate(tripInfo.endDate, { month: 'short', day: 'numeric', year: 'numeric' })}`)
      if (tripInfo.description) lines.push(`📝 ${tripInfo.description}`)
      lines.push('')
    }

    if (selected.includes('flights') && flights.length > 0) {
      lines.push(`✈️ FLIGHTS (${flights.length})`)
      lines.push(`──────────────────────────`)
      flights.forEach(f => {
        lines.push(`${f.flightNumber} · ${f.airline}`)
        lines.push(`  ${f.fromCode || f.from} → ${f.toCode || f.to}`)
        if (f.departureDate) lines.push(`  ${formatDate(f.departureDate, { month: 'short', day: 'numeric' })} · Dep ${formatTime(f.departureTime)} → Arr ${formatTime(f.arrivalTime)}${f.arrivalDateOffset ? ' (' + f.arrivalDateOffset + ')' : ''}`)
        if (f.bookingReference) lines.push(`  Ref: ${f.bookingReference}`)
        if (f.seat) lines.push(`  Seat: ${f.seat}`)
        lines.push('')
      })
    }

    if (selected.includes('hotels') && hotels.length > 0) {
      lines.push(`🏨 HOTELS (${hotels.length})`)
      lines.push(`──────────────────────────`)
      hotels.forEach(h => {
        lines.push(`${h.name}`)
        if (h.address) lines.push(`  📍 ${h.address}`)
        if (h.checkIn) lines.push(`  Check-in: ${formatDate(h.checkIn, { month: 'short', day: 'numeric' })} → ${formatDate(h.checkOut, { month: 'short', day: 'numeric' })}`)
        if (h.bookingReference) lines.push(`  Conf#: ${h.bookingReference}`)
        if (h.phone) lines.push(`  📞 ${h.phone}`)
        lines.push('')
      })
    }

    if (selected.includes('itinerary') && itinerary.length > 0) {
      lines.push(`🗓️ ITINERARY (${itinerary.length} days)`)
      lines.push(`──────────────────────────`)
      itinerary.forEach(day => {
        lines.push(`Day ${day.dayNumber}${day.date ? ' · ' + formatDate(day.date, { month: 'short', day: 'numeric' }) : ''}${day.title ? ' — ' + day.title : ''}`)
        day.activities.forEach(a => {
          lines.push(`  ${a.time ? formatTime(a.time) + ' ' : ''}• ${a.title}${a.location ? ' @ ' + a.location : ''}`)
        })
        lines.push('')
      })
    }

    if (selected.includes('expenses') && expenses.length > 0) {
      const total = expenses.reduce((sum, e) => sum + e.amount, 0)
      lines.push(`💰 EXPENSES`)
      lines.push(`──────────────────────────`)
      lines.push(`Total: ${settings.homeCurrency} ${total.toLocaleString()}`)
      const byCat = expenses.reduce((acc, e) => {
        acc[e.category] = (acc[e.category] || 0) + e.amount
        return acc
      }, {} as Record<string, number>)
      Object.entries(byCat).forEach(([cat, amt]) => {
        lines.push(`  ${cat}: ${settings.homeCurrency} ${amt.toLocaleString()}`)
      })
      lines.push('')
    }

    if (selected.includes('contacts') && emergencyContacts.length > 0) {
      lines.push(`🚨 EMERGENCY CONTACTS`)
      lines.push(`──────────────────────────`)
      emergencyContacts.forEach(c => {
        lines.push(`${c.name} (${c.role})`)
        lines.push(`  📞 ${c.phone}`)
        if (c.address) lines.push(`  📍 ${c.address}`)
        lines.push('')
      })
    }

    if (selected.includes('checklist') && checklist.length > 0) {
      const packed = checklist.filter(c => c.checked).length
      lines.push(`📦 PACKING CHECKLIST (${packed}/${checklist.length} packed)`)
      lines.push(`──────────────────────────`)
      checklist.forEach(c => {
        lines.push(`  ${c.checked ? '✅' : '⬜'} ${c.label}`)
      })
      lines.push('')
    }

    lines.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━`)
    lines.push(`Generated by Travelfy`)

    return lines.join('\n')
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(buildText())
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  const handleShare = async () => {
    const text = buildText()
    if (navigator.share) {
      try {
        await navigator.share({ title: trip.tripInfo.name || 'Trip Summary', text })
        setShared(true)
        setTimeout(() => setShared(false), 2500)
      } catch { /* user cancelled */ }
    } else {
      handleCopy()
    }
  }

  const handleDownload = () => {
    const text = buildText()
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${(trip.tripInfo.name || 'trip').replace(/\s+/g, '_')}_summary.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <PageHeader
        title="Export Trip"
        subtitle="Share your itinerary"
        icon={Share2}
        iconColor="text-indigo-600"
      />

      {/* Section picker */}
      <div className="px-4 mb-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Include sections</p>
        <div className="grid grid-cols-2 gap-2">
          {SECTIONS.map(({ id, label, icon: Icon }) => {
            const active = selected.includes(id)
            return (
              <button
                key={id}
                onClick={() => toggle(id)}
                className={cn(
                  'flex items-center gap-2 px-3 py-2.5 rounded-2xl border text-sm font-semibold transition-all active:scale-95',
                  active
                    ? 'bg-indigo-500 border-indigo-500 text-white'
                    : 'bg-card border-border text-muted-foreground'
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Preview */}
      <div className="px-4 mb-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Preview</p>
            <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono leading-relaxed max-h-64 overflow-y-auto">
              {buildText()}
            </pre>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="px-4 pb-8 space-y-3">
        <button
          onClick={handleShare}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-semibold text-sm shadow-lg shadow-indigo-500/30 active:scale-[0.98] transition-all"
        >
          {shared ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
          {shared ? 'Shared!' : 'Share Trip Summary'}
        </button>
        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" onClick={handleCopy} className="h-11 gap-2">
            {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Copied!' : 'Copy Text'}
          </Button>
          <Button variant="outline" onClick={handleDownload} className="h-11 gap-2">
            <Download className="h-4 w-4" />
            Download .txt
          </Button>
        </div>
      </div>
    </div>
  )
}
