import { requireAdmin, requireUser } from "./auth";
import type { Owner, Purpose } from "./integration-store";

/**
 * The identifier handed to viaSocket as `unique_identifier`.
 *
 * It is the account's `viasocketId`, fixed at signup — deliberately not the
 * email or the primary key, so neither changing an address nor migrating ids can
 * make viaSocket treat someone as a different person and appear to lose every
 * connection they made.
 */
export async function requireEndUserId(): Promise<string> {
  const user = await requireUser();
  return user.viasocketId;
}

/**
 * Who is allowed to hold a connection for a purpose.
 *
 * The catalogue is the shop's stock, so only an administrator may point it at a
 * spreadsheet — a customer changing what the store sells is not a feature.
 * An order sheet is the shopper's own copy of their own orders, so any
 * signed-in person may connect one, and it is theirs alone: `(userId, purpose)`
 * means one customer's sheet can never be written to by another's checkout.
 */
export async function requireOwner(purpose: Purpose): Promise<Owner> {
  return purpose === "catalogue" ? requireAdmin() : requireUser();
}
