import { useState } from 'react'
import { ShieldAlert, ExternalLink, ChevronDown, ChevronUp, Phone } from 'lucide-react'
import PageHeader from '@/components/common/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/utils/cn'

// ── Official agency quick links ──────────────────────────────
const AGENCIES = [
  { name: 'NDRRMC',    label: 'Disaster Risk',   emoji: '🛡️', url: 'https://www.ndrrmc.gov.ph',                               color: 'bg-red-500/10 text-red-600 dark:text-red-400' },
  { name: 'PAGASA',    label: 'Weather',          emoji: '🌀', url: 'https://www.pagasa.dost.gov.ph',                          color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' },
  { name: 'PHIVOLCS',  label: 'Volcano/Quake',   emoji: '🌋', url: 'https://www.phivolcs.dost.gov.ph',                       color: 'bg-orange-500/10 text-orange-600 dark:text-orange-400' },
  { name: 'PCG',       label: 'Coast Guard',      emoji: '⚓', url: 'https://www.coastguard.gov.ph',                          color: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400' },
  { name: 'DOH',       label: 'Health Alerts',    emoji: '🏥', url: 'https://www.doh.gov.ph',                                 color: 'bg-green-500/10 text-green-600 dark:text-green-400' },
  { name: 'MGB',       label: 'Landslide/Geo',   emoji: '⛰️', url: 'https://www.mgb.gov.ph',                                color: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400' },
]

// ── Emergency hotlines ────────────────────────────────────────
const HOTLINES = [
  { name: 'NDRRMC Operations',    number: '(02) 8911-5061',   note: '24/7 disaster operations' },
  { name: 'PNP Emergency',        number: '911',              note: 'National emergency' },
  { name: 'BFP (Fire)',           number: '(02) 8426-0219',  note: 'Bureau of Fire Protection' },
  { name: 'Philippine Red Cross', number: '143',              note: 'Disaster response' },
  { name: 'Coast Guard',          number: '(02) 5321-2431',  note: 'Maritime emergencies' },
  { name: 'DOH Hotline',          number: '1555',             note: 'Health emergencies' },
]

// ── Disaster quick guides ─────────────────────────────────────
const DISASTER_GUIDES = [
  {
    type: 'Typhoon',
    emoji: '🌀',
    color: 'border-blue-500/30 bg-blue-500/5',
    headerColor: 'text-blue-600 dark:text-blue-400',
    before: [
      'Monitor PAGASA storm signal updates',
      'Stock 3-day supply of food, water, medicine',
      'Charge all devices and power banks',
      'Secure or bring inside loose outdoor items',
      'Know your evacuation route and center',
    ],
    during: [
      'Stay indoors away from windows',
      'Avoid flood-prone areas and rivers',
      'Do not cross flooded roads — even shallow water is dangerous',
      'Keep radio on for PAGASA/NDRRMC updates',
    ],
    after: [
      'Check for structural damage before re-entering',
      'Avoid downed power lines',
      'Use bottled/boiled water only',
      'Report injuries to barangay/LGU',
    ],
  },
  {
    type: 'Earthquake',
    emoji: '🌍',
    color: 'border-amber-500/30 bg-amber-500/5',
    headerColor: 'text-amber-600 dark:text-amber-400',
    before: [
      'Identify safe spots: under sturdy tables, near interior walls',
      'Secure heavy furniture to walls',
      'Know your building\'s exit routes',
      'Keep an emergency kit accessible',
    ],
    during: [
      'DROP, COVER, HOLD — get under a sturdy table',
      'Stay away from windows and exterior walls',
      'If outdoors, move away from buildings and power lines',
      'Never use elevators',
    ],
    after: [
      'Expect aftershocks — stay alert',
      'Check for gas leaks (don\'t use lighters)',
      'Move to higher ground if near coast (tsunami risk)',
      'Listen to PHIVOLCS and LGU updates',
    ],
  },
  {
    type: 'Flood',
    emoji: '🌊',
    color: 'border-cyan-500/30 bg-cyan-500/5',
    headerColor: 'text-cyan-600 dark:text-cyan-400',
    before: [
      'Monitor NDRRMC and LGU flood advisories',
      'Move valuables and important documents to higher floors',
      'Prepare waterproof bags for essentials',
      'Know your barangay\'s evacuation center',
    ],
    during: [
      'Never walk or drive through floodwater',
      'Evacuate early — don\'t wait for water to rise',
      'Turn off electricity at the main breaker',
      'Stay on high ground',
    ],
    after: [
      'Do not return until LGU declares it safe',
      'Avoid contact with floodwater (disease risk)',
      'Clean and disinfect everything that got wet',
      'Watch for landslides in hilly areas',
    ],
  },
  {
    type: 'Volcano',
    emoji: '🌋',
    color: 'border-red-500/30 bg-red-500/5',
    headerColor: 'text-red-600 dark:text-red-400',
    before: [
      'Monitor PHIVOLCS alert levels (0 = normal, 5 = extreme)',
      'Know Permanent Danger Zone (PDZ) boundaries',
      'Prepare N95/dust masks for ashfall',
      'Goggles, long sleeves and pants for ash protection',
    ],
    during: [
      'Follow evacuation orders immediately',
      'Wear N95 mask — do not inhale ash',
      'Protect water sources from ash contamination',
      'Avoid river channels near volcano (lahar risk)',
    ],
    after: [
      'Clear rooftops of ash (heavy — structural risk)',
      'Avoid handling volcanic ash with bare hands',
      'Use only bottled water until supply is cleared',
      'Stay out of river channels during rain (lahar)',
    ],
  },
  {
    type: 'Landslide',
    emoji: '⛰️',
    color: 'border-yellow-500/30 bg-yellow-500/5',
    headerColor: 'text-yellow-600 dark:text-yellow-400',
    before: [
      'Avoid building or camping on steep slopes',
      'Monitor MGB and LGU geohazard advisories',
      'Watch for warning signs: tilting trees, cracks in soil',
      'Know alternate routes in mountainous areas',
    ],
    during: [
      'Move away perpendicular to the slide direction',
      'Get to higher, stable ground quickly',
      'If caught, curl into a ball and protect your head',
    ],
    after: [
      'Stay away from landslide area (more slides possible)',
      'Watch for flooding from blocked rivers',
      'Report to LGU for search and rescue assistance',
    ],
  },
]

// PHIVOLCS Alert Levels
const PHIVOLCS_LEVELS = [
  { level: 0, color: 'bg-gray-500',   label: 'Normal',   desc: 'No eruption, no unrest' },
  { level: 1, color: 'bg-green-500',  label: 'Low',      desc: 'Low-level unrest, possible hydrothermal activity' },
  { level: 2, color: 'bg-yellow-500', label: 'Moderate', desc: 'Probable magmatic intrusion, eruption within weeks' },
  { level: 3, color: 'bg-orange-500', label: 'High',     desc: 'Magma is close to surface, eruption within days' },
  { level: 4, color: 'bg-red-500',    label: 'Very High', desc: 'Hazardous eruption is imminent or ongoing' },
  { level: 5, color: 'bg-purple-600', label: 'Extreme',  desc: 'Large, highly hazardous eruption ongoing' },
]

function GuideCard({ guide }: { guide: typeof DISASTER_GUIDES[0] }) {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<'before' | 'during' | 'after'>('before')
  return (
    <Card className={cn('border overflow-hidden', guide.color)}>
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between p-4"
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">{guide.emoji}</span>
          <span className={cn('font-bold text-sm', guide.headerColor)}>{guide.type}</span>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>
      {open && (
        <div className="border-t border-border/50 px-4 pb-4">
          {/* Tab row */}
          <div className="flex gap-1 mt-3 mb-3 bg-muted rounded-xl p-1">
            {(['before', 'during', 'after'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  'flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all capitalize',
                  tab === t ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground',
                )}
              >
                {t === 'before' ? 'Before' : t === 'during' ? 'During' : 'After'}
              </button>
            ))}
          </div>
          <ul className="space-y-2">
            {guide[tab].map((tip, i) => (
              <li key={i} className="flex gap-2 text-xs text-muted-foreground leading-relaxed">
                <span className="text-foreground font-bold shrink-0">{i + 1}.</span>
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  )
}

export default function Advisories() {
  return (
    <div>
      <PageHeader
        title="Travel Advisories"
        subtitle="PH disaster & safety reference"
        icon={ShieldAlert}
      />

      <div className="px-4 space-y-4 pb-6">
        {/* Agency quick-launch grid */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Official Monitoring Agencies</p>
          <div className="grid grid-cols-3 gap-2">
            {AGENCIES.map(a => (
              <a
                key={a.name}
                href={a.url}
                target="_blank"
                rel="noopener noreferrer"
                className={cn('flex flex-col items-center gap-1.5 py-3 px-2 rounded-2xl text-center active:scale-95 transition-all', a.color)}
              >
                <span className="text-2xl">{a.emoji}</span>
                <span className="text-[11px] font-bold leading-tight">{a.name}</span>
                <span className="text-[10px] opacity-70 leading-tight">{a.label}</span>
              </a>
            ))}
          </div>
        </div>

        {/* Emergency hotlines */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Phone className="h-4 w-4 text-red-500 shrink-0" />
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Emergency Hotlines</p>
            </div>
            <div className="space-y-2">
              {HOTLINES.map(h => (
                <div key={h.name} className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">{h.name}</p>
                    <p className="text-[10px] text-muted-foreground">{h.note}</p>
                  </div>
                  <a
                    href={`tel:${h.number.replace(/[^0-9+]/g, '')}`}
                    className="text-xs font-mono font-bold text-primary shrink-0 tabular-nums hover:underline"
                  >
                    {h.number}
                  </a>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Disaster quick guides */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Disaster Preparedness Guides</p>
          <div className="space-y-2">
            {DISASTER_GUIDES.map(g => <GuideCard key={g.type} guide={g} />)}
          </div>
        </div>

        {/* PHIVOLCS Alert Levels */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">🌋</span>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">PHIVOLCS Volcano Alert Levels</p>
            </div>
            <div className="space-y-2">
              {PHIVOLCS_LEVELS.map(l => (
                <div key={l.level} className="flex items-start gap-3">
                  <div className={cn('w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0', l.color)}>
                    {l.level}
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-semibold text-foreground">{l.label} — </span>
                    <span className="text-xs text-muted-foreground">{l.desc}</span>
                  </div>
                </div>
              ))}
            </div>
            <a
              href="https://www.phivolcs.dost.gov.ph/index.php/volcano-hazard/volcano-alert-level"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-2.5 mt-3 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 text-xs font-semibold hover:bg-orange-500/20 active:scale-[0.98] transition-all"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              PHIVOLCS Active Volcano Bulletin
            </a>
          </CardContent>
        </Card>

        {/* DFA travel advisories for international travelers */}
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">More Resources</p>
            <div className="space-y-2">
              {[
                { label: 'NDRRMC Situation Reports', url: 'https://www.ndrrmc.gov.ph/index.php/component/content/article?id=3599' },
                { label: 'PAGASA Weather Bulletin', url: 'https://www.pagasa.dost.gov.ph/weather-bulletin' },
                { label: 'DFA Travel Advisories', url: 'https://dfa.gov.ph/travel-advisories' },
                { label: 'PCG Maritime Advisories', url: 'https://www.coastguard.gov.ph/index.php/advisories' },
              ].map(link => (
                <a
                  key={link.label}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between w-full py-2.5 px-3 rounded-xl bg-muted hover:bg-accent active:scale-[0.98] transition-all"
                >
                  <span className="text-xs font-medium">{link.label}</span>
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                </a>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
