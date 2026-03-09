import { readFile } from "node:fs/promises";

const USER_AGENT = "Codex issue-99 Wikimedia crop report";
const DEFAULT_CROP_FILE = new URL("../convex/crops.ts", import.meta.url);

function extractDefaultCrops(source) {
  const matches = [
    ...source.matchAll(/name:\s*"([^"]+)"[\s\S]{0,220}?scientificName:\s*"([^"]+)"/g),
  ];

  return matches.map((match) => ({
    name: match[1],
    scientificName: match[2],
  }));
}

async function fetchWikidataImages(crops) {
  const scientificNames = crops.map((crop) => `"${crop.scientificName}"`).join(" ");
  const query = `
SELECT ?taxonName ?item ?itemLabel ?image WHERE {
  VALUES ?taxonName { ${scientificNames} }
  ?item wdt:P225 ?taxonName .
  OPTIONAL { ?item wdt:P18 ?image. }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en,zh". }
}
`;

  const response = await fetch(
    `https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(query)}`,
    { headers: { "user-agent": USER_AGENT } },
  );

  if (!response.ok) {
    throw new Error(`Wikidata query failed: ${response.status}`);
  }

  const json = await response.json();
  return json.results.bindings.map((row) => ({
    taxonName: row.taxonName?.value,
    item: row.item?.value,
    itemLabel: row.itemLabel?.value,
    image: row.image?.value,
  }));
}

async function fetchCommonsMetadata(fileTitles) {
  if (fileTitles.length === 0) return [];

  const apiUrl = new URL("https://commons.wikimedia.org/w/api.php");
  apiUrl.searchParams.set("action", "query");
  apiUrl.searchParams.set("titles", fileTitles.join("|"));
  apiUrl.searchParams.set("prop", "imageinfo");
  apiUrl.searchParams.set("iiprop", "url|size|extmetadata");
  apiUrl.searchParams.set("format", "json");
  apiUrl.searchParams.set("origin", "*");

  const response = await fetch(apiUrl, {
    headers: { "user-agent": USER_AGENT },
  });

  if (!response.ok) {
    throw new Error(`Commons metadata query failed: ${response.status}`);
  }

  const json = await response.json();
  return Object.values(json.query?.pages ?? {}).map((page) => ({
    title: page.title,
    width: page.imageinfo?.[0]?.width,
    height: page.imageinfo?.[0]?.height,
    url: page.imageinfo?.[0]?.url,
    author: page.imageinfo?.[0]?.extmetadata?.Artist?.value?.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim(),
    license: page.imageinfo?.[0]?.extmetadata?.LicenseShortName?.value,
  }));
}

function toFileTitle(imageUrl) {
  if (!imageUrl) return null;
  const fileName = decodeURIComponent(imageUrl.split("/Special:FilePath/")[1] ?? "").trim();
  return fileName ? `File:${fileName}` : null;
}

async function main() {
  const source = await readFile(DEFAULT_CROP_FILE, "utf8");
  const crops = extractDefaultCrops(source);
  const candidates = await fetchWikidataImages(crops);
  const fileTitles = [...new Set(candidates.map((candidate) => toFileTitle(candidate.image)).filter(Boolean))];
  const metadata = await fetchCommonsMetadata(fileTitles);

  console.log(
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        cropCount: crops.length,
        crops,
        wikidataCandidates: candidates,
        commonsMetadata: metadata,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
