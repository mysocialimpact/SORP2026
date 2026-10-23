import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { Pool } from "pg";

const url = process.env.SORP_AUTH_DATABASE_URL || "";
if (!/^postgres(?:ql)?:\/\/[^@]+@127\.0\.0\.1:55432\/sorp_test$/.test(url))
  throw new Error("Use the isolated local sorp_test database.");

test("SORP runtime role cannot alter audit history or read another schema", async () => {
  const db = new Pool({ connectionString: url });
  const client = await db.connect();
  try {
    const role = await client.query<{ safe: boolean }>(`SELECT
      rolcanlogin AND NOT (rolsuper OR rolcreaterole OR rolcreatedb OR rolreplication OR rolbypassrls)
        AND NOT EXISTS (SELECT 1 FROM pg_auth_members WHERE member=pg_roles.oid) AS safe
      FROM pg_roles WHERE rolname='sorp_auth_runtime'`);
    assert.equal(role.rows[0]?.safe, true, "the web runtime role must have no inherited admin rights");
    await client.query("CREATE SCHEMA IF NOT EXISTS research_console");
    await client.query("CREATE TABLE IF NOT EXISTS research_console.private_fixture(secret text)");
    const actorId = randomUUID();
    await client.query('INSERT INTO sorp_auth."user"(id,name,email,"emailVerified") VALUES($1,$2,$3,true)',
      [actorId, "Audit fixture", `${actorId}@example.invalid`]);
    await client.query("SET ROLE sorp_auth_runtime");
    const inserted = await client.query<{ id: string }>(`INSERT INTO sorp_auth.audit_event
      (actor_user_id,action,target_type,target_id) VALUES($1,'role_test','fixture','synthetic') RETURNING id`, [actorId]);
    assert.ok(inserted.rows[0].id);
    await client.query('SELECT count(*) FROM sorp_auth."session"');
    await assert.rejects(client.query('SELECT * FROM research_console.private_fixture'),
      (error: { code?: string }) => error.code === "42501");
    await assert.rejects(client.query('CREATE TABLE sorp_auth.runtime_escape(id int)'),
      (error: { code?: string }) => error.code === "42501");
    await assert.rejects(client.query('UPDATE sorp_auth.audit_event SET action=$1 WHERE id=$2',
      ["changed", inserted.rows[0].id]), (error: { code?: string }) => error.code === "42501");
    await assert.rejects(client.query('DELETE FROM sorp_auth.audit_event WHERE id=$1',
      [inserted.rows[0].id]), (error: { code?: string }) => error.code === "42501");
    await client.query("RESET ROLE");
    await client.query('DELETE FROM sorp_auth."user" WHERE id=$1', [actorId]);
    const retained = await client.query('SELECT actor_user_id FROM sorp_auth.audit_event WHERE id=$1',
      [inserted.rows[0].id]);
    assert.equal(retained.rows[0].actor_user_id, actorId);
    await assert.rejects(client.query('UPDATE sorp_auth.audit_event SET action=$1 WHERE id=$2',
      ["owner_changed", inserted.rows[0].id]), /append-only/);
    await assert.rejects(client.query('TRUNCATE sorp_auth.audit_event'), /append-only/);
  } finally {
    await client.query("RESET ROLE").catch(() => {});
    client.release();
    await db.end();
  }
});
