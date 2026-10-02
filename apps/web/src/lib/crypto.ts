import "server-only";
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";
import { env } from "./env";

/**
 * Field-level encryption for health data (weight, measurements, medical
 * situations, allergies). AES-256-GCM with a key that never leaves the server.
 */
export interface Sealed {
  k: string;
  iv: string;
  tag: string;
  data: string;
}

let cachedKey: Buffer | undefined;

function key(): Buffer {
  if (cachedKey) return cachedKey;
  if (env.healthKey) {
    const k = Buffer.from(env.healthKey, "base64");
    if (k.length !== 32) throw new Error("HEALTH_DATA_KEY must be 32 bytes encoded in base64");
    cachedKey = k;
  } else {
    if (process.env.NODE_ENV === "production") throw new Error("HEALTH_DATA_KEY is required in production");
    cachedKey = scryptSync(env.authSecret ?? "weeko-dev-secret", "weeko-health", 32);
  }
  return cachedKey;
}

export function seal(value: unknown): Sealed {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  return { k: "k1", iv: iv.toString("base64"), tag: cipher.getAuthTag().toString("base64"), data: data.toString("base64") };
}

export function unseal<T>(sealed: Sealed): T {
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(sealed.iv, "base64"));
  decipher.setAuthTag(Buffer.from(sealed.tag, "base64"));
  const out = Buffer.concat([decipher.update(Buffer.from(sealed.data, "base64")), decipher.final()]);
  return JSON.parse(out.toString("utf8")) as T;
}
