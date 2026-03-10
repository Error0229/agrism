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

// === EPPO API Types ===

interface EppoCodeResult {
  eppocode: string;
  preferred: boolean;
}

interface EppoPhotoFile {
  size: string; // "small" | "medium" | "large"
  url: string;
}

interface EppoPhoto {
  id: number;
  title: string;
  author: string;
  source: string;
  license: string;
  files: EppoPhotoFile[];
}

// === EPPO API helpers ===

function getEppoApiKey(): string | null {
  return process.env.EPPO_API_KEY ?? null;
}

async function eppoFetch(path: string): Promise<Response> {
  const apiKey = getEppoApiKey();
  if (!apiKey) throw new Error("EPPO_API_KEY not set");

  const url = `https://api.eppo.int/gd/v2${path}`;
  return fetch(url, {
    headers: {
      "X-Api-Key": apiKey,
      "User-Agent": "agrism-pest-eppo/1.0 (https://agrism.catjam.dev)",
    },
  });
}

// === Resolve pest name to EPPO code ===

async function resolveEppoCode(pestName: string): Promise<string | null> {
  try {
    const response = await eppoFetch(
      `/tools/name2codes?name=${encodeURIComponent(pestName)}&onlyPreferred=true`,
    );

    if (!response.ok) {
      console.warn(`resolveEppoCode: API error ${response.status} for "${pestName}"`);
      return null;
    }

    const results: EppoCodeResult[] = await response.json();
    if (!results || results.length === 0) return null;

    // Prefer the first preferred result
    const preferred = results.find((r) => r.preferred);
    return preferred?.eppocode ?? results[0]?.eppocode ?? null;
  } catch (err) {
    console.warn(`resolveEppoCode: error for "${pestName}": ${err}`);
    return null;
  }
}

// === Fetch photos for an EPPO code ===

async function fetchEppoPhotos(eppoCode: string): Promise<EppoPhoto[]> {
  try {
    const response = await eppoFetch(`/taxons/taxon/${eppoCode}/photos`);

    if (!response.ok) {
      console.warn(`fetchEppoPhotos: API error ${response.status} for ${eppoCode}`);
      return [];
    }

    return await response.json();
  } catch (err) {
    console.warn(`fetchEppoPhotos: error for ${eppoCode}: ${err}`);
    return [];
  }
}

// === Download image ===

async function downloadImage(
  url: string,
): Promise<{ buffer: Buffer; contentType: string } | null> {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": "agrism-pest-eppo/1.0 (https://agrism.catjam.dev)",
        },
        signal: AbortSignal.timeout(15000),
      });

      if (response.ok) {
        const contentType = response.headers.get("content-type") ?? "image/jpeg";
        if (!contentType.startsWith("image/")) return null;
        const buffer = Buffer.from(await response.arrayBuffer());
        if (buffer.length < 500) return null;
        return { buffer, contentType };
      }

      if (response.status === 429 && attempt < 3) {
        const delay = attempt * 3000;
        console.warn(`downloadImage: rate limited, retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      return null;
    } catch (err) {
      if (attempt < 3) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        continue;
      }
      console.warn(`downloadImage: error for ${url}: ${err}`);
      return null;
    }
  }

  return null;
}

// === Upload to R2 ===

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

// === Lookup pest images from EPPO for a single pest name ===

export const lookupPestImages = internalAction({
  args: {
    pestName: v.string(),
    pestNameCh: v.optional(v.string()),
  },
  handler: async (ctx, { pestName, pestNameCh }) => {
    // Skip gracefully if EPPO_API_KEY not set
    const apiKey = getEppoApiKey();
    if (!apiKey) {
      console.log("lookupPestImages: EPPO_API_KEY not set, skipping");
      return null;
    }

    console.log(`lookupPestImages: looking up "${pestName}"...`);

    // Step 1: Resolve EPPO code
    const eppoCode = await resolveEppoCode(pestName);
    if (!eppoCode) {
      console.warn(`lookupPestImages: could not resolve EPPO code for "${pestName}"`);
      return null;
    }

    console.log(`lookupPestImages: resolved "${pestName}" -> ${eppoCode}`);

    // Step 2: Check cache — skip if already have a record for this EPPO code
    const existing = await ctx.runQuery(
      internal.pestReferenceImages.getByEppoCodeInternal,
      { eppoCode },
    );
    if (existing) {
      console.log(`lookupPestImages: cache hit for ${eppoCode}, skipping download`);
      return existing._id;
    }

    // Step 3: Fetch photos from EPPO
    const photos = await fetchEppoPhotos(eppoCode);
    if (photos.length === 0) {
      console.warn(`lookupPestImages: no photos found for ${eppoCode}`);
      return null;
    }

    // Sanitize eppoCode to prevent path traversal in R2 keys
    const safeEppoCode = eppoCode.replace(/[^a-zA-Z0-9_-]/g, "");

    // Take top 3 photos
    const topPhotos = photos.slice(0, 3);
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

    for (let i = 0; i < topPhotos.length; i++) {
      const photo = topPhotos[i];

      // Find medium and small URLs
      const mediumFile = photo.files.find((f) => f.size === "medium");
      const smallFile = photo.files.find((f) => f.size === "small");
      const imageUrl = mediumFile?.url ?? photo.files[0]?.url;

      if (!imageUrl) continue;

      // Download medium image
      const downloaded = await downloadImage(imageUrl);
      if (!downloaded) continue;

      const r2Key = `pests/eppo/${safeEppoCode}/${photo.id}.jpg`;
      const r2ThumbKey = `pests/eppo/${safeEppoCode}/${photo.id}_thumb.jpg`;

      // Upload medium
      const uploadedMedium = await uploadToR2(r2Key, downloaded.buffer, downloaded.contentType);
      if (!uploadedMedium) continue;

      // Download and upload thumbnail
      let thumbUploaded = false;
      if (smallFile?.url) {
        const thumbData = await downloadImage(smallFile.url);
        if (thumbData) {
          thumbUploaded = await uploadToR2(r2ThumbKey, thumbData.buffer, thumbData.contentType);
        }
      }
      // If no small file or download failed, use medium as thumbnail
      if (!thumbUploaded) {
        await uploadToR2(r2ThumbKey, downloaded.buffer, downloaded.contentType);
      }

      images.push({
        url: `${publicUrl}/${r2Key}`,
        thumbnailUrl: `${publicUrl}/${r2ThumbKey}`,
        category: "reference",
        description: photo.title || undefined,
        sourceUrl: `https://gd.eppo.int/taxon/${eppoCode}/photos`,
        author: photo.author || undefined,
        license: "EPPO-ODL",
      });

      // Small delay between downloads
      if (i < topPhotos.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    if (images.length === 0) {
      console.warn(`lookupPestImages: could not download any images for ${eppoCode}`);
      return null;
    }

    // Save to Convex
    const refId = await ctx.runMutation(internal.pestReferenceImages.upsert, {
      source: "eppo",
      sourceId: eppoCode,
      pestNameCh: pestNameCh ?? pestName,
      pestNameEn: pestName,
      pestNameScientific: pestName,
      eppoCode,
      images,
      importedAt: Date.now(),
    });

    console.log(`lookupPestImages: saved ${eppoCode} with ${images.length} images`);
    return refId;
  },
});

// === Batch lookup for triage results — scheduled after triage completes ===

export const batchLookupForTriage = internalAction({
  args: {
    observationId: v.id("pestObservations"),
  },
  handler: async (ctx, { observationId }) => {
    // Skip gracefully if EPPO_API_KEY not set
    const apiKey = getEppoApiKey();
    if (!apiKey) {
      console.log("batchLookupForTriage: EPPO_API_KEY not set, skipping");
      return;
    }

    // Fetch the observation to get triage results
    const obs = await ctx.runQuery(
      internal.pestObservations.getByIdInternal,
      { observationId },
    );
    if (!obs || !obs.triageResults || obs.triageResults.length === 0) {
      console.warn("batchLookupForTriage: no triage results found");
      return;
    }

    console.log(`batchLookupForTriage: processing ${obs.triageResults.length} triage results for observation ${observationId}...`);

    const referenceImageIds: string[] = [];
    const updatedTriageResults = [...obs.triageResults];

    for (let i = 0; i < obs.triageResults.length; i++) {
      const result = obs.triageResults[i];
      const pestName = result.possibleCause;

      if (!pestName || pestName === "Unknown") continue;

      try {
        // Try to resolve EPPO code and fetch images
        const eppoCode = await resolveEppoCode(pestName);
        if (!eppoCode) continue;

        // Check cache first
        const existing = await ctx.runQuery(
          internal.pestReferenceImages.getByEppoCodeInternal,
          { eppoCode },
        );

        if (!existing) {
          // Fetch images on demand
          const refId = await ctx.runAction(
            internal.pestEppoLookup.lookupPestImages,
            { pestName, pestNameCh: pestName },
          );
          if (refId) {
            const refIdStr = refId as string;
            referenceImageIds.push(refIdStr);
            updatedTriageResults[i] = {
              ...result,
              eppoCode,
              referenceImageId: refIdStr as typeof result.referenceImageId,
            };
          } else {
            updatedTriageResults[i] = {
              ...result,
              eppoCode,
            };
          }
        } else {
          referenceImageIds.push(existing._id as string);
          updatedTriageResults[i] = {
            ...result,
            eppoCode,
            referenceImageId: existing._id,
          };
        }

        // Rate limit: EPPO allows 60 req / 10s window
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (err) {
        console.warn(`batchLookupForTriage: error looking up "${pestName}": ${err}`);
        continue;
      }
    }

    // Update the observation with reference image links
    if (referenceImageIds.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const typedIds = referenceImageIds as any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const typedResults = updatedTriageResults as any;
      await ctx.runMutation(internal.pestObservations.linkReferenceImages, {
        observationId,
        referenceImageIds: typedIds,
        triageResults: typedResults,
      });

      console.log(`batchLookupForTriage: linked ${referenceImageIds.length} reference images to observation ${observationId}`);
    }
  },
});
