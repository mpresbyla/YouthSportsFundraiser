import { drizzle } from "drizzle-orm/mysql2";
import "dotenv/config";

const db = drizzle(process.env.DATABASE_URL);

async function resetDatabase() {
  console.log("Dropping all existing tables...");
  
  const tables = [
    "auditLogs",
    "charges",
    "fundraisers",
    "leagues",
    "notifications",
    "pledges",
    "statsEntries",
    "teams",
    "userRoles",
    "users",
    "__drizzle_migrations"
  ];
  
  for (const table of tables) {
    try {
      await db.execute(`DROP TABLE IF EXISTS \`${table}\``);
      console.log(`✓ Dropped table: ${table}`);
    } catch (error) {
      console.log(`✗ Failed to drop ${table}:`, error.message);
    }
  }
  
  console.log("\nDatabase reset complete. Run 'pnpm db:push' to create fresh tables.");
  process.exit(0);
}

resetDatabase().catch((error) => {
  console.error("Reset failed:", error);
  process.exit(1);
});
