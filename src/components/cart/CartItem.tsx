"use client";

import Image from "next/image";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { Price } from "@/components/ui/Price";
import { QuantitySelector } from "@/components/ui/QuantitySelector";
import { MAX_QUANTITY } from "@/hooks/use-cart";
import { formatCategory, formatPrice } from "@/lib/utils";
import type { CartLine } from "@/types";

export function CartItem({
  line,
  onQuantityChange,
  onRemove,
}: {
  line: CartLine;
  onQuantityChange: (quantity: number) => void;
  onRemove: () => void;
}) {
  const { product } = line;
  const categoryName = formatCategory(product.category);

  const variant = [line.size, line.color].filter(Boolean).join(" · ");

  return (
    <li className="flex gap-4 py-6 first:pt-0 sm:gap-6">
      <Link
        href={`/product/${product.id}`}
        className="relative aspect-4/5 w-20 shrink-0 overflow-hidden rounded-md bg-muted sm:w-24"
      >
        <Image
          src={product.images[0]}
          alt={product.name}
          fill
          sizes="96px"
          className="object-cover"
        />
      </Link>

      <div className="flex min-w-0 flex-1 flex-col sm:flex-row sm:gap-6">
        <div className="min-w-0 flex-1">
          <p className="text-[0.6875rem] font-medium tracking-[0.12em] text-muted-foreground uppercase">
            {categoryName}
          </p>

          <h3 className="mt-1 text-sm font-medium text-foreground">
            <Link
              href={`/product/${product.id}`}
              className="transition-colors hover:text-primary"
            >
              {product.name}
            </Link>
          </h3>

          {variant && (
            <p className="mt-1 text-sm text-muted-foreground">{variant}</p>
          )}

          <Price
            price={product.price}
            originalPrice={product.originalPrice}
            size="sm"
            className="mt-2 sm:hidden"
          />

          <div className="mt-3 flex items-center gap-3 sm:mt-4">
            <QuantitySelector
              value={line.quantity}
              onChange={onQuantityChange}
              max={MAX_QUANTITY}
              size="sm"
              label={`Quantity for ${product.name}`}
            />

            <button
              type="button"
              onClick={onRemove}
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-sale"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="sr-only sm:not-sr-only">Remove</span>
              <span className="sr-only">{product.name} from cart</span>
            </button>
          </div>
        </div>

        {/* On wide screens price and line total get their own columns. */}
        <div className="hidden w-28 shrink-0 sm:block">
          <Price
            price={product.price}
            originalPrice={product.originalPrice}
            size="sm"
          />
        </div>

        <div className="mt-3 flex items-center justify-between sm:mt-0 sm:w-24 sm:shrink-0 sm:justify-end">
          <span className="text-sm text-muted-foreground sm:hidden">
            Subtotal
          </span>
          <span className="text-sm font-semibold text-foreground tabular-nums">
            {formatPrice(line.lineTotal)}
          </span>
        </div>
      </div>
    </li>
  );
}
