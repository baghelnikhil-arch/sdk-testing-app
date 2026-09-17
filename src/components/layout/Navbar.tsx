"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, Heart, Menu, Search, ShoppingBag, X } from "lucide-react";
import { MobileMenu } from "./MobileMenu";
import { AccountMenu, type NavUser } from "./AccountMenu";
import { SearchBar } from "@/components/ui/SearchBar";
import { useCart } from "@/hooks/use-cart";
import { useWishlist } from "@/hooks/use-wishlist";
import { NAV_LINKS, SITE } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { Category } from "@/types";

function CountBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="absolute -top-0.5 -right-0.5 flex h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full bg-primary px-1 text-[0.625rem] font-semibold text-primary-foreground tabular-nums">
      {count > 99 ? "99+" : count}
    </span>
  );
}

const ICON_BUTTON =
  "relative flex h-10 w-10 items-center justify-center rounded-md text-foreground transition-colors hover:bg-muted";

export function Navbar({
  categories,
  user,
}: {
  categories: Category[];
  user: NavUser | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { totals, hydrated: cartReady } = useCart();
  const { count: wishlistCount, hydrated: wishlistReady } = useWishlist();

  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [query, setQuery] = useState("");
  const categoriesRef = useRef<HTMLDivElement>(null);

  // Any navigation closes whatever was open.
  useEffect(() => {
    setMenuOpen(false);
    setSearchOpen(false);
    setCategoriesOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!categoriesOpen) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!categoriesRef.current?.contains(event.target as Node)) {
        setCategoriesOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setCategoriesOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [categoriesOpen]);

  const cartCount = cartReady ? totals.itemCount : 0;
  const wishCount = wishlistReady ? wishlistCount : 0;

  function submitSearch(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = query.trim();
    router.push(trimmed ? `/shop?q=${encodeURIComponent(trimmed)}` : "/shop");
    setSearchOpen(false);
  }

  const navLinkClass = (href: string) =>
    cn(
      "relative py-2 text-sm font-medium transition-colors",
      pathname === href
        ? "text-foreground"
        : "text-muted-foreground hover:text-foreground",
    );

  const isShopSection = pathname.startsWith("/shop");

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur-md">
      <div className="container-page">
        <div className="flex h-16 items-center justify-between gap-4 md:h-18">
          <Link
            href="/"
            className="font-display text-xl tracking-[0.18em] text-foreground uppercase md:text-[1.375rem]"
          >
            {SITE.name}
          </Link>

          <nav aria-label="Main" className="hidden lg:block">
            <ul className="flex items-center gap-8">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className={navLinkClass(link.href)}>
                    {link.label}
                  </Link>
                </li>
              ))}

              <li>
                <div className="relative" ref={categoriesRef}>
                  <button
                    type="button"
                    onClick={() => setCategoriesOpen((open) => !open)}
                    aria-expanded={categoriesOpen}
                    aria-haspopup="true"
                    className={cn(
                      "flex items-center gap-1 py-2 text-sm font-medium transition-colors",
                      isShopSection && pathname !== "/shop"
                        ? "text-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    Categories
                    <ChevronDown
                      className={cn(
                        "h-3.5 w-3.5 transition-transform duration-200",
                        categoriesOpen && "rotate-180",
                      )}
                      aria-hidden="true"
                    />
                  </button>

                  {categoriesOpen && (
                    <div className="absolute top-full left-1/2 mt-3 w-60 -translate-x-1/2 animate-fade-up rounded-lg border border-border bg-card p-2 shadow-overlay">
                      <ul>
                        {categories.map((category) => (
                          <li key={category.slug}>
                            <Link
                              href={`/shop/${category.slug}`}
                              className="flex flex-col rounded-md px-3 py-2.5 transition-colors hover:bg-muted"
                            >
                              <span className="text-sm font-medium text-foreground">
                                {category.name}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {category.tagline}
                              </span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </li>
            </ul>
          </nav>

          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => setSearchOpen((open) => !open)}
              aria-expanded={searchOpen}
              aria-label={searchOpen ? "Close search" : "Open search"}
              className={ICON_BUTTON}
            >
              {searchOpen ? (
                <X className="h-5 w-5" strokeWidth={1.75} />
              ) : (
                <Search className="h-5 w-5" strokeWidth={1.75} />
              )}
            </button>

            <Link
              href="/wishlist"
              aria-label={`Wishlist, ${wishCount} items`}
              className={cn(ICON_BUTTON, "hidden sm:flex")}
            >
              <Heart className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
              <CountBadge count={wishCount} />
            </Link>

            <Link
              href="/cart"
              aria-label={`Cart, ${cartCount} items`}
              className={ICON_BUTTON}
            >
              <ShoppingBag
                className="h-5 w-5"
                strokeWidth={1.75}
                aria-hidden="true"
              />
              <CountBadge count={cartCount} />
            </Link>

            <span className="ml-1 hidden lg:block">
              <AccountMenu user={user} />
            </span>

            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
              className={cn(ICON_BUTTON, "lg:hidden")}
            >
              <Menu className="h-5 w-5" strokeWidth={1.75} />
            </button>
          </div>
        </div>
      </div>

      {searchOpen && (
        <div className="animate-fade-in border-t border-border bg-background">
          <form onSubmit={submitSearch} className="container-page py-4">
            <SearchBar
              id="global-search"
              value={query}
              onChange={setQuery}
              autoFocus
              placeholder="Search for products, categories or tags"
              className="mx-auto max-w-2xl"
            />
          </form>
        </div>
      )}

      <MobileMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        cartCount={cartCount}
        wishlistCount={wishCount}
        categories={categories}
        user={user}
      />
    </header>
  );
}
