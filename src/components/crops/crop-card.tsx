"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Crop } from "@/lib/types";

export function CropCard({ crop }: { crop: Crop }) {
  return (
    <Link href={`/crops/${crop.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
        <CardContent className="pt-6">
          <div className="text-center mb-3">
            <span className="text-4xl">{crop.emoji}</span>
          </div>
          <h3 className="font-semibold text-center mb-2">{crop.name}</h3>
          <div className="flex flex-wrap justify-center gap-1">
            <Badge variant="secondary" className="text-xs">{crop.category}</Badge>
            <Badge variant="outline" className="text-xs">{crop.sunlight}</Badge>
          </div>
          <p className="text-xs text-muted-foreground text-center mt-2">
            生長天數：{crop.growthDays} 天
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
