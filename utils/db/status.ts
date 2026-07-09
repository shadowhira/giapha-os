import { neon } from "@neondatabase/serverless";

export type DbStatus = "missing-config" | "missing-schema" | "ok";

function isMissingTableError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "42P01"
  );
}

// Dùng trong proxy.ts (edge) để điều hướng /missing-db-config hoặc /setup khi cần.
export async function getDbStatus(): Promise<DbStatus> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return "missing-config";

  try {
    const sql = neon(databaseUrl);
    await sql`SELECT 1 FROM persons LIMIT 1`;
    return "ok";
  } catch (error) {
    if (isMissingTableError(error)) return "missing-schema";
    return "ok";
  }
}
