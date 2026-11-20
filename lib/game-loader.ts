import { homepageGroups, gameGroups } from "./game-groups.mjs";
import mainJson from "@/data/games/main-game.json";
import gamesJson from "@/data/games/games.json";
import type { Game } from "@/types/game";
const main = mainJson as Game;
const records = gamesJson as Game[];
export function getMainGame() {
  if (main.status !== "published")
    throw new Error("Main game is not published");
  return main;
}
export function getAllPublishedGames() {
  return records.filter((g) => g.status === "published");
}
export function getGameBySlug(slug: string) {
  return getAllPublishedGames().find((g) => g.slug === slug);
}
export function getGameById(id: string) {
  return getAllPublishedGames().find((g) => g.id === id);
}
export function getHomepageSections() {
  return homepageGroups(getAllPublishedGames());
}
export function getGameSections(current: Game) {
  return gameGroups(getAllPublishedGames(), current, main.id);
}
export function getGameRouteParams() {
  return getAllPublishedGames().map((g) => ({ slug: g.slug }));
}
export function getSidebarSections(g: Game) {
  return getGameSections(g);
}
export function getRecommendedGames(g: Game) {
  return getGameSections(g).recommended;
}
