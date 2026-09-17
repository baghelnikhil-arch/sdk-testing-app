import jwt from "jsonwebtoken";

/**
 * viaSocket Apps API client — SERVER ONLY.
 *
 * The signing secret and the embed token must never reach the browser, and a
 * `script_id` is a credential: anyone holding it can run the connected app as
 * that user. Nothing in this module may be imported from a Client Component;
 * the browser talks to it only through the route handlers in
 * `src/app/api/viasocket/`.
 *
 * viaSocket owns the Google connection — we never see or refresh Google tokens.
 */

const API = process.env.VIASOCKET_API_URL ?? "https://flow-api.viasocket.com";
const RUN = process.env.VIASOCKET_RUN_URL ?? "https://flow.sokt.io";
const ORG_ID = process.env.VIASOCKET_ORG_ID ?? "75477";
const PROJECT_ID = process.env.VIASOCKET_PROJECT_ID ?? "projHAHpg8Pw";

/** Google Sheets. */
export const SERVICE_ID = process.env.VIASOCKET_SERVICE_ID ?? "rowqm5xi2";

/**
 * "Add Multiple Rows" — chosen over "Add New Row to Sheet" on purpose: it takes
 * a JSON array and creates the header row from the JSON keys when the sheet is
 * empty, so the user does not have to prepare columns before exporting.
 */
export const ADD_ROWS_ACTION = "rowdd8u5lg1k";

/** "List Rows in Sheet" — reads the catalogue back out as objects per row. */
export const LIST_ROWS_ACTION = "rowyu1mevdtq";

/** "Row Added Or Updated" — fires when the operator adds a product row. */
export const ROW_ADDED_TRIGGER = "rowempdbsh48";

/**
 * Field keys, per action.
 *
 * These are NOT interchangeable and the casing is not a typo: "Add Multiple
 * Rows" spells it `spreadSheet_Id` while "List Rows in Sheet" and the row
 * trigger spell it `spreadSheet_id`. Sending the wrong one returns an empty
 * option list with a 200 rather than an error, so every call site takes its keys
 * from here instead of typing them.
 */
export const FIELDS = {
  addRows: { spreadsheet: "spreadSheet_Id", sheet: "sheet_id" },
  listRows: { spreadsheet: "spreadSheet_id", sheet: "sheet_id" },
  rowTrigger: { spreadsheet: "spreadSheet_id", sheet: "sheet_id" },
} as const;

/** Back-compat aliases for the order-export path. */
export const FIELD_SPREADSHEET = FIELDS.addRows.spreadsheet;
export const FIELD_SHEET = FIELDS.addRows.sheet;

export type Option = { label: string; value: string };

export class ViasocketNotConfiguredError extends Error {
  constructor() {
    super(
      "VIASOCKET_EMBED_SECRET is not set. Add it from your viaSocket Install Code page.",
    );
    this.name = "ViasocketNotConfiguredError";
  }
}

function secret() {
  const value = process.env.VIASOCKET_EMBED_SECRET;
  if (!value) throw new ViasocketNotConfiguredError();
  return value;
}

export function isConfigured() {
  return Boolean(process.env.VIASOCKET_EMBED_SECRET);
}

/**
 * Signed per end user, on demand. `unique_identifier` must be stable for the
 * life of the account — change it and the user appears to have lost every
 * connection they made.
 */
export function embedToken(endUserId: string) {
  return jwt.sign(
    {
      org_id: ORG_ID,
      project_id: PROJECT_ID,
      unique_identifier: endUserId,
    },
    secret(),
  );
}

async function call<T>(
  path: string,
  endUserId: string,
  body?: unknown,
  method: "GET" | "POST" | "PUT" | "DELETE" = "POST",
): Promise<T> {
  /*
   * Node's fetch throws `TypeError: Request with GET/HEAD method cannot have
   * body` for ANY non-null body — an empty string included. The viaSocket
   * reference client passes `body: ""` unconditionally, which makes every GET
   * endpoint throw before it leaves the process; GET sends no body at all here.
   */
  const init: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      authorization: embedToken(endUserId),
    },
    cache: "no-store",
  };
  if (method !== "GET") {
    init.body = body === undefined ? "" : JSON.stringify(body);
  }

  const response = await fetch(`${API}${path}`, init);

  const payload = await response.json();
  if (!response.ok || payload.success === false) {
    throw new Error(
      payload.message || `viaSocket ${path} failed with ${response.status}`,
    );
  }
  return payload.data as T;
}

type Flow = {
  id: string;
  title: string;
  status: string;
  service_id: string;
  auth_id: string;
};

/** Every flow this user has — one per enabled app, one per trigger subscription. */
export async function listUserFlows(endUserId: string): Promise<Flow[]> {
  const response = await fetch(`${API}/projects/${PROJECT_ID}/integrations`, {
    headers: { authorization: embedToken(endUserId) },
    cache: "no-store",
  });
  const payload = await response.json();
  return payload.data?.flows ?? [];
}

/**
 * Whether a subscription still exists on viaSocket's side.
 *
 * It frequently does not. viaSocket replaces a trigger flow rather than
 * refreshing it — the old script_id is marked `deleted` and a new one appears —
 * and nothing notifies us, so a stored subscriptionId is a claim to be checked,
 * never proof that events are still being delivered.
 */
export async function isFlowActive(
  endUserId: string,
  scriptId: string,
): Promise<boolean> {
  const flows = await listUserFlows(endUserId);
  return flows.some((flow) => flow.id === scriptId && flow.status === "active");
}

/**
 * The script_id of an app this user already enabled, or null.
 *
 * Matching on `auth_id` as well as service matters: a user who connects a second
 * Google account has two authentications for one service, and reusing the first
 * account's flow would silently write to the wrong Drive.
 */
export async function findEnabledApp(
  endUserId: string,
  authId?: string,
  serviceId = SERVICE_ID,
): Promise<string | null> {
  const flows = await listUserFlows(endUserId);
  return (
    flows.find(
      (flow) =>
        flow.service_id === serviceId &&
        flow.status === "active" &&
        (authId ? flow.auth_id === authId : true),
    )?.id ?? null
  );
}

/**
 * Enabling is only needed to *run actions* — a trigger subscription needs the
 * auth_id alone. Always check `findEnabledApp` first: enabling twice leaves two
 * script_ids for one app.
 */
export async function enableApp(
  endUserId: string,
  authId: string,
  serviceId = SERVICE_ID,
): Promise<string> {
  const data = await call<{ script_id: string }>(
    `/embed/enable/${serviceId}/${authId}`,
    endUserId,
  );
  return data.script_id;
}

/** Returns the existing script_id when there is one, enabling only if needed. */
export async function ensureEnabled(endUserId: string, authId: string) {
  return (await findEnabledApp(endUserId, authId)) ?? enableApp(endUserId, authId);
}

/** Every app this user has connected. */
export async function listConnections(endUserId: string) {
  return call<unknown[]>("/embed/authentications", endUserId, undefined, "GET");
}

/** Disconnects an app. Disable the flows built on it first, or they break. */
export async function revokeConnection(endUserId: string, authId: string) {
  return call(
    `/embed/authentications/revoke/${authId}`,
    endUserId,
    undefined,
    "DELETE",
  );
}

/** Turns a flow off (status 0) or back on (status 1). */
export async function setFlowStatus(
  endUserId: string,
  scriptId: string,
  status: 0 | 1 = 0,
) {
  return call(
    `/embed/updatestatus/${scriptId}?status=${status}`,
    endUserId,
    undefined,
    "PUT",
  );
}

/**
 * The values one field accepts, scoped by what is already chosen.
 *
 * `fieldKey` is the field's FULL dotted path for nested fields, and
 * `existingFields` is shaped exactly like `inputData` — nested, never flattened
 * into dotted keys. Get either wrong and the call succeeds while returning
 * nothing, which is the single most confusing failure in this API.
 */
export async function listOptions(
  endUserId: string,
  actionVersionId: string,
  fieldKey: string,
  existingFields: Record<string, unknown> = {},
  authId: string,
): Promise<{ options: Option[]; offset: string | null }> {
  const data = await call<Option[] | { data: Option[]; offset?: string }>(
    `/embed/list-options/${actionVersionId}`,
    endUserId,
    { fieldKey, auth_id: authId, existingFields },
  );

  // Two shapes, one helper: paginated fields nest the list and add a cursor.
  const options = Array.isArray(data) ? data : (data?.data ?? []);
  const offset = Array.isArray(data) ? null : (data?.offset ?? null);
  return { options, offset };
}

/** Runs an action. No embed token — the script_id is itself the credential. */
export async function runAction<T = unknown>(
  scriptId: string,
  actionVersionId: string,
  inputData: Record<string, unknown>,
): Promise<T> {
  const response = await fetch(`${RUN}/func/${scriptId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action_version_id: actionVersionId, inputData }),
    cache: "no-store",
  });

  const payload = await response.json();
  if (!payload.success) throw new Error(payload.message || "Action failed");
  return payload.data as T;
}

/**
 * Subscribes to an event. Note this needs only the `auth_id` — a trigger
 * subscription does not require the app to have been enabled.
 *
 * Returns the subscription's own `script_id`, which is the ONLY handle to it:
 * the flows listing cannot distinguish a subscription from an enabled app, so
 * losing this value leaves an undeletable subscription.
 */
export async function subscribeEvent(
  endUserId: string,
  triggerVersionId: string,
  authId: string,
  inputData: Record<string, unknown>,
  webhook: string,
  meta: Record<string, unknown> = {},
): Promise<string> {
  const data = await call<{ script_id: string }>(
    `/embed/subscribe-event/${triggerVersionId}`,
    endUserId,
    { auth_id: authId, inputData, webhook, meta },
  );
  return data.script_id;
}

export async function updateSubscription(
  endUserId: string,
  subscriptionScriptId: string,
  changes: Record<string, unknown>,
) {
  return call(
    `/embed/update-subscribed-event/${subscriptionScriptId}`,
    endUserId,
    changes,
    "PUT",
  );
}
