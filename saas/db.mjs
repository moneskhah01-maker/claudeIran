// Database access for the SaaS. One small interface, two drivers:
//   DATABASE_URL=postgres://...   -> real PostgreSQL through `pg` (production)
//   DATABASE_URL=pglite:./data/pg -> PGlite, Postgres compiled to WebAssembly, stored in a folder (development)
//   DATABASE_URL=pglite:memory    -> PGlite in memory (tests)
// The rest of the app only uses db.query(sql, params) and db.tx(fn), so the same SQL runs on both.
import { readdir, readFile, mkdir } from 'node:fs/promises';
import { existsSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const MIGRATIONS = path.join(path.dirname(fileURLToPath(import.meta.url)), 'migrations');
const INT8 = 20, NUMERIC = 1700; // Postgres type ids: BIGINT/BIGSERIAL and COUNT/SUM results
// Rial amounts fit easily in a JS number (exact up to 9e15), so read BIGINT as Number, not string.
const toNum = v => (v === null ? null : Number(v));
const TZ = 'Asia/Tehran';

// A PGlite folder must be open in ONE program at a time (e.g. the server, or the seed script, not both):
// two writers on the same files lose or corrupt data. A small lock file next to the folder records which
// process has it open; a second program gets a clear message instead of silently writing in parallel.
function alive(pid) { try { process.kill(pid, 0); return true; } catch (e) { return e.code === 'EPERM'; } }
function takeLock(dir) {
  const lock = path.resolve(dir) + '.lock';
  if (existsSync(lock)) {
    const pid = Number(readFileSync(lock, 'utf8'));
    if (pid && pid !== process.pid && alive(pid)) {
      throw Object.assign(new Error(`The local database "${dir}" is already open in another program (process ${pid}), probably the server. Stop it first (Ctrl+C in its terminal), then run this again.`), { code: 'DB_LOCKED' });
    }
  }
  writeFileSync(lock, String(process.pid));
  const release = () => { try { if (readFileSync(lock, 'utf8') === String(process.pid)) unlinkSync(lock); } catch {} };
  process.once('exit', release);
  return release;
}

export async function openDb(url) {
  let db;
  if (url.startsWith('pglite:')) {
    const { PGlite } = await import('@electric-sql/pglite');
    const where = url.slice('pglite:'.length);
    if (where !== 'memory') await mkdir(where, { recursive: true }); // PGlite does not create parent folders
    const release = where === 'memory' ? () => {} : takeLock(where);
    const pg = new PGlite(where === 'memory' ? undefined : where, { parsers: { [INT8]: toNum, [NUMERIC]: toNum } });
    const wrap = q => ({ query: async (sql, params = []) => (await q.query(sql, params)).rows });
    db = {
      driver: 'pglite',
      ...wrap(pg),
      exec: sql => pg.exec(sql),
      tx: fn => pg.transaction(t => fn(wrap(t))),
      close: async () => { await pg.close(); release(); },
    };
    await pg.exec(`SET TIME ZONE '${TZ}'`); // PGlite is a single connection, so once is enough
  } else {
    const { default: pg } = await import('pg');
    pg.types.setTypeParser(INT8, toNum);
    pg.types.setTypeParser(NUMERIC, toNum);
    // every pooled connection uses Tehran time, so "today" and daily usage charts match the customer's day
    const pool = new pg.Pool({ connectionString: url, max: 10, options: `-c TimeZone=${TZ}` });
    pool.on('error', e => console.error('[db] idle client error', e.message));
    const wrap = c => ({ query: async (sql, params = []) => (await c.query(sql, params)).rows });
    db = {
      driver: 'pg',
      ...wrap(pool),
      exec: sql => pool.query(sql),
      // BEGIN/COMMIT on one client from the pool; any error rolls the whole thing back.
      async tx(fn) {
        const c = await pool.connect();
        try {
          await c.query('BEGIN');
          const out = await fn(wrap(c));
          await c.query('COMMIT');
          return out;
        } catch (e) {
          await c.query('ROLLBACK').catch(() => {});
          throw e;
        } finally {
          c.release();
        }
      },
      close: () => pool.end(),
    };
  }
  await migrate(db);
  return db;
}

// Applies saas/migrations/NNN_name.sql files that have not run yet, in order, each in its own transaction.
// Never edit a migration that has run in production: add a new numbered file instead.
async function migrate(db) {
  await db.exec('CREATE TABLE IF NOT EXISTS schema_migrations (version TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())');
  const done = new Set((await db.query('SELECT version FROM schema_migrations')).map(r => r.version));
  const files = (await readdir(MIGRATIONS)).filter(f => /^\d+_.+\.sql$/.test(f)).sort();
  for (const f of files) {
    if (done.has(f)) continue;
    const sql = await readFile(path.join(MIGRATIONS, f), 'utf8');
    await db.tx(async t => {
      // exec-style multi-statement SQL is not allowed inside a parameterised query, so run statements one by one
      for (const stmt of sql.split(/;\s*(?:\r?\n|$)/).map(s => s.replace(/^\s*--.*$/gm, '').trim()).filter(Boolean)) await t.query(stmt);
      await t.query('INSERT INTO schema_migrations (version) VALUES ($1)', [f]);
    });
    console.log(`[db] applied migration ${f}`);
  }
}
