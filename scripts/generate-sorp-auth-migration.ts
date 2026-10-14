import { writeFile } from "node:fs/promises";
import { getMigrations } from "better-auth/db/migration";
import { sorpAuth } from "../src/lib/sorp-auth/auth";

async function main() {
  const output = process.argv[2];
  if (!output) throw new Error("Pass the SQL output path. This command only generates a migration; it does not apply it.");
  const plan = await getMigrations(sorpAuth().options);
  if (plan.unsafeChanges.length || plan.schemaProblems.length) {
    throw new Error(`Schema generation stopped: ${[...plan.unsafeChanges, ...plan.schemaProblems].join("; ")}`);
  }
  const sql = await plan.compileMigrations();
  await writeFile(output, `-- Generated from the pinned Better Auth version against an empty isolated database.\n-- Review before applying to any database.\n${sql}\n`, { flag: "wx" });
  process.stdout.write(`Wrote Better Auth schema to ${output}.\n`);
}

main().catch((error: unknown) => { process.stderr.write(`${error instanceof Error ? error.message : "Schema generation failed."}\n`); process.exitCode = 1; });
