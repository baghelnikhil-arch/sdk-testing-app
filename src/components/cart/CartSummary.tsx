"use client";

import { useState } from "react";
import { AlertCircle, Check, Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FREE_SHIPPING_THRESHOLD } from "@/lib/constants";
import { cn, formatPrice } from "@/lib/utils";
import type { CartItem, CartTotals } from "@/types";

function Row({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "muted" | "positive";
}) {
  return (
    <div className="flex items-center justify-between py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={cn(
          "font-medium tabular-nums",
          tone === "positive" ? "text-success" : "text-foreground",
        )}
      >
        {value}
      </span>
    </div>
  );
}

type Outcome =
  | { kind: "exported"; orderId: string; rows: number; sheetLabel: string | null }
  | { kind: "not-configured" }
  | { kind: "failed"; message: string };

export function CartSummary({
  totals,
  items,
}: {
  totals: CartTotals;
  items: CartItem[];
}) {
  const [status, setStatus] = useState<"idle" | "working" | "done">("idle");
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  const payable = totals.total - totals.shipping;
  const remainingForFreeShipping = Math.max(
    0,
    FREE_SHIPPING_THRESHOLD - payable,
  );
  const progress = Math.min(100, (payable / FREE_SHIPPING_THRESHOLD) * 100);

  /**
   * Payment is still simulated — the real side effect is the Google Sheets
   * export, which is skipped quietly when nobody has connected an account.
   */
  async function checkout() {
    setStatus("working");
    setOutcome(null);

    try {
      const response = await fetch("/api/viasocket/export-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map(({ productId, quantity, size, color }) => ({
            productId,
            quantity,
            size,
            color,
          })),
        }),
      });
      const payload = await response.json().catch(() => ({}));

      if (payload.exported) {
        setOutcome({
          kind: "exported",
          orderId: payload.orderId,
          rows: payload.rows,
          sheetLabel: payload.sheetLabel ?? null,
        });
      } else if (payload.reason === "not-configured") {
        setOutcome({ kind: "not-configured" });
      } else {
        setOutcome({
          kind: "failed",
          message: payload.error || "The order could not be exported.",
        });
      }
    } catch (error) {
      setOutcome({ kind: "failed", message: (error as Error).message });
    } finally {
      setStatus("done");
    }
  }

  return (
    <div className="rounded-xl border border-border bg-subtle p-6">
      <h2 className="text-base font-semibold text-foreground">Order summary</h2>

      <div className="mt-4 divide-y divide-border">
        <div className="pb-2">
          <Row label={`Subtotal (${totals.itemCount} items)`} value={formatPrice(totals.subtotal)} />
          {totals.discount > 0 && (
            <Row
              label="Discount"
              value={`− ${formatPrice(totals.discount)}`}
              tone="positive"
            />
          )}
          <Row
            label="Shipping"
            value={totals.shipping === 0 ? "Free" : formatPrice(totals.shipping)}
            tone={totals.shipping === 0 ? "positive" : undefined}
          />
        </div>

        <div className="flex items-center justify-between pt-4">
          <span className="text-sm font-semibold text-foreground">Total</span>
          <span className="font-display text-2xl text-foreground tabular-nums">
            {formatPrice(totals.total)}
          </span>
        </div>
      </div>

      {remainingForFreeShipping > 0 ? (
        <div className="mt-5">
          <p className="text-xs text-muted-foreground">
            Spend{" "}
            <span className="font-medium text-foreground">
              {formatPrice(remainingForFreeShipping)}
            </span>{" "}
            more for free shipping.
          </p>
          <div
            className="mt-2 h-1.5 overflow-hidden rounded-full bg-border"
            role="progressbar"
            aria-valuenow={Math.round(progress)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Progress toward free shipping"
          >
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      ) : (
        <p className="mt-5 inline-flex items-center gap-1.5 text-xs font-medium text-success">
          <Check className="h-3.5 w-3.5" aria-hidden="true" />
          Your order ships free.
        </p>
      )}

      {status === "done" ? (
        <div role="status" className="mt-6 flex flex-col gap-3">
          {outcome?.kind === "exported" && (
            <p className="flex items-start gap-2.5 rounded-md bg-accent-50 px-4 py-3 text-sm text-accent-700">
              <Check className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>
                Order{" "}
                <span className="font-medium">{outcome.orderId}</span> written to{" "}
                <span className="font-medium">
                  {outcome.sheetLabel ?? "your sheet"}
                </span>{" "}
                — {outcome.rows} {outcome.rows === 1 ? "row" : "rows"}.
              </span>
            </p>
          )}

          {outcome?.kind === "failed" && (
            <p className="flex items-start gap-2.5 rounded-md border border-sale/25 bg-sale/5 px-4 py-3 text-sm text-sale">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              {outcome.message}
            </p>
          )}

          <p className="rounded-md bg-muted px-4 py-3 text-sm text-muted-foreground">
            This is a demo storefront — checkout is not connected to a payment
            provider.
          </p>
        </div>
      ) : (
        <Button
          size="lg"
          className="mt-6 w-full"
          disabled={status === "working" || totals.itemCount === 0}
          onClick={checkout}
        >
          {status === "working" ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Lock className="h-4 w-4" aria-hidden="true" />
          )}
          {status === "working" ? "Processing" : "Checkout"}
        </Button>
      )}

      <p className="mt-3 text-center text-xs text-muted-foreground">
        Taxes calculated at checkout. Thirty-day returns.
      </p>
    </div>
  );
}
