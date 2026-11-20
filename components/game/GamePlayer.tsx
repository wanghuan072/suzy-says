"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import type { Game } from "@/types/game";
import styles from "@/style/player.module.css";

type PlayerGame = Pick<Game, "id" | "title" | "image" | "player">;

type State =
  | "unconfigured"
  | "ready"
  | "loading"
  | "frame-loaded"
  | "failed"
  | "timed-out";

function safeAddress(value: string) {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      !host.includes(".") ||
      host === "localhost" ||
      /(?:^|\.)(?:local|localhost|test|invalid|example)$/.test(host) ||
      /^\d+\.\d+\.\d+\.\d+$/.test(host) ||
      host.includes(":")
    )
      return false;
    return true;
  } catch {
    return false;
  }
}

export default function GamePlayer({ game }: { game: PlayerGame }) {
  return <PlayerRuntime key={game.id} game={game} />;
}

function PlayerRuntime({ game }: { game: PlayerGame }) {
  const [state, setState] = useState<State>(
    game.player.iframeSrc ? "ready" : "unconfigured",
  );
  const [attempt, setAttempt] = useState(0);
  const [webpage, setWebpage] = useState(false);
  const [browser, setBrowser] = useState(false);
  const [modeMessage, setModeMessage] = useState("");
  const root = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const webButton = useRef<HTMLButtonElement>(null);
  const browserButton = useRef<HTMLButtonElement>(null);
  const retryButton = useRef<HTMLButtonElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restoreWeb = useRef<(() => void) | null>(null);
  const clearTimer = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }, []);

  const start = () => {
    clearTimer();
    if (!safeAddress(game.player.iframeSrc)) {
      setState("failed");
      return;
    }
    setAttempt((n) => n + 1);
    setState("loading");
    root.current?.focus({ preventScroll: true });
  };

  useEffect(() => {
    if (state === "failed" || state === "timed-out")
      retryButton.current?.focus({ preventScroll: true });
  }, [state]);

  useEffect(() => {
    const reset = () => {
      clearTimer();
      restoreWeb.current?.();
      if (document.fullscreenElement === root.current)
        void document.exitFullscreen().catch(() => {});
      setWebpage(false);
      setBrowser(false);
      setModeMessage("");
      setAttempt(0);
      setState(game.player.iframeSrc ? "ready" : "unconfigured");
    };
    const restored = (event: PageTransitionEvent) => {
      if (event.persisted) reset();
    };
    window.addEventListener("pagehide", reset);
    window.addEventListener("pageshow", restored);
    return () => {
      window.removeEventListener("pagehide", reset);
      window.removeEventListener("pageshow", restored);
    };
  }, [clearTimer, game.player.iframeSrc]);

  useEffect(() => {
    if (state !== "loading") return;
    timer.current = setTimeout(
      () => setState("timed-out"),
      game.player.loadTimeoutMs,
    );
    return clearTimer;
  }, [state, attempt, game.player.loadTimeoutMs, clearTimer]);

  useEffect(() => {
    const playerNode = root.current;
    const changed = () => {
      const active = document.fullscreenElement === playerNode;
      setBrowser(active);
      if (!active && document.activeElement === document.body)
        browserButton.current?.focus();
    };
    document.addEventListener("fullscreenchange", changed);
    return () => {
      document.removeEventListener("fullscreenchange", changed);
      clearTimer();
      if (document.fullscreenElement === playerNode)
        void document.exitFullscreen().catch(() => {});
    };
  }, [clearTimer]);

  useEffect(() => {
    if (!webpage || !root.current) return;
    const y = window.scrollY;
    const overflow = document.body.style.overflow;
    const previous: Array<[HTMLElement, boolean]> = [];
    let branch: HTMLElement = root.current;
    while (branch.parentElement) {
      for (const sibling of Array.from(branch.parentElement.children)) {
        if (sibling !== branch && sibling instanceof HTMLElement) {
          previous.push([sibling, sibling.inert]);
          sibling.inert = true;
        }
      }
      branch = branch.parentElement;
      if (branch === document.body) break;
    }
    document.body.style.overflow = "hidden";
    webButton.current?.focus();
    let restored = false;
    const restore = () => {
      if (restored) return;
      restored = true;
      for (const [element, inert] of previous) element.inert = inert;
      document.body.style.overflow = overflow;
      window.scrollTo({ top: y, behavior: "instant" });
      webButton.current?.focus({ preventScroll: true });
    };
    restoreWeb.current = restore;
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setWebpage(false);
    };
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("keydown", escape);
      restore();
      restoreWeb.current = null;
    };
  }, [webpage]);

  const toggleWeb = async () => {
    setModeMessage("");
    if (!webpage && document.fullscreenElement) {
      try {
        await document.exitFullscreen();
      } catch {
        setModeMessage("Exit browser fullscreen before changing the view.");
        return;
      }
    }
    setWebpage((value) => !value);
  };

  const toggleBrowser = async () => {
    setModeMessage("");
    if (webpage) {
      restoreWeb.current?.();
      setWebpage(false);
    }
    try {
      if (document.fullscreenElement === root.current)
        await document.exitFullscreen();
      else if (root.current?.requestFullscreen)
        await root.current.requestFullscreen();
      else
        setModeMessage(
          "Browser fullscreen is unavailable. Use Webpage Fullscreen instead.",
        );
    } catch {
      setModeMessage(
        "Browser fullscreen was declined. You can still use Webpage Fullscreen.",
      );
    }
    browserButton.current?.focus({ preventScroll: true });
  };

  const active = state === "loading" || state === "frame-loaded";
  const error = state === "failed" || state === "timed-out";
  const aspect = game.player.aspectRatio || "16 / 10";

  return (
    <div
      ref={root}
      tabIndex={-1}
      className={`${styles.player} ${webpage ? styles.webpage : ""}`}
      data-game-id={game.id}
      data-player-state={state}
    >
      <div
        className={styles.viewport}
        style={{ aspectRatio: aspect }}
        aria-busy={state === "loading"}
      >
        {active && (
          <iframe
            key={`${game.id}-${attempt}`}
            ref={frame}
            className={styles.frame}
            src={game.player.iframeSrc}
            title={game.title}
            allow={game.player.permissionsPolicy.join("; ")}
            referrerPolicy={game.player.referrerPolicy ?? undefined}
            sandbox={game.player.sandbox?.join(" ")}
            allowFullScreen
            onLoad={() => {
              clearTimer();
              setState("frame-loaded");
              frame.current?.focus();
            }}
            onError={() => {
              clearTimer();
              setState("failed");
            }}
          />
        )}
        {state === "ready" && (
          <div className={styles.ready}>
            {game.image.src && (
              <Image
                src={game.image.src}
                alt={game.image.alt}
                fill
                sizes="(max-width: 768px) calc(100vw - 32px), (max-width: 1024px) 65vw, 972px"
                className={styles.cover}
                priority
                unoptimized
              />
            )}
            <button className={styles.play} type="button" onClick={start}>
              Play Now<span aria-hidden="true"> ▶</span>
            </button>
          </div>
        )}
        {(state === "loading" || state === "unconfigured" || error) && (
          <div className={styles.feedback} role="status" aria-live="polite">
            <p>
              {state === "unconfigured"
                ? "This game is currently unavailable."
                : state === "loading"
                  ? "Loading game…"
                  : state === "timed-out"
                    ? "The game is taking too long to respond. Try loading it again."
                    : "This game could not be loaded safely. Please try again."}
            </p>
            {error && (
              <button
                ref={retryButton}
                className={styles.retry}
                onClick={start}
                type="button"
              >
                Try again
              </button>
            )}
          </div>
        )}
      </div>
      <div className={styles.bar}>
        <span className={styles.title}>{game.title}</span>
        <div className={styles.controls}>
          <button
            ref={webButton}
            onClick={toggleWeb}
            className={styles.mode}
            type="button"
            aria-pressed={webpage}
            aria-label={
              webpage ? "Exit Webpage Fullscreen" : "Webpage Fullscreen"
            }
            title={webpage ? "Exit Webpage Fullscreen" : "Webpage Fullscreen"}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              aria-hidden="true"
            >
              <path d="M4 8V4h16v16H4V8Z M4 8h16 M8 12h8v5H8z" />
            </svg>
          </button>
          <button
            ref={browserButton}
            onClick={toggleBrowser}
            className={styles.mode}
            type="button"
            aria-pressed={browser}
            aria-label={
              browser ? "Exit Browser Fullscreen" : "Browser Fullscreen"
            }
            title={browser ? "Exit Browser Fullscreen" : "Browser Fullscreen"}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              aria-hidden="true"
            >
              <path d="M8 3H3v5 M16 3h5v5 M21 16v5h-5 M8 21H3v-5" />
            </svg>
          </button>
        </div>
      </div>
      {state === "frame-loaded" && (
        <p className={styles.modeMessage} role="status">
          Player frame loaded. Game availability and controls have not been
          verified.
        </p>
      )}
      {modeMessage && (
        <p className={styles.modeMessage} role="status">
          {modeMessage}
        </p>
      )}
    </div>
  );
}
