import { structuredData, webPageSchema } from "@/lib/seo";
import { site } from "@/config/site";
import type { Guide } from "@/types/guide";
import type { VideoBlock } from "@/types/content";
import Blocks, { Videos } from "@/components/content/Blocks";
import Breadcrumbs from "@/components/content/Breadcrumbs";
import { getRelatedGuides } from "@/lib/guide-loader";
import { absolute } from "@/lib/url-policy";
export default function GuidePage({ guide }: { guide: Guide }) {
  const toc = guide.sections.length >= 4;
  const videos = guide.sections.flatMap((s) =>
    s.blocks.filter((b): b is VideoBlock => b.type === "video"),
  );
  return (
    <main id="main-content" className="container page-space">
      <Breadcrumbs
        items={[
          { label: "Home", path: "/" },
          { label: "Guides", path: "/guides" },
          { label: guide.title },
        ]}
      />
      <header className="guide-heading">
        <h1>{guide.title}</h1>
        <p className="page-intro">{guide.summary}</p>
        {(guide.publishedAt || guide.updatedAt) && (
          <p className="dates">
            {guide.publishedAt && (
              <>
                Published{" "}
                <time dateTime={guide.publishedAt}>{guide.publishedAt}</time>
              </>
            )}
            {guide.publishedAt && guide.updatedAt && " · "}
            {guide.updatedAt && (
              <>
                Updated{" "}
                <time dateTime={guide.updatedAt}>{guide.updatedAt}</time>
              </>
            )}
          </p>
        )}
        <div className="tags">
          {guide.tags.slice(0, 5).map((t) => (
            <span key={t}>{t}</span>
          ))}
        </div>
        <img
          className="guide-cover"
          src={guide.cover.src}
          alt={guide.cover.alt}
          width={guide.cover.width ?? undefined}
          height={guide.cover.height ?? undefined}
        />
      </header>
      <div className={toc ? "guide-layout" : "guide-layout guide-no-toc"}>
        {toc && (
          <nav className="guide-toc" aria-label="On this page">
            <h2>On this page</h2>
            <ol>
              {guide.sections.map((s) => (
                <li key={s.id}>
                  <a href={"#" + s.id}>{s.title}</a>
                </li>
              ))}
            </ol>
          </nav>
        )}
        <article className="guide-body">
          {guide.spoilerPolicy === "marked" && (
            <aside className="callout">
              <strong>Story spoilers ahead</strong>
              <p>
                This guide discusses later phases. Stop before those sections if
                you want to discover them yourself.
              </p>
            </aside>
          )}
          {guide.sections.map((s) => (
            <section id={s.id} key={s.id}>
              <h2>{s.title}</h2>
              <Blocks blocks={s.blocks} />
            </section>
          ))}
          <Videos videos={videos} />
          <nav className="next-links" aria-label="Next guide">
            {getRelatedGuides(guide).map((g) => (
              <a href={"/guides/" + g.slug} key={g.id}>
                {g.title}
              </a>
            ))}
            <a href="/guides">All guides</a>
          </nav>
        </article>
      </div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: structuredData({
            "@context": "https://schema.org",
            "@graph": [
              {
                ...webPageSchema(
                  "/guides/" + guide.slug,
                  guide.title,
                  guide.summary,
                ),
                mainEntity: {
                  "@id": absolute("/guides/" + guide.slug) + "#article",
                },
              },
              {
                "@type": "Article",
                "@id": absolute("/guides/" + guide.slug) + "#article",
                headline: guide.title,
                description: guide.summary,
                image: absolute(guide.cover.src),
                inLanguage: site.language,
                ...(guide.publishedAt
                  ? { datePublished: guide.publishedAt }
                  : {}),
                ...(guide.updatedAt ? { dateModified: guide.updatedAt } : {}),
                mainEntityOfPage: {
                  "@id": absolute("/guides/" + guide.slug) + "#webpage",
                },
              },
            ],
          }),
        }}
      />
    </main>
  );
}
