"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ModeToggle } from "@/components/ModeToggle";
import { FormFieldLabel } from "@/components/form-field-label";
import { AUTH_FORM_FIELD_INFO } from "@/constants/form-field-info/auth";
import { APP_ROUTES } from "@/constants/app-routes.constant";
import { authClient } from "@/lib/auth-client";
import { setToken } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error: err } = await authClient.signIn.email({ email, password });
    if (err) {
      setLoading(false);
      setError(err.message ?? "Login failed");
      return;
    }
    const session = await authClient.getSession();
    const token = session.data?.session?.token;
    if (token) setToken(token);
    setLoading(false);
    router.replace(APP_ROUTES.WORKSPACES);
  }

  return (
    <div className="auth-wrap relative">
      <div className="absolute top-4 right-4">
        <ModeToggle />
      </div>
      <Card className="auth-card enter-lead border-border/80 shadow-sm">
        <CardHeader className="space-y-3">
          <div className="brand">
            Collab<span>Desk</span>
          </div>
          <div>
            <CardTitle className="text-2xl tracking-tight">Sign in</CardTitle>
            <CardDescription className="mt-1.5">
              Continue to your collaborative workspaces.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit}>
            {error ? (
              <p className="rounded-md border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            ) : null}
            <div className="space-y-2">
              <FormFieldLabel
                htmlFor="login-email"
                required
                info={AUTH_FORM_FIELD_INFO.loginEmail}
              >
                Email
              </FormFieldLabel>
              <Input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="you@company.com"
              />
            </div>
            <div className="space-y-2">
              <FormFieldLabel
                htmlFor="login-password"
                required
                info={AUTH_FORM_FIELD_INFO.loginPassword}
              >
                Password
              </FormFieldLabel>
              <Input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </CardContent>
        <CardFooter>
          <p className="text-sm text-muted-foreground">
            No account?{" "}
            <Link
              href={APP_ROUTES.REGISTER}
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              Register
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
