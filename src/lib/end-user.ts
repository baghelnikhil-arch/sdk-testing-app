import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";

/**
 * Who the end user is, for viaSocket's `unique_identifier`.
 *
 * The storefront has no authentication, so this demo mints a stable id into an
 * httpOnly cookie. **Replace this with your real user id.** viaSocket isolates
 * connections and subscriptions by `unique_identifier`: if the value changes for
 * the same person, their connected apps appear to vanish.
 */
const COOKIE = "aurelle_end_user";
const FIVE_YEARS = 60 * 60 * 24 * 365 * 5;

/** Read-only: safe from Server Components, returns null before the first visit. */
export async function peekEndUserId(): Promise<string | null> {
  const store = await cookies();
  return store.get(COOKIE)?.value ?? null;
}

/**
 * Reads the id, minting one if this browser has none. Only valid inside a Route
 * Handler or Server Action — Server Components may not set cookies.
 */
export async function requireEndUserId(): Promise<string> {
  const store = await cookies();
  const existing = store.get(COOKIE)?.value;
  if (existing) return existing;

  const id = `demo_${randomUUID()}`;
  store.set(COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: FIVE_YEARS,
  });
  return id;
}
