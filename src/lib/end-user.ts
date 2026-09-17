import { requireAdmin, requireUser } from "./auth";

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

export { requireAdmin, requireUser };
