import { NextResponse } from "next/server";
import { requireEndUserId } from "@/lib/end-user";
import { getConnection, saveConnection } from "@/lib/integration-store";
import { parsePurpose } from "@/lib/purpose";
import {
  SERVICE_ID,
  ViasocketNotConfiguredError,
  ensureEnabled,
} from "@/lib/viasocket";

/**
 * Called by the browser once the consent popup reports success.
 *
 * The popup gives us an `auth_id`; enabling turns that into a `script_id`, which
 * is what actually runs actions. `ensureEnabled` matches an existing flow on
 * `auth_id` as well as service, so connecting a second Google account creates
 * its own flow rather than reusing the first account's.
 *
 * The script_id is stored here and deliberately never returned to the browser.
 */
export async function POST(request: Request) {
  try {
    const endUserId = await requireEndUserId();
    const body = await request.json();
    const purpose = parsePurpose(body.purpose);

    if (!purpose) {
      return NextResponse.json({ error: "Unknown purpose" }, { status: 400 });
    }
    if (typeof body.authId !== "string" || !body.authId) {
      return NextResponse.json({ error: "authId is required" }, { status: 400 });
    }
    if (body.serviceId && body.serviceId !== SERVICE_ID) {
      return NextResponse.json(
        { error: `Unexpected service ${body.serviceId}` },
        { status: 400 },
      );
    }

    const previous = await getConnection(endUserId, purpose);
    const scriptId = await ensureEnabled(endUserId, body.authId);

    // Reconnecting with a different Google account invalidates the saved sheet:
    // those ids live in the old account's Drive and would either fail or, worse,
    // resolve to something unrelated.
    const destinationCleared = Boolean(previous && previous.authId !== body.authId);

    const record = await saveConnection(endUserId, purpose, {
      authId: body.authId,
      scriptId,
      ...(destinationCleared
        ? {
            spreadsheetId: undefined,
            spreadsheetLabel: undefined,
            sheetId: undefined,
            sheetLabel: undefined,
            subscriptionId: undefined,
            webhookToken: undefined,
          }
        : {}),
    });

    return NextResponse.json({
      connected: true,
      destinationCleared,
      spreadsheetLabel: record.spreadsheetLabel ?? null,
      sheetLabel: record.sheetLabel ?? null,
    });
  } catch (error) {
    if (error instanceof ViasocketNotConfiguredError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    return NextResponse.json({ error: (error as Error).message }, { status: 502 });
  }
}
