import { escapeHtml, renderBlocks, safeHttpUrl } from "./content.js";

const logo = "/assets/MARQUOTIQ_Logo_Files/SVG/03_MARQUOTIQ_Horizontal-Lockup.svg";
const reversedLogo = "/assets/MARQUOTIQ_Logo_Files/SVG/04_MARQUOTIQ_Reversed.svg";

function socialLinks(settings) {
  const names = { youtube: "YouTube", linkedin: "LinkedIn", instagram: "Instagram" };
  return Object.entries(settings.social ?? {}).map(([name, raw]) => {
    const url = safeHttpUrl(raw);
    return url && names[name] ? `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${names[name]}</a>` : "";
  }).join("");
}

export function renderWorkPage(project, settings, requestUrl) {
  const origin = new URL(requestUrl).origin;
  const title = escapeHtml(project.title);
  const cover = escapeHtml(project.coverUrl);
  const description = project.blocks.find((block) => block.type === "paragraph")?.text.slice(0, 155) || `${project.title}، أحد أعمال ماركوتيك.`;
  const url = `${origin}/work/${encodeURIComponent(project.slug)}`;
  return `<!doctype html>
<html lang="ar" dir="rtl"><head>
  <meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="description" content="${escapeHtml(description)}" />
  <meta property="og:title" content="${title} | ماركوتيك" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:image" content="${escapeHtml(`${origin}${project.coverUrl}`)}" />
  <meta property="og:type" content="article" />
  <link rel="canonical" href="${escapeHtml(url)}" />
  <link rel="icon" href="/assets/MARQUOTIQ_Logo_Files/SVG/02_MARQUOTIQ_Mark-Only.svg" type="image/svg+xml" />
  <link rel="stylesheet" href="/src/styles.css" />
  <title>${title} | ماركوتيك</title>
</head><body class="project-page">
  <a class="skip-link" href="#project-content">تجاوز إلى المحتوى</a>
  <header class="site-header"><div class="header-inner"><a class="brand" href="/" aria-label="ماركوتيك، الرئيسية"><img src="${logo}" alt="MARQUOTIQ ماركوتيك" /></a><nav class="desktop-nav" aria-label="القائمة الرئيسية"><a href="/#about">عن ماركوتيك</a><a href="/#services">خدماتنا</a><a href="/#process">طريقة العمل</a><a href="/#work">أعمالنا</a></nav><a class="header-cta" href="/#contact">تواصل معنا <span aria-hidden="true">↗</span></a><a class="project-mobile-back" href="/#work" aria-label="العودة إلى الأعمال">→</a></div></header>
  <main id="project-content"><section class="project-hero" aria-labelledby="project-title"><img src="${cover}" alt="غلاف مشروع ${title}" /><div class="project-hero-shade"></div><div class="wrap project-hero-inner"><a class="project-back" href="/#work">← جميع الأعمال</a><div><p class="eyebrow">MARQUOTIQ / WORK ${escapeHtml(project.year)}</p><h1 id="project-title">${title}</h1><span class="project-year">${escapeHtml(project.year)}</span></div></div></section>
  <article class="project-article wrap"><div class="project-article-index"><span>مشروع / ${escapeHtml(project.year)}</span><span class="index-line"></span></div><div class="project-rich-content">${project.blocks.length ? renderBlocks(project.blocks) : "<p>تفاصيل المشروع قيد التحرير.</p>"}</div></article>
  <section class="project-next"><div class="wrap"><p class="eyebrow">عندك مشروع يحتاج وضوح؟</p><h2>خلّنا نبدأ من<br /><span>الخطوة الصح.</span></h2><a class="button button-primary" href="/#contact">تواصل معنا <span aria-hidden="true">↗</span></a></div></section></main>
  <footer class="site-footer"><div class="wrap footer-top"><a href="/"><img src="${reversedLogo}" alt="MARQUOTIQ ماركوتيك" /></a><p>تسويق أذكى<br />وميزانية أقل.</p><div class="project-socials">${socialLinks(settings)}</div></div><div class="wrap footer-bottom"><span>© ${new Date().getFullYear()} MARQUOTIQ</span><a href="/#work">العودة إلى الأعمال</a><span>الإنسان يراجع. التقنية تسرّع.</span></div></footer>
</body></html>`;
}
