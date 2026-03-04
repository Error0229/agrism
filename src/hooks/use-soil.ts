"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

// --- Soil Profile (inlined into fields, mutation only) ---

export function useUpsertSoilProfile() {
  return useMutation(api.soil.upsertProfile);
}

// --- Soil Amendments ---

export function useSoilAmendments(fieldId: Id<"fields"> | undefined) {
  return useQuery(api.soil.listAmendments, fieldId ? { fieldId } : "skip");
}

export function useCreateSoilAmendment() {
  return useMutation(api.soil.createAmendment);
}

export function useDeleteSoilAmendment() {
  return useMutation(api.soil.removeAmendment);
}

// --- Soil Notes ---

export function useSoilNotes(fieldId: Id<"fields"> | undefined) {
  return useQuery(api.soil.listNotes, fieldId ? { fieldId } : "skip");
}

export function useCreateSoilNote() {
  return useMutation(api.soil.createNote);
}

export function useDeleteSoilNote() {
  return useMutation(api.soil.removeNote);
}
