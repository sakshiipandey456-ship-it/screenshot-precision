export const RECEIPT_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const RECEIPT_MAX_BYTES = 5 * 1024 * 1024;

/** Returns an error message, or null when the file can be scanned. */
export function validateReceiptFile(file: { type: string; size: number }): string | null {
  if (!(RECEIPT_TYPES as readonly string[]).includes(file.type)) return "Please choose a JPG, PNG or WebP image.";
  if (file.size > RECEIPT_MAX_BYTES) return "That image is larger than 5 MB. Try a smaller photo.";
  if (file.size === 0) return "That file is empty.";
  return null;
}
