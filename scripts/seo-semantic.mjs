import { parse } from "parse5";
// Hash semantic rendered content, never bundles, styling, hydration or build IDs.
export function semanticContent(html, assetDigest = () => null) {
  const result = [];
  const visit = (node) => {
    if (["style", "noscript"].includes(node.tagName)) return;
    const attrs = Object.fromEntries(
      (node.attrs ?? []).map((a) => [a.name, a.value]),
    );
    if (
      node.tagName === "meta" &&
      ["msvalidate.01", "google-site-verification"].includes(attrs.name)
    )
      return;
    if (node.tagName === "script") {
      if (attrs.type === "application/ld+json")
        result.push(node.childNodes?.map((n) => n.value ?? "").join(""));
      return;
    }
    if (node.nodeName === "#text") {
      const value = node.value
        .replace(/©\s*\d{4}/g, "©")
        .replace(/\s+/g, " ")
        .trim();
      if (value) result.push(value);
    }
    if (node.tagName === "img" && attrs.src?.startsWith("/images/"))
      result.push(["asset", attrs.src, assetDigest(attrs.src)]);
    if (node.tagName) {
      const meaningful = Object.fromEntries(
        Object.entries(attrs).filter(([name]) =>
          [
            "href",
            "src",
            "alt",
            "title",
            "name",
            "content",
            "property",
            "rel",
            "lang",
            "aria-label",
          ].includes(name),
        ),
      );
      // Skip resource hints and scripts managed by the framework.
      if (node.tagName !== "link" || attrs.rel === "canonical")
        if (Object.keys(meaningful).length)
          result.push([node.tagName, meaningful]);
    }
    for (const child of node.childNodes ?? []) visit(child);
  };
  visit(parse(html));
  return result;
}
