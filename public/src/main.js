const services = [
  { title: "تحسين الظهور في محركات البحث", short: "SEO", description: "نرتب أساس ظهور موقعك في البحث من خلال فهم الكلمات والصفحات والمحتوى المناسب لجمهورك. ما نعدك بترتيب محدد؛ نشتغل على تحسينات واضحة ونراجع أثرها مع الوقت." },
  { title: "إدارة إعلانات Google", short: "GOOGLE ADS", description: "نجهز ونحسن حملات البحث والإعلانات بحسب هدفك والجمهور اللي تبي توصله. نتابع مؤشرات الحملة ونشاركك وش قاعد يصير، مع فصل ميزانية الإعلان عن أتعاب الخدمة." },
  { title: "إدارة إعلانات Meta", short: "META ADS", description: "نساعدك تبني حملات على منصات Meta برسائل وإبداعات تناسب جمهورك، ونختبر الخيارات ونتابع الأداء حسب البيانات المتاحة." },
  { title: "إدارة حسابات التواصل الاجتماعي", short: "SOCIAL", description: "نرتب محتوى حساباتك ونبرة حضورك وجدول النشر بما يناسب نشاطك ومواسم السوق. المحتوى يمر على مراجعة بشرية قبل النشر." },
  { title: "التسويق بالبريد الإلكتروني", short: "EMAIL", description: "نجهز رسائل بريد تساعدك تتواصل مع عملائك في الوقت المناسب، ونرتب الأتمتة والقياس بحسب بياناتك وموافقة جمهورك." },
  { title: "تحليل بيانات التسويق والتقارير", short: "ANALYTICS", description: "نجمع مؤشرات قنواتك في صورة مفهومة تساعدك تعرف وش اشتغل، وش يحتاج تعديل، وأي خطوة تستاهل الاختبار الجاي." },
  { title: "تطوير المواقع", short: "WEB", description: "نطور مواقع تخدم هدف النشاط وتسهّل على الزائر يعرف وش تقدم وكيف يتواصل معك. يبدأ الشغل بفهم الجمهور والمسار المطلوب، مو بالشكل لحاله." },
  { title: "التصميم الجرافيكي", short: "DESIGN", description: "نصمم مواد بصرية متسقة مع هويتك ورسالتك، للاستخدام في القنوات والحملات المتفق عليها." },
  { title: "إنتاج الفيديو", short: "VIDEO", description: "ننتج فيديوهات إعلانية ومقاطع قصيرة ومحتوى مناسب للقنوات الرقمية. نستخدم الأدوات الملائمة للمشروع، وكل مخرج يمر بمراجعة بشرية قبل التسليم." },
];

// Icon nodes are from Lucide and are kept local so the preview works offline.
const serviceIcons = [
  [["path", { d: "m21 21-4.34-4.34" }], ["circle", { cx: "11", cy: "11", r: "8" }]],
  [["path", { d: "M14 4.1 12 6" }], ["path", { d: "m5.1 8-2.9-.8" }], ["path", { d: "m6 12-1.9 2" }], ["path", { d: "M7.2 2.2 8 5.1" }], ["path", { d: "M9.037 9.69a.498.498 0 0 1 .653-.653l11 4.5a.5.5 0 0 1-.074.949l-4.349 1.041a1 1 0 0 0-.74.739l-1.04 4.35a.5.5 0 0 1-.95.074z" }]],
  [["path", { d: "M11 6a13 13 0 0 0 8.4-2.8A1 1 0 0 1 21 4v12a1 1 0 0 1-1.6.8A13 13 0 0 0 11 14H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z" }], ["path", { d: "M6 14a12 12 0 0 0 2.4 7.2 2 2 0 0 0 3.2-2.4A8 8 0 0 1 10 14" }], ["path", { d: "M8 6v8" }]],
  [["path", { d: "M16 10a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 14.286V4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" }], ["path", { d: "M20 9a2 2 0 0 1 2 2v10.286a.71.71 0 0 1-1.212.502l-2.202-2.202A2 2 0 0 0 17.172 19H10a2 2 0 0 1-2-2v-1" }]],
  [["path", { d: "m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7" }], ["rect", { x: "2", y: "4", width: "20", height: "16", rx: "2" }]],
  [["path", { d: "M12 16v5" }], ["path", { d: "M16 14v7" }], ["path", { d: "M20 10v11" }], ["path", { d: "m22 3-8.646 8.646a.5.5 0 0 1-.708 0L9.354 8.354a.5.5 0 0 0-.707 0L2 15" }], ["path", { d: "M4 18v3" }], ["path", { d: "M8 14v7" }]],
  [["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2" }], ["path", { d: "M3 9h18" }], ["path", { d: "M9 21V9" }]],
  [["path", { d: "M15.707 21.293a1 1 0 0 1-1.414 0l-1.586-1.586a1 1 0 0 1 0-1.414l5.586-5.586a1 1 0 0 1 1.414 0l1.586 1.586a1 1 0 0 1 0 1.414z" }], ["path", { d: "m18 13-1.375-6.874a1 1 0 0 0-.746-.776L3.235 2.028a1 1 0 0 0-1.207 1.207L5.35 15.879a1 1 0 0 0 .776.746L13 18" }], ["path", { d: "m2.3 2.3 7.286 7.286" }], ["circle", { cx: "11", cy: "11", r: "2" }]],
  [["path", { d: "m12.296 3.464 3.02 3.956" }], ["path", { d: "M20.2 6 3 11l-.9-2.4c-.3-1.1.3-2.2 1.3-2.5l13.5-4c1.1-.3 2.2.3 2.5 1.3z" }], ["path", { d: "M3 11h18v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" }], ["path", { d: "m6.18 5.276 3.1 3.899" }]],
];

const serviceIcon = (index) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${serviceIcons[index].map(([tag, attributes]) => `<${tag} ${Object.entries(attributes).map(([key, value]) => `${key}="${value}"`).join(" ")} />`).join("")}</svg>`;

const steps = [
  ["نسمع منك", "نشاطك، جمهورك، تحدياتك، ووش جرّبت قبل."],
  ["نراجع الصورة", "الموقع، القنوات، المنافسة، والبيانات المتاحة."],
  ["نرتب الأولويات", "نوضح فرص العمل والخطوات المقترحة ومؤشرات القياس."],
  ["نتفق على النطاق", "نحدد الخدمة والمخرجات والمسؤوليات والتكلفة بعد فهم الاحتياج."],
  ["ننفذ ونراجع", "الأتمتة تسرّع العمل، والفريق يراجع قبل الاعتماد أو النشر."],
  ["نتعلم من البيانات", "نراجع المؤشرات المتفق عليها ونناقش الخطوة التالية."],
];

const faqs = [
  ["هل تستخدمون الذكاء الاصطناعي في كل شيء؟", "نستخدم أدوات الذكاء الاصطناعي والأتمتة في مهام مثل البحث والمسودات والتحليل والتقارير. والفريق يراجع المخرجات ويتأكد من مناسبتها قبل اعتمادها أو نشرها."],
  ["هل تضمنون نتائج أو مبيعات؟", "لا نضمن رقمًا أو نتيجة محددة. نحدد مؤشرات مناسبة معك، ونتابع الأداء ونوضح وش تعلمنا من البيانات."],
  ["كم أسعار الخدمات؟", "ما عندنا أسعار منشورة للعامة. بعد ما نفهم احتياج نشاطك ونطاق العمل، نشاركك عرضًا واضحًا بالتكلفة والمخرجات."],
  ["هل أقدر أطلب خدمة واحدة؟", "نحدد هذا بعد ما نفهم هدفك ونطاق الخدمة. تواصل معنا وخلّنا نشوف وش الأنسب لنشاطك."],
  ["هل ميزانية الإعلانات ضمن أتعابكم؟", "ميزانية الإعلان منفصلة عن أتعاب إدارة الحملات، وتُوضح في العرض قبل بدء العمل."],
  ["هل الخدمات متاحة لكل الأنشطة؟", "نراجع ملاءمة الخدمة حسب هدف النشاط والبيانات والموارد المتاحة، وبعدها نوضح لك إذا نقدر نخدمك وكيف."],
  ["متى تظهر النتائج؟", "ما فيه مدة واحدة تناسب كل الأنشطة. الوقت يعتمد على القناة، المنافسة، الميزانية، جاهزية الموقع والبيانات، وطبيعة الهدف. نحدد توقعات واقعية بعد مراجعة وضعك."],
];

const siteData = window.__SITE_DATA__ || { projects: [], settings: {} };
const projects = siteData.projects || [];

const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);

document.querySelector("#service-list").innerHTML = services.map((service, index) => `
  <details class="service-item reveal">
    <summary><span class="service-icon">${serviceIcon(index)}</span><span class="service-copy"><span class="service-title">${escapeHtml(service.title)}</span><span class="service-short">${String(index + 1).padStart(2, "0")} / ${escapeHtml(service.short)}</span></span><span class="service-toggle" aria-hidden="true">+</span></summary>
    <div class="service-description"><p>${escapeHtml(service.description)}</p><a href="#contact">ناقش هذه الخدمة <span aria-hidden="true">↗</span></a></div>
  </details>`).join("");

document.querySelector("#process-steps").innerHTML = steps.map(([title, description], index) => `
  <div class="process-step reveal"><span class="step-number">${String(index + 1).padStart(2, "0")}</span><div><h3>${escapeHtml(title)}</h3><p>${escapeHtml(description)}</p></div></div>`).join("");

document.querySelector("#faq-list").innerHTML = faqs.map(([question, answer], index) => `
  <details class="faq-item reveal" ${index === 0 ? "open" : ""}><summary><span>${escapeHtml(question)}</span><span aria-hidden="true">+</span></summary><p>${escapeHtml(answer)}</p></details>`).join("");

const workTrack = document.querySelector("#work-track");
workTrack.innerHTML = projects.length ? projects.map((project, index) => `
  <a class="work-card reveal" href="/work/${encodeURIComponent(project.slug)}" aria-label="عرض مشروع ${escapeHtml(project.title)}"><div class="work-image"><img src="${escapeHtml(project.coverUrl)}" alt="غلاف مشروع ${escapeHtml(project.title)}" loading="lazy" draggable="false" /><span>${String(index + 1).padStart(2, "0")}</span></div><div class="work-meta"><h3>${escapeHtml(project.title)}</h3><p>${escapeHtml(project.year)}</p></div></a>`).join("") : '<div class="work-empty">ستظهر المشاريع هنا فور نشر أول عمل معتمد.</div>';
if (!projects.length) document.querySelector(".work-controls").hidden = true;

document.querySelector("#work-prev").addEventListener("click", () => workTrack.scrollBy({ left: 420, behavior: "smooth" }));
document.querySelector("#work-next").addEventListener("click", () => workTrack.scrollBy({ left: -420, behavior: "smooth" }));

let dragStart = 0;
let scrollStart = 0;
let dragging = false;
let dragged = false;
workTrack.addEventListener("pointerdown", (event) => {
  if (event.pointerType === "touch") return;
  dragging = true;
  dragged = false;
  dragStart = event.clientX;
  scrollStart = workTrack.scrollLeft;
});
workTrack.addEventListener("pointermove", (event) => {
  if (!dragging) return;
  if (Math.abs(event.clientX - dragStart) > 6 && !dragged) {
    dragged = true;
    workTrack.classList.add("dragging");
    workTrack.setPointerCapture(event.pointerId);
  }
  if (!dragged) return;
  workTrack.scrollLeft = scrollStart + (event.clientX - dragStart);
});
const endDrag = (event) => { dragging = false; workTrack.classList.remove("dragging"); if (workTrack.hasPointerCapture(event.pointerId)) workTrack.releasePointerCapture(event.pointerId); };
workTrack.addEventListener("pointerup", endDrag);
workTrack.addEventListener("pointercancel", endDrag);
workTrack.addEventListener("click", (event) => { if (dragged) event.preventDefault(); }, true);

const menuToggle = document.querySelector(".menu-toggle");
const mobileNav = document.querySelector("#mobile-nav");
menuToggle.addEventListener("click", () => {
  const expanded = menuToggle.getAttribute("aria-expanded") === "true";
  menuToggle.setAttribute("aria-expanded", String(!expanded));
  menuToggle.setAttribute("aria-label", expanded ? "فتح القائمة" : "إغلاق القائمة");
  mobileNav.hidden = expanded;
});
mobileNav.addEventListener("click", (event) => {
  if (event.target.closest("a")) {
    mobileNav.hidden = true;
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "فتح القائمة");
  }
});

const settings = siteData.settings || {};
const emailRow = document.querySelector("#contact-email-row");
const addressRow = document.querySelector("#contact-address-row");
if (settings.email) {
  const email = document.querySelector("#contact-email");
  email.textContent = settings.email;
  email.href = `mailto:${settings.email}`;
  emailRow.hidden = false;
}
if (settings.address) {
  document.querySelector("#contact-address").textContent = settings.address;
  addressRow.hidden = false;
}
if (settings.mapUrl) {
  const mapLink = document.querySelector("#contact-map");
  mapLink.href = settings.mapUrl;
  mapLink.hidden = false;
  addressRow.hidden = false;
}
document.querySelector("#contact-pending").hidden = !emailRow.hidden || !addressRow.hidden;
document.querySelectorAll("[data-social]").forEach((link) => {
  const url = settings.social?.[link.dataset.social];
  if (url) { link.href = url; link.hidden = false; }
});

document.querySelector("#year").textContent = new Date().getFullYear();

document.querySelectorAll(".value-lines > div, .services-end, .work-controls, .contact-details").forEach((element) => element.classList.add("reveal"));
document.querySelectorAll(".section-pad").forEach((section) => {
  let textOrder = 0;
  let itemOrder = 0;
  section.querySelectorAll(".reveal").forEach((element) => {
    const isRepeatedItem = element.matches(".service-item, .process-step, .faq-item, .work-card, .value-lines > div");
    const delay = isRepeatedItem ? (itemOrder++ % 3) * 85 : Math.min(textOrder++, 4) * 105;
    element.style.setProperty("--reveal-delay", `${delay}ms`);
  });
});

const header = document.querySelector(".site-header");
const syncHeader = () => header.classList.toggle("is-scrolled", window.scrollY > 18);
syncHeader();
window.addEventListener("scroll", syncHeader, { passive: true });

if ("IntersectionObserver" in window) {
  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("section-visible");
        sectionObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.03, rootMargin: "0px 0px -8% 0px" });
  document.querySelectorAll(".section-pad").forEach((element) => sectionObserver.observe(element));
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08, rootMargin: "0px 0px 40px 0px" });
  document.querySelectorAll(".reveal").forEach((element) => observer.observe(element));
} else {
  document.querySelectorAll(".section-pad").forEach((element) => element.classList.add("section-visible"));
  document.querySelectorAll(".reveal").forEach((element) => element.classList.add("is-visible"));
}
