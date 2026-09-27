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
