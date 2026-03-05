"use client"

import { useQuery, useMutation } from "convex/react"
import { api } from "../../convex/_generated/api"
import type { Id } from "../../convex/_generated/dataModel"

export function useExportFarmData(farmId: Id<"farms"> | undefined) {
  return useQuery(api.dataTransfer.exportFarmData, farmId ? { farmId } : "skip")
}

export function useImportFarmData() {
  return useMutation(api.dataTransfer.importFarmData)
}
