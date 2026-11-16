import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { bearer } from "better-auth/plugins";
import { prisma } from "./db.js";
import { env } from "./env.js";

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
  },
  trustedOrigins: [env.CORS_ORIGIN, "http://localhost:3000", "app://."],
  advanced: {
    useSecureCookies: env.COOKIE_SECURE,
    defaultCookieAttributes: {
      sameSite: "lax",
      httpOnly: true,
      secure: env.COOKIE_SECURE,
    },
  },
  plugins: [bearer()],
});

export type SessionUser = {
  id: string;
  name: string;
  email: string;
};

export async function getSessionFromHeaders(headers: Headers) {
  const session = await auth.api.getSession({ headers });
  if (!session?.user) return null;
  return {
    session: session.session,
    user: session.user as SessionUser,
  };
}
