"use client";

import Image from "next/image";
import { AlertCircle, Check, Loader2, Pencil, RefreshCw, Unplug } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { SheetsFields, ViasocketScript } from "./SheetsFields";
import { SHEETS_ICON, useGoogleSheets } from "@/hooks/use-google-sheets";

type Sheets = ReturnType<typeof useGoogleSheets>;

/**
 * One connection, rendered in full.
 *
 * The admin page renders it around the catalogue controls. It takes an
 * already-constructed hook so the caller can drive its own controls from the
 * same state.
 */
export function SheetsConnectionCard({
  sheets,
  title,
  blurb,
  readyLabel = "Active",
  needsSheetLabel = "Needs a sheet",
  destinationLabel = "Sheet in use",
  children,
}: {
  sheets: Sheets;
  title: string;
  blurb: string;
  readyLabel?: string;
  needsSheetLabel?: string;
  destinationLabel?: string;
  /** Purpose-specific controls, shown once a sheet is chosen. */
  children?: React.ReactNode;
}) {
  const { status, error, busy, saved, editing } = sheets;
  const connected = Boolean(status?.connected);

  return (
    <section className="rounded-xl border border-border bg-card p-6 shadow-card md:p-8">
      <ViasocketScript />

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-border bg-background">
            <Image src={SHEETS_ICON} alt="" width={24} height={24} />
          </span>

          <div>
            <h2 className="font-display text-2xl tracking-tight text-foreground">
              {title}
            </h2>
            <p className="mt-1.5 max-w-md text-sm leading-relaxed text-muted-foreground">
              {blurb}
            </p>
          </div>
        </div>

        {status && (
          <Badge tone={status.ready ? "accent" : "outline"}>
            {status.ready
              ? readyLabel
              : connected
                ? needsSheetLabel
                : "Not connected"}
          </Badge>
        )}
      </div>

      {status && !status.configured && (
        <p className="mt-6 flex items-start gap-2.5 rounded-md border border-border bg-muted px-4 py-3 text-sm text-muted-foreground">
          <AlertCircle
            className="mt-0.5 h-4 w-4 shrink-0 text-foreground"
            aria-hidden="true"
          />
          <span>
            <span className="font-medium text-foreground">
              Set VIASOCKET_EMBED_SECRET
            </span>{" "}
            in your environment to enable this integration. Get it from the
            viaSocket Install Code page.
          </span>
        </p>
      )}

      {status?.storage === "none" && (
        <p className="mt-6 flex items-start gap-2.5 rounded-md border border-sale/25 bg-sale/5 px-4 py-3 text-sm text-sale">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            <span className="font-medium">No database is configured.</span>{" "}
            Set <code>DATABASE_URL</code> in the environment so connections can be
            saved, then redeploy.
          </span>
        </p>
      )}

      {error && (
        <p
          role="alert"
          className="mt-6 flex items-start gap-2.5 rounded-md border border-sale/25 bg-sale/5 px-4 py-3 text-sm text-sale"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}

      {!connected ? (
        <Button
          size="lg"
          className="mt-7"
          disabled={busy === "connect" || !status?.configured}
          onClick={sheets.connect}
        >
          {busy === "connect" ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Image src={SHEETS_ICON} alt="" width={18} height={18} />
          )}
          Connect Google Sheets
        </Button>
      ) : (
        <div className="mt-7">
          {editing ? (
            <>
              <SheetsFields
                idPrefix="catalogue-sheets"
                spreadsheets={sheets.spreadsheets}
                sheets={sheets.sheets}
                spreadsheetId={sheets.spreadsheetId}
                sheetId={sheets.sheetId}
                loadingField={sheets.loadingField}
                onChooseSpreadsheet={sheets.chooseSpreadsheet}
                onChooseSheet={sheets.chooseSheet}
              />

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Button
                  disabled={!sheets.canSave || busy === "save"}
                  onClick={sheets.save}
                >
                  {busy === "save" ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Check className="h-4 w-4" aria-hidden="true" />
                  )}
                  Save sheet
                </Button>

                {status?.ready && (
                  <Button variant="ghost" onClick={sheets.cancelEdit}>
                    Cancel
                  </Button>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="rounded-lg border border-border bg-subtle px-4 py-3.5">
                <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                  {destinationLabel}
                </p>
                <p className="mt-1.5 text-sm text-foreground">
                  <span className="font-medium">{status?.spreadsheetLabel}</span>
                  {status?.sheetLabel && (
                    <>
                      {" · "}
                      <span className="font-medium">{status.sheetLabel}</span>
                    </>
                  )}
                </p>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <Button variant="secondary" onClick={sheets.beginEdit}>
                  <Pencil className="h-4 w-4" aria-hidden="true" />
                  Change sheet
                </Button>

                <Button
                  variant="secondary"
                  disabled={busy === "connect"}
                  onClick={sheets.connect}
                >
                  {busy === "connect" ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <RefreshCw className="h-4 w-4" aria-hidden="true" />
                  )}
                  New connection
                </Button>

                <Button
                  variant="ghost"
                  disabled={busy === "disconnect"}
                  onClick={sheets.disconnect}
                  className="text-muted-foreground hover:text-sale"
                >
                  {busy === "disconnect" ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Unplug className="h-4 w-4" aria-hidden="true" />
                  )}
                  Disconnect
                </Button>
              </div>

              {children}
            </>
          )}

          {saved && !editing && (
            <p
              role="status"
              className="mt-5 flex items-center gap-2 text-sm text-success"
            >
              <Check className="h-4 w-4" aria-hidden="true" />
              Sheet saved.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
