/** Prepare one customer identity with its original account ID and a new password claim.
 *
 * Input is a private JSON file, never committed to the repository:
 * {"id":"<original Cow UUID>","email":"<customer email>","name":"<name>",
 *  "position":"<optional position>","organisation":"<optional label>"}
 * Dry run: npx tsx scripts/prepare-sorp-customer.ts /private/customer.json
 * Apply:   npx tsx scripts/prepare-sorp-customer.ts /private/customer.json --apply
 */
import { readFile } from "node:fs/promises";
import { Pool } from "pg";

type Customer = { id: string; email: string; name: string; position?: string; organisation?: string };

function validate(value: unknown): Customer {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Expected one customer object.");
  const row = value as Record<string, unknown>;
  const id = String(row.id || "");
  const email = String(row.email || "").trim().toLowerCase();
  const name = String(row.name || "").trim();
  const position = String(row.position || "").trim();
  const organisation = String(row.organisation || "").trim();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 ||
      name.length < 2 || name.length > 120 || position.length > 120 || organisation.length > 180) {
    throw new Error("The customer identity is incomplete or invalid.");
  }
  return { id, email, name, position, organisation };
}

export async function prepareCustomer(customer: Customer, databaseUrl: string) {
  const db = new Pool({ connectionString: databaseUrl, max: 1 });
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const existing = await client.query<{ id: string; email: string; verified: boolean }>(
      'SELECT id,email,"emailVerified" AS verified FROM sorp_auth."user" WHERE id=$1 OR lower(email)=$2 FOR UPDATE',
      [customer.id, customer.email]);
    if (existing.rows.length) {
      if (existing.rows.length !== 1 || existing.rows[0].id !== customer.id ||
          existing.rows[0].email.toLowerCase() !== customer.email) {
        throw new Error("An existing identity conflicts with the immutable customer ID or email.");
      }
      await client.query("ROLLBACK");
      return "already_prepared";
    }
    await client.query('INSERT INTO sorp_auth."user" (id,name,email,"emailVerified","twoFactorEnabled") VALUES($1,$2,$3,false,false)',
      [customer.id, customer.name, customer.email]);
    await client.query("INSERT INTO sorp_auth.profile(user_id,position,organisation_label) VALUES($1,$2,$3)",
      [customer.id, customer.position || "", customer.organisation || ""]);
    await client.query("INSERT INTO sorp_auth.audit_event(action,target_type,target_id) VALUES('customer_identity_prepared','account',$1)",
      [customer.id]);
    await client.query("COMMIT");
    return "prepared";
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await db.end();
  }
}

async function main() {
  const path = process.argv[2];
  if (!path || process.argv.slice(3).some(arg => arg !== "--apply")) throw new Error("Pass a private JSON manifest path and optionally --apply.");
  const customer = validate(JSON.parse(await readFile(path, "utf8")));
  if (!process.argv.includes("--apply")) {
    process.stdout.write("Customer manifest is valid. No database changes made.\n");
  } else {
    if (!process.env.SORP_AUTH_DATABASE_URL) {
      throw new Error("The independent database must be configured before preparation.");
    }
    const status = await prepareCustomer(customer, process.env.SORP_AUTH_DATABASE_URL);
    process.stdout.write(`Customer identity ${status}; credential and email verification remain pending.\n`);
  }
}

if (process.argv[1]?.endsWith("prepare-sorp-customer.ts")) {
  void main().catch(() => {
    process.stderr.write("Customer preparation failed; check manifest validity, identity conflicts and database access.\n");
    process.exitCode = 1;
  });
}
