import { db } from "./db";

/**
 * Integration state, in Postgres.
 *
 * One connection per account, found by `userId` and nothing else.
 *
 * There used to be a `purpose` column — "orders" or "catalogue" — and a row per
 * pair, which meant the same person could hold two connections, two sheets and
 * two subscriptions, and every route had to carry a purpose around to say which
 * one it meant. What a connection is for is not a property of the connection at
 * all: it follows from who owns it. An administrator's sheet is what the shop
 * sells; anybody else's is where their own orders go.
 *
 * `scriptId` is a credential: anyone holding it can run Google Sheets as this
 * user. It stays server-side and is never returned to the browser.
 */

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

export async function getConnection(userId: string): Promise<Connection | null> {
  const row = await db().connection.findUnique({ where: { userId } });
  return row ? toConnection(row) : null;
}

/** Creates the connection, or merges into it when one already exists. */
export async function saveConnection(
  owner: Owner,
  patch: Partial<Connection> & Pick<Connection, "authId" | "scriptId">,
): Promise<Connection> {
  const columns = toColumns(patch);

  const row = await db().connection.upsert({
    where: { userId: owner.id },
    // connectedAt defaults on insert and is never touched again, so it records
    // when this account was first linked rather than when it last changed.
    create: {
      userId: owner.id,
      endUserId: owner.viasocketId,
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
  patch: Partial<Connection>,
): Promise<Connection | null> {
  try {
    const row = await db().connection.update({
      where: { userId },
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
  seenAt: string | undefined,
): Promise<boolean> {
  const { count } = await db().connection.updateMany({
    where: { userId, lastSyncAt: seenAt ? new Date(seenAt) : null },
    data: { lastSyncAt: new Date() },
  });
  return count === 1;
}

export async function clearConnection(userId: string) {
  await db()
    .connection.delete({ where: { userId } })
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
  return row ? { connection: toConnection(row) } : null;
}

/**
 * The connection the catalogue is read from.
 *
 * An administrator's, because the catalogue is what the whole shop sells, and
 * only a configured one: a connection without a sheet cannot be read.
 */
export async function getShopConnection(): Promise<Connection | null> {
  const row = await db().connection.findFirst({
    where: {
      spreadsheetId: { not: null },
      sheetId: { not: null },
      user: { role: "admin" },
    },
    orderBy: { updatedAt: "desc" },
  });
  return row ? toConnection(row) : null;
}

/**
 * Whether somebody else has already claimed this exact sheet.
 *
 * Two accounts sharing a sheet is the one arrangement that destroys data. If a
 * shopper's orders are appended to the sheet the shop reads products from, the
 * next import either sells the order rows or, once they stop parsing as
 * products, empties the shelves — and this shop has had both. It is equally
 * wrong in the other direction, an administrator adopting somebody's order log
 * as the catalogue, so the rule is symmetric and needs no notion of purpose:
 * one sheet, one owner.
 */
export async function sheetTakenBy(
  spreadsheetId: string,
  sheetId: string,
  exceptUserId: string,
): Promise<{ admin: boolean } | null> {
  const row = await db().connection.findFirst({
    where: { spreadsheetId, sheetId, userId: { not: exceptUserId } },
    include: { user: { select: { role: true } } },
  });
  return row ? { admin: row.user.role === "admin" } : null;
}
