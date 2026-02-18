"use client";

import { useEffect, useRef } from "react";
import { useCustomCrops } from "@/lib/store/custom-crops-context";
import { useFarmManagement } from "@/lib/store/farm-management-context";
import { useFields } from "@/lib/store/fields-context";
import { runScheduledPlannerBackup } from "@/lib/store/planner-backup";
import { useTasks } from "@/lib/store/tasks-context";

const BACKUP_CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;

export function PlannerBackupRuntime() {
  const { isLoaded: fieldsLoaded } = useFields();
  const { isLoaded: tasksLoaded } = useTasks();
  const { isLoaded: cropsLoaded } = useCustomCrops();
  const { isLoaded: farmLoaded } = useFarmManagement();
  const didBootstrap = useRef(false);

  const allLoaded = fieldsLoaded && tasksLoaded && cropsLoaded && farmLoaded;

  useEffect(() => {
    if (!allLoaded || didBootstrap.current) return;
    didBootstrap.current = true;
    runScheduledPlannerBackup(window.localStorage);
  }, [allLoaded]);

  useEffect(() => {
    if (!allLoaded) return;
    const timer = window.setInterval(() => {
      runScheduledPlannerBackup(window.localStorage);
    }, BACKUP_CHECK_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [allLoaded]);

  return null;
}
