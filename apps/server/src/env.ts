import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.string().url().default("http://localhost:4000"),
  PORT: z.coerce.number().default(4000),
  HOST: z.string().default("0.0.0.0"),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
  COOKIE_SECURE: z
    .string()
    .optional()
    .transform((v) => v === "true"),
  YJS_SNAPSHOT_EVERY_UPDATES: z.coerce.number().default(50),
  YJS_SNAPSHOT_EVERY_MS: z.coerce.number().default(30_000),
  PRESENCE_THROTTLE_MS: z.coerce.number().default(75),
});

export const env = envSchema.parse(process.env);
