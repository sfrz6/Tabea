import { Pool as NeonPool, neonConfig } from "@neondatabase/serverless";
import { drizzle as drizzleNeon, type NeonDatabase } from "drizzle-orm/neon-serverless";
import { Pool as NodePool } from "pg";
import { drizzle as drizzleNode } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

/**
 * Tabea runs on Neon in production and on whatever Postgres a developer has to
 * hand locally. The two drivers expose the same Drizzle surface, so the driver
 * is chosen here, once, and nothing else in the application knows which is in
 * use.
 *
 * The Neon driver speaks to Neon's WebSocket endpoint and cannot talk to a
 * plain Postgres server, which is why the choice is made from the host rather
 * than being a preference.
 */

export type Database = NeonDatabase<typeof schema>;

export type DatabaseHandle = {
  db: Database;
  /** Closes the pool. Scripts call this; the application leaves it open. */
  close: () => Promise<void>;
  driver: "neon" | "postgres";
};

/** True for a Neon connection string, including its pooled form. */
export function isNeonUrl(url: string): boolean {
  try {
    return new URL(url).hostname.endsWith(".neon.tech");
  } catch {
    return false;
  }
}

// Node 22 and newer expose a global WebSocket, so the Neon driver needs no
// polyfill on Vercel or in local development.
if (typeof globalThis.WebSocket !== "undefined") {
  neonConfig.webSocketConstructor = globalThis.WebSocket;
}

export function createDatabase(url: string): DatabaseHandle {
  if (isNeonUrl(url)) {
    // WebSockets rather than HTTP, because Tabea relies on transactions: a task
    // change, its history and its notifications must land together or not at all.
    const pool = new NeonPool({ connectionString: url });
    return {
      db: drizzleNeon(pool, { schema, casing: "snake_case" }),
      close: () => pool.end(),
      driver: "neon",
    };
  }

  const pool = new NodePool({
    connectionString: url,
    // A local container needs no TLS; a managed Postgres elsewhere will carry
    // sslmode in its connection string.
    ssl: url.includes("sslmode=require") ? { rejectUnauthorized: false } : false,
  });

  return {
    // Both drivers build the same PgDatabase underneath and the application only
    // uses the shared query surface, so one declared type serves both.
    db: drizzleNode(pool, { schema, casing: "snake_case" }) as unknown as Database,
    close: () => pool.end(),
    driver: "postgres",
  };
}

export { schema };
