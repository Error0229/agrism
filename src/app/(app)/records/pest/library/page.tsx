'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useSearchParams } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ArrowLeft,
  Bug,
  Search,
  Filter,
  ImageIcon,
  Microscope,
  BookOpen,
  Leaf,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { usePestReferenceLibrary } from '@/hooks/use-pest-reference-images'
import { PestReferenceDetail } from '@/components/pest/pest-reference-detail'

// === Labels ===

const SOURCE_LABELS: Record<string, string> = {
  moa: '\u8fb2\u696d\u90e8',
  eppo: 'EPPO',
}

const SOURCE_COLORS: Record<string, string> = {
  moa: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-700',
  eppo: 'bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-900/40 dark:text-sky-300 dark:border-sky-700',
}

const HARM_PART_LABELS: Record<string, string> = {
  root: '\u6839\u90e8',
  stem: '\u8396\u90e8',
  leaf: '\u8449\u7247',
  flower: '\u82b1\u6735',
  fruit: '\u679c\u5be6',
  plant: '\u5168\u682a',
}

const HARM_PART_SHORT: Record<string, string> = {
  root: '\u6839',
  stem: '\u8396',
  leaf: '\u8449',
  flower: '\u82b1',
  fruit: '\u679c',
  plant: '\u5168\u682a',
}

const FEEDING_METHOD_LABELS: Record<string, string> = {
  chewing: '\u5480\u56bc\u5f0f',
  piercing_sucking: '\u523a\u5438\u5f0f',
}

export default function PestReferenceLibraryPage() {
  const searchParams = useSearchParams()
  const initialSearch = searchParams.get('search') || searchParams.get('crop') || ''

  const allRecords = usePestReferenceLibrary()
  const isLoading = allRecords === undefined

  const [searchQuery, setSearchQuery] = useState(initialSearch)
  const [sourceFilter, setSourceFilter] = useState<string>('all')
  const [partFilter, setPartFilter] = useState<string>('all')
  const [orderFilter, setOrderFilter] = useState<string>('all')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null)
  const [thumbLoaded, setThumbLoaded] = useState<Record<string, boolean>>({})

  // Derive unique filter options
  const filterOptions = useMemo(() => {
    if (!allRecords) return { orders: [], parts: [] }
    const orderSet = new Set<string>()
    const partSet = new Set<string>()
    for (const rec of allRecords) {
      if (rec.orderCh) orderSet.add(rec.orderCh)
      if (rec.harmParts) {
        for (const p of rec.harmParts) partSet.add(p)
      }
    }
    return {
      orders: [...orderSet].sort(),
      parts: [...partSet].sort(),
    }
  }, [allRecords])

  // Filter and search
  const filteredRecords = useMemo(() => {
    if (!allRecords) return []
    let results = allRecords

    // Source filter
    if (sourceFilter !== 'all') {
      results = results.filter((r) => r.source === sourceFilter)
    }

    // Affected part filter
    if (partFilter !== 'all') {
      results = results.filter(
        (r) => r.harmParts && r.harmParts.includes(partFilter)
      )
    }

    // Taxonomic order filter
    if (orderFilter !== 'all') {
      results = results.filter((r) => r.orderCh === orderFilter)
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      results = results.filter(
        (r) =>
          r.pestNameCh.toLowerCase().includes(q) ||
          (r.pestNameEn && r.pestNameEn.toLowerCase().includes(q)) ||
          (r.pestNameScientific && r.pestNameScientific.toLowerCase().includes(q)) ||
          (r.cropName && r.cropName.toLowerCase().includes(q))
      )
    }

    return results
  }, [allRecords, sourceFilter, partFilter, orderFilter, searchQuery])

  const hasActiveFilters =
    sourceFilter !== 'all' || partFilter !== 'all' || orderFilter !== 'all' || searchQuery.trim() !== ''

  function clearFilters() {
    setSearchQuery('')
    setSourceFilter('all')
    setPartFilter('all')
    setOrderFilter('all')
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Navigation */}
      <Link href="/records/pest">
        <Button
          variant="ghost"
          size="sm"
          className="gap-1 -ml-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          {'\u75c5\u87f2\u5bb3\u89c0\u5bdf\u7d00\u9304'}
        </Button>
      </Link>

      {/* Hero header */}
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-card via-card to-muted/30">
        {/* Decorative background pattern */}
        <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse">
              <circle cx="16" cy="16" r="1" fill="currentColor" />
            </pattern>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        <div className="relative px-5 py-6 sm:px-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 size-12 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center border border-amber-200/50 dark:border-amber-700/50">
              <BookOpen className="size-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                {'\u75c5\u87f2\u5bb3\u5716\u9451'}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {'\u700f\u89bd\u8fb2\u696d\u90e8\u8207 EPPO \u75c5\u87f2\u5bb3\u53c3\u8003\u5716\u7247\u5eab\uff0c\u5354\u52a9\u7530\u9593\u8a3a\u65b7\u8207\u9632\u6cbb'}
              </p>
              {!isLoading && allRecords && (
                <div className="flex items-center gap-3 mt-3">
                  <Badge variant="secondary" className="text-xs gap-1">
                    <Bug className="size-3" />
                    {allRecords.length} {'\u7a2e\u75c5\u87f2\u5bb3'}
                  </Badge>
                  <Badge variant="secondary" className="text-xs gap-1">
                    <ImageIcon className="size-3" />
                    {allRecords.reduce((sum, r) => sum + r.images.length, 0)} {'\u5f35\u5716\u7247'}
                  </Badge>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={'\u641c\u5c0b\u75c5\u87f2\u5bb3\u540d\u7a31...'}
            className="pl-9"
          />
        </div>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="w-[120px]">
              <Filter className="size-3.5 mr-1 text-muted-foreground" />
              <SelectValue placeholder={'\u4f86\u6e90'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{'\u5168\u90e8\u4f86\u6e90'}</SelectItem>
              <SelectItem value="moa">{'\u8fb2\u696d\u90e8'}</SelectItem>
              <SelectItem value="eppo">EPPO</SelectItem>
            </SelectContent>
          </Select>

          <Select value={partFilter} onValueChange={setPartFilter}>
            <SelectTrigger className="w-[120px]">
              <Leaf className="size-3.5 mr-1 text-muted-foreground" />
              <SelectValue placeholder={'\u5371\u5bb3\u90e8\u4f4d'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{'\u5168\u90e8\u90e8\u4f4d'}</SelectItem>
              {filterOptions.parts.map((part) => (
                <SelectItem key={part} value={part}>
                  {HARM_PART_LABELS[part] ?? part}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {filterOptions.orders.length > 0 && (
            <Select value={orderFilter} onValueChange={setOrderFilter}>
              <SelectTrigger className="w-[130px]">
                <Microscope className="size-3.5 mr-1 text-muted-foreground" />
                <SelectValue placeholder={'\u5206\u985e\u76ee'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{'\u5168\u90e8\u5206\u985e'}</SelectItem>
                {filterOptions.orders.map((order) => (
                  <SelectItem key={order} value={order}>
                    {order}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" />
              {'\u6e05\u9664\u7be9\u9078'}
            </Button>
          )}
        </div>
      </div>

      {/* Results count */}
      {!isLoading && hasActiveFilters && (
        <p className="text-sm text-muted-foreground">
          {'\u627e\u5230'} {filteredRecords.length} {'\u7b46\u7d50\u679c'}
        </p>
      )}

      {/* Loading */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-xl border overflow-hidden">
              <Skeleton className="aspect-[4/3] w-full" />
              <div className="p-3 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Bug className="mb-4 size-12 text-muted-foreground/30" />
          <p className="text-muted-foreground">
            {hasActiveFilters
              ? '\u7121\u7b26\u5408\u689d\u4ef6\u7684\u75c5\u87f2\u5bb3\u8cc7\u6599'
              : '\u5c1a\u7121\u75c5\u87f2\u5bb3\u53c3\u8003\u5716\u7247'}
          </p>
          {hasActiveFilters && (
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={clearFilters}
            >
              {'\u6e05\u9664\u7be9\u9078'}
            </Button>
          )}
        </div>
      ) : (
        /* === Card Grid === */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {filteredRecords.map((rec) => {
            const firstImage = rec.images[0]
            if (!firstImage) return null

            return (
              <button
                key={rec._id}
                onClick={() => setSelectedRecord(rec)}
                className={cn(
                  'group relative overflow-hidden rounded-xl border border-border/60',
                  'bg-card cursor-pointer transition-all duration-250 text-left',
                  'hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5',
                  'hover:-translate-y-0.5',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
                )}
              >
                {/* Thumbnail */}
                <div className="relative aspect-[4/3] overflow-hidden bg-muted/30">
                  {!thumbLoaded[rec._id] && (
                    <div className="absolute inset-0 animate-pulse bg-muted/60" />
                  )}
                  <Image
                    src={firstImage.thumbnailUrl || firstImage.url}
                    alt={rec.pestNameCh}
                    fill
                    className={cn(
                      'object-cover transition-all duration-300',
                      'group-hover:scale-105',
                      thumbLoaded[rec._id] ? 'opacity-100' : 'opacity-0'
                    )}
                    sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
                    unoptimized
                    onLoad={() =>
                      setThumbLoaded((prev) => ({ ...prev, [rec._id]: true }))
                    }
                  />

                  {/* Source badge */}
                  <div className="absolute top-2 right-2">
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-[9px] px-1.5 py-0 backdrop-blur-sm',
                        SOURCE_COLORS[rec.source]
                      )}
                    >
                      {SOURCE_LABELS[rec.source] ?? rec.source}
                    </Badge>
                  </div>

                  {/* Image count */}
                  {rec.images.length > 1 && (
                    <div className="absolute bottom-2 right-2">
                      <span className="flex items-center gap-0.5 bg-black/50 backdrop-blur-sm text-white text-[10px] font-mono px-1.5 py-0.5 rounded-full">
                        <ImageIcon className="size-2.5" />
                        {rec.images.length}
                      </span>
                    </div>
                  )}

                  {/* Gradient overlay on hover */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                </div>

                {/* Info section */}
                <div className="px-3 py-2.5 space-y-1">
                  <p className="text-sm font-semibold leading-tight truncate">
                    {rec.pestNameCh}
                  </p>

                  {rec.pestNameScientific && (
                    <p className="text-[11px] italic text-muted-foreground truncate">
                      {rec.pestNameScientific}
                    </p>
                  )}

                  {/* Metadata chips */}
                  <div className="flex flex-wrap gap-1 pt-1">
                    {rec.orderCh && (
                      <span className="text-[10px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">
                        {rec.orderCh}
                      </span>
                    )}
                    {rec.feedingMethod && (
                      <span className="text-[10px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">
                        {FEEDING_METHOD_LABELS[rec.feedingMethod] ?? rec.feedingMethod}
                      </span>
                    )}
                  </div>

                  {/* Harm parts */}
                  {rec.harmParts && rec.harmParts.length > 0 && (
                    <div className="flex items-center gap-1 pt-0.5">
                      <Leaf className="size-2.5 text-muted-foreground flex-shrink-0" />
                      <span className="text-[10px] text-muted-foreground truncate">
                        {rec.harmParts
                          .map((p) => HARM_PART_SHORT[p] ?? p)
                          .join('\u3001')}
                      </span>
                    </div>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* Detail Dialog */}
      {selectedRecord && (
        <PestReferenceDetail
          record={selectedRecord}
          open={!!selectedRecord}
          onOpenChange={(open) => {
            if (!open) setSelectedRecord(null)
          }}
        />
      )}
    </div>
  )
}
