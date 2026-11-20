import GamePage from "@/components/game/GamePage";
import { getMainGame } from "@/lib/game-loader";
import { metadataFor } from "@/lib/seo";
import { tdk } from "@/seo/tdk";
export function generateMetadata() {
  return metadataFor(tdk.home, "/");
}
export default function Home() {
  return <GamePage game={getMainGame()} home />;
}
