"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Files, Plus, Ticket, Users } from "lucide-react";
import { api } from "@/lib/api";
import { authClient } from "@/lib/auth-client";
import type { WorkspaceRow } from "@/lib/workspace-types";
import { APP_ROUTES } from "@/constants/app-routes.constant";
import { WORKSPACES_FORM_FIELD_INFO } from "@/constants/form-field-info/workspaces";
import { FormFieldLabel } from "@/components/form-field-label";
import { RoleBadge } from "@/components/role-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export default function WorkspacesPage() {
  const router = useRouter();
  const [rows, setRows] = useState<WorkspaceRow[]>([]);
  const [error, setError] = useState<string | null>(null);

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
      refresh().catch((e) => setError(e.message));
    });
  }, [router]);

  return (
    <div className="flex-1 overflow-auto p-4 md:p-6">
      <div className="enter-lead mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-2xl">
          <h1 className="text-2xl font-semibold tracking-tight">Home</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Open a workspace you already have, or create / join a new one.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <JoinWorkspaceDialog
            onJoined={async (workspaceId) => {
              setError(null);
              await refresh();
              router.push(APP_ROUTES.workspace(workspaceId));
            }}
            onError={setError}
          />
          <CreateWorkspaceDialog
            onCreated={async (workspaceId) => {
              setError(null);
              await refresh();
              router.push(APP_ROUTES.workspace(workspaceId));
            }}
            onError={setError}
          />
        </div>
      </div>

      {error ? (
        <p className="mb-4 rounded-md border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="mb-4">
        <h2 className="text-lg font-medium tracking-tight">Your workspaces</h2>
        <p className="text-sm text-muted-foreground">
          Open a workspace to edit files and collaborate.
        </p>
      </div>

      {rows.length > 0 ? (
        <div className="enter-support grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((row) => (
            <Link
              key={row.id}
              href={APP_ROUTES.workspace(row.id)}
              className="pressable pressable-lift block rounded-xl outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              <Card className="h-full border-border/80 shadow-sm transition-[border-color] duration-150">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base tracking-tight">
                      {row.name}
                    </CardTitle>
                    <RoleBadge role={row.role} />
                  </div>
                  <CardDescription className="flex items-center gap-1">
                    Open workspace
                    <ArrowRight className="size-3.5" />
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex gap-4 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1 tabular-nums">
                    <Users className="size-3.5" />
                    {row.memberCount} members
                  </span>
                  <span className="inline-flex items-center gap-1 tabular-nums">
                    <Files className="size-3.5" />
                    {row.fileCount} files
                  </span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : !error ? (
        <Card className="border-dashed border-border/80 shadow-none">
          <CardHeader>
            <CardTitle className="text-base">No workspaces yet</CardTitle>
            <CardDescription>
              Use New workspace or Join invite above to get started.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}
    </div>
  );
}

type CreateWorkspaceDialogProps = {
  onCreated: (workspaceId: string) => Promise<void>;
  onError: (message: string) => void;
};

function CreateWorkspaceDialog(props: CreateWorkspaceDialogProps) {
  const { onCreated, onError } = props;
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) setName("");
  }

  async function createWorkspace(e: FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      const ws = await api<{ id: string }>("/workspaces", {
        method: "POST",
        body: JSON.stringify({ name }),
      });
      handleOpenChange(false);
      await onCreated(ws.id);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to create workspace");
    } finally {
      setCreating(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button type="button" className="gap-1.5">
          <Plus className="size-4" />
          New workspace
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New workspace</DialogTitle>
          <DialogDescription>
            Start a fresh collaborative space for your team.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={createWorkspace} className="space-y-4">
          <div className="space-y-2">
            <FormFieldLabel
              htmlFor="ws-name"
              required
              info={WORKSPACES_FORM_FIELD_INFO.workspaceName}
            >
              Name
            </FormFieldLabel>
            <Input
              id="ws-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Product eng"
              required
              autoFocus
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
            <Button type="submit" disabled={creating || !name.trim()}>
              {creating ? "Creating…" : "Create workspace"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

type JoinWorkspaceDialogProps = {
  onJoined: (workspaceId: string) => Promise<void>;
  onError: (message: string) => void;
};

function JoinWorkspaceDialog(props: JoinWorkspaceDialogProps) {
  const { onJoined, onError } = props;
  const [open, setOpen] = useState(false);
  const [inviteToken, setInviteToken] = useState("");
  const [joining, setJoining] = useState(false);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) setInviteToken("");
  }

  async function acceptInvite(e: FormEvent) {
    e.preventDefault();
    setJoining(true);
    try {
      const member = await api<{ workspaceId: string }>(
        `/invitations/${inviteToken.trim()}/accept`,
        { method: "POST", body: JSON.stringify({}) },
      );
      handleOpenChange(false);
      await onJoined(member.workspaceId);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to join workspace");
    } finally {
      setJoining(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" className="gap-1.5">
          <Ticket className="size-4" />
          Join invite
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Join with invite</DialogTitle>
          <DialogDescription>
            Paste an invite token to join an existing workspace.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={acceptInvite} className="space-y-4">
          <div className="space-y-2">
            <FormFieldLabel
              htmlFor="invite-token"
              required
              info={WORKSPACES_FORM_FIELD_INFO.inviteToken}
            >
              Invite token
            </FormFieldLabel>
            <Input
              id="invite-token"
              value={inviteToken}
              onChange={(e) => setInviteToken(e.target.value)}
              placeholder="Paste token"
              required
              autoFocus
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
            <Button
              type="submit"
              variant="secondary"
              disabled={joining || !inviteToken.trim()}
            >
              {joining ? "Joining…" : "Join workspace"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
