import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Globe, Edit2, AlertTriangle, Shield, Plus, Trash2, X,
  Check, Loader2, CalendarDays, Hash, MapPin, User, Flag,
  Clock
} from 'lucide-react'
import { useTrip } from '@/contexts/TripContext'
import { useAuth } from '@/contexts/AuthContext'
import { storageService } from '@/services/storage'
import type { VisaInfo, PassportInfo } from '@/types'
import { isExpiringSoon, isExpired, formatDate } from '@/utils/dateUtils'

const emptyVisa = (): VisaInfo => ({
  id: crypto.randomUUID(),
  country: '',
  visaType: '',
  visaNumber: '',
  issueDate: '',
  expiryDate: '',
  status: 'valid',
  notes: '',
})

function Field({ label, value, icon: Icon }: { label: string; value?: string; icon?: React.ElementType }) {
  if (!value) return null
  return (
    <div className="flex items-start gap-3 py-3 border-b border-border last:border-0">
      {Icon && <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />}
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">{label}</p>
        <p className="text-sm font-semibold mt-0.5 truncate">{value}</p>
      </div>
    </div>
  )
}

function LabeledInput({
  label, value, onChange, placeholder, type = 'text', icon: Icon
}: {
  label: string; value: string; onChange: (v: string) => void
  placeholder?: string; type?: string; icon?: React.ElementType
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1">
        {Icon && <Icon className="h-3 w-3" />} {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-3 rounded-xl bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground"
      />
    </div>
  )
}

export default function Passport() {
  const { trip, updateTrip, activeTripId } = useTrip()
  const { user } = useAuth()
  const hasTrip = !!activeTripId

  // When no trip is active, load passport directly from Supabase
  const [globalPassport, setGlobalPassport] = useState<PassportInfo | null>(null)
  const [globalLoading, setGlobalLoading] = useState(!hasTrip)

  useEffect(() => {
    if (hasTrip || !user) return
    setGlobalLoading(true)
    storageService.getPassport(user.id)
      .then(p => setGlobalPassport(p))
      .finally(() => setGlobalLoading(false))
  }, [hasTrip, user])

  // Use trip passport when inside a trip, global passport otherwise
  const passport = hasTrip ? trip.passport : (globalPassport ?? trip.passport)
  const visas = trip.visas

  const [editSheet, setEditSheet] = useState(false)
  const [buf, setBuf] = useState<PassportInfo>(passport)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const [visaSheet, setVisaSheet] = useState(false)
  const [visaBuf, setVisaBuf] = useState<VisaInfo>(emptyVisa())
  const [visaSaving, setVisaSaving] = useState(false)

  const passportExpired = passport.expiryDate && isExpired(passport.expiryDate)
  const passportExpiring = passport.expiryDate && !passportExpired && isExpiringSoon(passport.expiryDate)

  const daysUntilExpiry = () => {
    if (!passport.expiryDate) return null
    return Math.ceil((new Date(passport.expiryDate).getTime() - Date.now()) / 86400000)
  }

  const openEdit = () => { setBuf({ ...passport }); setSaved(false); setEditSheet(true) }

  const savePassport = async () => {
    if (!user) return
    setSaving(true)
    try {
      await storageService.savePassport(user.id, buf)
      if (hasTrip) {
        updateTrip(prev => ({ ...prev, passport: buf }))
      } else {
        setGlobalPassport(buf)
      }
      setSaved(true)
      setTimeout(() => { setSaved(false); setEditSheet(false) }, 700)
    } finally {
      setSaving(false)
    }
  }

  const openAddVisa = () => { setVisaBuf(emptyVisa()); setVisaSheet(true) }
  const openEditVisa = (v: VisaInfo) => { setVisaBuf({ ...v }); setVisaSheet(true) }

  const saveVisa = () => {
    if (!visaBuf.country) return
    setVisaSaving(true)
    updateTrip(prev => {
      const exists = prev.visas.find(v => v.id === visaBuf.id)
      return {
        ...prev,
        visas: exists
          ? prev.visas.map(v => v.id === visaBuf.id ? visaBuf : v)
          : [...prev.visas, visaBuf],
      }
    })
    setTimeout(() => { setVisaSaving(false); setVisaSheet(false) }, 300)
  }

  const removeVisa = (id: string) => {
    if (!confirm('Remove this visa?')) return
    updateTrip(prev => ({ ...prev, visas: prev.visas.filter(v => v.id !== id) }))
  }

  const days = daysUntilExpiry()

  if (globalLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* Header */}
      <div className="px-4 pb-4 pt-[max(1.5rem,env(safe-area-inset-top))]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/15 flex items-center justify-center">
              <Globe className="h-5 w-5 text-indigo-500" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Passport & Visa</h1>
              <p className="text-xs text-muted-foreground">Travel documents</p>
            </div>
          </div>
          <button
            onClick={openAddVisa}
            className="w-10 h-10 rounded-2xl bg-muted border border-border flex items-center justify-center"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="px-4 space-y-4">
        {/* Expiry warning */}
        <AnimatePresence>
          {(passportExpired || passportExpiring) && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`flex items-start gap-3 px-4 py-3 rounded-2xl border ${
                passportExpired
                  ? 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400'
              }`}
            >
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold">
                  {passportExpired ? 'Passport Expired!' : 'Expiring Soon'}
                </p>
                <p className="text-xs mt-0.5 opacity-80">
                  {passportExpired
                    ? `Expired on ${formatDate(passport.expiryDate)}. Renew immediately.`
                    : `Expires in ${days} day${days !== 1 ? 's' : ''}. Many countries require 6 months validity.`
                  }
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Passport Card */}
        <div className="relative rounded-3xl overflow-hidden shadow-xl">
          {/* Gradient background */}
          <div className="gradient-hero p-5 pb-8 text-white relative overflow-hidden min-h-[200px]">
            {/* Decorative circles */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -translate-y-16 translate-x-16" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-12 -translate-x-12" />
            <div className="absolute top-1/2 right-8 w-20 h-20 bg-white/5 rounded-full" />

            {/* Top row */}
            <div className="relative z-10 flex items-start justify-between mb-6">
              <div>
                <p className="text-white/50 text-[9px] font-bold uppercase tracking-[0.2em]">Republic of</p>
                <p className="text-white text-[9px] font-bold uppercase tracking-[0.2em]">{passport.issuingCountry || 'Philippines'}</p>
                <p className="text-white/60 text-[8px] uppercase tracking-[0.15em] mt-0.5">Passport · Pasaporte</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/20">
                <Globe className="h-6 w-6 text-white/70" />
              </div>
            </div>

            {passport.passportNumber || passport.fullName ? (
              <>
                {/* Passport number */}
                <div className="relative z-10 mb-4">
                  <p className="text-white/40 text-[9px] uppercase tracking-widest mb-1">Document No.</p>
                  <p className="text-white font-mono text-2xl font-bold tracking-[0.15em]">
                    {passport.passportNumber || '—'}
                  </p>
                </div>
                {/* Name */}
                <div className="relative z-10">
                  <p className="text-white/40 text-[9px] uppercase tracking-widest">Surname / Given Names</p>
                  <p className="text-white font-bold text-base mt-0.5 truncate">
                    {passport.fullName || '—'}
                  </p>
                  {passport.nationality && (
                    <p className="text-white/60 text-xs mt-0.5">{passport.nationality}</p>
                  )}
                </div>
              </>
            ) : (
              <div className="relative z-10 flex-1 flex flex-col items-center justify-center py-6 gap-3">
                <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center">
                  <Globe className="h-7 w-7 text-white/40" />
                </div>
                <div className="text-center">
                  <p className="text-white/60 text-sm font-semibold">No passport added yet</p>
                  <p className="text-white/30 text-xs mt-0.5">Tap "Edit Passport Details" below</p>
                </div>
              </div>
            )}

            {/* Expiry chip */}
            {passport.expiryDate && (
              <div className={`absolute bottom-4 right-4 px-3 py-1.5 rounded-full text-[10px] font-bold flex items-center gap-1.5 ${
                passportExpired ? 'bg-red-500/40 text-white' : passportExpiring ? 'bg-amber-500/40 text-white' : 'bg-white/15 text-white/80'
              }`}>
                <Clock className="h-3 w-3" />
                Exp {formatDate(passport.expiryDate)}
              </div>
            )}
          </div>

          {/* MRZ strip — only when passport number is filled */}
          {passport.passportNumber && (
            <div className="bg-slate-900 dark:bg-black px-4 py-2.5">
              <p className="font-mono text-[9px] text-green-400/70 tracking-[0.08em] leading-relaxed break-all">
                {`P<${(passport.issuingCountry || 'PHL').slice(0,3).toUpperCase()}${(passport.fullName || 'TRAVELER').replace(/\s/g,'<').toUpperCase()}<<<<<<<<<<<<<<<<<`}
              </p>
              <p className="font-mono text-[9px] text-green-400/70 tracking-[0.08em] mt-0.5 break-all">
                {`${passport.passportNumber.padEnd(9,'<')}${(passport.nationality || 'FIL').slice(0,3).toUpperCase()}${(passport.dateOfBirth || '000000').replace(/-/g,'').slice(2)}0${(passport.expiryDate || '000000').replace(/-/g,'').slice(2)}0<<<<<<<<<<<<<<`}
              </p>
            </div>
          )}
        </div>

        {/* Passport details view */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          {passport.fullName || passport.passportNumber ? (
            <div className="divide-y divide-border">
              {passport.fullName && <Field label="Full Name" value={passport.fullName} icon={User} />}
              {passport.passportNumber && <Field label="Passport No." value={passport.passportNumber} icon={Hash} />}
              {passport.nationality && <Field label="Nationality" value={passport.nationality} icon={Flag} />}
              {passport.gender && <Field label="Gender" value={passport.gender} icon={User} />}
              {passport.dateOfBirth && <Field label="Date of Birth" value={formatDate(passport.dateOfBirth)} icon={CalendarDays} />}
              {passport.placeOfBirth && <Field label="Place of Birth" value={passport.placeOfBirth} icon={MapPin} />}
              {passport.issueDate && <Field label="Issue Date" value={formatDate(passport.issueDate)} icon={CalendarDays} />}
              {passport.expiryDate && <Field label="Expiry Date" value={formatDate(passport.expiryDate)} icon={CalendarDays} />}
              {passport.issuingCountry && <Field label="Issuing Country" value={passport.issuingCountry} icon={Globe} />}
            </div>
          ) : (
            <div className="px-4 py-8 text-center">
              <Globe className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No passport details yet</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Tap edit to fill in your passport info</p>
            </div>
          )}
          <div className="p-4 border-t border-border">
            <button
              onClick={openEdit}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary/10 text-primary text-sm font-semibold hover:bg-primary/15 transition-colors active:scale-[0.99]"
            >
              <Edit2 className="h-4 w-4" /> Edit Passport Details
            </button>
          </div>
        </div>

        {/* Visas */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-base">Visas & Entry Permits</h2>
            <button
              onClick={openAddVisa}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-muted border border-border text-xs font-semibold hover:bg-accent transition-colors"
            >
              <Plus className="h-3.5 w-3.5" /> Add Visa
            </button>
          </div>

          <div className="space-y-3">
            {visas.length === 0 && (
              <div className="text-center py-10 rounded-2xl border border-dashed border-border">
                <Shield className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No visas added</p>
                <button onClick={openAddVisa} className="text-xs text-primary font-semibold mt-2 hover:underline">
                  + Add your first visa
                </button>
              </div>
            )}
            {visas.map(visa => {
              const expired = visa.expiryDate && isExpired(visa.expiryDate)
              const expiring = visa.expiryDate && !expired && isExpiringSoon(visa.expiryDate, 1)
              const statusColor = expired ? 'bg-red-500/10 text-red-500 border-red-500/20'
                : expiring ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                : visa.status === 'valid' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                : 'bg-muted text-muted-foreground border-border'
              const statusLabel = expired ? 'Expired' : expiring ? 'Expiring' : visa.status === 'valid' ? 'Valid' : visa.status === 'pending' ? 'Pending' : 'Expired'

              return (
                <motion.div
                  key={visa.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl border border-border bg-card overflow-hidden"
                >
                  {/* Color bar */}
                  <div className={`h-1 w-full ${expired ? 'bg-red-500' : expiring ? 'bg-amber-500' : visa.status === 'valid' ? 'bg-emerald-500' : 'bg-muted-foreground/30'}`} />
                  <div className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                          <Shield className="h-5 w-5 text-amber-500" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-bold text-sm">{visa.country}</p>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusColor}`}>
                              {statusLabel}
                            </span>
                          </div>
                          {visa.visaType && <p className="text-xs text-muted-foreground mt-0.5">{visa.visaType}</p>}
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button
                          onClick={() => openEditVisa(visa)}
                          className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center hover:bg-accent transition-colors"
                        >
                          <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
                        </button>
                        <button
                          onClick={() => removeVisa(visa.id)}
                          className="w-8 h-8 rounded-xl bg-red-500/10 flex items-center justify-center hover:bg-red-500/20 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5 text-red-500" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {visa.visaNumber && (
                        <div className="px-3 py-2 rounded-xl bg-muted">
                          <p className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold">Visa No.</p>
                          <p className="text-xs font-semibold font-mono mt-0.5">{visa.visaNumber}</p>
                        </div>
                      )}
                      {visa.expiryDate && (
                        <div className={`px-3 py-2 rounded-xl ${expired ? 'bg-red-500/10' : expiring ? 'bg-amber-500/10' : 'bg-muted'}`}>
                          <p className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold">Expires</p>
                          <p className={`text-xs font-semibold mt-0.5 ${expired ? 'text-red-500' : expiring ? 'text-amber-500' : ''}`}>{formatDate(visa.expiryDate)}</p>
                        </div>
                      )}
                      {visa.issueDate && (
                        <div className="px-3 py-2 rounded-xl bg-muted">
                          <p className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold">Issued</p>
                          <p className="text-xs font-semibold mt-0.5">{formatDate(visa.issueDate)}</p>
                        </div>
                      )}
                    </div>

                    {visa.notes && (
                      <p className="text-xs text-muted-foreground mt-3 px-1 italic">{visa.notes}</p>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Passport Edit Bottom Sheet ── */}
      <AnimatePresence>
        {editSheet && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
              onClick={() => !saving && setEditSheet(false)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 320 }}
              className="fixed bottom-0 left-0 right-0 z-[51] bg-background rounded-t-3xl shadow-2xl max-h-[92vh] overflow-y-auto"
            >
              <div className="flex justify-center pt-3 pb-0">
                <div className="w-10 h-1 rounded-full bg-border" />
              </div>
              <div className="flex items-center justify-between px-5 pt-4 pb-4 border-b border-border">
                <div>
                  <h2 className="text-base font-bold">Edit Passport</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Your biometric travel document</p>
                </div>
                <button
                  onClick={() => !saving && setEditSheet(false)}
                  className="w-8 h-8 rounded-full bg-muted flex items-center justify-center"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="px-5 pt-5 pb-10 space-y-4">
                {/* Personal Info section */}
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest mb-3">Personal Information</p>
                  <div className="space-y-3">
                    <LabeledInput label="Full Name (as on passport)" value={buf.fullName} onChange={v => setBuf(b => ({ ...b, fullName: v.toUpperCase() }))} placeholder="DELA CRUZ JUAN" icon={User} />
                    <div className="grid grid-cols-2 gap-3">
                      <LabeledInput label="Nationality" value={buf.nationality} onChange={v => setBuf(b => ({ ...b, nationality: v }))} placeholder="Filipino" icon={Flag} />
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1">
                          <User className="h-3 w-3" /> Gender
                        </label>
                        <select
                          value={buf.gender || ''}
                          onChange={e => setBuf(b => ({ ...b, gender: e.target.value }))}
                          className="w-full px-4 py-3 rounded-xl bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground"
                        >
                          <option value="">— Select —</option>
                          <option value="M">Male (M)</option>
                          <option value="F">Female (F)</option>
                          <option value="X">Non-binary (X)</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <LabeledInput label="Date of Birth" value={buf.dateOfBirth} onChange={v => setBuf(b => ({ ...b, dateOfBirth: v }))} type="date" icon={CalendarDays} />
                      <LabeledInput label="Place of Birth" value={buf.placeOfBirth || ''} onChange={v => setBuf(b => ({ ...b, placeOfBirth: v }))} placeholder="Manila" icon={MapPin} />
                    </div>
                  </div>
                </div>

                <div className="h-px bg-border" />

                {/* Document Info section */}
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest mb-3">Document Details</p>
                  <div className="space-y-3">
                    <LabeledInput label="Passport Number" value={buf.passportNumber} onChange={v => setBuf(b => ({ ...b, passportNumber: v.toUpperCase() }))} placeholder="P1234567A" icon={Hash} />
                    <LabeledInput label="Issuing Country" value={buf.issuingCountry} onChange={v => setBuf(b => ({ ...b, issuingCountry: v }))} placeholder="Philippines" icon={Globe} />
                    <div className="grid grid-cols-2 gap-3">
                      <LabeledInput label="Issue Date" value={buf.issueDate} onChange={v => setBuf(b => ({ ...b, issueDate: v }))} type="date" icon={CalendarDays} />
                      <LabeledInput label="Expiry Date" value={buf.expiryDate} onChange={v => setBuf(b => ({ ...b, expiryDate: v }))} type="date" icon={CalendarDays} />
                    </div>
                  </div>
                </div>

                <button
                  onClick={savePassport}
                  disabled={saving || saved}
                  className="w-full py-4 rounded-2xl gradient-brand text-white font-bold text-sm shadow-lg flex items-center justify-center gap-2 disabled:opacity-60 transition-opacity mt-2"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" />
                    : saved ? <Check className="h-4 w-4" />
                    : <Check className="h-4 w-4" />}
                  {saved ? 'Saved!' : saving ? 'Saving…' : 'Save Passport'}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Visa Add/Edit Bottom Sheet ── */}
      <AnimatePresence>
        {visaSheet && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
              onClick={() => !visaSaving && setVisaSheet(false)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 320 }}
              className="fixed bottom-0 left-0 right-0 z-[51] bg-background rounded-t-3xl shadow-2xl max-h-[92vh] overflow-y-auto"
            >
              <div className="flex justify-center pt-3 pb-0">
                <div className="w-10 h-1 rounded-full bg-border" />
              </div>
              <div className="flex items-center justify-between px-5 pt-4 pb-4 border-b border-border">
                <div>
                  <h2 className="text-base font-bold">
                    {trip.visas.find(v => v.id === visaBuf.id) ? 'Edit Visa' : 'Add Visa'}
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Entry permit or visa details</p>
                </div>
                <button
                  onClick={() => !visaSaving && setVisaSheet(false)}
                  className="w-8 h-8 rounded-full bg-muted flex items-center justify-center"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="px-5 pt-5 pb-10 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <LabeledInput label="Country / Territory" value={visaBuf.country} onChange={v => setVisaBuf(b => ({ ...b, country: v }))} placeholder="Hong Kong" icon={Globe} />
                  <LabeledInput label="Visa Type" value={visaBuf.visaType} onChange={v => setVisaBuf(b => ({ ...b, visaType: v }))} placeholder="Tourist" />
                </div>

                <LabeledInput label="Visa Number (optional)" value={visaBuf.visaNumber} onChange={v => setVisaBuf(b => ({ ...b, visaNumber: v }))} placeholder="e.g. V12345678" icon={Hash} />

                <div className="grid grid-cols-2 gap-3">
                  <LabeledInput label="Issue Date" value={visaBuf.issueDate} onChange={v => setVisaBuf(b => ({ ...b, issueDate: v }))} type="date" icon={CalendarDays} />
                  <LabeledInput label="Expiry Date" value={visaBuf.expiryDate} onChange={v => setVisaBuf(b => ({ ...b, expiryDate: v }))} type="date" icon={CalendarDays} />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1">
                    <Shield className="h-3 w-3" /> Status
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['valid', 'pending', 'expired'] as const).map(s => (
                      <button
                        key={s}
                        onClick={() => setVisaBuf(b => ({ ...b, status: s }))}
                        className={`py-3 rounded-xl border text-xs font-bold capitalize transition-colors ${
                          visaBuf.status === s
                            ? s === 'valid' ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-500'
                              : s === 'pending' ? 'bg-amber-500/15 border-amber-500/40 text-amber-500'
                              : 'bg-red-500/15 border-red-500/40 text-red-500'
                            : 'bg-muted border-border text-muted-foreground'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Notes</label>
                  <textarea
                    value={visaBuf.notes}
                    onChange={e => setVisaBuf(b => ({ ...b, notes: e.target.value }))}
                    placeholder="e.g. Visa on arrival, 14 days max stay…"
                    rows={2}
                    className="w-full px-4 py-3 rounded-xl bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                  />
                </div>

                <button
                  onClick={saveVisa}
                  disabled={!visaBuf.country || visaSaving}
                  className="w-full py-4 rounded-2xl gradient-brand text-white font-bold text-sm shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 transition-opacity"
                >
                  {visaSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  {visaSaving ? 'Saving…' : trip.visas.find(v => v.id === visaBuf.id) ? 'Save Changes' : 'Add Visa'}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
