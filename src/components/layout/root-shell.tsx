"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const PAGE_TITLES: Record<string, string> = {
  "/": "首頁",
  "/fields": "田地規劃",
  "/crops": "作物資料庫",
  "/calendar": "種植行事曆",
  "/records/harvest": "收成紀錄",
  "/records/finance": "財務管理",
  "/records/soil": "土壤管理",
  "/weather": "天氣",
  "/ai": "AI 助手",
  "/settings": "設定",
};

function getPageTitle(pathname: string): string {
  // Exact match first
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  // Dynamic routes: /fields/[id] → 田地規劃, /crops/[id] → 作物資料庫
  if (pathname.startsWith("/fields/")) return "田地編輯";
  if (pathname.startsWith("/crops/")) return "作物詳情";
  return "花蓮蔬果種植指南";
}

export function RootShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isAuthRoute = pathname?.startsWith("/sign-in") || pathname?.startsWith("/sign-up");

  if (isAuthRoute) {
    return <>{children}</>;
  }

  const pageTitle = getPageTitle(pathname ?? "/");
  const isFieldEditor = pathname?.match(/^\/fields\/[^/]+$/) != null;

  return (
    <TooltipProvider>
      <SidebarProvider className={isFieldEditor ? "max-h-svh overflow-hidden" : undefined}>
        <AppSidebar />
        <SidebarInset className={cn("min-w-0 overflow-hidden", isFieldEditor && "h-svh max-h-svh")}>
          <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 !h-4" />
            <span className="text-sm text-muted-foreground">{pageTitle}</span>
          </header>
          <div className={isFieldEditor ? "min-h-0 min-w-0 flex-1 overflow-hidden" : "flex-1 overflow-auto p-4 md:p-6"}>{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
