'use client'

import { useState, useCallback, useEffect } from 'react'
import Image from 'next/image'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Scale,
  Bug,
  Leaf,
  Microscope,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// === Label maps ===

const SOURCE_LABELS: Record<string, string> = {
  moa: '\u8fb2\u696d\u90e8',
  eppo: 'EPPO',
}

const SOURCE_COLORS: Record<string, string> = {
  moa: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-700',
  eppo: 'bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-900/40 dark:text-sky-300 dark:border-sky-700',
}

const CATEGORY_LABELS: Record<string, string> = {
  plant_damage: '\u690d\u7269\u53d7\u5bb3',
  pest_body: '\u87f2\u9ad4',
  symptom: '\u75c7\u72c0',
  general: '\u4e00\u822c',
}

const CATEGORY_ICONS: Record<string, string> = {
  plant_damage: '\ud83c\udf3f',
  pest_body: '\ud83d\udc1b',
  symptom: '\ud83d\udd0d',
  general: '\ud83d\udcf7',
}

const LICENSE_LABELS: Record<string, string> = {
  'TW-Gov-OD': '\u653f\u5e9c\u8cc7\u6599\u958b\u653e\u6388\u6b0a',
  'EPPO-ODL': 'EPPO Open Data License',
}

const FEEDING_METHOD_LABELS: Record<string, string> = {
  chewing: '\u5480\u56bc\u5f0f',
  piercing_sucking: '\u523a\u5438\u5f0f',
}

const HARM_PART_LABELS: Record<string, string> = {
  root: '\u6839\u90e8',
  stem: '\u8396\u90e8',
  leaf: '\u8449\u7247',
  flower: '\u82b1\u6735',
  fruit: '\u679c\u5be6',
  plant: '\u5168\u682a',
}

const HARM_PART_COLORS: Record<string, string> = {
  root: 'border-amber-300 bg-amber-50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700',
  stem: 'border-lime-300 bg-lime-50 text-lime-800 dark:bg-lime-900/30 dark:text-lime-300 dark:border-lime-700',
  leaf: 'border-green-300 bg-green-50 text-green-800 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700',
  flower: 'border-pink-300 bg-pink-50 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300 dark:border-pink-700',
  fruit: 'border-orange-300 bg-orange-50 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-700',
  plant: 'border-red-300 bg-red-50 text-red-800 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700',
}

interface PestImage {
  url: string
  thumbnailUrl: string
  category: string
  description?: string
  sourceUrl: string
  author?: string
  license: string
}

interface PestReferenceRecord {
  _id: string
  source: string
  sourceId: string
  pestNameCh: string
  pestNameEn?: string
  pestNameScientific?: string
  eppoCode?: string
  orderLatin?: string
  orderCh?: string
  familyLatin?: string
  familyCh?: string
  feedingMethod?: string
  harmParts?: string[]
  cropName?: string
  cropScientificName?: string
  cropFamily?: string
  images: PestImage[]
  importedAt: number
}

interface PestReferenceDetailProps {
  record: PestReferenceRecord
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Full detail dialog for a pest reference record.
 * Displays all images in a gallery/lightbox with rich metadata.
 */
export function PestReferenceDetail({
  record,
  open,
  onOpenChange,
}: PestReferenceDetailProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [imageLoaded, setImageLoaded] = useState<Record<number, boolean>>({})
  const [mainImageLoaded, setMainImageLoaded] = useState(false)
  const [prevRecordId, setPrevRecordId] = useState(record._id)

  // Reset state when record changes (derived state during render)
  if (prevRecordId !== record._id) {
    setPrevRecordId(record._id)
    setActiveIndex(0)
    setImageLoaded({})
    setMainImageLoaded(false)
  }

  const images = record.images

  const goNext = useCallback(() => {
    setMainImageLoaded(false)
    setActiveIndex((prev) => (prev + 1) % (images.length || 1))
  }, [images.length])

  const goPrev = useCallback(() => {
    setMainImageLoaded(false)
    setActiveIndex(
      (prev) => (prev - 1 + (images.length || 1)) % (images.length || 1)
    )
  }, [images.length])

  // Keyboard navigation
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') goNext()
      else if (e.key === 'ArrowLeft') goPrev()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, goNext, goPrev])

  const activeImage = images[activeIndex]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-5xl p-0 gap-0 overflow-hidden border-border/50">
        <DialogTitle className="sr-only">
          {record.pestNameCh} {'\u8a73\u7d30\u8cc7\u6599'}
        </DialogTitle>

        <div className="flex flex-col lg:flex-row max-h-[90vh]">
          {/* === Left: Image Gallery === */}
          <div className="lg:w-3/5 bg-black/95 relative flex flex-col">
            {/* Main Image */}
            <div className="relative flex-1 flex items-center justify-center min-h-[35vh] lg:min-h-[50vh]">
              {!mainImageLoaded && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="size-8 rounded-full border-2 border-white/20 border-t-white/80 animate-spin" />
                </div>
              )}

              {activeImage && (
                <Image
                  src={activeImage.url}
                  alt={`${record.pestNameCh} - ${CATEGORY_LABELS[activeImage.category] ?? ''}`}
                  width={800}
                  height={600}
                  className={cn(
                    'max-h-[50vh] lg:max-h-[65vh] w-auto h-auto object-contain transition-opacity duration-300',
                    mainImageLoaded ? 'opacity-100' : 'opacity-0'
                  )}
                  unoptimized
                  priority
                  onLoad={() => setMainImageLoaded(true)}
                />
              )}

              {/* Navigation */}
              {images.length > 1 && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute left-2 top-1/2 -translate-y-1/2 size-10 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      goPrev()
                    }}
                  >
                    <ChevronLeft className="size-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 -translate-y-1/2 size-10 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      goNext()
                    }}
                  >
                    <ChevronRight className="size-5" />
                  </Button>
                </>
              )}

              {/* Counter + category */}
              <div className="absolute top-3 left-3 flex items-center gap-2">
                <span className="bg-black/50 backdrop-blur-sm text-white text-xs font-mono px-2.5 py-1 rounded-full">
                  {activeIndex + 1} / {images.length}
                </span>
                {activeImage && (
                  <span className="bg-black/50 backdrop-blur-sm text-white text-xs px-2.5 py-1 rounded-full">
                    {CATEGORY_ICONS[activeImage.category]}{' '}
                    {CATEGORY_LABELS[activeImage.category] ?? activeImage.category}
                  </span>
                )}
              </div>
            </div>

            {/* Thumbnail strip */}
            {images.length > 1 && (
              <div className="border-t border-white/10 bg-black/90 px-3 py-2">
                <div className="flex gap-1.5 overflow-x-auto scrollbar-thin">
                  {images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setMainImageLoaded(false)
                        setActiveIndex(idx)
                      }}
                      className={cn(
                        'relative flex-shrink-0 size-12 rounded-md overflow-hidden transition-all duration-150',
                        'border-2',
                        idx === activeIndex
                          ? 'border-white/80 ring-1 ring-white/30'
                          : 'border-transparent opacity-50 hover:opacity-80'
                      )}
                    >
                      {!imageLoaded[idx] && (
                        <div className="absolute inset-0 animate-pulse bg-white/10" />
                      )}
                      <Image
                        src={img.thumbnailUrl || img.url}
                        alt={`${'\u7e2e\u5716'} ${idx + 1}`}
                        fill
                        className="object-cover"
                        sizes="48px"
                        unoptimized
                        onLoad={() =>
                          setImageLoaded((prev) => ({ ...prev, [idx]: true }))
                        }
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Attribution footer */}
            {activeImage && (
              <div className="border-t border-white/10 bg-black/80 px-3 py-2">
                <div className="flex items-center gap-3 text-xs text-white/60">
                  <Scale className="size-3 text-white/40 flex-shrink-0" />
                  <span>
                    {LICENSE_LABELS[activeImage.license] ?? activeImage.license}
                  </span>
                  {activeImage.author && (
                    <span className="text-white/40">{activeImage.author}</span>
                  )}
                  <a
                    href={activeImage.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className={cn(
                      'ml-auto flex items-center gap-1 text-xs transition-colors',
                      record.source === 'moa'
                        ? 'text-emerald-400 hover:text-emerald-300'
                        : 'text-sky-400 hover:text-sky-300'
                    )}
                  >
                    {'\u539f\u59cb\u4f86\u6e90'}
                    <ExternalLink className="size-3" />
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* === Right: Metadata === */}
          <div className="lg:w-2/5 overflow-y-auto bg-card p-5 space-y-4">
            {/* Close button (mobile) */}
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                {/* Source badge */}
                <Badge
                  variant="outline"
                  className={cn('text-[10px] px-1.5 py-0 mb-2', SOURCE_COLORS[record.source])}
                >
                  {SOURCE_LABELS[record.source] ?? record.source}
                </Badge>

                {/* Name hierarchy */}
                <h2 className="text-xl font-bold tracking-tight leading-tight">
                  {record.pestNameCh}
                </h2>
                {record.pestNameScientific && (
                  <p className="text-sm italic text-muted-foreground mt-0.5">
                    {record.pestNameScientific}
                  </p>
                )}
                {record.pestNameEn && (
                  <p className="text-xs text-muted-foreground">
                    {record.pestNameEn}
                  </p>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="size-8 rounded-full flex-shrink-0 lg:hidden"
                onClick={() => onOpenChange(false)}
              >
                <X className="size-4" />
              </Button>
            </div>

            <Separator />

            {/* Taxonomy */}
            {(record.orderCh || record.orderLatin || record.familyCh || record.familyLatin) && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase text-muted-foreground">
                  <Microscope className="size-3" />
                  {'\u5206\u985e'}
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  {(record.orderCh || record.orderLatin) && (
                    <div>
                      <span className="text-xs text-muted-foreground">{'\u76ee'}</span>
                      <p className="font-medium">
                        {record.orderCh ?? ''}
                        {record.orderLatin && (
                          <span className="text-xs text-muted-foreground ml-1 italic">
                            {record.orderLatin}
                          </span>
                        )}
                      </p>
                    </div>
                  )}
                  {(record.familyCh || record.familyLatin) && (
                    <div>
                      <span className="text-xs text-muted-foreground">{'\u79d1'}</span>
                      <p className="font-medium">
                        {record.familyCh ?? ''}
                        {record.familyLatin && (
                          <span className="text-xs text-muted-foreground ml-1 italic">
                            {record.familyLatin}
                          </span>
                        )}
                      </p>
                    </div>
                  )}
                </div>
                {record.eppoCode && (
                  <div className="text-xs text-muted-foreground">
                    EPPO: <span className="font-mono">{record.eppoCode}</span>
                  </div>
                )}
              </div>
            )}

            {/* Feeding method */}
            {record.feedingMethod && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase text-muted-foreground">
                  <Bug className="size-3" />
                  {'\u53d6\u98df\u65b9\u5f0f'}
                </div>
                <Badge variant="outline" className="text-xs">
                  {FEEDING_METHOD_LABELS[record.feedingMethod] ?? record.feedingMethod}
                </Badge>
              </div>
            )}

            {/* Affected parts */}
            {record.harmParts && record.harmParts.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase text-muted-foreground">
                  <Leaf className="size-3" />
                  {'\u5371\u5bb3\u90e8\u4f4d'}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {record.harmParts.map((part) => (
                    <Badge
                      key={part}
                      variant="outline"
                      className={cn('text-xs', HARM_PART_COLORS[part])}
                    >
                      {HARM_PART_LABELS[part] ?? part}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Associated crop */}
            {(record.cropName || record.cropScientificName) && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase text-muted-foreground">
                  <Leaf className="size-3" />
                  {'\u95dc\u806f\u4f5c\u7269'}
                </div>
                <div className="text-sm">
                  {record.cropName && (
                    <span className="font-medium">{record.cropName}</span>
                  )}
                  {record.cropScientificName && (
                    <span className="text-xs italic text-muted-foreground ml-1.5">
                      {record.cropScientificName}
                    </span>
                  )}
                  {record.cropFamily && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {'\u79d1\u5225'}：{record.cropFamily}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Image categories summary */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase text-muted-foreground">
                {'\u5716\u7247\u5206\u985e'}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[...new Set(images.map((img) => img.category))].map((cat) => {
                  const count = images.filter((img) => img.category === cat).length
                  return (
                    <Badge key={cat} variant="secondary" className="text-xs gap-1">
                      <span>{CATEGORY_ICONS[cat]}</span>
                      {CATEGORY_LABELS[cat] ?? cat}
                      <span className="font-mono text-[10px] text-muted-foreground">
                        {count}
                      </span>
                    </Badge>
                  )
                })}
              </div>
            </div>

            {/* Import timestamp */}
            <div className="text-xs text-muted-foreground pt-2 border-t">
              {'\u8cc7\u6599\u5c0e\u5165\u6642\u9593'}：
              {new Date(record.importedAt).toLocaleDateString('zh-TW')}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
