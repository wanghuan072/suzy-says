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
function Group({
  title,
  games,
  primary = false,
}: {
  title: string;
  games: Game[];
  primary?: boolean;
}) {
  return (
    <section className={primary ? "recommendations" : "sidebar-group"}>
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
  const heading = home
    ? `${game.title}: Game Overview and More Horror Games`
    : game.id === "last-seen-online"
      ? "last seen online: Passwords, Clues and Desktop Guide"
      : `Play ${game.title} Online`;
  const faqs = game.content.flatMap((section) =>
    section.blocks.flatMap((block) =>
      block.type === "faq" ? block.items : [],
    ),
  );
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
          <h1 className={home ? "home-title" : undefined}>{heading}</h1>
          <p className="game-intro">{game.shortDescription}</p>
          {home && (
            <div>
              <p className="media-note">
                The overview below covers MOONBIT’s game. This third-party
                browser player has not been verified as that release.
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
          <Group
            title={home ? "Featured Games" : "Recommended Games"}
            games={groups.recommended}
            primary
          />
          {home && (
            <p>
              <a href="/games">Browse all eight horror games</a>
            </p>
          )}
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
                  {home && s.id === "guide-summaries" && (
                    <p>
                      For more worked examples, read the{" "}
                      <a href="/guides/suzy-says-command-rules">
                        Suzy Says command rules guide
                      </a>
                      .
                    </p>
                  )}
                  {home && s.id === "guide-summaries" && (
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
          <Videos videos={videos} home={home} />
          <p className="next-links">
            <a href="/guides">Read Suzy Says guides</a>
            <a href="/games">Browse More Games</a>
          </p>
        </div>
        <FollowingSidebar follow={!home}>
          {home ? (
            <>
              <Group title="More Games" games={groups.featured} />
              <section className="sidebar-group">
                <h2>Suzy Says Guides</h2>
                <p>Choose a focused guide before your next session.</p>
                <p>
                  <a href="/guides/suzy-says-command-rules">
                    Command rules and worked examples
                  </a>
                </p>
                <p>
                  <a href="/guides/suzy-says-first-run">
                    Windows setup, controls and subtitles
                  </a>
                </p>
              </section>
            </>
          ) : (
            <>
              <Group title="Featured Games" games={groups.featured} />
              <Group title="New Games" games={groups.fresh} />
            </>
          )}
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
                  heading,
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
              ...(faqs.length
                ? [
                    {
                      "@type": "FAQPage",
                      "@id":
                        absolute(home ? "/" : "/games/" + game.slug) + "#faq",
                      mainEntity: faqs.map((item) => ({
                        "@type": "Question",
                        name: item.question,
                        acceptedAnswer: {
                          "@type": "Answer",
                          text: item.answer,
                        },
                      })),
                    },
                  ]
                : []),
            ],
          }),
        }}
      />
    </main>
  );
}
