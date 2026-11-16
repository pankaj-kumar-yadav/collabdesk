"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { GlobalLoader } from "@/components/global-loader";
import { APP_ROUTES } from "@/constants/app-routes.constant";
import { authClient } from "@/lib/auth-client";
import { getToken } from "@/lib/api";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace(APP_ROUTES.LOGIN);
      return;
    }
    authClient.getSession().then(({ data }) => {
      if (data?.user) router.replace(APP_ROUTES.WORKSPACES);
      else router.replace(APP_ROUTES.LOGIN);
    });
  }, [router]);

  return (
    <div className="auth-wrap">
      <GlobalLoader label="Opening your workspace…" />
    </div>
  );
}
