"use client";

import { use } from "react";
import { notFound } from "next/navigation";
import { getCropById } from "@/lib/data/crops-database";
import { CropDetail } from "@/components/crops/crop-detail";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function CropDetailPage({
  params,
}: {
  params: Promise<{ cropId: string }>;
}) {
  const { cropId } = use(params);
  const crop = getCropById(cropId);

  if (!crop) {
    notFound();
  }

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/crops">
          <ArrowLeft className="size-4 mr-1" />
          返回作物列表
        </Link>
      </Button>
      <CropDetail crop={crop} />
    </div>
  );
}
