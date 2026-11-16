"use client";

import { useParams } from "next/navigation";
import { AppSidebar } from "@/components/AppSidebar";
import { BreadcrumbProvider } from "@/components/breadcrumb-context";
import { ModeToggle } from "@/components/ModeToggle";
import { WorkspaceBreadcrumbs } from "@/components/WorkspaceBreadcrumbs";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

export default function WorkspacesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams<{ workspaceId?: string }>();
  const activeWorkspaceId = params.workspaceId;

  return (
    <SidebarProvider>
      <AppSidebar activeWorkspaceId={activeWorkspaceId} />
      <SidebarInset className="min-h-svh overflow-hidden bg-background/40">
        <BreadcrumbProvider>
          <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border/80 bg-background/80 px-3 backdrop-blur-md">
            <SidebarTrigger className="pressable" />
            <Separator orientation="vertical" className="mr-1 h-4" />
            <div className="mr-auto min-w-0">
              <WorkspaceBreadcrumbs />
            </div>
            <ModeToggle />
          </header>
          <div className="flex min-h-0 flex-1">{children}</div>
        </BreadcrumbProvider>
      </SidebarInset>
    </SidebarProvider>
  );
}
