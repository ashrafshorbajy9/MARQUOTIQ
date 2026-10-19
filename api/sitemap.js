import { getSettings, listProjects } from "../lib/repository.js";

export default { async fetch(request) {
  try {
    const settings = await getSettings();
    if (settings.maintenance) return new Response("", { status: 503, headers: { "Cache-Control": "no-store" } });
    const origin = new URL(request.url).origin;
    const projects = await listProjects(true);
    const urls = [origin, ...projects.map((project) => `${origin}/work/${encodeURIComponent(project.slug)}`)];
    const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map((url) => `<url><loc>${url.replace(/&/g, "&amp;")}</loc></url>`).join("")}</urlset>`;
    return new Response(xml, { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, s-maxage=300" } });
  } catch (error) { console.error(error); return new Response("", { status: 503 }); }
} };
