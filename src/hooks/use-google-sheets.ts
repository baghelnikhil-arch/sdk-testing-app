"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * All Google Sheets connection state in one place.
 *
 * The settings card and the checkout panel are two presentations of the same
 * thing, so the behaviour lives here rather than being written twice.
 */

export const SERVICE_ID = "rowqm5xi2";
export const SHEETS_ICON =
  "https://stuff.thingsofbrand.com/google.com/images/img4_googlesheet.png";

export type Option = { label: string; value: string };

export type Purpose = "orders" | "catalogue";

export type SheetsStatus = {
  configured: boolean;
  /** "redis" durable, "file" local only, "none" = serverless with no store. */
  storage?: "redis" | "file" | "none";
  storageError?: string | null;
  connected: boolean;
  spreadsheetLabel: string | null;
  sheetLabel: string | null;
  ready: boolean;
  lastExportAt: string | null;
  lastSyncAt: string | null;
  lastSyncCount: number | null;
  watching: boolean;
};

declare global {
  interface Window {
    openViasocketConnection?: (token: string, serviceId: string) => void;
  }
}

async function postJSON(url: string, body: unknown, method = "POST") {
  const response = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || `Request failed (${response.status})`);
  }
  return payload;
}

export type Busy = "connect" | "save" | "disconnect" | null;

/**
 * One connection, scoped to a purpose. Exporting orders and importing the
 * catalogue are separate connections — separate Google accounts, separate
 * sheets — so every call carries the purpose and two instances of this hook
 * never see each other's state.
 */
export function useGoogleSheets(purpose: Purpose = "orders") {
  const [status, setStatus] = useState<SheetsStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<Busy>(null);
  const [saved, setSaved] = useState(false);

  const [spreadsheets, setSpreadsheets] = useState<Option[]>([]);
  const [sheets, setSheets] = useState<Option[]>([]);
  const [spreadsheetId, setSpreadsheetId] = useState("");
  const [sheetId, setSheetId] = useState("");
  const [loadingField, setLoadingField] = useState<"spreadsheet" | "sheet" | null>(
    null,
  );

  /** True while the pickers are on screen. Forced open until a sheet is chosen. */
  const [editing, setEditing] = useState(false);

  const refresh = useCallback(async () => {
    const response = await fetch(
      `/api/viasocket/destination?purpose=${purpose}`,
      { cache: "no-store" },
    );
    const next: SheetsStatus = await response.json();
    setStatus(next);
    return next;
  }, [purpose]);

  useEffect(() => {
    refresh().catch((e) => setError((e as Error).message));
  }, [refresh]);

  /** Ids are always fetched — never guessed or hardcoded. */
  const loadSpreadsheets = useCallback(async () => {
    setLoadingField("spreadsheet");
    setError(null);
    try {
      const { options } = await postJSON("/api/viasocket/options", {
        field: "spreadsheet",
        purpose,
      });
      setSpreadsheets(options ?? []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoadingField(null);
    }
  }, [purpose]);

  // A tab only means something inside a spreadsheet, so this waits for one.
  const loadSheets = useCallback(
    async (parentId: string) => {
      setLoadingField("sheet");
      setError(null);
      try {
        const { options } = await postJSON("/api/viasocket/options", {
          field: "sheet",
          spreadsheetId: parentId,
          purpose,
        });
        setSheets(options ?? []);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoadingField(null);
      }
    },
    [purpose],
  );

  // Connected but no destination yet: there is nothing to do but pick one.
  useEffect(() => {
    if (status?.connected && !status.ready) setEditing(true);
  }, [status?.connected, status?.ready]);

  useEffect(() => {
    if (editing && status?.connected && spreadsheets.length === 0 && !loadingField) {
      loadSpreadsheets();
    }
  }, [editing, status?.connected, spreadsheets.length, loadingField, loadSpreadsheets]);

  /*
   * The popup reports back by postMessage. The viaSocket sample (and therefore
   * this code) does not check `event.origin`, because the documentation never
   * states which origin the popup posts from. The real trust boundary is
   * server-side: `/api/viasocket/connected` passes the auth_id to viaSocket's
   * enable endpoint under this user's embed token, so an auth_id belonging to
   * anyone else is rejected there. Add an origin check here once the expected
   * origin is known, and keep this page out of third-party frames.
   */
  useEffect(() => {
    async function onMessage(event: MessageEvent) {
      const data = event.data;
      if (!data?.type || typeof data.type !== "string") return;

      if (data.type === "viasocket_connection_success") {
        try {
          const result = await postJSON("/api/viasocket/connected", {
            serviceId: data.serviceId,
            authId: data.data?.id,
            purpose,
          });

          // A different Google account means the old sheet ids are meaningless.
          if (result.destinationCleared) {
            setSpreadsheetId("");
            setSheetId("");
            setSheets([]);
          }
          setSpreadsheets([]);
          setSaved(false);
          setEditing(true);
          await refresh();
        } catch (e) {
          setError((e as Error).message);
        } finally {
          setBusy(null);
        }
      } else if (data.type === "viasocket_connection_error") {
        setError(data.error?.message || "Google rejected the connection.");
        setBusy(null);
      } else if (data.type === "viasocket_connection_closed") {
        // Closed early — nothing was created, so leave everything as it was.
        setBusy(null);
      }
    }

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [refresh, purpose]);

  /** Opens Google's consent screen. Also used to switch to another account. */
  const connect = useCallback(async () => {
    setError(null);
    setBusy("connect");
    try {
      const response = await fetch("/api/viasocket/token");
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || "Could not start the connection.");
      }
      const token = await response.text();

      if (!window.openViasocketConnection) {
        throw new Error(
          "The viaSocket connect script has not finished loading — try again in a moment.",
        );
      }
      window.openViasocketConnection(token, SERVICE_ID);
    } catch (e) {
      setError((e as Error).message);
      setBusy(null);
    }
  }, []);

  const chooseSpreadsheet = useCallback(
    (next: string) => {
      setSpreadsheetId(next);
      setSheetId("");
      setSheets([]);
      setSaved(false);
      if (next) loadSheets(next);
    },
    [loadSheets],
  );

  const chooseSheet = useCallback((next: string) => {
    setSheetId(next);
    setSaved(false);
  }, []);

  const save = useCallback(async () => {
    setBusy("save");
    setError(null);
    setSaved(false);
    try {
      await postJSON(
        `/api/viasocket/destination?purpose=${purpose}`,
        {
          spreadsheetId,
          spreadsheetLabel: spreadsheets.find((o) => o.value === spreadsheetId)
            ?.label,
          sheetId,
          sheetLabel: sheets.find((o) => o.value === sheetId)?.label,
        },
        "PUT",
      );
      await refresh();
      setSaved(true);
      setEditing(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }, [spreadsheetId, sheetId, spreadsheets, sheets, refresh, purpose]);

  const disconnect = useCallback(async () => {
    setBusy("disconnect");
    setError(null);
    try {
      await fetch(`/api/viasocket/destination?purpose=${purpose}`, {
        method: "DELETE",
      });
      setSpreadsheets([]);
      setSheets([]);
      setSpreadsheetId("");
      setSheetId("");
      setSaved(false);
      setEditing(false);
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }, [refresh, purpose]);

  const beginEdit = useCallback(() => {
    setSaved(false);
    setEditing(true);
  }, []);

  /** Only allowed when a destination is already saved to fall back to. */
  const cancelEdit = useCallback(() => {
    setError(null);
    setEditing(false);
  }, []);

  return {
    purpose,
    status,
    error,
    setError,
    busy,
    saved,
    editing,
    spreadsheets,
    sheets,
    spreadsheetId,
    sheetId,
    loadingField,
    connect,
    disconnect,
    save,
    chooseSpreadsheet,
    chooseSheet,
    beginEdit,
    cancelEdit,
    refresh,
    canSave: Boolean(spreadsheetId && sheetId),
  };
}
