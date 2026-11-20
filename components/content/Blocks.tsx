import type { Block, VideoBlock } from "@/types/content";
export function Videos({ videos }: { videos: VideoBlock[] }) {
  if (!videos.length) return null;
  return (
    <section className="videos" aria-labelledby="gameplay-videos">
      <h2 id="gameplay-videos">Watch the game in motion</h2>
      {videos.map((v) => (
        <div className="video-item" key={v.videoId}>
          <h3>{v.title}</h3>
          <p>{v.description}</p>
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${v.videoId}`}
            title={v.title}
            loading="lazy"
            allow="encrypted-media; picture-in-picture; fullscreen"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
          <p className="media-note">
            If the player is unavailable, the written steps above remain
            available.
          </p>
        </div>
      ))}
    </section>
  );
}
export default function Blocks({ blocks }: { blocks: Block[] }) {
  return (
    <>
      {blocks
        .filter((b) => b.type !== "video")
        .map((b, i) => {
          switch (b.type) {
            case "paragraph":
              return <p key={i}>{b.text}</p>;
            case "image":
              return (
                <figure key={i}>
                  <img
                    src={b.src}
                    alt={b.alt}
                    width={b.width ?? undefined}
                    height={b.height ?? undefined}
                    loading="lazy"
                  />
                  {b.caption && <figcaption>{b.caption}</figcaption>}
                </figure>
              );
            case "list":
              return b.style === "ordered" ? (
                <ol key={i}>
                  {b.items.map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ol>
              ) : (
                <ul key={i}>
                  {b.items.map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
              );
            case "steps":
              return (
                <ol className="steps" key={i}>
                  {b.items.map((x) => (
                    <li key={x.title}>
                      <h3>{x.title}</h3>
                      <p>{x.body}</p>
                    </li>
                  ))}
                </ol>
              );
            case "callout":
              return (
                <aside className={`callout callout-${b.tone}`} key={i}>
                  {b.label && <strong>{b.label}</strong>}
                  <p>{b.body}</p>
                </aside>
              );
            case "table":
              return (
                <div className="table-wrap" key={i}>
                  <table>
                    <thead>
                      <tr>
                        {b.columns.map((x) => (
                          <th scope="col" key={x}>
                            {x}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {b.rows.map((row, r) => (
                        <tr key={r}>
                          {row.map((x, c) => (
                            <td key={c}>{x}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            case "faq":
              return (
                <div className="faq" key={i}>
                  {b.items.map((x) => (
                    <details key={x.question}>
                      <summary>{x.question}</summary>
                      <p>{x.answer}</p>
                    </details>
                  ))}
                </div>
              );
            default:
              throw new Error("Unsupported content block");
          }
        })}
    </>
  );
}
