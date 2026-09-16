import { db } from "./db";

/**
 * Integration state, in Postgres.
 *
 * Rows are keyed by (endUserId, purpose), so two concurrent requests for two
 * different people — or for one person's two connections — never contend.
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

export type Connection = {
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
  subscriptionId?: string;
  webhookToken?: string;
};

type Row = {
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
  subscriptionId: string | null;
  webhookToken: string | null;
};

/** Nulls are a database detail; the rest of the app works in optionals. */
function toConnection(row: Row): Connection {
  return {
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
    if (key === "connectedAt") continue;
    if ((DATE_FIELDS as readonly string[]).includes(key)) {
      data[key] = value ? new Date(value as string) : null;
      continue;
    }
    data[key] = value ?? null;
  }
  return data;
}

export async function getConnection(
  endUserId: string,
  purpose: Purpose,
): Promise<Connection | null> {
  const row = await db().connection.findUnique({
    where: { endUserId_purpose: { endUserId, purpose } },
  });
  return row ? toConnection(row) : null;
}

export async function getConnections(
  endUserId: string,
): Promise<Partial<Record<Purpose, Connection>>> {
  const rows = await db().connection.findMany({ where: { endUserId } });
  return Object.fromEntries(
    rows.map((row) => [row.purpose as Purpose, toConnection(row)]),
  );
}

/** Creates the connection, or merges into it when one already exists. */
export async function saveConnection(
  endUserId: string,
  purpose: Purpose,
  patch: Partial<Connection> & Pick<Connection, "authId" | "scriptId">,
): Promise<Connection> {
  const columns = toColumns(patch);

  const row = await db().connection.upsert({
    where: { endUserId_purpose: { endUserId, purpose } },
    // connectedAt defaults on insert and is never touched again, so it records
    // when this account was first linked rather than when it last changed.
    create: {
      endUserId,
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
  endUserId: string,
  purpose: Purpose,
  patch: Partial<Connection>,
): Promise<Connection | null> {
  try {
    const row = await db().connection.update({
      where: { endUserId_purpose: { endUserId, purpose } },
      data: toColumns(patch),
    });
    return toConnection(row);
  } catch {
    return null;
  }
}

export async function clearConnection(endUserId: string, purpose: Purpose) {
  await db()
    .connection.delete({
      where: { endUserId_purpose: { endUserId, purpose } },
    })
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
): Promise<{ endUserId: string; connection: Connection } | null> {
  if (!token) return null;

  const row = await db().connection.findUnique({ where: { webhookToken: token } });
  if (!row || row.purpose !== "catalogue") return null;

  return { endUserId: row.endUserId, connection: toConnection(row) };
}

/**
 * Finds a connection of another purpose already using this exact sheet.
 *
 * Reading products from the sheet the shop writes orders to creates a loop:
 * every order appends a row, the row trigger fires, the catalogue re-imports
 * from the order log, and the shop fills with nonsense or empties entirely.
 * Searches across all users, because the two connections are frequently made in
 * different browsers and so belong to different demo identities.
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
