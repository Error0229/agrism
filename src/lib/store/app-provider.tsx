"use client";

import type { ReactNode } from "react";
import { FieldsProvider } from "./fields-context";
import { TasksProvider } from "./tasks-context";
import { CustomCropsProvider } from "./custom-crops-context";
import { FarmManagementProvider } from "./farm-management-context";

export function AppProvider({ children }: { children: ReactNode }) {
  return (
    <CustomCropsProvider>
      <FieldsProvider>
        <TasksProvider>
          <FarmManagementProvider>{children}</FarmManagementProvider>
        </TasksProvider>
      </FieldsProvider>
    </CustomCropsProvider>
  );
}
