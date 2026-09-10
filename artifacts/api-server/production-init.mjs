import 'dotenv/config';
import { randomBytes, scryptSync } from "node:crypto";
import pg from "pg";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { drizzle } from "drizzle-orm/node-postgres";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const username = process.env.BOOTSTRAP_ADMIN_USERNAME?.trim();
const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required.");
}
if (!username) {
  throw new Error("BOOTSTRAP_ADMIN_USERNAME is required.");
}
if (!password || password.length < 12 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
  throw new Error("BOOTSTRAP_ADMIN_PASSWORD must be at least 12 characters and include upper, lower, number, and symbol.");
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

// Run migrations first
const db = drizzle(pool);
const migrationsFolder = path.resolve(__dirname, "migrations");
await migrate(db, { migrationsFolder });

// Use raw SQL for initialization since schema is bundled
const client = await pool.connect();

try {
  // Check if admin already exists
  const adminCheck = await client.query('SELECT id FROM pajoy_users WHERE role = $1 LIMIT 1', ['Admin']);
  if (adminCheck.rows.length > 0) {
    console.info("Production initialization complete. Existing administrator preserved.");
  } else {
    // Insert shops if they don't exist
    await client.query(`
      INSERT INTO pajoy_shops (id, name, active) 
      VALUES ('shop-1', 'Shop 1', true), ('shop-2', 'Shop 2', true)
      ON CONFLICT (id) DO NOTHING
    `);

    // Get a branch for shop-1
    const branchResult = await client.query(
      'SELECT id FROM pajoy_branches WHERE shop_id = $1 ORDER BY id LIMIT 1',
      ['shop-1']
    );
    const branchId = branchResult.rows[0]?.id || null;

    // Create admin user
    const salt = randomBytes(16).toString("hex");
    const passwordHash = scryptSync(password, salt, 64).toString("hex");
    const adminId = `user-admin-${Date.now()}`;

    await client.query(`
      INSERT INTO pajoy_users (id, shop_id, username, email, password_hash, password_salt, role, status, branch_id, register_id)
      VALUES ($1, $2, $3, NULL, $4, $5, $6, $7, $8, NULL)
    `, [adminId, 'shop-1', username, passwordHash, salt, 'Admin', 'Active', branchId]);

    console.info(`Production initialization complete. Administrator '${username}' created; no business demo data was inserted.`);
  }
} finally {
  client.release();
  await pool.end();
}
