import type { SessionUser } from "@/auth";

declare module "fastify" {
  interface FastifyRequest {
    user?: SessionUser;
    sessionToken?: string;
  }
}
