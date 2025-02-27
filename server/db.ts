import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

console.log("Initializing database connection...");

let pool: Pool;
let db: ReturnType<typeof drizzle>;

try {
  pool = new Pool({ connectionString: process.env.DATABASE_URL });

  // Test the connection
  pool.connect().then(() => {
    console.log("Successfully connected to PostgreSQL database");
  }).catch(err => {
    console.error("Failed to connect to database:", err);
  });

  db = drizzle({ client: pool, schema });
} catch (error) {
  console.error("Error initializing database:", error);
  throw error;
}

export { pool, db };