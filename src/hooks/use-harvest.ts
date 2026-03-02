'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getHarvestLogs,
  createHarvestLog,
  deleteHarvestLog,
} from '@/server/actions/harvest'

export const harvestKeys = {
  all: ['harvestLogs'] as const,
  list: (farmId: string) => [...harvestKeys.all, 'list', farmId] as const,
}

export function useHarvestLogs(farmId: string | undefined) {
  return useQuery({
    queryKey: harvestKeys.list(farmId!),
    queryFn: () => getHarvestLogs(farmId!),
    enabled: !!farmId,
  })
}

export function useCreateHarvestLog(farmId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Parameters<typeof createHarvestLog>[1]) =>
      createHarvestLog(farmId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: harvestKeys.list(farmId) })
    },
  })
}

export function useDeleteHarvestLog(farmId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteHarvestLog(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: harvestKeys.list(farmId) })
    },
  })
}
