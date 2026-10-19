import { assertMutation, readSession } from "../lib/auth.js";
import { fail, json } from "../lib/http.js";
import { readImage, saveImage } from "../lib/media.js";

async function handle(request) {
  const url = new URL(request.url);
  if (request.method === "GET") {
    const image = await readImage(url.searchParams.get("key"));
    if (!image) return new Response("Not found", { status: 404 });
    return new Response(image.bytes, {
      headers: {
        "Content-Type": image.mime,
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  }
  if (request.method === "POST") {
    const session = readSession(request);
    assertMutation(request, session);
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return json({ error: "اختر صورة أولًا." }, 400);
    return json({ image: await saveImage(file) }, 201);
  }
  return new Response("Method not allowed", { status: 405 });
}

export default { async fetch(request) { try { return await handle(request); } catch (error) { return fail(error); } } };
