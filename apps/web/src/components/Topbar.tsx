"use client";

import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { setToken } from "@/lib/api";
import { useRouter } from "next/navigation";

export function Topbar({
  subtitle,
  userName,
}: {
  subtitle?: string;
  userName?: string;
}) {
  const router = useRouter();

  async function logout() {
    await authClient.signOut();
    setToken(null);
    router.replace("/login");
  }

  return (
    <header className="topbar">
      <div>
        <Link href="/workspaces" className="brand">
          Collab<span>Desk</span>
        </Link>
        {subtitle ? <div className="muted">{subtitle}</div> : null}
      </div>
      <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
        {userName ? <span className="muted">{userName}</span> : null}
        <button className="btn" onClick={logout} type="button">
          Log out
        </button>
      </div>
    </header>
  );
}
