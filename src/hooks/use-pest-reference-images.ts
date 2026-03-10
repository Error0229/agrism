"use client"

import { useQuery } from "convex/react"
import { api } from "../../convex/_generated/api"
import type { Id } from "../../convex/_generated/dataModel"

/**
 * Fetch pest reference images matching a Chinese or scientific pest name.
 * Returns undefined while loading; empty array if no matches.
 */
export function usePestReferenceImages(pestName: string | undefined) {
  return useQuery(
    api.pestReferenceImages.listByPestName,
    pestName ? { name: pestName } : "skip"
  )
}

/**
 * Fetch pest reference images associated with a crop's scientific name.
 */
export function usePestReferenceImagesByCrop(
  cropScientificName: string | undefined
) {
  return useQuery(
    api.pestReferenceImages.listByCrop,
    cropScientificName ? { cropScientificName } : "skip"
  )
}

/**
 * Fetch the full pest reference library with optional source filter.
 */
export function usePestReferenceLibrary(source?: string) {
  return useQuery(api.pestReferenceImages.listAll, {
    source,
    limit: 200,
  })
}

/**
 * Fetch a single pest reference image record by its ID.
 */
export function usePestReferenceDetail(
  referenceId: Id<"pestReferenceImages"> | undefined
) {
  return useQuery(
    api.pestReferenceImages.getById,
    referenceId ? { id: referenceId } : "skip"
  )
}
