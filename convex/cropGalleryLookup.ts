"use node";

import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

// === R2 Configuration (shared with cropImageLookup.ts) ===

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

// === iNaturalist Types ===

interface INatPhoto {
  id: number;
  url: string;
  attribution: string;
  license_code: string | null;
}

interface INatObservation {
  id: number;
  uri: string;
  photos: INatPhoto[];
  faves_count: number;
  quality_grade: string;
  observed_on_details: { date: string } | null;
  place_guess: string | null;
}

interface INatResponse {
  total_results: number;
  results: INatObservation[];
}

// === Allowed CC licenses (iNaturalist license codes) ===

const ALLOWED_LICENSES = new Set([
  "cc0",
  "cc-by",
  "cc-by-nc",
  "cc-by-sa",
  "cc-by-nc-sa",
]);

// === License code to display label ===

function formatLicense(licenseCode: string | null): string {
  if (!licenseCode) return "Unknown";
  const map: Record<string, string> = {
    "cc0": "CC0",
    "cc-by": "CC BY",
    "cc-by-nc": "CC BY-NC",
    "cc-by-sa": "CC BY-SA",
    "cc-by-nc-sa": "CC BY-NC-SA",
  };
  return map[licenseCode] ?? licenseCode.toUpperCase();
}

// === Query iNaturalist observations API ===

async function queryINaturalist(
  scientificName: string,
  options: { placeId?: number; perPage?: number } = {},
): Promise<INatObservation[]> {
  const { placeId, perPage = 10 } = options;

  const params = new URLSearchParams({
    taxon_name: scientificName,
    photos: "true",
    quality_grade: "research",
    photo_license: "cc0,cc-by,cc-by-nc,cc-by-sa,cc-by-nc-sa",
    per_page: String(perPage),
    order_by: "votes",
  });

  if (placeId) {
    params.set("place_id", String(placeId));
  }

  const url = `https://api.inaturalist.org/v1/observations?${params.toString()}`;

  const response = await fetch(url, {
    headers: {
      "User-Agent": "agrism-crop-gallery/1.0 (https://agrism.catjam.dev)",
    },
  });

  if (!response.ok) {
    console.warn(`iNaturalist API error: ${response.status} ${response.statusText}`);
    return [];
  }

  const data: INatResponse = await response.json();
  return data.results ?? [];
}

// === Select top photos from observations ===

interface SelectedPhoto {
  photoUrl: string;        // Medium-sized URL from iNaturalist
  thumbnailUrl: string;    // Square thumbnail URL
  observationUrl: string;  // Link to the observation on iNaturalist
  attribution: string;     // Photographer credit
  licenseCode: string;     // CC license code
  observationDate: string | undefined;
  location: string | undefined;
  score: number;           // For sorting (faves_count)
}

function selectTopPhotos(observations: INatObservation[], maxPhotos: number): SelectedPhoto[] {
  const candidates: SelectedPhoto[] = [];

  for (const obs of observations) {
    if (!obs.photos || obs.photos.length === 0) continue;

    // Take only the first (best) photo from each observation
    const photo = obs.photos[0];
    if (!photo.license_code || !ALLOWED_LICENSES.has(photo.license_code)) continue;

    // iNaturalist photo URLs: replace "square" with "medium" for larger size
    // Default URL pattern: https://inaturalist-open-data.s3.amazonaws.com/photos/{id}/square.{ext}
    const mediumUrl = photo.url.replace("/square.", "/medium.");
    const thumbUrl = photo.url.replace("/square.", "/small.");

    candidates.push({
      photoUrl: mediumUrl,
      thumbnailUrl: thumbUrl,
      observationUrl: obs.uri,
      attribution: photo.attribution,
      licenseCode: photo.license_code,
      observationDate: obs.observed_on_details?.date ?? undefined,
      location: obs.place_guess ?? undefined,
      score: obs.faves_count ?? 0,
    });
  }

  // Sort by score (faves) descending, take top N
  candidates.sort((a, b) => b.score - a.score);
  return candidates.slice(0, maxPhotos);
}

// === Download image from URL ===

async function downloadImageFromUrl(
  url: string,
): Promise<{ buffer: Buffer; contentType: string } | null> {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": "agrism-crop-gallery/1.0 (https://agrism.catjam.dev)",
        },
      });

      if (response.ok) {
        const contentType = response.headers.get("content-type") ?? "image/jpeg";
        if (!contentType.startsWith("image/")) {
          console.warn(`downloadImageFromUrl: expected image, got ${contentType}`);
          return null;
        }
        return {
          buffer: Buffer.from(await response.arrayBuffer()),
          contentType,
        };
      }

      if (response.status === 429 && attempt < 3) {
        const delay = attempt * 3000;
        console.warn(`downloadImageFromUrl: rate limited, retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      console.warn(`downloadImageFromUrl: failed ${response.status} ${response.statusText}`);
      return null;
    } catch (err) {
      console.warn(`downloadImageFromUrl: network error on attempt ${attempt}: ${err}`);
      if (attempt === 3) return null;
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  return null;
}

// === Derive file extension from content-type ===

function extensionFromContentType(contentType: string): string {
  if (contentType.includes("webp")) return "webp";
  if (contentType.includes("png")) return "png";
  if (contentType.includes("gif")) return "gif";
  return "jpg";
}

// === Upload gallery images to R2 ===

async function uploadGalleryImageToR2(
  cropId: string,
  index: number,
  imageData: { buffer: Buffer; contentType: string },
  thumbData: { buffer: Buffer; contentType: string },
): Promise<{ imageKey: string; thumbKey: string } | null> {
  try {
    const s3 = getR2Client();
    const { bucketName } = getR2Config();

    const imageExt = extensionFromContentType(imageData.contentType);
    const thumbExt = extensionFromContentType(thumbData.contentType);

    const imageKey = `gallery/${cropId}/${index}.${imageExt}`;
    const thumbKey = `gallery/${cropId}/${index}_thumb.${thumbExt}`;

    await s3.send(new PutObjectCommand({
      Bucket: bucketName,
      Key: imageKey,
      Body: imageData.buffer,
      ContentType: imageData.contentType,
      CacheControl: "public, max-age=31536000, immutable",
    }));

    await s3.send(new PutObjectCommand({
      Bucket: bucketName,
      Key: thumbKey,
      Body: thumbData.buffer,
      ContentType: thumbData.contentType,
      CacheControl: "public, max-age=31536000, immutable",
    }));

    return { imageKey, thumbKey };
  } catch (err) {
    console.warn(`uploadGalleryImageToR2: failed for cropId "${cropId}" index ${index}: ${err}`);
    return null;
  }
}

// === Internal action: fetch gallery images for a crop from iNaturalist ===

export const fetchCropGallery = internalAction({
  args: {
    cropId: v.id("crops"),
  },
  handler: async (ctx, { cropId }) => {
    const crop = await ctx.runQuery(internal.crops.getByIdInternal, { cropId });
    if (!crop) {
      console.warn(`fetchCropGallery: crop ${cropId} not found`);
      return;
    }

    // Idempotent: skip if galleryImages already populated
    if (crop.galleryImages && crop.galleryImages.length > 0) {
      console.log(`fetchCropGallery: crop "${crop.name}" already has gallery images, skipping`);
      return;
    }

    const scientificName = crop.scientificName?.trim();
    if (!scientificName) {
      console.warn(`fetchCropGallery: crop "${crop.name}" has no scientificName, skipping`);
      return;
    }

    // Validate scientificName to prevent injection (same regex as cropImageLookup.ts)
    if (!/^[A-Za-z\s.\-×()]+$/.test(scientificName)) {
      console.log(`fetchCropGallery: skipping — invalid scientificName: ${scientificName}`);
      return;
    }

    // Step 1: Query iNaturalist with Taiwan filter (place_id 6903)
    console.log(`fetchCropGallery: searching iNaturalist for "${scientificName}" in Taiwan...`);
    const taiwanObs = await queryINaturalist(scientificName, { placeId: 6903, perPage: 10 });

    // Fall back to global search if too few results from Taiwan
    const observations: INatObservation[] = [...taiwanObs];
    if (taiwanObs.length < 3) {
      console.log(`fetchCropGallery: only ${taiwanObs.length} results from Taiwan, broadening search...`);
      const globalObs = await queryINaturalist(scientificName, { perPage: 10 });
      // Merge: Taiwan results first, then global (deduplicated)
      const seenIds = new Set(observations.map((o) => o.id));
      for (const obs of globalObs) {
        if (!seenIds.has(obs.id)) {
          observations.push(obs);
          seenIds.add(obs.id);
        }
      }
    }

    if (observations.length === 0) {
      console.warn(`fetchCropGallery: no observations found for "${scientificName}"`);
      // Store empty array to mark as processed
      await ctx.runMutation(internal.crops.applyCropGallery, {
        cropId,
        galleryImages: [],
      });
      return;
    }

    // Step 2: Select top 3-5 photos
    const selectedPhotos = selectTopPhotos(observations, 5);

    if (selectedPhotos.length === 0) {
      console.warn(`fetchCropGallery: no suitable licensed photos for "${scientificName}"`);
      await ctx.runMutation(internal.crops.applyCropGallery, {
        cropId,
        galleryImages: [],
      });
      return;
    }

    console.log(`fetchCropGallery: processing ${selectedPhotos.length} photos for "${crop.name}"...`);

    // Step 3: Download and upload each photo to R2
    const { publicUrl } = getR2Config();
    const galleryImages: {
      url: string;
      thumbnailUrl: string;
      source: string;
      sourceUrl: string;
      license: string;
      attribution: string;
      observationDate?: string;
      location?: string;
    }[] = [];

    for (let i = 0; i < selectedPhotos.length; i++) {
      const photo = selectedPhotos[i];

      // Download medium and thumbnail in parallel
      const [imageData, thumbData] = await Promise.all([
        downloadImageFromUrl(photo.photoUrl),
        downloadImageFromUrl(photo.thumbnailUrl),
      ]);

      if (!imageData || !thumbData) {
        console.warn(`fetchCropGallery: could not download photo ${i} for "${crop.name}", skipping`);
        continue;
      }

      // Upload to R2
      const uploaded = await uploadGalleryImageToR2(cropId, i, imageData, thumbData);
      if (!uploaded) {
        console.warn(`fetchCropGallery: R2 upload failed for photo ${i} of "${crop.name}", skipping`);
        continue;
      }

      const entry: {
        url: string;
        thumbnailUrl: string;
        source: string;
        sourceUrl: string;
        license: string;
        attribution: string;
        observationDate?: string;
        location?: string;
      } = {
        url: `${publicUrl}/${uploaded.imageKey}`,
        thumbnailUrl: `${publicUrl}/${uploaded.thumbKey}`,
        source: "inaturalist",
        sourceUrl: photo.observationUrl,
        license: formatLicense(photo.licenseCode),
        attribution: photo.attribution,
      };

      if (photo.observationDate) {
        entry.observationDate = photo.observationDate;
      }
      if (photo.location) {
        entry.location = photo.location;
      }

      galleryImages.push(entry);

      // Small delay between downloads to respect iNaturalist rate limits
      if (i < selectedPhotos.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    // Step 4: Save gallery images to the crop record
    await ctx.runMutation(internal.crops.applyCropGallery, {
      cropId,
      galleryImages,
    });

    console.log(`fetchCropGallery: saved ${galleryImages.length} gallery images for "${crop.name}" (${scientificName})`);
  },
});

// === Batch action: populate gallery for all existing crops ===

export const batchFetchAllGalleries = internalAction({
  args: {},
  handler: async (ctx) => {
    const allCrops = await ctx.runQuery(internal.crops.listAllCropsInternal, {});
    console.log(`batchFetchAllGalleries: scanning ${allCrops.length} crops...`);

    let scheduledCount = 0;
    let skippedCount = 0;

    for (const crop of allCrops) {
      // Skip crops without scientific names
      if (!crop.scientificName?.trim()) {
        skippedCount++;
        continue;
      }

      // Skip crops that already have gallery images
      if (crop.galleryImages && crop.galleryImages.length > 0) {
        skippedCount++;
        continue;
      }

      // Skip pending review crops
      if (crop.importStatus === "pending_review") {
        skippedCount++;
        continue;
      }

      // Schedule with staggered delays to respect iNaturalist rate limits (100 req/min)
      // Each crop may make 2 API calls (Taiwan + fallback) + up to 10 image downloads
      // Space them out by 5 seconds each to stay well within limits
      const delayMs = scheduledCount * 5000;
      await ctx.scheduler.runAfter(delayMs, internal.cropGalleryLookup.fetchCropGallery, {
        cropId: crop._id,
      });

      scheduledCount++;
    }

    console.log(`batchFetchAllGalleries: done.`);
    console.log(`  Scheduled: ${scheduledCount} crops for gallery fetch`);
    console.log(`  Skipped: ${skippedCount} crops (no scientificName, already has gallery, or pending review)`);
  },
});
