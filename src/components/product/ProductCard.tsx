"use client";

import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Price } from "@/components/ui/Price";
import { Rating } from "@/components/ui/Rating";
import { AddToCartButton } from "./AddToCartButton";
import { WishlistButton } from "./WishlistButton";
import { categoryBySlug } from "@/data/categories";
import { cn, discountPercent } from "@/lib/utils";
import type { Product } from "@/types";

/** Tells the browser how wide the image will actually be at each breakpoint. */
const CARD_SIZES =
  "(min-width: 1280px) 20vw, (min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw";

export function ProductCard({
  product,
  priority = false,
  className,
}: {
  product: Product;
  priority?: boolean;
  className?: string;
}) {
  const discount = discountPercent(product.price, product.originalPrice);
  const categoryName = categoryBySlug.get(product.category)?.name ?? product.category;
  const secondImage = product.images[1];

  return (
    <article className={cn("group flex flex-col", className)}>
      <div className="relative overflow-hidden rounded-lg bg-muted">
        <Link
          href={`/product/${product.id}`}
          className="block focus-visible:outline-offset-4"
          aria-label={product.name}
        >
          <div className="relative aspect-4/5">
            <Image
              src={product.images[0]}
              alt={product.name}
              fill
              sizes={CARD_SIZES}
              priority={priority}
              className={cn(
                "object-cover transition-transform duration-500 ease-out",
                "group-hover:scale-[1.04]",
                secondImage && "group-hover:opacity-0",
                !product.inStock && "opacity-70",
              )}
            />

            {/* Second shot fades in underneath on hover — desktop affordance only. */}
            {secondImage && (
              <Image
                src={secondImage}
                alt=""
                aria-hidden="true"
                fill
                sizes={CARD_SIZES}
                className="object-cover opacity-0 transition-opacity duration-500 ease-out group-hover:opacity-100"
              />
            )}
          </div>
        </Link>

        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-3">
          <div className="flex flex-col items-start gap-1.5">
            {discount && <Badge tone="sale">-{discount}%</Badge>}
            {product.newArrival && !discount && <Badge tone="neutral">New</Badge>}
            {!product.inStock && <Badge tone="outline">Sold out</Badge>}
          </div>

          <WishlistButton
            productId={product.id}
            productName={product.name}
            size="sm"
            className="pointer-events-auto bg-background/85 shadow-card backdrop-blur-sm hover:bg-background"
          />
        </div>
      </div>

      <div className="flex flex-1 flex-col pt-3.5">
        <p className="text-[0.6875rem] font-medium tracking-[0.12em] text-muted-foreground uppercase">
          {categoryName}
        </p>

        {/* Reserved for two lines so ratings, prices and buttons align across a row. */}
        <h3 className="mt-1.5 min-h-10 text-sm leading-snug font-medium text-foreground">
          <Link
            href={`/product/${product.id}`}
            className="line-clamp-2 transition-colors hover:text-primary"
          >
            {product.name}
          </Link>
        </h3>

        {/* Sheet-imported products often have no reviews; five empty stars
            would read as a bad product rather than a new one. */}
        {product.reviewCount > 0 ? (
          <Rating
            value={product.rating}
            reviewCount={product.reviewCount}
            className="mt-2"
          />
        ) : (
          <p className="mt-2 text-xs text-muted-foreground">No reviews yet</p>
        )}

        <Price
          price={product.price}
          originalPrice={product.originalPrice}
          className="mt-2.5"
        />

        <AddToCartButton
          product={product}
          variant="secondary"
          buttonSize="sm"
          className="mt-4 w-full"
        />
      </div>
    </article>
  );
}
