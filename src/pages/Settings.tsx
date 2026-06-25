import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import {
  Settings as SettingsIcon, User, Moon, Sun, Monitor,
  Download, Upload, Trash2, Check, Globe, DollarSign,
  ChevronRight, AlertTriangle, LogOut
} from 'lucide-react'
import { useTrip } from '@/contexts/TripContext'
import { useTheme } from '@/contexts/ThemeContext'
import { useAuth } from '@/contexts/AuthContext'
import PageHeader from '@/components/common/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { formatDate } from '@/utils/dateUtils'
import { cn } from '@/utils/cn'

const CURRENCIES = ['PHP', 'HKD', 'MOP', 'USD', 'EUR', 'SGD', 'JPY']

export default function Settings() {
  const { trip, updateTrip, resetTrip, exportTrip, importTrip } = useTrip()
  const { theme, setTheme } = useTheme()
  const { user, signOut } = useAuth()
  const [resetDialogOpen, setResetDialogOpen] = useState(false)
  const [importResult, setImportResult] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [settingsBuffer, setSettingsBuffer] = useState(trip.settings)
  const [tripBuffer, setTripBuffer] = useState(trip.tripInfo)
  const importRef = useRef<HTMLInputElement>(null)

  const saveSettings = () => {
    updateTrip(prev => ({ ...prev, settings: settingsBuffer, tripInfo: tripBuffer }))
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleExport = () => {
    const json = exportTrip()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `travelfy-${trip.tripInfo.name.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async ev => {
      const json = ev.target?.result as string
      const ok = await importTrip(json)
      setImportResult(ok ? '✓ Trip data imported successfully!' : '✗ Invalid file format')
      setTimeout(() => setImportResult(null), 3000)
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const themeOptions = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor },
  ]

  return (
    <div>
      <PageHeader
        title="Settings"
        subtitle="Preferences & data"
        icon={SettingsIcon}
        iconColor="text-slate-600"
        action={
          <Button size="sm" onClick={saveSettings} className="h-8 text-xs">
            {saved ? <><Check className="h-3.5 w-3.5 mr-1" /> Saved!</> : 'Save'}
          </Button>
        }
      />

      <div className="px-4 space-y-4">
        {/* Profile */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-14 h-14 rounded-2xl gradient-brand flex items-center justify-center text-white text-xl font-bold">
                {settingsBuffer.travelerName.charAt(0).toUpperCase() || 'T'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold">{settingsBuffer.travelerName || 'Traveler'}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </div>
              <Button variant="ghost" size="icon-sm" onClick={signOut} className="text-muted-foreground hover:text-destructive">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" /> Traveler Name
                </Label>
                <Input
                  value={settingsBuffer.travelerName}
                  onChange={e => setSettingsBuffer({ ...settingsBuffer, travelerName: e.target.value })}
                  placeholder="Your name"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Trip Info */}
        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-semibold mb-3">Trip Information</p>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Trip Name</Label>
                <Input value={tripBuffer.name} onChange={e => setTripBuffer({ ...tripBuffer, name: e.target.value })} placeholder="My Amazing Trip" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Destination</Label>
                <Input value={tripBuffer.destination} onChange={e => setTripBuffer({ ...tripBuffer, destination: e.target.value })} placeholder="Hong Kong & Macau" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Description</Label>
                <Input value={tripBuffer.description} onChange={e => setTripBuffer({ ...tripBuffer, description: e.target.value })} placeholder="Trip description" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Start Date</Label>
                  <Input type="date" value={tripBuffer.startDate} onChange={e => setTripBuffer({ ...tripBuffer, startDate: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">End Date</Label>
                  <Input type="date" value={tripBuffer.endDate} onChange={e => setTripBuffer({ ...tripBuffer, endDate: e.target.value })} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Preferences */}
        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-semibold mb-3">Preferences</p>
            <div className="space-y-4">
              {/* Theme */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Theme</Label>
                <div className="grid grid-cols-3 gap-2">
                  {themeOptions.map(({ value, label, icon: Icon }) => (
                    <button
                      key={value}
                      onClick={() => setTheme(value as 'light' | 'dark' | 'system')}
                      className={cn(
                        'flex flex-col items-center gap-1.5 py-3 rounded-xl border transition-all',
                        theme === value
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-border text-muted-foreground hover:border-primary/50'
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="text-xs font-medium">{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Currency */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <DollarSign className="h-3.5 w-3.5" /> Home Currency
                </Label>
                <Select
                  value={settingsBuffer.homeCurrency}
                  onValueChange={v => setSettingsBuffer({ ...settingsBuffer, homeCurrency: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Budget */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Total Budget ({settingsBuffer.homeCurrency})</Label>
                <Input
                  type="number"
                  value={settingsBuffer.totalBudget || ''}
                  onChange={e => setSettingsBuffer({ ...settingsBuffer, totalBudget: parseFloat(e.target.value) || 0 })}
                  placeholder="50000"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data Management */}
        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-semibold mb-3">Data Management</p>
            <div className="space-y-2">
              <Button variant="outline" className="w-full justify-between" onClick={handleExport}>
                <div className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  <div className="text-left">
                    <p className="text-sm font-medium">Export Trip Data</p>
                    <p className="text-xs text-muted-foreground">Download as JSON file</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Button>

              <Button variant="outline" className="w-full justify-between" onClick={() => importRef.current?.click()}>
                <div className="flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  <div className="text-left">
                    <p className="text-sm font-medium">Import Trip Data</p>
                    <p className="text-xs text-muted-foreground">Restore from JSON file</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Button>
              <input ref={importRef} type="file" accept=".json" className="hidden" onChange={handleImport} />

              {importResult && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    'text-sm text-center p-2 rounded-xl',
                    importResult.startsWith('✓') ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                  )}
                >
                  {importResult}
                </motion.div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-destructive/30">
          <CardContent className="p-4">
            <p className="text-sm font-semibold text-destructive mb-3 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" /> Danger Zone
            </p>
            <Button
              variant="destructive"
              className="w-full"
              onClick={() => setResetDialogOpen(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Reset All Trip Data
            </Button>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              This will reset all data to the sample trip. Cannot be undone.
            </p>
          </CardContent>
        </Card>

        {/* App Info */}
        <div className="text-center py-4 text-xs text-muted-foreground space-y-1">
          <p className="font-semibold text-base text-gradient">Travelfy</p>
          <p>Your Travel Command Center</p>
          <p>v1.0.0 · Built with React + TypeScript</p>
          <p>Data stored locally on your device</p>
          {trip.lastUpdated && (
            <p>Last updated: {formatDate(trip.lastUpdated, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' } as Intl.DateTimeFormatOptions)}</p>
          )}
        </div>
      </div>

      {/* Reset Confirmation */}
      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Reset All Data?
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will permanently delete all your trip data and restore the sample Hong Kong–Macau trip.
            This action cannot be undone.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setResetDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={async () => { await resetTrip(); setResetDialogOpen(false) }}>
              Reset Everything
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
