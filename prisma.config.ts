import { defineConfig } from "prisma/config";

/**
 * Migration-time configuration.
 *
 * Migrations prefer DIRECT_URL — the unpooled Neon endpoint — because schema
 * changes need a real session, which a transaction pooler does not provide. The
 * application connects through the pooled DATABASE_URL instead; see
 * `src/lib/db.ts`.
 *
 * The URL is read with `process.env` rather than Prisma's `env()` helper on
 * purpose: `env()` throws when the variable is absent, and `prisma generate`
 * loads this file during every build. Generating only needs the schema, so a
 * build that has DATABASE_URL but no DIRECT_URL must not fail here.
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: {
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "",
  },
});
