import { structuredData, webPageSchema } from "@/lib/seo";
import { tdk } from "@/seo/tdk";
import Breadcrumbs from "@/components/content/Breadcrumbs";
import { site } from "@/config/site";
import capabilities from "@/planning/site-capabilities.json";
import legalCopy from "@/data/legal-pages.json";
const copy: Record<
  string,
  { title: string; sections: { heading: string; text: string }[] }
> = legalCopy;
export default function LegalPage({ id }: { id: string }) {
  const page = copy[id];
  if (!page) throw new Error("Unknown legal page");
  if (capabilities.features.accounts.enabled)
    throw new Error("Legal capability review required");
  return (
    <main id="main-content" className="container page-space">
      <Breadcrumbs
        items={[{ label: "Home", path: "/" }, { label: page.title }]}
      />
      <article className="legal-body">
        <h1>{page.title}</h1>
        {page.sections.map((s) => (
          <section key={s.heading}>
            <h2>{s.heading}</h2>
            <p>{s.text}</p>
          </section>
        ))}
        {id === "contact" && <p className="contact-address">{site.email}</p>}
      </article>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: structuredData({
            "@context": "https://schema.org",
            ...webPageSchema(
              "/" + id,
              page.title,
              tdk[id as keyof typeof tdk].description,
              id === "about"
                ? "AboutPage"
                : id === "contact"
                  ? "ContactPage"
                  : "WebPage",
            ),
          }),
        }}
      />
    </main>
  );
}
