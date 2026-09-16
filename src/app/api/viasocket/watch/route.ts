import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { requireEndUserId } from "@/lib/end-user";
import { getConnection, patchConnection } from "@/lib/integration-store";
import {
  FIELDS,
  ROW_ADDED_TRIGGER,
  ViasocketNotConfiguredError,
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

function resolvePublicBaseUrl(): { origin: string } | { error: string } {
  const raw = process.env.APP_PUBLIC_URL?.trim();

  if (!raw) {
    return {
      error:
        "Live updates need an address viaSocket can call. Set APP_PUBLIC_URL to your deployed https URL — or to a tunnel such as ngrok while developing — then restart the app.",
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
    const endUserId = await requireEndUserId();
    const connection = await getConnection(endUserId, "catalogue");

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

    if (connection.subscriptionId) {
      return NextResponse.json({ watching: true });
    }

    const webhookToken = randomBytes(24).toString("hex");
    const webhook = `${base.origin}/api/viasocket/catalogue-webhook?token=${webhookToken}`;

    const subscriptionId = await subscribeEvent(
      endUserId,
      ROW_ADDED_TRIGGER,
      connection.authId,
      {
        [FIELDS.rowTrigger.spreadsheet]: connection.spreadsheetId,
        [FIELDS.rowTrigger.sheet]: connection.sheetId,
        record_type: "new",
        column_key: true,
      },
      webhook,
      { purpose: "catalogue", user: endUserId },
    );

    // The subscription script_id is the only handle to it — the flows listing
    // cannot tell a subscription from an enabled app — so it is stored before
    // anything else can fail.
    await patchConnection(endUserId, "catalogue", {
      subscriptionId,
      webhookToken,
    });

    return NextResponse.json({ watching: true });
  } catch (error) {
    if (error instanceof ViasocketNotConfiguredError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    return NextResponse.json({ error: (error as Error).message }, { status: 502 });
  }
}

export async function DELETE() {
  try {
    const endUserId = await requireEndUserId();
    const connection = await getConnection(endUserId, "catalogue");

    if (connection?.subscriptionId) {
      await setFlowStatus(endUserId, connection.subscriptionId, 0);
    }
    await patchConnection(endUserId, "catalogue", {
      subscriptionId: undefined,
      webhookToken: undefined,
    });

    return NextResponse.json({ watching: false });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 502 });
  }
}
