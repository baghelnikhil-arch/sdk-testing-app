import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

/**
 * The database client — SERVER ONLY.
 *
 * Connects through `DATABASE_URL`, which should be Neon's **pooled** endpoint:
 * serverless functions come and go constantly and would exhaust a Postgres
 * connection limit without a pooler in front. Migrations use the direct endpoint
 * instead; see `prisma.config.ts`.
 *
 * The client is cached on `globalThis` because a dev server re-evaluates modules
 * on every change, and a fresh pool per reload leaks connections until Neon
 * starts refusing them.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export class DatabaseNotConfiguredError extends Error {
  constructor() {
    super(
      "DATABASE_URL is not set. Add your Postgres connection string to the environment, then restart.",
    );
    this.name = "DatabaseNotConfiguredError";
  }
}

export function isDatabaseConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

function createClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new DatabaseNotConfiguredError();

  return new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });
}

export function db(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createClient();
  }
  return globalForPrisma.prisma;
}
