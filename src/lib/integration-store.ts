import type { Prisma } from "@prisma/client";
import { db } from "./db";
import type { Product } from "@/types";

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

/* ---------------------------------------------------------------------------
 * Imported catalogue.
 *
 * Shop stock, not per-visitor data, so it is not keyed by end user. Every import
 * replaces the whole set: the sheet is the source of truth, which makes the
 * operation idempotent and lets deleted rows disappear from the shop.
 * ------------------------------------------------------------------------- */

export type ImportedCatalogue = {
  products: Product[];
  syncedAt: string;
  source?: { spreadsheet: string; sheet: string };
};

export async function readImportedCatalogue(): Promise<ImportedCatalogue | null> {
  const rows = await db().importedProduct.findMany({
    orderBy: { id: "asc" },
  });
  if (rows.length === 0) return null;

  const newest = rows.reduce(
    (latest, row) => (row.syncedAt > latest ? row.syncedAt : latest),
    rows[0].syncedAt,
  );

  return {
    products: rows.map((row) => row.data as unknown as Product),
    syncedAt: newest.toISOString(),
    source:
      rows[0].sourceSpreadsheet && rows[0].sourceSheet
        ? { spreadsheet: rows[0].sourceSpreadsheet, sheet: rows[0].sourceSheet }
        : undefined,
  };
}

export async function writeImportedCatalogue(value: ImportedCatalogue) {
  const syncedAt = new Date(value.syncedAt);

  // One transaction, so the shop is never briefly empty mid-import.
  await db().$transaction([
    db().importedProduct.deleteMany({}),
    db().importedProduct.createMany({
      data: value.products.map((product) => ({
        id: product.id,
        data: product as unknown as Prisma.InputJsonValue,
        syncedAt,
        sourceSpreadsheet: value.source?.spreadsheet ?? null,
        sourceSheet: value.source?.sheet ?? null,
      })),
    }),
  ]);
}

export async function clearImportedCatalogue() {
  await db().importedProduct.deleteMany({});
}
