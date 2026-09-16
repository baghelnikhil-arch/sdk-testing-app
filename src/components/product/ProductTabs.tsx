"use client";

import { useState } from "react";
import { Rating } from "@/components/ui/Rating";
import { cn, formatDate } from "@/lib/utils";
import type { Product, Review } from "@/types";

type TabId = "description" | "specifications" | "reviews";

export function ProductTabs({
  product,
  reviews,
}: {
  product: Product;
  reviews: Review[];
}) {
  const [active, setActive] = useState<TabId>("description");

  const tabs: { id: TabId; label: string }[] = [
    { id: "description", label: "Description" },
    { id: "specifications", label: "Specifications" },
    { id: "reviews", label: `Reviews (${reviews.length})` },
  ];

  return (
    <section aria-label="Product information">
      <div role="tablist" className="flex gap-6 border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            id={`tab-${tab.id}`}
            role="tab"
            type="button"
            aria-selected={active === tab.id}
            aria-controls={`panel-${tab.id}`}
            onClick={() => setActive(tab.id)}
            className={cn(
              "relative -mb-px border-b-2 py-3.5 text-sm font-medium transition-colors",
              active === tab.id
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="pt-8">
        {active === "description" && (
          <div
            id="panel-description"
            role="tabpanel"
            aria-labelledby="tab-description"
            className="animate-fade-in max-w-3xl"
          >
            <p className="text-[0.9375rem] leading-relaxed text-pretty text-muted-foreground">
              {product.description}
            </p>

            {product.details && product.details.length > 0 && (
              <ul className="mt-6 flex flex-col gap-2.5">
                {product.details.map((detail) => (
                  <li
                    key={detail}
                    className="flex gap-3 text-sm text-muted-foreground"
                  >
                    <span
                      className="mt-2 h-1 w-1 shrink-0 rounded-full bg-border-strong"
                      aria-hidden="true"
                    />
                    {detail}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {active === "specifications" && (
          <div
            id="panel-specifications"
            role="tabpanel"
            aria-labelledby="tab-specifications"
            className="animate-fade-in max-w-3xl"
          >
            <dl className="divide-y divide-border border-y border-border">
              {Object.entries(product.specifications ?? {}).map(
                ([key, value]) => (
                  <div
                    key={key}
                    className="grid gap-1 py-3.5 sm:grid-cols-[12rem_1fr] sm:gap-4"
                  >
                    <dt className="text-sm font-medium text-foreground">
                      {key}
                    </dt>
                    <dd className="text-sm text-muted-foreground">{value}</dd>
                  </div>
                ),
              )}
            </dl>
          </div>
        )}

        {active === "reviews" && (
          <div
            id="panel-reviews"
            role="tabpanel"
            aria-labelledby="tab-reviews"
            className="animate-fade-in"
          >
            <div className="mb-8 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg border border-border bg-subtle p-5">
              <span className="font-display text-4xl text-foreground">
                {product.rating.toFixed(1)}
              </span>
              <div>
                <Rating value={product.rating} size="md" />
                <p className="mt-1 text-sm text-muted-foreground">
                  Based on {product.reviewCount} verified reviews
                </p>
              </div>
            </div>

            <ul className="flex flex-col gap-6">
              {reviews.map((review) => (
                <li
                  key={review.id}
                  className="border-b border-border pb-6 last:border-b-0 last:pb-0"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <span
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground"
                        aria-hidden="true"
                      >
                        {review.author.slice(0, 1)}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {review.author}
                        </p>
                        <Rating value={review.rating} />
                      </div>
                    </div>
                    <time
                      dateTime={review.date}
                      className="text-xs text-muted-foreground"
                    >
                      {formatDate(review.date)}
                    </time>
                  </div>

                  <h3 className="mt-4 text-sm font-medium text-foreground">
                    {review.title}
                  </h3>
                  <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-pretty text-muted-foreground">
                    {review.body}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
