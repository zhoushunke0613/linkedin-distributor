import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { env } from "./env";

const KEY = Buffer.from(env.LINKEDIN_TOKEN_ENC_KEY, "hex");
const ALGO = "aes-256-gcm";
const IV_LEN = 12;

export type Encrypted = { ct: string; iv: string };

export function encrypt(plaintext: string): Encrypted {
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, KEY, iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    ct: Buffer.concat([enc, tag]).toString("base64"),
    iv: iv.toString("base64"),
  };
}

export function decrypt({ ct, iv }: Encrypted): string {
  const buf = Buffer.from(ct, "base64");
  const ivBuf = Buffer.from(iv, "base64");
  const tag = buf.subarray(buf.length - 16);
  const enc = buf.subarray(0, buf.length - 16);
  const decipher = createDecipheriv(ALGO, KEY, ivBuf);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
  return dec.toString("utf8");
}
