import type { Review } from "@/types";

/**
 * Reviews are generated from a fixed pool so every product has something to
 * show without hand-writing 100 entries. Deterministic — no randomness — so the
 * server and client always render the same thing.
 */
const POOL = [
  {
    author: "Maya R.",
    rating: 5,
    title: "Better than I expected",
    body: "Ordered on a whim and it has become the thing I reach for first. The fabric feels substantial without being heavy, and it has held up through a dozen washes with no change in shape.",
  },
  {
    author: "Daniel K.",
    rating: 4,
    title: "Great quality, sizing runs slightly large",
    body: "Really well made — the finishing is noticeably better than similarly priced options. I'd size down if you're between sizes; the fit is a little more relaxed than the photos suggest.",
  },
  {
    author: "Priya S.",
    rating: 5,
    title: "Worth every penny",
    body: "You can tell where the money went the moment you open the box. Arrived quickly, packaged carefully, and it looks exactly like the photographs.",
  },
  {
    author: "Tomás L.",
    rating: 4,
    title: "Happy with it",
    body: "Does exactly what I wanted it to do. Took off a star only because I wish there were one or two more colours to choose from.",
  },
  {
    author: "Erin W.",
    rating: 5,
    title: "Bought a second one",
    body: "Liked the first so much I ordered another a week later. Good with almost everything I own, which is more than I can say for most of my wardrobe.",
  },
  {
    author: "Josh M.",
    rating: 3,
    title: "Good, not perfect",
    body: "No complaints about the construction, but it took longer to arrive than the estimate suggested. The product itself is solid.",
  },
];

const DATES = [
  "2026-08-12",
  "2026-07-02",
  "2026-05-21",
  "2026-04-08",
  "2026-02-17",
  "2026-01-05",
];

/** Stable per-product review list. */
export function getReviewsForProduct(productId: string): Review[] {
  const seed = Number(productId) || productId.length;
  const count = 3 + (seed % 2);

  return Array.from({ length: count }, (_, i) => {
    const entry = POOL[(seed + i) % POOL.length];
    return {
      id: `${productId}-r${i}`,
      productId,
      date: DATES[(seed + i * 2) % DATES.length],
      ...entry,
    };
  });
}
