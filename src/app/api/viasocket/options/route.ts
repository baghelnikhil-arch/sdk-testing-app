import { NextResponse } from "next/server";
import { authErrorResponse } from "@/lib/auth";
import { requireOwner } from "@/lib/end-user";
import { getConnection } from "@/lib/integration-store";
import { parsePurpose } from "@/lib/purpose";
import {
  ADD_ROWS_ACTION,
  FIELDS,
  LIST_ROWS_ACTION,
  ViasocketNotConfiguredError,
  listOptions,
} from "@/lib/viasocket";

/**
 * Fills the pickers. One call per field.
 *
 * Each purpose reads its options from the action it will actually run, because
 * the field keys differ between them: "Add Multiple Rows" uses
 * `spreadSheet_Id`, "List Rows in Sheet" uses `spreadSheet_id`. Borrowing one
 * action's keys for another returns an empty list with a 200 rather than an
 * error, so the pairing is kept in one place.
 */
const SOURCES = {
  orders: { action: ADD_ROWS_ACTION, fields: FIELDS.addRows },
  catalogue: { action: LIST_ROWS_ACTION, fields: FIELDS.listRows },
} as const;

export async function POST(request: Request) {
  try {
    const { field, spreadsheetId, purpose: rawPurpose } = await request.json();
    const purpose = parsePurpose(rawPurpose);

    if (!purpose) {
      return NextResponse.json({ error: "Unknown purpose" }, { status: 400 });
    }
    if (field !== "spreadsheet" && field !== "sheet") {
      return NextResponse.json(
        { error: "field must be 'spreadsheet' or 'sheet'" },
        { status: 400 },
      );
    }

    const owner = await requireOwner(purpose);
    const connection = await getConnection(owner.id, purpose);
    if (!connection) {
      return NextResponse.json(
        { error: "Google Sheets is not connected yet." },
        { status: 409 },
      );
    }

    const { action, fields } = SOURCES[purpose];

    if (field === "spreadsheet") {
      const { options } = await listOptions(
        connection.endUserId,
        action,
        fields.spreadsheet,
        {},
        connection.authId,
      );
      return NextResponse.json({ options });
    }

    if (typeof spreadsheetId !== "string" || !spreadsheetId) {
      return NextResponse.json(
        { error: "Choose a spreadsheet before loading its tabs." },
        { status: 400 },
      );
    }

    // A tab is only meaningful inside a spreadsheet, so the parent is passed as
    // a dependency. Sending `{}` here returns nothing, not an error.
    const { options } = await listOptions(
      connection.endUserId,
      action,
      fields.sheet,
      { [fields.spreadsheet]: spreadsheetId },
      connection.authId,
    );
    return NextResponse.json({ options });
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
