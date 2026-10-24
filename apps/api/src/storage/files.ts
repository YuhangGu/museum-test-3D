import { realpath, stat } from "node:fs/promises";
import { resolve, sep, extname } from "node:path";
export async function resolveModel(root: string, key: string) {
  if (
    !key ||
    key.includes("\\") ||
    key.split("/").some((p) => p === "..") ||
    ![".glb", ".gltf"].includes(extname(key).toLowerCase())
  )
    throw new Error("Invalid storage key");
  const base = await realpath(root);
  const candidate = await realpath(resolve(base, key));
  if (!candidate.startsWith(base + sep)) throw new Error("Outside storage");
  const info = await stat(candidate);
  if (!info.isFile()) throw new Error("Not a file");
  return { path: candidate, size: info.size, mtime: info.mtimeMs };
}
export function parseRange(
  value: string,
  size: number,
): { start: number; end: number } | null {
  const match = /^bytes=(\d*)-(\d*)$/.exec(value);
  if (!match || (!match[1] && !match[2])) return null;
  let start: number, end: number;
  if (!match[1]) {
    const suffix = Number(match[2]);
    if (!suffix) return null;
    start = Math.max(0, size - suffix);
    end = size - 1;
  } else {
    start = Number(match[1]);
    end = match[2] ? Math.min(Number(match[2]), size - 1) : size - 1;
  }
  return Number.isSafeInteger(start) &&
    Number.isSafeInteger(end) &&
    start >= 0 &&
    start < size &&
    end >= start
    ? { start, end }
    : null;
}
