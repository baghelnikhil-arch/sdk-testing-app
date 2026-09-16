import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * The storage primitive everything else is built on.
 *
 * Two backends, chosen by environment rather than by a flag:
 *
 * - **Redis over HTTP** (Vercel KV / Upstash) whenever its credentials are
 *   present. Serverless functions do not share a filesystem and `/var/task` is
 *   read-only, so anything that must survive a request needs to live outside the
 *   instance.
 * - **A JSON file** otherwise, so local development needs no services.
 *
 * Swap this one module for your own database and nothing above it changes.
 */

export type KV = {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  del(key: string): Promise<void>;
};

/* --------------------------------------------------------------- redis (http) */

function redisCredentials() {
  const url =
    process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL ?? null;
  const token =
    process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN ?? null;

  return url && token ? { url: url.replace(/\/+$/, ""), token } : null;
}

function redisKV(url: string, token: string): KV {
  async function command<T>(args: (string | number)[]): Promise<T> {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(args),
      cache: "no-store",
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.error) {
      throw new Error(
        `Storage command ${args[0]} failed: ${payload.error ?? response.status}`,
      );
    }
    return payload.result as T;
  }

  return {
    async get(key) {
      const result = await command<string | null>(["GET", key]);
      return result ?? null;
    },
    async set(key, value) {
      await command(["SET", key, value]);
    },
    async del(key) {
      await command(["DEL", key]);
    },
  };
}

/* ---------------------------------------------------------------------- file */

const DIR = path.join(process.cwd(), ".data");
const FILE = path.join(DIR, "kv.json");
const LEGACY_INTEGRATIONS = path.join(DIR, "integrations.json");
const LEGACY_CATALOGUE = path.join(DIR, "catalogue.json");

type Blob = Record<string, string>;

async function readBlob(): Promise<Blob> {
  try {
    return JSON.parse(await readFile(FILE, "utf8")) as Blob;
  } catch {
    return migrateLegacyFiles();
  }
}

/**
 * Picks up data written before this module existed, when integrations and the
 * catalogue were each their own file.
 */
async function migrateLegacyFiles(): Promise<Blob> {
  const blob: Blob = {};

  try {
    const legacy = JSON.parse(await readFile(LEGACY_INTEGRATIONS, "utf8"));
    for (const [endUserId, record] of Object.entries(legacy)) {
      blob[`integration:${endUserId}`] = JSON.stringify(record);
    }
  } catch {
    /* nothing to migrate */
  }

  try {
    blob.catalogue = await readFile(LEGACY_CATALOGUE, "utf8");
  } catch {
    /* nothing to migrate */
  }

  return blob;
}

function fileKV(): KV {
  async function write(blob: Blob) {
    await mkdir(DIR, { recursive: true });
    await writeFile(FILE, JSON.stringify(blob, null, 2), "utf8");
  }

  return {
    async get(key) {
      return (await readBlob())[key] ?? null;
    },
    async set(key, value) {
      const blob = await readBlob();
      blob[key] = value;
      await write(blob);
    },
    async del(key) {
      const blob = await readBlob();
      delete blob[key];
      await write(blob);
    },
  };
}

/* -------------------------------------------------------------------- picker */

let cached: KV | null = null;

export function kv(): KV {
  if (cached) return cached;

  const credentials = redisCredentials();
  if (credentials) {
    cached = redisKV(credentials.url, credentials.token);
    return cached;
  }

  // Writing to the filesystem on a serverless host fails with a confusing
  // ENOENT on a read-only path, so say what is actually wrong.
  if (process.env.VERCEL) {
    throw new Error(
      "No storage is configured. Add a Redis/KV integration to this project " +
        "(Vercel → Storage) so KV_REST_API_URL and KV_REST_API_TOKEN are set, " +
        "then redeploy. Serverless functions cannot write to the filesystem.",
    );
  }

  cached = fileKV();
  return cached;
}

/** True when durable storage exists — used to explain the state in the UI. */
export function hasDurableStorage() {
  return Boolean(redisCredentials()) || !process.env.VERCEL;
}

export function storageKind(): "redis" | "file" | "none" {
  if (redisCredentials()) return "redis";
  return process.env.VERCEL ? "none" : "file";
}

/** Convenience wrappers, since every caller stores JSON. */
export async function getJSON<T>(key: string): Promise<T | null> {
  const raw = await kv().get(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function setJSON(key: string, value: unknown) {
  await kv().set(key, JSON.stringify(value));
}

export async function delKey(key: string) {
  await kv().del(key);
}
