'use client'

import { useQuery, useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query'
import {
  getFields,
  getFieldById,
  createField,
  updateField,
  updateFieldMemo,
  deleteField,
  plantCrop,
  createRegion,
  assignCropToRegion,
  harvestCrop,
  removePlantedCrop,
  restorePlantedCrop,
  deletePlantedCropWithPlacement,
  updateCropPlacement,
  createFacility,
  updateFacility,
  deleteFacility,
  createUtilityNode,
  updateUtilityNode,
  deleteUtilityNode,
  createUtilityEdge,
  deleteUtilityEdge,
} from '@/server/actions/fields'

export const fieldKeys = {
  all: ['fields'] as const,
  list: (farmId: string) => [...fieldKeys.all, 'list', farmId] as const,
  detail: (id: string) => [...fieldKeys.all, 'detail', id] as const,
}

// Type for the field detail query data
type FieldDetail = Awaited<ReturnType<typeof getFieldById>>

/** Cancel outgoing queries and snapshot the previous field detail data */
async function snapshotField(qc: QueryClient, fieldId: string) {
  await qc.cancelQueries({ queryKey: fieldKeys.detail(fieldId) })
  const previous = qc.getQueryData<FieldDetail>(fieldKeys.detail(fieldId))
  return previous
}

/** Rollback on error */
function rollbackField(qc: QueryClient, fieldId: string, previous: FieldDetail | undefined) {
  if (previous !== undefined) {
    qc.setQueryData(fieldKeys.detail(fieldId), previous)
  }
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

export function useRestorePlantedCrop() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => restorePlantedCrop(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: fieldKeys.all })
    },
  })
}

export function useDeletePlantedCropWithPlacement() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deletePlantedCropWithPlacement(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: fieldKeys.all })
    },
  })
}

export function useCreateRegion(farmId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ fieldId, data }: { fieldId: string; data: Parameters<typeof createRegion>[1] }) =>
      createRegion(fieldId, data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: fieldKeys.list(farmId) })
      qc.invalidateQueries({ queryKey: fieldKeys.detail(variables.fieldId) })
    },
  })
}

export function useAssignCropToRegion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ plantedCropId, cropId }: { plantedCropId: string; cropId: string }) =>
      assignCropToRegion(plantedCropId, cropId),
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
    async onMutate(variables) {
      const previous = await snapshotField(qc, variables.fieldId)
      qc.setQueryData<FieldDetail>(fieldKeys.detail(variables.fieldId), (old) => {
        if (!old) return old
        return {
          ...old,
          placements: old.placements.map((p) =>
            p.id === variables.placementId ? { ...p, ...variables.data } : p
          ),
        }
      })
      return { previous }
    },
    onError: (_err, variables, context) => {
      rollbackField(qc, variables.fieldId, context?.previous)
    },
    onSettled: (_data, _err, variables) => {
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
    mutationFn: (args: {
      id: string
      fieldId: string
      data: Parameters<typeof updateFacility>[1]
    }) => updateFacility(args.id, args.data),
    async onMutate(variables) {
      const previous = await snapshotField(qc, variables.fieldId)
      qc.setQueryData<FieldDetail>(fieldKeys.detail(variables.fieldId), (old) => {
        if (!old) return old
        return {
          ...old,
          facilities: old.facilities.map((f) =>
            f.id === variables.id ? { ...f, ...variables.data } : f
          ),
        }
      })
      return { previous }
    },
    onError: (_err, variables, context) => {
      rollbackField(qc, variables.fieldId, context?.previous)
    },
    onSettled: (_data, _err, variables) => {
      qc.invalidateQueries({ queryKey: fieldKeys.detail(variables.fieldId) })
    },
  })
}

export function useDeleteFacility() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (args: { id: string; fieldId: string }) =>
      deleteFacility(args.id),
    async onMutate(variables) {
      const previous = await snapshotField(qc, variables.fieldId)
      qc.setQueryData<FieldDetail>(fieldKeys.detail(variables.fieldId), (old) => {
        if (!old) return old
        return {
          ...old,
          facilities: old.facilities.filter((f) => f.id !== variables.id),
        }
      })
      return { previous }
    },
    onError: (_err, variables, context) => {
      rollbackField(qc, variables.fieldId, context?.previous)
    },
    onSettled: (_data, _err, variables) => {
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

export function useUpdateUtilityNode() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (args: {
      id: string
      fieldId: string
      data: Parameters<typeof updateUtilityNode>[1]
    }) => updateUtilityNode(args.id, args.data),
    async onMutate(variables) {
      const previous = await snapshotField(qc, variables.fieldId)
      qc.setQueryData<FieldDetail>(fieldKeys.detail(variables.fieldId), (old) => {
        if (!old) return old
        return {
          ...old,
          utilityNodes: old.utilityNodes.map((n) =>
            n.id === variables.id ? { ...n, ...variables.data } : n
          ),
        }
      })
      return { previous }
    },
    onError: (_err, variables, context) => {
      rollbackField(qc, variables.fieldId, context?.previous)
    },
    onSettled: (_data, _err, variables) => {
      qc.invalidateQueries({ queryKey: fieldKeys.detail(variables.fieldId) })
    },
  })
}

export function useDeleteUtilityNode() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (args: { id: string; fieldId: string }) =>
      deleteUtilityNode(args.id),
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
    mutationFn: (args: { id: string; fieldId: string }) =>
      deleteUtilityEdge(args.id),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: fieldKeys.detail(variables.fieldId) })
    },
  })
}

// --- Field Memo ---

export function useUpdateFieldMemo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ fieldId, memo }: { fieldId: string; memo: string }) =>
      updateFieldMemo(fieldId, memo),
    async onMutate(variables) {
      const previous = await snapshotField(qc, variables.fieldId)
      qc.setQueryData<FieldDetail>(fieldKeys.detail(variables.fieldId), (old) => {
        if (!old) return old
        return { ...old, memo: variables.memo }
      })
      return { previous }
    },
    onError: (_err, variables, context) => {
      rollbackField(qc, variables.fieldId, context?.previous)
    },
    onSettled: (_data, _err, variables) => {
      qc.invalidateQueries({ queryKey: fieldKeys.detail(variables.fieldId) })
    },
  })
}
