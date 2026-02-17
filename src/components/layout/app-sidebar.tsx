"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  Home,
  CalendarDays,
  Sprout,
  LayoutGrid,
  MessageSquare,
  Warehouse,
  LogOut,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const navItems = [
  { name: "首頁", icon: Home, href: "/" },
  { name: "種植月曆", icon: CalendarDays, href: "/calendar" },
  { name: "作物資料庫", icon: Sprout, href: "/crops" },
  { name: "田地規劃", icon: LayoutGrid, href: "/field-planner" },
  { name: "農場管理", icon: Warehouse, href: "/farm-management" },
  { name: "AI 助手", icon: MessageSquare, href: "/ai-assistant" },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <Sidebar>
      <SidebarHeader className="border-b px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg">
          <span className="text-2xl">🌱</span>
          <span>花蓮種植指南</span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>導航</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))}>
                    <Link href={item.href}>
                      <item.icon className="size-4" />
                      <span>{item.name}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>帳號</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <button type="button" onClick={() => signOut({ callbackUrl: "/auth/login" })}>
                    <LogOut className="size-4" />
                    <span>登出{session?.user?.email ? ` (${session.user.email})` : ""}</span>
                  </button>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
