'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getWeatherLogs,
  createWeatherLog,
  deleteWeatherLog,
} from '@/server/actions/weather-logs'

export const weatherKeys = {
  all: ['weatherLogs'] as const,
  list: (farmId: string) => [...weatherKeys.all, 'list', farmId] as const,
}

export function useWeatherLogs(farmId: string | undefined) {
  return useQuery({
    queryKey: weatherKeys.list(farmId!),
    queryFn: () => getWeatherLogs(farmId!),
    enabled: !!farmId,
  })
}

export function useCreateWeatherLog(farmId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Parameters<typeof createWeatherLog>[1]) =>
      createWeatherLog(farmId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: weatherKeys.list(farmId) })
    },
  })
}

export function useDeleteWeatherLog(farmId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteWeatherLog(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: weatherKeys.list(farmId) })
    },
  })
}
