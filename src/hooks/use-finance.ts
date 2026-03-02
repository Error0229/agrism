'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getFinanceRecords,
  createFinanceRecord,
  deleteFinanceRecord,
  getFinanceSummary,
} from '@/server/actions/finance'

export const financeKeys = {
  all: ['financeRecords'] as const,
  list: (farmId: string) => [...financeKeys.all, 'list', farmId] as const,
  summary: (farmId: string) => [...financeKeys.all, 'summary', farmId] as const,
}

export function useFinanceRecords(farmId: string | undefined) {
  return useQuery({
    queryKey: financeKeys.list(farmId!),
    queryFn: () => getFinanceRecords(farmId!),
    enabled: !!farmId,
  })
}

export function useFinanceSummary(farmId: string | undefined) {
  return useQuery({
    queryKey: financeKeys.summary(farmId!),
    queryFn: () => getFinanceSummary(farmId!),
    enabled: !!farmId,
  })
}

export function useCreateFinanceRecord(farmId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Parameters<typeof createFinanceRecord>[1]) =>
      createFinanceRecord(farmId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: financeKeys.list(farmId) })
      qc.invalidateQueries({ queryKey: financeKeys.summary(farmId) })
    },
  })
}

export function useDeleteFinanceRecord(farmId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteFinanceRecord(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: financeKeys.list(farmId) })
      qc.invalidateQueries({ queryKey: financeKeys.summary(farmId) })
    },
  })
}
