import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Camera, Loader2, Check, X, ScanLine, AlertCircle, RefreshCw, ImageIcon } from 'lucide-react'
import type { PassportInfo } from '@/types'

type ScanResult = Partial<PassportInfo>

interface Props {
  open: boolean
  onClose: () => void
  onApply: (result: ScanResult) => void
}

// YYMMDD → YYYY-MM-DD
function mrzDate(yymmdd: string): string {
  if (!yymmdd || yymmdd.length !== 6) return ''
  const yy = parseInt(yymmdd.slice(0, 2), 10)
  const mm = yymmdd.slice(2, 4)
  const dd = yymmdd.slice(4, 6)
  const year = yy > 30 ? 1900 + yy : 2000 + yy
  return `${year}-${mm}-${dd}`
}

const NAT_MAP: Record<string, string> = {
  PHL: 'Filipino', USA: 'American', GBR: 'British', AUS: 'Australian',
  CAN: 'Canadian', DEU: 'German', FRA: 'French', JPN: 'Japanese',
  CHN: 'Chinese', KOR: 'Korean', SGP: 'Singaporean', MYS: 'Malaysian',
  IND: 'Indian', IDN: 'Indonesian', THA: 'Thai', VNM: 'Vietnamese',
  HKG: 'Chinese (HK)', MAC: 'Chinese (Macau)', NZL: 'New Zealander',
  ZAF: 'South African', BRA: 'Brazilian', ARG: 'Argentine', MEX: 'Mexican',
  ITA: 'Italian', ESP: 'Spanish', PRT: 'Portuguese', NLD: 'Dutch',
  BEL: 'Belgian', CHE: 'Swiss', AUT: 'Austrian', SWE: 'Swedish',
  NOR: 'Norwegian', DNK: 'Danish', FIN: 'Finnish', RUS: 'Russian',
  UKR: 'Ukrainian', POL: 'Polish', CZE: 'Czech', HUN: 'Hungarian',
  PAK: 'Pakistani', BGD: 'Bangladeshi', LKA: 'Sri Lankan', NPL: 'Nepali',
  SAU: 'Saudi', ARE: 'Emirati', QAT: 'Qatari', KWT: 'Kuwaiti',
}

const COUNTRY_MAP: Record<string, string> = {
  PHL: 'Philippines', USA: 'United States', GBR: 'United Kingdom',
  AUS: 'Australia', CAN: 'Canada', DEU: 'Germany', FRA: 'France',
  JPN: 'Japan', CHN: 'China', KOR: 'South Korea', SGP: 'Singapore',
  MYS: 'Malaysia', IND: 'India', IDN: 'Indonesia', THA: 'Thailand',
  VNM: 'Vietnam', HKG: 'Hong Kong', MAC: 'Macao', NZL: 'New Zealand',
  ZAF: 'South Africa', BRA: 'Brazil', ARG: 'Argentina', MEX: 'Mexico',
  ITA: 'Italy', ESP: 'Spain', PRT: 'Portugal', NLD: 'Netherlands',
  BEL: 'Belgium', CHE: 'Switzerland', AUT: 'Austria', SWE: 'Sweden',
  NOR: 'Norway', DNK: 'Denmark', FIN: 'Finland', RUS: 'Russia',
  SAU: 'Saudi Arabia', ARE: 'United Arab Emirates', QAT: 'Qatar', KWT: 'Kuwait',
}

function ResultRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null
  return (
    <div className="flex items-start justify-between py-2.5 border-b border-border last:border-0">
      <span className="text-xs text-muted-foreground w-28 shrink-0">{label}</span>
      <span className="text-xs font-semibold text-right flex-1 truncate">{value}</span>
    </div>
  )
}

export default function PassportScanner({ open, onClose, onApply }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [scanning, setScanning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ScanResult | null>(null)
  const [partialNote, setPartialNote] = useState<string | null>(null)

  const reset = () => {
    setPreview(null)
    setScanning(false)
    setProgress(0)
    setError(null)
    setResult(null)
    setPartialNote(null)
  }

  const handleClose = () => { reset(); onClose() }
  const handleApply = () => { if (result) { onApply(result); reset(); onClose() } }

  // Scale the full image 2× and boost contrast so Tesseract reads OCR-B.
  // We do NOT crop here — let the MRZ line filter find the strip wherever it lands.
  const preprocessImage = (file: File): Promise<Blob> =>
    new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        const scale = 2
        const canvas = document.createElement('canvas')
        canvas.width = img.width * scale
        canvas.height = img.height * scale
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

        // Grayscale + contrast boost (LSTM prefers grayscale over pure B&W)
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const d = imageData.data
        for (let i = 0; i < d.length; i += 4) {
          const gray = Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2])
          const contrast = Math.min(255, Math.max(0, ((gray - 128) * 2) + 128))
          d[i] = d[i + 1] = d[i + 2] = contrast
        }
        ctx.putImageData(imageData, 0, 0)
        canvas.toBlob(b => b ? resolve(b) : reject(new Error('canvas toBlob failed')), 'image/png')
      }
      img.onerror = reject
      img.src = URL.createObjectURL(file)
    })

  // MRZ TD3 check digit algorithm
  const checkDigit = (s: string): number => {
    const W = [7, 3, 1]
    const v = (c: string) => {
      if (c === '<') return 0
      if (c >= '0' && c <= '9') return parseInt(c)
      return c.charCodeAt(0) - 55
    }
    return s.split('').reduce((sum, c, i) => sum + v(c) * W[i % 3], 0) % 10
  }

  // Fix common OCR-B digit misreads using MRZ field structure.
  // Positions in line 2 that MUST be digits: 9,13-19,21-27,42,43.
  const fixMrzLine2 = (line: string): string => {
    const digitOnly: Record<string, string> = {
      O: '0', Q: '0', D: '0', G: '6', S: '5', Z: '2',
      I: '1', L: '1', T: '1', B: '8', A: '4', E: '6',
    }
    const forceDigit = new Set([9, 13, 14, 15, 16, 17, 18, 19, 21, 22, 23, 24, 25, 26, 27, 42, 43])
    return line.split('').map((c, i) =>
      forceDigit.has(i) && digitOnly[c] ? digitOnly[c] : c
    ).join('')
  }

  const scan = async (file: File) => {
    const url = URL.createObjectURL(file)
    setPreview(url)
    setScanning(true)
    setError(null)
    setResult(null)
    setProgress(0)

    try {
      const [Tesseract, processedBlob] = await Promise.all([
        import('tesseract.js').then(m => m.default ?? m),
        preprocessImage(file),
      ])

      const worker = await Tesseract.createWorker('eng', 1, {
        logger: (m: any) => {
          if (m.status === 'recognizing text') setProgress(Math.round(m.progress * 100))
        },
      })

      await worker.setParameters({
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<',
        tessedit_pageseg_mode: '11' as any,
      })

      const { data: { text } } = await worker.recognize(processedBlob)
      await worker.terminate()

      console.log('[MRZ raw OCR]', text)

      // ── 1. Extract printed biographical dates (DDMMMYYYY) ──────────────────
      // The biographical page uses regular fonts — eng reads these accurately.
      // OCR-B in the MRZ strip is mangled; ignore MRZ dates and use these.
      const MONTH: Record<string, string> = {
        JAN:'01', FEB:'02', MAR:'03', APR:'04', MAY:'05', JUN:'06',
        JUL:'07', AUG:'08', SEP:'09', OCT:'10', NOV:'11', DEC:'12',
      }
      const upperText = text.toUpperCase()
      const dateHits = [...upperText.matchAll(/\b(\d{2})(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)(\d{4})\b/g)]
        .map(m => `${m[3]}-${MONTH[m[2]]}-${m[1]}`)
        .filter((d, i, a) => a.indexOf(d) === i)   // dedupe
        .sort()
      const printedDob    = dateHits.find(d => +d.slice(0, 4) < 2010)
      const printedExpiry = dateHits.find(d => +d.slice(0, 4) >= 2020)

      // ── 2. Find MRZ line 1 (name + nationality) ───────────────────────────
      // eng reads OCR-B '<' as space — convert spaces before stripping.
      const cleanLine = (l: string) =>
        l.toUpperCase().replace(/ /g, '<').replace(/[^A-Z0-9<]/g, '').trim()

      const allCleaned = text.split('\n').map(cleanLine)

      const line1 = allCleaned
        .filter(l => l.startsWith('P<') && l.length >= 40)
        .sort((a, b) => b.length - a.length)[0]

      const line2Raw = allCleaned
        .filter(l => !l.startsWith('P<') && l.length >= 40 && /\d{6}/.test(l))
        .sort((a, b) => b.length - a.length)[0]

      if (!line1 && !printedDob) {
        setError("No passport data detected. Make sure the full data page is visible and in focus.")
        setScanning(false)
        return
      }

      // ── 3. Parse what we can ───────────────────────────────────────────────
      let scanned: ScanResult = {}
      let isPartial = true

      // Name + nationality always from line 1
      if (line1) {
        const l1 = line1.padEnd(44, '<').slice(0, 44)
        const issuingState = l1.slice(2, 5).replace(/<+$/g, '')
        const namePart = l1.slice(5, 44)
        const [lastRaw, ...givenParts] = namePart.split('<<')
        const lastName = lastRaw.replace(/</g, ' ').trim()
        const firstName = givenParts.join(' ').replace(/</g, ' ').trim()
        const fullName = [lastName, firstName].filter(Boolean).join(' ') || undefined
        scanned = {
          ...(fullName && { fullName }),
          passportType: 'P',
          ...(issuingState && { nationality: NAT_MAP[issuingState] || issuingState }),
          ...(issuingState && { issuingCountry: COUNTRY_MAP[issuingState] || issuingState }),
        }

        // Try full 2-line MRZ parse for doc number + sex (still worth a shot)
        if (line2Raw) {
          try {
            const l2 = fixMrzLine2(line2Raw.padEnd(44, '<').slice(0, 44))
            const { parse: p } = await import('mrz')
            const parsed = p([l1, l2])
            const f = parsed.fields
            if (f.documentNumber) scanned.passportNumber = String(f.documentNumber).toUpperCase()
            if (f.sex === 'M' || f.sex === 'F') scanned.gender = f.sex
            isPartial = false
          } catch { /* keep partial */ }
        }
      }

      // Prefer printed biographical dates over MRZ OCR-B dates (more accurate)
      if (printedDob)    scanned.dateOfBirth = printedDob
      if (printedExpiry) scanned.expiryDate  = printedExpiry

      setResult(scanned)
      const hasDates = !!(scanned.dateOfBirth || scanned.expiryDate)
      setPartialNote(
        isPartial
          ? hasDates
            ? 'Partial scan — name, nationality and dates were read. Enter passport number and sex manually.'
            : 'Partial scan — name and nationality were read. Enter remaining fields manually.'
          : null
      )
    } catch (err) {
      console.error('Passport scan error:', err)
      setError('Scan failed. Check your internet connection and try again.')
    } finally {
      setScanning(false)
    }
  }

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
                  <h2 className="text-base font-bold">Scan Passport</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Auto-fill from MRZ strip</p>
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

              {/* Step 1 — no photo yet */}
              {!preview && (
                <div className="space-y-4">
                  {/* Visual guide */}
                  <div className="rounded-2xl border-2 border-dashed border-border bg-muted/40 p-6 flex flex-col items-center gap-3 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center">
                      <Camera className="h-8 w-8 text-indigo-500" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">Photo the MRZ Strip</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        The two lines of text at the bottom of your passport's photo page
                      </p>
                    </div>

                    {/* MRZ illustration */}
                    <div className="w-full bg-slate-900 rounded-xl px-3 py-2">
                      <p className="font-mono text-[9px] text-green-400/70 tracking-[0.05em] leading-relaxed">
                        P&lt;PHLSURNAME&lt;&lt;GIVEN&lt;NAMES&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;
                      </p>
                      <div className="h-px bg-green-400/20 my-1" />
                      <p className="font-mono text-[9px] text-green-400/70 tracking-[0.05em] leading-relaxed">
                        P12345678&lt;PHL9001011M2512310&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;6
                      </p>
                      {/* Scanner line animation */}
                      <motion.div
                        animate={{ y: [0, 20, 0] }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                        className="h-0.5 bg-green-400/60 rounded-full mt-1"
                      />
                    </div>
                  </div>

                  {/* Tips */}
                  <div className="space-y-2">
                    {[
                      'Zoom in close on the bottom two lines of text (the MRZ strip)',
                      'Bright, even light — no flash glare on the page',
                      'Keep steady and in focus — blurry kills accuracy',
                    ].map((tip, i) => (
                      <div key={i} className="flex items-center gap-2.5 text-xs text-muted-foreground">
                        <div className="w-4 h-4 rounded-full bg-indigo-500/10 flex items-center justify-center shrink-0">
                          <span className="text-[9px] font-bold text-indigo-500">{i + 1}</span>
                        </div>
                        {tip}
                      </div>
                    ))}
                  </div>

                  {/* Hidden file input */}
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) scan(f) }}
                  />

                  <div className="flex gap-3">
                    <button
                      onClick={() => fileRef.current?.click()}
                      className="flex-1 py-3.5 rounded-2xl bg-indigo-600 text-white font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-lg shadow-indigo-500/25"
                    >
                      <Camera className="h-4 w-4" />
                      Take Photo
                    </button>
                    <button
                      onClick={() => {
                        // Upload from gallery (no capture attribute)
                        const inp = document.createElement('input')
                        inp.type = 'file'
                        inp.accept = 'image/*'
                        inp.onchange = (e: any) => { const f = e.target.files?.[0]; if (f) scan(f) }
                        inp.click()
                      }}
                      className="flex-1 py-3.5 rounded-2xl bg-muted border border-border font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
                    >
                      <ImageIcon className="h-4 w-4" />
                      Gallery
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2 — scanning in progress */}
              {preview && scanning && (
                <div className="space-y-4">
                  <div className="relative rounded-2xl overflow-hidden aspect-video bg-muted">
                    <img src={preview} className="w-full h-full object-cover" alt="Passport scan" />
                    <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center gap-3">
                      <div className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
                        <Loader2 className="h-7 w-7 text-white animate-spin" />
                      </div>
                      <div className="text-center">
                        <p className="text-white font-semibold text-sm">Scanning…</p>
                        <p className="text-white/60 text-xs mt-0.5">{progress}% complete</p>
                      </div>
                    </div>
                    {/* Animated scan line */}
                    <motion.div
                      animate={{ y: ['0%', '100%', '0%'] }}
                      transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
                      className="absolute left-0 right-0 h-0.5 bg-green-400/70 shadow-[0_0_8px_2px_rgba(74,222,128,0.5)]"
                    />
                  </div>
                  {/* Progress bar */}
                  <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                    <motion.div
                      className="h-full bg-indigo-500 rounded-full"
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                  <p className="text-xs text-center text-muted-foreground">
                    Reading MRZ — this takes a few seconds…
                  </p>
                </div>
              )}

              {/* Step 3a — error */}
              {preview && !scanning && error && (
                <div className="space-y-4">
                  <div className="relative rounded-2xl overflow-hidden aspect-video bg-muted opacity-60">
                    <img src={preview} className="w-full h-full object-cover" alt="Passport scan" />
                  </div>
                  <div className="flex items-start gap-3 px-4 py-3 rounded-2xl bg-red-500/10 border border-red-500/20">
                    <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                    <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                  </div>
                  <button
                    onClick={reset}
                    className="w-full py-3.5 rounded-2xl bg-muted border border-border font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Try Again
                  </button>
                </div>
              )}

              {/* Step 3b — results */}
              {preview && !scanning && result && (
                <div className="space-y-4">
                  <div className="relative rounded-2xl overflow-hidden aspect-video bg-muted">
                    <img src={preview} className="w-full h-full object-cover" alt="Passport scan" />
                    <div className="absolute top-2 right-2 flex items-center gap-1.5 bg-emerald-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-full">
                      <Check className="h-3 w-3" /> MRZ Read
                    </div>
                  </div>

                  {/* Extracted fields */}
                  <div className="rounded-2xl border border-border bg-card overflow-hidden">
                    <div className="px-4 py-3 border-b border-border bg-muted/30">
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Extracted Data — Review Before Saving</p>
                    </div>
                    <div className="px-4 divide-y divide-border">
                      <ResultRow label="Full Name" value={result.fullName} />
                      <ResultRow label="Passport No." value={result.passportNumber} />
                      <ResultRow label="Nationality" value={result.nationality} />
                      <ResultRow label="Date of Birth" value={result.dateOfBirth} />
                      <ResultRow label="Expiry Date" value={result.expiryDate} />
                      <ResultRow label="Gender" value={result.gender === 'M' ? 'Male' : result.gender === 'F' ? 'Female' : undefined} />
                      <ResultRow label="Issuing Country" value={result.issuingCountry} />
                      <ResultRow label="Type" value={result.passportType} />
                    </div>
                  </div>

                  {partialNote ? (
                    <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
                      <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                      <p className="text-xs text-amber-700 dark:text-amber-400">{partialNote}</p>
                    </div>
                  ) : (
                    <p className="text-xs text-center text-muted-foreground px-2">
                      OCR isn't perfect — double-check the fields above before saving.
                    </p>
                  )}

                  <div className="flex gap-3">
                    <button
                      onClick={reset}
                      className="flex-1 py-3.5 rounded-2xl bg-muted border border-border font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Rescan
                    </button>
                    <button
                      onClick={handleApply}
                      className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-500 to-blue-600 text-white font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-lg shadow-indigo-500/25"
                    >
                      <Check className="h-4 w-4" />
                      Use This Data
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
