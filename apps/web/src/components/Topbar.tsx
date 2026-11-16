"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { setToken } from "@/lib/api";
import { APP_ROUTES } from "@/constants/app-routes.constant";

export type TopbarProps = {
  subtitle?: string;
  userName?: string;
};

export function Topbar(props: TopbarProps) {
  const { subtitle, userName } = props;
  const router = useRouter();

  async function logout() {
    await authClient.signOut();
    setToken(null);
    router.replace(APP_ROUTES.LOGIN);
  }

  return (
    <header className="topbar">
      <div>
        <Link href={APP_ROUTES.WORKSPACES} className="brand">
          Collab<span>Desk</span>
        </Link>
        {subtitle ? <div className="muted">{subtitle}</div> : null}
      </div>
      <div className="flex items-center gap-3">
        {userName ? <span className="muted">{userName}</span> : null}
        <button className="btn" onClick={logout} type="button">
          Log out
        </button>
      </div>
    </header>
  );
}
