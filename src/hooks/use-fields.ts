'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getFields,
  getFieldById,
  createField,
  updateField,
  deleteField,
  plantCrop,
  harvestCrop,
  removePlantedCrop,
  updateCropPlacement,
  createFacility,
  updateFacility,
  deleteFacility,
  createUtilityNode,
  deleteUtilityNode,
  createUtilityEdge,
  deleteUtilityEdge,
} from '@/server/actions/fields'

export const fieldKeys = {
  all: ['fields'] as const,
  list: (farmId: string) => [...fieldKeys.all, 'list', farmId] as const,
  detail: (id: string) => [...fieldKeys.all, 'detail', id] as const,
}

export function useFields(farmId: string | undefined) {
  return useQuery({
    queryKey: fieldKeys.list(farmId!),
    queryFn: () => getFields(farmId!),
    enabled: !!farmId,
  })
}

export function useFieldById(id: string | undefined) {
  return useQuery({
    queryKey: fieldKeys.detail(id!),
    queryFn: () => getFieldById(id!),
    enabled: !!id,
  })
}

export function useCreateField(farmId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Parameters<typeof createField>[1]) =>
      createField(farmId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: fieldKeys.list(farmId) })
    },
  })
}

export function useUpdateField(farmId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof updateField>[1] }) =>
      updateField(id, data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: fieldKeys.list(farmId) })
      qc.invalidateQueries({ queryKey: fieldKeys.detail(variables.id) })
    },
  })
}

export function useDeleteField(farmId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteField(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: fieldKeys.list(farmId) })
    },
  })
}

export function usePlantCrop(farmId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ fieldId, data }: { fieldId: string; data: Parameters<typeof plantCrop>[1] }) =>
      plantCrop(fieldId, data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: fieldKeys.list(farmId) })
      qc.invalidateQueries({ queryKey: fieldKeys.detail(variables.fieldId) })
      qc.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}

export function useHarvestCrop() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => harvestCrop(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: fieldKeys.all })
    },
  })
}

export function useRemovePlantedCrop() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => removePlantedCrop(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: fieldKeys.all })
    },
  })
}

export function useUpdateCropPlacement() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (args: {
      placementId: string
      fieldId: string
      data: Parameters<typeof updateCropPlacement>[1]
    }) => updateCropPlacement(args.placementId, args.data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: fieldKeys.detail(variables.fieldId) })
    },
  })
}

// --- Facilities ---

export function useCreateFacility() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ fieldId, data }: { fieldId: string; data: Parameters<typeof createFacility>[1] }) =>
      createFacility(fieldId, data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: fieldKeys.detail(variables.fieldId) })
    },
  })
}

export function useUpdateFacility() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      fieldId,
      data,
    }: {
      id: string
      fieldId: string
      data: Parameters<typeof updateFacility>[1]
    }) => updateFacility(id, data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: fieldKeys.detail(variables.fieldId) })
    },
  })
}

export function useDeleteFacility() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, fieldId }: { id: string; fieldId: string }) =>
      deleteFacility(id),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: fieldKeys.detail(variables.fieldId) })
    },
  })
}

// --- Utility Nodes & Edges ---

export function useCreateUtilityNode() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ fieldId, data }: { fieldId: string; data: Parameters<typeof createUtilityNode>[1] }) =>
      createUtilityNode(fieldId, data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: fieldKeys.detail(variables.fieldId) })
    },
  })
}

export function useDeleteUtilityNode() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, fieldId }: { id: string; fieldId: string }) =>
      deleteUtilityNode(id),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: fieldKeys.detail(variables.fieldId) })
    },
  })
}

export function useCreateUtilityEdge() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ fieldId, data }: { fieldId: string; data: Parameters<typeof createUtilityEdge>[1] }) =>
      createUtilityEdge(fieldId, data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: fieldKeys.detail(variables.fieldId) })
    },
  })
}

export function useDeleteUtilityEdge() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, fieldId }: { id: string; fieldId: string }) =>
      deleteUtilityEdge(id),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: fieldKeys.detail(variables.fieldId) })
    },
  })
}
