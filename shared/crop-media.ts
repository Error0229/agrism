export interface CropMediaFields {
  name?: string | null;
  scientificName?: string | null;
  isDefault?: boolean | null;
  emoji?: string | null;
  imageUrl?: string | null;
  thumbnailUrl?: string | null;
  imageSourceUrl?: string | null;
  imageAuthor?: string | null;
  imageLicense?: string | null;
}

interface CropMediaCatalogEntry {
  slug: string;
  name: string;
  scientificName: string;
  originalUrl: string;
  fileTitle: string;
  author: string;
  license: string;
}

export const DEFAULT_CROP_MEDIA_CATALOG: CropMediaCatalogEntry[] = [
  {
    slug: "okra",
    name: "秋葵",
    scientificName: "Abelmoschus esculentus",
    originalUrl: "https://upload.wikimedia.org/wikipedia/commons/c/cd/Okra_-_Abelmoschus_esculentus_%28Vendakka-ml%29.jpg",
    fileTitle: "File:Okra - Abelmoschus esculentus (Vendakka-ml).jpg",
    author: "Ramesh NG",
    license: "CC BY-SA 2.0",
  },
  {
    slug: "sweet-potato",
    name: "地瓜",
    scientificName: "Ipomoea batatas",
    originalUrl: "https://upload.wikimedia.org/wikipedia/commons/5/58/Ipomoea_batatas_006.JPG",
    fileTitle: "File:Ipomoea batatas 006.JPG",
    author: "Llez",
    license: "CC BY-SA 3.0",
  },
  {
    slug: "pumpkin",
    name: "南瓜",
    scientificName: "Cucurbita moschata",
    originalUrl: "https://upload.wikimedia.org/wikipedia/commons/9/93/Courge.jpg",
    fileTitle: "File:Courge.jpg",
    author: "fr:User:Jeantosti",
    license: "CC BY-SA 3.0",
  },
  {
    slug: "loofah",
    name: "絲瓜",
    scientificName: "Luffa cylindrica",
    originalUrl: "https://upload.wikimedia.org/wikipedia/commons/f/f3/Luffa_cylindrica1.jpg",
    fileTitle: "File:Luffa cylindrica1.jpg",
    author: "KENPEI",
    license: "CC BY-SA 3.0",
  },
  {
    slug: "bitter-melon",
    name: "苦瓜",
    scientificName: "Momordica charantia",
    originalUrl: "https://upload.wikimedia.org/wikipedia/commons/d/d2/Immature_fruit_of_bitter_gourd.jpg",
    fileTitle: "File:Immature fruit of bitter gourd.jpg",
    author: "Billjones94",
    license: "CC BY-SA 4.0",
  },
  {
    slug: "water-spinach",
    name: "空心菜",
    scientificName: "Ipomoea aquatica",
    originalUrl: "https://upload.wikimedia.org/wikipedia/commons/1/10/N_Ipoa_D1600.JPG",
    fileTitle: "File:N Ipoa D1600.JPG",
    author: "Eric Guinther",
    license: "CC BY-SA 3.0",
  },
  {
    slug: "bok-choy",
    name: "小白菜",
    scientificName: "Brassica rapa var. chinensis",
    originalUrl: "https://upload.wikimedia.org/wikipedia/commons/8/8c/Brassica_rapa_var._chinensis_%28leaf%29.jpg",
    fileTitle: "File:Brassica rapa var. chinensis (leaf).jpg",
    author: "おむこさん志望",
    license: "CC BY 2.5",
  },
  {
    slug: "scallion",
    name: "蔥",
    scientificName: "Allium fistulosum",
    originalUrl: "https://upload.wikimedia.org/wikipedia/commons/9/98/HK_SYP_Best_of_Best_Vegetable_Peking_Welsh_onion_Allium_Aug-2012.JPG",
    fileTitle: "File:HK SYP Best of Best Vegetable Peking Welsh onion Allium Aug-2012.JPG",
    author: "Genmewcaugsa",
    license: "CC BY-SA 3.0",
  },
  {
    slug: "ginger",
    name: "薑",
    scientificName: "Zingiber officinale",
    originalUrl: "https://upload.wikimedia.org/wikipedia/commons/2/24/Zingiber_officinale_230935597.jpg",
    fileTitle: "File:Zingiber officinale 230935597.jpg",
    author: "ritirene",
    license: "CC BY 4.0",
  },
  {
    slug: "banana",
    name: "香蕉",
    scientificName: "Musa acuminata",
    originalUrl: "https://upload.wikimedia.org/wikipedia/commons/a/a8/Bananapao.JPG",
    fileTitle: "File:Bananapao.JPG",
    author: "Jorgemach7",
    license: "CC BY-SA 3.0",
  },
  {
    slug: "papaya",
    name: "木瓜",
    scientificName: "Carica papaya",
    originalUrl: "https://upload.wikimedia.org/wikipedia/commons/d/db/Carica_papaya_22_08_2012.JPG",
    fileTitle: "File:Carica papaya 22 08 2012.JPG",
    author: "Joydeep",
    license: "CC BY-SA 3.0",
  },
  {
    slug: "tomato",
    name: "番茄",
    scientificName: "Solanum lycopersicum",
    originalUrl: "https://upload.wikimedia.org/wikipedia/commons/8/88/Bright_red_tomato_and_cross_section02.jpg",
    fileTitle: "File:Bright red tomato and cross section02.jpg",
    author: "fir0002 flagstaffotos [at] gmail.com Canon 20D + Sigma 150mm f/2.8",
    license: "GFDL 1.2",
  },
  {
    slug: "chili-pepper",
    name: "辣椒",
    scientificName: "Capsicum annuum",
    originalUrl: "https://upload.wikimedia.org/wikipedia/commons/d/d5/Red_pepper_from_Ivory_Coast_01.jpg",
    fileTitle: "File:Red pepper from Ivory Coast 01.jpg",
    author: "Kod B",
    license: "CC BY-SA 4.0",
  },
  {
    slug: "eggplant",
    name: "茄子",
    scientificName: "Solanum melongena",
    originalUrl: "https://upload.wikimedia.org/wikipedia/commons/a/a0/Eggplant_from_Ivory_Coast_10.jpg",
    fileTitle: "File:Eggplant from Ivory Coast 10.jpg",
    author: "Kod B",
    license: "CC BY-SA 4.0",
  },
  {
    slug: "cabbage",
    name: "高麗菜",
    scientificName: "Brassica oleracea var. capitata",
    originalUrl: "https://upload.wikimedia.org/wikipedia/commons/1/11/Brassica_oleracea0.jpg",
    fileTitle: "File:Brassica oleracea0.jpg",
    author: "MPF",
    license: "CC BY 2.5",
  },
  {
    slug: "mustard-greens",
    name: "芥菜",
    scientificName: "Brassica juncea",
    originalUrl: "https://upload.wikimedia.org/wikipedia/commons/6/6b/Brassica_juncea_var._juncea.JPG",
    fileTitle: "File:Brassica juncea var. juncea.JPG",
    author: "Dalgial",
    license: "CC BY-SA 3.0",
  },
];

const CROP_MEDIA_BY_SCIENTIFIC_NAME = new Map(
  DEFAULT_CROP_MEDIA_CATALOG.map((entry) => [entry.scientificName, entry]),
);

const CROP_MEDIA_BY_NAME = new Map(
  DEFAULT_CROP_MEDIA_CATALOG.map((entry) => [entry.name, entry]),
);

function normalizeString(value: string | null | undefined) {
  return value?.trim() || undefined;
}

function buildCommonsSourceUrl(fileTitle: string) {
  return `https://commons.wikimedia.org/wiki/${encodeURI(fileTitle.replace(/ /g, "_"))}`;
}

export function buildWikimediaThumbUrl(originalUrl: string, width: number) {
  try {
    const parsed = new URL(originalUrl);
    const parts = parsed.pathname.split("/").filter(Boolean);
    if (
      parsed.hostname !== "upload.wikimedia.org" ||
      parts.length < 5 ||
      parts[0] !== "wikipedia" ||
      parts[1] !== "commons"
    ) {
      return originalUrl;
    }

    const [, , hash1, hash2, ...fileParts] = parts;
    const fileName = fileParts.join("/");
    return `${parsed.origin}/wikipedia/commons/thumb/${hash1}/${hash2}/${fileName}/${width}px-${fileName}`;
  } catch {
    return originalUrl;
  }
}

const R2_PUBLIC_URL = "https://media.agrism.catjam.dev";

function buildR2CropMediaUrl(slug: string, size: "thumb" | "medium" | "large") {
  return `${R2_PUBLIC_URL}/crops/${slug}/${size}.webp`;
}

function getCatalogEntry(media: CropMediaFields) {
  const scientificName = normalizeString(media.scientificName);
  if (scientificName) {
    const byScientificName = CROP_MEDIA_BY_SCIENTIFIC_NAME.get(scientificName);
    if (byScientificName) return byScientificName;
  }

  const name = normalizeString(media.name);
  if (name) {
    return CROP_MEDIA_BY_NAME.get(name);
  }

  return undefined;
}

export function resolveCropMedia<T extends CropMediaFields>(media: T | null | undefined) {
  const fallback = media ? getCatalogEntry(media) : undefined;
  const explicitImageUrl = normalizeString(media?.imageUrl);
  const explicitThumbnailUrl = normalizeString(media?.thumbnailUrl);
  const fallbackImageUrl = fallback ? buildR2CropMediaUrl(fallback.slug, "medium") : undefined;
  const fallbackThumbnailUrl = fallback ? buildR2CropMediaUrl(fallback.slug, "thumb") : undefined;

  return {
    imageUrl: explicitImageUrl ?? fallbackImageUrl,
    thumbnailUrl:
      explicitThumbnailUrl ??
      explicitImageUrl ??
      fallbackThumbnailUrl ??
      fallbackImageUrl,
    imageSourceUrl: normalizeString(media?.imageSourceUrl) ?? (fallback ? buildCommonsSourceUrl(fallback.fileTitle) : undefined),
    imageAuthor: normalizeString(media?.imageAuthor) ?? fallback?.author,
    imageLicense: normalizeString(media?.imageLicense) ?? fallback?.license,
    emoji: normalizeString(media?.emoji) ?? "🌱",
  };
}

export function withDefaultCropMedia<T extends CropMediaFields>(media: T): T & ReturnType<typeof resolveCropMedia> {
  return {
    ...media,
    ...resolveCropMedia(media),
  };
}
