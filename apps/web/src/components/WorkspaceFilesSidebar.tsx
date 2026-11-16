"use client";

import { FormEvent, useState } from "react";
import {
  FileCode2,
  History,
  Pencil,
  Plus,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import type { Role } from "@collabdesk/shared";
import type {
  FileRow,
  InviteRole,
  Member,
  Snapshot,
} from "@/lib/workspace-types";
import { WORKSPACES_FORM_FIELD_INFO } from "@/constants/form-field-info/workspaces";
import { FormFieldLabel } from "@/components/form-field-label";
import { RoleBadge } from "@/components/role-badge";
import { UserAvatar } from "@/components/user-avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

export type WorkspaceFilesSidebarProps = {
  workspaceName: string;
  myRole: Role;
  files: FileRow[];
  activeFileId: string | null;
  members: Member[];
  snapshots: Snapshot[];
  inviteEmail: string;
  inviteRole: InviteRole;
  inviteResult: string | null;
  onInviteEmailChange: (value: string) => void;
  onInviteRoleChange: (value: InviteRole) => void;
  onSelectFile: (id: string) => void;
  onCreateFile: (name: string) => Promise<void> | void;
  onRenameFile: (fileId: string, nextName: string) => void;
  onDeleteFile: (fileId: string) => void;
  onInvite: (e: FormEvent) => void;
  onChangeRole: (memberId: string, role: InviteRole) => void;
  onRestoreSnapshot: (snapshotId: string) => void;
};

export function WorkspaceFilesSidebar(props: WorkspaceFilesSidebarProps) {
  const {
    workspaceName,
    myRole,
    files,
    activeFileId,
    members,
    snapshots,
    inviteEmail,
    inviteRole,
    inviteResult,
    onInviteEmailChange,
    onInviteRoleChange,
    onSelectFile,
    onCreateFile,
    onRenameFile,
    onDeleteFile,
    onInvite,
    onChangeRole,
    onRestoreSnapshot,
  } = props;

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
            <RoleBadge role={myRole} />
            <span className="text-xs text-muted-foreground tabular-nums">
              {files.length} files · {members.length} members
            </span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <ScrollArea className="h-full">
          <WorkspaceFilesSection
            files={files}
            activeFileId={activeFileId}
            canEdit={canEdit}
            onSelectFile={onSelectFile}
            onCreateFile={onCreateFile}
            onRenameFile={onRenameFile}
            onDeleteFile={onDeleteFile}
          />

          <SidebarSeparator />

          <WorkspaceMembersSection
            members={members}
            isOwner={isOwner}
            onChangeRole={onChangeRole}
          />

          {isOwner ? (
            <>
              <SidebarSeparator />
              <WorkspaceInviteSection
                inviteEmail={inviteEmail}
                inviteRole={inviteRole}
                inviteResult={inviteResult}
                onInviteEmailChange={onInviteEmailChange}
                onInviteRoleChange={onInviteRoleChange}
                onInvite={onInvite}
              />
            </>
          ) : null}

          {activeFileId ? (
            <>
              <SidebarSeparator />
              <WorkspaceHistorySection
                snapshots={snapshots}
                canEdit={canEdit}
                onRestoreSnapshot={onRestoreSnapshot}
              />
            </>
          ) : null}
        </ScrollArea>
      </SidebarContent>
    </Sidebar>
  );
}

type WorkspaceFilesSectionProps = {
  files: FileRow[];
  activeFileId: string | null;
  canEdit: boolean;
  onSelectFile: (id: string) => void;
  onCreateFile: (name: string) => Promise<void> | void;
  onRenameFile: (fileId: string, nextName: string) => void;
  onDeleteFile: (fileId: string) => void;
};

function WorkspaceFilesSection(props: WorkspaceFilesSectionProps) {
  const {
    files,
    activeFileId,
    canEdit,
    onSelectFile,
    onCreateFile,
    onRenameFile,
    onDeleteFile,
  } = props;

  return (
    <SidebarGroup>
      <SidebarGroupLabel className="flex items-center gap-1.5">
        <FileCode2 className="size-3.5" />
        Files
        <span className="ml-auto tabular-nums text-muted-foreground">
          {files.length}
        </span>
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {files.map((file) => (
            <SidebarMenuItem key={file.id}>
              <SidebarMenuButton
                isActive={file.id === activeFileId}
                onClick={() => onSelectFile(file.id)}
                className={cn(
                  "active:scale-[0.98]",
                  canEdit && "pr-14",
                )}
              >
                <FileCode2 />
                <span className="font-mono text-xs">{file.name}</span>
              </SidebarMenuButton>
              {canEdit ? (
                <>
                  <RenameFileDialog
                    fileId={file.id}
                    fileName={file.name}
                    onRename={onRenameFile}
                  />
                  <DeleteFileConfirmButton
                    fileName={file.name}
                    onConfirm={() => onDeleteFile(file.id)}
                  />
                </>
              ) : null}
            </SidebarMenuItem>
          ))}
          {files.length === 0 ? (
            <p className="px-2 py-1 text-xs text-muted-foreground">No files yet</p>
          ) : null}
        </SidebarMenu>

        {canEdit ? (
          <div className="mt-3 px-2">
            <CreateFileDialog onCreate={onCreateFile} />
          </div>
        ) : null}
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

type CreateFileDialogProps = {
  onCreate: (name: string) => Promise<void> | void;
};

function CreateFileDialog(props: CreateFileDialogProps) {
  const { onCreate } = props;
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const trimmed = name.trim();

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) setName("");
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!trimmed) return;
    setCreating(true);
    try {
      await onCreate(trimmed);
      handleOpenChange(false);
    } finally {
      setCreating(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button type="button" size="sm" className="w-full gap-1.5">
          <Plus className="size-3.5" />
          New file
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New file</DialogTitle>
          <DialogDescription>
            Create a file in this workspace to start collaborating.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <FormFieldLabel
              htmlFor="new-file"
              required
              info={WORKSPACES_FORM_FIELD_INFO.newFileName}
            >
              File name
            </FormFieldLabel>
            <Input
              id="new-file"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="main.ts"
              required
              autoFocus
              autoComplete="off"
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={creating || !trimmed}>
              {creating ? "Creating…" : "Create file"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

type RenameFileDialogProps = {
  fileId: string;
  fileName: string;
  onRename: (fileId: string, nextName: string) => void;
};

function RenameFileDialog(props: RenameFileDialogProps) {
  const { fileId, fileName, onRename } = props;
  const [open, setOpen] = useState(false);
  const [nextName, setNextName] = useState(fileName);
  const trimmed = nextName.trim();
  const canSubmit = trimmed.length > 0 && trimmed !== fileName;

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) setNextName(fileName);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    onRename(fileId, trimmed);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <SidebarMenuAction
          showOnHover
          className="right-7"
          aria-label={`Rename ${fileName}`}
          onClick={(e) => e.stopPropagation()}
        >
          <Pencil />
        </SidebarMenuAction>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Rename file</DialogTitle>
          <DialogDescription>
            Update the name for{" "}
            <span className="font-mono text-foreground">{fileName}</span>.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <FormFieldLabel
              htmlFor={`rename-file-${fileId}`}
              required
              info={WORKSPACES_FORM_FIELD_INFO.renameFileName}
            >
              File name
            </FormFieldLabel>
            <Input
              id={`rename-file-${fileId}`}
              value={nextName}
              onChange={(e) => setNextName(e.target.value)}
              placeholder={fileName}
              autoComplete="off"
              autoFocus
              required
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              Rename
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

type DeleteFileConfirmButtonProps = {
  fileName: string;
  onConfirm: () => void;
};

function DeleteFileConfirmButton(props: DeleteFileConfirmButtonProps) {
  const { fileName, onConfirm } = props;
  const [open, setOpen] = useState(false);
  const [phrase, setPhrase] = useState("");
  const matches = phrase === fileName;

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) setPhrase("");
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogTrigger asChild>
        <SidebarMenuAction
          showOnHover
          aria-label={`Delete ${fileName}`}
          onClick={(e) => e.stopPropagation()}
        >
          <Trash2 />
        </SidebarMenuAction>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete file</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently removes the file and its collaboration history. Type{" "}
            <span className="font-mono text-foreground">{fileName}</span> to
            confirm.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Input
          value={phrase}
          onChange={(e) => setPhrase(e.target.value)}
          placeholder={fileName}
          autoComplete="off"
        />
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={!matches}
            className={cn(!matches && "pointer-events-none opacity-50")}
            onClick={() => {
              if (!matches) return;
              onConfirm();
              handleOpenChange(false);
            }}
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

type WorkspaceMembersSectionProps = {
  members: Member[];
  isOwner: boolean;
  onChangeRole: (memberId: string, role: InviteRole) => void;
};

function WorkspaceMembersSection(props: WorkspaceMembersSectionProps) {
  const { members, isOwner, onChangeRole } = props;

  return (
    <SidebarGroup>
      <SidebarGroupLabel className="flex items-center gap-1.5">
        <Users className="size-3.5" />
        Members
        <span className="ml-auto tabular-nums text-muted-foreground">
          {members.length}
        </span>
      </SidebarGroupLabel>
      <SidebarGroupContent className="space-y-2 px-2 pb-2">
        {members.map((m) => (
          <div
            key={m.id}
            className="rounded-md border border-sidebar-border/80 bg-background/40 p-2.5"
          >
            <div className="flex items-start gap-2.5">
              <UserAvatar
                size="sm"
                className="mt-0.5"
                seed={m.user.id || m.user.email}
                name={m.user.name}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{m.user.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {m.user.email}
                    </p>
                  </div>
                  <RoleBadge role={m.role} className="shrink-0" />
                </div>
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
            </div>
          </div>
        ))}
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

type WorkspaceInviteSectionProps = {
  inviteEmail: string;
  inviteRole: InviteRole;
  inviteResult: string | null;
  onInviteEmailChange: (value: string) => void;
  onInviteRoleChange: (value: InviteRole) => void;
  onInvite: (e: FormEvent) => void;
};

function WorkspaceInviteSection(props: WorkspaceInviteSectionProps) {
  const {
    inviteEmail,
    inviteRole,
    inviteResult,
    onInviteEmailChange,
    onInviteRoleChange,
    onInvite,
  } = props;

  return (
    <SidebarGroup>
      <SidebarGroupLabel>
        <UserPlus className="size-3.5" />
        Invite
      </SidebarGroupLabel>
      <SidebarGroupContent className="space-y-2 px-2 pb-2">
        <form onSubmit={onInvite} className="space-y-2">
          <FormFieldLabel
            htmlFor="invite-email"
            required
            info={WORKSPACES_FORM_FIELD_INFO.inviteEmail}
          >
            Email
          </FormFieldLabel>
          <Input
            id="invite-email"
            type="email"
            value={inviteEmail}
            onChange={(e) => onInviteEmailChange(e.target.value)}
            placeholder="colleague@example.com"
            required
          />
          <FormFieldLabel required info={WORKSPACES_FORM_FIELD_INFO.inviteRole}>
            Role
          </FormFieldLabel>
          <Select
            value={inviteRole}
            onValueChange={(v) => onInviteRoleChange(v as InviteRole)}
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
  );
}

type WorkspaceHistorySectionProps = {
  snapshots: Snapshot[];
  canEdit: boolean;
  onRestoreSnapshot: (snapshotId: string) => void;
};

function WorkspaceHistorySection(props: WorkspaceHistorySectionProps) {
  const { snapshots, canEdit, onRestoreSnapshot } = props;

  return (
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
              <p className="text-xs text-muted-foreground tabular-nums">
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
  );
}
