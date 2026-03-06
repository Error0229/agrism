"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

// --- Field Queries ---

export function useFields(farmId: Id<"farms"> | undefined) {
  return useQuery(api.fields.list, farmId ? { farmId } : "skip");
}

export function useFieldById(fieldId: Id<"fields"> | undefined) {
  return useQuery(api.fields.getById, fieldId ? { fieldId } : "skip");
}

// --- Field CRUD ---

export function useCreateField() {
  return useMutation(api.fields.create);
}

export function useUpdateField() {
  return useMutation(api.fields.update);
}

export function useUpdateFieldMemo() {
  return useMutation(api.fields.updateMemo);
}

export function useDeleteField() {
  return useMutation(api.fields.remove);
}

// --- Planted Crops ---

export function usePlantCrop() {
  return useMutation(api.fields.plantCrop);
}

export function useCreateRegion() {
  return useMutation(api.fields.createRegion).withOptimisticUpdate(
    (localStore, args) => {
      const current = localStore.getQuery(api.fields.getById, {
        fieldId: args.fieldId,
      });
      if (current === undefined || current === null) return;

      // Create an optimistic plantedCrop entry
      // Build optimistic crop matching the shape returned by getById query.
      // Use type assertion to avoid strict type mismatch with the query return shape.
      const optimisticCrop = {
        _id: "__optimistic__" as Id<"plantedCrops">,
        _creationTime: 0,
        fieldId: args.fieldId,
        cropId: args.cropId,
        plantedDate: "2000-01-01",
        status: "growing" as const,
        xM: args.xM,
        yM: args.yM,
        widthM: args.widthM ?? 2,
        heightM: args.heightM ?? 2,
        shapePoints: args.shapePoints,
        crop: null,
      } as (typeof current.plantedCrops)[number];

      localStore.setQuery(api.fields.getById, { fieldId: args.fieldId }, {
        ...current,
        plantedCrops: [...current.plantedCrops, optimisticCrop],
      });
    },
  );
}

export function useAssignCropToRegion() {
  return useMutation(api.fields.assignCropToRegion);
}

export function useUpdatePlantedCrop() {
  return useMutation(api.fields.updatePlantedCrop);
}

export function useUpdatePlantedCropLifecycle() {
  return useMutation(api.fields.updatePlantedCropLifecycle);
}

export function useHarvestCrop() {
  return useMutation(api.fields.harvestCrop);
}

export function useRemovePlantedCrop() {
  return useMutation(api.fields.removePlantedCrop);
}

export function useRestorePlantedCrop() {
  return useMutation(api.fields.restorePlantedCrop);
}

export function useDeletePlantedCropWithPlacement() {
  return useMutation(api.fields.deletePlantedCropWithPlacement);
}

export function useUpdateCropPlacement() {
  return useMutation(api.fields.updateCropPlacement).withOptimisticUpdate(
    (localStore, args) => {
      if (!args.fieldId) return;
      const current = localStore.getQuery(api.fields.getById, {
        fieldId: args.fieldId,
      });
      if (current === undefined || current === null) return;

      const updatedCrops = current.plantedCrops.map((pc) => {
        if (pc._id !== args.plantedCropId) return pc;
        return {
          ...pc,
          ...(args.xM !== undefined && { xM: args.xM }),
          ...(args.yM !== undefined && { yM: args.yM }),
          ...(args.widthM !== undefined && { widthM: args.widthM }),
          ...(args.heightM !== undefined && { heightM: args.heightM }),
          ...(args.shapePoints !== undefined && { shapePoints: args.shapePoints }),
        };
      });

      localStore.setQuery(api.fields.getById, { fieldId: args.fieldId }, {
        ...current,
        plantedCrops: updatedCrops,
      });
    },
  );
}

// --- Facilities ---

export function useCreateFacility() {
  return useMutation(api.fields.createFacility).withOptimisticUpdate(
    (localStore, args) => {
      const current = localStore.getQuery(api.fields.getById, {
        fieldId: args.fieldId,
      });
      if (current === undefined || current === null) return;

      const optimisticFacility = {
        _id: "__optimistic__" as Id<"facilities">,
        _creationTime: 0,
        fieldId: args.fieldId,
        facilityType: args.facilityType,
        name: args.name,
        xM: args.xM,
        yM: args.yM,
        widthM: args.widthM,
        heightM: args.heightM,
      } as (typeof current.facilities)[number];

      localStore.setQuery(api.fields.getById, { fieldId: args.fieldId }, {
        ...current,
        facilities: [...current.facilities, optimisticFacility],
      });
    },
  );
}

export function useUpdateFacility() {
  return useMutation(api.fields.updateFacility).withOptimisticUpdate(
    (localStore, args) => {
      if (!args.fieldId) return;
      const current = localStore.getQuery(api.fields.getById, {
        fieldId: args.fieldId,
      });
      if (current === undefined || current === null) return;

      const updatedFacilities = current.facilities.map((f) => {
        if (f._id !== args.facilityId) return f;
        return {
          ...f,
          ...(args.facilityType !== undefined && { facilityType: args.facilityType }),
          ...(args.name !== undefined && { name: args.name }),
          ...(args.xM !== undefined && { xM: args.xM }),
          ...(args.yM !== undefined && { yM: args.yM }),
          ...(args.widthM !== undefined && { widthM: args.widthM }),
          ...(args.heightM !== undefined && { heightM: args.heightM }),
        };
      });

      localStore.setQuery(api.fields.getById, { fieldId: args.fieldId }, {
        ...current,
        facilities: updatedFacilities,
      });
    },
  );
}

export function useDeleteFacility() {
  return useMutation(api.fields.deleteFacility);
}

// --- Utility Nodes & Edges ---

export function useCreateUtilityNode() {
  return useMutation(api.fields.createUtilityNode).withOptimisticUpdate(
    (localStore, args) => {
      const current = localStore.getQuery(api.fields.getById, {
        fieldId: args.fieldId,
      });
      if (current === undefined || current === null) return;

      const optimisticNode = {
        _id: "__optimistic__" as Id<"utilityNodes">,
        _creationTime: 0,
        fieldId: args.fieldId,
        label: args.label,
        kind: args.kind,
        nodeType: args.nodeType,
        xM: args.xM,
        yM: args.yM,
      } as (typeof current.utilityNodes)[number];

      localStore.setQuery(api.fields.getById, { fieldId: args.fieldId }, {
        ...current,
        utilityNodes: [...current.utilityNodes, optimisticNode],
      });
    },
  );
}

export function useUpdateUtilityNode() {
  return useMutation(api.fields.updateUtilityNode).withOptimisticUpdate(
    (localStore, args) => {
      if (!args.fieldId) return;
      const current = localStore.getQuery(api.fields.getById, {
        fieldId: args.fieldId,
      });
      if (current === undefined || current === null) return;

      const updatedNodes = current.utilityNodes.map((n) => {
        if (n._id !== args.nodeId) return n;
        return {
          ...n,
          ...(args.label !== undefined && { label: args.label }),
          ...(args.kind !== undefined && { kind: args.kind }),
          ...(args.nodeType !== undefined && { nodeType: args.nodeType }),
          ...(args.xM !== undefined && { xM: args.xM }),
          ...(args.yM !== undefined && { yM: args.yM }),
        };
      });

      localStore.setQuery(api.fields.getById, { fieldId: args.fieldId }, {
        ...current,
        utilityNodes: updatedNodes,
      });
    },
  );
}

export function useDeleteUtilityNode() {
  return useMutation(api.fields.deleteUtilityNode);
}

export function useCreateUtilityEdge() {
  return useMutation(api.fields.createUtilityEdge).withOptimisticUpdate(
    (localStore, args) => {
      const current = localStore.getQuery(api.fields.getById, {
        fieldId: args.fieldId,
      });
      if (current === undefined || current === null) return;

      const optimisticEdge = {
        _id: "__optimistic__" as Id<"utilityEdges">,
        _creationTime: 0,
        fieldId: args.fieldId,
        fromNodeId: args.fromNodeId,
        toNodeId: args.toNodeId,
        kind: args.kind,
      } as (typeof current.utilityEdges)[number];

      localStore.setQuery(api.fields.getById, { fieldId: args.fieldId }, {
        ...current,
        utilityEdges: [...current.utilityEdges, optimisticEdge],
      });
    },
  );
}

export function useDeleteUtilityEdge() {
  return useMutation(api.fields.deleteUtilityEdge);
}
