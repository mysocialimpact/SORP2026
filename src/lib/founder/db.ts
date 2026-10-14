import "server-only";
import { Pool } from "pg";
import { attachDatabasePool } from "@vercel/functions";

let pool: Pool | undefined;

export function founderDatabase() {
  if (!process.env.CONSOLE_DATABASE_URL) throw new Error("The founder database needs connecting.");
  if (!pool) {
    pool = new Pool({ connectionString: process.env.CONSOLE_DATABASE_URL, max: 4, connectionTimeoutMillis: 10000, idleTimeoutMillis: 10000, statement_timeout: 20000 });
    attachDatabasePool(pool);
  }
  return pool;
}

export async function founderQuery<T = Record<string, unknown>>(text: string, values: unknown[] = []) {
  return (await founderDatabase().query(text, values)).rows as T[];
}
