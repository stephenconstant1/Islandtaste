import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
export interface SqlDatabase {
  query<T = any>(sql: string, parameters?: any[]): Promise<{ rows: T[] }>;
  exec(sql: string): Promise<unknown>;
  transaction<T>(operation: (tx: SqlDatabase) => Promise<T>): Promise<T>;
  lock(key: string): Promise<void>;
  close(): Promise<void>;
}
export async function connectDatabase(): Promise<SqlDatabase> {
  const connection =
    process.env.DATABASE_URL || process.env.NETLIFY_DATABASE_URL;
  if (connection) {
    const { Pool } = await import("pg");
    const url = new URL(connection);
    if (!["postgres:", "postgresql:"].includes(url.protocol))
      throw Error("A PostgreSQL connection URL is required.");
    // Preserve certificate verification even when a provider URL includes sslmode=require.
    for (const key of ["sslmode", "sslcert", "sslkey", "sslrootcert"])
      url.searchParams.delete(key);
    const pool = new Pool({
      connectionString: url.toString(),
      ssl: { rejectUnauthorized: true },
      max: 2,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 10000,
    });
    const wrap = (client: any): SqlDatabase => ({
      query: (sql, values) => client.query(sql, values),
      exec: (sql) => client.query(sql),
      lock: async (key) => {
        await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [key]);
      },
      transaction: async (operation) => {
        const c = await pool.connect();
        try {
          await c.query("BEGIN");
          const result = await operation(wrap(c));
          await c.query("COMMIT");
          return result;
        } catch (e) {
          await c.query("ROLLBACK");
          throw e;
        } finally {
          c.release();
        }
      },
      close: () => pool.end(),
    });
    return wrap(pool);
  }
  if (
    process.env.NETLIFY === "true" ||
    process.env.DATABASE_REQUIRED === "true" ||
    Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME)
  )
    throw Error(
      "Configure DATABASE_URL or NETLIFY_DATABASE_URL in Netlify before deploying. Local database fallback is disabled on hosted deployments.",
    );
  const { PGlite } = await import("@electric-sql/pglite");
  const directory = resolve(process.env.DATA_DIR || ".data");
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  const d = new PGlite(directory);
  await d.waitReady;
  const wrap = (client: any): SqlDatabase => ({
    query: (sql, values) => client.query(sql, values),
    exec: (sql) => client.exec(sql),
    lock: async () => {},
    transaction: (operation) => d.transaction((tx) => operation(wrap(tx))),
    close: () => d.close(),
  });
  return wrap(d);
}
