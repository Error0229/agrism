"use client";

import { use } from "react";
import { notFound } from "next/navigation";
import { useCropById } from "@/lib/data/crop-lookup";
import { CropDetail } from "@/components/crops/crop-detail";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

function CropDetailContent({ cropId }: { cropId: string }) {
  const crop = useCropById(cropId);

  if (!crop) {
    notFound();
  }

  return <CropDetail crop={crop} />;
}

export default function CropDetailPage({
  params,
}: {
  params: Promise<{ cropId: string }>;
}) {
  const { cropId } = use(params);

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/crops">
          <ArrowLeft className="size-4 mr-1" />
          返回作物列表
        </Link>
      </Button>
      <CropDetailContent cropId={cropId} />
    </div>
  );
}
