import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Product } from "@/types";

/**
 * Where integration state lives.
 *
 * JSON files, because the demo has no database. **This is the seam to replace:**
 * swap these functions for your own tables and nothing else in the app changes.
 *
 * `scriptId` is a credential — anyone holding it can run Google Sheets as this
 * user — so it is stored server-side and never sent to the browser.
 */

/**
 * Integrations are keyed by purpose, not just by user. Exporting orders and
 * importing the catalogue are separate connections: different Google accounts,
 * different spreadsheets, connected and disconnected independently.
 */
export type Purpose = "orders" | "catalogue";
export const PURPOSES: Purpose[] = ["orders", "catalogue"];

export type Connection = {
  authId: string;
  scriptId: string;
  spreadsheetId?: string;
  spreadsheetLabel?: string;
  sheetId?: string;
  sheetLabel?: string;
  connectedAt: string;
  /** orders: when a cart was last written out. */
  lastExportAt?: string;
  /** catalogue: when rows were last pulled in. */
  lastSyncAt?: string;
  lastSyncCount?: number;
  /** catalogue: the trigger subscription's own script_id, if one exists. */
  subscriptionId?: string;
  /** catalogue: shared secret in the webhook URL, since events are unsigned. */
  webhookToken?: string;
};

type UserRecord = Partial<Record<Purpose, Connection>>;
type StoreShape = Record<string, UserRecord>;

const DIR = path.join(process.cwd(), ".data");
const FILE = path.join(DIR, "integrations.json");
const CATALOGUE_FILE = path.join(DIR, "catalogue.json");

/** Records written before purposes existed were order-export connections. */
function migrate(record: unknown): UserRecord {
  if (!record || typeof record !== "object") return {};
  if ("authId" in (record as Record<string, unknown>)) {
    return { orders: record as Connection };
  }
  return record as UserRecord;
}

async function readStore(): Promise<StoreShape> {
  try {
    const raw = JSON.parse(await readFile(FILE, "utf8")) as StoreShape;
    return Object.fromEntries(
      Object.entries(raw).map(([user, record]) => [user, migrate(record)]),
    );
  } catch {
    return {};
  }
}

async function writeStore(store: StoreShape) {
  await mkdir(DIR, { recursive: true });
  await writeFile(FILE, JSON.stringify(store, null, 2), "utf8");
}

export async function getConnection(
  endUserId: string,
  purpose: Purpose,
): Promise<Connection | null> {
  const store = await readStore();
  return store[endUserId]?.[purpose] ?? null;
}

export async function getConnections(endUserId: string): Promise<UserRecord> {
  const store = await readStore();
  return store[endUserId] ?? {};
}

/** Shallow-merges into the existing connection, creating it when absent. */
export async function saveConnection(
  endUserId: string,
  purpose: Purpose,
  patch: Partial<Connection> & Pick<Connection, "authId" | "scriptId">,
): Promise<Connection> {
  const store = await readStore();
  const user = store[endUserId] ?? {};
  const existing = user[purpose];

  const next: Connection = {
    ...existing,
    ...patch,
    // Set on first connect, preserved on every reconnect.
    connectedAt: existing?.connectedAt ?? new Date().toISOString(),
  };

  store[endUserId] = { ...user, [purpose]: next };
  await writeStore(store);
  return next;
}

/** Updates a connection that must already exist; returns null if it does not. */
export async function patchConnection(
  endUserId: string,
  purpose: Purpose,
  patch: Partial<Connection>,
): Promise<Connection | null> {
  const store = await readStore();
  const existing = store[endUserId]?.[purpose];
  if (!existing) return null;

  const next = { ...existing, ...patch };
  store[endUserId] = { ...store[endUserId], [purpose]: next };
  await writeStore(store);
  return next;
}

export async function clearConnection(endUserId: string, purpose: Purpose) {
  const store = await readStore();
  const user = store[endUserId];
  if (!user) return;

  delete user[purpose];
  store[endUserId] = user;
  await writeStore(store);
}

/** Finds the owner of a webhook token, so unsigned events can be attributed. */
export async function findByWebhookToken(
  token: string,
): Promise<{ endUserId: string; connection: Connection } | null> {
  if (!token) return null;
  const store = await readStore();

  for (const [endUserId, record] of Object.entries(store)) {
    const connection = record.catalogue;
    if (connection?.webhookToken && connection.webhookToken === token) {
      return { endUserId, connection };
    }
  }
  return null;
}

/* ---------------------------------------------------------------------------
 * Imported catalogue.
 *
 * Stored globally rather than per end user: products imported from a sheet are
 * the shop's stock, visible to every visitor, not private to whoever connected
 * the account.
 * ------------------------------------------------------------------------- */

export type ImportedCatalogue = {
  products: Product[];
  syncedAt: string;
  source?: { spreadsheet: string; sheet: string };
};

export async function readImportedCatalogue(): Promise<ImportedCatalogue | null> {
  try {
    return JSON.parse(
      await readFile(CATALOGUE_FILE, "utf8"),
    ) as ImportedCatalogue;
  } catch {
    return null;
  }
}

export async function writeImportedCatalogue(value: ImportedCatalogue) {
  await mkdir(DIR, { recursive: true });
  await writeFile(CATALOGUE_FILE, JSON.stringify(value, null, 2), "utf8");
}

export async function clearImportedCatalogue() {
  await writeImportedCatalogue({ products: [], syncedAt: new Date().toISOString() });
}
