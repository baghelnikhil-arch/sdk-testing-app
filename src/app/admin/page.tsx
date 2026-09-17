import type { Metadata } from "next";
import { Boxes, ShieldAlert, ShoppingBag, Users } from "lucide-react";
import { ProductSheetCard } from "@/components/integrations/ProductSheetCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const metadata: Metadata = {
  title: "Admin",
  description: "Manage the shop's catalogue.",
};

async function shopStats() {
  try {
    const [products, fromSheet, orders, customers] = await Promise.all([
      db().product.count(),
      db().product.count({ where: { source: "sheet" } }),
      db().order.count(),
      db().user.count(),
    ]);
    return { products, fromSheet, orders, customers };
  } catch {
    // The page should still render its controls if a count fails.
    return null;
  }
}

export default async function AdminPage() {
  /*
   * proxy.ts keeps signed-out visitors away, but it only knows whether a session
   * cookie exists — telling a customer from an administrator needs the database,
   * so the decision is made here.
   */
  const user = await getCurrentUser();

  if (user?.role !== "admin") {
    return (
      <>
        <PageHeader
          crumbs={[{ label: "Home", href: "/" }, { label: "Admin" }]}
          title="Admin"
          description="Running the shop is handled by its administrators."
        />
        <div className="container-page py-10 md:py-14">
          <EmptyState
            icon={ShieldAlert}
            title="This page is for shop administrators."
            description="Your account can shop, save a wishlist and see its orders, but not change what the store sells."
            action={{ href: "/shop", label: "Back to the shop" }}
            secondaryAction={{ href: "/account", label: "Your orders" }}
          />
        </div>
      </>
    );
  }

  const stats = await shopStats();

  return (
    <>
      <PageHeader
        crumbs={[{ label: "Home", href: "/" }, { label: "Admin" }]}
        title="Admin"
        description="Manage what the shop sells. Products come from a Google Sheet you connect here."
      />

      <div className="container-page py-10 md:py-14">
        <div className="max-w-3xl">
          {stats && (
            <dl className="mb-10 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-4">
              {[
                { label: "Products", value: stats.products, icon: Boxes },
                { label: "From sheet", value: stats.fromSheet, icon: Boxes },
                { label: "Orders", value: stats.orders, icon: ShoppingBag },
                { label: "Accounts", value: stats.customers, icon: Users },
              ].map((stat) => (
                <div key={stat.label} className="bg-card px-5 py-4">
                  <dt className="flex items-center gap-1.5 text-xs font-medium tracking-[0.1em] text-muted-foreground uppercase">
                    <stat.icon className="h-3.5 w-3.5" aria-hidden="true" />
                    {stat.label}
                  </dt>
                  <dd className="mt-1.5 font-display text-2xl text-foreground tabular-nums">
                    {stat.value}
                  </dd>
                </div>
              ))}
            </dl>
          )}

          <ProductSheetCard />
        </div>
      </div>
    </>
  );
}
