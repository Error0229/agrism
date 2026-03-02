/**
 * Seed default Hualien crops into the database.
 *
 * Usage:
 *   bun scripts/seed-crops.ts <farm_id>
 *   bun scripts/seed-crops.ts              # seeds for ALL farms
 *
 * Requires DATABASE_URL in env or .env.local
 */
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { eq } from 'drizzle-orm'
import * as schema from '../src/server/db/schema'
import { defaultCrops } from '../src/server/db/seed/crops'

// Load DATABASE_URL
if (!process.env.DATABASE_URL) {
  const fs = await import('fs')
  try {
    const envContent = fs.readFileSync('.env.local', 'utf-8')
    const match = envContent.match(/^DATABASE_URL=(.+)$/m)
    if (match) process.env.DATABASE_URL = match[1]
  } catch {
    // ignore
  }
}

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL not found in env or .env.local')
  process.exit(1)
}

const sql = neon(process.env.DATABASE_URL)
const db = drizzle({ client: sql, schema })

const farmIdArg = process.argv[2]

async function seedForFarm(farmId: string, farmName: string) {
  // Check if defaults already exist for this farm
  const [existing] = await db
    .select({ id: schema.crops.id })
    .from(schema.crops)
    .where(eq(schema.crops.farmId, farmId))
    .limit(1)

  if (existing) {
    console.log(`  Skipping "${farmName}" (${farmId}) — crops already exist`)
    return 0
  }

  const rows = defaultCrops.map((crop) => ({
    ...crop,
    farmId,
  }))

  await db.insert(schema.crops).values(rows)
  console.log(`  Seeded ${rows.length} crops for "${farmName}" (${farmId})`)
  return rows.length
}

console.log('Seeding default Hualien crops...\n')

let totalSeeded = 0

if (farmIdArg) {
  totalSeeded = await seedForFarm(farmIdArg, 'specified farm')
} else {
  // Seed for all farms
  const farms = await db.select({ id: schema.farms.id, name: schema.farms.name }).from(schema.farms)
  if (farms.length === 0) {
    console.error('No farms found. Create a user account first.')
    process.exit(1)
  }
  for (const farm of farms) {
    totalSeeded += await seedForFarm(farm.id, farm.name)
  }
}

console.log(`\nDone! Seeded ${totalSeeded} total crop records.`)
