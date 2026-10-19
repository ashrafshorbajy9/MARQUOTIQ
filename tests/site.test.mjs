import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

process.env.DEV_DATA_DIR = await fs.mkdtemp(path.join(os.tmpdir(), "marquotiq-test-"));
process.env.NODE_ENV = "test";
process.env.ADMIN_EMAIL = "owner@example.com";
process.env.SESSION_SECRET = "a-test-only-session-secret-with-more-than-32-characters";

const { hashPassword } = await import("../lib/auth.js");
process.env.ADMIN_PASSWORD_HASH = hashPassword("a-long-test-password", "a".repeat(48));
const [{ default: page }, { default: admin }, { default: media }, content] = await Promise.all([
  import("../api/page.js"), import("../api/admin.js"), import("../api/media.js"), import("../lib/content.js"),
]);

const url = (value) => `http://localhost:3000${value}`;
const request = (endpoint, options = {}) => new Request(url(endpoint), options);
let cookie;
let csrf;
let coverUrl;
let project;

test("visitor starts with the approved page and no invented projects", async () => {
  const response = await page.fetch(request("/api/page?view=home"));
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /تسويق أذكى/);
  assert.match(html, /"projects":\[\]/);
  assert.doesNotMatch(html, /اسم المشروع 01/);
});

test("login requires the configured single admin and returns an HttpOnly session", async () => {
  const wrong = await admin.fetch(request("/api/admin?action=login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: "owner@example.com", password: "wrong" }) }));
  assert.equal(wrong.status, 401);
  const response = await admin.fetch(request("/api/admin?action=login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: "owner@example.com", password: "a-long-test-password" }) }));
  assert.equal(response.status, 200);
  assert.match(response.headers.get("set-cookie"), /HttpOnly/);
  cookie = response.headers.get("set-cookie").split(";")[0];
  const bootstrap = await admin.fetch(request("/api/admin?action=bootstrap", { headers: { cookie } }));
  assert.equal(bootstrap.status, 200);
  csrf = (await bootstrap.json()).csrf;
});

test("writes require both session and CSRF token", async () => {
  const payload = JSON.stringify({ email: "hello@example.com" });
  const anonymous = await admin.fetch(request("/api/admin?action=settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: payload }));
  assert.equal(anonymous.status, 401);
  const noToken = await admin.fetch(request("/api/admin?action=settings", { method: "POST", headers: { cookie, "Content-Type": "application/json" }, body: payload }));
  assert.equal(noToken.status, 403);
});

test("admin can save contact details and switch maintenance mode", async () => {
  const settings = { maintenance: true, email: "hello@example.com", address: "الرياض، المملكة العربية السعودية", mapUrl: "https://maps.app.goo.gl/test", social: { youtube: "https://youtube.com/@test", linkedin: "https://linkedin.com/company/test", instagram: "https://instagram.com/test" } };
  const response = await admin.fetch(request("/api/admin?action=settings", { method: "POST", headers: { cookie, "Content-Type": "application/json", "X-CSRF-Token": csrf }, body: JSON.stringify(settings) }));
  assert.equal(response.status, 200);
  const visitorPage = await page.fetch(request("/api/page?view=home"));
  assert.equal(visitorPage.status, 503);
  assert.match(await visitorPage.text(), /سنعود/);
  const adminPreview = await page.fetch(request("/api/page?view=home", { headers: { cookie } }));
  assert.equal(adminPreview.status, 200);
  assert.match(await adminPreview.text(), /hello@example.com/);
});

test("media upload validates bytes and serves the saved image", async () => {
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/UAAAAABJRU5ErkJggg=", "base64");
  const form = new FormData();
  form.set("file", new File([png], "cover.png", { type: "image/png" }));
  const upload = await media.fetch(request("/api/media", { method: "POST", headers: { cookie, "X-CSRF-Token": csrf }, body: form }));
  assert.equal(upload.status, 201);
  coverUrl = (await upload.json()).image.url;
  const image = await media.fetch(request(coverUrl));
  assert.equal(image.status, 200);
  assert.equal(image.headers.get("content-type"), "image/png");
  assert.deepEqual(Buffer.from(await image.arrayBuffer()), png);
});

test("Neon S3 requests are signed and keep credentials server-side", async () => {
  const originalFetch = globalThis.fetch;
  process.env.AWS_ENDPOINT_URL_S3 = "https://storage.example.test";
  process.env.AWS_ACCESS_KEY_ID = "test-access";
  process.env.AWS_SECRET_ACCESS_KEY = "test-secret";
  process.env.AWS_REGION = "us-east-2";
  process.env.MEDIA_BUCKET = "marquotiq-projects";
  let requestedUrl;
  let authorization;
  globalThis.fetch = async (input, options) => {
    requestedUrl = String(input);
    authorization = options.headers.authorization;
    return new Response("", { status: 200 });
  };
  try {
    const { saveImage } = await import("../lib/media.js");
    const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/UAAAAABJRU5ErkJggg=", "base64");
    const image = await saveImage(new File([png], "test.png", { type: "image/png" }));
    assert.match(requestedUrl, /^https:\/\/storage\.example\.test\/marquotiq-projects\/projects\//);
    assert.match(authorization, /^AWS4-HMAC-SHA256 Credential=test-access\//);
    assert.match(image.url, /^\/api\/media\?key=projects%2F/);
  } finally {
    globalThis.fetch = originalFetch;
    for (const key of ["AWS_ENDPOINT_URL_S3", "AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_REGION", "MEDIA_BUCKET"]) delete process.env[key];
  }
});

test("draft stays private; published project appears on home and has a safe detail page", async () => {
  const body = { title: "مشروع ماركوتيك", year: 2026, coverUrl, status: "draft", blocks: [
    { type: "paragraph", text: "نص **عريض** ورابط [مثال](https://example.com) <script>alert(1)</script>" },
    { type: "image", url: coverUrl, alt: "صورة المشروع", caption: "تعليق" },
    { type: "video", url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", caption: "فيديو" },
  ] };
  const save = await admin.fetch(request("/api/admin?action=project", { method: "POST", headers: { cookie, "Content-Type": "application/json", "X-CSRF-Token": csrf }, body: JSON.stringify(body) }));
  assert.equal(save.status, 200);
  project = (await save.json()).project;
  assert.equal((await page.fetch(request(`/api/page?view=work&slug=${encodeURIComponent(project.slug)}`))).status, 503);
  const preview = await page.fetch(request(`/api/page?view=work&slug=${encodeURIComponent(project.slug)}`, { headers: { cookie } }));
  assert.equal(preview.status, 200);
  const previewHtml = await preview.text();
  assert.match(previewHtml, /youtube-nocookie.com\/embed\/dQw4w9WgXcQ/);
  assert.match(previewHtml, /&lt;script&gt;/);
  assert.doesNotMatch(previewHtml, /<script>alert/);
  const openSettings = { maintenance: false, email: "hello@example.com", address: "الرياض", mapUrl: "", social: {} };
  await admin.fetch(request("/api/admin?action=settings", { method: "POST", headers: { cookie, "Content-Type": "application/json", "X-CSRF-Token": csrf }, body: JSON.stringify(openSettings) }));
  assert.equal((await page.fetch(request(`/api/page?view=work&slug=${encodeURIComponent(project.slug)}`))).status, 404);
  const publish = await admin.fetch(request("/api/admin?action=project", { method: "POST", headers: { cookie, "Content-Type": "application/json", "X-CSRF-Token": csrf }, body: JSON.stringify({ ...body, id: project.id, status: "published" }) }));
  assert.equal(publish.status, 200);
  const homeHtml = await (await page.fetch(request("/api/page?view=home"))).text();
  assert.match(homeHtml, /مشروع ماركوتيك/);
  assert.equal((await page.fetch(request(`/api/page?view=work&slug=${encodeURIComponent(project.slug)}`))).status, 200);
});

test("invalid video and unsafe social links are rejected", () => {
  assert.equal(content.videoEmbedUrl("javascript:alert(1)"), null);
  assert.throws(() => content.normalizeSettings({ social: { instagram: "https://not-instagram.example/test" } }));
  assert.throws(() => content.normalizeBlocks([{ type: "video", url: "https://example.com/video" }]));
});

test("admin can delete a project", async () => {
  const deleted = await admin.fetch(request(`/api/admin?action=project&id=${project.id}`, { method: "DELETE", headers: { cookie, "X-CSRF-Token": csrf } }));
  assert.equal(deleted.status, 200);
  assert.equal((await page.fetch(request(`/api/page?view=work&slug=${encodeURIComponent(project.slug)}`))).status, 404);
});

test.after(async () => { await fs.rm(process.env.DEV_DATA_DIR, { recursive: true, force: true }); });
