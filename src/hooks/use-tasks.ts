'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getTasks,
  createTask,
  updateTask,
  deleteTask,
  toggleTaskComplete,
} from '@/server/actions/tasks'

export const taskKeys = {
  all: ['tasks'] as const,
  list: (farmId: string, filters?: Record<string, unknown>) =>
    [...taskKeys.all, 'list', farmId, filters ?? {}] as const,
}

export function useTasks(
  farmId: string | undefined,
  filters?: Parameters<typeof getTasks>[1],
) {
  return useQuery({
    queryKey: taskKeys.list(farmId!, filters as Record<string, unknown>),
    queryFn: () => getTasks(farmId!, filters),
    enabled: !!farmId,
  })
}

export function useCreateTask(farmId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Parameters<typeof createTask>[1]) =>
      createTask(farmId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: taskKeys.all })
    },
  })
}

export function useUpdateTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof updateTask>[1] }) =>
      updateTask(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: taskKeys.all })
    },
  })
}

export function useToggleTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => toggleTaskComplete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: taskKeys.all })
    },
  })
}

export function useDeleteTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteTask(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: taskKeys.all })
    },
  })
}
