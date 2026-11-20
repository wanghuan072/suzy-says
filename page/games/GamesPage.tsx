import { structuredData, webPageSchema } from "@/lib/seo";
import { absolute } from "@/lib/url-policy";
import { tdk } from "@/seo/tdk";
import { getAllPublishedGames } from "@/lib/game-loader";
import GameCard from "@/components/game/GameCard";
import Breadcrumbs from "@/components/content/Breadcrumbs";
export default function GamesPage() {
  const items = getAllPublishedGames();
  return (
    <main id="main-content" className="container page-space">
      <Breadcrumbs
        items={[{ label: "Home", path: "/" }, { label: "More Games" }]}
      />
      <h1>Find your next unsettling game</h1>
      <p className="page-intro">
        Read strange instructions, investigate unfamiliar rooms and decide what
        to do when a familiar routine changes.
      </p>
      <div className="games-index">
        {items.map((game) => (
          <GameCard game={game} key={game.id} />
        ))}
      </div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: structuredData({
            "@context": "https://schema.org",
            ...webPageSchema(
              "/games",
              "Find your next unsettling game",
              tdk.games.description,
              "CollectionPage",
            ),
            mainEntity: {
              "@type": "ItemList",
              numberOfItems: items.length,
              itemListElement: items.map((item, index) => ({
                "@type": "ListItem",
                position: index + 1,
                name: item.title,
                url: absolute("/games/" + item.slug),
              })),
            },
          }),
        }}
      />
    </main>
  );
}
