import { requireAdmin, requireUser } from "./auth";

/**
 * The identifier handed to viaSocket as `unique_identifier`.
 *
 * It is the account's `viasocketId`, fixed at signup — deliberately not the
 * email or the primary key, so neither changing an address nor migrating ids can
 * make viaSocket treat someone as a different person and appear to lose every
 * connection they made.
 *
 * Before accounts existed this came from a cookie. Those older connections keep
 * their original identifier and are adopted by the first administrator; see
 * `claimOrphanConnections` in `app/actions/auth.ts`.
 */
export async function requireEndUserId(): Promise<string> {
  const user = await requireUser();
  return user.viasocketId;
}

/** Managing integrations is running the shop, not shopping. */
export async function requireAdminEndUserId(): Promise<string> {
  const admin = await requireAdmin();
  return admin.viasocketId;
}
