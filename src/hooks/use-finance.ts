"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

export function useFinanceRecords(farmId: Id<"farms"> | undefined) {
  return useQuery(api.finance.list, farmId ? { farmId } : "skip");
}

export function useFinanceSummary(farmId: Id<"farms"> | undefined) {
  return useQuery(api.finance.getSummary, farmId ? { farmId } : "skip");
}

export function useCreateFinanceRecord() {
  return useMutation(api.finance.create);
}

export function useDeleteFinanceRecord() {
  return useMutation(api.finance.remove);
}
