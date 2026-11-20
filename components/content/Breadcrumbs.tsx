import { structuredData } from "@/lib/seo";
import { absolute } from "@/lib/url-policy";
export default function Breadcrumbs({
  items,
}: {
  items: { label: string; path?: string }[];
}) {
  return (
    <>
      <nav aria-label="Breadcrumb" className="breadcrumbs">
        <ol>
          {items.map((x, i) => (
            <li key={i}>
              {x.path ? (
                <a href={x.path}>{x.label}</a>
              ) : (
                <span aria-current="page">{x.label}</span>
              )}
            </li>
          ))}
        </ol>
      </nav>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: structuredData({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: items.map((x, i) => ({
              "@type": "ListItem",
              position: i + 1,
              name: x.label,
              ...(x.path ? { item: absolute(x.path) } : {}),
            })),
          }),
        }}
      />
    </>
  );
}
