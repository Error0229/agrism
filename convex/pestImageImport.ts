"use node";

import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

// === R2 Configuration ===

function getR2Client(): S3Client {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error("Missing R2 environment variables (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY)");
  }

  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
}

function getR2Config() {
  const bucketName = process.env.R2_BUCKET_NAME;
  const publicUrl = process.env.R2_PUBLIC_URL;
  if (!bucketName || !publicUrl) {
    throw new Error("Missing R2 environment variables (R2_BUCKET_NAME, R2_PUBLIC_URL)");
  }
  return { bucketName, publicUrl };
}

// === MOA API Types ===

interface MoaRecord {
  ID: string;
  PestName_Ch: string;
  PestName_En: string;
  PestName_Scientific: string;
  Order_Latina: string;
  Order_Ch: string;
  Family_Latina: string;
  Family_Ch: string;
  EatWay: string;
  Harm_Root: string;
  Harm_Stem: string;
  Harm_leaf: string;
  Harm_Flower: string;
  Harm_Fruit: string;
  Harm_Plant: string;
  Crop_Name: string;
  Crop_ScientificName: string;
  Crop_Family_Latina: string;
  Image: string;
}

// === Feeding method mapping ===

function mapFeedingMethod(eatWay: string): string | undefined {
  switch (eatWay) {
    case "1": return "chewing";
    case "2": return "piercing_sucking";
    default: return undefined;
  }
}

// === Harm parts extraction ===

function extractHarmParts(record: MoaRecord): string[] {
  const parts: string[] = [];
  if (record.Harm_Root === "Y") parts.push("root");
  if (record.Harm_Stem === "Y") parts.push("stem");
  if (record.Harm_leaf === "Y") parts.push("leaf");
  if (record.Harm_Flower === "Y") parts.push("flower");
  if (record.Harm_Fruit === "Y") parts.push("fruit");
  if (record.Harm_Plant === "Y") parts.push("plant");
  return parts;
}

// === Image URL generation ===
// TARI diagnosis images follow a pattern: {diagId} with suffixes 01-09 for plant damage, 11-19 for pest body

function generateImageUrls(diagId: string): { url: string; category: string }[] {
  const urls: { url: string; category: string }[] = [];

  // Plant damage photos (suffix 01-05)
  for (let i = 1; i <= 5; i++) {
    const suffix = String(i).padStart(2, "0");
    urls.push({
      url: `https://digiins.tari.gov.tw/diagnosis/images2/${diagId}${suffix}.jpg`,
      category: "damage",
    });
  }

  // Pest body photos (suffix 11-15)
  for (let i = 11; i <= 15; i++) {
    urls.push({
      url: `https://digiins.tari.gov.tw/diagnosis/images2/${diagId}${i}.jpg`,
      category: "pest",
    });
  }

  return urls;
}

// === Download image with retries (TARI server is flaky) ===

async function downloadImage(
  url: string,
  maxRetries = 3,
): Promise<{ buffer: Buffer; contentType: string } | null> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": "agrism-pest-import/1.0 (https://agrism.catjam.dev)",
        },
        signal: AbortSignal.timeout(15000),
      });

      if (response.status === 404) {
        // Image doesn't exist — not an error, just skip
        return null;
      }

      if (response.ok) {
        const contentType = response.headers.get("content-type") ?? "image/jpeg";
        if (!contentType.startsWith("image/")) {
          return null;
        }
        const buffer = Buffer.from(await response.arrayBuffer());
        // Skip tiny responses (likely error pages)
        if (buffer.length < 1000) {
          return null;
        }
        return { buffer, contentType };
      }

      if (response.status === 429 && attempt < maxRetries) {
        const delay = attempt * 3000;
        console.warn(`downloadImage: rate limited for ${url}, retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      console.warn(`downloadImage: failed ${response.status} for ${url}`);
      return null;
    } catch (err) {
      const isRetryable =
        err instanceof Error &&
        (err.message.includes("ECONNREFUSED") ||
          err.message.includes("ECONNRESET") ||
          err.message.includes("ETIMEDOUT") ||
          err.name === "AbortError");

      if (isRetryable && attempt < maxRetries) {
        const delay = attempt * 5000; // Longer delay for connection errors
        console.warn(`downloadImage: connection error for ${url} (attempt ${attempt}), retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      console.warn(`downloadImage: network error for ${url} on attempt ${attempt}: ${err}`);
      return null;
    }
  }

  return null;
}

// === Upload image to R2 ===

async function uploadToR2(
  key: string,
  buffer: Buffer,
  contentType: string,
): Promise<boolean> {
  try {
    const s3 = getR2Client();
    const { bucketName } = getR2Config();

    await s3.send(new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000, immutable",
    }));

    return true;
  } catch (err) {
    console.warn(`uploadToR2: failed for key "${key}": ${err}`);
    return false;
  }
}

// === Create a basic thumbnail by re-uploading (no server-side resize for TARI) ===
// Note: We upload the same image as thumbnail since TARI images are already small.
// Frontend can use CSS to display at thumbnail size.

// === Batch import: fetch MOA dataset and schedule individual record imports ===

export const importMoaDataset = internalAction({
  args: {},
  handler: async (ctx) => {
    console.log("importMoaDataset: fetching MOA pest diagnostics dataset...");

    const response = await fetch(
      "https://data.moa.gov.tw/api/v1/ImportantAgriculturalPestDiagnosticsType/?$top=200",
      {
        headers: {
          "User-Agent": "agrism-pest-import/1.0 (https://agrism.catjam.dev)",
        },
      },
    );

    if (!response.ok) {
      throw new Error(`MOA API error: ${response.status} ${response.statusText}`);
    }

    const json = await response.json();
    const records: MoaRecord[] = json.Data ?? json;
    console.log(`importMoaDataset: received ${records.length} records`);

    let scheduledCount = 0;
    let skippedCount = 0;

    for (const record of records) {
      if (!record.ID || !record.PestName_Ch) {
        console.warn(`importMoaDataset: skipping record with missing ID or name`);
        skippedCount++;
        continue;
      }

      // Check if already imported (idempotency)
      const existing = await ctx.runQuery(
        internal.pestReferenceImages.getBySourceId,
        { source: "moa", sourceId: record.ID },
      );

      if (existing) {
        skippedCount++;
        continue;
      }

      // Schedule individual import with 3s stagger to be kind to TARI servers
      const delayMs = scheduledCount * 3000;
      await ctx.scheduler.runAfter(
        delayMs,
        internal.pestImageImport.importSingleMoaRecord,
        { record: JSON.stringify(record) },
      );

      scheduledCount++;
    }

    console.log(`importMoaDataset: done.`);
    console.log(`  Scheduled: ${scheduledCount} records for import`);
    console.log(`  Skipped: ${skippedCount} records (already imported or invalid)`);
  },
});

// === Import a single MOA record: download images, upload to R2, save to Convex ===

export const importSingleMoaRecord = internalAction({
  args: { record: v.string() },
  handler: async (ctx, { record: recordJson }) => {
    const record: MoaRecord = JSON.parse(recordJson);
    const diagId = record.ID;

    console.log(`importSingleMoaRecord: processing ${diagId} (${record.PestName_Ch})...`);

    // Double-check idempotency
    const existing = await ctx.runQuery(
      internal.pestReferenceImages.getBySourceId,
      { source: "moa", sourceId: diagId },
    );
    if (existing) {
      console.log(`importSingleMoaRecord: ${diagId} already imported, skipping`);
      return;
    }

    // Sanitize diagId to prevent path traversal in R2 keys
    const safeDiagId = diagId.replace(/[^a-zA-Z0-9_-]/g, "");

    // Try to download images from TARI
    const candidateUrls = generateImageUrls(diagId);
    const { publicUrl } = getR2Config();

    const images: {
      url: string;
      thumbnailUrl: string;
      category: string;
      description: string | undefined;
      sourceUrl: string;
      author: string | undefined;
      license: string;
    }[] = [];

    let imageIndex = 0;
    for (const candidate of candidateUrls) {
      const downloaded = await downloadImage(candidate.url);
      if (!downloaded) continue;

      const r2Key = `pests/moa/${safeDiagId}/${imageIndex}.jpg`;
      const r2ThumbKey = `pests/moa/${safeDiagId}/${imageIndex}_thumb.jpg`;

      // Upload medium image
      const uploadedMedium = await uploadToR2(r2Key, downloaded.buffer, downloaded.contentType);
      if (!uploadedMedium) continue;

      // Upload thumbnail (same image — TARI images are already small)
      const uploadedThumb = await uploadToR2(r2ThumbKey, downloaded.buffer, downloaded.contentType);
      if (!uploadedThumb) continue;

      images.push({
        url: `${publicUrl}/${r2Key}`,
        thumbnailUrl: `${publicUrl}/${r2ThumbKey}`,
        category: candidate.category,
        description: undefined,
        sourceUrl: candidate.url,
        author: undefined,
        license: "TW-Gov-OD",
      });

      imageIndex++;

      // Small delay between downloads
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    if (images.length === 0) {
      console.warn(`importSingleMoaRecord: no images found for ${diagId}, saving record without images`);
    }

    // Build harm parts array
    const harmParts = extractHarmParts(record);
    const feedingMethod = mapFeedingMethod(record.EatWay);

    // Save to Convex
    await ctx.runMutation(internal.pestReferenceImages.upsert, {
      source: "moa",
      sourceId: diagId,
      pestNameCh: record.PestName_Ch,
      pestNameEn: record.PestName_En || undefined,
      pestNameScientific: record.PestName_Scientific || undefined,
      orderLatin: record.Order_Latina || undefined,
      orderCh: record.Order_Ch || undefined,
      familyLatin: record.Family_Latina || undefined,
      familyCh: record.Family_Ch || undefined,
      feedingMethod,
      harmParts: harmParts.length > 0 ? harmParts : undefined,
      cropName: record.Crop_Name || undefined,
      cropScientificName: record.Crop_ScientificName || undefined,
      cropFamily: record.Crop_Family_Latina || undefined,
      images,
      importedAt: Date.now(),
    });

    console.log(`importSingleMoaRecord: saved ${diagId} with ${images.length} images`);
  },
});
