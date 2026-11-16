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
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fileExtensionIcon } from "@/lib/file-extension-icon";
import { cn } from "@/lib/utils";

const WORKSPACE_SIDEBAR_TABS = {
  files: "files",
  members: "members",
  history: "history",
} as const;

type WorkspaceSidebarTab =
  (typeof WORKSPACE_SIDEBAR_TABS)[keyof typeof WORKSPACE_SIDEBAR_TABS];

export type WorkspaceFilesSidebarProps = {
  workspaceName: string;
  myRole: Role;
  files: FileRow[];
  activeFileId: string | null;
  members: Member[];
  snapshots: Snapshot[];
  onSelectFile: (id: string) => void;
  onCreateFile: (name: string) => Promise<void> | void;
  onRenameFile: (fileId: string, nextName: string) => void;
  onDeleteFile: (fileId: string) => void;
  onInvite: (email: string, role: InviteRole) => Promise<string>;
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
  const [tab, setTab] = useState<WorkspaceSidebarTab>(
    WORKSPACE_SIDEBAR_TABS.files,
  );

  return (
    <Sidebar
      collapsible="none"
      className="hidden w-[18rem] border-r border-sidebar-border bg-sidebar/80 md:flex"
    >
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-start gap-2 px-2 py-2">
          <div className="min-w-0 flex-1">
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
          {isOwner ? <InviteMemberDialog onInvite={onInvite} /> : null}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <Tabs
          value={tab}
          onValueChange={(value) => setTab(value as WorkspaceSidebarTab)}
          className="flex h-full flex-col gap-0"
        >
          <TabsList className="mx-2 mt-2 grid h-9 w-[calc(100%-1rem)] grid-cols-3">
            <TabsTrigger
              value={WORKSPACE_SIDEBAR_TABS.files}
              className="gap-1 px-1.5 text-xs"
            >
              <FileCode2 className="size-3.5" />
              Files
            </TabsTrigger>
            <TabsTrigger
              value={WORKSPACE_SIDEBAR_TABS.members}
              className="gap-1 px-1.5 text-xs"
            >
              <Users className="size-3.5" />
              Members
            </TabsTrigger>
            <TabsTrigger
              value={WORKSPACE_SIDEBAR_TABS.history}
              className="gap-1 px-1.5 text-xs"
            >
              <History className="size-3.5" />
              History
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="h-full overflow-x-hidden">
            <TabsContent
              value={WORKSPACE_SIDEBAR_TABS.files}
              className="mt-0 outline-none"
            >
              <WorkspaceFilesSection
                files={files}
                activeFileId={activeFileId}
                canEdit={canEdit}
                onSelectFile={onSelectFile}
                onCreateFile={onCreateFile}
                onRenameFile={onRenameFile}
                onDeleteFile={onDeleteFile}
              />
            </TabsContent>

            <TabsContent
              value={WORKSPACE_SIDEBAR_TABS.members}
              className="mt-0 outline-none"
            >
              <WorkspaceMembersSection
                members={members}
                isOwner={isOwner}
                onChangeRole={onChangeRole}
              />
            </TabsContent>

            <TabsContent
              value={WORKSPACE_SIDEBAR_TABS.history}
              className="mt-0 outline-none"
            >
              <WorkspaceHistorySection
                activeFileId={activeFileId}
                snapshots={snapshots}
                canEdit={canEdit}
                onRestoreSnapshot={onRestoreSnapshot}
              />
            </TabsContent>
          </ScrollArea>
        </Tabs>
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
      <SidebarGroupContent>
        <SidebarMenu>
          {files.map((file) => {
            const { Icon: FileIcon, className: iconClassName } =
              fileExtensionIcon(file.name);
            return (
              <SidebarMenuItem key={file.id}>
                <SidebarMenuButton
                  isActive={file.id === activeFileId}
                  onClick={() => onSelectFile(file.id)}
                  className={cn(
                    "active:scale-[0.98]",
                    canEdit && "pr-14",
                  )}
                >
                  <FileIcon className={iconClassName} />
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
            );
          })}
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

type InviteMemberDialogProps = {
  onInvite: (email: string, role: InviteRole) => Promise<string>;
};

function InviteMemberDialog(props: InviteMemberDialogProps) {
  const { onInvite } = props;
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<InviteRole>("editor");
  const [token, setToken] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const trimmed = email.trim();

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setEmail("");
      setRole("editor");
      setToken(null);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!trimmed) return;
    setSubmitting(true);
    try {
      const nextToken = await onInvite(trimmed, role);
      setToken(nextToken);
      setEmail("");
    } catch {
      // Parent surfaces the error.
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          type="button"
          size="icon-sm"
          variant="outline"
          className="shrink-0"
          aria-label="Invite member"
          title="Invite member"
        >
          <UserPlus className="size-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite member</DialogTitle>
          <DialogDescription>
            Create an invite token to share with a collaborator.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
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
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="colleague@example.com"
              required
              autoFocus
              autoComplete="off"
            />
          </div>
          <div className="space-y-2">
            <FormFieldLabel
              required
              info={WORKSPACES_FORM_FIELD_INFO.inviteRole}
            >
              Role
            </FormFieldLabel>
            <Select
              value={role}
              onValueChange={(v) => setRole(v as InviteRole)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="editor">Editor</SelectItem>
                <SelectItem value="viewer">Viewer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {token ? (
            <p className="break-all rounded-md bg-muted/60 px-2.5 py-2 font-mono text-[11px] text-muted-foreground">
              {token}
            </p>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              {token ? "Done" : "Cancel"}
            </Button>
            <Button type="submit" disabled={submitting || !trimmed}>
              {submitting ? "Creating…" : "Create invite"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

type WorkspaceHistorySectionProps = {
  activeFileId: string | null;
  snapshots: Snapshot[];
  canEdit: boolean;
  onRestoreSnapshot: (snapshotId: string) => void;
};

function WorkspaceHistorySection(props: WorkspaceHistorySectionProps) {
  const { activeFileId, snapshots, canEdit, onRestoreSnapshot } = props;

  return (
    <SidebarGroup>
      <SidebarGroupContent className="space-y-2 px-2 pb-3">
        {!activeFileId ? (
          <p className="text-xs text-muted-foreground">
            Select a file to view history
          </p>
        ) : snapshots.length === 0 ? (
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
