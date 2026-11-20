import { structuredData, webPageSchema, websiteSchema } from "@/lib/seo";
import type { Game } from "@/types/game";
import type { VideoBlock } from "@/types/content";
import { getGameSections } from "@/lib/game-loader";
import { absolute } from "@/lib/url-policy";
import Blocks, { Videos } from "@/components/content/Blocks";
import Breadcrumbs from "@/components/content/Breadcrumbs";
import GameCard from "./GameCard";
import GamePlayer from "./GamePlayer";
import FollowingSidebar from "./FollowingSidebar";
function Group({ title, games }: { title: string; games: Game[] }) {
  return (
    <section
      className={
        title === "Recommended Games" ? "recommendations" : "sidebar-group"
      }
    >
      <h2>{title}</h2>
      <div className="card-grid">
        {games.map((g) => (
          <GameCard game={g} compact key={g.id} />
        ))}
      </div>
    </section>
  );
}
export default function GamePage({
  game,
  home = false,
  previewGroups,
}: {
  game: Game;
  home?: boolean;
  previewGroups?: { featured: Game[]; fresh: Game[]; recommended: Game[] };
}) {
  const groups = previewGroups ?? getGameSections(game);
  const videos = game.content.flatMap((s) =>
    s.blocks.filter((b): b is VideoBlock => b.type === "video"),
  );
  return (
    <main
      id="main-content"
      className="container page-space"
      data-game-id={game.id}
    >
      <div className="game-layout">
        <div className="game-track">
          {!home && (
            <Breadcrumbs
              items={[
                { label: "Home", path: "/" },
                { label: "More Games", path: "/games" },
                { label: game.title },
              ]}
            />
          )}
          <h1 className={home ? "home-title" : undefined}>
            {home
              ? `${game.title} Game: Command Rules and Player Guide`
              : `Play ${game.title} Online`}
          </h1>
          <p className="game-intro">{game.shortDescription}</p>
          {home && (
            <div>
              <p className="media-note">
                The guide below covers MOONBIT’s Windows release. This
                third-party browser player has not been verified as that
                release.
              </p>
            </div>
          )}
          <GamePlayer
            game={{
              id: game.id,
              title: game.title,
              image: game.image,
              player: game.player,
            }}
          />
          <Group title="Recommended Games" games={groups.recommended} />
          <article className="game-article" data-article-game={game.id}>
            {game.spoilerPolicy === "marked" && (
              <p className="spoiler-note">
                Start without spoilers. Later story details are clearly marked.
              </p>
            )}
            {game.content
              .filter((s) => s.blocks.some((b) => b.type !== "video"))
              .map((s) => (
                <section id={s.id} key={s.id}>
                  <h2>{s.heading}</h2>
                  <Blocks blocks={s.blocks} />
                  {home && s.id === "first-command-round" && (
                    <p>
                      For more worked examples, read the{" "}
                      <a href="/guides/suzy-says-command-rules">
                        Suzy Says command rules guide
                      </a>
                      .
                    </p>
                  )}
                  {home && s.id === "comfortable-first-run" && (
                    <p>
                      Before starting the Windows release, follow the{" "}
                      <a href="/guides/suzy-says-first-run">
                        first-run guide to controls and subtitles
                      </a>
                      .
                    </p>
                  )}
                </section>
              ))}
          </article>
          <Videos videos={videos} />
          <p className="next-links">
            <a href="/guides">Read Suzy Says guides</a>
            <a href="/games">Browse More Games</a>
          </p>
        </div>
        <FollowingSidebar follow={!home}>
          <Group title="Featured Games" games={groups.featured} />
          <Group title="New Games" games={groups.fresh} />
        </FollowingSidebar>
      </div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: structuredData({
            "@context": "https://schema.org",
            "@graph": [
              ...(home ? [websiteSchema()] : []),
              {
                ...webPageSchema(
                  home ? "/" : "/games/" + game.slug,
                  home
                    ? `${game.title} Game: Command Rules and Player Guide`
                    : "Play " + game.title + " Online",
                  game.seo.description,
                ),
                about: {
                  "@id": absolute(home ? "/" : "/games/" + game.slug) + "#game",
                },
                ...(game.publishedAt
                  ? { datePublished: game.publishedAt }
                  : {}),
                ...(game.updatedAt ? { dateModified: game.updatedAt } : {}),
              },
              {
                "@type": "VideoGame",
                "@id": absolute(home ? "/" : "/games/" + game.slug) + "#game",
                name: game.title,
                description: game.shortDescription,
                image: absolute(game.image.src),
                keywords: game.tags.join(", "),
              },
            ],
          }),
        }}
      />
    </main>
  );
}
