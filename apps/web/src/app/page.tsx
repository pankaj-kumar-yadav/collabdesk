"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { getToken } from "@/lib/api";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    authClient.getSession().then(({ data }) => {
      if (data?.user) router.replace("/workspaces");
      else router.replace("/login");
    });
  }, [router]);

  return (
    <div className="auth-wrap">
      <div className="enter-lead text-center">
        <div className="brand mb-2">
          Collab<span>Desk</span>
        </div>
        <p className="text-sm text-muted-foreground">Opening your workspace…</p>
      </div>
    </div>
  );
}
