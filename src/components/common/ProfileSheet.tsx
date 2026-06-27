import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Loader2, Check, LogOut, Sun, Moon, Monitor, Mail, User as UserIcon, ArrowLeftRight } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { useTrip } from '@/contexts/TripContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/utils/cn'

interface Props {
  open: boolean
  onClose: () => void
  /** Optional pre-fill for the display name (e.g., from trip.settings.travelerName). */
  initialName?: string
}

export default function ProfileSheet({ open, onClose, initialName }: Props) {
  const { user, signOut, updateDisplayName } = useAuth()
  const { theme, setTheme } = useTheme()
  const { activeTripId, exitTrip, trip } = useTrip()

  const metaName = (user?.user_metadata?.full_name as string | undefined) ?? ''
  const seedName = (initialName?.trim() || metaName || '').trim()

  const [name, setName] = useState(seedName)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Re-sync the input when the sheet (re)opens or the underlying name changes.
  useEffect(() => {
    if (open) {
      setName(seedName)
      setSaved(false)
      setError(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, metaName, initialName])

  const handleSave = async () => {
    const trimmed = name.trim()
    if (!trimmed) { setError('Name cannot be empty'); return }
    if (trimmed === metaName) { onClose(); return }
    setSaving(true)
    setError(null)
    const { error } = await updateDisplayName(trimmed)
    setSaving(false)
    if (error) { setError(error); return }
    setSaved(true)
    setTimeout(() => { setSaved(false); onClose() }, 800)
  }

  const initial = (name.trim().charAt(0) || user?.email?.charAt(0) || '?').toUpperCase()

  const themeOptions: Array<{ value: 'light' | 'dark' | 'system'; label: string; icon: typeof Sun }> = [
    { value: 'light',  label: 'Light',  icon: Sun },
    { value: 'dark',   label: 'Dark',   icon: Moon },
    { value: 'system', label: 'System', icon: Monitor },
  ]

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
            className="fixed bottom-0 left-0 right-0 z-[2001] bg-background rounded-t-3xl p-5 pb-8 shadow-2xl max-w-lg mx-auto max-h-[92vh] overflow-y-auto"
            role="dialog"
            aria-label="Edit profile"
          >
            <div className="w-10 h-1 rounded-full bg-border mx-auto mb-4" />
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-base">Edit Profile</h3>
              <button onClick={onClose} aria-label="Close" className="p-1 rounded-lg hover:bg-muted">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>

            {/* Avatar + email */}
            <div className="flex items-center gap-4 mb-5">
              <div className="w-16 h-16 rounded-2xl gradient-brand flex items-center justify-center text-white text-2xl font-bold shrink-0">
                {initial}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{name.trim() || 'Traveler'}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5 truncate">
                  <Mail className="h-3 w-3" /> {user?.email ?? '—'}
                </p>
              </div>
            </div>

            {/* Display name */}
            <div className="space-y-1.5 mb-4">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <UserIcon className="h-3 w-3" /> Display Name
              </Label>
              <Input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Zach"
                maxLength={32}
                onKeyDown={e => { if (e.key === 'Enter') handleSave() }}
              />
              {error && <p className="text-xs text-destructive">{error}</p>}
            </div>

            {/* Theme */}
            <div className="space-y-1.5 mb-5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Theme</Label>
              <div className="grid grid-cols-3 gap-2">
                {themeOptions.map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    onClick={() => setTheme(value)}
                    className={cn(
                      'flex flex-col items-center gap-1 py-3 rounded-xl border text-xs font-medium transition-colors',
                      theme === value
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border text-muted-foreground hover:text-foreground',
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 mb-4">
              <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
              <Button
                className="flex-1 gap-2"
                onClick={handleSave}
                disabled={saving || saved}
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {saved && <Check className="h-4 w-4" />}
                {saved ? 'Saved' : saving ? 'Saving…' : 'Save'}
              </Button>
            </div>

            {/* Exit current trip (in-trip only) — drops back to the lobby so
                the user can focus on a different trip without deleting this one. */}
            {activeTripId && (
              <button
                onClick={() => { onClose(); exitTrip() }}
                className="w-full flex items-center gap-2 py-3 px-3 rounded-xl text-sm font-medium text-foreground hover:bg-accent transition-colors border border-border"
              >
                <ArrowLeftRight className="h-4 w-4 text-primary" />
                <span className="flex-1 text-left">Exit trip</span>
                {trip.tripInfo.name && (
                  <span className="text-xs text-muted-foreground truncate max-w-[150px]">{trip.tripInfo.name}</span>
                )}
              </button>
            )}

            {/* Sign out */}
            <button
              onClick={() => { onClose(); signOut() }}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium text-destructive hover:bg-destructive/5 transition-colors mt-2"
            >
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
