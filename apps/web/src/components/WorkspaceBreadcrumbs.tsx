"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { useBreadcrumbTrail } from "@/components/breadcrumb-context";
import { APP_ROUTES } from "@/constants/app-routes.constant";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export function WorkspaceBreadcrumbs() {
  const pathname = usePathname();
  const params = useParams<{ workspaceId?: string }>();
  const workspaceId =
    params.workspaceId && params.workspaceId !== "settings"
      ? params.workspaceId
      : undefined;
  const { trail } = useBreadcrumbTrail();

  const workspaceLabel = trail.workspaceName?.trim() || "Workspace";
  const fileLabel = trail.fileName?.trim();
  const isSettings = pathname === APP_ROUTES.SETTINGS;

  if (isSettings) {
    return (
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href={APP_ROUTES.WORKSPACES}>All workspaces</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Settings</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    );
  }

  if (!workspaceId) {
    return (
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage>All workspaces</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    );
  }

  return (
    <Breadcrumb>
      <BreadcrumbList className="min-w-0">
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href={APP_ROUTES.WORKSPACES}>All workspaces</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem className="min-w-0">
          {fileLabel ? (
            <BreadcrumbLink asChild>
              <Link
                href={APP_ROUTES.workspace(workspaceId)}
                className="max-w-[10rem] truncate sm:max-w-[16rem]"
              >
                {workspaceLabel}
              </Link>
            </BreadcrumbLink>
          ) : (
            <BreadcrumbPage className="max-w-[14rem] truncate sm:max-w-[20rem]">
              {workspaceLabel}
            </BreadcrumbPage>
          )}
        </BreadcrumbItem>
        {fileLabel ? (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem className="min-w-0">
              <BreadcrumbPage className="max-w-[12rem] truncate sm:max-w-[18rem]">
                {fileLabel}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </>
        ) : null}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
