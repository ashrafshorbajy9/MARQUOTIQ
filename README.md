# MARQUOTIQ website

Arabic-first, one-page agency site with project detail pages and a single-user admin area. The public design is derived from the approved internal preview. The contact email is displayed only; the site does not submit a contact form.

## What is included

- `/`: existing one-page site; published projects appear in the draggable portfolio. Admin-managed YouTube/Vimeo videos appear in a horizontal gallery beneath the idea section.
- `/work/:slug`: project detail with an unobstructed cover image, followed by its title and year, formatted text, uploaded images, and YouTube/Vimeo embeds.
- `/admin`: one-account login, project drafts/publishing, image upload, social links, email, mobile number, footer map, homepage video gallery, and maintenance toggle.
- Maintenance mode: visitors see “سنعود قريبًا”; a logged-in admin can still preview pages.
- `robots.txt` and `sitemap.xml` reflect maintenance mode and published projects.

## Local development

Node.js 20+ is required. Run `npm run dev` and open `http://localhost:3000`. When `DATABASE_URL` is absent outside production, data and images go into ignored `.local-data/` for development only. Do not use local test content as production content; connect Neon before entering final projects.

For an admin login, set these environment variables before starting the server:

| Variable | Purpose |
| --- | --- |
| `ADMIN_EMAIL` | Sole admin email |
| `ADMIN_PASSWORD_HASH` | scrypt hash; generate with `npm run hash-password` and provide the password on standard input |
| `SESSION_SECRET` | Random secret of at least 32 characters; rotate it to invalidate all sessions |

The hash command never needs the plaintext password in a source file or command argument. Do not commit credentials or send them in chat.

## Vercel + Neon setup

1. Create a Vercel project using this folder as the project root and the **Other** framework preset. The `vercel.json` routes the dynamic pages to Node.js Functions.
2. Add Neon Postgres through Vercel Marketplace and make its pooled `DATABASE_URL` available to Production and Preview. Tables are created on the first database request; `schema.sql` documents the schema.
3. Create a private Neon Object Storage bucket for project images. Add `AWS_ENDPOINT_URL_S3`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, and `MEDIA_BUCKET` to Vercel's environment variables. The public site serves media through `/api/media`; storage credentials never reach the browser.
4. Add `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH`, and `SESSION_SECRET` to Vercel's environment variables. Do not add plaintext passwords. Set a separate database/storage branch for Preview if it will be used to edit content.
5. Deploy, log in at `/admin`, add the email, mobile number, map and social URLs, then add any approved homepage videos and projects. Publish projects only after reviewing a draft page at `/work/:slug`. The map link appears beneath the footer social icons; the contact section displays only email and mobile number.

Production intentionally refuses to use local filesystem storage when `DATABASE_URL` or Neon Object Storage is missing. Images are limited to 3.5 MB and checked by file signature. YouTube/Vimeo videos are embedded from their links and are not uploaded.

Vercel Hobby is for personal, non-commercial use; a commercial agency site needs a suitable paid Vercel plan. Neon Free can be used while its limits meet the project's needs, but review reliability and backups before public launch.

## Verification

Run `npm test` for authentication, CSRF, settings, maintenance, upload, draft/publish, page rendering, URL validation, and deletion checks. These tests use isolated local data. A live Neon/Vercel integration test is still required after account access and environment variables are available.
