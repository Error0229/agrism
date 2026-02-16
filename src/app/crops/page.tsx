"use client";

import { useState, useMemo } from "react";
import { cropsDatabase } from "@/lib/data/crops-database";
import { CropCard } from "@/components/crops/crop-card";
import { CropSearch } from "@/components/crops/crop-search";

export default function CropsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const filteredCrops = useMemo(() => {
    return cropsDatabase.filter((crop) => {
      const matchesSearch = crop.name.includes(searchQuery);
      const matchesCategory = selectedCategory === "all" || crop.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, selectedCategory]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">作物資料庫</h1>
        <p className="text-muted-foreground">花蓮常見蔬果種植資訊</p>
      </div>

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
