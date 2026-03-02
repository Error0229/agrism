import { NextResponse } from 'next/server'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { hash } from '@node-rs/argon2'
import { db } from '@/server/db'
import { appUsers, farms, farmMembers } from '@/server/db/schema'

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).max(60).optional(),
})

export async function POST(req: Request) {
  try {
    const json = await req.json()
    const parsed = signupSchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json({ error: '資料格式錯誤' }, { status: 400 })
    }

    const { email, password, name } = parsed.data

    // Check if email already exists
    const [existing] = await db
      .select({ id: appUsers.id })
      .from(appUsers)
      .where(eq(appUsers.email, email))
      .limit(1)

    if (existing) {
      return NextResponse.json({ error: '此 Email 已被註冊' }, { status: 409 })
    }

    // Hash password with argon2
    const passwordHash = await hash(password)

    // Create user → farm → membership
    // Note: neon-http doesn't support transactions. If farm/membership
    // creation fails, an orphan user row may remain (recoverable).
    const [user] = await db
      .insert(appUsers)
      .values({ email, name: name ?? null, passwordHash })
      .returning({ id: appUsers.id, email: appUsers.email, name: appUsers.name })

    const [farm] = await db
      .insert(farms)
      .values({ name: `${name ?? '我的'}農場`, createdBy: user.id })
      .returning({ id: farms.id })

    await db
      .insert(farmMembers)
      .values({ farmId: farm.id, userId: user.id, role: 'owner' })

    return NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        defaultFarmId: farm.id,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : '註冊失敗'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
