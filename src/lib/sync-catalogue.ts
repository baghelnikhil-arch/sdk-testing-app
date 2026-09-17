import { revalidatePath } from "next/cache";
import {
  claimSync,
  findSheetConflict,
  getShopConnection,
  patchConnection,
  type Connection,
} from "./integration-store";
import { countSheetProducts, writeSheetProducts } from "./shop-data";
import { extractRows, mapRowsToProducts, usesFallbackImage } from "./catalogue";
import { FIELDS, LIST_ROWS_ACTION, runAction } from "./viasocket";

/** Guards against a runaway sheet turning into a 10,000-product storefront. */
const MAX_PRODUCTS = 500;

export type SyncResult = {
  imported: number;
  skipped: { row: number; reason: string }[];
  truncated: boolean;
  /** Imported, but showing the placeholder because the sheet had no image URL. */
  withoutImages: number;
  /** Set when an empty result was refused to protect a stocked shop. */
  keptExisting?: number;
};

/**
 * Re-reads the sheet when the chosen interval has elapsed.
 *
 * The row trigger only reports rows being added, so a price corrected in the
 * sheet, a row deleted, or an event missed while the subscription was dead all
 * leave the shop quietly disagreeing with the spreadsheet. A full re-read on a
 * timer is what closes that gap — the same full replace the Import button does,
 * which is why it is safe to run unattended.
 *
 * There is no scheduler here: this is called as visitors arrive, which is both
 * the cheapest thing that works on any host and enough for a shop, where
 * "nobody is looking" and "nothing needs importing" are the same state.
 */
export async function autoSyncIfDue(): Promise<void> {
  let connection: Connection | null = null;

  try {
    connection = await getShopConnection("catalogue");
  } catch {
    return; // No database, no schedule.
  }

  const minutes = connection?.syncIntervalMinutes;
  if (!connection || !minutes || !connection.spreadsheetId) return;

  const last = connection.lastSyncAt ? Date.parse(connection.lastSyncAt) : 0;
  if (Date.now() - last < minutes * 60_000) return;

  // Only the request that wins the claim does the work.
  if (!(await claimSync(connection.endUserId, "catalogue", connection.lastSyncAt))) {
    return;
  }

  try {
    await syncCatalogue(connection);
  } catch {
    // A failed scheduled sync is not worth surfacing to a shopper; the next
    // interval tries again, and Import now reports the real error.
  }
}

/**
 * Reads the whole product sheet and writes it into the shop's catalogue.
 *
 * Always a full read, never an attempt to apply one row event: the event
 * payload has no published schema, so the sheet itself is the only thing worth
 * trusting. Each row is then upserted, which makes running this twice harmless
 * and leaves untouched products — and their reviews — exactly as they were.
 */
export async function syncCatalogue(
  connection: Connection,
  /**
   * A full re-read reconciles: rows deleted from the sheet leave the shop. A
   * live-update delivery does not — the event names one added row, and the
   * read that follows it is only how we learn what that row contains.
   */
  { prune = true }: { prune?: boolean } = {},
): Promise<SyncResult> {
  if (!connection.spreadsheetId || !connection.sheetId) {
    throw new Error("No product sheet is selected.");
  }

  /*
   * Checked here as well as when the sheet is chosen: a pairing saved before
   * this rule existed would otherwise keep firing, and the webhook path never
   * passes through the save screen at all.
   */
  const conflict = await findSheetConflict(
    "catalogue",
    connection.spreadsheetId,
    connection.sheetId,
  );
  if (conflict) {
    throw new Error(
      `"${connection.spreadsheetLabel ?? "That sheet"}" is where this shop writes its orders. Reading products from the order log would replace your catalogue with order rows, so the import was stopped. Point the product catalogue at a different sheet.`,
    );
  }

  const payload = await runAction(connection.scriptId, LIST_ROWS_ACTION, {
    [FIELDS.listRows.spreadsheet]: connection.spreadsheetId,
    [FIELDS.listRows.sheet]: connection.sheetId,
    // Undocumented in the API reference; this is what makes rows come back keyed
    // by their header text rather than by column letter.
    column_key: true,
  });

  const rows = extractRows(payload);
  const mapped = mapRowsToProducts(rows);

  const products = mapped
    .filter((entry): entry is Extract<typeof entry, { ok: true }> => entry.ok)
    .map((entry) => entry.product);

  // Blank trailing rows are padding, not errors — they are never reported.
  const skipped = mapped
    .filter((entry): entry is Extract<typeof entry, { ok: false }> => !entry.ok)
    .filter((entry) => !entry.blank)
    .map(({ row, reason }) => ({ row, reason }));

  const truncated = products.length > MAX_PRODUCTS;
  const kept = products.slice(0, MAX_PRODUCTS);

  /*
   * Never let an empty result delete a stocked shop.
   *
   * An import that yields nothing is a misconfiguration — the wrong tab, a
   * renamed header — far more often than a deliberate "remove every product".
   * A webhook can fire one of these without anybody pressing a button, so this
   * check has to happen BEFORE the write, not after it. Clearing the shelves
   * deliberately means emptying the sheet of everything except its headers,
   * which is a thing somebody has to mean to do.
   */
  if (kept.length === 0) {
    const existing = await countSheetProducts();
    if (existing > 0) {
      return {
        imported: 0,
        skipped,
        truncated: false,
        withoutImages: 0,
        keptExisting: existing,
      };
    }
  }

  await writeSheetProducts(
    kept,
    {
      spreadsheet: connection.spreadsheetLabel ?? connection.spreadsheetId,
      sheet: connection.sheetLabel ?? connection.sheetId,
    },
    { prune },
  );

  await patchConnection(connection.endUserId, "catalogue", {
    lastSyncAt: new Date().toISOString(),
    lastSyncCount: kept.length,
  });

  /*
   * Product pages are cached, so a new row would otherwise wait for the next
   * deploy. This throws when there is no request to hang the revalidation on —
   * a scheduled sync running after the response, or a script — and that is not
   * a failure: those callers write to the database, and the storefront renders
   * on demand, so the next visitor sees the new catalogue regardless.
   */
  try {
    revalidatePath("/", "layout");
  } catch {}

  return {
    imported: kept.length,
    skipped,
    truncated,
    withoutImages: kept.filter(usesFallbackImage).length,
  };

}
