import fs from "node:fs/promises";
import path from "node:path";
import { createHash, createHmac, randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { mediaUrl } from "./content.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const localDirectory = path.join(process.env.DEV_DATA_DIR || path.join(root, ".local-data"), "media");
const maxImageBytes = 3_500_000;
const extensionByMime = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif" };
const mimeByExtension = Object.fromEntries(Object.entries(extensionByMime).map(([mime, extension]) => [extension, mime]));

function validKey(key) {
  return /^projects\/[0-9a-f-]{36}\.(jpg|png|webp|avif)$/i.test(String(key ?? ""));
}

function detectMime(bytes) {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return "image/png";
  if (bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  if (bytes.toString("ascii", 4, 8) === "ftyp" && ["avif", "avis"].includes(bytes.toString("ascii", 8, 12))) return "image/avif";
  return null;
}

function hmac(key, data) { return createHmac("sha256", key).update(data).digest(); }
function sha256(data) { return createHash("sha256").update(data).digest("hex"); }

async function s3Request(method, key, body, type) {
  const endpoint = process.env.AWS_ENDPOINT_URL_S3;
  const bucket = process.env.MEDIA_BUCKET;
  const accessKey = process.env.AWS_ACCESS_KEY_ID;
  const secretKey = process.env.AWS_SECRET_ACCESS_KEY;
  const region = process.env.AWS_REGION || "us-east-2";
  if (!endpoint || !bucket || !accessKey || !secretKey) throw new Error("Neon Object Storage is not configured.");
  const base = endpoint.replace(/\/+$/, "");
  const url = new URL(`${base}/${encodeURIComponent(bucket)}/${key.split("/").map(encodeURIComponent).join("/")}`);
  const now = new Date();
  const stamp = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const date = stamp.slice(0, 8);
  const bodyHash = sha256(body ?? "");
  const headers = { "x-amz-date": stamp, "x-amz-content-sha256": bodyHash };
  if (type) headers["content-type"] = type;
  const signedKeys = Object.keys({ ...headers, host: url.host }).sort();
  const canonicalHeaders = signedKeys.map((name) => `${name}:${name === "host" ? url.host : headers[name]}\n`).join("");
  const canonical = [method, url.pathname, "", canonicalHeaders, signedKeys.join(";"), bodyHash].join("\n");
  const scope = `${date}/${region}/s3/aws4_request`;
  const toSign = ["AWS4-HMAC-SHA256", stamp, scope, sha256(canonical)].join("\n");
  const signingKey = hmac(hmac(hmac(hmac(`AWS4${secretKey}`, date), region), "s3"), "aws4_request");
  headers.authorization = `AWS4-HMAC-SHA256 Credential=${accessKey}/${scope}, SignedHeaders=${signedKeys.join(";")}, Signature=${hmac(signingKey, toSign).toString("hex")}`;
  const response = await fetch(url, { method, headers, body });
  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error(`Neon Object Storage returned ${response.status}.`);
  }
  return response;
}

function usesRemoteStorage() {
  if (process.env.NODE_ENV === "production" && !process.env.AWS_ENDPOINT_URL_S3) throw new Error("Neon Object Storage is required in production.");
  return Boolean(process.env.AWS_ENDPOINT_URL_S3);
}

export async function saveImage(file) {
  const bytes = Buffer.from(await file.arrayBuffer());
  if (!bytes.length || bytes.length > maxImageBytes) throw Object.assign(new Error("الصورة يجب ألا تتجاوز 3.5 MB."), { status: 400 });
  const mime = detectMime(bytes);
  if (!mime) throw Object.assign(new Error("صيغة الصورة غير مدعومة. استخدم JPG أو PNG أو WebP أو AVIF."), { status: 400 });
  const key = `projects/${randomUUID()}.${extensionByMime[mime]}`;
  if (usesRemoteStorage()) await s3Request("PUT", key, bytes, mime);
  else {
    await fs.mkdir(path.dirname(path.join(localDirectory, key)), { recursive: true });
    await fs.writeFile(path.join(localDirectory, key), bytes);
  }
  return { key, url: mediaUrl(key), size: bytes.length, mime };
}

export async function readImage(key) {
  if (!validKey(key)) return null;
  const mime = mimeByExtension[path.extname(key).slice(1)];
  if (usesRemoteStorage()) {
    const response = await s3Request("GET", key);
    return response ? { bytes: Buffer.from(await response.arrayBuffer()), mime } : null;
  }
  try { return { bytes: await fs.readFile(path.join(localDirectory, key)), mime }; }
  catch (error) { if (error.code === "ENOENT") return null; throw error; }
}
