"use client";

import Script from "next/script";
import { ChevronDown, Loader2 } from "lucide-react";
import { labelStyles, selectStyles } from "@/components/ui/field";
import { cn } from "@/lib/utils";
import type { Option } from "@/hooks/use-google-sheets";

/** Loads the viaSocket connect script wherever a connect button is rendered. */
export function ViasocketScript() {
  return (
    <Script
      id="viasocket-connect-script"
      src="https://embed.viasocket.com/prod-connectcomponent.js"
      strategy="afterInteractive"
    />
  );
}

function SelectField({
  id,
  label,
  value,
  options,
  disabled,
  loading,
  placeholder,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  options: Option[];
  disabled?: boolean;
  loading?: boolean;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label htmlFor={id} className={labelStyles()}>
        {label}
      </label>
      <div className="relative">
        <select
          id={id}
          value={value}
          disabled={disabled || loading}
          onChange={(event) => onChange(event.target.value)}
          className={selectStyles()}
        >
          <option value="">{loading ? "Loading…" : placeholder}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        {loading ? (
          <Loader2
            className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground"
            aria-hidden="true"
          />
        ) : (
          <ChevronDown
            className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
        )}
      </div>
    </div>
  );
}

/**
 * The spreadsheet and tab pickers. The tab picker stays disabled until a
 * spreadsheet is chosen, because a tab id only means anything inside one.
 */
export function SheetsFields({
  idPrefix,
  spreadsheets,
  sheets,
  spreadsheetId,
  sheetId,
  loadingField,
  onChooseSpreadsheet,
  onChooseSheet,
  stacked = false,
}: {
  /** Keeps input ids unique when both presentations exist on one page. */
  idPrefix: string;
  spreadsheets: Option[];
  sheets: Option[];
  spreadsheetId: string;
  sheetId: string;
  loadingField: "spreadsheet" | "sheet" | null;
  onChooseSpreadsheet: (value: string) => void;
  onChooseSheet: (value: string) => void;
  /** Narrow columns (the checkout panel) stack instead of sitting side by side. */
  stacked?: boolean;
}) {
  return (
    <div className={cn("grid gap-4", !stacked && "sm:grid-cols-2 sm:gap-5")}>
      <SelectField
        id={`${idPrefix}-spreadsheet`}
        label="Spreadsheet"
        value={spreadsheetId}
        options={spreadsheets}
        loading={loadingField === "spreadsheet"}
        placeholder="Choose a spreadsheet"
        onChange={onChooseSpreadsheet}
      />

      <SelectField
        id={`${idPrefix}-tab`}
        label="Tab"
        value={sheetId}
        options={sheets}
        disabled={!spreadsheetId}
        loading={loadingField === "sheet"}
        placeholder={spreadsheetId ? "Choose a tab" : "Pick a spreadsheet first"}
        onChange={onChooseSheet}
      />
    </div>
  );
}
