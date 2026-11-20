import { site } from "@/config/site";
export function absolute(path: string) {
  if (
    !path.startsWith("/") ||
    path.startsWith("//") ||
    path.includes("?") ||
    path.includes("#")
  )
    throw new Error("Invalid canonical path");
  return new URL(path === "/" ? "/" : path.replace(/\/+$/, ""), site.origin)
    .href;
}
export function safeFrameUrl(value: string) {
  try {
    const u = new URL(value);
    if (
      u.protocol !== "https:" ||
      u.username ||
      u.password ||
      !u.hostname.includes(".") ||
      /^(localhost|127\.|10\.|192\.168\.|169\.254\.|0\.)/.test(u.hostname) ||
      /\.(test|local|invalid)$/.test(u.hostname)
    )
      return null;
    return u;
  } catch {
    return null;
  }
}
