import type { Game } from "@/types/game";
export default function GameCard({
  game,
  compact = false,
}: {
  game: Game;
  compact?: boolean;
}) {
  return (
    <a
      href={
        process.env.NODE_ENV === "development" && game.status === "draft"
          ? `/preview/${game.id}`
          : `/games/${game.slug}`
      }
      className="game-card"
      data-game-id={game.id}
    >
      <span className="card-media">
        {game.image.src && (
          <img
            src={game.image.src}
            alt={game.image.alt}
            width={game.image.width ?? undefined}
            height={game.image.height ?? undefined}
            loading="lazy"
          />
        )}
      </span>
      <span className="card-name">{game.title}</span>
      {!compact && (
        <span className="card-description">{game.shortDescription}</span>
      )}
    </a>
  );
}
