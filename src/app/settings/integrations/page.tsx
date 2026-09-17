import type { Metadata } from "next";
import { OrderExportCard } from "@/components/integrations/SheetsConnectionCard";
import { ProductSheetCard } from "@/components/integrations/ProductSheetCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { getCurrentUser } from "@/lib/auth";
import { ShieldAlert } from "lucide-react";

export const metadata: Metadata = {
  title: "Integrations",
  description: "Connect Aurelle to the tools you already use.",
};

export default async function IntegrationsPage() {
  /*
   * proxy.ts only knows whether a session cookie exists, so it can keep signed-
   * out visitors away but cannot tell a customer from an administrator. That
   * decision needs the database, and belongs here.
   */
  const user = await getCurrentUser();

  if (user?.role !== "admin") {
    return (
      <>
        <PageHeader
          crumbs={[{ label: "Home", href: "/" }, { label: "Integrations" }]}
          title="Integrations"
          description="Connecting the shop to other services is handled by whoever runs it."
        />
        <div className="container-page py-10 md:py-14">
          <EmptyState
            icon={ShieldAlert}
            title="This page is for shop administrators."
            description="Your account can shop, save a wishlist and see its orders, but not change how the store connects to Google Sheets."
            action={{ href: "/shop", label: "Back to the shop" }}
            secondaryAction={{ href: "/account", label: "Your orders" }}
          />
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        crumbs={[
          { label: "Home", href: "/" },
          { label: "Settings" },
          { label: "Integrations" },
        ]}
        title="Integrations"
        description="Connect the tools you already use. Aurelle never sees your Google password — you authorise through Google's own consent screen."
      />

      <div className="container-page py-10 md:py-14">
        {/*
          Two independent connections. Each has its own Google account and its
          own spreadsheet: reading the catalogue and writing orders are different
          jobs, often owned by different people.
        */}
        <div className="flex max-w-3xl flex-col gap-6">
          <ProductSheetCard />
          <OrderExportCard />
        </div>
      </div>
    </>
  );
}
