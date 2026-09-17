import type { Metadata } from "next";
import Image from "next/image";
import { Package } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getOrders } from "@/lib/order-store";
import { formatDate, formatPrice } from "@/lib/utils";

export const metadata: Metadata = { title: "Your orders" };

export default async function AccountPage() {
  // proxy.ts normally redirects first, but this must hold on its own: it is the
  // check that actually has the database, and it is what a direct hit reaches.
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/account");
  const orders = await getOrders(user.id);

  return (
    <>
      <PageHeader
        crumbs={[{ label: "Home", href: "/" }, { label: "Your orders" }]}
        title={`Hello, ${user.name.split(" ")[0]}`}
        description="Everything you have ordered, newest first."
      />

      <div className="container-page py-10 md:py-14">
        {orders.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No orders yet."
            description="When you place an order it will appear here with everything it contained."
            action={{ href: "/shop", label: "Start shopping" }}
          />
        ) : (
          <ul className="flex flex-col gap-6">
            {orders.map((order) => (
              <li
                key={order.id}
                className="rounded-xl border border-border bg-card p-6 shadow-card"
              >
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
                  <div>
                    <p className="font-mono text-sm font-medium text-foreground">
                      {order.reference}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDate(order.createdAt.toISOString())} ·{" "}
                      {order.items.length}{" "}
                      {order.items.length === 1 ? "item" : "items"}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    {order.exported && <Badge tone="accent">Exported</Badge>}
                    <span className="font-display text-xl text-foreground tabular-nums">
                      {formatPrice(order.total)}
                    </span>
                  </div>
                </div>

                <ul className="flex flex-col gap-4 pt-4">
                  {order.items.map((item) => (
                    <li key={item.id} className="flex items-center gap-4">
                      <span className="relative aspect-4/5 w-14 shrink-0 overflow-hidden rounded-md bg-muted">
                        {item.image && (
                          <Image
                            src={item.image}
                            alt=""
                            fill
                            sizes="56px"
                            className="object-cover"
                          />
                        )}
                      </span>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">
                          {item.name}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {[item.size, item.color].filter(Boolean).join(" · ") ||
                            "—"}{" "}
                          · Qty {item.quantity}
                        </p>
                      </div>

                      <span className="text-sm text-foreground tabular-nums">
                        {formatPrice(item.lineTotal)}
                      </span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
