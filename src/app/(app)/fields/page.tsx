'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useFarmId } from '@/hooks/use-farm-id'
import { useFields } from '@/hooks/use-fields'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Map, Plus, Ruler, Sprout, Building2 } from 'lucide-react'
import { PLOT_TYPE_LABELS } from '@/lib/types/labels'
import type { PlotType } from '@/lib/types/enums'
import { CreateFieldDialog } from '@/components/fields/create-field-dialog'

type FieldListItem = NonNullable<ReturnType<typeof useFields>>[number]

export default function FieldsPage() {
  const farmId = useFarmId()
  const fields = useFields(farmId)
  const isLoading = fields === undefined
  const [dialogOpen, setDialogOpen] = useState(false)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">田地管理</h1>
          <p className="mt-1 text-muted-foreground">
            管理您的田地與種植區域
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-1 size-4" />
          新增田地
        </Button>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="mb-3 h-5 w-32" />
                <Skeleton className="mb-2 h-4 w-40" />
                <Skeleton className="mb-2 h-4 w-28" />
                <Skeleton className="h-4 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && (!fields || fields.length === 0) && (
        <div className="flex flex-col items-center gap-3 py-12 text-center text-muted-foreground">
          <Map className="size-10" />
          <p className="text-lg font-medium">尚未建立田地</p>
          <p className="text-sm">點擊「新增田地」開始規劃您的農地</p>
        </div>
      )}

      {/* Field grid */}
      {!isLoading && fields && fields.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {fields.map((field) => (
            <FieldCard key={field._id} field={field} />
          ))}
        </div>
      )}

      {/* Create field dialog */}
      <CreateFieldDialog
        farmId={farmId}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  )
}

function FieldCard({ field }: { field: FieldListItem }) {
  const areaM2 = field.widthM * field.heightM
  const growingCrops = (field.plantedCrops ?? []).filter(
    (pc) => pc.status === 'growing',
  )
  const facilityCount = (field.facilities ?? []).length

  return (
    <Link href={`/fields/${field._id}`}>
      <Card className="h-full cursor-pointer transition-shadow hover:shadow-md">
        <CardContent className="space-y-2 pt-6">
          <h3 className="font-semibold">{field.name}</h3>

          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Ruler className="size-3.5" />
            <span>
              寬 {field.widthM} m &times; 長 {field.heightM} m
            </span>
          </div>

          <p className="text-sm text-muted-foreground">
            面積: {areaM2.toFixed(1)} m&sup2;
          </p>

          <div className="flex flex-wrap items-center gap-2">
            {growingCrops.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                <Sprout className="mr-1 size-3" />
                {growingCrops.length} 種植中
              </Badge>
            )}
            {facilityCount > 0 && (
              <Badge variant="outline" className="text-xs">
                <Building2 className="mr-1 size-3" />
                {facilityCount} 設施
              </Badge>
            )}
          </div>

          {field.plotType && (
            <Badge
              variant="outline"
              className="text-xs"
            >
              {PLOT_TYPE_LABELS[field.plotType as PlotType]}
            </Badge>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}
