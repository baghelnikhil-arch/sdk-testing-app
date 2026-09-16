import { delKey, getJSON, setJSON } from "./kv";
import type { Product } from "@/types";

/**
 * Integration state, on top of the KV seam in `lib/kv.ts`.
 *
 * Keys are per user rather than one big document: two serverless invocations
 * handling two people must not read-modify-write the same blob and clobber each
 * other.
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

const userKey = (endUserId: string) => `integration:${endUserId}`;
/** Index, so an unsigned webhook can be attributed without scanning every user. */
const tokenKey = (token: string) => `webhooktoken:${token}`;
const CATALOGUE_KEY = "catalogue";

/** Records written before purposes existed were order-export connections. */
function migrate(record: unknown): UserRecord {
  if (!record || typeof record !== "object") return {};
  if ("authId" in (record as Record<string, unknown>)) {
    return { orders: record as Connection };
  }
  return record as UserRecord;
}

async function readUser(endUserId: string): Promise<UserRecord> {
  return migrate(await getJSON<unknown>(userKey(endUserId)));
}

export async function getConnection(
  endUserId: string,
  purpose: Purpose,
): Promise<Connection | null> {
  return (await readUser(endUserId))[purpose] ?? null;
}

export async function getConnections(endUserId: string): Promise<UserRecord> {
  return readUser(endUserId);
}

/** Shallow-merges into the existing connection, creating it when absent. */
export async function saveConnection(
  endUserId: string,
  purpose: Purpose,
  patch: Partial<Connection> & Pick<Connection, "authId" | "scriptId">,
): Promise<Connection> {
  const user = await readUser(endUserId);
  const existing = user[purpose];

  const next: Connection = {
    ...existing,
    ...patch,
    // Set on first connect, preserved on every reconnect.
    connectedAt: existing?.connectedAt ?? new Date().toISOString(),
  };

  await writeUser(endUserId, { ...user, [purpose]: next }, existing);
  return next;
}

/** Updates a connection that must already exist; returns null if it does not. */
export async function patchConnection(
  endUserId: string,
  purpose: Purpose,
  patch: Partial<Connection>,
): Promise<Connection | null> {
  const user = await readUser(endUserId);
  const existing = user[purpose];
  if (!existing) return null;

  const next = { ...existing, ...patch };
  await writeUser(endUserId, { ...user, [purpose]: next }, existing);
  return next;
}

export async function clearConnection(endUserId: string, purpose: Purpose) {
  const user = await readUser(endUserId);
  const existing = user[purpose];
  delete user[purpose];

  await writeUser(endUserId, user, existing);
}

/** Writes the record and keeps the webhook-token index in step with it. */
async function writeUser(
  endUserId: string,
  next: UserRecord,
  previous?: Connection,
) {
  await setJSON(userKey(endUserId), next);

  const nextToken = next.catalogue?.webhookToken;
  const previousToken = previous?.webhookToken;

  if (previousToken && previousToken !== nextToken) {
    await delKey(tokenKey(previousToken));
  }
  if (nextToken && nextToken !== previousToken) {
    await setJSON(tokenKey(nextToken), endUserId);
  }
}

/** Finds the owner of a webhook token, so unsigned events can be attributed. */
export async function findByWebhookToken(
  token: string,
): Promise<{ endUserId: string; connection: Connection } | null> {
  if (!token) return null;

  const endUserId = await getJSON<string>(tokenKey(token));
  if (!endUserId) return null;

  const connection = await getConnection(endUserId, "catalogue");
  // The index can outlive the connection; treat a dangling entry as unknown.
  if (!connection || connection.webhookToken !== token) return null;

  return { endUserId, connection };
}

/* ---------------------------------------------------------------------------
 * Imported catalogue.
 *
 * Stored under one key rather than per user: products imported from a sheet are
 * the shop's stock, visible to every visitor, not private to whoever connected
 * the account.
 * ------------------------------------------------------------------------- */

export type ImportedCatalogue = {
  products: Product[];
  syncedAt: string;
  source?: { spreadsheet: string; sheet: string };
};

export async function readImportedCatalogue(): Promise<ImportedCatalogue | null> {
  return getJSON<ImportedCatalogue>(CATALOGUE_KEY);
}

export async function writeImportedCatalogue(value: ImportedCatalogue) {
  await setJSON(CATALOGUE_KEY, value);
}

export async function clearImportedCatalogue() {
  await writeImportedCatalogue({
    products: [],
    syncedAt: new Date().toISOString(),
  });
}
