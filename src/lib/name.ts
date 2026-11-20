/** Picks the best real name available: profile first, then sign-up metadata. Returns null if none is usable. */
export function resolveDisplayName(profileName: string | null | undefined, meta: Record<string, unknown> | null | undefined): string | null {
  const clean = (v: unknown) => (typeof v === "string" ? v.trim().replace(/\s+/g, " ") : "");
  for (const c of [clean(profileName), clean(meta?.["full_name"]), clean(meta?.["name"])]) if (c.length >= 2) return c;
  return null;
}
