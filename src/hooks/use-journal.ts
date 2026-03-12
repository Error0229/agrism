"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import type { JournalCategory } from "@/lib/types/enums";

// ---------------------------------------------------------------------------
// Field Journal
// ---------------------------------------------------------------------------

/**
 * Fetch field-level journal entries for a given field.
 * Returns entries in newest-first order.
 */
export function useFieldJournal(
  fieldId: Id<"fields"> | undefined,
  options?: { type?: JournalCategory; limit?: number },
) {
  return useQuery(
    api.journal.getFieldEntries,
    fieldId
      ? { fieldId, type: options?.type, limit: options?.limit }
      : "skip",
  );
}

/**
 * Fetch region-level journal entries for a given planted crop.
 * Returns entries in newest-first order.
 */
export function useRegionJournal(
  plantedCropId: Id<"plantedCrops"> | undefined,
  options?: { type?: JournalCategory; limit?: number },
) {
  return useQuery(
    api.journal.getRegionEntries,
    plantedCropId
      ? { plantedCropId, type: options?.type, limit: options?.limit }
      : "skip",
  );
}

// ---------------------------------------------------------------------------
// Field Journal Mutations
// ---------------------------------------------------------------------------

export function useCreateFieldJournalEntry() {
  return useMutation(api.journal.createFieldEntry);
}

export function useUpdateFieldJournalEntry() {
  return useMutation(api.journal.updateFieldEntry);
}

export function useDeleteFieldJournalEntry() {
  return useMutation(api.journal.deleteFieldEntry);
}

// ---------------------------------------------------------------------------
// Region Journal Mutations
// ---------------------------------------------------------------------------

export function useCreateRegionJournalEntry() {
  return useMutation(api.journal.createRegionEntry);
}

export function useUpdateRegionJournalEntry() {
  return useMutation(api.journal.updateRegionEntry);
}

export function useDeleteRegionJournalEntry() {
  return useMutation(api.journal.deleteRegionEntry);
}
