import { structuredData, webPageSchema } from "@/lib/seo";
import { absolute } from "@/lib/url-policy";
import { tdk } from "@/seo/tdk";
import { getAllPublishedGuides } from "@/lib/guide-loader";
import Breadcrumbs from "@/components/content/Breadcrumbs";
export default function GuidesPage() {
  const items = getAllPublishedGuides();
  return (
    <main id="main-content" className="container page-space">
      <Breadcrumbs
        items={[{ label: "Home", path: "/" }, { label: "Guides" }]}
      />
      <h1>Suzy Says guides</h1>
      <p className="page-intro">
        Choose the help you need: making the right decision in a command round
        or preparing the version, subtitles and setup for your first session.
      </p>
      <div className="guide-list">
        {items.map((g) => (
          <a
            className="guide-card"
            href={"/guides/" + g.slug}
            key={g.id}
            data-guide-id={g.id}
          >
            <img
              src={g.cover.src}
              alt={g.cover.alt}
              width={g.cover.width ?? undefined}
              height={g.cover.height ?? undefined}
            />
            <div>
              <h2>{g.title}</h2>
              <p>{g.summary}</p>
              <span className="read-guide">Read guide →</span>
            </div>
          </a>
        ))}
      </div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: structuredData({
            "@context": "https://schema.org",
            ...webPageSchema(
              "/guides",
              "Suzy Says guides",
              tdk.guides.description,
              "CollectionPage",
            ),
            mainEntity: {
              "@type": "ItemList",
              numberOfItems: items.length,
              itemListElement: items.map((item, index) => ({
                "@type": "ListItem",
                position: index + 1,
                name: item.title,
                url: absolute("/guides/" + item.slug),
              })),
            },
          }),
        }}
      />
    </main>
  );
}
