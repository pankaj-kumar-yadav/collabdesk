import type { FastifyServerOptions } from "fastify";

const isProd = process.env.NODE_ENV === "production";
const isTest = process.env.NODE_ENV === "test";

/** Pino options for Fastify HTTP request / response terminal logs. */
export const loggerOptions: FastifyServerOptions["logger"] = isTest
  ? false
  : isProd
    ? { level: "info" }
    : {
        level: "info",
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "HH:MM:ss Z",
            ignore: "pid,hostname",
          },
        },
      };
