import fs from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";
import { readSession } from "../lib/auth.js";
import { escapeHtml } from "../lib/content.js";
import { renderWorkPage } from "../lib/pages.js";
import { findProjectBySlug, getSettings, listProjects } from "../lib/repository.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const template = (name) => fs.readFile(path.join(root, "views", name), "utf8");

function html(content, status = 200, nonce = "") {
  return new Response(content, { status, headers: {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Content-Security-Policy": `default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; img-src 'self' data:; font-src 'self'; style-src 'self'; script-src 'self'${nonce ? ` 'nonce-${nonce}'` : ""}; connect-src 'self'; frame-src https://www.youtube-nocookie.com https://player.vimeo.com`,
  } });
}

async function handle(request) {
  if (request.method !== "GET") return new Response("Method not allowed", { status: 405 });
  const url = new URL(request.url);
  const view = url.searchParams.get("view") || "home";
  if (view === "admin") return html(await template("admin.html"));
  const settings = await getSettings();
  const session = readSession(request);
  if (settings.maintenance && !session) return html(await template("coming.html"), 503);
  if (view === "work") {
    const slug = url.searchParams.get("slug");
    const project = slug ? await findProjectBySlug(slug, !session) : null;
    return project ? html(renderWorkPage(project, settings, request.url)) : html(`<h1>المشروع غير موجود</h1><a href="/">العودة إلى الرئيسية</a>`, 404);
  }
  if (view !== "home") return html("<h1>الصفحة غير موجودة</h1>", 404);
  const projects = await listProjects(true);
  const nonce = randomBytes(16).toString("base64");
  const data = JSON.stringify({ settings, projects: projects.map(({ id, slug, title, year, coverUrl }) => ({ id, slug, title, year, coverUrl })) }).replace(/</g, "\\u003c");
  const page = (await template("home.html")).replace("<!-- SITE_DATA -->", `<script nonce="${nonce}">window.__SITE_DATA__=${data}</script>`);
  return html(page, 200, nonce);
}

export default { async fetch(request) {
  try { return await handle(request); }
  catch (error) {
    console.error(error);
    return html(`<h1>تعذر تحميل الموقع</h1><p>${escapeHtml(process.env.NODE_ENV === "production" ? "يرجى المحاولة لاحقًا." : error.message)}</p>`, 503);
  }
} };
