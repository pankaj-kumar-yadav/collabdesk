"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { setToken } from "@/lib/api";

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
    router.replace("/workspaces");
  }

  return (
    <div className="auth-wrap">
      <form className="panel auth-card" onSubmit={onSubmit}>
        <div className="brand" style={{ marginBottom: "0.75rem" }}>
          Collab<span>Desk</span>
        </div>
        <h1>Create account</h1>
        <p className="muted">Register to create and join workspaces.</p>
        {error ? <p className="error">{error}</p> : null}
        <label className="field">
          Name
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
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
            minLength={8}
            autoComplete="new-password"
          />
        </label>
        <button className="btn btn-primary" disabled={loading} type="submit">
          {loading ? "Creating…" : "Create account"}
        </button>
        <p className="muted" style={{ marginTop: "1rem" }}>
          Already registered? <Link href="/login">Sign in</Link>
        </p>
      </form>
    </div>
  );
}
