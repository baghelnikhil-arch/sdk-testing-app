import { randomInt, randomUUID } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/auth";

/**
 * Creates (or promotes) a shop administrator.
 *
 * Normally the first person to sign up becomes the administrator, but that is no
 * help when the shop is already live and everyone registered is a customer. This
 * is the way back in.
 *
 *   npm run db:create-admin -- you@example.com "Your Name" [password]
 *
 * With no password one is generated and printed once. An existing account with
 * that email is promoted rather than duplicated, so this is safe to re-run.
 */
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

/** No 0/O or 1/l/I — this gets read off a screen and typed by hand. */
const ALPHABET = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generatePassword(length = 20) {
  return Array.from(
    { length },
    () => ALPHABET[randomInt(ALPHABET.length)],
  ).join("");
}

async function main() {
  const [emailArg, nameArg, passwordArg] = process.argv.slice(2);

  const email = (emailArg ?? process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
  const name = (nameArg ?? process.env.ADMIN_NAME ?? "Shop Admin").trim();
  const password = passwordArg ?? process.env.ADMIN_PASSWORD ?? generatePassword();

  if (!email || !email.includes("@")) {
    console.error(
      'Usage: npm run db:create-admin -- you@example.com "Your Name" [password]',
    );
    process.exit(1);
  }

  const existing = await prisma.user.findUnique({ where: { email } });

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      role: "admin",
      name,
      passwordHash: await hashPassword(password),
    },
    create: {
      email,
      name,
      role: "admin",
      passwordHash: await hashPassword(password),
      // Fixed identity for viaSocket, independent of the email address.
      viasocketId: `user_${randomUUID()}`,
    },
  });

  console.log("");
  console.log(existing ? "Promoted to admin:" : "Admin account created:");
  console.log("  email    ", user.email);
  console.log("  password ", password);
  console.log("  role     ", user.role);
  console.log("");
  console.log("Sign in at /login, then open /admin.");
  console.log("");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
