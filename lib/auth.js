import { createHash, createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const cookieName = "marquotiq_admin";
const sessionAge = 7 * 24 * 60 * 60;

function equalBuffers(left, right) {
  return left.length === right.length && timingSafeEqual(left, right);
}

function secret() {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32) throw new Error("SESSION_SECRET must contain at least 32 characters.");
  return value;
}

export function hashPassword(password, salt = randomBytes(24).toString("hex")) {
  if (String(password).length < 12) throw new Error("استخدم كلمة مرور من 12 حرفًا على الأقل.");
  return `scrypt$${salt}$${scryptSync(String(password), salt, 64).toString("hex")}`;
}

export function verifyPassword(password, encoded) {
  const [algorithm, salt, digest] = String(encoded ?? "").split("$");
  if (algorithm !== "scrypt" || !salt || !/^[0-9a-f]{128}$/i.test(digest ?? "")) return false;
  return equalBuffers(scryptSync(String(password), salt, 64), Buffer.from(digest, "hex"));
}

function sign(payload) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function createSession(email, request) {
  const payload = Buffer.from(JSON.stringify({ email, exp: Math.floor(Date.now() / 1000) + sessionAge, csrf: randomBytes(24).toString("base64url") })).toString("base64url");
  const secure = new URL(request.url).protocol === "https:" || process.env.NODE_ENV === "production";
  const cookie = `${cookieName}=${payload}.${sign(payload)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${sessionAge}${secure ? "; Secure" : ""}`;
  return { cookie };
}

export function clearSession(request) {
  const secure = new URL(request.url).protocol === "https:" || process.env.NODE_ENV === "production";
  return `${cookieName}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure ? "; Secure" : ""}`;
}

export function readSession(request) {
  try {
    const cookie = request.headers.get("cookie")?.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${cookieName}=`));
    if (!cookie) return null;
    const token = cookie.slice(cookieName.length + 1);
    const [payload, signature] = token.split(".");
    if (!payload || !signature || !equalBuffers(Buffer.from(signature), Buffer.from(sign(payload)))) return null;
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (parsed.exp <= Math.floor(Date.now() / 1000) || parsed.email !== process.env.ADMIN_EMAIL?.toLowerCase()) return null;
    return parsed;
  } catch { return null; }
}

export function assertMutation(request, session) {
  if (!session) throw Object.assign(new Error("يلزم تسجيل الدخول."), { status: 401 });
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) throw Object.assign(new Error("مصدر الطلب غير موثوق."), { status: 403 });
  if (!equalBuffers(Buffer.from(request.headers.get("x-csrf-token") ?? ""), Buffer.from(session.csrf))) {
    throw Object.assign(new Error("انتهت صلاحية جلسة التحرير. حدّث الصفحة وحاول مرة أخرى."), { status: 403 });
  }
}

export function loginKey(request, email) {
  const ip = request.headers.get("x-real-ip") || request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
  return createHash("sha256").update(`${ip.trim()}|${email.toLowerCase()}`).digest("hex");
}
