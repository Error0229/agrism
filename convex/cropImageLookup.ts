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

// === Slug Generation ===

function generateSlug(scientificName: string): string {
  return scientificName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

// === Wikidata SPARQL: find P18 image for a taxon by P225 scientific name ===

async function queryWikidataImage(scientificName: string): Promise<string | null> {
  const sparql = `
    SELECT ?image WHERE {
      ?taxon wdt:P225 "${scientificName.replace(/"/g, '\\"')}" .
      ?taxon wdt:P18 ?image .
    } LIMIT 1
  `;

  const url = `https://query.wikidata.org/sparql?query=${encodeURIComponent(sparql)}&format=json`;

  const response = await fetch(url, {
    headers: {
      "User-Agent": "agrism-crop-image-lookup/1.0",
      Accept: "application/sparql-results+json",
    },
  });

  if (!response.ok) {
    console.warn(`Wikidata SPARQL query failed: ${response.status}`);
    return null;
  }

  const data = await response.json();
  const bindings = data?.results?.bindings;
  if (!bindings || bindings.length === 0) return null;

  return bindings[0]?.image?.value ?? null;
}

// === Wikimedia Commons Action API: get file metadata (author, license) ===

interface CommonsMetadata {
  author: string;
  license: string;
  fileTitle: string;
  directUrl: string;
}

async function queryCommonsMetadata(imageUrl: string): Promise<CommonsMetadata | null> {
  let fileName: string | null = null;

  try {
    const parsed = new URL(imageUrl);
    if (parsed.hostname === "upload.wikimedia.org") {
      const parts = parsed.pathname.split("/").filter(Boolean);
      if (parts.length >= 5) {
        fileName = decodeURIComponent(parts[parts.length - 1]);
      }
    } else if (parsed.hostname === "commons.wikimedia.org") {
      const match = parsed.pathname.match(/Special:FilePath\/(.+)/);
      if (match) {
        fileName = decodeURIComponent(match[1]);
      }
    }
  } catch {
    return null;
  }

  if (!fileName) return null;

  const fileTitle = `File:${fileName}`;
  const apiUrl = `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(fileTitle)}&prop=imageinfo&iiprop=url|extmetadata&format=json`;

  const response = await fetch(apiUrl, {
    headers: { "User-Agent": "agrism-crop-image-lookup/1.0" },
  });

  if (!response.ok) {
    console.warn(`Commons API query failed: ${response.status}`);
    return null;
  }

  const data = await response.json();
  const pages = data?.query?.pages;
  if (!pages) return null;

  const page = Object.values(pages)[0] as { imageinfo?: Array<{ url?: string; extmetadata?: Record<string, { value?: string }> }> };
  const extmetadata = page?.imageinfo?.[0]?.extmetadata;
  if (!extmetadata) return null;

  const rawAuthor = extmetadata.Artist?.value ?? "Unknown";
  const author = rawAuthor.replace(/<[^>]*>/g, "").trim();

  const license =
    extmetadata.LicenseShortName?.value ??
    extmetadata.License?.value ??
    "Unknown";

  const directUrl = page?.imageinfo?.[0]?.url ?? "";

  return { author, license, fileTitle, directUrl };
}

// === Image Download from Wikimedia (pre-resized via ?width= parameter) ===

interface DownloadedImage {
  buffer: Buffer;
  contentType: string;
}

async function downloadImage(fileTitle: string, width: number): Promise<DownloadedImage | null> {
  const sourceUrl = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(fileTitle)}?width=${width}`;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetch(sourceUrl, {
        headers: { "User-Agent": "agrism-crop-image-lookup/1.0" },
      });

      if (response.ok) {
        const contentType = response.headers.get("content-type") ?? "image/jpeg";
        if (!contentType.startsWith("image/")) {
          console.warn(`downloadImage: expected image, got ${contentType}`);
          return null;
        }
        return {
          buffer: Buffer.from(await response.arrayBuffer()),
          contentType,
        };
      }

      if (response.status === 429 && attempt < 3) {
        const delay = attempt * 3000;
        console.warn(`downloadImage: rate limited, retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      console.warn(`downloadImage: failed ${response.status} ${response.statusText}`);
      return null;
    } catch (err) {
      console.warn(`downloadImage: network error on attempt ${attempt}: ${err}`);
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
  if (contentType.includes("svg")) return "svg";
  return "jpg";
}

// === R2 Upload ===

interface UploadResult {
  thumbKey: string;
  mediumKey: string;
  extension: string;
}

async function uploadToR2(
  slug: string,
  thumb: DownloadedImage,
  medium: DownloadedImage,
): Promise<UploadResult | null> {
  try {
    const s3 = getR2Client();
    const { bucketName } = getR2Config();

    const thumbExt = extensionFromContentType(thumb.contentType);
    const mediumExt = extensionFromContentType(medium.contentType);

    const thumbKey = `crops/${slug}/thumb.${thumbExt}`;
    const mediumKey = `crops/${slug}/medium.${mediumExt}`;

    await s3.send(new PutObjectCommand({
      Bucket: bucketName,
      Key: thumbKey,
      Body: thumb.buffer,
      ContentType: thumb.contentType,
      CacheControl: "public, max-age=31536000, immutable",
    }));

    await s3.send(new PutObjectCommand({
      Bucket: bucketName,
      Key: mediumKey,
      Body: medium.buffer,
      ContentType: medium.contentType,
      CacheControl: "public, max-age=31536000, immutable",
    }));

    return { thumbKey, mediumKey, extension: mediumExt };
  } catch (err) {
    console.warn(`uploadToR2: failed for slug "${slug}": ${err}`);
    return null;
  }
}

// === Internal action: auto-fetch image for a crop by scientific name ===

export const fetchCropImage = internalAction({
  args: {
    cropId: v.id("crops"),
  },
  handler: async (ctx, { cropId }) => {
    const crop = await ctx.runQuery(internal.crops.getByIdInternal, { cropId });
    if (!crop) {
      console.warn(`fetchCropImage: crop ${cropId} not found`);
      return;
    }

    // Idempotent: skip if imageUrl already points to R2
    const r2PublicUrl = process.env.R2_PUBLIC_URL ?? "";
    if (crop.imageUrl && r2PublicUrl && crop.imageUrl.startsWith(r2PublicUrl)) {
      return;
    }

    const scientificName = crop.scientificName?.trim();
    if (!scientificName) {
      console.warn(`fetchCropImage: crop ${crop.name} has no scientificName, skipping`);
      return;
    }

    // Validate scientificName to prevent SPARQL injection
    if (!/^[A-Za-z\s.\-×()]+$/.test(scientificName)) {
      console.log(`Skipping image lookup — invalid scientificName: ${scientificName}`);
      return;
    }

    const slug = generateSlug(scientificName);
    if (!slug) {
      console.warn(`fetchCropImage: could not generate slug for "${scientificName}"`);
      return;
    }

    // Step 1: Query Wikidata for the P18 image
    const wikidataImageUrl = await queryWikidataImage(scientificName);
    if (!wikidataImageUrl) {
      console.warn(`fetchCropImage: no Wikidata image found for "${scientificName}"`);
      return;
    }

    // Step 2: Get Commons metadata (author, license)
    const metadata = await queryCommonsMetadata(wikidataImageUrl);
    if (!metadata) {
      console.warn(`fetchCropImage: could not fetch Commons metadata for "${scientificName}"`);
      return;
    }

    const imageSourceUrl = `https://commons.wikimedia.org/wiki/${encodeURI(metadata.fileTitle.replace(/ /g, "_"))}`;

    // Step 3: Download pre-resized images from Wikimedia
    // Wikimedia's Special:FilePath with ?width= handles server-side resizing
    const [thumbResult, mediumResult] = await Promise.all([
      downloadImage(metadata.fileTitle, 64),
      downloadImage(metadata.fileTitle, 300),
    ]);

    if (!thumbResult || !mediumResult) {
      console.warn(`fetchCropImage: could not download images for "${scientificName}", falling back to Wikimedia URLs`);
      const { buildWikimediaThumbUrl } = await import("../shared/crop-media");
      const resolvedUrl = metadata.directUrl || wikidataImageUrl;
      await ctx.runMutation(internal.crops.applyCropImage, {
        cropId,
        imageUrl: buildWikimediaThumbUrl(resolvedUrl, 300),
        thumbnailUrl: buildWikimediaThumbUrl(resolvedUrl, 64),
        imageSourceUrl,
        imageAuthor: metadata.author,
        imageLicense: metadata.license,
      });
      console.log(`fetchCropImage: saved Wikimedia fallback URLs for "${crop.name}"`);
      return;
    }

    // Step 4: Upload to R2
    const uploaded = await uploadToR2(slug, thumbResult, mediumResult);
    if (!uploaded) {
      console.warn(`fetchCropImage: R2 upload failed for "${scientificName}", falling back to Wikimedia URLs`);
      const { buildWikimediaThumbUrl } = await import("../shared/crop-media");
      const resolvedUrl = metadata.directUrl || wikidataImageUrl;
      await ctx.runMutation(internal.crops.applyCropImage, {
        cropId,
        imageUrl: buildWikimediaThumbUrl(resolvedUrl, 300),
        thumbnailUrl: buildWikimediaThumbUrl(resolvedUrl, 64),
        imageSourceUrl,
        imageAuthor: metadata.author,
        imageLicense: metadata.license,
      });
      console.log(`fetchCropImage: saved Wikimedia fallback URLs for "${crop.name}"`);
      return;
    }

    // Step 5: Save R2 URLs to the crop record
    const { publicUrl } = getR2Config();
    const imageUrl = `${publicUrl}/${uploaded.mediumKey}`;
    const thumbnailUrl = `${publicUrl}/${uploaded.thumbKey}`;

    await ctx.runMutation(internal.crops.applyCropImage, {
      cropId,
      imageUrl,
      thumbnailUrl,
      imageSourceUrl,
      imageAuthor: metadata.author,
      imageLicense: metadata.license,
    });

    console.log(`fetchCropImage: uploaded to R2 and saved for "${crop.name}" (${scientificName}) → ${slug}`);
  },
});

// === One-time cleanup: repair broken or non-R2 image URLs ===

export const repairBrokenImageUrls = internalAction({
  args: {},
  handler: async (ctx) => {
    const allCrops = await ctx.runQuery(internal.crops.listAllCropsInternal, {});
    console.log(`repairBrokenImageUrls: scanning ${allCrops.length} crops...`);

    const r2PublicUrl = process.env.R2_PUBLIC_URL ?? "";

    let fixedCount = 0;
    let pendingReviewCount = 0;
    let noScientificNameCount = 0;

    for (const crop of allCrops) {
      if (crop.importStatus === "pending_review") {
        pendingReviewCount++;
        console.log(`  [pending_review] "${crop.name}" (${crop._id})`);
      }

      // Check for non-R2 image URLs (Wikimedia direct URLs or bad redirect URLs)
      const hasBadUrl =
        crop.imageUrl?.includes("commons.wikimedia.org") ||
        crop.imageUrl?.includes("Special:FilePath") ||
        crop.imageUrl?.includes("upload.wikimedia.org");

      // Also check: has imageUrl but it's not an R2 URL
      const hasNonR2Url = crop.imageUrl && r2PublicUrl && !crop.imageUrl.startsWith(r2PublicUrl);

      // Also catch crops with no imageUrl at all
      const needsImage = !crop.imageUrl;

      if (!hasBadUrl && !hasNonR2Url && !needsImage) continue;

      if (!crop.scientificName?.trim()) {
        if (hasBadUrl || hasNonR2Url) {
          noScientificNameCount++;
          console.log(`  [skip] "${crop.name}" — bad URL but no scientificName to re-fetch`);
        }
        continue;
      }

      const reason = needsImage ? "no image" : hasBadUrl ? "Wikimedia URL" : "non-R2 URL";
      console.log(`  [fixing] "${crop.name}" (${crop.scientificName}) — ${reason}: ${crop.imageUrl ?? "(none)"}`);

      // Clear all image fields so fetchCropImage's idempotency check passes
      await ctx.runMutation(internal.crops.clearImageFields, { cropId: crop._id });

      // Re-trigger image fetch with R2 upload
      await ctx.scheduler.runAfter(0, internal.cropImageLookup.fetchCropImage, { cropId: crop._id });

      fixedCount++;
    }

    console.log(`repairBrokenImageUrls: done.`);
    console.log(`  Fixed: ${fixedCount} crops with bad/missing image URLs`);
    console.log(`  Skipped (no scientificName): ${noScientificNameCount}`);
    console.log(`  Pending review crops: ${pendingReviewCount}`);
  },
});
