"use client";

import Image from "next/image";
import {
  AlertCircle,
  Check,
  Loader2,
  Pencil,
  RefreshCw,
  Unplug,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  SheetsFields,
  ViasocketScript,
} from "@/components/integrations/SheetsFields";
import { SHEETS_ICON, useGoogleSheets } from "@/hooks/use-google-sheets";

const ACTION_LINK =
  "inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground";

/**
 * A shopper's own copy of their own orders.
 *
 * Connected here rather than in a settings screen because it is decided at the
 * moment it matters, and it belongs to the person checking out: the connection
 * is stored under their account, so one customer's orders can never be written
 * into another's spreadsheet. The catalogue connection, which decides what the
 * whole shop sells, lives in the admin page instead — different owner,
 * different blast radius, same underlying hook.
 */
export function CheckoutSheetsPanel() {
  const sheets = useGoogleSheets();
  const { status, error, busy, editing } = sheets;

  // Nothing to offer until the integration is available, and nothing to offer a
  // visitor who is not signed in: there is no account to hang a connection on.
  if (!status || !status.configured || !status.signedIn) return null;

  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-card">
      <ViasocketScript />

      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-background">
          <Image src={SHEETS_ICON} alt="" width={18} height={18} />
        </span>

        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-foreground">
            Export to Google Sheets
          </h2>

          {status.connected ? (
            status.ready ? (
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                Goes to{" "}
                <span className="font-medium text-foreground">
                  {status.spreadsheetLabel}
                </span>
                {status.sheetLabel && (
                  <>
                    {" · "}
                    <span className="font-medium text-foreground">
                      {status.sheetLabel}
                    </span>
                  </>
                )}
              </p>
            ) : (
              <p className="mt-0.5 text-xs text-muted-foreground">
                Choose where orders should go.
              </p>
            )
          ) : (
            <p className="mt-0.5 text-xs text-muted-foreground">
              Keep your own copy: every order you place is added to a
              spreadsheet in your Google account.
            </p>
          )}
        </div>
      </div>

      {error && (
        <p
          role="alert"
          className="mt-4 flex items-start gap-2 rounded-md border border-sale/25 bg-sale/5 px-3 py-2 text-xs text-sale"
        >
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}

      {!status.connected ? (
        <Button
          variant="secondary"
          size="sm"
          className="mt-4 w-full"
          disabled={busy === "connect"}
          onClick={sheets.connect}
        >
          {busy === "connect" ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Image src={SHEETS_ICON} alt="" width={16} height={16} />
          )}
          Connect Google Sheets
        </Button>
      ) : editing ? (
        <div className="mt-4">
          <SheetsFields
            idPrefix="checkout-sheets"
            stacked
            spreadsheets={sheets.spreadsheets}
            sheets={sheets.sheets}
            spreadsheetId={sheets.spreadsheetId}
            sheetId={sheets.sheetId}
            loadingField={sheets.loadingField}
            onChooseSpreadsheet={sheets.chooseSpreadsheet}
            onChooseSheet={sheets.chooseSheet}
          />

          <div className="mt-4 flex items-center gap-2">
            <Button
              size="sm"
              className="flex-1"
              disabled={!sheets.canSave || busy === "save"}
              onClick={sheets.save}
            >
              {busy === "save" ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Check className="h-4 w-4" aria-hidden="true" />
              )}
              Save
            </Button>

            {status.ready && (
              <Button variant="ghost" size="sm" onClick={sheets.cancelEdit}>
                Cancel
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2.5 border-t border-border pt-3.5">
          <button type="button" onClick={sheets.beginEdit} className={ACTION_LINK}>
            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
            Change sheet
          </button>

          <button
            type="button"
            onClick={sheets.connect}
            disabled={busy === "connect"}
            className={ACTION_LINK}
          >
            {busy === "connect" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            New connection
          </button>

          <button
            type="button"
            onClick={sheets.disconnect}
            disabled={busy === "disconnect"}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-sale"
          >
            {busy === "disconnect" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <Unplug className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            Disconnect
          </button>
        </div>
      )}

      <p className="mt-3 text-[0.6875rem] leading-relaxed text-muted-foreground">
        Only your own orders are exported, to a sheet only you have chosen.
      </p>
    </section>
  );
}
