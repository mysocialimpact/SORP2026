import {Client} from 'pg';
// The provisioned recovery branch is separate from both live and preview databases.
export async function restoreBackupForTest(backup:{schema:string;tables:Record<string,unknown[]>}){
 const destination=process.env.CONSOLE_BACKUP_RESTORE_DATABASE_URL;if(!destination)throw new Error('Isolated recovery-test database needs configuration.');
 const target=new URL(destination),source=new URL(process.env.CONSOLE_DATABASE_URL!);
 if(target.hostname.replace('-pooler','')===source.hostname.replace('-pooler','')&&target.pathname===source.pathname)throw new Error('Recovery test cannot run against the source database.');
 if(backup.schema!=='research_console')throw new Error('Unexpected backup schema.');
 const c=new Client({connectionString:destination,statement_timeout:30000});await c.connect();
 try{await c.query('BEGIN');await c.query("SELECT pg_advisory_xact_lock(hashtext('console-backup-restore-test'))");
  for(const [table,rows] of Object.entries(backup.tables)){
   if(!/^[a-z_]+$/.test(table))throw new Error('Invalid recovery table.');
   // Only the dedicated restore schema can be cleared; the branch's app records are untouched.
   await c.query(`CREATE TABLE IF NOT EXISTS console_backup_restore.${table} (LIKE research_console.${table} INCLUDING DEFAULTS INCLUDING CONSTRAINTS)`);
   await c.query(`TRUNCATE TABLE console_backup_restore.${table}`);
   await c.query(`INSERT INTO console_backup_restore.${table} SELECT * FROM jsonb_populate_recordset(NULL::console_backup_restore.${table},$1::jsonb)`,[JSON.stringify(rows)]);
   const mismatch=(await c.query(`WITH expected AS(SELECT * FROM jsonb_populate_recordset(NULL::console_backup_restore.${table},$1::jsonb)) SELECT 1 FROM ((SELECT * FROM expected EXCEPT ALL SELECT * FROM console_backup_restore.${table}) UNION ALL (SELECT * FROM console_backup_restore.${table} EXCEPT ALL SELECT * FROM expected)) difference LIMIT 1`,[JSON.stringify(rows)])).rowCount;
   if(mismatch)throw new Error('Restored data differs: '+table);
  }
  const keys=(await c.query(`SELECT src.relname src,dst.relname dst,sa.attname src_column,da.attname dst_column FROM pg_constraint k JOIN pg_class src ON src.oid=k.conrelid JOIN pg_namespace n ON n.oid=src.relnamespace JOIN pg_class dst ON dst.oid=k.confrelid JOIN pg_attribute sa ON sa.attrelid=src.oid AND sa.attnum=k.conkey[1] JOIN pg_attribute da ON da.attrelid=dst.oid AND da.attnum=k.confkey[1] WHERE k.contype='f' AND n.nspname='research_console'`)).rows;
  for(const k of keys){if(![k.src,k.dst,k.src_column,k.dst_column].every(v=>/^[a-z_]+$/.test(v)))throw new Error('Unsupported relationship identifier.');if(!backup.tables[k.src]||!backup.tables[k.dst])continue;
   if((await c.query(`SELECT 1 FROM console_backup_restore.${k.src} s LEFT JOIN console_backup_restore.${k.dst} d ON s.${k.src_column}=d.${k.dst_column} WHERE s.${k.src_column} IS NOT NULL AND d.${k.dst_column} IS NULL LIMIT 1`)).rowCount)throw new Error('Broken restored relationship: '+k.src);
  }
  await c.query('COMMIT');return {restored:true,restoredTables:Object.keys(backup.tables).length,relationshipsChecked:keys.length};
 }catch(e){await c.query('ROLLBACK');throw e;}finally{await c.end();}
}
