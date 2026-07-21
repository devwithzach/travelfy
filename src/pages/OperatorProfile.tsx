import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { MapPin, Globe, Phone, Star, Package, ArrowLeft, Calendar, DollarSign, Users } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/utils/cn'

// ── Types ──────────────────────────────────────────────────────────────────────

interface OperatorProfile {
  id: string
  fullName: string
  email: string
  role: string
  bio: string
  logoUrl: string
  phone: string
  website: string
}

interface Package {
  id: string
  name: string
  destination: string
  description: string
  durationDays: number
  price: number
  currency: string
  maxSlots: number
  coverImage: string
  availableSlots: number | null
}

interface PackageReview {
  rating: number
  package_id: string
}

// ── Avatar ─────────────────────────────────────────────────────────────────────

function Avatar({ name, logoUrl, size = 64 }: { name: string; logoUrl: string; size?: number }) {
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={name}
        style={{ width: size, height: size }}
        className="rounded-2xl object-cover"
      />
    )
  }
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  return (
    <div
      style={{ width: size, height: size, fontSize: size * 0.35 }}
      className="rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold shrink-0"
    >
      {initials || '?'}
    </div>
  )
}

// ── Package Card ───────────────────────────────────────────────────────────────

function PublicPackageCard({ pkg, onBook }: { pkg: Package; onBook: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-violet-500 to-purple-500" />
        {pkg.coverImage && (
          <img
            src={pkg.coverImage}
            alt={pkg.name}
            className="w-full h-36 object-cover"
            onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
          />
        )}
        <CardContent className="p-4 space-y-3">
          <h3 className="font-bold text-base leading-snug">{pkg.name}</h3>

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-violet-600" />
              {pkg.destination}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 shrink-0 text-violet-600" />
              {pkg.durationDays} {pkg.durationDays === 1 ? 'day' : 'days'}
            </span>
            <span className="flex items-center gap-1 tabular-nums font-semibold text-foreground">
              <DollarSign className="h-3.5 w-3.5 shrink-0 text-violet-600" />
              {pkg.currency} {pkg.price.toLocaleString()}
            </span>
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5 shrink-0" />
              {pkg.availableSlots != null
                ? `${pkg.availableSlots} of ${pkg.maxSlots} slots left`
                : `${pkg.maxSlots} slots`}
            </span>
          </div>

          {pkg.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
              {pkg.description}
            </p>
          )}

          <Button
            size="sm"
            className="w-full mt-1 bg-violet-600 hover:bg-violet-700"
            onClick={onBook}
          >
            Book This
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function OperatorProfile() {
  const { id: operatorId } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<OperatorProfile | null>(null)
  const [packages, setPackages] = useState<Package[]>([])
  const [ratings, setRatings] = useState<Record<string, { avg: number; count: number }>>({})
  const [totalReviews, setTotalReviews] = useState(0)
  const [avgRating, setAvgRating] = useState<number | null>(null)

  useEffect(() => {
    if (!operatorId) return
    ;(async () => {
      setLoading(true)

      const { data: profileData } = await supabase
        .from('user_profiles')
        .select('id, full_name, email, role, bio, logo_url, phone, website')
        .eq('id', operatorId)
        .single()

      if (!profileData || (profileData.role !== 'operator' && profileData.role !== 'admin')) {
        setLoading(false)
        return
      }

      const row = profileData as Record<string, unknown>
      setProfile({
        id: String(row.id ?? ''),
        fullName: String(row.full_name ?? ''),
        email: String(row.email ?? ''),
        role: String(row.role ?? ''),
        bio: String(row.bio ?? ''),
        logoUrl: String(row.logo_url ?? ''),
        phone: String(row.phone ?? ''),
        website: String(row.website ?? ''),
      })

      const { data: pkgData } = await supabase
        .from('tour_packages')
        .select('*')
        .eq('operator_id', operatorId)
        .eq('status', 'published')
        .order('created_at', { ascending: false })

      const pkgs: Package[] = (pkgData ?? []).map(r => {
        const p = r as Record<string, unknown>
        return {
          id: String(p.id ?? ''),
          name: String(p.name ?? ''),
          destination: String(p.destination ?? ''),
          description: String(p.description ?? ''),
          durationDays: Number(p.duration_days ?? 1),
          price: Number(p.price ?? 0),
          currency: String(p.currency ?? 'PHP'),
          maxSlots: Number(p.max_slots ?? 10),
          coverImage: String(p.cover_image ?? ''),
          availableSlots: p.available_slots != null ? Number(p.available_slots) : null,
        }
      })
      setPackages(pkgs)

      if (pkgs.length > 0) {
        const { data: reviewData } = await supabase
          .from('package_reviews')
          .select('rating, package_id')
          .in('package_id', pkgs.map(p => p.id))

        const reviews = (reviewData ?? []) as PackageReview[]
        const map: Record<string, { sum: number; count: number }> = {}
        reviews.forEach(r => {
          const key = String(r.package_id)
          if (!map[key]) map[key] = { sum: 0, count: 0 }
          map[key].sum += r.rating
          map[key].count++
        })
        const ratingMap: Record<string, { avg: number; count: number }> = {}
        Object.entries(map).forEach(([k, v]) => {
          ratingMap[k] = { avg: Math.round((v.sum / v.count) * 10) / 10, count: v.count }
        })
        setRatings(ratingMap)

        if (reviews.length > 0) {
          const sum = reviews.reduce((acc, r) => acc + r.rating, 0)
          setAvgRating(Math.round((sum / reviews.length) * 10) / 10)
          setTotalReviews(reviews.length)
        }
      }

      setLoading(false)
    })()
  }, [operatorId])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] px-8 text-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
          <Package className="h-8 w-8 text-muted-foreground" />
        </div>
        <h2 className="text-lg font-bold">Operator Not Found</h2>
        <p className="text-sm text-muted-foreground max-w-xs">
          This operator profile does not exist or is not publicly available.
        </p>
        <Button variant="outline" onClick={() => navigate(-1)}>
          Go Back
        </Button>
      </div>
    )
  }

  const websiteHref = profile.website
    ? profile.website.startsWith('http') ? profile.website : `https://${profile.website}`
    : null

  return (
    <div className="pb-24 max-w-lg mx-auto">
      {/* Back button */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm px-4 pt-4 pb-2">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors min-h-[44px]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
      </div>

      <div className="px-4 space-y-4">
        {/* Profile header card */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
          <Card>
            <CardContent className="p-5 space-y-4">
              {/* Avatar + name + badge */}
              <div className="flex items-start gap-4">
                <Avatar name={profile.fullName} logoUrl={profile.logoUrl} size={72} />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <h1 className="text-xl font-bold leading-tight truncate">{profile.fullName || 'Operator'}</h1>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge className="bg-violet-600 text-white border-violet-600 text-[11px]">
                      Verified Operator
                    </Badge>
                    {profile.role === 'admin' && (
                      <Badge variant="secondary" className="text-[11px]">Admin</Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Bio */}
              {profile.bio && (
                <p className="text-sm text-muted-foreground leading-relaxed">{profile.bio}</p>
              )}

              {/* Contact links */}
              <div className="space-y-2">
                {profile.phone && (
                  <a
                    href={`tel:${profile.phone}`}
                    className="flex items-center gap-2 text-sm text-foreground hover:text-violet-600 transition-colors min-h-[44px]"
                  >
                    <Phone className="h-4 w-4 text-violet-600 shrink-0" />
                    {profile.phone}
                  </a>
                )}
                {websiteHref && (
                  <a
                    href={websiteHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-violet-600 hover:underline min-h-[44px]"
                  >
                    <Globe className="h-4 w-4 shrink-0" />
                    {profile.website}
                  </a>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2">
          <Card>
            <CardContent className="p-3 flex flex-col items-center gap-1">
              <Package className="h-4 w-4 text-violet-600" />
              <span className="text-lg font-bold tabular-nums leading-none">{packages.length}</span>
              <span className="text-[10px] text-muted-foreground text-center leading-tight">Packages</span>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 flex flex-col items-center gap-1">
              <Star className="h-4 w-4 text-amber-500" />
              <span className="text-lg font-bold tabular-nums leading-none">
                {avgRating != null ? avgRating : '—'}
              </span>
              <span className="text-[10px] text-muted-foreground text-center leading-tight">Avg Rating</span>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 flex flex-col items-center gap-1">
              <MapPin className="h-4 w-4 text-emerald-600" />
              <span className="text-lg font-bold tabular-nums leading-none">{totalReviews}</span>
              <span className="text-[10px] text-muted-foreground text-center leading-tight">Reviews</span>
            </CardContent>
          </Card>
        </div>

        {/* Packages */}
        {packages.length === 0 ? (
          <div className="flex flex-col items-center py-12 gap-3 text-center">
            <Package className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No published packages yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Tour Packages
            </h2>
            {packages.map(pkg => (
              <div key={pkg.id}>
                <PublicPackageCard
                  pkg={pkg}
                  onBook={() => navigate('/tours')}
                />
                {ratings[pkg.id] && (
                  <div className={cn('flex items-center gap-1 px-1 pt-1.5 pb-0.5 text-xs text-amber-600 font-semibold')}>
                    <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                    {ratings[pkg.id].avg}
                    <span className="text-muted-foreground font-normal">({ratings[pkg.id].count})</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
