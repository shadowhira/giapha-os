import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

function createSqlClient(): NeonQueryFunction<false, false> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return (() => {
      throw new Error("DATABASE_URL chưa được cấu hình.");
    }) as unknown as NeonQueryFunction<false, false>;
  }
  return neon(databaseUrl);
}

// Client SQL thô, dùng tham số hoá qua tagged template: sql`SELECT * FROM persons WHERE id = ${id}`
export const sql = createSqlClient();
