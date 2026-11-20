export const dynamicParams = false;
import { notFound } from "next/navigation";
import { getGuideBySlug, getGuideRouteParams } from "@/lib/guide-loader";
import GuidePage from "@/page/guides/GuidePage";
import { metadataFor } from "@/lib/seo";
export const generateStaticParams = getGuideRouteParams;
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const guide = getGuideBySlug(slug);
  if (!guide) notFound();
  return metadataFor(guide.seo, "/guides/" + slug, "article");
}
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const guide = getGuideBySlug(slug);
  if (!guide) notFound();
  return <GuidePage guide={guide} />;
}
