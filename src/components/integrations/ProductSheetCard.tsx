"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Check,
  DownloadCloud,
  Loader2,
  Radio,
  RadioTower,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { SheetsConnectionCard } from "./SheetsConnectionCard";
import { INTERVAL_LABELS, SYNC_INTERVALS } from "@/lib/sync-intervals";
import { useCatalogue } from "@/hooks/use-catalogue";
import { useGoogleSheets } from "@/hooks/use-google-sheets";
import { formatDate } from "@/lib/utils";

type SyncResult = {
  imported: number;
  skipped: { row: number; reason: string }[];
  truncated: boolean;
  withoutImages: number;
  keptExisting?: number;
};

const COLUMNS: { header: string; note: string }[] = [
  { header: "Name", note: "Required. Also becomes the product URL." },
  { header: "Price", note: "Required. Currency symbols and commas are fine." },
  { header: "Category", note: "Men, Women or Accessories. Anything else lands in Accessories." },
  { header: "Description", note: "Shown on the product page." },
  { header: "Image", note: "One or more https URLs, comma separated." },
  { header: "Original Price", note: "Set it higher than Price to show a discount." },
  { header: "Sizes", note: "Comma separated, e.g. S, M, L." },
  { header: "Colors", note: "Comma separated. Add a hex after a colon: Black:#1b1b1b." },
  { header: "In Stock", note: "TRUE or FALSE. Defaults to TRUE." },
  { header: "SKU", note: "Optional stable id. Otherwise derived from the name." },
];

/**
 * The catalogue-import connection.
 *
 * Its own account and its own spreadsheet: a shop may well read products from a
 * merchandising sheet owned by one person and write orders to a finance sheet
 * owned by another.
 */
export function ProductSheetCard() {
  const catalogue = useCatalogue();
  const router = useRouter();

  const [syncing, setSyncing] = useState(false);
  const [watchBusy, setWatchBusy] = useState(false);
  const [result, setResult] = useState<SyncResult | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  // Saving a product sheet imports it server-side, so the list this card holds
  // and the server-rendered shop are both a step behind until they are told.
  const onSaved = useCallback(
    async (payload: { syncError?: string | null }) => {
      setLocalError(payload.syncError ?? null);
      await catalogue.refresh();
      router.refresh();
    },
    [catalogue, router],
  );

  const sheets = useGoogleSheets("catalogue", onSaved);

  const status = sheets.status;

  async function syncNow() {
    setSyncing(true);
    setLocalError(null);
    setResult(null);
    try {
      const response = await fetch("/api/viasocket/sync-catalogue", {
        method: "POST",
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Import failed.");

      setResult(payload);
      await Promise.all([catalogue.refresh(), sheets.refresh()]);
      // Product pages are server-rendered, so they need a re-fetch too.
      router.refresh();
    } catch (error) {
      setLocalError((error as Error).message);
    } finally {
      setSyncing(false);
    }
  }

  async function toggleWatch(next: boolean) {
    setWatchBusy(true);
    setLocalError(null);
    try {
      const response = await fetch("/api/viasocket/watch", {
        method: next ? "POST" : "DELETE",
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not change live updates.");
      await sheets.refresh();
    } catch (error) {
      setLocalError((error as Error).message);
    } finally {
      setWatchBusy(false);
    }
  }

  async function chooseInterval(minutes: number | null) {
    setLocalError(null);
    try {
      const response = await fetch("/api/viasocket/sync-schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ minutes }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not change the schedule.");
      await sheets.refresh();
    } catch (error) {
      setLocalError((error as Error).message);
    }
  }

  return (
    <SheetsConnectionCard
      sheets={sheets}
      title="Product catalogue"
      blurb="Read products from a spreadsheet. Rows you add there appear in the shop, with their own product pages."
      readyLabel="Importing"
      needsSheetLabel="Needs a sheet"
      destinationLabel="Products come from"
    >
      <div className="mt-6 border-t border-border pt-5">
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={syncNow} disabled={syncing}>
            {syncing ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <DownloadCloud className="h-4 w-4" aria-hidden="true" />
            )}
            {syncing ? "Importing" : "Import products now"}
          </Button>

          <Button
            variant="secondary"
            disabled={watchBusy}
            onClick={() => toggleWatch(!status?.watching)}
          >
            {watchBusy ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : status?.watching ? (
              <RadioTower className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Radio className="h-4 w-4" aria-hidden="true" />
            )}
            {status?.watching ? "Live updates on" : "Turn on live updates"}
          </Button>
        </div>

        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          {status?.watching
            ? "New rows are imported automatically as they are added. Import now also picks up edits and deletions."
            : "Live updates let viaSocket call this app when a row is added, so it needs a public address (a deployed URL, or a tunnel while developing). On localhost, use Import now instead."}
        </p>

        {/*
          The trigger only reports rows being ADDED. A price corrected in the
          sheet, or a row deleted, never fires it — so a periodic full re-read
          is what keeps the shop and the spreadsheet actually equal.
        */}
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <label
            htmlFor="sync-interval"
            className="text-sm font-medium text-foreground"
          >
            Re-check the sheet
          </label>

          <select
            id="sync-interval"
            value={status?.syncIntervalMinutes ?? ""}
            onChange={(event) =>
              chooseInterval(
                event.target.value ? Number(event.target.value) : null,
              )
            }
            className="h-10 rounded-md border border-border bg-background px-3 text-sm text-foreground transition-colors hover:border-foreground/30 focus:border-foreground focus:outline-none"
          >
            <option value="">Only when I ask</option>
            {SYNC_INTERVALS.map((minutes) => (
              <option key={minutes} value={minutes}>
                {INTERVAL_LABELS[minutes]}
              </option>
            ))}
          </select>
        </div>

        <p className="mt-2.5 text-xs leading-relaxed text-muted-foreground">
          {status?.syncIntervalMinutes
            ? `The whole sheet is read again every ${INTERVAL_LABELS[status.syncIntervalMinutes] ?? `${status.syncIntervalMinutes} minutes`}, so edits and deleted rows catch up too. It runs while the shop has visitors.`
            : "Live updates only notice rows being added. Pick an interval to have edits and deleted rows picked up as well."}
        </p>

        {status?.lastSyncAt && (
          <p className="mt-3 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">
              {status.lastSyncCount ?? 0}
            </span>{" "}
            {status.lastSyncCount === 1 ? "product" : "products"} in the shop from
            this sheet · last imported {formatDate(status.lastSyncAt)}
          </p>
        )}

        {localError && (
          <p
            role="alert"
            className="mt-4 flex items-start gap-2.5 rounded-md border border-sale/25 bg-sale/5 px-4 py-3 text-sm text-sale"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            {localError}
          </p>
        )}

        {result && (
          <div role="status" className="mt-4">
            {result.imported > 0 ? (
              <p className="flex items-center gap-2 text-sm text-success">
                <Check className="h-4 w-4" aria-hidden="true" />
                Imported {result.imported}{" "}
                {result.imported === 1 ? "product" : "products"}.
              </p>
            ) : (
              /* Zero is the confusing case — say why, not just the number. */
              <p className="flex items-start gap-2.5 rounded-md border border-border bg-muted px-4 py-3 text-sm text-muted-foreground">
                <AlertTriangle
                  className="mt-0.5 h-4 w-4 shrink-0 text-foreground"
                  aria-hidden="true"
                />
                <span>
                  <span className="font-medium text-foreground">
                    No products were imported.
                  </span>{" "}
                  {result.skipped.length > 0
                    ? "Every row was skipped — see the reasons below."
                    : "The tab looks empty. Check you picked the right one."}{" "}
                  A product sheet needs a <code>Name</code> column and a{" "}
                  <code>Price</code> column in its first row.
                  {result.keptExisting ? (
                    <>
                      {" "}
                      The {result.keptExisting} product
                      {result.keptExisting === 1 ? "" : "s"} already in the shop
                      were left alone.
                    </>
                  ) : null}
                </span>
              </p>
            )}

            {result.withoutImages > 0 && (
              <p className="mt-2 text-xs text-muted-foreground">
                {result.withoutImages} of them have no image and show a
                placeholder — add <code>https://</code> URLs to the{" "}
                <code>Image</code> column.
              </p>
            )}

            {result.truncated && (
              <p className="mt-2 text-xs text-muted-foreground">
                Only the first 500 rows were imported.
              </p>
            )}

            {result.skipped.length > 0 && (
              <details className="mt-3">
                <summary className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground">
                  {result.skipped.length} row
                  {result.skipped.length === 1 ? "" : "s"} skipped
                </summary>
                <ul className="mt-2 flex flex-col gap-1">
                  {result.skipped.slice(0, 8).map((entry) => (
                    <li
                      key={entry.row}
                      className="text-xs text-muted-foreground"
                    >
                      Row {entry.row} — {entry.reason}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        )}

        <details className="mt-5">
          <summary className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground">
            Columns this sheet can use
          </summary>
          <dl className="mt-3 divide-y divide-border border-y border-border">
            {COLUMNS.map((column) => (
              <div
                key={column.header}
                className="grid gap-0.5 py-2.5 sm:grid-cols-[9rem_1fr] sm:gap-4"
              >
                <dt className="font-mono text-xs text-foreground">
                  {column.header}
                </dt>
                <dd className="text-xs text-muted-foreground">{column.note}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-xs text-muted-foreground">
            Header names are matched loosely — <code>Product Name</code>,{" "}
            <code>product_name</code> and <code>NAME</code> all work. Columns you
            leave out fall back to sensible defaults.
          </p>
        </details>
      </div>
    </SheetsConnectionCard>
  );
}
