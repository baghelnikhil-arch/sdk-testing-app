import { db } from "./db";

/**
 * Integration state, in Postgres.
 *
 * Every connection belongs to an account, and `(userId, purpose)` is the only
 * way one is ever found. It used to be keyed on viaSocket's `endUserId`, which
 * is a different identifier owned by a different system: connections made in
 * two browsers landed under two identities, one account could end up holding
 * several rows for the same purpose, and deciding which of them was "the" one
 * took a fallback chain that nobody could predict. Now there is exactly one row
 * per account per purpose, and the database enforces it.
 *
 * `scriptId` is a credential: anyone holding it can run Google Sheets as this
 * user. It stays server-side and is never returned to the browser.
 */

/**
 * Exporting orders and importing the catalogue are separate connections:
 * different Google accounts, different spreadsheets, connected and disconnected
 * independently.
 */
export type Purpose = "orders" | "catalogue";
export const PURPOSES: Purpose[] = ["orders", "catalogue"];

/** An account, as this module needs to see one. */
export type Owner = { id: string; viasocketId: string };

export type Connection = {
  /** The shop's own user id. What this connection is keyed by. */
  userId: string;
  /** viaSocket's `unique_identifier` for the owner. What viaSocket is called with. */
  endUserId: string;
  authId: string;
  scriptId: string;
  spreadsheetId?: string;
  spreadsheetLabel?: string;
  sheetId?: string;
  sheetLabel?: string;
  connectedAt: string;
  lastExportAt?: string;
  lastSyncAt?: string;
  lastSyncCount?: number;
  /** Minutes between automatic re-reads; undefined means on demand only. */
  syncIntervalMinutes?: number;
  subscriptionId?: string;
  webhookToken?: string;
};

type Row = {
  userId: string;
  endUserId: string;
  authId: string;
  scriptId: string;
  spreadsheetId: string | null;
  spreadsheetLabel: string | null;
  sheetId: string | null;
  sheetLabel: string | null;
  connectedAt: Date;
  lastExportAt: Date | null;
  lastSyncAt: Date | null;
  lastSyncCount: number | null;
  syncIntervalMinutes: number | null;
  subscriptionId: string | null;
  webhookToken: string | null;
};

/** Nulls are a database detail; the rest of the app works in optionals. */
function toConnection(row: Row): Connection {
  return {
    userId: row.userId,
    endUserId: row.endUserId,
    authId: row.authId,
    scriptId: row.scriptId,
    spreadsheetId: row.spreadsheetId ?? undefined,
    spreadsheetLabel: row.spreadsheetLabel ?? undefined,
    sheetId: row.sheetId ?? undefined,
    sheetLabel: row.sheetLabel ?? undefined,
    connectedAt: row.connectedAt.toISOString(),
    lastExportAt: row.lastExportAt?.toISOString(),
    lastSyncAt: row.lastSyncAt?.toISOString(),
    lastSyncCount: row.lastSyncCount ?? undefined,
    syncIntervalMinutes: row.syncIntervalMinutes ?? undefined,
    subscriptionId: row.subscriptionId ?? undefined,
    webhookToken: row.webhookToken ?? undefined,
  };
}

const DATE_FIELDS = ["lastExportAt", "lastSyncAt"] as const;

/**
 * Turns a patch into column values.
 *
 * `undefined` in a patch means "clear this" — that is how the reconnect flow
 * wipes a stale sheet — so it maps to SQL NULL rather than being skipped.
 */
function toColumns(patch: Partial<Connection>) {
  const data: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(patch)) {
    if (key === "connectedAt" || key === "userId" || key === "endUserId") continue;
    if ((DATE_FIELDS as readonly string[]).includes(key)) {
      data[key] = value ? new Date(value as string) : null;
      continue;
    }
    data[key] = value ?? null;
  }
  return data;
}

const key = (userId: string, purpose: Purpose) => ({
  userId_purpose: { userId, purpose },
});

export async function getConnection(
  userId: string,
  purpose: Purpose,
): Promise<Connection | null> {
  const row = await db().connection.findUnique({ where: key(userId, purpose) });
  return row ? toConnection(row) : null;
}

/** Creates the connection, or merges into it when one already exists. */
export async function saveConnection(
  owner: Owner,
  purpose: Purpose,
  patch: Partial<Connection> & Pick<Connection, "authId" | "scriptId">,
): Promise<Connection> {
  const columns = toColumns(patch);

  const row = await db().connection.upsert({
    where: key(owner.id, purpose),
    // connectedAt defaults on insert and is never touched again, so it records
    // when this account was first linked rather than when it last changed.
    create: {
      userId: owner.id,
      endUserId: owner.viasocketId,
      purpose,
      authId: patch.authId,
      scriptId: patch.scriptId,
      ...columns,
    },
    update: columns,
  });

  return toConnection(row);
}

/** Updates a connection that must already exist; returns null if it does not. */
export async function patchConnection(
  userId: string,
  purpose: Purpose,
  patch: Partial<Connection>,
): Promise<Connection | null> {
  try {
    const row = await db().connection.update({
      where: key(userId, purpose),
      data: toColumns(patch),
    });
    return toConnection(row);
  } catch {
    return null;
  }
}

/**
 * Claims the right to run a scheduled sync, once.
 *
 * The timer is driven by visitors rather than a cron, so several requests can
 * decide a sync is due at the same moment. The claim is a compare-and-set on
 * the timestamp that was read: whoever moves it first wins, everyone else is
 * told no and does nothing. Stamping it *before* the sync also means a sync
 * that hangs or throws does not invite a retry on every single page view.
 */
export async function claimSync(
  userId: string,
  purpose: Purpose,
  seenAt: string | undefined,
): Promise<boolean> {
  const { count } = await db().connection.updateMany({
    where: {
      userId,
      purpose,
      lastSyncAt: seenAt ? new Date(seenAt) : null,
    },
    data: { lastSyncAt: new Date() },
  });
  return count === 1;
}

export async function clearConnection(userId: string, purpose: Purpose) {
  await db()
    .connection.delete({ where: key(userId, purpose) })
    .catch(() => null);
}

/**
 * Finds the owner of a webhook token, so unsigned events can be attributed.
 *
 * `webhookToken` is unique in the schema, which makes this a single indexed
 * lookup rather than a scan.
 */
export async function findByWebhookToken(
  token: string,
): Promise<{ connection: Connection } | null> {
  if (!token) return null;

  const row = await db().connection.findUnique({ where: { webhookToken: token } });
  if (!row || row.purpose !== "catalogue") return null;

  return { connection: toConnection(row) };
}

/**
 * The connection the shop itself uses for a purpose.
 *
 * There is one storefront, so an order placed by any customer is exported
 * through an administrator's connection — not the shopper's, who has none — and
 * the catalogue every visitor sees is imported through one too. Only a
 * configured connection counts: one without a sheet cannot do anything.
 */
export async function getShopConnection(
  purpose: Purpose,
): Promise<Connection | null> {
  const row = await db().connection.findFirst({
    where: {
      purpose,
      spreadsheetId: { not: null },
      sheetId: { not: null },
      user: { role: "admin" },
    },
    orderBy: { updatedAt: "desc" },
  });
  return row ? toConnection(row) : null;
}

/**
 * Finds a connection of another purpose already using this exact sheet.
 *
 * Reading products from the sheet the shop writes orders to creates a loop:
 * every order appends a row, the row trigger fires, the catalogue re-imports
 * from the order log, and the shop fills with nonsense or empties entirely.
 * Searches across all accounts, because the two connections may well be made by
 * different administrators.
 */
export async function findSheetConflict(
  purpose: Purpose,
  spreadsheetId: string,
  sheetId: string,
): Promise<{ purpose: Purpose; spreadsheetLabel: string | null } | null> {
  const other: Purpose = purpose === "catalogue" ? "orders" : "catalogue";

  const row = await db().connection.findFirst({
    where: { purpose: other, spreadsheetId, sheetId },
  });

  return row
    ? { purpose: other, spreadsheetLabel: row.spreadsheetLabel }
    : null;
}
