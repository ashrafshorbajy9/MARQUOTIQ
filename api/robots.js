import { getSettings } from "../lib/repository.js";

export default { async fetch(request) {
  try {
    const settings = await getSettings();
    const body = settings.maintenance ? "User-agent: *\nDisallow: /\n" : `User-agent: *\nDisallow: /admin\nDisallow: /api/\nSitemap: ${new URL(request.url).origin}/sitemap.xml\n`;
    return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, s-maxage=300" } });
  } catch (error) { console.error(error); return new Response("User-agent: *\nDisallow: /\n", { headers: { "Content-Type": "text/plain" } }); }
} };
