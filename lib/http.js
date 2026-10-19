export function json(data, status = 200, headers = {}) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store", ...headers } });
}

export function fail(error) {
  const status = Number.isInteger(error.status) && error.status >= 400 && error.status < 500 ? error.status : 500;
  if (status === 500) console.error(error);
  return json({ error: status === 500 ? "تعذر إكمال الطلب. حاول مرة أخرى لاحقًا." : error.message }, status);
}

export async function bodyJson(request) {
  const body = await request.text();
  if (body.length > 1_000_000) throw Object.assign(new Error("حجم البيانات كبير جدًا."), { status: 413 });
  try { return JSON.parse(body); }
  catch { throw Object.assign(new Error("بيانات الطلب غير صالحة."), { status: 400 }); }
}

export function notFound() {
  return json({ error: "غير موجود." }, 404);
}
