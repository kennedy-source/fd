import { Router, type IRouter } from "express";
import { and, asc, desc, eq, ilike, or, sql } from "drizzle-orm";
import {
  Activity,
  Branch,
  Customer,
  Inventory,
  Order,
  Payment,
  Product,
  db,
  activityTable,
  branchesTable,
  customersTable,
  documentSequencesTable,
  inventoryTable,
  ordersTable,
  paymentsTable,
  productsTable,
  shopsTable,
  dtfJobsTable,
  auditEventsTable,
  categoriesTable,
  sizesTable,
  colorsTable,
  categorySizesTable,
  productVariantsTable,
  orderItemsTable,
  inventoryMovementsTable,
  schoolProductsTable,
} from "@workspace/db";
import {
  CreateCustomerBody,
  CreateCustomerResponse,
  CreateOrderBody,
  CreateOrderResponse,
  CreatePaymentBody,
  CreatePaymentResponse,
  CreateProductBody,
  CreateProductResponse,
  GetDashboardResponse,
  ListActivityResponse,
  ListBranchesResponse,
  ListCustomersQueryParams,
  ListCustomersResponse,
  ListInventoryQueryParams,
  ListInventoryResponse,
  ListOrdersQueryParams,
  ListOrdersResponse,
  ListProductsQueryParams,
  ListProductsResponse,
} from "@workspace/api-zod";
import type { AuthRequest } from "./auth";

const router: IRouter = Router();

function generatedSku(name: string, category: string) {
  const slug = `${category}-${name}`.toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 28);
  const suffix = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`.toUpperCase();
  return `PAJ-${slug || "PRODUCT"}-${suffix}`;
}

const activitySeed = [
  {
    id: "activity-1",
    type: "order",
    title: "School order created",
    description: "ABC Academy · SO-2026-0148 · KSh 350,000",
    time: "8 min ago",
    actor: "M. Wanjiku",
  },
  {
    id: "activity-2",
    type: "payment",
    title: "Deposit received",
    description: "ABC Academy · KSh 150,000 via M-Pesa",
    time: "21 min ago",
    actor: "J. Kamau",
  },
  {
    id: "activity-3",
    type: "stock",
    title: "Stock transfer completed",
    description: "CBD Flagship → Eastleigh · 48 line items",
    time: "46 min ago",
    actor: "D. Otieno",
  },
  {
    id: "activity-4",
    type: "alert",
    title: "Low stock alert",
    description: "ABC School Sweater · Size 30 · 8 available",
    time: "1 hr ago",
    actor: "System",
  },
] as const;

const money = (value: string | number | null | undefined) => Number(value ?? 0);
const id = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const isoDate = (value: Date | string) => value instanceof Date ? value.toISOString() : value;
async function audit(req: AuthRequest, action: string, entityType: string, entityId: string | undefined, shopId: string | null | undefined, before?: unknown, after?: unknown) {
  await db.insert(auditEventsTable).values({ id: id("audit"), shopId: shopId ?? null, actorUserId: req.user?.id ?? null, action, entityType, entityId: entityId ?? null, requestId: String(req.id), before: before ?? null, after: after ?? null });
}

async function nextDocumentNumber(tx: any, prefix: string) {
  const year = new Date().getFullYear();
  const key = `${prefix}-${year}`;
  const result = await tx.execute(sql`
    INSERT INTO pajoy_document_sequences (key, next_number)
    VALUES (${key}, 2)
    ON CONFLICT (key)
    DO UPDATE SET next_number = pajoy_document_sequences.next_number + 1
    RETURNING next_number - 1 AS number
  `);
  const number = Number(result.rows[0]?.number ?? 1);
  return `${prefix}-${year}-${String(number).padStart(6, "0")}`;
}

function branchName(branchId: string) {
  return branches.find((branch) => branch.id === branchId)?.name ?? "CBD Flagship";
}

async function requireActiveShop(shopId: unknown) {
  if (typeof shopId !== "string" || !shopId.trim()) throw new Error("A shop must be selected.");
  const [shop] = await db.select().from(shopsTable).where(eq(shopsTable.id, shopId)).limit(1);
  if (!shop || !shop.active) throw new Error("Selected shop does not exist or is inactive.");
  return shop;
}

async function requireAuthorizedShop(req: AuthRequest, shopId: unknown) {
  const shop = await requireActiveShop(shopId);
  const role = req.user?.role.toLowerCase();
  if (role !== "admin" && req.user?.shopId !== shop.id) throw new Error("You are not authorized to access this shop.");
  return shop;
}

async function requireShopBranch(shopId: string, branchId: string) {
  const [branch] = await db.select().from(branchesTable).where(and(eq(branchesTable.id, branchId), eq(branchesTable.shopId, shopId))).limit(1);
  if (!branch) throw new Error("Selected branch does not belong to the selected shop.");
  return branch;
}

function toBranch(row: Branch) {
  return {
    id: row.id,
    shopId: row.shopId ?? undefined,
    code: row.code,
    name: row.name,
    location: row.location,
    manager: row.manager,
    phone: row.phone,
    inventoryValue: money(row.inventoryValue),
    salesToday: money(row.salesToday),
  };
}

function toProduct(row: Product, branchStock: Array<{ branchId: string; branchName: string; onHand: number; reserved: number; available: number }> = []) {
  return {
    id: row.id,
    sku: row.sku,
    name: row.name,
    category: row.category,
    garmentType: row.garmentType ?? undefined,
    pattern: row.pattern ?? undefined,
    checkColors: row.checkColors ?? undefined,
    collarStyle: row.collarStyle ?? undefined,
    sleeveStyle: row.sleeveStyle ?? undefined,
    unit: row.unit,
    sizes: row.sizes ?? [],
    colors: row.colors ?? [],
    school: row.school ?? undefined,
    schoolLogo: row.schoolLogo ?? undefined,
    badgeName: row.badgeName ?? undefined,
    badgeSchool: row.badgeSchool ?? undefined,
    badgeStock: row.badgeStock,
    badgePrice: money(row.badgePrice),
    costPrice: money(row.costPrice),
    retailPrice: money(row.retailPrice),
    wholesalePrice: money(row.wholesalePrice),
    status: row.status,
    branchStock,
  };
}

async function seedPajoyData() {
  await db.insert(shopsTable).values({ id: "shop-1", name: "Shop 1", active: true }).onConflictDoNothing();
  await db.insert(shopsTable).values({ id: "shop-2", name: "Shop 2", active: true }).onConflictDoNothing();
  await db.update(branchesTable).set({ shopId: "shop-1" }).where(eq(branchesTable.id, "branch-1"));
  await db.update(branchesTable).set({ shopId: "shop-2" }).where(eq(branchesTable.id, "branch-2"));
  await db.update(productsTable).set({ shopId: "shop-1" }).where(sql`${productsTable.shopId} IS NULL`);
  await db.update(inventoryTable).set({ shopId: "shop-1" }).where(sql`${inventoryTable.shopId} IS NULL`);
  await db.update(customersTable).set({ shopId: "shop-1" }).where(sql`${customersTable.shopId} IS NULL`);
  await db.update(ordersTable).set({ shopId: "shop-1" }).where(sql`${ordersTable.shopId} IS NULL`);
  await db.update(paymentsTable).set({ shopId: "shop-1" }).where(sql`${paymentsTable.shopId} IS NULL`);
  await db.update(dtfJobsTable).set({ shopId: "shop-1" }).where(sql`${dtfJobsTable.shopId} IS NULL`);
  await db.update(activityTable).set({ shopId: "shop-1" }).where(sql`${activityTable.shopId} IS NULL`);
  const existing = await db.select({ id: branchesTable.id }).from(branchesTable).limit(1);
  if (existing.length > 0) return;

  await db.insert(branchesTable).values(branches.map((branch) => ({ ...branch, shopId: branch.id === "branch-2" ? "shop-2" : "shop-1" })));
  await db.insert(productsTable).values(products.map((product) => ({ ...product, shopId: "shop-1", sizes: [...product.sizes], colors: [...product.colors] })));
  await db.insert(inventoryTable).values([
    { id: "inventory-1", shopId: "shop-1", productId: "product-sweater", branchId: "branch-1", onHand: 86, reserved: 18, reorderPoint: 20 },
    { id: "inventory-2", shopId: "shop-2", productId: "product-sweater", branchId: "branch-2", onHand: 34, reserved: 8, reorderPoint: 15 },
    { id: "inventory-3", shopId: "shop-1", productId: "product-dress", branchId: "branch-1", onHand: 54, reserved: 12, reorderPoint: 15 },
    { id: "inventory-4", shopId: "shop-2", productId: "product-dress", branchId: "branch-2", onHand: 28, reserved: 0, reorderPoint: 12 },
    { id: "inventory-5", shopId: "shop-1", productId: "product-shirt", branchId: "branch-1", onHand: 142, reserved: 35, reorderPoint: 30 },
    { id: "inventory-6", shopId: "shop-2", productId: "product-shirt", branchId: "branch-2", onHand: 76, reserved: 20, reorderPoint: 25 },
    { id: "inventory-7", shopId: "shop-1", productId: "product-trouser", branchId: "branch-1", onHand: 48, reserved: 20, reorderPoint: 15 },
    { id: "inventory-8", shopId: "shop-2", productId: "product-trouser", branchId: "branch-2", onHand: 19, reserved: 0, reorderPoint: 12 },
    { id: "inventory-9", shopId: "shop-1", productId: "product-belt", branchId: "branch-1", onHand: 11, reserved: 0, reorderPoint: 15 },
  ]);
  await db.insert(customersTable).values([
    { id: "customer-abc", name: "ABC Academy", type: "School", phone: "+254 701 223 990", email: "procurement@abcacademy.ke", school: "ABC Academy", balance: "200000", creditLimit: "500000", status: "On account" },
    { id: "customer-milimani", name: "Milimani Bookshop", type: "Wholesale", phone: "+254 733 881 402", email: "orders@milimanibookshop.co.ke", school: null, balance: "68000", creditLimit: "150000", status: "On account" },
    { id: "customer-grace", name: "Grace Njeri", type: "Retail", phone: "+254 712 556 801", email: null, school: null, balance: "0", creditLimit: "0", status: "Clear" },
    { id: "customer-st-peters", name: "St. Peter's Primary", type: "School", phone: "+254 720 410 209", email: "admin@stpeters.ac.ke", school: "St. Peter's Primary", balance: "0", creditLimit: "300000", status: "Clear" },
  ]);
  await db.insert(ordersTable).values([
    { id: "order-148", shopId: "shop-1", orderNumber: "SO-2026-0148", customerName: "ABC Academy", customerType: "School", type: "School order", status: "In production", total: "350000", paid: "150000", balance: "200000", dueDate: "2026-09-18", branchId: "branch-1", itemSummary: "100 sweaters · 100 dresses · 120 shirts · 80 trousers", embroidery: true },
    { id: "order-147", shopId: "shop-2", orderNumber: "WO-2026-0147", customerName: "Milimani Bookshop", customerType: "Wholesale", type: "Wholesale", status: "Ready for pickup", total: "124500", paid: "56500", balance: "68000", dueDate: "2026-09-10", branchId: "branch-2", itemSummary: "Assorted school uniforms · 76 pieces", embroidery: false },
    { id: "order-146", shopId: "shop-1", orderNumber: "SO-2026-0146", customerName: "St. Peter's Primary", customerType: "School", type: "School order", status: "Reserved", total: "218000", paid: "218000", balance: "0", dueDate: "2026-09-06", branchId: "branch-1", itemSummary: "Term 3 replenishment · 112 pieces", embroidery: true },
    { id: "order-145", shopId: "shop-1", orderNumber: "RO-2026-0145", customerName: "Grace Njeri", customerType: "Retail", type: "Retail", status: "Completed", total: "4850", paid: "4850", balance: "0", dueDate: "2026-09-03", branchId: "branch-1", itemSummary: "Sweater · Shirt · Belt", embroidery: false },
  ]);
  await db.insert(paymentsTable).values([
    { id: "payment-1", shopId: "shop-1", receiptNumber: "RCT-00881", customerName: "ABC Academy", amount: "150000", method: "M-Pesa", orderNumber: "SO-2026-0148" },
    { id: "payment-2", shopId: "shop-1", receiptNumber: "RCT-00880", customerName: "St. Peter's Primary", amount: "218000", method: "Bank transfer", orderNumber: "SO-2026-0146" },
    { id: "payment-3", shopId: "shop-1", receiptNumber: "RCT-00879", customerName: "Grace Njeri", amount: "4850", method: "Cash", orderNumber: "RO-2026-0145" },
  ]);
  await db.insert(activityTable).values([...activitySeed]);
}

export { seedPajoyData };

router.get("/dashboard", async (req, res, next) => {
  try {
    const auth = req as AuthRequest;
    const shopId = typeof req.query.shopId === "string" ? req.query.shopId : undefined;
    if (shopId) await requireAuthorizedShop(auth, shopId);
    const [branchRows, orderRows, inventoryRows, activityRows] = await Promise.all([
      db.select().from(branchesTable).where(shopId ? eq(branchesTable.shopId, shopId) : undefined),
      db.select().from(ordersTable).where(shopId ? eq(ordersTable.shopId, shopId) : undefined),
      db.select().from(inventoryTable).where(shopId ? eq(inventoryTable.shopId, shopId) : undefined),
      db.select().from(activityTable).where(shopId ? eq(activityTable.shopId, shopId) : undefined).orderBy(desc(activityTable.id)).limit(8),
    ]);
    const salesToday = branchRows.reduce((sum, branch) => sum + money(branch.salesToday), 0);
    const outstandingCredit = orderRows.reduce((sum, order) => sum + money(order.balance), 0);
    const lowStock = inventoryRows.filter((item) => item.onHand - item.reserved <= item.reorderPoint).length;
    const pendingOrders = orderRows.filter((order) => order.status !== "Completed").length;
    const pendingEmbroidery = orderRows.filter((order) => order.embroidery && order.status !== "Completed").length;
    const reservedStock = inventoryRows.reduce((sum, item) => sum + item.reserved, 0);
    const retailSales = orderRows.filter((order) => order.type.toLowerCase() === "retail" || order.type.toLowerCase() === "pos sale").reduce((sum, order) => sum + money(order.total), 0);
    const wholesaleSales = orderRows.filter((order) => order.type.toLowerCase() === "wholesale").reduce((sum, order) => sum + money(order.total), 0);
    const data = {
      salesToday,
      salesChange: 0,
      retailSales,
      wholesaleSales,
      outstandingCredit,
      overdueAccounts: 0,
      pendingOrders,
      pendingEmbroidery,
      lowStock,
      reservedStock,
      topProducts: [],
      branchPerformance: branchRows.map((branch) => ({
        branch: branch.name,
        sales: money(branch.salesToday),
        target: 0,
        percentage: 0,
      })),
    };
    res.json(GetDashboardResponse.parse(data));
  } catch (error) {
    next(error);
  }
});

router.get("/shops", async (_req, res, next) => {
  try {
    const auth = _req as AuthRequest;
    const rows = await db.select().from(shopsTable).where(auth.user?.role.toLowerCase() === "admin" ? undefined : eq(shopsTable.id, auth.user?.shopId ?? "")).orderBy(asc(shopsTable.name));
    res.json(rows);
  } catch (error) { return next(error); }
});

router.post("/admin/reset-business", async (req, res, next) => {
  try {
    const auth = req as AuthRequest;
    if (auth.user?.role.toLowerCase() !== "admin") return res.status(403).json({ error: "Administrator access required." });
    if (req.body?.confirmation !== "RESET_PAJOY_BUSINESS") return res.status(400).json({ error: "Explicit reset confirmation is required." });
    await db.transaction(async (tx) => {
      await tx.delete(activityTable);
      await tx.delete(paymentsTable);
      await tx.delete(ordersTable);
      await tx.delete(inventoryTable);
      await tx.delete(productsTable);
      await tx.delete(customersTable);
      await tx.delete(dtfJobsTable);
      await tx.delete(documentSequencesTable);
      await tx.update(branchesTable).set({ inventoryValue: "0", salesToday: "0" });
    });
    return res.json({ ok: true, message: "Business data reset. Staff, authentication, shops, and schema were preserved." });
  } catch (error) { return next(error); }
});

router.get("/branches", async (req, res, next) => {
  try {
    const auth = req as AuthRequest;
    const rows = await db.select().from(branchesTable).where(auth.user?.role.toLowerCase() === "admin" ? undefined : eq(branchesTable.shopId, auth.user?.shopId ?? "")).orderBy(asc(branchesTable.name));
    res.json(ListBranchesResponse.parse(rows.map(toBranch)));
  } catch (error) { return next(error); }
});

router.get("/products", async (req, res, next) => {
  try {
    const auth = req as AuthRequest;
    const query = ListProductsQueryParams.parse(req.query);
    const filters = [];
    if (query.search) filters.push(or(ilike(productsTable.name, `%${query.search}%`), ilike(productsTable.sku, `%${query.search}%`), ilike(productsTable.category, `%${query.search}%`), ilike(productsTable.school, `%${query.search}%`), ilike(productsTable.badgeName, `%${query.search}%`), sql`${productsTable.colors}::text ILIKE ${`%${query.search}%`}`));
    if (query.category) filters.push(eq(productsTable.category, query.category));
    if (query.shopId) { await requireAuthorizedShop(auth, query.shopId); filters.push(eq(productsTable.shopId, query.shopId)); }
    else if (auth.user?.role.toLowerCase() !== "admin") filters.push(eq(productsTable.shopId, auth.user?.shopId ?? ""));
    const [rows, inventoryRows, branchRows] = await Promise.all([
      db.select().from(productsTable).where(filters.length ? and(...filters) : undefined).orderBy(asc(productsTable.name)),
      db.select().from(inventoryTable),
      db.select().from(branchesTable),
    ]);
    const branchesById = new Map(branchRows.map((branch) => [branch.id, branch.name]));
    const stockByProduct = new Map<string, Array<{ branchId: string; branchName: string; onHand: number; reserved: number; available: number }>>();
    for (const row of inventoryRows) {
      if (row.shopId !== null && row.shopId !== undefined && row.shopId !== rows.find((product) => product.id === row.productId)?.shopId) continue;
      const stock = { branchId: row.branchId, branchName: branchesById.get(row.branchId) ?? row.branchId, onHand: row.onHand, reserved: row.reserved, available: row.onHand - row.reserved };
      stockByProduct.set(row.productId, [...(stockByProduct.get(row.productId) ?? []), stock]);
    }
    res.json(ListProductsResponse.parse(rows.map((row) => toProduct(row, stockByProduct.get(row.id) ?? []))));
  } catch (error) { return next(error); }
});

router.post("/products", async (req, res, next) => {
  try {
    const auth = req as AuthRequest;
    const body = CreateProductBody.parse(req.body);
    const shop = await requireAuthorizedShop(auth, body.shopId);
    if (body.wholesalePrice > body.retailPrice) throw new Error("Wholesale price cannot exceed retail price");
    const product = {
      id: id("product"),
      shopId: shop.id,
      sku: body.sku?.trim() || generatedSku(body.name, body.category),
      name: body.name,
      category: body.category,
      garmentType: body.garmentType ?? null,
      pattern: body.pattern ?? null,
      checkColors: body.checkColors ?? [],
      collarStyle: body.collarStyle ?? null,
      sleeveStyle: body.sleeveStyle ?? null,
      unit: body.unit,
      sizes: body.sizes ?? [],
      colors: body.colors ?? [],
      school: body.school ?? null,
      schoolLogo: body.schoolLogo ?? null,
      badgeName: body.badgeName ?? null,
      badgeSchool: body.badgeSchool ?? null,
      badgeStock: body.badgeStock ?? 0,
      badgePrice: String(body.badgePrice ?? 0),
      costPrice: String(body.costPrice),
      retailPrice: String(body.retailPrice),
      wholesalePrice: String(body.wholesalePrice),
      status: "Active",
    };
    const [created] = await db.insert(productsTable).values(product).returning();
    if ((body.initialStock ?? 0) > 0) {
      const [branch] = await db.select({ id: branchesTable.id }).from(branchesTable).where(eq(branchesTable.shopId, shop.id)).orderBy(asc(branchesTable.id)).limit(1);
      if (!branch) throw new Error("Selected shop has no active branch.");
      await db.insert(inventoryTable).values({ id: id("inventory"), productId: created.id, shopId: shop.id, branchId: branch.id, onHand: body.initialStock, reserved: 0, reorderPoint: 10 });
    }
    await db.insert(activityTable).values({ id: id("activity"), shopId: shop.id, type: "catalog", title: "Product added", description: `${created.name} · ${created.sku}`, time: "Just now", actor: "Current user" });
    await audit(auth, "product.created", "product", created.id, shop.id, undefined, created);
    res.status(201).json(CreateProductResponse.parse(toProduct(created)));
  } catch (error) { next(error); }
});

router.delete("/products/:productId", async (req, res, next) => {
  try {
    const auth = req as AuthRequest;
    if (auth.user?.role.toLowerCase() !== "admin") return res.status(403).json({ error: "Administrator access required." });
    if (req.body?.confirmation !== "DELETE_PRODUCT") return res.status(400).json({ error: "Explicit product deletion confirmation is required." });
    const [product] = await db.select({ id: productsTable.id, name: productsTable.name }).from(productsTable).where(eq(productsTable.id, req.params.productId)).limit(1);
    if (!product) return res.status(404).json({ error: "Product not found." });
    await db.transaction(async (tx) => {
      await tx.delete(inventoryTable).where(eq(inventoryTable.productId, product.id));
      await tx.update(customersTable).set({ uniformProductIds: sql`array_remove(COALESCE(${customersTable.uniformProductIds}, ARRAY[]::text[]), ${product.id})` });
      await tx.delete(productsTable).where(eq(productsTable.id, product.id));
    });
    await audit(auth, "product.deleted", "product", product.id, null, product, undefined);
    return res.json({ ok: true, message: `${product.name} and its inventory were deleted.` });
  } catch (error) { return next(error); }
});

router.get("/inventory", async (req, res, next) => {
  try {
    const auth = req as AuthRequest;
    const query = ListInventoryQueryParams.parse(req.query);
    if (query.shopId) await requireAuthorizedShop(auth, query.shopId);
    const filters = [];
    if (query.branchId) filters.push(eq(inventoryTable.branchId, query.branchId));
    if (query.shopId) filters.push(eq(inventoryTable.shopId, query.shopId));
    else if (auth.user?.role.toLowerCase() !== "admin") filters.push(eq(inventoryTable.shopId, auth.user?.shopId ?? ""));
    const [rows, productRows, branchRows] = await Promise.all([
      db.select().from(inventoryTable).where(filters.length ? and(...filters) : undefined),
      db.select().from(productsTable),
      db.select().from(branchesTable),
    ]);
    const productMap = new Map(productRows.map((product) => [product.id, product]));
    const branchMap = new Map(branchRows.map((branch) => [branch.id, branch]));
    const mapped = rows.map((row: Inventory) => {
      const product = productMap.get(row.productId);
      const branch = branchMap.get(row.branchId);
      return {
        id: row.id,
        productId: row.productId,
        shopId: row.shopId ?? undefined,
        productName: product?.name ?? "Unknown product",
        sku: product?.sku ?? "—",
        branchId: row.branchId,
        branchName: branch?.name ?? "Unknown branch",
        onHand: row.onHand,
        reserved: row.reserved,
        available: row.onHand - row.reserved,
        reorderPoint: row.reorderPoint,
        value: row.onHand * money(product?.costPrice),
      };
    }).filter((item) => !query.lowStock || item.available <= item.reorderPoint);
    res.json(ListInventoryResponse.parse(mapped));
  } catch (error) { next(error); }
});

router.delete("/inventory", async (req, res, next) => {
  try {
    const auth = req as AuthRequest;
    if (auth.user?.role.toLowerCase() !== "admin") return res.status(403).json({ error: "Administrator access required." });
    const shopId = typeof req.query.shopId === "string" ? req.query.shopId : undefined;
    const shop = await requireActiveShop(shopId);
    if (req.body?.confirmation !== "CLEAR_SHOP_INVENTORY") return res.status(400).json({ error: "Explicit inventory deletion confirmation is required." });
    const deleted = await db.delete(inventoryTable).where(eq(inventoryTable.shopId, shop.id)).returning({ id: inventoryTable.id });
    return res.json({ ok: true, deletedCount: deleted.length, message: `Deleted ${deleted.length} inventory records for the selected shop.` });
  } catch (error) { return next(error); }
});

router.post("/inventory/movements", async (req, res, next) => {
  try {
    const auth = req as AuthRequest;
    const { inventoryId, type, quantity, destination, reason } = req.body as { inventoryId: string; type: "receive" | "transfer" | "count" | "adjust"; quantity: number; destination?: string; reason?: string };
    if (!inventoryId || !type || quantity === undefined) return res.status(400).json({ error: "Missing required fields: inventoryId, type, quantity" });
    const [inventory] = await db.select().from(inventoryTable).where(eq(inventoryTable.id, inventoryId)).limit(1);
    if (!inventory) return res.status(404).json({ error: "Inventory record not found" });
    if (inventory.shopId) await requireAuthorizedShop(auth, inventory.shopId);
    const next = type === "receive" ? inventory.onHand + quantity : type === "transfer" ? inventory.onHand - quantity : quantity;
    if (next < 0) return res.status(400).json({ error: "Cannot reduce inventory below zero" });
    const movementId = id("movement");
    const movementType = type === "receive" ? "Received" : type === "count" ? "Stock Count" : type === "adjust" ? `Adjustment · ${reason}` : "Transfer Out";
    await db.transaction(async (tx) => {
      await tx.update(inventoryTable).set({ onHand: next }).where(eq(inventoryTable.id, inventoryId));
      await tx.insert(inventoryMovementsTable).values({
        id: movementId,
        inventoryId,
        type: movementType,
        reference: `${type.toUpperCase()}-${movementId.slice(-5)}`,
        quantity: next - inventory.onHand,
        balance: next,
        userId: auth.user?.id ?? null,
        createdAt: new Date().toISOString(),
      });
    });
    res.json({ ok: true, movementId, newQuantity: next });
  } catch (error) { next(error); }
});

router.get("/inventory/movements", async (req, res, next) => {
  try {
    const auth = req as AuthRequest;
    const inventoryId = req.query.inventoryId as string;
    if (!inventoryId) return res.status(400).json({ error: "inventoryId query parameter is required" });
    const [inventory] = await db.select().from(inventoryTable).where(eq(inventoryTable.id, inventoryId)).limit(1);
    if (!inventory) return res.status(404).json({ error: "Inventory record not found" });
    if (inventory.shopId) await requireAuthorizedShop(auth, inventory.shopId);
    const movements = await db.select().from(inventoryMovementsTable).where(eq(inventoryMovementsTable.inventoryId, inventoryId)).orderBy(desc(inventoryMovementsTable.createdAt));
    res.json({ movements });
  } catch (error) { next(error); }
});

router.get("/inventory/movements/all", async (req, res, next) => {
  try {
    const auth = req as AuthRequest;
    const shopId = req.query.shopId as string;
    if (shopId) await requireAuthorizedShop(auth, shopId);
    const filters = shopId ? [eq(inventoryTable.shopId, shopId)] : [];
    const inventoryIds = shopId ? (await db.select({ id: inventoryTable.id }).from(inventoryTable).where(eq(inventoryTable.shopId, shopId))).map((r) => r.id) : [];
    const movements = inventoryIds.length > 0 ? await db.select().from(inventoryMovementsTable).where(inventoryIds.length ? or(...inventoryIds.map((id) => eq(inventoryMovementsTable.inventoryId, id))) : undefined).orderBy(desc(inventoryMovementsTable.createdAt)) : [];
    res.json({ movements });
  } catch (error) { next(error); }
});

router.get("/customers", async (req, res, next) => {
  try {
    const auth = req as AuthRequest;
    const query = ListCustomersQueryParams.parse(req.query);
    const filters = [auth.user?.role.toLowerCase() === "admin" ? undefined : eq(customersTable.shopId, auth.user?.shopId ?? "")].filter(Boolean);
    if (query.search) filters.push(or(ilike(customersTable.name, `%${query.search}%`), ilike(customersTable.phone, `%${query.search}%`)));
    const filter = filters.length ? and(...filters) : undefined;
    const rows = await db.select().from(customersTable).where(filter).orderBy(asc(customersTable.name));
    const data = rows.map((row: Customer) => ({ ...row, balance: money(row.balance), creditLimit: money(row.creditLimit), uniformProductIds: row.uniformProductIds ?? [] }));
    res.json(ListCustomersResponse.parse(data));
  } catch (error) { next(error); }
});

router.post("/customers", async (req, res, next) => {
  try {
    const body = CreateCustomerBody.parse(req.body);
    const uniformProductIds = body.uniformProductIds ?? [];
    const shop = body.shopId ? await requireActiveShop(body.shopId) : null;
    if (body.type.toLowerCase() === "school" && uniformProductIds.length) {
      const assignedProducts = await db.select({ id: productsTable.id }).from(productsTable).where(and(sql`${productsTable.id} = ANY(${uniformProductIds})`, shop ? eq(productsTable.shopId, shop.id) : undefined));
      if (assignedProducts.length !== uniformProductIds.length) throw new Error("One or more selected school uniforms do not exist.");
    }
    const customer = {
      id: id("customer"),
      shopId: shop?.id ?? null,
      name: body.name,
      type: body.type,
      phone: body.phone,
      email: body.email ?? null,
      school: body.school ?? null,
      uniformProductIds,
      balance: "0",
      creditLimit: String(body.creditLimit ?? 0),
      status: "Clear",
    };
    const [created] = await db.insert(customersTable).values(customer).returning();
    if (body.type.toLowerCase() === "school" && uniformProductIds.length) {
      await db.update(productsTable).set({ school: created.school ?? created.name }).where(sql`${productsTable.id} = ANY(${uniformProductIds})`);
    }
    await db.insert(activityTable).values({ id: id("activity"), type: "customer", title: "Customer added", description: `${created.name} · ${created.type}`, time: "Just now", actor: "Current user" });
    res.status(201).json(CreateCustomerResponse.parse({ ...created, balance: 0, creditLimit: money(created.creditLimit), uniformProductIds: created.uniformProductIds ?? [] }));
  } catch (error) { next(error); }
});

router.get("/orders", async (req, res, next) => {
  try {
    const auth = req as AuthRequest;
    const query = ListOrdersQueryParams.parse(req.query);
    const filters = [];
    if (query.status) filters.push(ilike(ordersTable.status, query.status));
    if (query.type) filters.push(ilike(ordersTable.type, query.type));
    if (query.shopId) { await requireAuthorizedShop(auth, query.shopId); filters.push(eq(ordersTable.shopId, query.shopId)); }
    else if (auth.user?.role.toLowerCase() !== "admin") filters.push(eq(ordersTable.shopId, auth.user?.shopId ?? ""));
    const [rows, branchRows] = await Promise.all([
      db.select().from(ordersTable).where(filters.length ? and(...filters) : undefined).orderBy(desc(ordersTable.createdAt)),
      db.select().from(branchesTable),
    ]);
    const branchesById = new Map(branchRows.map((branch) => [branch.id, branch.name]));
    const data = rows.map((row: Order) => ({
      id: row.id,
      shopId: row.shopId ?? undefined,
      orderNumber: row.orderNumber,
      customerName: row.customerName,
      customerType: row.customerType,
      type: row.type,
      status: row.status,
      total: money(row.total),
      paid: money(row.paid),
      balance: money(row.balance),
      dueDate: row.dueDate,
      createdAt: isoDate(row.createdAt),
      branchName: branchesById.get(row.branchId) ?? "CBD Flagship",
      itemSummary: row.itemSummary ?? undefined,
      embroidery: row.embroidery,
      createdByUserId: row.createdByUserId ?? undefined,
    }));
    res.json(ListOrdersResponse.parse(data));
  } catch (error) { next(error); }
});

router.post("/orders", async (req, res, next) => {
  try {
    const auth = req as AuthRequest;
    const body = CreateOrderBody.parse(req.body);
    const shop = await requireAuthorizedShop(auth, body.shopId);
    await requireShopBranch(shop.id, body.branchId);
    if (body.type.toLowerCase() === "wholesale" && !["admin", "manager", "wholesale"].includes(auth.user?.role.toLowerCase() ?? "")) throw new Error("Wholesale sales require wholesale authorization.");
    const created = await db.transaction(async (tx) => {
      if (body.idempotencyKey) {
        const [existing] = await tx.select().from(ordersTable).where(eq(ordersTable.idempotencyKey, body.idempotencyKey)).limit(1);
        if (existing) return { order: existing, paymentReceiptNumber: undefined };
      }
      const [customer] = await tx.select().from(customersTable).where(and(eq(customersTable.name, body.customerName), eq(customersTable.shopId, shop.id))).limit(1);
      if (body.type.toLowerCase() === "wholesale" && customer?.type.toLowerCase() !== "wholesale") throw new Error("Wholesale orders require a wholesale customer.");
      const productIds = [...new Set((body.items ?? []).map((item) => item.productId))];
      const productRows = productIds.length ? await tx.select().from(productsTable).where(and(eq(productsTable.shopId, shop.id), sql`${productsTable.id} = ANY(${productIds})`)) : [];
      const productMap = new Map(productRows.map((product) => [product.id, product]));
      const calculatedTotal = (body.items ?? []).reduce((sum, item) => {
        const product = productMap.get(item.productId);
        if (!product) throw new Error(`Product ${item.productId} does not exist in the selected shop.`);
        const unitPrice = body.type.toLowerCase() === "wholesale" ? money(product.wholesalePrice) : money(product.retailPrice);
        return sum + unitPrice * item.quantity;
      }, 0);
      if (body.items?.length && body.total !== calculatedTotal) throw new Error("Order total does not match the server price list.");
      if (body.deposit > calculatedTotal) throw new Error("Payment cannot exceed the order total");
      const orderNumber = await nextDocumentNumber(tx, body.type.toLowerCase() === "pos sale" ? "RCT" : body.type === "Wholesale" ? "WO" : "SO");
      const order = {
        id: id("order"),
        orderNumber,
        idempotencyKey: body.idempotencyKey ?? null,
        createdByUserId: (req as AuthRequest).user?.id ?? null,
        shopId: shop.id,
        customerName: body.customerName,
        customerType: body.customerType,
        type: body.type,
        status: body.type.toLowerCase() === "pos sale" ? "Completed" : body.embroidery ? "In production" : "Pending",
        total: String(body.items?.length ? calculatedTotal : body.total),
        paid: String(body.deposit),
        balance: String(Math.max(0, (body.items?.length ? calculatedTotal : body.total) - body.deposit)),
        dueDate: body.dueDate,
        branchId: body.branchId,
        itemSummary: body.itemSummary ?? null,
        embroidery: body.embroidery ?? false,
      };
      const [createdOrder] = await tx.insert(ordersTable).values(order).returning();
      for (const item of body.items ?? []) {
        const quantity = item.quantity;
        // Check current stock availability before updating
        const [currentStock] = await tx.select({ onHand: inventoryTable.onHand, reserved: inventoryTable.reserved }).from(inventoryTable).where(and(
          eq(inventoryTable.productId, item.productId),
          eq(inventoryTable.shopId, shop.id),
          eq(inventoryTable.branchId, body.branchId),
        )).limit(1);
        
        if (!currentStock) {
          throw new Error(`No inventory record found for product ${item.productId} at branch ${body.branchId}.`);
        }
        
        const available = Number(currentStock.onHand) - Number(currentStock.reserved);
        if (available < quantity) {
          throw new Error(`Only ${available} units available for product ${item.productId}. Requested: ${quantity}.`);
        }
        
        const update = body.type.toLowerCase() === "pos sale"
          ? { onHand: sql`${inventoryTable.onHand} - ${quantity}` }
          : { reserved: sql`${inventoryTable.reserved} + ${quantity}` };
        const [stock] = await tx.update(inventoryTable)
          .set(update)
          .where(and(
            eq(inventoryTable.productId, item.productId),
            eq(inventoryTable.shopId, shop.id),
            eq(inventoryTable.branchId, body.branchId),
            body.type.toLowerCase() === "pos sale"
              ? sql`${inventoryTable.onHand} - ${inventoryTable.reserved} >= ${quantity}`
              : sql`${inventoryTable.onHand} - ${inventoryTable.reserved} >= ${quantity}`,
          ))
          .returning({ id: inventoryTable.id });
        if (!stock) throw new Error(`Failed to update inventory for product ${item.productId}.`);
      }
      let paymentReceiptNumber: string | undefined;
      if (body.deposit > 0) {
        paymentReceiptNumber = await nextDocumentNumber(tx, "RCT");
        await tx.insert(paymentsTable).values({
          id: id("payment"),
          shopId: shop.id,
          receiptNumber: paymentReceiptNumber,
          customerName: body.customerName,
          amount: String(body.deposit),
          method: body.paymentMethod ?? "Account",
          orderNumber: createdOrder.orderNumber,
          createdByUserId: (req as AuthRequest).user?.id ?? null,
        });
      }
      if (body.type.toLowerCase() === "pos sale") {
        await tx.update(branchesTable).set({ salesToday: sql`${branchesTable.salesToday} + ${body.total}` }).where(and(eq(branchesTable.id, body.branchId), eq(branchesTable.shopId, shop.id)));
      }
      if (customer && order.balance !== "0") {
        const balance = money(customer.balance) + money(order.balance);
        if (money(customer.creditLimit) > 0 && balance > money(customer.creditLimit)) {
          throw new Error("Order exceeds the customer's credit limit");
        }
        await tx.update(customersTable).set({ balance: String(balance), status: "On account" }).where(eq(customersTable.id, customer.id));
      }
      await tx.insert(activityTable).values({ id: id("activity"), shopId: shop.id, type: "order", title: "Order created", description: `${createdOrder.customerName} · ${createdOrder.orderNumber} · KSh ${money(createdOrder.total).toLocaleString()}`, time: "Just now", actor: "Current user" });
      return { order: createdOrder, paymentReceiptNumber };
    });
    const order = created.order;
    await audit(auth, "order.created", "order", order.id, shop.id, undefined, order);
    res.status(201).json(CreateOrderResponse.parse({ ...order, shopId: order.shopId ?? undefined, total: money(order.total), paid: money(order.paid), balance: money(order.balance), createdAt: isoDate(order.createdAt), branchName: branchName(order.branchId), itemSummary: order.itemSummary ?? undefined, embroidery: order.embroidery, paymentReceiptNumber: created.paymentReceiptNumber }));
  } catch (error) { next(error); }
});

router.patch("/orders/:orderNumber", async (req, res, next) => {
  try {
    const body = CreateOrderBody.partial().parse(req.body);
    const requestedStatus = typeof req.body?.status === "string" ? req.body.status.trim() : undefined;
    if (body.total !== undefined && body.deposit !== undefined && body.deposit > body.total) throw new Error("Deposit cannot exceed total");
    const auth = req as AuthRequest;
    const [existing] = await db.select().from(ordersTable).where(and(eq(ordersTable.orderNumber, req.params.orderNumber), auth.user?.role.toLowerCase() === "admin" ? undefined : eq(ordersTable.shopId, auth.user?.shopId ?? ""))).limit(1);
    if (!existing) throw new Error("Document not found");
    const [updated] = await db.update(ordersTable).set({
      ...(body.customerName !== undefined ? { customerName: body.customerName } : {}),
      ...(body.total !== undefined ? { total: String(body.total), balance: String(Math.max(0, body.total - money(existing.paid))) } : {}),
      ...(body.dueDate !== undefined ? { dueDate: body.dueDate } : {}),
      ...(body.itemSummary !== undefined ? { itemSummary: body.itemSummary } : {}),
      ...(body.type !== undefined ? { type: body.type } : {}),
      ...(requestedStatus ? { status: requestedStatus } : {}),
    }).where(eq(ordersTable.orderNumber, req.params.orderNumber)).returning();
    if (!updated) throw new Error("Document not found");
    res.json(CreateOrderResponse.parse({ ...updated, total: money(updated.total), paid: money(updated.paid), balance: money(updated.balance), createdAt: isoDate(updated.createdAt), branchName: branchName(updated.branchId), itemSummary: updated.itemSummary ?? undefined, embroidery: updated.embroidery }));
  } catch (error) { next(error); }
});

router.post("/payments", async (req, res, next) => {
  try {
    const auth = req as AuthRequest;
    const body = CreatePaymentBody.parse(req.body);
    const shop = await requireAuthorizedShop(auth, body.shopId);
    const payment = {
      id: id("payment"),
      shopId: shop.id,
      receiptNumber: await nextDocumentNumber(db, "RCT"),
      customerName: body.customerName,
      amount: String(body.amount),
      method: body.method,
      orderNumber: body.orderNumber ?? null,
      createdByUserId: (req as AuthRequest).user?.id ?? null,
    };
    const created = await db.transaction(async (tx) => {
      const [order] = body.orderNumber
        ? await tx.select().from(ordersTable).where(and(eq(ordersTable.orderNumber, body.orderNumber), eq(ordersTable.shopId, shop.id))).limit(1)
        : [];
      if (body.orderNumber && !order) throw new Error("Order not found");
      if (order && body.amount > money(order.balance)) throw new Error("Payment exceeds the order balance");

      const [createdPayment] = await tx.insert(paymentsTable).values(payment).returning();
      if (order) {
        const paid = money(order.paid) + body.amount;
        const balance = Math.max(0, money(order.total) - paid);
        await tx.update(ordersTable).set({ paid: String(paid), balance: String(balance), status: balance === 0 ? "Paid" : order.status }).where(eq(ordersTable.id, order.id));
        const [customer] = await tx.select().from(customersTable).where(eq(customersTable.name, order.customerName)).limit(1);
        if (customer) {
          const customerBalance = Math.max(0, money(customer.balance) - body.amount);
          await tx.update(customersTable).set({ balance: String(customerBalance), status: customerBalance === 0 ? "Clear" : "On account" }).where(eq(customersTable.id, customer.id));
        }
      }
      await tx.insert(activityTable).values({ id: id("activity"), shopId: shop.id, type: "payment", title: "Payment received", description: `${createdPayment.customerName} · KSh ${body.amount.toLocaleString()} via ${createdPayment.method}`, time: "Just now", actor: "Current user" });
      return createdPayment;
    });
    await audit(auth, "payment.created", "payment", created.id, shop.id, undefined, created);
    res.status(201).json(CreatePaymentResponse.parse({ ...created, shopId: created.shopId ?? undefined, amount: money(created.amount), receivedAt: isoDate(created.receivedAt), orderNumber: created.orderNumber }));
  } catch (error) { next(error); }
});

router.get("/payments", async (req, res, next) => {
  try {
    const auth = req as AuthRequest;
    const shopId = typeof req.query.shopId === "string" ? req.query.shopId : undefined;
    if (shopId) await requireAuthorizedShop(auth, shopId);
    const scope = shopId ? eq(paymentsTable.shopId, shopId) : auth.user?.role.toLowerCase() === "admin" ? undefined : eq(paymentsTable.shopId, auth.user?.shopId ?? "");
    const rows = await db.select().from(paymentsTable).where(scope).orderBy(desc(paymentsTable.receivedAt));
    res.json(rows.map((row) => ({ ...row, amount: money(row.amount), receivedAt: isoDate(row.receivedAt) })));
  } catch (error) { next(error); }
});

router.get("/reports/sales", async (req, res, next) => {
  try {
    const auth = req as AuthRequest;
    const isCashier = auth.user?.role.toLowerCase() === "cashier";
    const shopId = typeof req.query.shopId === "string" ? req.query.shopId : undefined;
    if (shopId) await requireActiveShop(shopId);
    const filters = [];
    if (isCashier && auth.user?.id) filters.push(eq(ordersTable.createdByUserId, auth.user.id));
    if (shopId) filters.push(eq(ordersTable.shopId, shopId));
    const rows = await db.select().from(ordersTable).where(filters.length ? and(...filters) : undefined).orderBy(desc(ordersTable.createdAt));
    res.json(rows.map((row) => ({
      id: row.orderNumber,
      shopId: row.shopId ?? undefined,
      date: isoDate(row.createdAt),
      customer: row.customerName,
      school: "—",
      branch: branchName(row.branchId),
      cashier: isCashier ? "Jane Kamau" : auth.user?.username ?? "System",
      payment: row.paid > "0" ? "Recorded payment" : "Unpaid",
      category: row.type,
      product: row.itemSummary ?? "Uniform order",
      size: "—",
      quantity: 1,
      total: money(row.total),
      status: row.status === "Cancelled" ? "Refunded" : "Completed",
    })));
  } catch (error) { next(error); }
});

router.get("/dtf/jobs", async (req, res, next) => {
  try {
    const auth = req as AuthRequest;
    const isCashier = auth.user?.role.toLowerCase() === "cashier";
    const filters = [auth.user?.role.toLowerCase() === "admin" ? undefined : eq(dtfJobsTable.shopId, auth.user?.shopId ?? ""), isCashier && auth.user?.id ? eq(dtfJobsTable.createdByUserId, auth.user.id) : undefined].filter(Boolean);
    const rows = await db.select().from(dtfJobsTable).where(filters.length ? and(...filters) : undefined).orderBy(desc(dtfJobsTable.createdAt));
    res.json(rows.map((row) => ({ ...row, price: money(row.price), createdAt: isoDate(row.createdAt) })));
  } catch (error) { next(error); }
});

router.post("/dtf/jobs", async (req, res, next) => {
  try {
    const auth = req as AuthRequest;
    const input = req.body as Record<string, unknown>;
    const shop = await requireAuthorizedShop(auth, input.shopId);
    if (!input.customerName || !input.artworkName || !input.garmentDescription || Number(input.quantity) < 1) throw new Error("Customer, artwork, garment, and quantity are required.");
    const [created] = await db.insert(dtfJobsTable).values({
      id: id("dtf"),
      shopId: shop.id,
      jobNumber: await nextDocumentNumber(db, "DTF"),
      customerName: String(input.customerName),
      orderNumber: input.orderNumber ? String(input.orderNumber) : null,
      artworkName: String(input.artworkName),
      garmentDescription: String(input.garmentDescription),
      quantity: Number(input.quantity),
      size: input.size ? String(input.size) : null,
      status: "Queued",
      price: String(Number(input.price ?? 0)),
      createdByUserId: (req as AuthRequest).user?.id ?? null,
    }).returning();
    res.status(201).json({ ...created, price: money(created.price), createdAt: isoDate(created.createdAt) });
  } catch (error) { next(error); }
});

router.get("/activity", async (req, res, next) => {
  try {
    const auth = req as AuthRequest;
    const rows = await db.select().from(activityTable).where(auth.user?.role.toLowerCase() === "admin" ? undefined : eq(activityTable.shopId, auth.user?.shopId ?? "")).orderBy(desc(activityTable.id)).limit(8);
    res.json(ListActivityResponse.parse(rows.map((row: Activity) => row)));
  } catch (error) { next(error); }
});

// Categories endpoints
router.get("/categories", async (req, res, next) => {
  try {
    const rows = await db.select().from(categoriesTable).where(eq(categoriesTable.active, true)).orderBy(asc(categoriesTable.sortOrder));
    res.json(rows);
  } catch (error) { next(error); }
});

router.post("/categories", async (req, res, next) => {
  try {
    const auth = req as AuthRequest;
    if (auth.user?.role.toLowerCase() !== "admin") return res.status(403).json({ error: "Administrator access required." });
    const input = req.body as Record<string, unknown>;
    const created = await db.insert(categoriesTable).values({
      id: crypto.randomUUID(),
      name: String(input.name),
      description: input.description ? String(input.description) : null,
      active: true,
      sortOrder: Number(input.sortOrder ?? 0),
    }).returning();
    res.status(201).json(created[0]);
  } catch (error) { next(error); }
});

// Sizes endpoints
router.get("/sizes", async (req, res, next) => {
  try {
    const rows = await db.select().from(sizesTable).orderBy(asc(sizesTable.sortOrder));
    res.json(rows);
  } catch (error) { next(error); }
});

router.post("/sizes", async (req, res, next) => {
  try {
    const auth = req as AuthRequest;
    if (auth.user?.role.toLowerCase() !== "admin") return res.status(403).json({ error: "Administrator access required." });
    const input = req.body as Record<string, unknown>;
    const created = await db.insert(sizesTable).values({
      id: crypto.randomUUID(),
      name: String(input.name),
      type: String(input.type),
      sortOrder: Number(input.sortOrder ?? 0),
    }).returning();
    res.status(201).json(created[0]);
  } catch (error) { next(error); }
});

// Colors endpoints
router.get("/colors", async (req, res, next) => {
  try {
    const rows = await db.select().from(colorsTable).where(eq(colorsTable.active, true)).orderBy(asc(colorsTable.name));
    res.json(rows);
  } catch (error) { next(error); }
});

router.post("/colors", async (req, res, next) => {
  try {
    const auth = req as AuthRequest;
    if (auth.user?.role.toLowerCase() !== "admin") return res.status(403).json({ error: "Administrator access required." });
    const input = req.body as Record<string, unknown>;
    const created = await db.insert(colorsTable).values({
      id: crypto.randomUUID(),
      name: String(input.name),
      hexCode: input.hexCode ? String(input.hexCode) : null,
      active: true,
    }).returning();
    res.status(201).json(created[0]);
  } catch (error) { next(error); }
});

// Product variants endpoints
router.get("/products/:productId/variants", async (req, res, next) => {
  try {
    const { productId } = req.params;
    const rows = await db.select().from(productVariantsTable).where(eq(productVariantsTable.productId, productId));
    res.json(rows);
  } catch (error) { next(error); }
});

router.post("/products/:productId/variants", async (req, res, next) => {
  try {
    const auth = req as AuthRequest;
    if (auth.user?.role.toLowerCase() !== "admin") return res.status(403).json({ error: "Administrator access required." });
    const { productId } = req.params;
    const input = req.body as Record<string, unknown>;
    const created = await db.insert(productVariantsTable).values({
      id: crypto.randomUUID(),
      productId: productId,
      sku: String(input.sku),
      size: String(input.size),
      color: String(input.color),
      costPrice: String(Number(input.costPrice)),
      retailPrice: String(Number(input.retailPrice)),
      wholesalePrice: String(Number(input.wholesalePrice)),
      status: "Active",
    }).returning();
    res.status(201).json(created[0]);
  } catch (error) { next(error); }
});

// Documents endpoints
router.get("/documents", async (req, res, next) => {
  try {
    const auth = req as AuthRequest;
    const shopId = req.query.shopId as string;
    if (shopId) await requireAuthorizedShop(auth, shopId);
    const filters = shopId ? [eq(ordersTable.shopId, shopId)] : [];
    const orders = await db.select().from(ordersTable).where(filters.length ? and(...filters) : undefined).orderBy(desc(ordersTable.createdAt));
    const documents = orders.map((order) => ({
      id: order.orderNumber,
      type: order.type === "POS Sale" ? "Receipt" : order.type === "Wholesale" ? "Invoice" : "Order Document",
      date: order.createdAt,
      customer: order.customerName,
      phone: "",
      student: "",
      school: "",
      branch: order.branchId,
      reference: order.orderNumber,
      amount: money(order.total),
      paid: money(order.paid),
      status: order.status,
      createdBy: auth.user?.username ?? "System",
      description: order.itemSummary ?? "",
      dueDate: "",
    }));
    res.json({ documents });
  } catch (error) { next(error); }
});

router.post("/documents", async (req, res, next) => {
  try {
    const auth = req as AuthRequest;
    const { type, customer, phone, school, description, amount, paid, reference } = req.body as { type: string; customer: string; phone: string; school: string; description: string; amount: number; paid: number; reference: string };
    const shop = await requireActiveShop(undefined);
    const prefix = type === "Quotation" ? "QUO" : type === "Invoice" ? "INV" : type === "Receipt" ? "RCT" : type === "Payment Receipt" ? "PR" : type === "Order Document" ? "ORD" : "DOC";
    const documentNumber = await nextDocumentNumber(db, prefix);
    const created = await db.insert(ordersTable).values({
      id: id("order"),
      orderNumber: documentNumber,
      shopId: shop.id,
      customerName: customer,
      type: type === "Quotation" ? "Retail" : type === "Invoice" ? "Wholesale" : "Retail",
      total: String(amount),
      paid: String(paid),
      balance: String(Math.max(0, amount - paid)),
      status: paid >= amount ? "Completed" : paid > 0 ? "Partially Paid" : "Pending",
      itemSummary: description,
      branchId: shop.branches?.[0]?.id ?? null,
      createdAt: new Date().toISOString(),
    }).returning();
    res.status(201).json({ ...created[0], id: created[0].orderNumber, total: money(created[0].total), paid: money(created[0].paid), balance: money(created[0].balance) });
  } catch (error) { next(error); }
});

router.put("/documents/:id", async (req, res, next) => {
  try {
    const auth = req as AuthRequest;
    const { id } = req.params;
    const { status } = req.body as { status: string };
    const [existing] = await db.select().from(ordersTable).where(eq(ordersTable.orderNumber, id)).limit(1);
    if (!existing) return res.status(404).json({ error: "Document not found" });
    const updated = await db.update(ordersTable).set({ status }).where(eq(ordersTable.orderNumber, id)).returning();
    res.json(updated[0]);
  } catch (error) { next(error); }
});

// DTF job deletion with permission check
router.delete("/dtf/jobs/:id", async (req, res, next) => {
  try {
    const auth = req as AuthRequest;
    if (auth.user?.role.toLowerCase() !== "admin") return res.status(403).json({ error: "Administrator permission required to delete embroidery jobs." });
    const { id } = req.params;
    const deleted = await db.delete(dtfJobsTable).where(eq(dtfJobsTable.id, id)).returning();
    if (deleted.length === 0) return res.status(404).json({ error: "Embroidery job not found." });
    res.json({ success: true, deletedJob: deleted[0] });
  } catch (error) { next(error); }
});

export default router;