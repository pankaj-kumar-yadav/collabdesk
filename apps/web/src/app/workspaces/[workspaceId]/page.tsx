"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useBreadcrumbTrail } from "@/components/breadcrumb-context";
import { CollaborativeEditor } from "@/components/CollaborativeEditor";
import { WorkspaceFilesSidebar } from "@/components/WorkspaceFilesSidebar";
import { api } from "@/lib/api";
import { authClient } from "@/lib/auth-client";
import type {
  FileRow,
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
  const [fileName, setFileName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"editor" | "viewer">("editor");
  const [inviteResult, setInviteResult] = useState<string | null>(null);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [readOnly, setReadOnly] = useState(false);

  const refresh = useCallback(async () => {
    const ws = await api<WorkspaceDetail>(`/workspaces/${workspaceId}`);
    setData(ws);
    setReadOnly(ws.myRole === "viewer");
    setActiveFileId((current) => {
      if (current && ws.files.some((f) => f.id === current)) return current;
      return ws.files[0]?.id ?? null;
    });
  }, [workspaceId]);

  useEffect(() => {
    authClient.getSession().then(({ data: session }) => {
      if (!session?.user) {
        router.replace("/login");
        return;
      }
      refresh().catch((e) => setError(e.message));
    });
  }, [refresh, router]);

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

  async function createFile(e: FormEvent) {
    e.preventDefault();
    try {
      const file = await api<FileRow>(`/workspaces/${workspaceId}/files`, {
        method: "POST",
        body: JSON.stringify({ name: fileName }),
      });
      setFileName("");
      await refresh();
      setActiveFileId(file.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create file");
    }
  }

  async function renameFile() {
    if (!activeFile) return;
    const next = window.prompt("Rename file", activeFile.name);
    if (!next || next === activeFile.name) return;
    try {
      await api(`/files/${activeFile.id}`, {
        method: "PATCH",
        body: JSON.stringify({ name: next }),
      });
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Rename failed");
    }
  }

  async function deleteFile() {
    if (!activeFile) return;
    if (!window.confirm(`Delete ${activeFile.name}?`)) return;
    try {
      await api(`/files/${activeFile.id}`, { method: "DELETE" });
      setActiveFileId(null);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  async function invite(e: FormEvent) {
    e.preventDefault();
    try {
      const inv = await api<{ token: string }>(
        `/workspaces/${workspaceId}/invitations`,
        {
          method: "POST",
          body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
        },
      );
      setInviteResult(inv.token);
      setInviteEmail("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invite failed");
    }
  }

  async function changeRole(memberId: string, role: "editor" | "viewer") {
    try {
      await api(`/workspaces/${workspaceId}/members/${memberId}`, {
        method: "PATCH",
        body: JSON.stringify({ role }),
      });
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Role update failed");
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

  if (!data) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="enter-lead text-center">
          <p className="text-sm font-medium tracking-tight">Loading workspace</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Syncing files, members, and permissions…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 w-full flex-1">
      <WorkspaceFilesSidebar
        workspaceName={data.name}
        myRole={data.myRole}
        files={data.files}
        activeFileId={activeFileId}
        members={data.members}
        snapshots={snapshots}
        fileName={fileName}
        inviteEmail={inviteEmail}
        inviteRole={inviteRole}
        inviteResult={inviteResult}
        onFileNameChange={setFileName}
        onInviteEmailChange={setInviteEmail}
        onInviteRoleChange={setInviteRole}
        onSelectFile={setActiveFileId}
        onCreateFile={createFile}
        onRenameFile={renameFile}
        onDeleteFile={deleteFile}
        onInvite={invite}
        onChangeRole={changeRole}
        onRestoreSnapshot={restoreSnapshot}
      />

      <div className="flex min-w-0 flex-1 flex-col bg-background/30">
        {error ? (
          <p className="border-b border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}
        {activeFile ? (
          <CollaborativeEditor
            key={activeFile.id}
            fileId={activeFile.id}
            fileName={activeFile.name}
            readOnly={readOnly}
            onReadOnlyChange={setReadOnly}
          />
        ) : (
          <div className="flex flex-1 items-center justify-center p-6">
            <div className="enter-lead max-w-sm text-center">
              <p className="text-sm font-medium tracking-tight">No file selected</p>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Create or select a file in the workspace sidebar to start collaborating.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
