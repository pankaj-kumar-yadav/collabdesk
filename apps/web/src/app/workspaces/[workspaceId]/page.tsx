"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Topbar } from "@/components/Topbar";
import { CollaborativeEditor } from "@/components/CollaborativeEditor";
import { api } from "@/lib/api";
import { authClient } from "@/lib/auth-client";

type Member = {
  id: string;
  role: string;
  user: { id: string; name: string; email: string };
};

type FileRow = {
  id: string;
  name: string;
};

type WorkspaceDetail = {
  id: string;
  name: string;
  myRole: string;
  members: Member[];
  files: FileRow[];
};

type Snapshot = { id: string; version: number; createdAt: string };

export default function WorkspacePage() {
  const params = useParams<{ workspaceId: string }>();
  const workspaceId = params.workspaceId;
  const router = useRouter();
  const [userName, setUserName] = useState("");
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
      setUserName(session.user.name);
      refresh().catch((e) => setError(e.message));
    });
  }, [refresh, router]);

  const activeFile = data?.files.find((f) => f.id === activeFileId) ?? null;

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
      const inv = await api<{ token: string }>(`/workspaces/${workspaceId}/invitations`, {
        method: "POST",
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });
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
      // Provider reconnects after server closes sockets
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Restore failed");
    }
  }

  if (!data) {
    return (
      <>
        <Topbar userName={userName} />
        <p className="muted" style={{ padding: "1rem" }}>
          Loading workspace…
        </p>
      </>
    );
  }

  return (
    <>
      <Topbar subtitle={data.name} userName={userName} />
      {error ? <p className="error" style={{ padding: "0.5rem 1rem" }}>{error}</p> : null}
      <div className="workspace-layout">
        <aside className="sidebar">
          <h3 style={{ marginTop: 0 }}>Files</h3>
          {data.files.map((file) => (
            <button
              key={file.id}
              type="button"
              className={`file-item ${file.id === activeFileId ? "active" : ""}`}
              onClick={() => setActiveFileId(file.id)}
              style={{ width: "100%", border: "none", background: "transparent", color: "inherit", textAlign: "left" }}
            >
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.9rem" }}>{file.name}</span>
            </button>
          ))}
          {data.myRole !== "viewer" ? (
            <form onSubmit={createFile} style={{ marginTop: "1rem" }}>
              <label className="field">
                New file
                <input value={fileName} onChange={(e) => setFileName(e.target.value)} placeholder="main.ts" required />
              </label>
              <button className="btn btn-primary" type="submit">
                Create file
              </button>
            </form>
          ) : null}
          {activeFile && data.myRole !== "viewer" ? (
            <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem" }}>
              <button className="btn" type="button" onClick={renameFile}>
                Rename
              </button>
              <button className="btn btn-danger" type="button" onClick={deleteFile}>
                Delete
              </button>
            </div>
          ) : null}

          <h3>Members</h3>
          {data.members.map((m) => (
            <div key={m.id} style={{ marginBottom: "0.65rem" }}>
              <div>{m.user.name}</div>
              <div className="muted" style={{ fontSize: "0.85rem" }}>
                {m.user.email} · {m.role}
              </div>
              {data.myRole === "owner" && m.role !== "owner" ? (
                <div style={{ display: "flex", gap: "0.35rem", marginTop: "0.35rem" }}>
                  <button className="btn" type="button" onClick={() => changeRole(m.id, "editor")}>
                    Editor
                  </button>
                  <button className="btn" type="button" onClick={() => changeRole(m.id, "viewer")}>
                    Viewer
                  </button>
                </div>
              ) : null}
            </div>
          ))}

          {data.myRole === "owner" ? (
            <form onSubmit={invite} style={{ marginTop: "1rem" }}>
              <h3>Invite</h3>
              <label className="field">
                Email
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                />
              </label>
              <label className="field">
                Role
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as "editor" | "viewer")}
                  style={{
                    background: "var(--bg0)",
                    color: "var(--text)",
                    border: "1px solid var(--line)",
                    borderRadius: 8,
                    padding: "0.55rem",
                  }}
                >
                  <option value="editor">editor</option>
                  <option value="viewer">viewer</option>
                </select>
              </label>
              <button className="btn btn-primary" type="submit">
                Create invite
              </button>
              {inviteResult ? (
                <p className="muted" style={{ wordBreak: "break-all" }}>
                  Token: {inviteResult}
                </p>
              ) : null}
            </form>
          ) : null}

          {activeFileId ? (
            <div style={{ marginTop: "1rem" }}>
              <h3>History</h3>
              {snapshots.length === 0 ? (
                <p className="muted">No snapshots yet</p>
              ) : (
                snapshots.slice(0, 8).map((s) => (
                  <div key={s.id} style={{ marginBottom: "0.5rem" }}>
                    <div className="muted" style={{ fontSize: "0.85rem" }}>
                      v{s.version} · {new Date(s.createdAt).toLocaleString()}
                    </div>
                    {data.myRole !== "viewer" ? (
                      <button className="btn" type="button" onClick={() => restoreSnapshot(s.id)}>
                        Restore
                      </button>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          ) : null}
        </aside>

        <section>
          {activeFile ? (
            <CollaborativeEditor
              key={activeFile.id}
              fileId={activeFile.id}
              fileName={activeFile.name}
              readOnly={readOnly}
              onReadOnlyChange={setReadOnly}
            />
          ) : (
            <div style={{ padding: "1.5rem" }} className="muted">
              Create or select a file to start collaborating.
            </div>
          )}
        </section>

        <aside className="presence">
          <h3 style={{ marginTop: 0 }}>Workspace</h3>
          <p className="muted">Role: {data.myRole}</p>
          <p className="muted">
            Cursors and live selections appear in the editor for connected collaborators. Presence updates
            are throttled server-side.
          </p>
        </aside>
      </div>
    </>
  );
}
