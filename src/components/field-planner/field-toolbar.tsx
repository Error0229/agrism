"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFields } from "@/lib/store/fields-context";
import { useTasks } from "@/lib/store/tasks-context";
import { useAllCrops } from "@/lib/data/crop-lookup";
import { generateTasksForPlantedCrop } from "@/lib/utils/calendar-helpers";
import { isInfrastructureCategory, type Field, type UtilityKind, type UtilityNodeType } from "@/lib/types";
import { polygonBounds, toTrapezoidPoints } from "@/lib/utils/crop-shape";
import { mergeCropRegions, splitCropRegion, type SplitDirection } from "@/lib/utils/region-edit";
import {
  deriveFacilityTypeFromCrop,
  getFacilityTypeOptions,
  normalizeFacilityName,
  normalizeFacilityType,
  normalizeLinkedUtilityNodeIds,
} from "@/lib/utils/facility-metadata";
import {
  formatUtilityNodeDisplayLabel,
  getDefaultUtilityNodeType,
  getUtilityNodeTypeLabel,
  getUtilityNodeTypeOptions,
  normalizeUtilityNodeType,
} from "@/lib/utils/utility-node";
import { CropTimingDialog } from "./crop-timing-dialog";
import { CropHarvestDialog } from "./crop-harvest-dialog";
import { Plus, Trash2, Clock, Scissors, Eye, EyeOff } from "lucide-react";
import { v4 as uuidv4 } from "uuid";

interface FieldToolbarProps {
  field: Field;
  selectedCropId: string | null;
  onSelectCrop: (id: string | null) => void;
  occurredAt?: string;
  showUtilities: boolean;
  onToggleUtilities: () => void;
}

export function FieldToolbar({ field, selectedCropId, onSelectCrop, occurredAt, showUtilities, onToggleUtilities }: FieldToolbarProps) {
  const {
    addPlantedCrop,
    updatePlantedCrop,
    updateField,
    removePlantedCrop,
    harvestPlantedCrop,
    showHarvestedCrops,
    setShowHarvestedCrops,
  } = useFields();
  const { addTasks, removeTasksByPlantedCrop } = useTasks();
  const allCrops = useAllCrops();
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [reassignOpen, setReassignOpen] = useState(false);
  const [mergeOpen, setMergeOpen] = useState(false);
  const [addUtilityOpen, setAddUtilityOpen] = useState(false);
  const [connectOpen, setConnectOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [edgeKind, setEdgeKind] = useState<UtilityKind>("water");
  const [newNodeKind, setNewNodeKind] = useState<UtilityKind>("water");
  const [newNodeType, setNewNodeType] = useState<UtilityNodeType>(getDefaultUtilityNodeType("water"));
  const [newNodeLabel, setNewNodeLabel] = useState("");
  const [fromNodeId, setFromNodeId] = useState("");
  const [toNodeId, setToNodeId] = useState("");
  const [selectedUtilityNodeId, setSelectedUtilityNodeId] = useState("");
  const [search, setSearch] = useState("");
  const [timingOpen, setTimingOpen] = useState(false);
  const [harvestOpen, setHarvestOpen] = useState(false);

  const filteredCrops = useMemo(() => allCrops.filter((c) => c.name.includes(search)), [allCrops, search]);
  const facilityTypeOptions = useMemo(() => getFacilityTypeOptions(), []);

  const selectedPlanted = selectedCropId ? field.plantedCrops.find((c) => c.id === selectedCropId) ?? null : null;
  const selectedCropMeta = useMemo(
    () => (selectedPlanted ? allCrops.find((crop) => crop.id === selectedPlanted.cropId) : null),
    [selectedPlanted, allCrops]
  );
  const selectedIsInfrastructure = selectedCropMeta ? isInfrastructureCategory(selectedCropMeta.category) : false;
  const mergeCandidates = useMemo(
    () =>
      field.plantedCrops
        .filter((crop) => crop.id !== selectedCropId && crop.status === "growing")
        .map((crop) => ({
          planted: crop,
          meta: allCrops.find((item) => item.id === crop.cropId),
        }))
        .filter((item) => Boolean(item.meta)),
    [allCrops, field.plantedCrops, selectedCropId]
  );
  const utilityNodes = field.utilityNodes ?? [];
  const utilityEdges = field.utilityEdges ?? [];
  const selectedUtilityNode = utilityNodes.find((node) => node.id === selectedUtilityNodeId) ?? null;
  const newNodeTypeOptions = useMemo(() => getUtilityNodeTypeOptions(newNodeKind), [newNodeKind]);
  const selectedNodeTypeOptions = useMemo(
    () => (selectedUtilityNode ? getUtilityNodeTypeOptions(selectedUtilityNode.kind) : []),
    [selectedUtilityNode]
  );

  const handleAddCrop = (cropId: string) => {
    const crop = allCrops.find((c) => c.id === cropId);
    if (!crop) return;
    const existingCount = field.plantedCrops.filter((item) => item.status === "growing").length;
    const column = existingCount % 5;
    const row = Math.floor(existingCount / 5);
    const plantedDate = occurredAt ?? new Date().toISOString();
    const plantedCrop = addPlantedCrop(
      field.id,
      {
        cropId,
        fieldId: field.id,
        plantedDate,
        status: "growing",
        position: { x: 50 + column * 70, y: 50 + row * 70 },
        size: { width: crop.spacing.plant, height: crop.spacing.row },
        facilityType: deriveFacilityTypeFromCrop(crop),
      },
      { occurredAt: plantedDate }
    );
    if (!isInfrastructureCategory(crop.category)) {
      const tasks = generateTasksForPlantedCrop(crop, plantedCrop);
      addTasks(tasks);
    }
    setPopoverOpen(false);
    setSearch("");
  };

  const handleDeleteSelected = () => {
    if (!selectedCropId) return;
    removeTasksByPlantedCrop(selectedCropId);
    removePlantedCrop(field.id, selectedCropId, { occurredAt });
    onSelectCrop(null);
  };

  const handleHarvestSelected = (harvestedDate: string) => {
    if (!selectedCropId) return;
    harvestPlantedCrop(field.id, selectedCropId, harvestedDate, { occurredAt: occurredAt ?? harvestedDate });
  };

  const handleConvertToTrapezoid = () => {
    if (!selectedPlanted || selectedPlanted.status !== "growing") return;
    const points = toTrapezoidPoints(selectedPlanted);
    const bounds = polygonBounds(points);
    updatePlantedCrop(
      field.id,
      selectedPlanted.id,
      {
        shape: { kind: "polygon", points },
        position: { x: bounds.minX, y: bounds.minY },
        size: { width: bounds.width, height: bounds.height },
      },
      { occurredAt }
    );
  };

  const handleReassignSelected = (nextCropId: string) => {
    if (!selectedPlanted) return;
    const nextCrop = allCrops.find((crop) => crop.id === nextCropId);
    if (!nextCrop) return;

    updatePlantedCrop(
      field.id,
      selectedPlanted.id,
      {
        cropId: nextCropId,
        ...(isInfrastructureCategory(nextCrop.category)
          ? {
              facilityType: normalizeFacilityType(selectedPlanted.facilityType) ?? deriveFacilityTypeFromCrop(nextCrop),
            }
          : { facilityType: undefined, facilityName: undefined, linkedUtilityNodeIds: undefined }),
      },
      { occurredAt }
    );
    removeTasksByPlantedCrop(selectedPlanted.id);
    if (selectedPlanted.status === "growing" && !isInfrastructureCategory(nextCrop.category)) {
      const nextTasks = generateTasksForPlantedCrop(nextCrop, { ...selectedPlanted, cropId: nextCropId });
      addTasks(nextTasks);
    }
    setReassignOpen(false);
  };

  const handleSplitSelected = (direction: SplitDirection) => {
    if (!selectedPlanted || selectedPlanted.status !== "growing") return;
    const split = splitCropRegion(selectedPlanted, direction);
    if (!split) {
      window.alert("目前區域太小，無法再切分。");
      return;
    }

    const confirmed = window.confirm(`確定要將區域${direction === "vertical" ? "左右" : "上下"}切分嗎？`);
    if (!confirmed) return;

    const [first, second] = split;
    updatePlantedCrop(
      field.id,
      selectedPlanted.id,
      {
        position: { x: first.x, y: first.y },
        size: { width: first.width, height: first.height },
        shape: undefined,
      },
      { occurredAt }
    );

    const created = addPlantedCrop(
      field.id,
      {
        cropId: selectedPlanted.cropId,
        fieldId: field.id,
        plantedDate: selectedPlanted.plantedDate,
        harvestedDate: selectedPlanted.harvestedDate,
        status: selectedPlanted.status,
        position: { x: second.x, y: second.y },
        size: { width: second.width, height: second.height },
        customGrowthDays: selectedPlanted.customGrowthDays,
        notes: selectedPlanted.notes,
      },
      { occurredAt: occurredAt ?? selectedPlanted.plantedDate }
    );

    if (selectedCropMeta && !isInfrastructureCategory(selectedCropMeta.category)) {
      addTasks(generateTasksForPlantedCrop(selectedCropMeta, created));
    }
  };

  const handleMergeWith = (targetCropId: string) => {
    if (!selectedPlanted || selectedPlanted.status !== "growing") return;
    const target = field.plantedCrops.find((crop) => crop.id === targetCropId && crop.status === "growing");
    if (!target) return;

    const confirmed = window.confirm("確定要合併這兩個區域嗎？合併後會保留目前選取區域並移除另一區域。");
    if (!confirmed) return;

    const merged = mergeCropRegions(selectedPlanted, target);
    updatePlantedCrop(
      field.id,
      selectedPlanted.id,
      {
        position: { x: merged.x, y: merged.y },
        size: { width: merged.width, height: merged.height },
        shape: undefined,
      },
      { occurredAt }
    );
    removeTasksByPlantedCrop(target.id);
    removePlantedCrop(field.id, target.id, { occurredAt });
    setMergeOpen(false);
  };

  const handleAddUtilityNode = () => {
    const kind = newNodeKind;
    const nodeType = normalizeUtilityNodeType(kind, newNodeType);
    const count = utilityNodes.filter((node) => node.kind === kind).length;
    const typeLabel = getUtilityNodeTypeLabel(nodeType);
    const normalizedLabel = newNodeLabel.trim();
    const nextNode = {
      id: uuidv4(),
      label: normalizedLabel.length > 0 ? normalizedLabel : `${typeLabel} ${count + 1}`,
      kind,
      nodeType,
      position: {
        x: 80 + (count % 4) * 120,
        y: 80 + Math.floor(count / 4) * 90,
      },
    };
    updateField(field.id, { utilityNodes: [...utilityNodes, nextNode] }, { occurredAt });
    setNewNodeLabel("");
    setAddUtilityOpen(false);
  };

  const handleNewNodeKindChange = (value: string) => {
    const nextKind = value as UtilityKind;
    setNewNodeKind(nextKind);
    setNewNodeType((prev) => normalizeUtilityNodeType(nextKind, prev));
  };

  const handleUpdateSelectedUtilityNodeType = (value: string) => {
    if (!selectedUtilityNode) return;
    const nextType = normalizeUtilityNodeType(selectedUtilityNode.kind, value);
    updateField(
      field.id,
      {
        utilityNodes: utilityNodes.map((node) => (node.id === selectedUtilityNode.id ? { ...node, nodeType: nextType } : node)),
      },
      { occurredAt }
    );
  };

  const handleUpdateSelectedUtilityNodeLabel = (rawValue: string) => {
    if (!selectedUtilityNode) return;
    const nextLabel = rawValue.trim();
    if (!nextLabel || nextLabel === selectedUtilityNode.label) return;
    updateField(
      field.id,
      {
        utilityNodes: utilityNodes.map((node) => (node.id === selectedUtilityNode.id ? { ...node, label: nextLabel } : node)),
      },
      { occurredAt }
    );
  };

  const handleConnectNodes = () => {
    if (!fromNodeId || !toNodeId || fromNodeId === toNodeId) return;
    const exists = utilityEdges.some(
      (edge) =>
        edge.kind === edgeKind &&
        ((edge.fromNodeId === fromNodeId && edge.toNodeId === toNodeId) ||
          (edge.fromNodeId === toNodeId && edge.toNodeId === fromNodeId))
    );
    if (exists) {
      window.alert("相同類型的連線已存在。");
      return;
    }

    updateField(
      field.id,
      {
        utilityEdges: [
          ...utilityEdges,
          {
            id: uuidv4(),
            fromNodeId,
            toNodeId,
            kind: edgeKind,
          },
        ],
      },
      { occurredAt }
    );
    setConnectOpen(false);
    setFromNodeId("");
    setToNodeId("");
  };

  const handleDeleteUtilityNode = () => {
    if (!selectedUtilityNode) return;
    const confirmed = window.confirm(`確定刪除 ${formatUtilityNodeDisplayLabel(selectedUtilityNode)}？相關連線會一起刪除。`);
    if (!confirmed) return;

    updateField(
      field.id,
      {
        utilityNodes: utilityNodes.filter((node) => node.id !== selectedUtilityNode.id),
        utilityEdges: utilityEdges.filter(
          (edge) => edge.fromNodeId !== selectedUtilityNode.id && edge.toNodeId !== selectedUtilityNode.id
        ),
      },
      { occurredAt }
    );
    setSelectedUtilityNodeId("");
    setManageOpen(false);
  };

  const handleClearUtilityEdges = () => {
    if (utilityEdges.length === 0) return;
    const confirmed = window.confirm("確定清除所有水電連線嗎？節點會保留。");
    if (!confirmed) return;

    updateField(field.id, { utilityEdges: [] }, { occurredAt });
    setConnectOpen(false);
    setManageOpen(false);
  };

  const handleUpdateFacilityType = (value: string) => {
    if (!selectedPlanted || !selectedIsInfrastructure) return;
    updatePlantedCrop(
      field.id,
      selectedPlanted.id,
      {
        facilityType: value === "__none" ? undefined : normalizeFacilityType(value),
      },
      { occurredAt }
    );
  };

  const handleUpdateFacilityName = (rawValue: string) => {
    if (!selectedPlanted || !selectedIsInfrastructure) return;
    const normalized = normalizeFacilityName(rawValue);
    if (normalized === selectedPlanted.facilityName) return;
    updatePlantedCrop(field.id, selectedPlanted.id, { facilityName: normalized }, { occurredAt });
  };

  const handleToggleLinkedUtilityNode = (nodeId: string) => {
    if (!selectedPlanted || !selectedIsInfrastructure) return;
    const current = new Set(normalizeLinkedUtilityNodeIds(selectedPlanted.linkedUtilityNodeIds) ?? []);
    if (current.has(nodeId)) {
      current.delete(nodeId);
    } else {
      current.add(nodeId);
    }
    updatePlantedCrop(
      field.id,
      selectedPlanted.id,
      { linkedUtilityNodeIds: Array.from(current.values()) },
      { occurredAt }
    );
  };

  return (
    <div className="flex items-center gap-2">
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <Button size="sm">
            <Plus className="size-4 mr-1" />
            新增作物
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-2" align="start">
          <Input
            placeholder="搜尋作物..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mb-2"
          />
          <ScrollArea className="h-48">
            <div className="space-y-1">
              {filteredCrops.map((crop) => (
                <button
                  key={crop.id}
                  onClick={() => handleAddCrop(crop.id)}
                  className="flex w-full items-center gap-2 rounded p-2 text-left text-sm transition-colors hover:bg-accent"
                >
                  <span className="text-lg">{crop.emoji}</span>
                  <span>{crop.name}</span>
                </button>
              ))}
            </div>
          </ScrollArea>
        </PopoverContent>
      </Popover>

      <Button size="sm" variant="outline" onClick={() => setShowHarvestedCrops(!showHarvestedCrops)}>
        {showHarvestedCrops ? <EyeOff className="size-4 mr-1" /> : <Eye className="size-4 mr-1" />}
        {showHarvestedCrops ? "隱藏已收成" : "顯示已收成"}
      </Button>
      <Button size="sm" variant="outline" onClick={onToggleUtilities}>
        {showUtilities ? "隱藏水電" : "顯示水電"}
      </Button>
      <Popover open={addUtilityOpen} onOpenChange={setAddUtilityOpen}>
        <PopoverTrigger asChild>
          <Button size="sm" variant="outline">
            新增節點
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3 space-y-2" align="start">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">節點類型</p>
            <Select value={newNodeKind} onValueChange={handleNewNodeKindChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="water">供水</SelectItem>
                <SelectItem value="electric">供電</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">節點子類型</p>
            <Select value={newNodeType} onValueChange={(value) => setNewNodeType(value as UtilityNodeType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {newNodeTypeOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {getUtilityNodeTypeLabel(option)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">節點名稱（可選）</p>
            <Input
              value={newNodeLabel}
              onChange={(event) => setNewNodeLabel(event.target.value)}
              placeholder="例如：北側泵站"
            />
          </div>
          <Button size="sm" className="w-full" onClick={handleAddUtilityNode}>
            建立節點
          </Button>
        </PopoverContent>
      </Popover>
      <Popover open={connectOpen} onOpenChange={setConnectOpen}>
        <PopoverTrigger asChild>
          <Button size="sm" variant="outline" disabled={utilityNodes.length < 2}>
            連接節點
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3 space-y-2" align="start">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">連線類型</p>
            <Select value={edgeKind} onValueChange={(value) => setEdgeKind(value as UtilityKind)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="water">供水</SelectItem>
                <SelectItem value="electric">供電</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">起點</p>
            <Select value={fromNodeId} onValueChange={setFromNodeId}>
              <SelectTrigger><SelectValue placeholder="選擇起點" /></SelectTrigger>
              <SelectContent>
                {utilityNodes.map((node) => (
                  <SelectItem key={node.id} value={node.id}>{formatUtilityNodeDisplayLabel(node)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">終點</p>
            <Select value={toNodeId} onValueChange={setToNodeId}>
              <SelectTrigger><SelectValue placeholder="選擇終點" /></SelectTrigger>
              <SelectContent>
                {utilityNodes.map((node) => (
                  <SelectItem key={node.id} value={node.id}>{formatUtilityNodeDisplayLabel(node)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button size="sm" className="w-full" onClick={handleConnectNodes} disabled={!fromNodeId || !toNodeId || fromNodeId === toNodeId}>
            建立連線
          </Button>
        </PopoverContent>
      </Popover>
      <Popover open={manageOpen} onOpenChange={setManageOpen}>
        <PopoverTrigger asChild>
          <Button size="sm" variant="outline" disabled={utilityNodes.length === 0 && utilityEdges.length === 0}>
            管理水電
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3 space-y-3" align="start">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">刪除節點</p>
            <Select value={selectedUtilityNode?.id} onValueChange={setSelectedUtilityNodeId}>
              <SelectTrigger>
                <SelectValue placeholder="選擇節點" />
              </SelectTrigger>
              <SelectContent>
                {utilityNodes.map((node) => (
                  <SelectItem key={node.id} value={node.id}>
                    {formatUtilityNodeDisplayLabel(node)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedUtilityNode && (
              <div className="space-y-2 rounded border p-2">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">節點子類型</p>
                  <Select
                    value={normalizeUtilityNodeType(selectedUtilityNode.kind, selectedUtilityNode.nodeType)}
                    onValueChange={handleUpdateSelectedUtilityNodeType}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedNodeTypeOptions.map((option) => (
                        <SelectItem key={option} value={option}>
                          {getUtilityNodeTypeLabel(option)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">節點名稱</p>
                  <Input
                    key={`utility-node-label-${selectedUtilityNode.id}-${selectedUtilityNode.label}`}
                    defaultValue={selectedUtilityNode.label}
                    onBlur={(event) => handleUpdateSelectedUtilityNodeLabel(event.target.value)}
                  />
                </div>
              </div>
            )}
            <Button size="sm" variant="destructive" className="w-full" onClick={handleDeleteUtilityNode} disabled={!selectedUtilityNode}>
              刪除節點
            </Button>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">連線維護</p>
            <Button size="sm" variant="outline" className="w-full" onClick={handleClearUtilityEdges} disabled={utilityEdges.length === 0}>
              一鍵清除連線
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      {selectedCropId && (
        <>
          <Button size="sm" variant="outline" onClick={() => setTimingOpen(true)} disabled={selectedIsInfrastructure}>
            <Clock className="size-4 mr-1" />
            調整播種時間
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setHarvestOpen(true)}
            disabled={selectedPlanted?.status === "harvested" || selectedIsInfrastructure}
          >
            <Scissors className="size-4 mr-1" />
            標記收成
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleConvertToTrapezoid}
            disabled={selectedPlanted?.status !== "growing"}
          >
            梯形/多邊形
          </Button>
          <Popover open={reassignOpen} onOpenChange={setReassignOpen}>
            <PopoverTrigger asChild>
              <Button size="sm" variant="outline" disabled={selectedPlanted?.status !== "growing"}>
                更改作物
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-2" align="start">
              <ScrollArea className="h-48">
                <div className="space-y-1">
                  {allCrops
                    .filter((crop) => crop.id !== selectedCropMeta?.id)
                    .map((crop) => (
                      <button
                        key={crop.id}
                        onClick={() => handleReassignSelected(crop.id)}
                        className="flex w-full items-center gap-2 rounded p-2 text-left text-sm transition-colors hover:bg-accent"
                      >
                        <span className="text-lg">{crop.emoji}</span>
                        <span>{crop.name}</span>
                      </button>
                    ))}
                </div>
              </ScrollArea>
            </PopoverContent>
          </Popover>
          <Button size="sm" variant="outline" onClick={() => handleSplitSelected("vertical")} disabled={selectedPlanted?.status !== "growing"}>
            左右切分
          </Button>
          <Button size="sm" variant="outline" onClick={() => handleSplitSelected("horizontal")} disabled={selectedPlanted?.status !== "growing"}>
            上下切分
          </Button>
          {selectedIsInfrastructure && selectedPlanted?.status === "growing" && (
            <Popover>
              <PopoverTrigger asChild>
                <Button size="sm" variant="outline">
                  設施設定
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-3 space-y-2" align="start">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">設施類型</p>
                  <Select value={selectedPlanted.facilityType ?? "__none"} onValueChange={handleUpdateFacilityType}>
                    <SelectTrigger>
                      <SelectValue placeholder="選擇類型" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none">未設定</SelectItem>
                      {facilityTypeOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">設施名稱</p>
                  <Input
                    key={`facility-name-${selectedPlanted.id}-${selectedPlanted.facilityName ?? ""}`}
                    defaultValue={selectedPlanted.facilityName ?? ""}
                    placeholder="例如：北側蓄水池"
                    onBlur={(event) => handleUpdateFacilityName(event.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">關聯水電節點</p>
                  {utilityNodes.length === 0 ? (
                    <p className="text-xs text-muted-foreground">尚未建立水電節點。</p>
                  ) : (
                    <div className="space-y-1">
                      {utilityNodes.map((node) => {
                        const linked = (selectedPlanted.linkedUtilityNodeIds ?? []).includes(node.id);
                        return (
                          <Button
                            key={node.id}
                            size="sm"
                            variant={linked ? "default" : "outline"}
                            className="w-full justify-start"
                            onClick={() => handleToggleLinkedUtilityNode(node.id)}
                          >
                            {linked ? "已連結" : "未連結"} · {formatUtilityNodeDisplayLabel(node)}
                          </Button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          )}
          <Popover open={mergeOpen} onOpenChange={setMergeOpen}>
            <PopoverTrigger asChild>
              <Button size="sm" variant="outline" disabled={selectedPlanted?.status !== "growing" || mergeCandidates.length === 0}>
                合併區域
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-2" align="start">
              {mergeCandidates.length === 0 ? (
                <p className="text-sm text-muted-foreground">沒有可合併的區域。</p>
              ) : (
                <div className="space-y-1">
                  {mergeCandidates.map((candidate) => (
                    <button
                      key={candidate.planted.id}
                      onClick={() => handleMergeWith(candidate.planted.id)}
                      className="flex w-full items-center gap-2 rounded p-2 text-left text-sm transition-colors hover:bg-accent"
                    >
                      <span className="text-lg">{candidate.meta?.emoji}</span>
                      <span>{candidate.meta?.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </PopoverContent>
          </Popover>
          <Button size="sm" variant="destructive" onClick={handleDeleteSelected}>
            <Trash2 className="size-4 mr-1" />
            刪除選取
          </Button>
        </>
      )}

      <CropTimingDialog
        open={timingOpen}
        onOpenChange={setTimingOpen}
        plantedCrop={selectedIsInfrastructure ? null : selectedPlanted}
        fieldId={field.id}
        occurredAt={occurredAt}
      />

      <CropHarvestDialog
        open={harvestOpen}
        onOpenChange={setHarvestOpen}
        plantedCrop={selectedPlanted}
        cropName={selectedCropMeta?.name}
        onConfirm={handleHarvestSelected}
      />
    </div>
  );
}
