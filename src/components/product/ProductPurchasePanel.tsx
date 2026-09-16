"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Heart, Truck } from "lucide-react";
import { AddToCartButton } from "./AddToCartButton";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Price } from "@/components/ui/Price";
import { QuantitySelector } from "@/components/ui/QuantitySelector";
import { Rating } from "@/components/ui/Rating";
import { MAX_QUANTITY, useCart } from "@/hooks/use-cart";
import { useWishlist } from "@/hooks/use-wishlist";
import { FREE_SHIPPING_THRESHOLD } from "@/lib/constants";
import { cn, discountPercent, formatCategory, formatPrice } from "@/lib/utils";
import type { Product } from "@/types";

export function ProductPurchasePanel({ product }: { product: Product }) {
  const router = useRouter();
  const { addItem } = useCart();
  const { isWishlisted, toggle, hydrated } = useWishlist();

  const [size, setSize] = useState(product.sizes?.[0]);
  const [color, setColor] = useState(product.colors?.[0]?.name);
  const [quantity, setQuantity] = useState(1);

  const discount = discountPercent(product.price, product.originalPrice);
  const categoryName = formatCategory(product.category);
  const wishlisted = hydrated && isWishlisted(product.id);

  function buyNow() {
    addItem(product, { size, color, quantity });
    router.push("/cart");
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <p className="text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">
          {categoryName}
        </p>
        {product.newArrival && <Badge tone="accent">New</Badge>}
        {discount && <Badge tone="sale">-{discount}%</Badge>}
      </div>

      <h1 className="mt-3 font-display text-3xl leading-tight tracking-tight text-balance text-foreground md:text-4xl">
        {product.name}
      </h1>

      {product.reviewCount > 0 ? (
        <Rating
          value={product.rating}
          reviewCount={product.reviewCount}
          size="md"
          showValue
          className="mt-4"
        />
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">No reviews yet</p>
      )}

      <Price
        price={product.price}
        originalPrice={product.originalPrice}
        size="lg"
        className="mt-5"
      />

      <p className="mt-5 text-[0.9375rem] leading-relaxed text-pretty text-muted-foreground">
        {product.description}
      </p>

      {product.sizes && product.sizes.length > 0 && (
        <fieldset className="mt-8">
          <legend className="mb-3 text-sm font-medium text-foreground">
            Size{" "}
            <span className="font-normal text-muted-foreground">— {size}</span>
          </legend>
          <div className="flex flex-wrap gap-2">
            {product.sizes.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setSize(option)}
                aria-pressed={size === option}
                className={cn(
                  "h-11 min-w-14 rounded-md border px-3 text-sm font-medium transition-colors duration-150",
                  size === option
                    ? "border-foreground bg-foreground text-background"
                    : "border-border-strong text-foreground hover:border-foreground/40 hover:bg-muted",
                )}
              >
                {option}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      {product.colors && product.colors.length > 0 && (
        <fieldset className="mt-7">
          <legend className="mb-3 text-sm font-medium text-foreground">
            Colour{" "}
            <span className="font-normal text-muted-foreground">— {color}</span>
          </legend>
          <div className="flex flex-wrap gap-2.5">
            {product.colors.map((option) => (
              <button
                key={option.name}
                type="button"
                onClick={() => setColor(option.name)}
                aria-pressed={color === option.name}
                aria-label={option.name}
                title={option.name}
                className={cn(
                  "relative flex h-9 w-9 items-center justify-center rounded-full border transition-[box-shadow] duration-150",
                  color === option.name
                    ? "border-transparent ring-2 ring-foreground ring-offset-2 ring-offset-background"
                    : "border-border-strong hover:ring-1 hover:ring-border-strong hover:ring-offset-2 hover:ring-offset-background",
                )}
                style={{ backgroundColor: option.hex }}
              />
            ))}
          </div>
        </fieldset>
      )}

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <QuantitySelector
          value={quantity}
          onChange={setQuantity}
          max={MAX_QUANTITY}
        />

        <p className="text-sm">
          {product.inStock ? (
            <span className="inline-flex items-center gap-1.5 text-success">
              <span
                className="h-1.5 w-1.5 rounded-full bg-success"
                aria-hidden="true"
              />
              In stock, ships within 48 hours
            </span>
          ) : (
            <span className="text-muted-foreground">
              Currently out of stock
            </span>
          )}
        </p>
      </div>

      <div className="mt-6 flex flex-col gap-3">
        <div className="flex gap-3">
          <AddToCartButton
            product={product}
            size={size}
            color={color}
            quantity={quantity}
            buttonSize="lg"
            className="flex-1"
          />

          <button
            type="button"
            onClick={() => toggle(product.id)}
            aria-pressed={wishlisted}
            aria-label={
              wishlisted ? "Remove from wishlist" : "Add to wishlist"
            }
            className={cn(
              "flex h-12 w-12 shrink-0 items-center justify-center rounded-md border transition-colors duration-150",
              wishlisted
                ? "border-sale/30 bg-sale/5 text-sale"
                : "border-border-strong text-foreground hover:bg-muted",
            )}
          >
            <Heart
              className={cn("h-5 w-5", wishlisted && "fill-sale")}
              strokeWidth={1.75}
              aria-hidden="true"
            />
          </button>
        </div>

        <Button
          variant="secondary"
          size="lg"
          disabled={!product.inStock}
          onClick={buyNow}
        >
          Buy Now
        </Button>
      </div>

      <div className="mt-8 rounded-lg border border-border bg-subtle p-4">
        <p className="flex items-start gap-3 text-sm text-muted-foreground">
          <Truck
            className="mt-0.5 h-4 w-4 shrink-0 text-foreground"
            strokeWidth={1.5}
            aria-hidden="true"
          />
          <span>
            Free shipping on orders over{" "}
            <span className="font-medium text-foreground">
              {formatPrice(FREE_SHIPPING_THRESHOLD)}
            </span>
            . Thirty-day returns, postage covered.
          </span>
        </p>
      </div>
    </div>
  );
}
