"use client";

import { useState, useMemo } from "react";
import { useAllCrops } from "@/lib/data/crop-lookup";
import { useCustomCrops } from "@/lib/store/custom-crops-context";
import { CropCard } from "@/components/crops/crop-card";
import { CropSearch } from "@/components/crops/crop-search";
import { CustomCropDialog } from "@/components/crops/custom-crop-dialog";
import { CropTemplateManager } from "@/components/crops/crop-template-manager";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

export default function CropsPage() {
  const allCrops = useAllCrops();
  const { importDefaultCrops } = useCustomCrops();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [importMessage, setImportMessage] = useState<string | null>(null);

  const filteredCrops = useMemo(() => {
    return allCrops.filter((crop) => {
      const matchesSearch = crop.name.includes(searchQuery);
      const matchesCategory = selectedCategory === "all" || crop.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [allCrops, searchQuery, selectedCategory]);

  const handleImport = () => {
    const count = importDefaultCrops();
    if (count > 0) {
      setImportMessage(`已匯入 ${count} 種作物`);
    } else {
      setImportMessage("所有常用蔬果已匯入");
    }
    setTimeout(() => setImportMessage(null), 3000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">作物資料庫</h1>
          <p className="text-muted-foreground">花蓮常見蔬果種植資訊</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleImport}>
            <Download className="h-4 w-4 mr-2" />
            匯入常用蔬果
          </Button>
          <CropTemplateManager />
          <CustomCropDialog />
        </div>
      </div>

      {importMessage && (
        <p className="text-sm text-green-600 dark:text-green-400">{importMessage}</p>
      )}

      <CropSearch
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
      />

      {filteredCrops.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">找不到符合條件的作物</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredCrops.map((crop) => (
            <CropCard key={crop.id} crop={crop} />
          ))}
        </div>
      )}
    </div>
  );
}
