/**
 * Applies pending migrations.
 *
 * Vercel builds do not run migrations automatically, on purpose: a schema
 * change should be a deliberate step rather than a side effect of a deployment.
 * Run it against the target database before promoting a release:
 *
 *   npm run db:migrate
 */
import { config } from "dotenv";
import { migrate as migrateNeon } from "drizzle-orm/neon-serverless/migrator";
import { migrate as migrateNode } from "drizzle-orm/node-postgres/migrator";
import { createDatabase } from "./driver";

config({ path: ".env.local", quiet: true });
config({ path: ".env", quiet: true });

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env.local and add your connection string.",
    );
  }

  const { db, close, driver } = createDatabase(url);

  console.log(`applying migrations using the ${driver} driver`);

  // Each driver ships its own migrator, so the right one is selected alongside
  // the connection.
  if (driver === "neon") {
    await migrateNeon(db, { migrationsFolder: "./drizzle" });
  } else {
    await migrateNode(db as never, { migrationsFolder: "./drizzle" });
  }

  console.log("migrations applied");

  await close();
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
