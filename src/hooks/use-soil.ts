'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getSoilProfile,
  upsertSoilProfile,
  getSoilAmendments,
  createSoilAmendment,
  deleteSoilAmendment,
  getSoilNotes,
  createSoilNote,
  deleteSoilNote,
} from '@/server/actions/soil'

export const soilKeys = {
  all: ['soil'] as const,
  profile: (fieldId: string) => [...soilKeys.all, 'profile', fieldId] as const,
  amendments: (fieldId: string) => [...soilKeys.all, 'amendments', fieldId] as const,
  notes: (fieldId: string) => [...soilKeys.all, 'notes', fieldId] as const,
}

// --- Soil Profile ---

export function useSoilProfile(fieldId: string | undefined) {
  return useQuery({
    queryKey: soilKeys.profile(fieldId!),
    queryFn: () => getSoilProfile(fieldId!),
    enabled: !!fieldId,
  })
}

export function useUpsertSoilProfile(fieldId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Parameters<typeof upsertSoilProfile>[1]) =>
      upsertSoilProfile(fieldId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: soilKeys.profile(fieldId) })
    },
  })
}

// --- Soil Amendments ---

export function useSoilAmendments(fieldId: string | undefined) {
  return useQuery({
    queryKey: soilKeys.amendments(fieldId!),
    queryFn: () => getSoilAmendments(fieldId!),
    enabled: !!fieldId,
  })
}

export function useCreateSoilAmendment(fieldId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Parameters<typeof createSoilAmendment>[1]) =>
      createSoilAmendment(fieldId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: soilKeys.amendments(fieldId) })
    },
  })
}

export function useDeleteSoilAmendment(fieldId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteSoilAmendment(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: soilKeys.amendments(fieldId) })
    },
  })
}

// --- Soil Notes ---

export function useSoilNotes(fieldId: string | undefined) {
  return useQuery({
    queryKey: soilKeys.notes(fieldId!),
    queryFn: () => getSoilNotes(fieldId!),
    enabled: !!fieldId,
  })
}

export function useCreateSoilNote(fieldId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Parameters<typeof createSoilNote>[1]) =>
      createSoilNote(fieldId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: soilKeys.notes(fieldId) })
    },
  })
}

export function useDeleteSoilNote(fieldId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteSoilNote(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: soilKeys.notes(fieldId) })
    },
  })
}
