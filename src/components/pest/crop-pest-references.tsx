'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Badge } from '@/components/ui/badge'
import { Bug, Microscope, ImageIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { usePestReferenceImagesByCrop } from '@/hooks/use-pest-reference-images'
import { PestReferenceDetail } from '@/components/pest/pest-reference-detail'

const SOURCE_LABELS: Record<string, string> = {
  moa: '\u8fb2\u696d\u90e8',
  eppo: 'EPPO',
}

const SOURCE_COLORS: Record<string, string> = {
  moa: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-700',
  eppo: 'bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-900/40 dark:text-sky-300 dark:border-sky-700',
}

interface CropPestReferencesProps {
  cropScientificName: string | undefined
}

/**
 * Section for crop detail page showing pest/disease reference images
 * associated with the crop's scientific name.
 */
export function CropPestReferences({
  cropScientificName,
}: CropPestReferencesProps) {
  const records = usePestReferenceImagesByCrop(cropScientificName)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null)
  const [thumbLoaded, setThumbLoaded] = useState<Record<string, boolean>>({})

  // Don't render while loading or if no results
  if (records === undefined) return null
  if (records.length === 0) return null

  return (
    <>
      <div className="rounded-xl border bg-card p-4">
        {/* Header */}
        <div className="flex items-center gap-2 mb-3">
          <div className="text-muted-foreground">
            <Bug className="size-3.5" />
          </div>
          <h3 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">
            {'\u5e38\u898b\u75c5\u87f2\u5bb3\u5716\u7247'}
          </h3>
          <Badge
            variant="secondary"
            className="text-[10px] px-1.5 py-0 font-mono"
          >
            {records.length}
          </Badge>
        </div>

        {/* Pest cards grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {records.map((rec) => {
            const firstImage = rec.images[0]
            if (!firstImage) return null
            return (
              <button
                key={rec._id}
                onClick={() => setSelectedRecord(rec)}
                className={cn(
                  'group relative overflow-hidden rounded-lg border border-border/60',
                  'bg-muted/20 cursor-pointer transition-all duration-200 text-left',
                  'hover:border-primary/30 hover:shadow-md hover:shadow-primary/5',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
                )}
              >
                {/* Thumbnail */}
                <div className="relative aspect-[4/3] overflow-hidden">
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

                  {/* Source badge overlay */}
                  <div className="absolute top-1.5 right-1.5">
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-[9px] px-1 py-0 backdrop-blur-sm',
                        SOURCE_COLORS[rec.source]
                      )}
                    >
                      {SOURCE_LABELS[rec.source] ?? rec.source}
                    </Badge>
                  </div>

                  {/* Image count */}
                  {rec.images.length > 1 && (
                    <div className="absolute bottom-1.5 right-1.5">
                      <span className="flex items-center gap-0.5 bg-black/50 backdrop-blur-sm text-white text-[9px] font-mono px-1.5 py-0.5 rounded-full">
                        <ImageIcon className="size-2.5" />
                        {rec.images.length}
                      </span>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="px-2.5 py-2">
                  <p className="text-sm font-medium leading-tight truncate">
                    {rec.pestNameCh}
                  </p>
                  {rec.pestNameScientific && (
                    <p className="text-[11px] italic text-muted-foreground truncate mt-0.5">
                      {rec.pestNameScientific}
                    </p>
                  )}
                  {rec.harmParts && rec.harmParts.length > 0 && (
                    <div className="flex items-center gap-1 mt-1.5">
                      <Microscope className="size-2.5 text-muted-foreground" />
                      <span className="text-[10px] text-muted-foreground truncate">
                        {'\u5371\u5bb3'}：{rec.harmParts.map((p) => {
                          const labels: Record<string, string> = {
                            root: '\u6839',
                            stem: '\u8396',
                            leaf: '\u8449',
                            flower: '\u82b1',
                            fruit: '\u679c',
                            plant: '\u5168\u682a',
                          }
                          return labels[p] ?? p
                        }).join('\u3001')}
                      </span>
                    </div>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Detail dialog */}
      {selectedRecord && (
        <PestReferenceDetail
          record={selectedRecord}
          open={!!selectedRecord}
          onOpenChange={(open) => {
            if (!open) setSelectedRecord(null)
          }}
        />
      )}
    </>
  )
}
