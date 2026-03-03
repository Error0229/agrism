"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  Home,
  Map,
  Sprout,
  Calendar,
  ClipboardList,
  DollarSign,
  Layers,
  CloudSun,
  Bot,
  Settings,
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
  SidebarFooter,
} from "@/components/ui/sidebar";

const mainNavItems = [
  { name: "首頁", icon: Home, href: "/" },
  { name: "田地規劃", icon: Map, href: "/fields" },
  { name: "作物資料庫", icon: Sprout, href: "/crops" },
  { name: "種植月曆", icon: Calendar, href: "/calendar" },
];

const recordNavItems = [
  { name: "收成紀錄", icon: ClipboardList, href: "/records/harvest" },
  { name: "財務管理", icon: DollarSign, href: "/records/finance" },
  { name: "土壤管理", icon: Layers, href: "/records/soil" },
];

const toolNavItems = [
  { name: "天氣", icon: CloudSun, href: "/weather" },
  { name: "AI 助手", icon: Bot, href: "/ai" },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

export function AppSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <Sidebar>
      <SidebarHeader className="border-b px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg" aria-label="回到首頁">
          <Sprout className="size-5 text-green-600" />
          <span>花蓮種植指南</span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>主要功能</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={isActive(pathname, item.href)}>
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
          <SidebarGroupLabel>紀錄管理</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {recordNavItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={isActive(pathname, item.href)}>
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
          <SidebarGroupLabel>工具</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {toolNavItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={isActive(pathname, item.href)}>
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
      </SidebarContent>
      <SidebarFooter className="border-t">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={isActive(pathname, "/settings")}>
              <Link href="/settings">
                <Settings className="size-4" />
                <span>設定</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <button type="button" onClick={() => signOut({ callbackUrl: "/auth/login" })} aria-label="登出帳號">
                <LogOut className="size-4" />
                <span>登出{session?.user?.email ? ` (${session.user.email})` : ""}</span>
              </button>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
