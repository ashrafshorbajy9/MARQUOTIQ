import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { emptySettings } from "./content.js";
import { schemaSql } from "./schema.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const localDirectory = process.env.DEV_DATA_DIR || path.join(root, ".local-data");
const localFile = path.join(localDirectory, "store.json");
let writeQueue = Promise.resolve();
let poolPromise;
let schemaPromise;

function requireStorageConfiguration() {
  if (!process.env.DATABASE_URL && process.env.NODE_ENV === "production") {
    throw new Error("DATABASE_URL is required in production.");
  }
}

async function database() {
  requireStorageConfiguration();
  if (!process.env.DATABASE_URL) return null;
  if (!poolPromise) {
    poolPromise = import("pg").then(({ default: pg }) => new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      max: 4,
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 30000,
    }));
  }
  const pool = await poolPromise;
  if (!schemaPromise) {
    schemaPromise = pool.query(schemaSql);
  }
  await schemaPromise;
  return pool;
}

async function readLocal() {
  requireStorageConfiguration();
  try {
    return JSON.parse(await fs.readFile(localFile, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return { settings: structuredClone(emptySettings), projects: [], loginAttempts: {} };
    throw error;
  }
}

async function updateLocal(change) {
  const next = writeQueue.then(async () => {
    const data = await readLocal();
    const result = await change(data);
    await fs.mkdir(localDirectory, { recursive: true });
    const temp = `${localFile}.${process.pid}.tmp`;
    await fs.writeFile(temp, JSON.stringify(data, null, 2));
    await fs.rename(temp, localFile);
    return result;
  });
  writeQueue = next.catch(() => {});
  return next;
}

function mapProject(row) {
  return {
    id: row.id, slug: row.slug, title: row.title, year: row.year,
    coverUrl: row.cover_url, blocks: row.blocks, status: row.status,
    sortOrder: row.sort_order,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

export async function getSettings() {
  const db = await database();
  if (!db) return { ...structuredClone(emptySettings), ...(await readLocal()).settings };
  const { rows } = await db.query("SELECT value FROM site_settings WHERE id = 1");
  return { ...structuredClone(emptySettings), ...(rows[0]?.value ?? {}) };
}

export async function saveSettings(settings) {
  const db = await database();
  if (!db) return updateLocal((data) => { data.settings = settings; return settings; });
  await db.query("INSERT INTO site_settings (id, value) VALUES (1, $1::jsonb) ON CONFLICT (id) DO UPDATE SET value = EXCLUDED.value", [JSON.stringify(settings)]);
  return settings;
}

export async function listProjects(publishedOnly = false) {
  const db = await database();
  if (!db) {
    const projects = (await readLocal()).projects;
    return projects.filter((project) => !publishedOnly || project.status === "published")
      .sort((a, b) => a.sortOrder - b.sortOrder || b.updatedAt.localeCompare(a.updatedAt));
  }
  const { rows } = await db.query(`SELECT * FROM projects ${publishedOnly ? "WHERE status = 'published'" : ""} ORDER BY sort_order ASC, updated_at DESC`);
  return rows.map(mapProject);
}

export async function findProjectById(id) {
  if (!/^[0-9a-f-]{36}$/i.test(String(id))) return null;
  const db = await database();
  if (!db) return (await readLocal()).projects.find((project) => project.id === id) ?? null;
  const { rows } = await db.query("SELECT * FROM projects WHERE id = $1", [id]);
  return rows[0] ? mapProject(rows[0]) : null;
}

export async function findProjectBySlug(slug, publishedOnly = false) {
  const db = await database();
  if (!db) return (await readLocal()).projects.find((project) => project.slug === slug && (!publishedOnly || project.status === "published")) ?? null;
  const { rows } = await db.query(`SELECT * FROM projects WHERE slug = $1 ${publishedOnly ? "AND status = 'published'" : ""}`, [slug]);
  return rows[0] ? mapProject(rows[0]) : null;
}

export async function saveProject(project) {
  const db = await database();
  if (!db) return updateLocal((data) => {
    if (data.projects.some((item) => item.slug === project.slug && item.id !== project.id)) throw Object.assign(new Error("رابط المشروع مستخدم لمشروع آخر."), { status: 409 });
    const index = data.projects.findIndex((item) => item.id === project.id);
    if (index < 0) data.projects.push(project); else data.projects[index] = project;
    return project;
  });
  try {
    await db.query(`INSERT INTO projects (id,slug,title,year,cover_url,blocks,status,sort_order,created_at,updated_at)
      VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9,$10)
      ON CONFLICT (id) DO UPDATE SET slug=EXCLUDED.slug,title=EXCLUDED.title,year=EXCLUDED.year,
      cover_url=EXCLUDED.cover_url,blocks=EXCLUDED.blocks,status=EXCLUDED.status,
      sort_order=EXCLUDED.sort_order,updated_at=EXCLUDED.updated_at`,
      [project.id, project.slug, project.title, project.year, project.coverUrl, JSON.stringify(project.blocks), project.status, project.sortOrder, project.createdAt, project.updatedAt]);
    return project;
  } catch (error) {
    if (error.code === "23505") throw Object.assign(new Error("رابط المشروع مستخدم لمشروع آخر."), { status: 409 });
    throw error;
  }
}

export async function deleteProject(id) {
  if (!/^[0-9a-f-]{36}$/i.test(String(id))) return false;
  const db = await database();
  if (!db) return updateLocal((data) => { const before = data.projects.length; data.projects = data.projects.filter((project) => project.id !== id); return before !== data.projects.length; });
  const result = await db.query("DELETE FROM projects WHERE id = $1", [id]);
  return result.rowCount > 0;
}

export async function getLoginAttempts(key) {
  const db = await database();
  if (!db) {
    const entry = (await readLocal()).loginAttempts[key];
    return entry && entry.resetAt > Date.now() ? entry.attempts : 0;
  }
  const { rows } = await db.query("SELECT attempts FROM login_attempts WHERE key = $1 AND reset_at > now()", [key]);
  return rows[0]?.attempts ?? 0;
}

export async function recordLoginFailure(key) {
  const db = await database();
  if (!db) return updateLocal((data) => {
    const entry = data.loginAttempts[key];
    data.loginAttempts[key] = entry?.resetAt > Date.now() ? { attempts: entry.attempts + 1, resetAt: entry.resetAt } : { attempts: 1, resetAt: Date.now() + 15 * 60 * 1000 };
  });
  await db.query(`INSERT INTO login_attempts (key,attempts,reset_at) VALUES ($1,1,now()+interval '15 minutes')
    ON CONFLICT (key) DO UPDATE SET attempts=CASE WHEN login_attempts.reset_at < now() THEN 1 ELSE login_attempts.attempts + 1 END,
    reset_at=CASE WHEN login_attempts.reset_at < now() THEN now()+interval '15 minutes' ELSE login_attempts.reset_at END`, [key]);
}

export async function clearLoginFailures(key) {
  const db = await database();
  if (!db) return updateLocal((data) => { delete data.loginAttempts[key]; });
  await db.query("DELETE FROM login_attempts WHERE key = $1", [key]);
}
