import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { eq, or } from "drizzle-orm";
import { auditEventsTable, db, sessionsTable, usersTable } from "@workspace/db";

const router: IRouter = Router();
const sessionCookie = "pajoy_session";
const sessionDays = 7;

type AuthUser = Pick<typeof usersTable.$inferSelect, "id" | "shopId" | "username" | "email" | "role" | "status" | "branchId" | "registerId">;

export type AuthRequest = Request & { user?: AuthUser };

function hashPassword(password: string, salt: string) {
  return scryptSync(password, salt, 64).toString("hex");
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function parseCredentials(value: unknown) {
  if (!value || typeof value !== "object") throw new Error("Invalid credentials");
  const input = value as Record<string, unknown>;
  if (typeof input.username !== "string" || typeof input.password !== "string" || !input.username.trim() || !input.password) throw new Error("Invalid credentials");
  return { username: input.username.trim(), password: input.password };
}

function publicUser(user: AuthUser) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    shopId: user.shopId,
    branchId: user.branchId,
    registerId: user.registerId,
    permissions: user.role.toLowerCase() === "cashier" ? ["pos", "orders", "embroidery", "dtf", "documents", "customers", "reports"] : ["*"] ,
  };
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const bearer = req.header("authorization");
    const token = req.cookies?.[sessionCookie] ?? (bearer?.startsWith("Bearer ") ? bearer.slice(7) : undefined);
    if (!token) return res.status(401).json({ error: "Authentication required." });
    const [session] = await db.select().from(sessionsTable).where(eq(sessionsTable.tokenHash, hashToken(token))).limit(1);
    if (!session || session.expiresAt <= new Date()) return res.status(401).json({ error: "Authentication required." });
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, session.userId)).limit(1);
    if (!user || user.status.toLowerCase() !== "active") return res.status(403).json({ error: "Your account is inactive." });
    req.user = user;
    return next();
  } catch (error) {
    return next(error);
  }
}

router.post("/auth/login", async (req, res, next) => {
  try {
    const body = parseCredentials(req.body);
    const [user] = await db.select().from(usersTable).where(or(eq(usersTable.username, body.username), eq(usersTable.email, body.username))).limit(1);
    if (!user) return res.status(401).json({ error: "Incorrect username or password." });
    const expected = Buffer.from(user.passwordHash, "hex");
    const actual = Buffer.from(hashPassword(body.password, user.passwordSalt), "hex");
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return res.status(401).json({ error: "Incorrect username or password." });
    if (user.status.toLowerCase() !== "active") return res.status(403).json({ error: "Your account is inactive. Please contact an administrator." });
    const token = randomBytes(32).toString("hex");
    await db.insert(sessionsTable).values({ tokenHash: hashToken(token), userId: user.id, expiresAt: new Date(Date.now() + sessionDays * 86400000) });
    res.cookie(sessionCookie, token, { httpOnly: true, sameSite: "lax", secure: req.secure, maxAge: sessionDays * 86400000, path: "/" });
    await db.insert(auditEventsTable).values({ id: `audit-login-${Date.now()}-${randomBytes(4).toString("hex")}`, shopId: user.shopId ?? null, actorUserId: user.id, action: "auth.login", entityType: "user", entityId: user.id, requestId: String(req.id), before: null, after: { username: user.username } });
    return res.json({ ...publicUser(user), token });
  } catch (error) {
    return next(error);
  }
});

router.get("/auth/me", async (req, res, next) => {
  try {
    const bearer = req.header("authorization");
    const token = req.cookies?.[sessionCookie] ?? (bearer?.startsWith("Bearer ") ? bearer.slice(7) : undefined);
    if (!token) return res.json(null);
    const [session] = await db.select().from(sessionsTable).where(eq(sessionsTable.tokenHash, hashToken(token))).limit(1);
    if (!session || session.expiresAt <= new Date()) return res.json(null);
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, session.userId)).limit(1);
    if (!user || user.status.toLowerCase() !== "active") return res.json(null);
    return res.json({ ...publicUser(user), token });
  } catch (error) {
    return next(error);
  }
});

router.post("/auth/logout", async (req, res, next) => {
  try {
    const bearer = req.header("authorization");
    const token = req.cookies?.[sessionCookie] ?? (bearer?.startsWith("Bearer ") ? bearer.slice(7) : undefined);
    if (token) await db.delete(sessionsTable).where(eq(sessionsTable.tokenHash, hashToken(token)));
    res.clearCookie(sessionCookie, { httpOnly: true, sameSite: "lax", secure: req.secure, path: "/" });
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});

export default router;
