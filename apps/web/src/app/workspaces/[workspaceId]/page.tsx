"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useBreadcrumbTrail } from "@/components/breadcrumb-context";
import { CollaborativeEditor } from "@/components/collaborative-editor/collaborative-editor";
import { FadeIn, PresenceMessage } from "@/components/motion";
import { DetailPageSkeleton } from "@/components/page-skeleton";
import { WorkspaceFilesSidebar } from "@/components/WorkspaceFilesSidebar";
import { APP_ROUTES } from "@/constants/app-routes.constant";
import { api } from "@/lib/api";
import { authClient } from "@/lib/auth-client";
import type {
  FileRow,
  InviteRole,
  Snapshot,
  WorkspaceDetail,
} from "@/lib/workspace-types";

export default function WorkspacePage() {
  const params = useParams<{ workspaceId: string }>();
  const workspaceId = params.workspaceId;
  const router = useRouter();
  const { setTrail } = useBreadcrumbTrail();
  const [data, setData] = useState<WorkspaceDetail | null>(null);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [readOnly, setReadOnly] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const ws = await api<WorkspaceDetail>(`/workspaces/${workspaceId}`);
    setData(ws);
    setReadOnly(ws.myRole === "viewer");
    setActiveFileId((current) => {
      if (current && ws.files.some((f) => f.id === current)) return current;
      return ws.files[0]?.id ?? null;
    });
  }, [workspaceId]);

  const softRefresh = useCallback(() => {
    void refresh().catch(() => {
      /* keep last good members snapshot while offline */
    });
  }, [refresh]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    authClient.getSession().then(({ data: session }) => {
      if (cancelled) return;
      if (!session?.user) {
        router.replace(APP_ROUTES.LOGIN);
        return;
      }
      refresh()
        .catch((e) => {
          if (!cancelled) setError(e.message);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    });
    return () => {
      cancelled = true;
    };
  }, [refresh, router]);

  // Keep Members / myRole fresh for other clients (WS push + poll + tab focus).
  useEffect(() => {
    const poll = window.setInterval(softRefresh, 4000);
    const onVisible = () => {
      if (document.visibilityState === "visible") softRefresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", softRefresh);
    return () => {
      window.clearInterval(poll);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", softRefresh);
    };
  }, [softRefresh]);

  const activeFile = data?.files.find((f) => f.id === activeFileId) ?? null;

  useEffect(() => {
    setTrail({
      workspaceName: data?.name ?? null,
      fileName: activeFile?.name ?? null,
    });
    return () => setTrail({});
  }, [activeFile?.name, data?.name, setTrail]);

  useEffect(() => {
    if (!activeFileId) {
      setSnapshots([]);
      return;
    }
    api<{ snapshots: Snapshot[] }>(`/files/${activeFileId}/history`)
      .then((res) => setSnapshots(res.snapshots))
      .catch(() => setSnapshots([]));
  }, [activeFileId]);

  async function createFile(name: string) {
    try {
      const file = await api<FileRow>(`/workspaces/${workspaceId}/files`, {
        method: "POST",
        body: JSON.stringify({ name }),
      });
      await refresh();
      setActiveFileId(file.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create file");
      throw err;
    }
  }

  async function renameFile(fileId: string, nextName: string) {
    const file = data?.files.find((f) => f.id === fileId);
    if (!file) return;
    const next = nextName.trim();
    if (!next || next === file.name) return;
    try {
      await api(`/files/${file.id}`, {
        method: "PATCH",
        body: JSON.stringify({ name: next }),
      });
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Rename failed");
    }
  }

  async function deleteFile(fileId: string) {
    try {
      await api(`/files/${fileId}?confirm=true`, { method: "DELETE" });
      setActiveFileId((current) => (current === fileId ? null : current));
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  async function invite(email: string, role: InviteRole) {
    try {
      const inv = await api<{ token: string }>(
        `/workspaces/${workspaceId}/invitations`,
        {
          method: "POST",
          body: JSON.stringify({ email, role }),
        },
      );
      return inv.token;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invite failed");
      throw err;
    }
  }

  async function changeRole(memberId: string, role: InviteRole) {
    try {
      await api(`/workspaces/${workspaceId}/members/${memberId}`, {
        method: "PATCH",
        body: JSON.stringify({ role }),
      });
      setError(null);
      await refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Role update failed";
      setError(message);
      throw err instanceof Error ? err : new Error(message);
    }
  }

  async function restoreSnapshot(snapshotId: string) {
    if (!activeFileId) return;
    try {
      await api(`/files/${activeFileId}/history/${snapshotId}/restore`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      setError(null);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Restore failed");
    }
  }

  if (loading || !data) {
    if (error && !data) {
      return (
        <div className="flex flex-1 items-center justify-center p-6">
          <p className="rounded-md border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        </div>
      );
    }
    return <DetailPageSkeleton />;
  }

  return (
    <FadeIn tone="support" className="flex min-h-0 w-full flex-1">
      <WorkspaceFilesSidebar
        workspaceName={data.name}
        myRole={data.myRole}
        files={data.files}
        activeFileId={activeFileId}
        members={data.members}
        snapshots={snapshots}
        onSelectFile={setActiveFileId}
        onCreateFile={createFile}
        onRenameFile={renameFile}
        onDeleteFile={deleteFile}
        onInvite={invite}
        onChangeRole={changeRole}
        onRestoreSnapshot={restoreSnapshot}
      />

      <div className="flex min-w-0 flex-1 flex-col bg-background/30">
        <PresenceMessage show={Boolean(error)}>
          <p className="border-b border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">
            {error}
          </p>
        </PresenceMessage>
        {activeFile ? (
          <CollaborativeEditor
            key={activeFile.id}
            fileId={activeFile.id}
            fileName={activeFile.name}
            readOnly={readOnly}
            onReadOnlyChange={setReadOnly}
            onWorkspaceInvalidate={softRefresh}
          />
        ) : (
          <div className="flex flex-1 items-center justify-center p-6">
            <div className="max-w-sm text-center">
              <p className="text-sm font-medium tracking-tight">No file selected</p>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Create or select a file in the workspace sidebar to start collaborating.
              </p>
            </div>
          </div>
        )}
      </div>
    </FadeIn>
  );
}
