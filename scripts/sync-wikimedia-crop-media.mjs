import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { S3Client, PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";

// Load env vars from .env.local
const envPath = resolve(process.cwd(), ".env.local");
const envContent = readFileSync(envPath, "utf-8");
for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eqIdx = trimmed.indexOf("=");
  if (eqIdx === -1) continue;
  const key = trimmed.slice(0, eqIdx).trim();
  const value = trimmed.slice(eqIdx + 1).trim();
  if (!process.env[key]) {
    process.env[key] = value;
  }
}

const { DEFAULT_CROP_MEDIA_CATALOG } = await import("../shared/crop-media.ts");

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;

if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) {
  console.error("Missing R2 environment variables. Check .env.local for R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME");
  process.exit(1);
}

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

const SIZES = [
  { name: "thumb", width: 64, height: 64, fit: "cover" },
  { name: "medium", width: 300, height: 300, fit: "cover" },
  { name: "large", width: 800, height: null, fit: "inside" },
];

const MAX_DOWNLOAD_ATTEMPTS = 5;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function objectExists(key) {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key }));
    return true;
  } catch {
    return false;
  }
}

async function downloadImage(crop) {
  const sourceUrl = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(crop.fileTitle)}?width=1200`;

  for (let attempt = 1; attempt <= MAX_DOWNLOAD_ATTEMPTS; attempt++) {
    const response = await fetch(sourceUrl, {
      headers: { "User-Agent": "agrism-crop-media-sync/1.0" },
    });

    if (response.ok) {
      const contentType = response.headers.get("content-type") ?? "";
      if (!contentType.startsWith("image/")) {
        throw new Error(`Expected image for ${crop.name}, got ${contentType}`);
      }
      return Buffer.from(await response.arrayBuffer());
    }

    if (response.status !== 429 || attempt === MAX_DOWNLOAD_ATTEMPTS) {
      throw new Error(`Failed to download ${crop.name}: ${response.status} ${response.statusText}`);
    }

    const delay = attempt * 5000;
    console.warn(`  Rate limited on ${crop.name}, retrying in ${delay}ms...`);
    await sleep(delay);
  }
}

async function processAndUpload(crop) {
  // Check if all sizes already exist (idempotent)
  const keys = SIZES.map((s) => `crops/${crop.slug}/${s.name}.webp`);
  const existChecks = await Promise.all(keys.map(objectExists));

  if (existChecks.every(Boolean)) {
    console.log(`[skip] ${crop.slug} — all sizes already uploaded`);
    return;
  }

  console.log(`[download] ${crop.slug} (${crop.name})...`);
  const imageBuffer = await downloadImage(crop);

  for (const size of SIZES) {
    const key = `crops/${crop.slug}/${size.name}.webp`;

    // Skip individual sizes that already exist
    const idx = SIZES.indexOf(size);
    if (existChecks[idx]) {
      console.log(`  [skip] ${size.name} already exists`);
      continue;
    }

    let webpBuffer;
    try {
      let pipeline = sharp(imageBuffer, { failOnError: false });
      if (size.height) {
        pipeline = pipeline.resize(size.width, size.height, { fit: size.fit });
      } else {
        pipeline = pipeline.resize(size.width, undefined, { fit: size.fit, withoutEnlargement: true });
      }
      webpBuffer = await pipeline.webp({ quality: 80 }).toBuffer();
    } catch (sharpErr) {
      console.warn(`  [warn] sharp failed for ${size.name}: ${sharpErr.message}`);
      // Re-download at the target width as a fallback — Wikimedia may serve a more compatible format
      const fallbackUrl = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(crop.fileTitle)}?width=${size.width}`;
      const fallbackRes = await fetch(fallbackUrl, {
        headers: { "User-Agent": "agrism-crop-media-sync/1.0" },
      });
      if (!fallbackRes.ok) {
        console.error(`  [error] fallback download failed for ${size.name}: ${fallbackRes.status}`);
        continue;
      }
      const fallbackBuffer = Buffer.from(await fallbackRes.arrayBuffer());
      try {
        let fallbackPipeline = sharp(fallbackBuffer, { failOnError: false });
        if (size.height) {
          fallbackPipeline = fallbackPipeline.resize(size.width, size.height, { fit: size.fit });
        } else {
          fallbackPipeline = fallbackPipeline.resize(size.width, undefined, { fit: size.fit, withoutEnlargement: true });
        }
        webpBuffer = await fallbackPipeline.webp({ quality: 80 }).toBuffer();
      } catch (retryErr) {
        console.error(`  [error] sharp fallback also failed for ${size.name}: ${retryErr.message}`);
        continue;
      }
    }

    await s3.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
        Body: webpBuffer,
        ContentType: "image/webp",
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );

    console.log(`  [upload] ${key} (${(webpBuffer.length / 1024).toFixed(1)} KB)`);
  }
}

console.log(`Processing ${DEFAULT_CROP_MEDIA_CATALOG.length} crops...`);
console.log(`Bucket: ${R2_BUCKET_NAME}`);
console.log();

for (const crop of DEFAULT_CROP_MEDIA_CATALOG) {
  try {
    await processAndUpload(crop);
  } catch (err) {
    console.error(`[error] ${crop.slug}: ${err.message}`);
  }
  // Rate-limit courtesy delay between downloads
  await sleep(1500);
}

console.log("\nDone.");
