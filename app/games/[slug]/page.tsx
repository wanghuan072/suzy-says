export const dynamicParams = false;
import { notFound } from "next/navigation";
import { getGameBySlug, getGameRouteParams } from "@/lib/game-loader";
import GamePage from "@/components/game/GamePage";
import { metadataFor } from "@/lib/seo";
export const generateStaticParams = getGameRouteParams;
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const game = getGameBySlug(slug);
  if (!game) notFound();
  return metadataFor(game.seo, "/games/" + slug);
}
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const game = getGameBySlug(slug);
  if (!game) notFound();
  return <GamePage game={game} />;
}
