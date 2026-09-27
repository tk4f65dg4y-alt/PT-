export async function createRoom(): Promise<string> {
  const res = await fetch("/api/rooms", { method: "POST" });
  if (!res.ok) throw new Error("Couldn't create a table right now.");
  const data = await res.json();
  return data.code as string;
}

export async function roomExists(code: string): Promise<boolean> {
  const res = await fetch(`/api/rooms/${encodeURIComponent(code)}`);
  if (!res.ok) return false;
  const data = await res.json();
  return !!data.exists;
}

const MAX_DIM = 640;

/** Downscales + compresses an image client-side so uploads stay small and fast over the socket-less HTTP path. */
async function shrinkImage(file: File): Promise<{ blob: Blob; contentType: string }> {
  if (file.type === "image/gif") {
    // Canvas would flatten an animated GIF to one frame, so ship it as-is.
    return { blob: file, contentType: "image/gif" };
  }
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_DIM / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return { blob: file, contentType: file.type };
  ctx.drawImage(bitmap, 0, 0, w, h);
  const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
  if (!blob) return { blob: file, contentType: file.type };
  return { blob, contentType: "image/jpeg" };
}

export async function uploadDealerPhoto(code: string, file: File): Promise<void> {
  const { blob, contentType } = await shrinkImage(file);
  const res = await fetch(`/api/rooms/${encodeURIComponent(code)}/dealer-photo`, {
    method: "POST",
    headers: { "Content-Type": contentType },
    body: blob,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Couldn't upload that photo.");
  }
}

export async function clearDealerPhoto(code: string): Promise<void> {
  await fetch(`/api/rooms/${encodeURIComponent(code)}/dealer-photo`, { method: "DELETE" });
}

export async function setDealerName(code: string, name: string): Promise<void> {
  await fetch(`/api/rooms/${encodeURIComponent(code)}/dealer-name`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
}
