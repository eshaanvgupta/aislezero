import { z } from "zod";
export const pubkeySchema = z
  .string()
  .regex(/^[a-f0-9]{64}$/, "Use a 64-character hexadecimal Nostr public key");
export function safeUrl(value: string): string {
  const u = new URL(value);
  if (u.protocol !== "https:" || u.username || u.password)
    throw new Error("A public HTTPS URL is required");
  const h = u.hostname.toLowerCase();
  if (
    h === "localhost" ||
    h.endsWith(".local") ||
    h.endsWith(".internal") ||
    h === "[::1]" ||
    /^\d+\.\d+\.\d+\.\d+$/.test(h) ||
    h.startsWith("[")
  )
    throw new Error("Local and literal IP hosts are not supported");
  return u.href;
}
export function relayUrl(value: string): string {
  const u = new URL(value);
  if (
    u.protocol !== "wss:" &&
    !(u.protocol === "ws:" && ["127.0.0.1", "localhost"].includes(u.hostname))
  )
    throw new Error("Use a secure wss:// relay");
  if (u.username || u.password)
    throw new Error("Relay URLs cannot contain credentials");
  return u.href.replace(/\/$/, "");
}
export function canonical(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  return (
    "{" +
    Object.entries(value)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => JSON.stringify(k) + ":" + canonical(v))
      .join(",") +
    "}"
  );
}
export function errorMessage(e: unknown) {
  return e instanceof Error
    ? e.message
    : "The operation could not be completed";
}
export async function fetchJson<T>(
  url: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(url, {
    ...init,
    signal: init?.signal || AbortSignal.timeout(15000),
  });
  if (!response.ok)
    throw new Error(
      `Service returned ${response.status}. Please try again later.`,
    );
  return response.json() as Promise<T>;
}
export function download(
  name: string,
  data: string,
  type = "application/json",
) {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
