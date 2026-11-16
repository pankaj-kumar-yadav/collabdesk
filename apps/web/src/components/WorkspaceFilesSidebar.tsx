"use client";

import { FormEvent } from "react";
import { FileCode2, History, Trash2, UserPlus, Users } from "lucide-react";
import type { FileRow, Member, Snapshot } from "@/lib/workspace-types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  SidebarSeparator,
} from "@/components/ui/sidebar";

export function WorkspaceFilesSidebar({
  workspaceName,
  myRole,
  files,
  activeFileId,
  members,
  snapshots,
  fileName,
  inviteEmail,
  inviteRole,
  inviteResult,
  onFileNameChange,
  onInviteEmailChange,
  onInviteRoleChange,
  onSelectFile,
  onCreateFile,
  onRenameFile,
  onDeleteFile,
  onInvite,
  onChangeRole,
  onRestoreSnapshot,
}: {
  workspaceName: string;
  myRole: string;
  files: FileRow[];
  activeFileId: string | null;
  members: Member[];
  snapshots: Snapshot[];
  fileName: string;
  inviteEmail: string;
  inviteRole: "editor" | "viewer";
  inviteResult: string | null;
  onFileNameChange: (value: string) => void;
  onInviteEmailChange: (value: string) => void;
  onInviteRoleChange: (value: "editor" | "viewer") => void;
  onSelectFile: (id: string) => void;
  onCreateFile: (e: FormEvent) => void;
  onRenameFile: () => void;
  onDeleteFile: () => void;
  onInvite: (e: FormEvent) => void;
  onChangeRole: (memberId: string, role: "editor" | "viewer") => void;
  onRestoreSnapshot: (snapshotId: string) => void;
}) {
  const canEdit = myRole !== "viewer";
  const isOwner = myRole === "owner";

  return (
    <Sidebar
      collapsible="none"
      className="hidden w-[18rem] border-r border-sidebar-border bg-sidebar/80 md:flex"
    >
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="px-2 py-2">
          <p className="truncate text-sm font-semibold tracking-tight">
            {workspaceName}
          </p>
          <div className="mt-1.5 flex items-center gap-2">
            <Badge variant="outline" className="capitalize">
              {myRole}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {files.length} files · {members.length} members
            </span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <ScrollArea className="h-full">
          <SidebarGroup>
            <SidebarGroupLabel>Files</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {files.map((file) => (
                  <SidebarMenuItem key={file.id}>
                    <SidebarMenuButton
                      isActive={file.id === activeFileId}
                      onClick={() => onSelectFile(file.id)}
                      className="active:scale-[0.98]"
                    >
                      <FileCode2 />
                      <span className="font-mono text-xs">{file.name}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
                {files.length === 0 ? (
                  <p className="px-2 py-1 text-xs text-muted-foreground">
                    No files yet
                  </p>
                ) : null}
              </SidebarMenu>

              {canEdit ? (
                <form onSubmit={onCreateFile} className="mt-3 space-y-2 px-2">
                  <Label htmlFor="new-file">New file</Label>
                  <Input
                    id="new-file"
                    value={fileName}
                    onChange={(e) => onFileNameChange(e.target.value)}
                    placeholder="main.ts"
                    required
                  />
                  <Button type="submit" size="sm" className="w-full">
                    Create file
                  </Button>
                  {activeFileId ? (
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={onRenameFile}
                      >
                        Rename
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        onClick={onDeleteFile}
                        aria-label="Delete file"
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  ) : null}
                </form>
              ) : null}
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarSeparator />

          <SidebarGroup>
            <SidebarGroupLabel>
              <Users className="size-3.5" />
              Members
            </SidebarGroupLabel>
            <SidebarGroupContent className="space-y-2 px-2 pb-2">
              {members.map((m) => (
                <div
                  key={m.id}
                  className="rounded-md border border-sidebar-border/80 bg-background/40 p-2.5"
                >
                  <p className="truncate text-sm font-medium">{m.user.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {m.user.email}
                  </p>
                  <Badge variant="secondary" className="mt-1.5 text-[10px] capitalize">
                    {m.role}
                  </Badge>
                  {isOwner && m.role !== "owner" ? (
                    <div className="mt-2 flex gap-1">
                      <Button
                        type="button"
                        size="xs"
                        variant="outline"
                        onClick={() => onChangeRole(m.id, "editor")}
                      >
                        Editor
                      </Button>
                      <Button
                        type="button"
                        size="xs"
                        variant="outline"
                        onClick={() => onChangeRole(m.id, "viewer")}
                      >
                        Viewer
                      </Button>
                    </div>
                  ) : null}
                </div>
              ))}
            </SidebarGroupContent>
          </SidebarGroup>

          {isOwner ? (
            <>
              <SidebarSeparator />
              <SidebarGroup>
                <SidebarGroupLabel>
                  <UserPlus className="size-3.5" />
                  Invite
                </SidebarGroupLabel>
                <SidebarGroupContent className="space-y-2 px-2 pb-2">
                  <form onSubmit={onInvite} className="space-y-2">
                    <Label htmlFor="invite-email">Email</Label>
                    <Input
                      id="invite-email"
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => onInviteEmailChange(e.target.value)}
                      placeholder="colleague@example.com"
                      required
                    />
                    <Label>Role</Label>
                    <Select
                      value={inviteRole}
                      onValueChange={(v) =>
                        onInviteRoleChange(v as "editor" | "viewer")
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="editor">Editor</SelectItem>
                        <SelectItem value="viewer">Viewer</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button type="submit" size="sm" className="w-full">
                      Create invite
                    </Button>
                    {inviteResult ? (
                      <p className="break-all rounded-md bg-muted/60 px-2 py-1.5 font-mono text-[11px] text-muted-foreground">
                        {inviteResult}
                      </p>
                    ) : null}
                  </form>
                </SidebarGroupContent>
              </SidebarGroup>
            </>
          ) : null}

          {activeFileId ? (
            <>
              <SidebarSeparator />
              <SidebarGroup>
                <SidebarGroupLabel>
                  <History className="size-3.5" />
                  History
                </SidebarGroupLabel>
                <SidebarGroupContent className="space-y-2 px-2 pb-3">
                  {snapshots.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No snapshots yet</p>
                  ) : (
                    snapshots.slice(0, 8).map((s) => (
                      <div
                        key={s.id}
                        className="rounded-md border border-sidebar-border/80 bg-background/40 p-2.5"
                      >
                        <p className="text-xs text-muted-foreground">
                          v{s.version} · {new Date(s.createdAt).toLocaleString()}
                        </p>
                        {canEdit ? (
                          <Button
                            type="button"
                            size="xs"
                            variant="outline"
                            className="mt-1.5"
                            onClick={() => onRestoreSnapshot(s.id)}
                          >
                            Restore
                          </Button>
                        ) : null}
                      </div>
                    ))
                  )}
                </SidebarGroupContent>
              </SidebarGroup>
            </>
          ) : null}
        </ScrollArea>
      </SidebarContent>
    </Sidebar>
  );
}
