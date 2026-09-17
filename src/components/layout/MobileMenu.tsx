"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, LogOut, Package, Settings, ShoppingBag, X } from "lucide-react";
import { logout } from "@/app/actions/auth";
import type { NavUser } from "./AccountMenu";
import { NAV_LINKS, SITE } from "@/lib/constants";
import type { Category } from "@/types";
import { cn } from "@/lib/utils";

export function MobileMenu({
  open,
  onClose,
  cartCount,
  wishlistCount,
  categories,
  user,
}: {
  open: boolean;
  onClose: () => void;
  cartCount: number;
  wishlistCount: number;
  categories: Category[];
  user: NavUser | null;
}) {
  const pathname = usePathname();
  const panelRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Close on Escape, lock the page behind the drawer, and move focus in.
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open || !mounted) return null;

  const linkClass = (href: string) =>
    cn(
      "flex items-center justify-between rounded-md px-3 py-3 text-base font-medium transition-colors",
      pathname === href
        ? "bg-muted text-foreground"
        : "text-foreground hover:bg-muted",
    );

  /*
   * Portalled to the body: the sticky header uses `backdrop-blur`, which makes
   * it a containing block for fixed children and would trap the drawer inside
   * its 64px box.
   */
  return createPortal(
    <div className="fixed inset-0 z-60 lg:hidden">
      <button
        type="button"
        aria-label="Close menu"
        onClick={onClose}
        className="absolute inset-0 animate-fade-in bg-foreground/35 backdrop-blur-[2px]"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        tabIndex={-1}
        className="absolute inset-y-0 right-0 flex w-[min(20rem,86vw)] animate-slide-in-right flex-col bg-background shadow-overlay outline-none"
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-border px-4">
          <span className="font-display text-lg tracking-[0.16em] uppercase">
            {SITE.name}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-4 py-5">
          <ul className="flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={onClose}
                  className={linkClass(link.href)}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>

          <p className="mt-7 mb-2 px-3 text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
            Categories
          </p>
          <ul className="flex flex-col gap-1">
            {categories.map((category) => (
              <li key={category.slug}>
                <Link
                  href={`/shop/${category.slug}`}
                  onClick={onClose}
                  className={linkClass(`/shop/${category.slug}`)}
                >
                  {category.name}
                </Link>
              </li>
            ))}
          </ul>

          <p className="mt-7 mb-2 px-3 text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
            Account
          </p>
          <ul className="flex flex-col gap-1">
            {user ? (
              <>
                <li>
                  <Link href="/account" onClick={onClose} className={linkClass("/account")}>
                    <span className="flex items-center gap-2.5">
                      <Package className="h-4 w-4" aria-hidden="true" />
                      Your orders
                    </span>
                  </Link>
                </li>
                {user.role === "admin" && (
                  <li>
                    <Link
                      href="/settings/integrations"
                      onClick={onClose}
                      className={linkClass("/settings/integrations")}
                    >
                      <span className="flex items-center gap-2.5">
                        <Settings className="h-4 w-4" aria-hidden="true" />
                        Integrations
                      </span>
                    </Link>
                  </li>
                )}
                <li>
                  <form action={logout}>
                    <button
                      type="submit"
                      className="flex w-full items-center gap-2.5 rounded-md px-3 py-3 text-base font-medium text-foreground transition-colors hover:bg-muted hover:text-sale"
                    >
                      <LogOut className="h-4 w-4" aria-hidden="true" />
                      Sign out
                    </button>
                  </form>
                </li>
              </>
            ) : (
              <>
                <li>
                  <Link href="/login" onClick={onClose} className={linkClass("/login")}>
                    Sign in
                  </Link>
                </li>
                <li>
                  <Link href="/signup" onClick={onClose} className={linkClass("/signup")}>
                    Create account
                  </Link>
                </li>
              </>
            )}
          </ul>
        </nav>

        <div className="grid shrink-0 grid-cols-2 gap-2 border-t border-border p-4">
          <Link
            href="/wishlist"
            onClick={onClose}
            className="flex items-center justify-center gap-2 rounded-md border border-border-strong px-3 py-3 text-sm font-medium transition-colors hover:bg-muted"
          >
            <Heart className="h-4 w-4" aria-hidden="true" />
            Wishlist
            {wishlistCount > 0 && (
              <span className="text-muted-foreground">({wishlistCount})</span>
            )}
          </Link>

          <Link
            href="/cart"
            onClick={onClose}
            className="flex items-center justify-center gap-2 rounded-md bg-primary px-3 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
          >
            <ShoppingBag className="h-4 w-4" aria-hidden="true" />
            Cart
            {cartCount > 0 && <span className="opacity-80">({cartCount})</span>}
          </Link>
        </div>
      </div>
    </div>,
    document.body,
  );
}
