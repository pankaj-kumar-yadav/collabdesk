"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Files, Plus, Ticket, Users } from "lucide-react";
import { api } from "@/lib/api";
import { authClient } from "@/lib/auth-client";
import type { WorkspaceRow } from "@/lib/workspace-types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function WorkspacesPage() {
  const router = useRouter();
  const [rows, setRows] = useState<WorkspaceRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [inviteToken, setInviteToken] = useState("");
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);

  async function refresh() {
    const data = await api<WorkspaceRow[]>("/workspaces");
    setRows(data);
  }

  useEffect(() => {
    authClient.getSession().then(({ data }) => {
      if (!data?.user) {
        router.replace("/login");
        return;
      }
      refresh().catch((e) => setError(e.message));
    });
  }, [router]);

  async function createWorkspace(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setCreating(true);
    try {
      const ws = await api<{ id: string }>("/workspaces", {
        method: "POST",
        body: JSON.stringify({ name }),
      });
      setName("");
      await refresh();
      router.push(`/workspaces/${ws.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create workspace");
    } finally {
      setCreating(false);
    }
  }

  async function acceptInvite(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setJoining(true);
    try {
      const member = await api<{ workspaceId: string }>(
        `/invitations/${inviteToken.trim()}/accept`,
        { method: "POST", body: JSON.stringify({}) },
      );
      setInviteToken("");
      await refresh();
      router.push(`/workspaces/${member.workspaceId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to join workspace");
    } finally {
      setJoining(false);
    }
  }

  return (
    <div className="flex-1 overflow-auto p-4 md:p-6">
      <div className="enter-lead mb-8 max-w-2xl">
        <h1 className="text-2xl font-semibold tracking-tight">Home</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Create a workspace, join with an invite, or open one you already have.
        </p>
      </div>

      {error ? (
        <p className="mb-4 rounded-md border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="enter-support mb-10 grid gap-4 md:grid-cols-2">
        <Card className="border-border/80 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Plus className="size-3.5" />
              </span>
              New workspace
            </CardTitle>
            <CardDescription>
              Start a fresh collaborative space for your team.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={createWorkspace} className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="ws-name">Name</Label>
                <Input
                  id="ws-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Product eng"
                  required
                />
              </div>
              <Button type="submit" disabled={creating}>
                {creating ? "Creating…" : "Create workspace"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="flex size-7 items-center justify-center rounded-md bg-secondary text-foreground">
                <Ticket className="size-3.5" />
              </span>
              Join with invite
            </CardTitle>
            <CardDescription>
              Paste an invite token to join an existing workspace.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={acceptInvite} className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="invite-token">Invite token</Label>
                <Input
                  id="invite-token"
                  value={inviteToken}
                  onChange={(e) => setInviteToken(e.target.value)}
                  placeholder="Paste token"
                  required
                />
              </div>
              <Button type="submit" variant="secondary" disabled={joining}>
                {joining ? "Joining…" : "Join workspace"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <div className="mb-4">
        <h2 className="text-lg font-medium tracking-tight">Your workspaces</h2>
        <p className="text-sm text-muted-foreground">
          Open a workspace to edit files and collaborate.
        </p>
      </div>

      {rows.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((row) => (
            <Link
              key={row.id}
              href={`/workspaces/${row.id}`}
              className="pressable pressable-lift block rounded-xl outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              <Card className="h-full border-border/80 shadow-sm transition-[border-color] duration-150">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base tracking-tight">
                      {row.name}
                    </CardTitle>
                    <Badge variant="secondary">{row.role}</Badge>
                  </div>
                  <CardDescription className="flex items-center gap-1">
                    Open workspace
                    <ArrowRight className="size-3.5" />
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex gap-4 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Users className="size-3.5" />
                    {row.memberCount} members
                  </span>
                  <span className="inline-flex items-center gap-1">
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
              Create one above, or join with an invite token.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}
    </div>
  );
}
