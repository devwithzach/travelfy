import { useState, useEffect } from 'react'
import { Wifi, Signal, ChevronDown, ChevronUp, Copy, Check, Pencil, Save } from 'lucide-react'
import PageHeader from '@/components/common/PageHeader'
import { useTrip } from '@/contexts/TripContext'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/utils/cn'

type Network = 'globe' | 'smart' | 'dito' | 'tnt' | 'gomo' | 'other'

interface SimInfo {
  network: Network
  phoneNumber: string
  loadAmount: string
  loadExpiry: string
  notes: string
}

const NETWORKS: { id: Network; label: string; color: string; bg: string; logo: string }[] = [
  { id: 'globe',  label: 'Globe',  color: '#1d4ed8', bg: 'bg-blue-100 dark:bg-blue-900/30',   logo: '🔵' },
  { id: 'smart',  label: 'Smart',  color: '#15803d', bg: 'bg-green-100 dark:bg-green-900/30', logo: '🟢' },
  { id: 'dito',   label: 'DITO',   color: '#b45309', bg: 'bg-amber-100 dark:bg-amber-900/30', logo: '🟡' },
  { id: 'tnt',    label: 'TNT',    color: '#dc2626', bg: 'bg-red-100 dark:bg-red-900/30',     logo: '🔴' },
  { id: 'gomo',   label: 'GOMO',   color: '#7c3aed', bg: 'bg-violet-100 dark:bg-violet-900/30', logo: '🟣' },
  { id: 'other',  label: 'Other',  color: '#6b7280', bg: 'bg-gray-100 dark:bg-gray-800',      logo: '⚪' },
]

const PROMOS: Record<string, { name: string; price: string; data: string; validity: string; note: string }[]> = {
  globe: [
    { name: 'GoSURF50',    price: '₱50',  data: '1GB',   validity: '3 days',  note: 'All-day browsing' },
    { name: 'GoSURF99',    price: '₱99',  data: '2.5GB', validity: '7 days',  note: '+ free texts' },
    { name: 'GoSURF299',   price: '₱299', data: '8GB',   validity: '30 days', note: 'Great for long trips' },
    { name: 'GoSAKTO',     price: 'Varies', data: 'Custom', validity: 'Custom', note: 'Build your own promo' },
    { name: 'Go+',         price: '₱149', data: '5GB',   validity: '7 days',  note: 'Unli calls to Globe/TM' },
  ],
  smart: [
    { name: 'GigaSurf50',  price: '₱50',  data: '1GB',   validity: '3 days',  note: '+ 1GB for vid streaming' },
    { name: 'GigaSurf99',  price: '₱99',  data: '2GB',   validity: '7 days',  note: 'Unli texts to all networks' },
    { name: 'SurfMax',     price: '₱35',  data: '200MB', validity: '1 day',   note: 'Budget daily option' },
    { name: 'GigaLife',    price: '₱299', data: '8GB',   validity: '30 days', note: 'Unli calls to Smart/TNT' },
    { name: 'GigaVideo',   price: '₱99',  data: '3GB',   validity: '7 days',  note: 'Optimized for video' },
  ],
  dito: [
    { name: 'DITO 99',     price: '₱99',  data: '8GB',   validity: '7 days',  note: 'Best value for data' },
    { name: 'DITO 199',    price: '₱199', data: '25GB',  validity: '30 days', note: 'Monthly data plan' },
    { name: 'DITO 299',    price: '₱299', data: '40GB',  validity: '30 days', note: 'Heavy data users' },
  ],
  tnt: [
    { name: 'TNT Giga 50', price: '₱50',  data: '1GB',   validity: '3 days',  note: 'Affordable option' },
    { name: 'TNT Giga 99', price: '₱99',  data: '2GB',   validity: '7 days',  note: 'Weekly plan' },
    { name: 'All-Out Surf', price: '₱149', data: '5GB',  validity: '7 days',  note: 'Unli texts to all' },
  ],
  gomo: [
    { name: 'GOMO 99',     price: '₱99',  data: '7GB',   validity: '7 days',  note: 'Digital-only network' },
    { name: 'GOMO 299',    price: '₱299', data: '32GB',  validity: '30 days', note: 'Best GOMO value' },
  ],
  other: [],
}

const COVERAGE: { region: string; best: string; tip: string }[] = [
  { region: 'Metro Manila / NCR',    best: 'Globe / Smart',  tip: 'Both networks excellent. 5G available in BGC, Makati, Ortigas.' },
  { region: 'Cebu City / Mactan',   best: 'Globe / Smart',  tip: 'Strong 4G LTE everywhere. DITO expanding fast in Cebu.' },
  { region: 'Palawan (Puerto Princesa)', best: 'Smart',     tip: 'Smart generally stronger. Globe patchy outside city proper.' },
  { region: 'El Nido / Coron',       best: 'Smart',          tip: 'Remote areas — expect slow or no signal. Download maps offline.' },
  { region: 'Boracay',               best: 'Globe',          tip: 'Globe dominant on the island. Smart also decent.' },
  { region: 'Bohol / Panglao',       best: 'Globe / Smart',  tip: 'Both good in Tagbilaran. Weaker in Chocolate Hills interior.' },
  { region: 'Siargao',               best: 'Globe',          tip: 'Globe stronger. Data can be slow during peak season.' },
  { region: 'Davao City',            best: 'Globe / Smart',  tip: 'Strong 4G. DITO has solid coverage in Davao too.' },
  { region: 'Baguio / Benguet',      best: 'Smart',          tip: 'Smart better in mountain areas. Dead zones in Sagada.' },
  { region: 'Iloilo / Bacolod',      best: 'Globe / Smart',  tip: 'Both solid in city centers. Weaker in rural areas.' },
  { region: 'Batangas / Anilao',     best: 'Globe',          tip: 'Globe stronger along the coast and island resorts.' },
  { region: 'Vigan / Ilocos',        best: 'Smart',          tip: 'Smart has better rural coverage in Northern Luzon.' },
  { region: 'Camiguin / Mindanao islands', best: 'Globe',    tip: 'Spotty signal. Globe slightly more reliable on small islands.' },
]

const WIFI_TIPS = [
  { place: 'SM / Ayala Malls',   tip: 'Free mall WiFi. Ask for password at info desk.' },
  { place: 'McDonald\'s / Jollibee', tip: 'Reliable free WiFi. Great for quick browsing.' },
  { place: 'Coffee shops',        tip: 'Bo\'s Coffee, Starbucks, Tim Hortons all have free WiFi.' },
  { place: 'Hotels',              tip: 'Always ask for the WiFi password at check-in.' },
  { place: 'Airports',            tip: 'NAIA has free WiFi. Cebu & Clark airports too.' },
  { place: 'LRT / MRT stations',  tip: 'Free WiFi in most Metro Manila stations.' },
]

const defaultSim = (): SimInfo => ({
  network: 'globe', phoneNumber: '', loadAmount: '', loadExpiry: '', notes: '',
})

export default function Connectivity() {
  const { trip } = useTrip()
  const storageKey = `travelfy-sim-${trip.tripInfo.id}`

  const [sim, setSim] = useState<SimInfo>(() => {
    try { return { ...defaultSim(), ...JSON.parse(localStorage.getItem(storageKey) ?? '{}') } }
    catch { return defaultSim() }
  })
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<SimInfo>(sim)

  const [expandedSection, setExpandedSection] = useState<string | null>('promos')
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(sim))
  }, [sim, storageKey])

  const saveSim = () => {
    setSim(draft)
    setEditing(false)
  }

  const startEdit = () => {
    setDraft(sim)
    setEditing(true)
  }

  const copyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  const toggle = (section: string) =>
    setExpandedSection(prev => prev === section ? null : section)

  const currentNet = NETWORKS.find(n => n.id === sim.network)!
  const promos = PROMOS[sim.network] ?? []

  return (
    <div>
      <PageHeader
        title="Connectivity"
        subtitle="SIM & network"
        icon={Signal}
        iconColor="text-cyan-600"
      />

      {/* My SIM Card */}
      <div className="px-4 mb-4">
        <div className="bg-card border border-border rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">My SIM</p>
            {!editing ? (
              <button onClick={startEdit} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            ) : (
              <button onClick={saveSim} className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-500 text-white text-xs font-semibold">
                <Save className="h-3 w-3" />
                Save
              </button>
            )}
          </div>

          {!editing ? (
            <div className="space-y-3">
              {/* Network badge */}
              <div className="flex items-center gap-2">
                <div className={cn('w-10 h-10 rounded-2xl flex items-center justify-center text-xl', currentNet.bg)}>
                  {currentNet.logo}
                </div>
                <div>
                  <p className="font-bold text-base">{currentNet.label}</p>
                  {sim.phoneNumber && (
                    <div className="flex items-center gap-1">
                      <p className="text-xs text-muted-foreground font-mono">{sim.phoneNumber}</p>
                      <button onClick={() => copyText(sim.phoneNumber, 'phone')}>
                        {copied === 'phone'
                          ? <Check className="h-3 w-3 text-emerald-500" />
                          : <Copy className="h-3 w-3 text-muted-foreground" />
                        }
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-muted rounded-xl p-2.5">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Load Balance</p>
                  <p className="text-sm font-bold">{sim.loadAmount || '—'}</p>
                </div>
                <div className="bg-muted rounded-xl p-2.5">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Expires</p>
                  <p className="text-sm font-bold">{sim.loadExpiry || '—'}</p>
                </div>
              </div>
              {sim.notes && <p className="text-xs text-muted-foreground">{sim.notes}</p>}
              {!sim.phoneNumber && !sim.loadAmount && (
                <p className="text-xs text-muted-foreground italic">Tap ✏️ to log your SIM details</p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {/* Network selector */}
              <div>
                <Label className="text-xs text-muted-foreground uppercase tracking-wide mb-1.5 block">Network</Label>
                <div className="grid grid-cols-3 gap-2">
                  {NETWORKS.map(n => (
                    <button
                      key={n.id}
                      onClick={() => setDraft(d => ({ ...d, network: n.id }))}
                      className={cn(
                        'py-2 rounded-xl text-xs font-semibold border transition-all',
                        draft.network === n.id ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-300' : 'border-border text-muted-foreground'
                      )}
                    >
                      {n.logo} {n.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Phone Number</Label>
                <Input className="mt-1" placeholder="+63 9XX XXX XXXX" value={draft.phoneNumber} onChange={e => setDraft(d => ({ ...d, phoneNumber: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Load Balance</Label>
                  <Input className="mt-1" placeholder="₱99" value={draft.loadAmount} onChange={e => setDraft(d => ({ ...d, loadAmount: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Expiry</Label>
                  <Input className="mt-1" type="date" value={draft.loadExpiry} onChange={e => setDraft(d => ({ ...d, loadExpiry: e.target.value }))} />
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Notes</Label>
                <Input className="mt-1" placeholder="e.g. GoSURF99 active" value={draft.notes} onChange={e => setDraft(d => ({ ...d, notes: e.target.value }))} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Promos for current network */}
      {promos.length > 0 && (
        <Accordion
          title={`${currentNet.label} Load Promos`}
          emoji="📦"
          open={expandedSection === 'promos'}
          onToggle={() => toggle('promos')}
        >
          <div className="space-y-2">
            {promos.map(p => (
              <div key={p.name} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold">{p.name}</p>
                    <span className="text-[10px] bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 px-1.5 py-0.5 rounded-full font-semibold">{p.price}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{p.data} · {p.validity} · {p.note}</p>
                </div>
                <button onClick={() => copyText(`*143# → ${p.name}`, p.name)} className="shrink-0">
                  {copied === p.name
                    ? <Check className="h-3.5 w-3.5 text-emerald-500" />
                    : <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                  }
                </button>
              </div>
            ))}
            <p className="text-[11px] text-muted-foreground pt-1">
              💡 Register via *143# (Globe) or *123# (Smart) or the network's app
            </p>
          </div>
        </Accordion>
      )}

      {/* Coverage by region */}
      <Accordion
        title="Coverage by Region"
        emoji="📶"
        open={expandedSection === 'coverage'}
        onToggle={() => toggle('coverage')}
      >
        <div className="space-y-2.5">
          {COVERAGE.map(c => (
            <div key={c.region} className="pb-2.5 border-b border-border last:border-0">
              <div className="flex items-center justify-between gap-2 mb-0.5">
                <p className="text-sm font-semibold">{c.region}</p>
                <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded-full font-semibold shrink-0">{c.best}</span>
              </div>
              <p className="text-xs text-muted-foreground">{c.tip}</p>
            </div>
          ))}
        </div>
      </Accordion>

      {/* WiFi tips */}
      <Accordion
        title="Free WiFi Spots"
        emoji="📶"
        open={expandedSection === 'wifi'}
        onToggle={() => toggle('wifi')}
      >
        <div className="space-y-2">
          {WIFI_TIPS.map(w => (
            <div key={w.place} className="pb-2 border-b border-border last:border-0">
              <p className="text-sm font-semibold">{w.place}</p>
              <p className="text-xs text-muted-foreground">{w.tip}</p>
            </div>
          ))}
        </div>
      </Accordion>

      {/* Quick tips */}
      <div className="px-4 pb-8 mt-2">
        <div className="bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-200 dark:border-cyan-800 rounded-2xl p-4 space-y-2">
          <p className="text-xs font-bold text-cyan-700 dark:text-cyan-400 uppercase tracking-wide">Quick Tips</p>
          {[
            '📶 Buy a local SIM at the airport — avoid roaming charges',
            '🏪 SM, 7-Eleven & sari-sari stores sell prepaid load (e-load)',
            '🔋 Bring a power bank — outlets can be scarce on islands',
            '🌐 Download offline maps (Google Maps / Maps.me) before remote trips',
            '📡 Signal boosters sold at SM Electronics for remote areas',
          ].map(tip => (
            <p key={tip} className="text-xs text-cyan-700 dark:text-cyan-400">{tip}</p>
          ))}
        </div>
      </div>
    </div>
  )
}

function Accordion({ title, emoji, open, onToggle, children }: {
  title: string; emoji: string; open: boolean; onToggle: () => void; children: React.ReactNode
}) {
  return (
    <div className="px-4 mb-3">
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="text-base">{emoji}</span>
            <span className="text-sm font-semibold">{title}</span>
          </div>
          {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </button>
        {open && (
          <div className="px-4 pb-4 pt-1 border-t border-border">
            {children}
          </div>
        )}
      </div>
    </div>
  )
}
