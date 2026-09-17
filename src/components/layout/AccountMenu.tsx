"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { LogOut, Package, Settings } from "lucide-react";
import { logout } from "@/app/actions/auth";
import { cn } from "@/lib/utils";

export type NavUser = {
  id: string;
  name: string;
  email: string;
  role: string;
};

const ITEM =
  "flex w-full items-center gap-2.5 rounded-md px-3 py-2.5 text-left text-sm text-foreground transition-colors hover:bg-muted";

/** The signed-in menu, or a plain sign-in link when there is nobody to show. */
export function AccountMenu({ user }: { user: NavUser | null }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (!user) {
    return (
      <Link
        href="/login"
        className="inline-flex h-10 items-center rounded-md px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
      >
        Sign in
      </Link>
    );
  }

  const initial = user.name.trim().charAt(0).toUpperCase() || "?";

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`Account menu for ${user.name}`}
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold transition-colors",
          open
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-foreground hover:bg-border",
        )}
      >
        {initial}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute top-full right-0 mt-3 w-60 animate-fade-up rounded-lg border border-border bg-card p-2 shadow-overlay"
        >
          <div className="border-b border-border px-3 pt-1 pb-3">
            <p className="truncate text-sm font-medium text-foreground">
              {user.name}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {user.email}
            </p>
          </div>

          <div className="pt-2">
            <Link href="/account" className={ITEM} onClick={() => setOpen(false)}>
              <Package className="h-4 w-4" aria-hidden="true" />
              Your orders
            </Link>

            {/* Integrations belong to whoever runs the shop, not to shoppers. */}
            {user.role === "admin" && (
              <Link
                href="/admin"
                className={ITEM}
                onClick={() => setOpen(false)}
              >
                <Settings className="h-4 w-4" aria-hidden="true" />
                Admin
              </Link>
            )}

            <form action={logout}>
              <button type="submit" className={cn(ITEM, "hover:text-sale")}>
                <LogOut className="h-4 w-4" aria-hidden="true" />
                Sign out
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
