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
  const settings = { maintenance: true, email: "hello@example.com", phone: "+966 50 123 4567", address: "الرياض، المملكة العربية السعودية", mapUrl: "https://maps.app.goo.gl/test", cursorVideos: [{ url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", title: "تعرف علينا" }, { url: "https://vimeo.com/123456789", title: "فيديو ثان" }], social: { youtube: "https://youtube.com/@test", linkedin: "https://linkedin.com/company/test", instagram: "https://instagram.com/test" } };
  const response = await admin.fetch(request("/api/admin?action=settings", { method: "POST", headers: { cookie, "Content-Type": "application/json", "X-CSRF-Token": csrf }, body: JSON.stringify(settings) }));
  assert.equal(response.status, 200);
  const visitorPage = await page.fetch(request("/api/page?view=home"));
  assert.equal(visitorPage.status, 503);
  assert.match(await visitorPage.text(), /سنعود/);
  const adminPreview = await page.fetch(request("/api/page?view=home", { headers: { cookie } }));
  assert.equal(adminPreview.status, 200);
  const previewHtml = await adminPreview.text();
  assert.match(previewHtml, /hello@example.com/);
  assert.match(previewHtml, /\+966 50 123 4567/);
  assert.match(previewHtml, /vimeo.com\/123456789/);
  assert.match(previewHtml, /id="footer-map"/);
  assert.doesNotMatch(previewHtml, /id="contact-map"|id="contact-address"|01 \/ الفكرة|07 \/ تواصل معنا/);
});

test("admin can reorder, rename, and hide home sections without losing other settings", async () => {
  const before = await (await admin.fetch(request("/api/admin?action=bootstrap", { headers: { cookie } }))).json();
  const sections = before.settings.homeSections.map((section) => ({ ...section }));
  sections.find((section) => section.id === "about").visible = false;
  sections.find((section) => section.id === "faq").title = "أسئلتك <جاهزة>";
  sections.splice(sections.findIndex((section) => section.id === "faq"), 1);
  sections.splice(1, 0, { id: "faq", visible: true, title: "أسئلتك <جاهزة>" });
  const rejected = await admin.fetch(request("/api/admin?action=home", { method: "POST", headers: { cookie, "Content-Type": "application/json", "X-CSRF-Token": csrf }, body: JSON.stringify({ sections: [...sections.slice(0, -1), sections[0]] }) }));
  assert.equal(rejected.status, 400);
  const save = await admin.fetch(request("/api/admin?action=home", { method: "POST", headers: { cookie, "Content-Type": "application/json", "X-CSRF-Token": csrf }, body: JSON.stringify({ sections }) }));
  assert.equal(save.status, 200);
  const settings = (await save.json()).settings;
  assert.equal(settings.homeSections[1].id, "faq");
  assert.equal(settings.email, "hello@example.com");
  const preview = await page.fetch(request("/api/page?view=home", { headers: { cookie } }));
  const html = await preview.text();
  assert.match(html, /"homeSections":\[\{"id":"hero"/);
  assert.match(html, /"title":"أسئلتك \\u003cجاهزة>"/);
});

test("admin can replace and delete FAQs while preserving home configuration", async () => {
  const missingCsrf = await admin.fetch(request("/api/admin?action=faqs", { method: "POST", headers: { cookie, "Content-Type": "application/json" }, body: JSON.stringify({ faqs: [] }) }));
  assert.equal(missingCsrf.status, 403);
  const invalid = await admin.fetch(request("/api/admin?action=faqs", { method: "POST", headers: { cookie, "Content-Type": "application/json", "X-CSRF-Token": csrf }, body: JSON.stringify({ faqs: [{ question: "سؤال", answer: "" }] }) }));
  assert.equal(invalid.status, 400);
  const save = await admin.fetch(request("/api/admin?action=faqs", { method: "POST", headers: { cookie, "Content-Type": "application/json", "X-CSRF-Token": csrf }, body: JSON.stringify({ faqs: [{ question: "كيف نبدأ؟", answer: "نتحدث عن مشروعك أولًا." }] }) }));
  assert.equal(save.status, 200);
  const settings = (await save.json()).settings;
  assert.deepEqual(settings.faqs, [{ question: "كيف نبدأ؟", answer: "نتحدث عن مشروعك أولًا." }]);
  assert.equal(settings.homeSections[1].id, "faq");
  const update = await admin.fetch(request("/api/admin?action=faqs", { method: "POST", headers: { cookie, "Content-Type": "application/json", "X-CSRF-Token": csrf }, body: JSON.stringify({ faqs: [] }) }));
  assert.equal(update.status, 200);
  assert.deepEqual((await update.json()).settings.faqs, []);
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
  assert.match(previewHtml, /<main id="project-content"><section class="project-intro[^>]+><h1 id="project-title">مشروع ماركوتيك<\/h1>/);
  assert.doesNotMatch(previewHtml, /class="project-hero"/);
  assert.match(previewHtml, /<meta property="og:image"/);
  assert.doesNotMatch(previewHtml, /href="\/#about"/);
  assert.match(previewHtml, /href="\/#faq">أسئلتك &lt;جاهزة&gt;<\/a>/);
  const openSettings = { maintenance: false, email: "hello@example.com", address: "الرياض", mapUrl: "", social: {} };
  await admin.fetch(request("/api/admin?action=settings", { method: "POST", headers: { cookie, "Content-Type": "application/json", "X-CSRF-Token": csrf }, body: JSON.stringify(openSettings) }));
  assert.equal((await page.fetch(request(`/api/page?view=work&slug=${encodeURIComponent(project.slug)}`))).status, 404);
  const publish = await admin.fetch(request("/api/admin?action=project", { method: "POST", headers: { cookie, "Content-Type": "application/json", "X-CSRF-Token": csrf }, body: JSON.stringify({ ...body, id: project.id, status: "published" }) }));
  assert.equal(publish.status, 200);
  const homeHtml = await (await page.fetch(request("/api/page?view=home"))).text();
  assert.match(homeHtml, /مشروع ماركوتيك/);
  assert.match(homeHtml, /"faqs":\[\]/);
  assert.equal((await page.fetch(request(`/api/page?view=work&slug=${encodeURIComponent(project.slug)}`))).status, 200);
});

test("invalid video and unsafe social links are rejected", () => {
  assert.equal(content.videoEmbedUrl("javascript:alert(1)"), null);
  assert.throws(() => content.normalizeSettings({ social: { instagram: "https://not-instagram.example/test" } }));
  assert.throws(() => content.normalizeSettings({ phone: "not a phone" }));
  assert.throws(() => content.normalizeSettings({ cursorVideos: [{ url: "https://example.com/video" }] }));
  assert.throws(() => content.normalizeBlocks([{ type: "video", url: "https://example.com/video" }]));
});

test("home script renders managed FAQs and video controls", async () => {
  const script = await fs.readFile(new URL("../public/src/main.js", import.meta.url), "utf8");
  const defaults = await fs.readFile(new URL("../lib/content.js", import.meta.url), "utf8");
  assert.doesNotMatch(script, /هل تضمنون نتائج/);
  assert.match(defaults, /اسعارنا توصل لربع اسعار منافسينا التقليديين/);
  assert.match(script, /settings\.faqs/);
  assert.match(script, /video-prev/);
});

test("admin can delete a project", async () => {
  const deleted = await admin.fetch(request(`/api/admin?action=project&id=${project.id}`, { method: "DELETE", headers: { cookie, "X-CSRF-Token": csrf } }));
  assert.equal(deleted.status, 200);
  assert.equal((await page.fetch(request(`/api/page?view=work&slug=${encodeURIComponent(project.slug)}`))).status, 404);
});

test.after(async () => { await fs.rm(process.env.DEV_DATA_DIR, { recursive: true, force: true }); });
