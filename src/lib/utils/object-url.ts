export function safeRevokeObjectUrl(url: string | null | undefined, revoke: (url: string) => void = URL.revokeObjectURL) {
  if (typeof url !== "string") return;
  const normalized = url.trim();
  if (!normalized) return;
  revoke(normalized);
}
