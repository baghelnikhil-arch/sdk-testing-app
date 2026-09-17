"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import {
  createSession,
  createUser,
  destroySession,
  findUserByEmail,
  getCurrentUser,
  verifyPassword,
} from "@/lib/auth";

export type AuthState = {
  errors?: { email?: string; password?: string; name?: string; form?: string };
  values?: { email?: string; name?: string };
};

function readForm(formData: FormData) {
  return {
    email: String(formData.get("email") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
    name: String(formData.get("name") ?? "").trim(),
    next: String(formData.get("next") ?? "").trim(),
  };
}

/** Only ever redirect within this app — an open redirect is a phishing vector. */
function safeNext(next: string) {
  return next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Connections made before accounts existed have no owner. The shop has one
 * administrator, so the first admin to sign in adopts them — otherwise a
 * working Google Sheets setup would be stranded and have to be rebuilt.
 */
async function claimOrphanConnections(userId: string) {
  await db()
    .connection.updateMany({ where: { userId: null }, data: { userId } })
    .catch(() => null);
}

export async function signup(
  _prev: AuthState | undefined,
  formData: FormData,
): Promise<AuthState> {
  const { email, password, name, next } = readForm(formData);
  const errors: AuthState["errors"] = {};

  if (name.length < 2) errors.name = "Tell us what to call you.";
  if (!EMAIL.test(email)) errors.email = "That does not look like an email address.";
  if (password.length < 8) errors.password = "Use at least 8 characters.";

  if (Object.keys(errors).length > 0) {
    return { errors, values: { email, name } };
  }

  if (await findUserByEmail(email)) {
    return {
      errors: { email: "An account with that email already exists." },
      values: { email, name },
    };
  }

  let user;
  try {
    user = await createUser({ email, name, password });
  } catch {
    return {
      errors: { form: "We could not create the account. Please try again." },
      values: { email, name },
    };
  }

  await createSession(user.id);
  if (user.role === "admin") await claimOrphanConnections(user.id);

  revalidatePath("/", "layout");
  redirect(safeNext(next));
}

export async function login(
  _prev: AuthState | undefined,
  formData: FormData,
): Promise<AuthState> {
  const { email, password, next } = readForm(formData);

  if (!EMAIL.test(email) || password.length === 0) {
    return {
      errors: { form: "Enter your email and password." },
      values: { email },
    };
  }

  const user = await findUserByEmail(email);

  // Same message either way: distinguishing them tells an attacker which
  // addresses are registered.
  const ok = user ? await verifyPassword(password, user.passwordHash) : false;
  if (!user || !ok) {
    return {
      errors: { form: "That email and password do not match." },
      values: { email },
    };
  }

  await createSession(user.id);
  if (user.role === "admin") await claimOrphanConnections(user.id);

  revalidatePath("/", "layout");
  redirect(safeNext(next));
}

export async function logout() {
  await destroySession();
  revalidatePath("/", "layout");
  redirect("/");
}

/** Used by client components that need to know who is signed in. */
export async function currentUser() {
  return getCurrentUser();
}
