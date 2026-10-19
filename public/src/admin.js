const state = { csrf: "", projects: [], settings: {}, editingId: null };
const $ = (selector, scope = document) => scope.querySelector(selector);
const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
let toastTimer;

function toast(message, isError = false) {
  const target = $("#admin-toast");
  target.textContent = message;
  target.classList.toggle("error", isError);
  target.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { target.hidden = true; }, 4500);
}

async function api(action, options = {}) {
  const response = await fetch(`/api/admin?action=${encodeURIComponent(action)}${options.query || ""}`, {
    method: options.method || "GET",
    headers: { ...(options.body ? { "Content-Type": "application/json" } : {}), ...(options.method && options.method !== "GET" && state.csrf ? { "X-CSRF-Token": state.csrf } : {}) },
    body: options.body ? JSON.stringify(options.body) : undefined,
    credentials: "same-origin",
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "تعذر إكمال الطلب.");
  return result;
}

function showLogin() {
  $("#admin-login").hidden = false;
  $("#admin-app").hidden = true;
}

function showApp() {
  $("#admin-login").hidden = true;
  $("#admin-app").hidden = false;
}

function selectTab(name) {
  for (const tab of ["projects", "settings"]) {
    const active = tab === name;
    $(`#tab-${tab}`).classList.toggle("active", active);
    $(`#tab-${tab}`).setAttribute("aria-selected", String(active));
    $(`#panel-${tab}`).hidden = !active;
  }
}

function renderProjectList() {
  const list = $("#project-list");
  list.innerHTML = state.projects.length ? state.projects.map((project) => `<button type="button" class="project-list-item ${project.id === state.editingId ? "active" : ""}" data-project-id="${escapeHtml(project.id)}"><img src="${escapeHtml(project.coverUrl)}" alt="" /><span><strong>${escapeHtml(project.title)}</strong><small>${escapeHtml(project.year)} · ${project.status === "published" ? "منشور" : "مسودة"}</small></span></button>`).join("") : '<p class="list-empty">لا توجد مشاريع بعد. أضف أول مشروع من زر +.</p>';
}

const blockLabels = { paragraph: "فقرة", heading: "عنوان", bulletList: "قائمة نقطية", orderedList: "قائمة مرقمة", quote: "اقتباس", image: "صورة", video: "فيديو" };

function blockMarkup(block) {
  const type = block.type;
  const header = `<div class="block-title"><span>${blockLabels[type]}</span><div><button type="button" data-block-action="up" aria-label="تحريك العنصر للأعلى" title="تحريك للأعلى">↑</button><button type="button" data-block-action="down" aria-label="تحريك العنصر للأسفل" title="تحريك للأسفل">↓</button><button type="button" data-block-action="remove" aria-label="حذف العنصر" title="حذف">×</button></div></div>`;
  let inner = "";
  if (["paragraph", "heading", "bulletList", "orderedList", "quote"].includes(type)) {
    const help = type.includes("List") ? "كل سطر يصبح عنصرًا في القائمة." : "حدّد كلمات ثم استخدم التنسيق. يمكن كتابة عدة أسطر.";
    inner = `<div class="inline-toolbar" role="toolbar" aria-label="تنسيق النص"><button type="button" data-format="bold" title="عريض"><strong>ع</strong></button><button type="button" data-format="italic" title="مائل"><em>م</em></button><button type="button" data-format="link" title="إضافة رابط">↗</button></div><textarea class="block-text" rows="${type === "paragraph" ? 5 : 3}" placeholder="اكتب هنا...">${escapeHtml(block.text || "")}</textarea><p class="block-help">${help}</p>`;
  } else if (type === "image") {
    inner = `<div class="image-block-preview">${block.url ? `<img src="${escapeHtml(block.url)}" alt="" />` : "لم تُرفع صورة"}</div><label>رفع صورة<input class="block-image-file" type="file" accept="image/jpeg,image/png,image/webp,image/avif" /></label><input class="block-url" type="hidden" value="${escapeHtml(block.url || "")}" /><label>النص البديل للصورة<input class="block-alt" maxlength="200" value="${escapeHtml(block.alt || "")}" /></label><label>تعليق الصورة<input class="block-caption" maxlength="300" value="${escapeHtml(block.caption || "")}" /></label>`;
  } else if (type === "video") {
    inner = `<label>رابط YouTube أو Vimeo<input class="block-url" type="url" dir="ltr" placeholder="https://youtube.com/watch?v=..." value="${escapeHtml(block.url || "")}" /></label><label>تعليق الفيديو<input class="block-caption" maxlength="300" value="${escapeHtml(block.caption || "")}" /></label>`;
  }
  return `<div class="editor-block" data-block-type="${type}">${header}<div class="block-body">${inner}</div></div>`;
}

function resetProjectEditor(project = null) {
  state.editingId = project?.id || null;
  const form = $("#project-form");
  form.reset();
  form.elements.title.value = project?.title || "";
  form.elements.year.value = project?.year || new Date().getFullYear();
  form.elements.slug.value = project?.slug || "";
  form.elements.sortOrder.value = project?.sortOrder ?? state.projects.length;
  form.elements.coverUrl.value = project?.coverUrl || "";
  form.elements.published.checked = project?.status === "published";
  $("#cover-preview").innerHTML = project?.coverUrl ? `<img src="${escapeHtml(project.coverUrl)}" alt="غلاف المشروع" />` : "<span>لم تُرفع صورة بعد</span>";
  $("#block-list").innerHTML = (project?.blocks || []).map(blockMarkup).join("");
  $("#editor-title").textContent = project?.title || "مشروع جديد";
  $("#delete-project").hidden = !project;
  const preview = $("#preview-project");
  preview.hidden = !project;
  if (project) preview.href = `/work/${encodeURIComponent(project.slug)}`;
  renderProjectList();
}

function readBlocks() {
  return [...document.querySelectorAll(".editor-block")].map((node) => {
    const type = node.dataset.blockType;
    if (["paragraph", "heading", "bulletList", "orderedList", "quote"].includes(type)) return { type, text: $(".block-text", node).value.trim() };
    if (type === "image") return { type, url: $(".block-url", node).value, alt: $(".block-alt", node).value.trim(), caption: $(".block-caption", node).value.trim() };
    return { type, url: $(".block-url", node).value.trim(), caption: $(".block-caption", node).value.trim() };
  }).filter((block) => block.type !== "paragraph" && block.type !== "heading" && block.type !== "bulletList" && block.type !== "orderedList" && block.type !== "quote" || block.text);
}

async function uploadImage(file) {
  if (!file) return null;
  if (file.size > 3_500_000) throw new Error("الصورة يجب ألا تتجاوز 3.5 MB.");
  const form = new FormData();
  form.append("file", file);
  const response = await fetch("/api/media", { method: "POST", headers: { "X-CSRF-Token": state.csrf }, body: form, credentials: "same-origin" });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "تعذر رفع الصورة.");
  return result.image.url;
}

function insertAroundSelection(textarea, before, after, fallback) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const value = textarea.value;
  const selected = value.slice(start, end) || fallback;
  textarea.value = value.slice(0, start) + before + selected + after + value.slice(end);
  textarea.focus();
  textarea.setSelectionRange(start + before.length, start + before.length + selected.length);
}

function renderSettings() {
  const form = $("#settings-form");
  const settings = state.settings;
  form.elements.email.value = settings.email || "";
  form.elements.phone.value = settings.phone || "";
  form.elements.address.value = settings.address || "";
  form.elements.mapUrl.value = settings.mapUrl || "";
  form.elements.youtube.value = settings.social?.youtube || "";
  form.elements.linkedin.value = settings.social?.linkedin || "";
  form.elements.instagram.value = settings.social?.instagram || "";
  form.elements.maintenance.checked = Boolean(settings.maintenance);
  $("#cursor-video-list").innerHTML = (settings.cursorVideos || []).map(videoRowMarkup).join("");
  $("#site-status").textContent = settings.maintenance ? "وضع التطوير فعّال" : "الموقع مفتوح للزوار";
  $("#site-status").classList.toggle("maintenance-active", Boolean(settings.maintenance));
}

function videoRowMarkup(video = {}) {
  return `<div class="settings-video-row"><label>رابط الفيديو<input class="cursor-video-url" type="url" required dir="ltr" placeholder="https://youtube.com/watch?v=..." value="${escapeHtml(video.url || "")}" /></label><label>عنوان الفيديو (اختياري)<input class="cursor-video-title" maxlength="120" placeholder="اسم الفيديو" value="${escapeHtml(video.title || "")}" /></label><div class="settings-video-actions"><button type="button" data-video-up aria-label="تحريك الفيديو للأعلى" title="تحريك للأعلى">↑</button><button type="button" data-video-down aria-label="تحريك الفيديو للأسفل" title="تحريك للأسفل">↓</button><button type="button" class="quiet-danger" data-video-remove aria-label="حذف الفيديو">حذف</button></div></div>`;
}

async function bootstrap() {
  try {
    const data = await api("bootstrap");
    state.csrf = data.csrf;
    state.projects = data.projects;
    state.settings = data.settings;
    showApp();
    renderSettings();
    resetProjectEditor();
  } catch (error) {
    showLogin();
  }
}

$("#login-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector("button");
  button.disabled = true;
  $("#login-feedback").textContent = "";
  try {
    await api("login", { method: "POST", body: { email: form.elements.email.value, password: form.elements.password.value } });
    form.elements.password.value = "";
    await bootstrap();
  } catch (error) { $("#login-feedback").textContent = error.message; }
  finally { button.disabled = false; }
});

$("#logout-button").addEventListener("click", async () => {
  try { await api("logout", { method: "POST" }); state.csrf = ""; showLogin(); }
  catch (error) { toast(error.message, true); }
});

$("#tab-projects").addEventListener("click", () => selectTab("projects"));
$("#tab-settings").addEventListener("click", () => selectTab("settings"));
$("#add-cursor-video").addEventListener("click", () => {
  const list = $("#cursor-video-list");
  if (list.children.length >= 12) return toast("يمكن إضافة 12 فيديو كحد أقصى.", true);
  list.insertAdjacentHTML("beforeend", videoRowMarkup());
  list.lastElementChild.querySelector("input").focus();
});
$("#cursor-video-list").addEventListener("click", (event) => {
  const row = event.target.closest(".settings-video-row");
  if (!row) return;
  if (event.target.closest("[data-video-remove]")) row.remove();
  if (event.target.closest("[data-video-up]") && row.previousElementSibling) row.parentNode.insertBefore(row, row.previousElementSibling);
  if (event.target.closest("[data-video-down]") && row.nextElementSibling) row.parentNode.insertBefore(row.nextElementSibling, row);
});
$("#new-project").addEventListener("click", () => resetProjectEditor());
$("#project-list").addEventListener("click", (event) => {
  const button = event.target.closest("[data-project-id]");
  if (button) resetProjectEditor(state.projects.find((project) => project.id === button.dataset.projectId));
});

$("#cover-file").addEventListener("change", async (event) => {
  try {
    const url = await uploadImage(event.target.files[0]);
    if (!url) return;
    $("#cover-url").value = url;
    $("#cover-preview").innerHTML = `<img src="${escapeHtml(url)}" alt="غلاف المشروع" />`;
    toast("رُفعت صورة الغلاف. احفظ المشروع لتظهر على الموقع.");
  } catch (error) { toast(error.message, true); }
  event.target.value = "";
});

$("#add-block").addEventListener("click", () => {
  $("#block-list").insertAdjacentHTML("beforeend", blockMarkup({ type: $("#block-type").value }));
  $("#block-list .editor-block:last-child .block-text, #block-list .editor-block:last-child .block-url")?.focus();
});

$("#block-list").addEventListener("click", (event) => {
  const block = event.target.closest(".editor-block");
  if (!block) return;
  const action = event.target.closest("[data-block-action]")?.dataset.blockAction;
  if (action === "remove") block.remove();
  if (action === "up" && block.previousElementSibling) block.parentNode.insertBefore(block, block.previousElementSibling);
  if (action === "down" && block.nextElementSibling) block.parentNode.insertBefore(block.nextElementSibling, block);
  const format = event.target.closest("[data-format]")?.dataset.format;
  if (!format) return;
  const textarea = $(".block-text", block);
  if (format === "bold") insertAroundSelection(textarea, "**", "**", "نص عريض");
  if (format === "italic") insertAroundSelection(textarea, "*", "*", "نص مائل");
  if (format === "link") {
    const url = window.prompt("رابط HTTPS:");
    if (url && /^https:\/\//i.test(url)) insertAroundSelection(textarea, "[", `](${url})`, "عنوان الرابط");
  }
});

$("#block-list").addEventListener("change", async (event) => {
  if (!event.target.matches(".block-image-file")) return;
  const block = event.target.closest(".editor-block");
  try {
    const url = await uploadImage(event.target.files[0]);
    if (!url) return;
    $(".block-url", block).value = url;
    $(".image-block-preview", block).innerHTML = `<img src="${escapeHtml(url)}" alt="معاينة الصورة" />`;
    toast("رُفعت الصورة. احفظ المشروع لتظهر في الصفحة.");
  } catch (error) { toast(error.message, true); }
  event.target.value = "";
});

$("#project-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector(".editor-footer button");
  button.disabled = true;
  try {
    const body = {
      ...(state.editingId ? { id: state.editingId } : {}),
      title: form.elements.title.value,
      year: form.elements.year.value,
      slug: form.elements.slug.value,
      sortOrder: form.elements.sortOrder.value,
      coverUrl: form.elements.coverUrl.value,
      status: form.elements.published.checked ? "published" : "draft",
      blocks: readBlocks(),
    };
    const { project } = await api("project", { method: "POST", body });
    state.projects = (await api("bootstrap")).projects;
    resetProjectEditor(project);
    toast(project.status === "published" ? "حُفظ المشروع ونُشر على الموقع." : "حُفظ المشروع كمسودة.");
  } catch (error) { toast(error.message, true); }
  finally { button.disabled = false; }
});

$("#delete-project").addEventListener("click", async () => {
  if (!state.editingId || !window.confirm("حذف هذا المشروع نهائيًا من الموقع؟")) return;
  try {
    await api("project", { method: "DELETE", query: `&id=${encodeURIComponent(state.editingId)}` });
    state.projects = (await api("bootstrap")).projects;
    resetProjectEditor();
    toast("حُذف المشروع.");
  } catch (error) { toast(error.message, true); }
});

$("#settings-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector(".settings-actions button");
  button.disabled = true;
  try {
    const { settings } = await api("settings", { method: "POST", body: {
      email: form.elements.email.value,
      phone: form.elements.phone.value,
      address: form.elements.address.value,
      mapUrl: form.elements.mapUrl.value,
      cursorVideos: [...document.querySelectorAll(".settings-video-row")].map((row) => ({ url: $(".cursor-video-url", row).value.trim(), title: $(".cursor-video-title", row).value.trim() })),
      social: { youtube: form.elements.youtube.value, linkedin: form.elements.linkedin.value, instagram: form.elements.instagram.value },
      maintenance: form.elements.maintenance.checked,
    } });
    state.settings = settings;
    renderSettings();
    toast("حُفظت بيانات الموقع.");
  } catch (error) { toast(error.message, true); }
  finally { button.disabled = false; }
});

bootstrap();
