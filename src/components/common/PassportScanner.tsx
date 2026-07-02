import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Camera, X, Check, ImageIcon, ScanLine } from 'lucide-react'
import type { PassportInfo } from '@/types'

type ScanResult = Partial<PassportInfo>

interface Props {
  open: boolean
  onClose: () => void
  onApply: (result: ScanResult) => void
}

const NATIONALITIES = [
  'Filipino', 'American', 'British', 'Australian', 'Canadian', 'German',
  'French', 'Japanese', 'Chinese', 'Korean', 'Singaporean', 'Malaysian',
  'Indian', 'Indonesian', 'Thai', 'Vietnamese', 'New Zealander',
]

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</label>
      {children}
    </div>
  )
}

const inputCls = "w-full px-3 py-2.5 rounded-xl bg-muted border border-border text-base focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-colors"

export default function PassportScanner({ open, onClose, onApply }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [form, setForm] = useState<ScanResult>({})

  const set = (k: keyof ScanResult, v: string) =>
    setForm(f => ({ ...f, [k]: v || undefined }))

  const reset = () => { setPreview(null); setForm({}) }
  const handleClose = () => { reset(); onClose() }

  const handleApply = () => {
    if (Object.keys(form).length) { onApply(form); reset(); onClose() }
  }

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) setPreview(URL.createObjectURL(f))
  }

  const hasData = Object.values(form).some(v => v)

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm"
            onClick={handleClose}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 320 }}
            className="fixed bottom-0 left-0 right-0 z-[61] bg-background rounded-t-3xl shadow-2xl max-h-[92vh] overflow-y-auto"
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-0">
              <div className="w-10 h-1 rounded-full bg-border" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-4 pb-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/15 flex items-center justify-center">
                  <ScanLine className="h-4.5 w-4.5 text-indigo-500" />
                </div>
                <div>
                  <h2 className="text-base font-bold">Passport Details</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Upload photo for reference, then fill in fields</p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="w-8 h-8 rounded-full bg-muted flex items-center justify-center"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="px-5 pt-5 pb-10 space-y-5">

              {/* Photo upload */}
              <div>
                {preview ? (
                  <div className="relative rounded-2xl overflow-hidden aspect-video bg-muted">
                    <img src={preview} className="w-full h-full object-cover" alt="Passport" />
                    <button
                      onClick={() => { setPreview(null); if (fileRef.current) fileRef.current.value = '' }}
                      className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center"
                    >
                      <X className="h-3.5 w-3.5 text-white" />
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => fileRef.current?.click()}
                      className="flex-1 py-3 rounded-2xl bg-muted border border-dashed border-border text-sm flex items-center justify-center gap-2 text-muted-foreground active:scale-[0.98] transition-all"
                    >
                      <Camera className="h-4 w-4" />
                      Take Photo
                    </button>
                    <button
                      onClick={() => {
                        const inp = document.createElement('input')
                        inp.type = 'file'
                        inp.accept = 'image/*'
                        inp.onchange = (e: any) => {
                          const f = e.target.files?.[0]
                          if (f) setPreview(URL.createObjectURL(f))
                        }
                        inp.click()
                      }}
                      className="flex-1 py-3 rounded-2xl bg-muted border border-dashed border-border text-sm flex items-center justify-center gap-2 text-muted-foreground active:scale-[0.98] transition-all"
                    >
                      <ImageIcon className="h-4 w-4" />
                      Gallery
                    </button>
                  </div>
                )}
                <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhoto} />
              </div>

              {/* Form fields */}
              <div className="space-y-4">

                <Field label="Full Name">
                  <input
                    className={inputCls}
                    type="text"
                    placeholder="SURNAME GIVEN NAMES"
                    value={form.fullName ?? ''}
                    onChange={e => set('fullName', e.target.value)}
                  />
                </Field>

                <Field label="Passport Number">
                  <input
                    className={inputCls}
                    type="text"
                    placeholder="e.g. P6926895B"
                    value={form.passportNumber ?? ''}
                    onChange={e => set('passportNumber', e.target.value.toUpperCase())}
                  />
                </Field>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Nationality">
                    <input
                      className={inputCls}
                      type="text"
                      placeholder="e.g. Filipino"
                      list="nationalities"
                      value={form.nationality ?? ''}
                      onChange={e => set('nationality', e.target.value)}
                    />
                    <datalist id="nationalities">
                      {NATIONALITIES.map(n => <option key={n} value={n} />)}
                    </datalist>
                  </Field>

                  <Field label="Gender">
                    <select
                      className={inputCls}
                      value={form.gender ?? ''}
                      onChange={e => set('gender', e.target.value)}
                    >
                      <option value="">—</option>
                      <option value="M">Male</option>
                      <option value="F">Female</option>
                    </select>
                  </Field>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Date of Birth">
                    <input
                      className={inputCls}
                      type="date"
                      value={form.dateOfBirth ?? ''}
                      onChange={e => set('dateOfBirth', e.target.value)}
                    />
                  </Field>

                  <Field label="Place of Birth">
                    <input
                      className={inputCls}
                      type="text"
                      placeholder="City"
                      value={form.placeOfBirth ?? ''}
                      onChange={e => set('placeOfBirth', e.target.value)}
                    />
                  </Field>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Issue Date">
                    <input
                      className={inputCls}
                      type="date"
                      value={form.issueDate ?? ''}
                      onChange={e => set('issueDate', e.target.value)}
                    />
                  </Field>

                  <Field label="Expiry Date">
                    <input
                      className={inputCls}
                      type="date"
                      value={form.expiryDate ?? ''}
                      onChange={e => set('expiryDate', e.target.value)}
                    />
                  </Field>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Issuing Country">
                    <input
                      className={inputCls}
                      type="text"
                      placeholder="e.g. Philippines"
                      value={form.issuingCountry ?? ''}
                      onChange={e => set('issuingCountry', e.target.value)}
                    />
                  </Field>

                  <Field label="Issuing Authority">
                    <input
                      className={inputCls}
                      type="text"
                      placeholder="e.g. DFA"
                      value={form.issuingAuthority ?? ''}
                      onChange={e => set('issuingAuthority', e.target.value)}
                    />
                  </Field>
                </div>

              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <button
                  onClick={handleClose}
                  className="flex-1 py-3.5 rounded-2xl bg-muted border border-border font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
                >
                  <X className="h-4 w-4" />
                  Cancel
                </button>
                <button
                  onClick={handleApply}
                  disabled={!hasData}
                  className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-500 to-blue-600 text-white font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-lg shadow-indigo-500/25 disabled:opacity-40 disabled:pointer-events-none"
                >
                  <Check className="h-4 w-4" />
                  Save Details
                </button>
              </div>

            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
