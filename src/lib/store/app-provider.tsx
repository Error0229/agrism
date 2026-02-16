"use client";

import type { ReactNode } from "react";
import { FieldsProvider } from "./fields-context";
import { TasksProvider } from "./tasks-context";

export function AppProvider({ children }: { children: ReactNode }) {
  return (
    <FieldsProvider>
      <TasksProvider>{children}</TasksProvider>
    </FieldsProvider>
  );
}
