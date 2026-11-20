"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { navigation } from "@/config/navigation";
export default function SiteHeader({
  name,
  logo,
}: {
  name: string;
  logo: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const current = usePathname();
  useEffect(() => {
    const obs = new ResizeObserver(() =>
      document.documentElement.style.setProperty(
        "--header-height",
        `${ref.current?.getBoundingClientRect().height ?? 80}px`,
      ),
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  useEffect(() => {
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        setOpen(false);
        button.current?.focus();
      }
    };
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [open]);
  return (
    <header ref={ref} className="header">
      <div className="container header-inner">
        <a href="/" aria-label={`${name} home`}>
          <img src={logo} width="210" height="48" alt={name} />
        </a>
        <button
          ref={button}
          className="menu-toggle"
          aria-expanded={open}
          aria-controls="main-navigation"
          onClick={() => setOpen(!open)}
        >
          {open ? "Close menu" : "Menu"}
          <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M3 6h18M3 12h18M3 18h18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            />
          </svg>
        </button>
        <nav
          id="main-navigation"
          aria-label="Main"
          className={open ? "navigation navigation-open" : "navigation"}
        >
          {navigation.map((n) => (
            <a
              key={n.path}
              href={n.path}
              aria-current={current === n.path ? "page" : undefined}
            >
              {n.label}
            </a>
          ))}
        </nav>
      </div>
    </header>
  );
}
