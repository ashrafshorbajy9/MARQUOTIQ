import { randomUUID } from "node:crypto";

export const homeSectionMeta = Object.freeze({
  hero: { label: "المقدمة", heading: "تسويق أذكى وميزانية أقل." },
  about: { label: "عن ماركوتيك", heading: "تسويق كثير… بس وش قاعد يشتغل؟" },
  videos: { label: "بالفيديو", heading: "بالفيديو." },
  services: { label: "خدماتنا", heading: "من أول فكرة لين تعرف وش اللي نفع." },
  process: { label: "طريقة العمل", heading: "شغل واضح من البداية." },
  ai: { label: "الذكاء الاصطناعي", heading: "AI يسرّع. فريقنا يضبط." },
  work: { label: "أعمالنا", heading: "أعمالنا." },
  faq: { label: "الأسئلة الشائعة", heading: "على بلاطة." },
  contact: { label: "تواصل معنا", heading: "خلّنا نتكلم عن نشاطك." },
});

export const defaultHomeSections = Object.freeze(Object.keys(homeSectionMeta).map((id) => ({ id, visible: true, title: "" })));

export const defaultFaqs = Object.freeze([
  { question: "هل تستخدمون الذكاء الاصطناعي في كل شيء؟", answer: "نستخدم أدوات الذكاء الاصطناعي والأتمتة في مهام مثل البحث والمسودات والتحليل والتقارير. والفريق يراجع المخرجات ويتأكد من مناسبتها قبل اعتمادها أو نشرها." },
  { question: "كم أسعار خدماتكم؟", answer: "يفضل التواصل معنا عشان نفهم طلبكم بالتحديد ونعطيكم عرض مناسب، اسعارنا توصل لربع اسعار منافسينا التقليديين." },
  { question: "هل أقدر أطلب خدمة واحدة؟", answer: "نحدد هذا بعد ما نفهم هدفك ونطاق الخدمة. تواصل معنا وخلّنا نشوف وش الأنسب لنشاطك." },
  { question: "هل ميزانية الإعلانات ضمن أتعابكم؟", answer: "ميزانية الإعلان منفصلة عن أتعاب إدارة الحملات، وتُوضح في العرض قبل بدء العمل." },
  { question: "هل الخدمات متاحة لكل الأنشطة؟", answer: "نراجع ملاءمة الخدمة حسب هدف النشاط والبيانات والموارد المتاحة، وبعدها نوضح لك إذا نقدر نخدمك وكيف." },
  { question: "متى تظهر النتائج؟", answer: "ما فيه مدة واحدة تناسب كل الأنشطة. الوقت يعتمد على القناة، المنافسة، الميزانية، جاهزية الموقع والبيانات، وطبيعة الهدف. نحدد توقعات واقعية بعد مراجعة وضعك." },
]);

export const emptySettings = Object.freeze({
  maintenance: false,
  email: "",
  phone: "",
  address: "",
  mapUrl: "",
  cursorVideos: [],
  homeSections: defaultHomeSections,
  faqs: defaultFaqs,
  social: { youtube: "", linkedin: "", instagram: "" },
});

export const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
})[character]);

const cleanText = (value, max) => String(value ?? "").trim().slice(0, max);
const validationError = (message) => Object.assign(new Error(message), { status: 400 });

export function normalizeHomeSections(value) {
  if (!Array.isArray(value) || value.length !== defaultHomeSections.length) throw validationError("يجب تضمين جميع أقسام الصفحة الرئيسية.");
  const ids = new Set(defaultHomeSections.map((section) => section.id));
  const seen = new Set();
  return value.map((section) => {
    const id = String(section?.id ?? "");
    if (!ids.has(id) || seen.has(id)) throw validationError("ترتيب الأقسام غير صالح.");
    seen.add(id);
    if (typeof section.visible !== "boolean") throw validationError("حالة ظهور القسم غير صالحة.");
    const title = cleanText(section.title, 100);
    if (String(section.title ?? "").trim().length > 100) throw validationError("عنوان القسم يجب ألا يتجاوز 100 حرف.");
    return { id, visible: section.visible, title };
  });
}

export function normalizeFaqs(value) {
  if (!Array.isArray(value) || value.length > 30) throw validationError("يمكن إضافة 30 سؤالًا كحد أقصى.");
  return value.map((item) => {
    const question = cleanText(item?.question, 200);
    const answer = cleanText(item?.answer, 3000);
    if (!question || !answer) throw validationError("اكتب السؤال والإجابة قبل الحفظ.");
    if (String(item.question).trim().length > 200 || String(item.answer).trim().length > 3000) throw validationError("السؤال أو الإجابة أطول من الحد المسموح.");
    return { question, answer };
  });
}

export function safeHttpUrl(value, allowedHosts) {
  const input = cleanText(value, 2048);
  if (!input) return "";
  try {
    const url = new URL(input);
    if (url.protocol !== "https:") return "";
    if (allowedHosts && !allowedHosts.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`))) return "";
    return url.toString();
  } catch {
    return "";
  }
}

export function normalizeSettings(input) {
  const social = input?.social ?? {};
  const email = cleanText(input?.email, 254);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("البريد الإلكتروني غير صالح.");
  const phone = cleanText(input?.phone, 32);
  if (phone && (!/^\+?[0-9\s()-]+$/.test(phone) || !/^\+?\d{7,15}$/.test(phone.replace(/[\s()-]/g, "")))) throw new Error("رقم الجوال غير صالح.");
  const mapInput = cleanText(input?.mapUrl, 2048);
  const mapUrl = safeHttpUrl(mapInput);
  if (mapInput && !mapUrl) throw new Error("رابط الخريطة يجب أن يبدأ بـ https://.");
  const domains = { youtube: ["youtube.com", "youtu.be"], linkedin: ["linkedin.com"], instagram: ["instagram.com"] };
  const links = {};
  for (const [platform, hosts] of Object.entries(domains)) {
    const raw = cleanText(social[platform], 2048);
    links[platform] = safeHttpUrl(raw, hosts);
    if (raw && !links[platform]) throw new Error(`رابط ${platform} غير صالح أو لا ينتمي للمنصة.`);
  }
  const rawVideos = input?.cursorVideos ?? [];
  if (!Array.isArray(rawVideos) || rawVideos.length > 12) throw new Error("يمكن إضافة 12 فيديو كحد أقصى.");
  const cursorVideos = rawVideos.map((video) => {
    const url = safeHttpUrl(video?.url);
    if (!videoEmbedUrl(url)) throw new Error("رابط الفيديو يجب أن يكون من YouTube أو Vimeo.");
    return { url, title: cleanText(video?.title, 120) };
  });
  return { maintenance: input?.maintenance === true, email, phone, address: cleanText(input?.address, 500), mapUrl, cursorVideos, social: links };
}

export function mediaKeyFromUrl(value) {
  const raw = String(value ?? "");
  const match = /^\/api\/media\?key=(projects%2F[0-9a-f-]{36}\.(?:jpg|png|webp|avif))$/i.exec(raw);
  return match ? decodeURIComponent(match[1]) : null;
}

export function mediaUrl(key) {
  return `/api/media?key=${encodeURIComponent(key)}`;
}

export function videoEmbedUrl(value) {
  try {
    const url = new URL(String(value ?? ""));
    if (url.protocol !== "https:") return null;
    const host = url.hostname.replace(/^www\./, "");
    let id;
    if (host === "youtu.be") id = url.pathname.slice(1).split("/")[0];
    if (host === "youtube.com" || host === "m.youtube.com") {
      id = url.pathname === "/watch" ? url.searchParams.get("v") : url.pathname.match(/^\/(?:shorts|embed)\/([^/]+)/)?.[1];
    }
    if (id && /^[A-Za-z0-9_-]{11}$/.test(id)) return `https://www.youtube-nocookie.com/embed/${id}`;
    if (host === "vimeo.com" || host === "player.vimeo.com") {
      id = url.pathname.match(/(?:\/video)?\/(\d+)(?:\/|$)/)?.[1];
      if (id) return `https://player.vimeo.com/video/${id}`;
    }
  } catch { /* Invalid URLs are rejected below. */ }
  return null;
}

export function normalizeBlocks(value) {
  if (!Array.isArray(value) || value.length > 120) throw new Error("المحتوى يجب ألا يتجاوز 120 عنصرًا.");
  return value.map((block) => {
    const type = String(block?.type ?? "");
    if (["paragraph", "heading", "bulletList", "orderedList", "quote"].includes(type)) {
      const text = cleanText(block.text, 6000);
      if (!text) throw new Error("لا يمكن حفظ عنصر نصي فارغ.");
      return { type, text };
    }
    if (type === "image") {
      const url = String(block.url ?? "");
      if (!mediaKeyFromUrl(url)) throw new Error("ارفع الصورة من لوحة الإدارة أولًا.");
      return { type, url, alt: cleanText(block.alt, 200), caption: cleanText(block.caption, 300) };
    }
    if (type === "video") {
      const url = safeHttpUrl(block.url);
      if (!videoEmbedUrl(url)) throw new Error("رابط الفيديو يجب أن يكون من YouTube أو Vimeo.");
      return { type, url, caption: cleanText(block.caption, 300) };
    }
    throw new Error("نوع عنصر المحتوى غير معروف.");
  });
}

export function normalizeProject(input, existing = null) {
  const title = cleanText(input?.title, 140);
  if (!title) throw new Error("اسم المشروع مطلوب.");
  const year = Number(input?.year);
  if (!Number.isInteger(year) || year < 1900 || year > new Date().getFullYear() + 1) throw new Error("سنة المشروع غير صالحة.");
  const coverUrl = String(input?.coverUrl ?? "");
  if (!mediaKeyFromUrl(coverUrl)) throw new Error("صورة الغلاف مطلوبة ويجب رفعها من لوحة الإدارة.");
  const suppliedSlug = cleanText(input?.slug, 90).replace(/\s+/g, "-");
  const slug = suppliedSlug || title.replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "").slice(0, 70);
  if (!/^[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*$/u.test(slug)) throw new Error("رابط المشروع غير صالح.");
  const id = existing?.id ?? randomUUID();
  const blocks = normalizeBlocks(input?.blocks ?? []);
  const status = input?.status === "published" ? "published" : "draft";
  if (status === "published" && !blocks.length) throw new Error("أضف محتوى واحدًا على الأقل قبل نشر المشروع.");
  return {
    id, slug, title, year, coverUrl,
    blocks, status,
    sortOrder: Number.isInteger(Number(input?.sortOrder)) ? Math.max(0, Number(input.sortOrder)) : 0,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function renderInline(text) {
  const source = String(text ?? "");
  const token = /(\*\*([^*\n]+)\*\*|\*([^*\n]+)\*|\[([^\]\n]+)\]\((https?:\/\/[^)\s]+)\))/g;
  let output = "";
  let cursor = 0;
  for (const match of source.matchAll(token)) {
    output += escapeHtml(source.slice(cursor, match.index)).replace(/\n/g, "<br />");
    if (match[2]) output += `<strong>${escapeHtml(match[2])}</strong>`;
    else if (match[3]) output += `<em>${escapeHtml(match[3])}</em>`;
    else {
      const href = safeHttpUrl(match[5]);
      output += href ? `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(match[4])}</a>` : escapeHtml(match[0]);
    }
    cursor = match.index + match[0].length;
  }
  return output + escapeHtml(source.slice(cursor)).replace(/\n/g, "<br />");
}

export function renderBlocks(blocks) {
  return blocks.map((block) => {
    if (block.type === "heading") return `<h2>${renderInline(block.text)}</h2>`;
    if (block.type === "paragraph") return `<p>${renderInline(block.text)}</p>`;
    if (block.type === "quote") return `<blockquote>${renderInline(block.text)}</blockquote>`;
    if (block.type === "bulletList" || block.type === "orderedList") {
      const tag = block.type === "bulletList" ? "ul" : "ol";
      return `<${tag}>${block.text.split("\n").filter(Boolean).map((item) => `<li>${renderInline(item)}</li>`).join("")}</${tag}>`;
    }
    if (block.type === "image") return `<figure><img src="${escapeHtml(block.url)}" alt="${escapeHtml(block.alt)}" loading="lazy" /><figcaption>${escapeHtml(block.caption)}</figcaption></figure>`;
    if (block.type === "video") return `<figure><div class="video-frame"><iframe src="${escapeHtml(videoEmbedUrl(block.url))}" title="فيديو المشروع" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div><figcaption>${escapeHtml(block.caption)}</figcaption></figure>`;
    return "";
  }).join("\n");
}
