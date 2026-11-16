// Client-side photo shrinking before upload. Phone photos are often 3–8 MB,
// more than a server action accepts; resizing to ~1600px JPEG brings them to
// a few hundred KB with no visible loss on a phone screen.

const MAX_SIDE = 1600;
const QUALITY = 0.82;

export async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    // Already small and light: keep the original.
    if (scale === 1 && file.size < 900 * 1024) {
      bitmap.close();
      return file;
    }
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", QUALITY));
    if (!blob || blob.size >= file.size) return file;
    const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
    return new File([blob], name, { type: "image/jpeg" });
  } catch {
    return file; // unsupported format in this browser: upload as is
  }
}

/** Replaces the files of an <input type="file"> with compressed copies. */
export async function compressFileInput(input: HTMLInputElement) {
  const files = [...(input.files ?? [])];
  if (files.length === 0) return;
  const out = await Promise.all(files.map(compressImage));
  const dt = new DataTransfer();
  out.forEach((f) => dt.items.add(f));
  input.files = dt.files;
}
