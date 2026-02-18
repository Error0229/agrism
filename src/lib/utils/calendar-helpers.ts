import { addDays } from "date-fns";
import type { Task } from "@/lib/types";
import { TaskType } from "@/lib/types";
import type { Crop, PlantedCrop } from "@/lib/types";
import { getTaskEffortPreset } from "@/lib/utils/task-effort";

export function generateTasksForPlantedCrop(
  crop: Crop,
  plantedCrop: PlantedCrop
): Omit<Task, "id" | "completed">[] {
  const tasks: Omit<Task, "id" | "completed">[] = [];
  const plantDate = new Date(plantedCrop.plantedDate);
  const growthDays = plantedCrop.customGrowthDays ?? crop.growthDays;

  // 播種任務
  tasks.push({
    type: TaskType.播種,
    title: `${crop.emoji} ${crop.name} - 播種`,
    cropId: crop.id,
    plantedCropId: plantedCrop.id,
    fieldId: plantedCrop.fieldId,
    dueDate: plantedCrop.plantedDate,
    ...getTaskEffortPreset(TaskType.播種),
  });

  // 定期施肥任務
  const harvestDate = addDays(plantDate, growthDays);
  let fertDate = addDays(plantDate, crop.fertilizerIntervalDays);
  while (fertDate < harvestDate) {
    tasks.push({
      type: TaskType.施肥,
      title: `${crop.emoji} ${crop.name} - 施肥`,
      cropId: crop.id,
      plantedCropId: plantedCrop.id,
      fieldId: plantedCrop.fieldId,
      dueDate: fertDate.toISOString(),
      ...getTaskEffortPreset(TaskType.施肥),
    });
    fertDate = addDays(fertDate, crop.fertilizerIntervalDays);
  }

  // 剪枝任務
  if (crop.needsPruning && crop.pruningMonths) {
    for (let dayOffset = 0; dayOffset < growthDays; dayOffset += 30) {
      const checkDate = addDays(plantDate, dayOffset);
      const month = checkDate.getMonth() + 1;
      if (crop.pruningMonths.includes(month)) {
        tasks.push({
          type: TaskType.剪枝,
          title: `${crop.emoji} ${crop.name} - 剪枝`,
          cropId: crop.id,
          plantedCropId: plantedCrop.id,
          fieldId: plantedCrop.fieldId,
          dueDate: checkDate.toISOString(),
          ...getTaskEffortPreset(TaskType.剪枝),
        });
      }
    }
  }

  // 收成提醒
  tasks.push({
    type: TaskType.收成,
    title: `${crop.emoji} ${crop.name} - 預計收成`,
    cropId: crop.id,
    plantedCropId: plantedCrop.id,
    fieldId: plantedCrop.fieldId,
    dueDate: harvestDate.toISOString(),
    ...getTaskEffortPreset(TaskType.收成),
  });

  // 防颱任務（生長期跨 6-10 月）
  for (let dayOffset = 0; dayOffset < crop.growthDays; dayOffset += 30) {
    const checkDate = addDays(plantDate, dayOffset);
    const month = checkDate.getMonth() + 1;
    if (month >= 6 && month <= 10) {
      tasks.push({
        type: TaskType.防颱,
        title: `${crop.emoji} ${crop.name} - 防颱準備`,
        cropId: crop.id,
        plantedCropId: plantedCrop.id,
        fieldId: plantedCrop.fieldId,
        dueDate: checkDate.toISOString(),
        ...getTaskEffortPreset(TaskType.防颱),
      });
      break; // 只加一次防颱提醒
    }
  }

  return tasks;
}

export const taskTypeColors: Record<TaskType, string> = {
  [TaskType.播種]: "bg-green-500",
  [TaskType.施肥]: "bg-amber-500",
  [TaskType.澆水]: "bg-blue-400",
  [TaskType.剪枝]: "bg-blue-600",
  [TaskType.收成]: "bg-red-500",
  [TaskType.防颱]: "bg-purple-500",
  [TaskType.病蟲害防治]: "bg-orange-500",
};

export const taskTypeDotColors: Record<TaskType, string> = {
  [TaskType.播種]: "bg-green-500",
  [TaskType.施肥]: "bg-amber-500",
  [TaskType.澆水]: "bg-blue-400",
  [TaskType.剪枝]: "bg-blue-600",
  [TaskType.收成]: "bg-red-500",
  [TaskType.防颱]: "bg-purple-500",
  [TaskType.病蟲害防治]: "bg-orange-500",
};
