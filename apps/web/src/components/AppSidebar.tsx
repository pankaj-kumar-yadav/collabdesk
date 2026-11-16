"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ChevronsUpDown,
  Folders,
  LayoutGrid,
  LogOut,
  Settings,
} from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { api, setToken } from "@/lib/api";
import type { WorkspaceRow } from "@/lib/workspace-types";
import { APP_ROUTES } from "@/constants/app-routes.constant";
import { RoleBadge } from "@/components/role-badge";
import { UserAvatar } from "@/components/user-avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar";

export type AppSidebarProps = {
  activeWorkspaceId?: string;
};

export function AppSidebar(props: AppSidebarProps) {
  const { activeWorkspaceId } = props;
  const pathname = usePathname();
  const router = useRouter();
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [rows, setRows] = useState<WorkspaceRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const isAllWorkspaces = pathname === APP_ROUTES.WORKSPACES;
  const isSettings = pathname === APP_ROUTES.SETTINGS;

  async function refresh() {
    const data = await api<WorkspaceRow[]>("/workspaces");
    setRows(data);
  }

  useEffect(() => {
    authClient.getSession().then(({ data }) => {
      if (!data?.user) {
        router.replace(APP_ROUTES.LOGIN);
        return;
      }
      setUserName(data.user.name);
      setUserEmail(data.user.email);
      refresh().catch((e) => setError(e.message));
    });
  }, [router, pathname]);

  async function logout() {
    await authClient.signOut();
    setToken(null);
    router.replace(APP_ROUTES.LOGIN);
  }

  return (
    <Sidebar collapsible="icon" variant="sidebar">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild tooltip="CollabDesk">
              <Link href={APP_ROUTES.WORKSPACES}>
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <LayoutGrid className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold tracking-tight">
                    CollabDesk
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    Collaborative editor
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={isAllWorkspaces}
                  tooltip="All workspaces"
                >
                  <Link href={APP_ROUTES.WORKSPACES}>
                    <Folders />
                    <span>All workspaces</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={isSettings}
                  tooltip="Settings"
                >
                  <Link href={APP_ROUTES.SETTINGS}>
                    <Settings />
                    <span>Settings</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <AppSidebarWorkspaceList
          rows={rows}
          activeWorkspaceId={activeWorkspaceId}
          error={error}
        />
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <AppSidebarAccountMenu
              userName={userName}
              userEmail={userEmail}
              onSettings={() => router.push(APP_ROUTES.SETTINGS)}
              onLogout={logout}
            />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

type AppSidebarWorkspaceListProps = {
  rows: WorkspaceRow[];
  activeWorkspaceId?: string;
  error: string | null;
};

function AppSidebarWorkspaceList(props: AppSidebarWorkspaceListProps) {
  const { rows, activeWorkspaceId, error } = props;

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Workspaces</SidebarGroupLabel>
      <SidebarGroupContent>
        <ScrollArea className="max-h-[50vh]">
          <SidebarMenu>
            {rows.map((row) => (
              <SidebarMenuItem key={row.id}>
                <SidebarMenuButton
                  asChild
                  isActive={activeWorkspaceId === row.id}
                  tooltip={row.name}
                >
                  <Link href={APP_ROUTES.workspace(row.id)}>
                    <LayoutGrid />
                    <span>{row.name}</span>
                    <RoleBadge
                      role={row.role}
                      className="ml-auto group-data-[collapsible=icon]:hidden"
                    />
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
            {rows.length === 0 ? (
              <p className="px-2 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
                No workspaces yet
              </p>
            ) : null}
          </SidebarMenu>
        </ScrollArea>
        {error ? (
          <p className="px-2 pt-2 text-xs text-destructive group-data-[collapsible=icon]:hidden">
            {error}
          </p>
        ) : null}
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

type AppSidebarAccountMenuProps = {
  userName: string;
  userEmail: string;
  onSettings: () => void;
  onLogout: () => void;
};

function AppSidebarAccountMenu(props: AppSidebarAccountMenuProps) {
  const { userName, userEmail, onSettings, onLogout } = props;
  const avatarSeed = userEmail || userName || "collabdesk";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <SidebarMenuButton
          size="lg"
          className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
        >
          <UserAvatar
            seed={avatarSeed}
            name={userName || "Account"}
            className="rounded-lg"
            fallbackClassName="rounded-lg"
          />
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-medium">{userName || "Account"}</span>
            <span className="truncate text-xs text-muted-foreground">
              {userEmail}
            </span>
          </div>
          <ChevronsUpDown className="ml-auto size-4" />
        </SidebarMenuButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
        side="bottom"
        align="end"
        sideOffset={4}
      >
        <DropdownMenuLabel className="p-0 font-normal">
          <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
            <UserAvatar
              seed={avatarSeed}
              name={userName || "Account"}
              className="rounded-lg"
              fallbackClassName="rounded-lg"
            />
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{userName}</span>
              <span className="truncate text-xs text-muted-foreground">
                {userEmail}
              </span>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onSettings}>
          <Settings />
          Settings
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onLogout}>
          <LogOut />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
