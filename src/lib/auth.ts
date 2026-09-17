import { randomBytes, randomUUID, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { db } from "./db";

/**
 * Authentication — SERVER ONLY.
 *
 * Sessions are stored, not signed: the browser holds an opaque random token and
 * every check looks it up. That costs a query, and buys real revocation —
 * signing out, or deleting a user, invalidates immediately, which a self-
 * contained JWT cannot do.
 *
 * Passwords use scrypt from Node's standard library. No dependency, and it is
 * deliberately slow and memory-hard, which is the point.
 */

const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: string,
  keylen: number,
) => Promise<Buffer>;

const KEY_LENGTH = 64;
export const SESSION_COOKIE = "aurelle_session";
const SESSION_DAYS = 30;

/* ----------------------------------------------------------------- passwords */

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = await scryptAsync(password, salt, KEY_LENGTH);
  return `${salt}:${derived.toString("hex")}`;
}

export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;

  const derived = await scryptAsync(password, salt, KEY_LENGTH);
  const expected = Buffer.from(hash, "hex");

  // Lengths must match before timingSafeEqual, which throws otherwise.
  if (expected.length !== derived.length) return false;
  return timingSafeEqual(expected, derived);
}

/* ------------------------------------------------------------------ sessions */

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  viasocketId: string;
};

function expiryDate() {
  return new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = expiryDate();

  await db().session.create({ data: { token, userId, expiresAt } });

  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    // Lax still sends the cookie on top-level navigations, so returning from
    // the Google consent popup keeps the user signed in.
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });

  return token;
}

export async function destroySession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;

  if (token) {
    await db().session.deleteMany({ where: { token } });
  }
  store.delete(SESSION_COOKIE);
}

/**
 * The signed-in user, or null.
 *
 * This is the real check — the one the docs call "secure", as opposed to the
 * optimistic cookie-presence check in `proxy.ts`. Everything that reads or
 * writes per-user data goes through here rather than trusting the cookie.
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  try {
    const store = await cookies();
    const token = store.get(SESSION_COOKIE)?.value;
    if (!token) return null;

    const session = await db().session.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!session) return null;

    if (session.expiresAt < new Date()) {
      await db().session.deleteMany({ where: { token } });
      return null;
    }

    return {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      role: session.user.role,
      viasocketId: session.user.viasocketId,
    };
  } catch (error) {
    /*
     * Next signals control flow with thrown objects carrying a `digest` —
     * reading cookies during static generation is one of them, and it is how a
     * route learns it must render dynamically. Swallowing it would freeze a
     * signed-out header into every prerendered page, so those are re-thrown and
     * only genuine failures (a database outage) fall through to "nobody".
     */
    if (error && typeof error === "object" && "digest" in error) throw error;
    return null;
  }
}

export class UnauthorizedError extends Error {
  constructor(message = "You need to be signed in to do that.") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  constructor(message = "You do not have access to that.") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new UnauthorizedError();
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "admin") throw new ForbiddenError();
  return user;
}

/* ------------------------------------------------------------------ accounts */

/**
 * The first account created runs the shop, and any address listed in
 * ADMIN_EMAILS does too. Without this there would be no way to reach the
 * integration settings on a fresh database.
 */
async function roleForNewUser(email: string): Promise<string> {
  const allowList = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);

  if (allowList.includes(email.toLowerCase())) return "admin";
  return (await db().user.count()) === 0 ? "admin" : "customer";
}

export async function createUser(input: {
  email: string;
  name: string;
  password: string;
}): Promise<SessionUser> {
  const email = input.email.trim().toLowerCase();

  const user = await db().user.create({
    data: {
      email,
      name: input.name.trim(),
      passwordHash: await hashPassword(input.password),
      role: await roleForNewUser(email),
      // Fixed at signup and never derived from the email, so changing an
      // address later cannot orphan the user's viaSocket connections.
      viasocketId: `user_${randomUUID()}`,
    },
  });

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    viasocketId: user.viasocketId,
  };
}

export async function findUserByEmail(email: string) {
  return db().user.findUnique({
    where: { email: email.trim().toLowerCase() },
  });
}

/**
 * Maps an auth failure to a response, or null when the error is something else.
 *
 * Without this a signed-out request reads as a 500, which looks like a broken
 * server rather than a closed door.
 */
export function authErrorResponse(error: unknown) {
  if (error instanceof UnauthorizedError) {
    return { status: 401 as const, error: error.message };
  }
  if (error instanceof ForbiddenError) {
    return { status: 403 as const, error: error.message };
  }
  return null;
}
