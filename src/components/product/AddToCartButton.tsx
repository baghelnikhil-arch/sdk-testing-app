"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ShoppingBag } from "lucide-react";
import { Button, type ButtonSize, type ButtonVariant } from "@/components/ui/Button";
import { useCart } from "@/hooks/use-cart";
import type { Product } from "@/types";

/**
 * Add-to-cart with its own confirmation state, so every surface that adds to the
 * cart gives the same feedback.
 */
export function AddToCartButton({
  product,
  size: sizeOption,
  color,
  quantity = 1,
  variant = "primary",
  buttonSize = "md",
  className,
  label = "Add to cart",
  onAdded,
}: {
  product: Product;
  size?: string;
  color?: string;
  quantity?: number;
  variant?: ButtonVariant;
  buttonSize?: ButtonSize;
  className?: string;
  label?: string;
  onAdded?: () => void;
}) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  if (!product.inStock) {
    return (
      <Button variant="secondary" size={buttonSize} disabled className={className}>
        Out of stock
      </Button>
    );
  }

  return (
    <Button
      variant={variant}
      size={buttonSize}
      className={className}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        addItem(product, { size: sizeOption, color, quantity });
        setAdded(true);
        onAdded?.();
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => setAdded(false), 1600);
      }}
    >
      {added ? (
        <>
          <Check className="h-4 w-4" aria-hidden="true" />
          Added
        </>
      ) : (
        <>
          <ShoppingBag className="h-4 w-4" aria-hidden="true" />
          {label}
        </>
      )}
      <span className="sr-only">{added ? `${product.name} added to cart` : ""}</span>
    </Button>
  );
}
