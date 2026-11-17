// Barcodes as typed by a USB/Bluetooth scanner (it "types" the code and
// presses Enter). Kept client-safe.

/** Trim and drop spaces; scanners sometimes add a trailing space or CR. */
export function cleanBarcode(raw: string) {
  return String(raw ?? "")
    .replace(/\s+/g, "")
    .slice(0, 64);
}

/** Plausible product barcode (EAN/UPC/Code128-ish): 4–64 safe characters. */
export const isBarcode = (s: string) => /^[0-9A-Za-z._-]{4,64}$/.test(s);

/** Looks like something a scanner typed, rather than a product name. */
export const looksScanned = (s: string) => /^\d{6,}$/.test(cleanBarcode(s));
