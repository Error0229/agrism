"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sprout, ClipboardList, DollarSign, Map } from "lucide-react";

export function QuickActions() {
  return (
    <div className="flex flex-wrap gap-2">
      <Button asChild size="sm" variant="outline">
        <Link href="/crops">
          <Sprout className="size-4 mr-1" />
          快速種植
        </Link>
      </Button>
      <Button asChild size="sm" variant="outline">
        <Link href="/farm-management?tab=harvest">
          <ClipboardList className="size-4 mr-1" />
          記錄收成
        </Link>
      </Button>
      <Button asChild size="sm" variant="outline">
        <Link href="/farm-management?tab=finance">
          <DollarSign className="size-4 mr-1" />
          記錄支出
        </Link>
      </Button>
      <Button asChild size="sm" variant="outline">
        <Link href="/field-planner">
          <Map className="size-4 mr-1" />
          田地規劃
        </Link>
      </Button>
    </div>
  );
}
