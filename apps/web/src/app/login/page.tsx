"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { setToken } from "@/lib/api";

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
    router.replace("/workspaces");
  }

  return (
    <div className="auth-wrap">
      <form className="panel auth-card" onSubmit={onSubmit}>
        <div className="brand" style={{ marginBottom: "0.75rem" }}>
          Collab<span>Desk</span>
        </div>
        <h1>Sign in</h1>
        <p className="muted">Continue to your collaborative workspaces.</p>
        {error ? <p className="error">{error}</p> : null}
        <label className="field">
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </label>
        <label className="field">
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </label>
        <button className="btn btn-primary" disabled={loading} type="submit">
          {loading ? "Signing in…" : "Sign in"}
        </button>
        <p className="muted" style={{ marginTop: "1rem" }}>
          No account? <Link href="/register">Register</Link>
        </p>
      </form>
    </div>
  );
}
