import { defineConfig } from "drizzle-kit";

// DATABASE_URL is only required for `db:migrate` / `db:studio`, which need a
// live connection. `db:generate` just reads the schema file, so don't throw
// here — throwing would break `npm run db:generate` before a DB exists.
export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgresql://placeholder/placeholder",
  },
});
