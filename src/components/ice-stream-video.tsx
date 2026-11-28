import { useEffect, useRef, useState } from "react";
import { Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function IceStreamVideo({ id, autoplay }: { id: string; autoplay: boolean }) {
  const playerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [nativeFullscreen, setNativeFullscreen] = useState(false);

  useEffect(() => {
    const sync = () => setNativeFullscreen(document.fullscreenElement === playerRef.current);
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);

  useEffect(() => {
    const player = playerRef.current;
    if (!expanded || !player) return;
    // The top layer escapes map/app stacking contexts without moving the DOM.
    // Even reparenting the same iframe can reload its browsing context.
    if (player.showPopover) {
      player.setAttribute("popover", "manual");
      player.showPopover();
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    buttonRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setExpanded(false);
      if (event.key === "Tab") {
        event.preventDefault();
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      if (player.hasAttribute("popover")) {
        player.hidePopover();
        player.removeAttribute("popover");
      }
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKey);
      buttonRef.current?.focus();
    };
  }, [expanded]);

  async function toggleFullscreen() {
    if (expanded) { setExpanded(false); return; }
    if (document.fullscreenElement === playerRef.current && document.fullscreenElement) {
      await document.exitFullscreen().catch(() => {});
      return;
    }
    if (playerRef.current?.requestFullscreen) {
      try { await playerRef.current.requestFullscreen(); return; } catch { /* Full-window fallback for phones. */ }
    }
    setExpanded(true);
  }

  return (
        <div ref={playerRef} role={expanded ? "dialog" : undefined} aria-modal={expanded ? true : undefined} aria-label={expanded ? "Inner City Enduro live stream" : undefined} className={expanded ? "fixed inset-0 z-[10000] m-0 flex h-dvh max-h-none w-dvw max-w-none flex-col border-0 bg-ink p-0 text-primary-foreground" : "flex w-full flex-col overflow-hidden rounded-2xl bg-ink text-primary-foreground ring-1 ring-border"}>
          <div className="flex justify-end p-2">
            <Button ref={buttonRef} type="button" variant="secondary" size="sm" onClick={() => void toggleFullscreen()} aria-label={expanded || nativeFullscreen ? "Exit video fullscreen" : "Make video fullscreen"} title={expanded || nativeFullscreen ? "Exit fullscreen" : "Fullscreen"}>
              {expanded || nativeFullscreen ? <Minimize2 /> : <Maximize2 />}
              {expanded || nativeFullscreen ? "Close fullscreen" : "Fullscreen"}
            </Button>
          </div>
          <div className={expanded || nativeFullscreen ? "min-h-0 flex-1" : "aspect-video w-full"}>
            <iframe src={`https://www.youtube.com/embed/${id}?autoplay=${autoplay ? 1 : 0}&rel=0&fs=1&playsinline=1`} title="Inner City Enduro live stream" className="h-full w-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture; fullscreen" allowFullScreen />
          </div>
        </div>
  );
}