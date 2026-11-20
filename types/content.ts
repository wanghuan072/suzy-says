export type LocalImage = {
  src: string;
  alt: string;
  width: number | null;
  height: number | null;
};
export type VideoBlock = {
  type: "video";
  provider: "youtube";
  videoId: string;
  title: string;
  description: string;
  poster?: LocalImage;
};
export type Block =
  | { type: "paragraph"; text: string }
  | ({ type: "image"; caption?: string } & LocalImage)
  | VideoBlock
  | { type: "list"; style: "ordered" | "unordered"; items: string[] }
  | { type: "steps"; items: { title: string; body: string }[] }
  | {
      type: "callout";
      tone: "info" | "tip" | "warning";
      label?: string;
      body: string;
    }
  | { type: "table"; columns: string[]; rows: string[][] }
  | { type: "faq"; items: { question: string; answer: string }[] };
export type Seo = { title: string; description: string; keywords?: string[] };
