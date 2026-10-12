import "server-only";
import { Pool, type PoolClient } from "pg";
import { attachDatabasePool } from "@vercel/functions";
let pool: Pool | undefined;
export function database() {
  if (!process.env.CONSOLE_DATABASE_URL)
    throw new Error("The research database needs connecting.");
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.CONSOLE_DATABASE_URL,
      max: 4,
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 10000,
      statement_timeout: 20000,
    });
    attachDatabasePool(pool);
  }
  return pool;
}
export async function query<T = Record<string, unknown>>(
  text: string,
  values: unknown[] = [],
) {
  return (await database().query(text, values)).rows as T[];
}
export async function transaction<T>(fn: (client: PoolClient) => Promise<T>) {
  const c = await database().connect();
  try {
    await c.query("BEGIN");
    const value = await fn(c);
    await c.query("COMMIT");
    return value;
  } catch (e) {
    await c.query("ROLLBACK");
    throw e;
  } finally {
    c.release();
  }
}
