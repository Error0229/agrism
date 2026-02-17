import bcrypt from "bcryptjs";
import { getSqlClient } from "@/lib/server/db";

export interface AppUser {
  id: string;
  email: string;
  name: string | null;
  passwordHash: string;
}

async function ensureBaseExtensions() {
  const sql = getSqlClient();
  if (!sql) return false;
  await sql`CREATE EXTENSION IF NOT EXISTS pgcrypto;`;
  return true;
}

export async function ensureAuthSchema() {
  const sql = getSqlClient();
  if (!sql) return false;

  await ensureBaseExtensions();

  await sql`
    CREATE TABLE IF NOT EXISTS app_users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email TEXT UNIQUE NOT NULL,
      name TEXT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS farms (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      created_by UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS farm_members (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
      role TEXT NOT NULL CHECK (role IN ('owner', 'member')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (farm_id, user_id)
    );
  `;

  await sql`CREATE INDEX IF NOT EXISTS idx_farm_members_user_id ON farm_members(user_id);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_farm_members_farm_id ON farm_members(farm_id);`;

  return true;
}

export async function getUserByEmail(email: string): Promise<AppUser | null> {
  const sql = getSqlClient();
  if (!sql) return null;
  await ensureAuthSchema();

  const rows = await sql`
    SELECT id, email, name, password_hash
    FROM app_users
    WHERE email = ${email}
    LIMIT 1;
  `;

  if (rows.length === 0) return null;
  const row = rows[0];

  return {
    id: String(row.id),
    email: String(row.email),
    name: row.name ? String(row.name) : null,
    passwordHash: String(row.password_hash),
  };
}

export async function verifyPassword(password: string, passwordHash: string) {
  return bcrypt.compare(password, passwordHash);
}

export async function createUserWithDefaultFarm(input: { email: string; password: string; name?: string | null }) {
  const sql = getSqlClient();
  if (!sql) throw new Error("DATABASE_URL is missing.");
  await ensureAuthSchema();

  const existing = await getUserByEmail(input.email);
  if (existing) {
    throw new Error("Email already exists.");
  }

  const passwordHash = await bcrypt.hash(input.password, 10);
  const inserted = await sql`
    INSERT INTO app_users (email, name, password_hash)
    VALUES (${input.email}, ${input.name ?? null}, ${passwordHash})
    RETURNING id, email, name;
  `;

  const user = inserted[0];
  const farm = await sql`
    INSERT INTO farms (name, created_by)
    VALUES (${`${input.name ?? "我的"}農場`}, ${user.id}::uuid)
    RETURNING id;
  `;

  await sql`
    INSERT INTO farm_members (farm_id, user_id, role)
    VALUES (${farm[0].id}::uuid, ${user.id}::uuid, 'owner');
  `;

  return {
    id: String(user.id),
    email: String(user.email),
    name: user.name ? String(user.name) : null,
    defaultFarmId: String(farm[0].id),
  };
}

export async function getDefaultFarmIdForUser(userId: string) {
  const sql = getSqlClient();
  if (!sql) return null;
  await ensureAuthSchema();

  const rows = await sql`
    SELECT farm_id
    FROM farm_members
    WHERE user_id = ${userId}::uuid
    ORDER BY created_at ASC
    LIMIT 1;
  `;

  return rows[0]?.farm_id ? String(rows[0].farm_id) : null;
}

export async function ensureUserFarmMembership(userId: string, farmId: string) {
  const sql = getSqlClient();
  if (!sql) return false;
  await ensureAuthSchema();

  const rows = await sql`
    SELECT id
    FROM farm_members
    WHERE user_id = ${userId}::uuid
      AND farm_id = ${farmId}::uuid
    LIMIT 1;
  `;

  return rows.length > 0;
}

