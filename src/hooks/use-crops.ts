'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getCrops,
  getCropById,
  createCustomCrop,
  updateCustomCrop,
  deleteCustomCrop,
  getCropTemplates,
  createCropTemplate,
  applyCropTemplate,
  deleteCropTemplate,
} from '@/server/actions/crops'

export const cropKeys = {
  all: ['crops'] as const,
  list: (farmId: string) => [...cropKeys.all, 'list', farmId] as const,
  detail: (id: string) => [...cropKeys.all, 'detail', id] as const,
  templates: (farmId: string) =>
    [...cropKeys.all, 'templates', farmId] as const,
}

export function useCrops(farmId: string | undefined) {
  return useQuery({
    queryKey: cropKeys.list(farmId!),
    queryFn: () => getCrops(farmId!),
    enabled: !!farmId,
  })
}

export function useCropById(id: string | undefined) {
  return useQuery({
    queryKey: cropKeys.detail(id!),
    queryFn: () => getCropById(id!),
    enabled: !!id,
  })
}

export function useCreateCrop(farmId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Parameters<typeof createCustomCrop>[1]) =>
      createCustomCrop(farmId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cropKeys.list(farmId) })
    },
  })
}

export function useUpdateCrop(farmId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string
      data: Parameters<typeof updateCustomCrop>[1]
    }) => updateCustomCrop(id, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: cropKeys.list(farmId) })
      queryClient.invalidateQueries({
        queryKey: cropKeys.detail(variables.id),
      })
    },
  })
}

export function useDeleteCrop(farmId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteCustomCrop(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cropKeys.list(farmId) })
    },
  })
}

export function useCropTemplates(farmId: string | undefined) {
  return useQuery({
    queryKey: cropKeys.templates(farmId!),
    queryFn: () => getCropTemplates(farmId!),
    enabled: !!farmId,
  })
}

export function useCreateCropTemplate(farmId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Parameters<typeof createCropTemplate>[1]) =>
      createCropTemplate(farmId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cropKeys.templates(farmId) })
    },
  })
}

export function useApplyCropTemplate() {
  return useMutation({
    mutationFn: (templateId: string) => applyCropTemplate(templateId),
  })
}

export function useDeleteCropTemplate(farmId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteCropTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cropKeys.templates(farmId) })
    },
  })
}
