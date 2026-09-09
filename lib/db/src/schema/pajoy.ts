import { createInsertSchema } from "drizzle-zod";
import { boolean, date, foreignKey, integer, jsonb, numeric, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const shopsTable = pgTable("pajoy_shops", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  active: boolean("active").notNull().default(true),
});

export const branchesTable = pgTable("pajoy_branches", {
  id: text("id").primaryKey(),
  shopId: text("shop_id"),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  location: text("location").notNull(),
  manager: text("manager").notNull(),
  phone: text("phone").notNull(),
  inventoryValue: numeric("inventory_value", { precision: 12, scale: 2 }).notNull().default("0"),
  salesToday: numeric("sales_today", { precision: 12, scale: 2 }).notNull().default("0"),
}, (table) => ({ shopFk: foreignKey({ columns: [table.shopId], foreignColumns: [shopsTable.id] }) }));

export const productsTable = pgTable("pajoy_products", {
  id: text("id").primaryKey(),
  shopId: text("shop_id"),
  sku: text("sku").notNull().unique(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  garmentType: text("garment_type"),
  pattern: text("pattern"),
  checkColors: text("check_colors").array(),
  collarStyle: text("collar_style"),
  sleeveStyle: text("sleeve_style"),
  unit: text("unit").notNull(),
  sizes: text("sizes").array(),
  colors: text("colors").array(),
  school: text("school"),
  schoolLogo: text("school_logo"),
  badgeName: text("badge_name"),
  badgeSchool: text("badge_school"),
  badgeStock: integer("badge_stock").notNull().default(0),
  badgePrice: numeric("badge_price", { precision: 12, scale: 2 }).notNull().default("0"),
  costPrice: numeric("cost_price", { precision: 12, scale: 2 }).notNull(),
  retailPrice: numeric("retail_price", { precision: 12, scale: 2 }).notNull(),
  wholesalePrice: numeric("wholesale_price", { precision: 12, scale: 2 }).notNull(),
  status: text("status").notNull().default("Active"),
}, (table) => ({ shopFk: foreignKey({ columns: [table.shopId], foreignColumns: [shopsTable.id] }) }));

export const inventoryTable = pgTable("pajoy_inventory", {
  id: text("id").primaryKey(),
  shopId: text("shop_id"),
  productId: text("product_id").notNull(),
  branchId: text("branch_id").notNull(),
  onHand: integer("on_hand").notNull().default(0),
  reserved: integer("reserved").notNull().default(0),
  reorderPoint: integer("reorder_point").notNull().default(10),
}, (table) => ({ shopFk: foreignKey({ columns: [table.shopId], foreignColumns: [shopsTable.id] }) }));

export const customersTable = pgTable("pajoy_customers", {
  id: text("id").primaryKey(),
  shopId: text("shop_id"),
  name: text("name").notNull(),
  type: text("type").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  school: text("school"),
  uniformProductIds: text("uniform_product_ids").array(),
  balance: numeric("balance", { precision: 12, scale: 2 }).notNull().default("0"),
  creditLimit: numeric("credit_limit", { precision: 12, scale: 2 }).notNull().default("0"),
  status: text("status").notNull().default("Active"),
}, (table) => ({ shopFk: foreignKey({ columns: [table.shopId], foreignColumns: [shopsTable.id] }) }));

export const ordersTable = pgTable("pajoy_orders", {
  id: text("id").primaryKey(),
  shopId: text("shop_id"),
  orderNumber: text("order_number").notNull().unique(),
  idempotencyKey: text("idempotency_key").unique(),
  customerName: text("customer_name").notNull(),
  customerType: text("customer_type").notNull(),
  type: text("type").notNull(),
  status: text("status").notNull().default("Pending"),
  total: numeric("total", { precision: 12, scale: 2 }).notNull(),
  paid: numeric("paid", { precision: 12, scale: 2 }).notNull().default("0"),
  balance: numeric("balance", { precision: 12, scale: 2 }).notNull(),
  dueDate: date("due_date", { mode: "string" }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  branchId: text("branch_id").notNull(),
  itemSummary: text("item_summary"),
  embroidery: boolean("embroidery").notNull().default(false),
  createdByUserId: text("created_by_user_id"),
}, (table) => ({ shopFk: foreignKey({ columns: [table.shopId], foreignColumns: [shopsTable.id] }) }));

export const paymentsTable = pgTable("pajoy_payments", {
  id: text("id").primaryKey(),
  shopId: text("shop_id"),
  receiptNumber: text("receipt_number").notNull().unique(),
  customerName: text("customer_name").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  method: text("method").notNull(),
  receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
  orderNumber: text("order_number"),
  createdByUserId: text("created_by_user_id"),
}, (table) => ({ shopFk: foreignKey({ columns: [table.shopId], foreignColumns: [shopsTable.id] }) }));

export const dtfJobsTable = pgTable("pajoy_dtf_jobs", {
  id: text("id").primaryKey(),
  shopId: text("shop_id"),
  jobNumber: text("job_number").notNull().unique(),
  customerName: text("customer_name").notNull(),
  orderNumber: text("order_number"),
  artworkName: text("artwork_name").notNull(),
  garmentDescription: text("garment_description").notNull(),
  quantity: integer("quantity").notNull(),
  size: text("size"),
  status: text("status").notNull().default("Queued"),
  price: numeric("price", { precision: 12, scale: 2 }).notNull().default("0"),
  createdByUserId: text("created_by_user_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({ shopFk: foreignKey({ columns: [table.shopId], foreignColumns: [shopsTable.id] }) }));

export const documentSequencesTable = pgTable("pajoy_document_sequences", {
  key: text("key").primaryKey(),
  shopId: text("shop_id"),
  nextNumber: integer("next_number").notNull().default(1),
}, (table) => ({ shopFk: foreignKey({ columns: [table.shopId], foreignColumns: [shopsTable.id] }) }));

export const usersTable = pgTable("pajoy_users", {
  id: text("id").primaryKey(),
  shopId: text("shop_id"),
  username: text("username").notNull().unique(),
  email: text("email").unique(),
  passwordHash: text("password_hash").notNull(),
  passwordSalt: text("password_salt").notNull(),
  role: text("role").notNull(),
  status: text("status").notNull().default("Active"),
  branchId: text("branch_id"),
  registerId: text("register_id"),
}, (table) => ({ shopFk: foreignKey({ columns: [table.shopId], foreignColumns: [shopsTable.id] }) }));

export const sessionsTable = pgTable("pajoy_sessions", {
  tokenHash: text("token_hash").primaryKey(),
  userId: text("user_id").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const activityTable = pgTable("pajoy_activity", {
  id: text("id").primaryKey(),
  shopId: text("shop_id"),
  type: text("type").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  time: text("time").notNull(),
  actor: text("actor").notNull(),
}, (table) => ({ shopFk: foreignKey({ columns: [table.shopId], foreignColumns: [shopsTable.id] }) }));

export const auditEventsTable = pgTable("pajoy_audit_events", {
  id: text("id").primaryKey(),
  shopId: text("shop_id"),
  actorUserId: text("actor_user_id"),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id"),
  requestId: text("request_id"),
  before: jsonb("before"),
  after: jsonb("after"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({ shopFk: foreignKey({ columns: [table.shopId], foreignColumns: [shopsTable.id] }) }));

export const insertBranchSchema = createInsertSchema(branchesTable);
export const insertShopSchema = createInsertSchema(shopsTable);
export const insertProductSchema = createInsertSchema(productsTable);
export const insertInventorySchema = createInsertSchema(inventoryTable);
export const insertCustomerSchema = createInsertSchema(customersTable);
export const insertOrderSchema = createInsertSchema(ordersTable);
export const insertPaymentSchema = createInsertSchema(paymentsTable);
export const insertActivitySchema = createInsertSchema(activityTable);

export type Branch = typeof branchesTable.$inferSelect;
export type Shop = typeof shopsTable.$inferSelect;
export type Product = typeof productsTable.$inferSelect;
export type Inventory = typeof inventoryTable.$inferSelect;
export type Customer = typeof customersTable.$inferSelect;
export type Order = typeof ordersTable.$inferSelect;
export type Payment = typeof paymentsTable.$inferSelect;
export type DocumentSequence = typeof documentSequencesTable.$inferSelect;
export type User = typeof usersTable.$inferSelect;
export type Session = typeof sessionsTable.$inferSelect;
export type DtfJob = typeof dtfJobsTable.$inferSelect;
export type Activity = typeof activityTable.$inferSelect;
export type AuditEvent = typeof auditEventsTable.$inferSelect;

export const pajoyEntityId = z.string().min(1);