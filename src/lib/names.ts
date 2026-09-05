export function sanitizeName(raw: string, fallback: string): string {
  const cleaned = raw.replace(/\s+/g, " ").replace(/[^\S\n]+/g, " ").trim();
  const clipped = cleaned.slice(0, 12);
  return clipped || fallback;
}

export function sanitizeChat(raw: string): string {
  return raw.replace(/\s+/g, " ").trim().slice(0, 200);
}
