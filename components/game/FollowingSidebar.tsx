"use client";

import { useEffect, useRef, type ReactNode } from "react";
import styles from "@/style/sidebar.module.css";

/** Keep a tall recommendation panel between the two viewport edges and its rail. */
export default function FollowingSidebar({
  children,
  follow = true,
}: {
  children: ReactNode;
  follow?: boolean;
}) {
  const track = useRef<HTMLElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!follow) {
      panel.current?.removeAttribute("style");
      return;
    }
    const rail = track.current,
      content = panel.current;
    if (!rail || !content) return;
    const mobile = window.matchMedia("(max-width: 768px)");
    const header = document.querySelector("header");
    let offset = 0,
      lastY = window.scrollY,
      raf = 0;
    let direction: "up" | "down" = "down";
    const update = () => {
      raf = 0;
      if (mobile.matches) {
        for (const name of [
          "position",
          "top",
          "bottom",
          "left",
          "right",
          "transform",
          "margin-top",
        ])
          content.style.removeProperty(name);
        offset = 0;
        return;
      }
      const bounds = rail.getBoundingClientRect();
      const height = content.getBoundingClientRect().height;
      const top = Math.max(0, header?.getBoundingClientRect().bottom ?? 0) + 16;
      const bottom = window.innerHeight - 16;
      const maximum = Math.max(0, bounds.height - height);
      if (height <= bottom - top) {
        offset = top - bounds.top;
      } else {
        const currentTop = bounds.top + offset;
        if (direction === "down" && currentTop < bottom - height)
          offset += bottom - height - currentTop;
        if (direction === "up" && currentTop > top) offset -= currentTop - top;
      }
      offset = Math.max(0, Math.min(offset, maximum));
      content.style.position = "absolute";
      content.style.top = "0px";
      content.style.bottom = "auto";
      content.style.left = "0px";
      content.style.right = "0px";
      content.style.marginTop = "0px";
      content.style.transform = "translate3d(0, " + offset + "px, 0)";
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    const scroll = () => {
      const y = window.scrollY;
      if (y !== lastY) direction = y > lastY ? "down" : "up";
      lastY = y;
      schedule();
    };
    const observer = new ResizeObserver(schedule);
    observer.observe(content);
    observer.observe(rail);
    if (header) observer.observe(header);
    mobile.addEventListener("change", schedule);
    window.addEventListener("resize", schedule);
    window.addEventListener("scroll", scroll, { passive: true });
    update();
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      mobile.removeEventListener("change", schedule);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("scroll", scroll);
      content.removeAttribute("style");
    };
  }, [follow]);
  return (
    <aside
      ref={track}
      className={styles.track}
      data-follow-scroll={follow}
      aria-label="More games to try"
    >
      <div ref={panel} className={styles.panel} data-follow-scroll={follow}>
        {children}
      </div>
    </aside>
  );
}
