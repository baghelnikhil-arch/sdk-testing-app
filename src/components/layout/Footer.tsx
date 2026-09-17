import Link from "next/link";
import { Facebook, Instagram, Twitter } from "lucide-react";
import { FOOTER_SECTIONS, SITE } from "@/lib/constants";
import type { Category } from "@/types";

const SOCIALS = [
  { label: "Instagram", href: "https://instagram.com", icon: Instagram },
  { label: "Facebook", href: "https://facebook.com", icon: Facebook },
  { label: "Twitter", href: "https://twitter.com", icon: Twitter },
];

export function Footer({
  categories,
  isAdmin = false,
}: {
  categories: Category[];
  isAdmin?: boolean;
}) {
  const sections = [
    {
      title: "Shop",
      links: categories.map((category) => ({
        href: `/shop/${category.slug}`,
        label: category.name,
      })),
    },
    ...FOOTER_SECTIONS.filter((section) => section.title !== "Shop").map(
      (section) =>
        section.title === "Company"
          ? {
              ...section,
              // Only the people who can use it should be sent there.
              links: section.links.filter(
                (link) => isAdmin || link.href !== "/admin",
              ),
            }
          : section,
    ),
  ];

  return (
    <footer className="mt-auto border-t border-border bg-subtle">
      <div className="container-page py-14 md:py-16">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_repeat(3,1fr)] lg:gap-8">
          <div className="max-w-xs">
            <Link
              href="/"
              className="font-display text-xl tracking-[0.18em] text-foreground uppercase"
            >
              {SITE.name}
            </Link>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              {SITE.tagline} A demo storefront built to show what a considered
              commerce experience can feel like.
            </p>

            <ul className="mt-6 flex items-center gap-2">
              {SOCIALS.map((social) => (
                <li key={social.label}>
                  <a
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={social.label}
                    className="flex h-9 w-9 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:border-border-strong hover:bg-background hover:text-foreground"
                  >
                    <social.icon className="h-4 w-4" aria-hidden="true" />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {sections.map((section) => (
            <nav key={section.title} aria-label={section.title}>
              <h2 className="text-xs font-semibold tracking-[0.16em] text-foreground uppercase">
                {section.title}
              </h2>
              <ul className="mt-4 flex flex-col gap-3">
                {section.links.map((link) => (
                  <li key={`${section.title}-${link.label}`}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            &copy; 2026 Demo Store. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground">
            Prices shown in USD. This is a demo — no orders are processed.
          </p>
        </div>
      </div>
    </footer>
  );
}
