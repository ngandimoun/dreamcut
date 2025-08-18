import type { Config } from "drizzle-kit";

// Load the right env file based on environment
if (process.env.NODE_ENV === "production") {
  require("dotenv").config({ path: ".env.production" });
} else {
  require("dotenv").config({ path: ".env.local" });
}

export default {
  schema: "../../packages/db/src/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
    ssl: true, // Required for Supabase
  },
  out: "./migrations",
  strict: process.env.NODE_ENV === "production",
} satisfies Config;
