import Page from "@/page/games/GamesPage";
import { metadataFor } from "@/lib/seo";
import { tdk } from "@/seo/tdk";
export const metadata = metadataFor(tdk.games, "/games");
export default Page;
