"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

export function ProductGallery({
  images,
  name,
}: {
  images: string[];
  name: string;
}) {
  const [active, setActive] = useState(0);

  return (
    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:gap-4">
      {images.length > 1 && (
        <ul
          className="flex shrink-0 gap-3 sm:w-20 sm:flex-col"
          aria-label={`${name} images`}
        >
          {images.map((image, index) => (
            <li key={image} className="flex-1 sm:flex-none">
              <button
                type="button"
                onClick={() => setActive(index)}
                aria-label={`View image ${index + 1} of ${images.length}`}
                aria-current={index === active}
                className={cn(
                  "relative block aspect-4/5 w-full overflow-hidden rounded-md bg-muted transition-[box-shadow,opacity] duration-200",
                  index === active
                    ? "ring-2 ring-foreground ring-offset-2 ring-offset-background"
                    : "opacity-70 hover:opacity-100",
                )}
              >
                <Image
                  src={image}
                  alt=""
                  fill
                  sizes="80px"
                  className="object-cover"
                />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="relative aspect-4/5 min-w-0 flex-1 overflow-hidden rounded-lg bg-muted">
        {images.map((image, index) => (
          <Image
            key={image}
            src={image}
            alt={
              index === 0
                ? name
                : `${name}, alternate view ${index + 1}`
            }
            fill
            priority={index === 0}
            sizes="(min-width: 1024px) 45vw, 100vw"
            className={cn(
              "object-cover transition-opacity duration-300 ease-out",
              index === active ? "opacity-100" : "opacity-0",
            )}
          />
        ))}
      </div>
    </div>
  );
}
