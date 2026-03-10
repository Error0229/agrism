'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import Image from 'next/image'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Scale,
  ImageIcon,
  Microscope,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { usePestReferenceImages } from '@/hooks/use-pest-reference-images'

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

interface PestReferenceImage {
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
  pestNameCh: string
  pestNameScientific?: string
  images: PestReferenceImage[]
}

interface PestReferenceGalleryProps {
  /** The Chinese pest name to look up (from triage result possibleCause) */
  pestName?: string
  /** Direct reference records to render (alternative to pestName lookup) */
  records?: PestReferenceRecord[]
  /** Compact mode for inline display within triage results */
  compact?: boolean
}

/**
 * Displays pest reference images from MOA/EPPO alongside triage results.
 * Queries by pestName or accepts direct records.
 */
export function PestReferenceGallery({
  pestName,
  records: directRecords,
  compact = false,
}: PestReferenceGalleryProps) {
  const queriedRecords = usePestReferenceImages(
    !directRecords ? pestName : undefined
  )
  const records = directRecords ?? queriedRecords

  // Flatten all images across records with source attribution
  const allImages = useMemo(() => {
    if (!records || records.length === 0) return []
    return records.flatMap((rec) =>
      rec.images.map((img) => ({
        ...img,
        source: rec.source,
        pestNameCh: rec.pestNameCh,
        pestNameScientific: rec.pestNameScientific,
      }))
    )
  }, [records])

  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const [imageLoaded, setImageLoaded] = useState<Record<number, boolean>>({})
  const [lightboxImageLoaded, setLightboxImageLoaded] = useState(false)

  const goNext = useCallback(() => {
    setLightboxImageLoaded(false)
    setActiveIndex((prev) => (prev + 1) % (allImages.length || 1))
  }, [allImages.length])

  const goPrev = useCallback(() => {
    setLightboxImageLoaded(false)
    setActiveIndex(
      (prev) => (prev - 1 + (allImages.length || 1)) % (allImages.length || 1)
    )
  }, [allImages.length])

  // Keyboard navigation in lightbox
  useEffect(() => {
    if (!lightboxOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') goNext()
      else if (e.key === 'ArrowLeft') goPrev()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [lightboxOpen, goNext, goPrev])

  // Loading state
  if (records === undefined) return null

  // No images placeholder
  if (allImages.length === 0) {
    if (compact) return null
    return (
      <div className="flex items-center gap-2 rounded-lg border border-dashed border-muted-foreground/20 bg-muted/10 px-3 py-2.5">
        <ImageIcon className="size-4 text-muted-foreground/40" />
        <span className="text-xs text-muted-foreground/60">
          {'\u66ab\u7121\u53c3\u8003\u5716\u7247'}
        </span>
      </div>
    )
  }

  const activeImage = allImages[activeIndex]
  const displayCount = compact ? Math.min(4, allImages.length) : allImages.length

  function openLightbox(index: number) {
    setActiveIndex(index)
    setLightboxImageLoaded(false)
    setLightboxOpen(true)
  }

  return (
    <>
      {/* === Inline Thumbnail Strip === */}
      <div className={cn(compact ? 'mt-2' : 'mt-3')}>
        {/* Header */}
        {!compact && (
          <div className="flex items-center gap-2 mb-2">
            <Microscope className="size-3.5 text-muted-foreground" />
            <span className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
              {'\u53c3\u8003\u5716\u7247'}
            </span>
            <Badge
              variant="secondary"
              className="text-[10px] px-1.5 py-0 font-mono"
            >
              {allImages.length}
            </Badge>
            {/* Source badges */}
            {records &&
              Array.from(new Set<string>(records.map((r) => r.source))).map((src) => (
                <Badge
                  key={src}
                  variant="outline"
                  className={cn(
                    'text-[10px] px-1.5 py-0',
                    SOURCE_COLORS[src]
                  )}
                >
                  {SOURCE_LABELS[src] ?? src}
                </Badge>
              ))}
          </div>
        )}

        {/* Thumbnail row */}
        <div className="flex gap-1.5 overflow-x-auto scrollbar-thin">
          {allImages.slice(0, displayCount).map((img, idx) => (
            <button
              key={idx}
              onClick={() => openLightbox(idx)}
              className={cn(
                'group relative flex-shrink-0 overflow-hidden rounded-lg border border-border/60',
                'bg-muted/30 cursor-pointer transition-all duration-200',
                'hover:border-primary/40 hover:shadow-md hover:shadow-primary/5',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                compact ? 'size-14' : 'size-20'
              )}
            >
              {/* Loading skeleton */}
              {!imageLoaded[idx] && (
                <div className="absolute inset-0 animate-pulse bg-muted/60" />
              )}
              <Image
                src={img.thumbnailUrl || img.url}
                alt={`${img.pestNameCh} ${CATEGORY_LABELS[img.category] ?? ''}`}
                fill
                className={cn(
                  'object-cover transition-all duration-300',
                  'group-hover:scale-105',
                  imageLoaded[idx] ? 'opacity-100' : 'opacity-0'
                )}
                sizes={compact ? '56px' : '80px'}
                unoptimized
                onLoad={() =>
                  setImageLoaded((prev) => ({ ...prev, [idx]: true }))
                }
              />

              {/* Category chip */}
              <div
                className={cn(
                  'absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent',
                  'opacity-0 group-hover:opacity-100 transition-opacity duration-200',
                  'flex items-end justify-between px-1 pb-0.5 pt-3'
                )}
              >
                <span className="text-[9px] text-white/90 truncate leading-tight">
                  {CATEGORY_ICONS[img.category]} {CATEGORY_LABELS[img.category]}
                </span>
              </div>

              {/* Source dot */}
              <div className="absolute top-1 right-1">
                <div
                  className={cn(
                    'size-2 rounded-full ring-1 ring-white/60',
                    img.source === 'moa'
                      ? 'bg-emerald-500'
                      : 'bg-sky-500'
                  )}
                  title={SOURCE_LABELS[img.source] ?? img.source}
                />
              </div>
            </button>
          ))}

          {/* Overflow indicator */}
          {compact && allImages.length > displayCount && (
            <button
              onClick={() => openLightbox(displayCount)}
              className={cn(
                'flex-shrink-0 size-14 rounded-lg border border-dashed border-muted-foreground/30',
                'flex items-center justify-center cursor-pointer transition-colors',
                'hover:border-primary/40 hover:bg-muted/40',
                'text-xs text-muted-foreground font-mono'
              )}
            >
              +{allImages.length - displayCount}
            </button>
          )}
        </div>
      </div>

      {/* === Lightbox Modal === */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent
          className="max-w-[95vw] sm:max-w-4xl p-0 gap-0 overflow-hidden bg-black/95 border-white/10"
          showCloseButton
        >
          <DialogTitle className="sr-only">
            {activeImage?.pestNameCh}{' '}
            {CATEGORY_LABELS[activeImage?.category ?? ''] ?? ''}{' '}
            {activeIndex + 1} / {allImages.length}
          </DialogTitle>

          {/* Main Image Area */}
          <div className="relative flex items-center justify-center min-h-[40vh] sm:min-h-[60vh] max-h-[75vh]">
            {/* Loading spinner */}
            {!lightboxImageLoaded && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="size-8 rounded-full border-2 border-white/20 border-t-white/80 animate-spin" />
              </div>
            )}

            <Image
              src={activeImage?.url ?? ''}
              alt={`${activeImage?.pestNameCh} ${CATEGORY_LABELS[activeImage?.category ?? ''] ?? ''}`}
              width={800}
              height={600}
              className={cn(
                'max-h-[75vh] w-auto h-auto object-contain transition-opacity duration-300',
                lightboxImageLoaded ? 'opacity-100' : 'opacity-0'
              )}
              unoptimized
              priority
              onLoad={() => setLightboxImageLoaded(true)}
            />

            {/* Navigation arrows */}
            {allImages.length > 1 && (
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

            {/* Image counter + source badge */}
            <div className="absolute top-3 left-3 flex items-center gap-2">
              <span className="bg-black/50 backdrop-blur-sm text-white text-xs font-mono px-2.5 py-1 rounded-full">
                {activeIndex + 1} / {allImages.length}
              </span>
              {activeImage && (
                <Badge
                  variant="outline"
                  className={cn(
                    'text-[10px] px-1.5 py-0 border backdrop-blur-sm',
                    activeImage.source === 'moa'
                      ? 'bg-emerald-900/60 text-emerald-200 border-emerald-500/50'
                      : 'bg-sky-900/60 text-sky-200 border-sky-500/50'
                  )}
                >
                  {SOURCE_LABELS[activeImage.source] ?? activeImage.source}
                </Badge>
              )}
            </div>

            {/* Category label */}
            {activeImage && (
              <div className="absolute top-3 right-12">
                <span className="bg-black/50 backdrop-blur-sm text-white text-xs px-2.5 py-1 rounded-full">
                  {CATEGORY_ICONS[activeImage.category]}{' '}
                  {CATEGORY_LABELS[activeImage.category] ?? activeImage.category}
                </span>
              </div>
            )}
          </div>

          {/* Attribution Bar */}
          <div className="border-t border-white/10 bg-black/80 px-4 py-3 backdrop-blur-sm">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
              {/* Pest name */}
              <span className="text-sm font-medium text-white/90">
                {activeImage?.pestNameCh}
              </span>
              {activeImage?.pestNameScientific && (
                <span className="text-sm italic text-white/60">
                  {activeImage.pestNameScientific}
                </span>
              )}

              {/* Description */}
              {activeImage?.description && (
                <span className="text-sm text-white/70">
                  {activeImage.description}
                </span>
              )}

              {/* License */}
              <span className="flex items-center gap-1.5 text-sm text-white/70">
                <Scale className="size-3.5 text-white/50" />
                {LICENSE_LABELS[activeImage?.license ?? ''] ??
                  activeImage?.license}
              </span>

              {/* Author */}
              {activeImage?.author && (
                <span className="text-sm text-white/60">
                  {activeImage.author}
                </span>
              )}

              {/* Source link */}
              <a
                href={activeImage?.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className={cn(
                  'ml-auto flex items-center gap-1.5 text-sm transition-colors',
                  activeImage?.source === 'moa'
                    ? 'text-emerald-400 hover:text-emerald-300'
                    : 'text-sky-400 hover:text-sky-300'
                )}
              >
                {activeImage?.source === 'moa'
                  ? '\u5728\u8fb2\u696d\u90e8\u67e5\u770b'
                  : '\u5728 EPPO \u67e5\u770b'}
                <ExternalLink className="size-3.5" />
              </a>
            </div>
          </div>

          {/* Thumbnail Strip (bottom) */}
          {allImages.length > 1 && (
            <div className="border-t border-white/10 bg-black/90 px-4 py-2.5">
              <div className="flex gap-2 overflow-x-auto scrollbar-thin">
                {allImages.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setLightboxImageLoaded(false)
                      setActiveIndex(idx)
                    }}
                    className={cn(
                      'relative flex-shrink-0 size-14 rounded-md overflow-hidden transition-all duration-150',
                      'border-2',
                      idx === activeIndex
                        ? 'border-white/80 ring-1 ring-white/30'
                        : 'border-transparent opacity-50 hover:opacity-80'
                    )}
                  >
                    <Image
                      src={img.thumbnailUrl || img.url}
                      alt={`${img.pestNameCh} ${'\u7e2e\u5716'} ${idx + 1}`}
                      fill
                      className="object-cover"
                      sizes="56px"
                      unoptimized
                    />
                    {/* Source dot */}
                    <div className="absolute top-0.5 right-0.5">
                      <div
                        className={cn(
                          'size-1.5 rounded-full',
                          img.source === 'moa'
                            ? 'bg-emerald-400'
                            : 'bg-sky-400'
                        )}
                      />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
