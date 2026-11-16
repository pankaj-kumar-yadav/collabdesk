"use client";

import { useParams } from "next/navigation";
import { AppSidebar } from "@/components/AppSidebar";
import { BreadcrumbProvider } from "@/components/breadcrumb-context";
import { ModeToggle } from "@/components/ModeToggle";
import { SiteFooter } from "@/components/SiteFooter";
import { WorkspaceBreadcrumbs } from "@/components/WorkspaceBreadcrumbs";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

type WorkspacesLayoutProps = {
  children: React.ReactNode;
};

export default function WorkspacesLayout(props: WorkspacesLayoutProps) {
  const { children } = props;
  const params = useParams<{ workspaceId?: string }>();
  const activeWorkspaceId =
    params.workspaceId && params.workspaceId !== "settings"
      ? params.workspaceId
      : undefined;

  return (
    <SidebarProvider>
      <AppSidebar activeWorkspaceId={activeWorkspaceId} />
      <SidebarInset className="h-svh overflow-y-auto bg-background/40">
        <BreadcrumbProvider>
          <div className="flex min-h-full flex-col">
            <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b border-border/80 bg-background/80 px-3 backdrop-blur-md">
              <SidebarTrigger className="pressable" />
              <Separator orientation="vertical" className="mr-1 h-4" />
              <div className="mr-auto min-w-0">
                <WorkspaceBreadcrumbs />
              </div>
              <ModeToggle />
            </header>
            <div className="flex min-h-0 flex-1 flex-col">{children}</div>
            <SiteFooter />
          </div>
        </BreadcrumbProvider>
      </SidebarInset>
    </SidebarProvider>
  );
}
