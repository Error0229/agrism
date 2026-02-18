"use client";

import { createContext, useContext, useCallback, useMemo, type ReactNode } from "react";
import { useLocalStorage } from "@/hooks/use-local-storage";
import type { Task } from "@/lib/types";
import { v4 as uuidv4 } from "uuid";
import { normalizeTaskEffort } from "@/lib/utils/task-effort";

interface TasksContextType {
  tasks: Task[];
  isLoaded: boolean;
  addTask: (task: Omit<Task, "id" | "completed">) => Task;
  addTasks: (tasks: Omit<Task, "id" | "completed">[]) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  removeTask: (id: string) => void;
  completeTask: (id: string) => void;
  removeTasksByPlantedCrop: (plantedCropId: string) => void;
}

const TasksContext = createContext<TasksContextType | null>(null);

export function TasksProvider({ children }: { children: ReactNode }) {
  const [tasksRaw, setTasks, isLoaded] = useLocalStorage<Task[]>("hualien-tasks", []);
  const tasks = useMemo(() => tasksRaw.map((task) => normalizeTaskEffort(task)), [tasksRaw]);

  const addTask = useCallback(
    (task: Omit<Task, "id" | "completed">) => {
      const newTask: Task = normalizeTaskEffort({ ...task, id: uuidv4(), completed: false });
      setTasks((prev) => [...prev, newTask]);
      return newTask;
    },
    [setTasks]
  );

  const addTasks = useCallback(
    (newTasks: Omit<Task, "id" | "completed">[]) => {
      const tasksWithIds = newTasks.map((t) => normalizeTaskEffort({ ...t, id: uuidv4(), completed: false }));
      setTasks((prev) => [...prev, ...tasksWithIds]);
    },
    [setTasks]
  );

  const updateTask = useCallback(
    (id: string, updates: Partial<Task>) => {
      setTasks((prev) => prev.map((t) => (t.id === id ? normalizeTaskEffort({ ...t, ...updates }) : t)));
    },
    [setTasks]
  );

  const removeTask = useCallback(
    (id: string) => {
      setTasks((prev) => prev.filter((t) => t.id !== id));
    },
    [setTasks]
  );

  const completeTask = useCallback(
    (id: string) => {
      setTasks((prev) => prev.map((t) => (t.id === id ? normalizeTaskEffort({ ...t, completed: true }) : t)));
    },
    [setTasks]
  );

  const removeTasksByPlantedCrop = useCallback(
    (plantedCropId: string) => {
      setTasks((prev) => prev.filter((t) => t.plantedCropId !== plantedCropId));
    },
    [setTasks]
  );

  return (
    <TasksContext.Provider
      value={{ tasks, isLoaded, addTask, addTasks, updateTask, removeTask, completeTask, removeTasksByPlantedCrop }}
    >
      {children}
    </TasksContext.Provider>
  );
}

export function useTasks() {
  const ctx = useContext(TasksContext);
  if (!ctx) throw new Error("useTasks must be used within TasksProvider");
  return ctx;
}
