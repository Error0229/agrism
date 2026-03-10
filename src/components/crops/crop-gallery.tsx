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
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  MapPin,
  Calendar,
  User,
  Scale,
  ImageIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface GalleryImage {
  url: string
  thumbnailUrl: string
  source: string
  sourceUrl: string
  license: string
  attribution: string
  observationDate?: string
  location?: string
}

interface CropGalleryProps {
  images: GalleryImage[]
  cropName: string
}

function formatLicense(license: string): string {
  return license.toUpperCase()
}

export function CropGallery({ images, cropName }: CropGalleryProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const [imageLoaded, setImageLoaded] = useState<Record<number, boolean>>({})
  const [lightboxImageLoaded, setLightboxImageLoaded] = useState(false)

  const goNext = useCallback(() => {
    setLightboxImageLoaded(false)
    setActiveIndex((prev) => (prev + 1) % (images?.length || 1))
  }, [images?.length])

  const goPrev = useCallback(() => {
    setLightboxImageLoaded(false)
    setActiveIndex((prev) => (prev - 1 + (images?.length || 1)) % (images?.length || 1))
  }, [images?.length])

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

  if (!images || images.length === 0) return null

  const activeImage = images[activeIndex]

  function openLightbox(index: number) {
    setActiveIndex(index)
    setLightboxImageLoaded(false)
    setLightboxOpen(true)
  }

  return (
    <>
      {/* === Gallery Section === */}
      <div className="rounded-xl border bg-card overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3">
          <div className="flex items-center gap-2">
            <Camera className="size-3.5 text-muted-foreground" />
            <h3 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">
              田間實拍
            </h3>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-mono">
              {images.length}
            </Badge>
          </div>
          <span className="text-[11px] text-muted-foreground flex items-center gap-1">
            <ImageIcon className="size-3" />
            來自 iNaturalist 社群觀察
          </span>
        </div>

        {/* Thumbnail Grid */}
        <div className="px-4 pb-4">
          <div className={cn(
            'grid gap-2',
            images.length === 1 && 'grid-cols-1',
            images.length === 2 && 'grid-cols-2',
            images.length >= 3 && 'grid-cols-3',
            images.length >= 5 && 'sm:grid-cols-4 md:grid-cols-5',
          )}>
            {images.map((image, idx) => (
              <button
                key={idx}
                onClick={() => openLightbox(idx)}
                className={cn(
                  'group relative aspect-square overflow-hidden rounded-lg border border-border/60',
                  'bg-muted/30 cursor-pointer transition-all duration-200',
                  'hover:border-primary/40 hover:shadow-md hover:shadow-primary/5',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                )}
              >
                {/* Loading skeleton */}
                {!imageLoaded[idx] && (
                  <div className="absolute inset-0 animate-pulse bg-muted/60" />
                )}
                <Image
                  src={image.thumbnailUrl || image.url}
                  alt={`${cropName} 田間照片 ${idx + 1}`}
                  fill
                  className={cn(
                    'object-cover transition-all duration-300',
                    'group-hover:scale-105',
                    imageLoaded[idx] ? 'opacity-100' : 'opacity-0',
                  )}
                  sizes="(max-width: 640px) 33vw, (max-width: 768px) 25vw, 20vw"
                  unoptimized
                  onLoad={() => setImageLoaded((prev) => ({ ...prev, [idx]: true }))}
                />

                {/* Hover overlay with attribution */}
                <div className={cn(
                  'absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent',
                  'opacity-0 group-hover:opacity-100 transition-opacity duration-200',
                  'flex flex-col justify-end p-2',
                )}>
                  <p className="text-[10px] text-white/90 truncate leading-tight">
                    {image.attribution}
                  </p>
                  <p className="text-[9px] text-white/60 truncate">
                    {formatLicense(image.license)}
                  </p>
                </div>

                {/* Corner index indicator */}
                <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="bg-black/50 backdrop-blur-sm text-white text-[9px] font-mono px-1.5 py-0.5 rounded-full">
                    {idx + 1}/{images.length}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* === Lightbox Modal === */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent
          className="max-w-[95vw] sm:max-w-4xl p-0 gap-0 overflow-hidden bg-black/95 border-white/10"
          showCloseButton
        >
          <DialogTitle className="sr-only">
            {cropName} 田間照片 {activeIndex + 1} / {images.length}
          </DialogTitle>

          {/* Main Image Area */}
          <div className="relative flex items-center justify-center min-h-[40vh] sm:min-h-[60vh] max-h-[75vh]">
            {/* Loading state */}
            {!lightboxImageLoaded && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="size-8 rounded-full border-2 border-white/20 border-t-white/80 animate-spin" />
              </div>
            )}

            <Image
              src={activeImage.url}
              alt={`${cropName} 田間照片 ${activeIndex + 1}`}
              width={800}
              height={600}
              className={cn(
                'max-h-[75vh] w-auto h-auto object-contain transition-opacity duration-300',
                lightboxImageLoaded ? 'opacity-100' : 'opacity-0',
              )}
              unoptimized
              priority
              onLoad={() => setLightboxImageLoaded(true)}
            />

            {/* Navigation arrows */}
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

            {/* Image counter */}
            <div className="absolute top-3 left-3">
              <span className="bg-black/50 backdrop-blur-sm text-white text-xs font-mono px-2.5 py-1 rounded-full">
                {activeIndex + 1} / {images.length}
              </span>
            </div>
          </div>

          {/* Attribution Bar */}
          <div className="border-t border-white/10 bg-black/80 px-4 py-3 backdrop-blur-sm">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
              {/* Photographer */}
              <span className="flex items-center gap-1.5 text-sm text-white/90">
                <User className="size-3.5 text-white/50" />
                {activeImage.attribution}
              </span>

              {/* License */}
              <span className="flex items-center gap-1.5 text-sm text-white/70">
                <Scale className="size-3.5 text-white/50" />
                {formatLicense(activeImage.license)}
              </span>

              {/* Date */}
              {activeImage.observationDate && (
                <span className="flex items-center gap-1.5 text-sm text-white/70">
                  <Calendar className="size-3.5 text-white/50" />
                  {activeImage.observationDate}
                </span>
              )}

              {/* Location */}
              {activeImage.location && (
                <span className="flex items-center gap-1.5 text-sm text-white/70">
                  <MapPin className="size-3.5 text-white/50" />
                  {activeImage.location}
                </span>
              )}

              {/* Source link */}
              <a
                href={activeImage.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="ml-auto flex items-center gap-1.5 text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                在 iNaturalist 查看
                <ExternalLink className="size-3.5" />
              </a>
            </div>
          </div>

          {/* Thumbnail Strip (bottom) */}
          {images.length > 1 && (
            <div className="border-t border-white/10 bg-black/90 px-4 py-2.5">
              <div className="flex gap-2 overflow-x-auto scrollbar-thin">
                {images.map((img, idx) => (
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
                        : 'border-transparent opacity-50 hover:opacity-80',
                    )}
                  >
                    <Image
                      src={img.thumbnailUrl || img.url}
                      alt={`縮圖 ${idx + 1}`}
                      fill
                      className="object-cover"
                      sizes="56px"
                      unoptimized
                    />
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
