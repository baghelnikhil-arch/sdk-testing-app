import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { authErrorResponse, requireAdmin } from "@/lib/auth";
import { getConnection, patchConnection } from "@/lib/integration-store";
import {
  FIELDS,
  ROW_ADDED_TRIGGER,
  ViasocketNotConfiguredError,
  isFlowActive,
  setFlowStatus,
  subscribeEvent,
} from "@/lib/viasocket";

/**
 * Live updates: subscribe to the row trigger so new products appear without
 * anyone pressing Import.
 *
 * Subscribing means handing viaSocket a URL it will call from its own servers.
 * An address that only resolves on this machine cannot be called, and viaSocket
 * has no way to tell us delivery is failing — the subscription would simply sit
 * there, silently dead, and it cannot be found again from the flows listing.
 * So the address is validated before anything is created.
 */
const PRIVATE_HOST =
  /^(localhost|127\.|0\.0\.0\.0$|\[?::1\]?$|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)|\.local$/i;

export function publicOrigin(): string | null {
  const explicit = process.env.APP_PUBLIC_URL?.trim();
  if (explicit) return explicit;

  /*
   * Vercel exposes the stable production domain. The per-deployment host
   * (VERCEL_URL) is deliberately NOT used: it changes on every deploy, and the
   * webhook is registered once with whatever URL was current at subscribe time.
   */
  const production = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  return production ? `https://${production}` : null;
}

function resolvePublicBaseUrl(): { origin: string } | { error: string } {
  const raw = publicOrigin();

  if (!raw) {
    return {
      error:
        "Live updates need an address viaSocket can call. Deploy the app, or set APP_PUBLIC_URL to a tunnel such as ngrok while developing, then restart.",
    };
  }

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { error: `APP_PUBLIC_URL is not a valid URL: "${raw}"` };
  }

  if (url.protocol !== "https:") {
    return {
      error: `APP_PUBLIC_URL must start with https:// — got "${url.protocol}//".`,
    };
  }

  if (PRIVATE_HOST.test(url.hostname)) {
    return {
      error: `viaSocket cannot reach "${url.hostname}" — it only resolves on this machine. Use a tunnel or a deployed URL, or use Import now instead.`,
    };
  }

  return { origin: url.origin };
}

export async function POST() {
  try {
    const admin = await requireAdmin();
    const connection = await getConnection(admin.id);

    if (!connection?.spreadsheetId || !connection?.sheetId) {
      return NextResponse.json(
        { error: "Choose a product sheet first." },
        { status: 409 },
      );
    }

    const base = resolvePublicBaseUrl();
    if ("error" in base) {
      return NextResponse.json({ error: base.error }, { status: 400 });
    }

    /*
     * Only skip the work if the stored subscription is genuinely still there.
     * Trusting the column alone made this button a no-op in exactly the case it
     * exists for: viaSocket had replaced the flow, the app still held the old
     * script_id, and pressing "live updates" cheerfully reported success while
     * subscribing to nothing.
     */
    if (connection.subscriptionId) {
      const stillActive = await isFlowActive(
        connection.endUserId,
        connection.subscriptionId,
      );
      if (stillActive) return NextResponse.json({ watching: true });
    }

    const webhookToken = randomBytes(24).toString("hex");
    const webhook = `${base.origin}/api/viasocket/catalogue-webhook?token=${webhookToken}`;

    const subscriptionId = await subscribeEvent(
      connection.endUserId,
      ROW_ADDED_TRIGGER,
      connection.authId,
      {
        [FIELDS.rowTrigger.spreadsheet]: connection.spreadsheetId,
        [FIELDS.rowTrigger.sheet]: connection.sheetId,
        record_type: "new",
        column_key: true,
      },
      webhook,
      { user: connection.endUserId },
    );

    // The subscription script_id is the only handle to it — the flows listing
    // cannot tell a subscription from an enabled app — so it is stored before
    // anything else can fail.
    await patchConnection(connection.userId, {
      subscriptionId,
      webhookToken,
    });

    return NextResponse.json({ watching: true });
  } catch (error) {
    const denied = authErrorResponse(error);
    if (denied) {
      return NextResponse.json({ error: denied.error }, { status: denied.status });
    }
    if (error instanceof ViasocketNotConfiguredError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    return NextResponse.json({ error: (error as Error).message }, { status: 502 });
  }
}

export async function DELETE() {
  try {
    const admin = await requireAdmin();
    const connection = await getConnection(admin.id);

    if (connection?.subscriptionId) {
      await setFlowStatus(connection.endUserId, connection.subscriptionId, 0);
    }
    if (connection) {
      await patchConnection(connection.userId, {
        subscriptionId: undefined,
        webhookToken: undefined,
      });
    }

    return NextResponse.json({ watching: false });
  } catch (error) {
    const denied = authErrorResponse(error);
    if (denied) {
      return NextResponse.json({ error: denied.error }, { status: denied.status });
    }
    return NextResponse.json({ error: (error as Error).message }, { status: 502 });
  }
}
