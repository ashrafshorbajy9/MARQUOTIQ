import { assertMutation, clearSession, createSession, loginKey, readSession, verifyPassword } from "../lib/auth.js";
import { normalizeProject, normalizeSettings } from "../lib/content.js";
import { bodyJson, fail, json, notFound } from "../lib/http.js";
import { clearLoginFailures, deleteProject, findProjectById, getLoginAttempts, getSettings, listProjects, recordLoginFailure, saveProject, saveSettings } from "../lib/repository.js";

async function handle(request) {
  const url = new URL(request.url);
  const action = url.searchParams.get("action");
  const session = readSession(request);

  if (request.method === "POST" && action === "login") {
    const { email, password } = await bodyJson(request);
    const normalizedEmail = String(email ?? "").trim().toLowerCase();
    const key = loginKey(request, normalizedEmail);
    if (await getLoginAttempts(key) >= 5) return json({ error: "تكررت محاولات الدخول. حاول بعد 15 دقيقة." }, 429);
    const configured = process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD_HASH && process.env.SESSION_SECRET;
    if (!configured) return json({ error: "حساب المدير لم يُضبط بعد." }, 503);
    const valid = verifyPassword(String(password ?? ""), process.env.ADMIN_PASSWORD_HASH);
    if (!valid || normalizedEmail !== process.env.ADMIN_EMAIL.toLowerCase()) {
      await recordLoginFailure(key);
      return json({ error: "البريد أو كلمة المرور غير صحيحة." }, 401);
    }
    await clearLoginFailures(key);
    return json({ ok: true }, 200, { "Set-Cookie": createSession(normalizedEmail, request).cookie });
  }

  if (!session) return json({ error: "يلزم تسجيل الدخول." }, 401);

  if (request.method === "GET" && action === "bootstrap") {
    return json({ csrf: session.csrf, settings: await getSettings(), projects: await listProjects() });
  }

  if (request.method === "POST" && action === "logout") {
    assertMutation(request, session);
    return json({ ok: true }, 200, { "Set-Cookie": clearSession(request) });
  }

  if (request.method === "POST" && action === "settings") {
    assertMutation(request, session);
    const settings = normalizeSettings(await bodyJson(request));
    return json({ settings: await saveSettings(settings) });
  }

  if (request.method === "POST" && action === "project") {
    assertMutation(request, session);
    const input = await bodyJson(request);
    const existing = input.id ? await findProjectById(input.id) : null;
    if (input.id && !existing) return notFound();
    const project = normalizeProject(input, existing);
    return json({ project: await saveProject(project) });
  }

  if (request.method === "DELETE" && action === "project") {
    assertMutation(request, session);
    const id = url.searchParams.get("id");
    if (!id || !await deleteProject(id)) return notFound();
    return json({ ok: true });
  }

  return notFound();
}

export default { async fetch(request) { try { return await handle(request); } catch (error) { return fail(error); } } };
