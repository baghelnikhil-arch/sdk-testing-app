import { PURPOSES, type Purpose } from "./integration-store";

/** Reads a purpose off a request, rejecting anything not in the known set. */
export function parsePurpose(value: unknown): Purpose | null {
  return PURPOSES.includes(value as Purpose) ? (value as Purpose) : null;
}

export function purposeFromSearch(url: string): Purpose | null {
  return parsePurpose(new URL(url).searchParams.get("purpose") ?? "orders");
}
