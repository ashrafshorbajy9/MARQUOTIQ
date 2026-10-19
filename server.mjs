import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import page from "./api/page.js";
import admin from "./api/admin.js";
import media from "./api/media.js";
import sitemap from "./api/sitemap.js";
import robots from "./api/robots.js";

const root = path.dirname(fileURLToPath(import.meta.url));
const publicRoot = path.join(root, "public");
const mime = { ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".svg": "image/svg+xml", ".webp": "image/webp", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".ttf": "font/ttf", ".otf": "font/otf" };
const port = Number(process.env.PORT || 3000);

async function staticFile(pathname) {
  let decoded;
  try { decoded = decodeURIComponent(pathname); } catch { return null; }
  const absolute = path.resolve(publicRoot, `.${decoded}`);
  if (!absolute.startsWith(`${publicRoot}${path.sep}`)) return null;
  try {
    const bytes = await fs.readFile(absolute);
    return new Response(bytes, { headers: { "Content-Type": mime[path.extname(absolute)] || "application/octet-stream", "Cache-Control": "public, max-age=3600", "X-Content-Type-Options": "nosniff" } });
  } catch (error) { if (error.code === "ENOENT" || error.code === "EISDIR") return null; throw error; }
}

const server = http.createServer(async (incoming, outgoing) => {
  try {
    const url = new URL(incoming.url, `http://${incoming.headers.host || `localhost:${port}`}`);
    let response;
    if (url.pathname.startsWith("/assets/") || url.pathname.startsWith("/src/")) response = await staticFile(url.pathname);
    else {
      const chunks = [];
      let size = 0;
      for await (const chunk of incoming) {
        size += chunk.length;
        if (size > 5_000_000) { outgoing.writeHead(413); outgoing.end("Too large"); return; }
        chunks.push(chunk);
      }
      const body = Buffer.concat(chunks);
      const request = new Request(url, { method: incoming.method, headers: incoming.headers, ...(body.length ? { body, duplex: "half" } : {}) });
      if (url.pathname === "/api/admin") response = await admin.fetch(request);
      else if (url.pathname === "/api/media") response = await media.fetch(request);
      else if (url.pathname === "/api/page") response = await page.fetch(request);
      else if (url.pathname === "/sitemap.xml") response = await sitemap.fetch(request);
      else if (url.pathname === "/robots.txt") response = await robots.fetch(request);
      else if (url.pathname === "/") response = await page.fetch(new Request(new URL("/api/page?view=home", url), { headers: incoming.headers }));
      else if (url.pathname === "/admin" || url.pathname === "/admin/") response = await page.fetch(new Request(new URL("/api/page?view=admin", url), { headers: incoming.headers }));
      else if (url.pathname.startsWith("/work/")) {
        const slug = decodeURIComponent(url.pathname.slice(6));
        response = await page.fetch(new Request(new URL(`/api/page?view=work&slug=${encodeURIComponent(slug)}`, url), { headers: incoming.headers }));
      }
    }
    response ||= new Response("Not found", { status: 404 });
    outgoing.writeHead(response.status, Object.fromEntries(response.headers));
    outgoing.end(Buffer.from(await response.arrayBuffer()));
  } catch (error) {
    console.error(error);
    outgoing.writeHead(500);
    outgoing.end("Internal server error");
  }
});

server.listen(port, "0.0.0.0", () => console.log(`MARQUOTIQ dev server: http://localhost:${port}`));
