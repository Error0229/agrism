"use client";

import { useState } from "react";
import { useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

export function useEnrichCrop() {
  const enrichAction = useAction(api.cropEnrichment.enrichCrop);
  const [isEnriching, setIsEnriching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const enrich = async (cropId: Id<"crops">) => {
    setIsEnriching(true);
    setError(null);
    try {
      const result = await enrichAction({ cropId });
      if (!result.success) {
        setError(result.error ?? "Enrichment failed");
      }
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      return { success: false, error: message };
    } finally {
      setIsEnriching(false);
    }
  };

  return { enrich, isEnriching, error };
}

export function useEnrichAllDefaults() {
  const enrichAllAction = useAction(api.cropEnrichment.enrichAllDefaults);
  const [isEnriching, setIsEnriching] = useState(false);
  const [progress, setProgress] = useState<{
    total: number;
    succeeded: number;
    failed: string[];
  } | null>(null);

  const enrichAll = async (farmId: Id<"farms">) => {
    setIsEnriching(true);
    setProgress(null);
    try {
      const result = await enrichAllAction({ farmId });
      setProgress(result);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setProgress({ total: 0, succeeded: 0, failed: [message] });
      return { total: 0, succeeded: 0, failed: [message] };
    } finally {
      setIsEnriching(false);
    }
  };

  return { enrichAll, isEnriching, progress };
}
