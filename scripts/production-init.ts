import { randomBytes, scryptSync } from "node:crypto";
import { db, branchesTable, shopsTable, usersTable } from "@workspace/db";
import { asc, eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import path from "node:path";

const username = process.env.BOOTSTRAP_ADMIN_USERNAME?.trim();
const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");
if (!username) throw new Error("BOOTSTRAP_ADMIN_USERNAME is required.");
if (!password || password.length < 12 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
  throw new Error("BOOTSTRAP_ADMIN_PASSWORD must be at least 12 characters and include upper, lower, number, and symbol.");
}

await migrate(db, { migrationsFolder: path.resolve(process.cwd(), "../lib/db/drizzle") });
await db.insert(shopsTable).values([
  { id: "shop-1", name: "Shop 1", active: true },
  { id: "shop-2", name: "Shop 2", active: true },
]).onConflictDoNothing();
const [existingAdmin] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.role, "Admin")).limit(1);
if (existingAdmin) {
  console.info("Production initialization complete. Existing administrator preserved.");
  process.exit(0);
}

const [branch] = await db.select({ id: branchesTable.id }).from(branchesTable).where(eq(branchesTable.shopId, "shop-1")).orderBy(asc(branchesTable.id)).limit(1);
const salt = randomBytes(16).toString("hex");
await db.insert(usersTable).values({
  id: `user-admin-${Date.now()}`,
  shopId: "shop-1",
  username,
  email: null,
  passwordSalt: salt,
  passwordHash: scryptSync(password, salt, 64).toString("hex"),
  role: "Admin",
  status: "Active",
  branchId: branch?.id ?? null,
  registerId: null,
});
console.info(`Production initialization complete. Administrator '${username}' created; no business demo data was inserted.`);
