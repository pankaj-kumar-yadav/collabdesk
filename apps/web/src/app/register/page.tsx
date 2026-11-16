"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ModeToggle } from "@/components/ModeToggle";
import { FormFieldLabel } from "@/components/form-field-label";
import { FadeIn, PresenceMessage } from "@/components/motion";
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

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error: err } = await authClient.signUp.email({ name, email, password });
    if (err) {
      setLoading(false);
      setError(err.message ?? "Registration failed");
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
      <FadeIn className="auth-card">
      <Card className="border-border/80 shadow-sm">
        <CardHeader className="space-y-3">
          <div className="brand">
            Collab<span>Desk</span>
          </div>
          <div>
            <CardTitle className="text-2xl tracking-tight">Create account</CardTitle>
            <CardDescription className="mt-1.5">
              Register to create and join workspaces.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit}>
            <PresenceMessage show={Boolean(error)}>
              <p className="rounded-md border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            </PresenceMessage>
            <div className="space-y-2">
              <FormFieldLabel
                htmlFor="register-name"
                required
                info={AUTH_FORM_FIELD_INFO.registerName}
              >
                Name
              </FormFieldLabel>
              <Input
                id="register-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoComplete="name"
                placeholder="Ada Lovelace"
              />
            </div>
            <div className="space-y-2">
              <FormFieldLabel
                htmlFor="register-email"
                required
                info={AUTH_FORM_FIELD_INFO.registerEmail}
              >
                Email
              </FormFieldLabel>
              <Input
                id="register-email"
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
                htmlFor="register-password"
                required
                info={AUTH_FORM_FIELD_INFO.registerPassword}
              >
                Password
              </FormFieldLabel>
              <Input
                id="register-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                placeholder="At least 8 characters"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating…" : "Create account"}
            </Button>
          </form>
        </CardContent>
        <CardFooter>
          <p className="text-sm text-muted-foreground">
            Already registered?{" "}
            <Link
              href={APP_ROUTES.LOGIN}
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              Sign in
            </Link>
          </p>
        </CardFooter>
      </Card>
      </FadeIn>
    </div>
  );
}
