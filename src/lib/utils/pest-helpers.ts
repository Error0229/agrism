export function parsePestEntry(entry: string): { name: string; method: string } {
  const separatorIndex = entry.indexOf("：");
  if (separatorIndex === -1) {
    return { name: entry, method: "" };
  }
  return {
    name: entry.substring(0, separatorIndex),
    method: entry.substring(separatorIndex + 1),
  };
}

export function getPestImageSearchUrl(pestName: string, cropName?: string): string {
  const query = cropName
    ? `${cropName} ${pestName} 病蟲害`
    : `${pestName} 病蟲害`;
  return `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(query)}`;
}
