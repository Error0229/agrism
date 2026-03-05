"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";

/**
 * Ensures an authenticated user always has a farm.
 * Calls ensureFarm mutation if getMyFarm returns null.
 * Shows a loading state while the farm is being created.
 */
export function FarmProvider({ children }: { children: React.ReactNode }) {
  const { isSignedIn, isLoaded } = useAuth();
  const farm = useQuery(api.farms.getMyFarm, isSignedIn ? {} : "skip");
  const ensureFarm = useMutation(api.farms.ensureFarm);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (isSignedIn && farm === null && !creating) {
      setCreating(true);
      ensureFarm().finally(() => setCreating(false));
    }
  }, [isSignedIn, farm, creating, ensureFarm]);

  // Auth not loaded yet
  if (!isLoaded) return null;

  // Not signed in — render children (middleware will redirect to login)
  if (!isSignedIn) return <>{children}</>;

  // Signed in but farm still loading or being created
  if (farm === undefined || (farm === null && creating)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">正在設定您的農場...</p>
      </div>
    );
  }

  return <>{children}</>;
}
