import fs from "node:fs";
type RecordGame = {
  status: string;
  player: { iframeSrc: string };
  content: { blocks: { type: string }[] }[];
};
export function getCsp(development = false) {
  const main = JSON.parse(
    fs.readFileSync("data/games/main-game.json", "utf8"),
  ) as RecordGame;
  const games = JSON.parse(
    fs.readFileSync("data/games/games.json", "utf8"),
  ) as RecordGame[];
  const published = [main, ...games].filter(
    (g) => development || g.status === "published",
  );
  const origins = new Set<string>();
  for (const g of published) {
    try {
      const u = new URL(g.player.iframeSrc);
      if (
        u.protocol === "https:" &&
        !u.username &&
        !u.password &&
        u.hostname.includes(".")
      )
        origins.add(u.origin);
    } catch {}
  }
  const hasVideo = published.some((g) =>
    g.content.some((s) => s.blocks.some((b) => b.type === "video")),
  );
  if (hasVideo) origins.add("https://www.youtube-nocookie.com");
  return [
    `default-src 'self'`,
    `script-src 'self' 'unsafe-inline'${development ? " 'unsafe-eval'" : ""}`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: blob:`,
    `font-src 'self'`,
    `connect-src 'self'${development ? " ws:" : ""}`,
    `frame-src ${origins.size ? [...origins].join(" ") : "'none'"}`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'none'`,
    `frame-ancestors 'self'`,
  ].join("; ");
}
