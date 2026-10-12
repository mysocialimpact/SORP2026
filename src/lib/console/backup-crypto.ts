import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
import { gzipSync, gunzipSync } from "node:zlib";
export function encryptionKey(value: string) {
  const key = Buffer.from(value, "base64");
  if (key.length !== 32)
    throw new Error(
      "Backup encryption key must be 32 random bytes encoded as base64.",
    );
  return key;
}
export function encryptBackup(plaintext: Buffer, secret: string) {
  const key = encryptionKey(secret),
    iv = randomBytes(12),
    cipher = createCipheriv("aes-256-gcm", key, iv);
  const body = Buffer.concat([
    cipher.update(gzipSync(plaintext)),
    cipher.final(),
  ]);
  return Buffer.from(
    JSON.stringify({
      version: 1,
      algorithm: "AES-256-GCM+gzip",
      keyId: createHash("sha256").update(key).digest("hex").slice(0, 16),
      iv: iv.toString("base64"),
      tag: cipher.getAuthTag().toString("base64"),
      body: body.toString("base64"),
    }),
  );
}
export function decryptBackup(encrypted: Buffer, secret: string) {
  const data = JSON.parse(encrypted.toString());
  if (data.version !== 1 || data.algorithm !== "AES-256-GCM+gzip")
    throw new Error("Unknown backup envelope.");
  const decipher = createDecipheriv(
    "aes-256-gcm",
    encryptionKey(secret),
    Buffer.from(data.iv, "base64"),
  );
  decipher.setAuthTag(Buffer.from(data.tag, "base64"));
  return gunzipSync(
    Buffer.concat([
      decipher.update(Buffer.from(data.body, "base64")),
      decipher.final(),
    ]),
    { maxOutputLength: 100_000_000 },
  );
}
