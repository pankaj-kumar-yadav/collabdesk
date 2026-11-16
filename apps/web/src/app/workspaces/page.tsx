"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Topbar } from "@/components/Topbar";
import { api } from "@/lib/api";
import { authClient } from "@/lib/auth-client";

type WorkspaceRow = {
  id: string;
  name: string;
  role: string;
  memberCount: number;
  fileCount: number;
};

export default function WorkspacesPage() {
  const router = useRouter();
  const [userName, setUserName] = useState("");
  const [rows, setRows] = useState<WorkspaceRow[]>([]);
  const [name, setName] = useState("");
  const [inviteToken, setInviteToken] = useState("");
  const [error, setError] = useState<string | null>(null);

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
      setUserName(data.user.name);
      refresh().catch((e) => setError(e.message));
    });
  }, [router]);

  async function createWorkspace(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const ws = await api<{ id: string }>("/workspaces", {
        method: "POST",
        body: JSON.stringify({ name }),
      });
      setName("");
      router.push(`/workspaces/${ws.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  }

  async function acceptInvite(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const member = await api<{ workspaceId: string }>(
        `/invitations/${inviteToken.trim()}/accept`,
        { method: "POST", body: JSON.stringify({}) },
      );
      setInviteToken("");
      router.push(`/workspaces/${member.workspaceId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  }

  return (
    <>
      <Topbar subtitle="Your workspaces" userName={userName} />
      <main style={{ padding: "1.25rem" }}>
        {error ? <p className="error">{error}</p> : null}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "1rem",
            marginBottom: "1.25rem",
          }}
        >
          <form className="panel" onSubmit={createWorkspace}>
            <h2 style={{ marginTop: 0 }}>Create workspace</h2>
            <label className="field">
              Name
              <input value={name} onChange={(e) => setName(e.target.value)} required />
            </label>
            <button className="btn btn-primary" type="submit">
              Create
            </button>
          </form>
          <form className="panel" onSubmit={acceptInvite}>
            <h2 style={{ marginTop: 0 }}>Accept invitation</h2>
            <label className="field">
              Invite token
              <input
                value={inviteToken}
                onChange={(e) => setInviteToken(e.target.value)}
                required
              />
            </label>
            <button className="btn" type="submit">
              Join
            </button>
          </form>
        </div>
        <div className="grid-workspaces" style={{ padding: 0 }}>
          {rows.map((row) => (
            <Link key={row.id} href={`/workspaces/${row.id}`} className="workspace-card">
              <strong>{row.name}</strong>
              <div className="muted">
                {row.role} · {row.memberCount} members · {row.fileCount} files
              </div>
            </Link>
          ))}
        </div>
      </main>
    </>
  );
}
