import { serverEnv } from "@/lib/env";
import { createDatabase, type Database } from "./driver";
import * as schema from "./schema";

export type { Database } from "./driver";

/** A transaction handle, as handed to the callback of db.transaction. */
export type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

/**
 * Anything that can run a statement. Services accept this so the same code
 * works inside a transaction and outside one.
 */
export type DbExecutor = Database | Transaction;

type GlobalWithDb = typeof globalThis & {
  __tabeaDb?: Database;
};

const globalRef = globalThis as GlobalWithDb;

function getDatabase(): Database {
  if (!globalRef.__tabeaDb) {
    // Cached on the global so the pool survives a hot reload in development and
    // is reused across invocations on a warm serverless instance.
    globalRef.__tabeaDb = createDatabase(serverEnv().DATABASE_URL).db;
  }
  return globalRef.__tabeaDb;
}

/**
 * The connection is opened on first use rather than on import. A production
 * build therefore compiles without a database, and a page that never queries
 * never opens a connection, which matters on a serverless platform where every
 * cold start pays for one.
 */
export const db: Database = new Proxy({} as Database, {
  get(_target, property, receiver) {
    const instance = getDatabase();
    const value = Reflect.get(instance as object, property, receiver);
    return typeof value === "function" ? value.bind(instance) : value;
  },
  has(_target, property) {
    return Reflect.has(getDatabase() as object, property);
  },
});

export { schema };
