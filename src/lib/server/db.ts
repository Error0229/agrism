import { neon } from "@neondatabase/serverless";

export function getSqlClient() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return null;
  return neon(databaseUrl);
}

