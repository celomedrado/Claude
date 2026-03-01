/**
 * Quick-add command bar provider.
 *
 * Listens for Cmd/Ctrl+K (in-app) and Tauri global shortcut events.
 */

import { useState, useMemo, useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { useHotkeys } from "@/hooks/use-hotkeys";
import { QuickAddBar } from "./quick-add-bar";
import type { Project } from "@/lib/types";

interface QuickAddProviderProps {
  projects: Pick<Project, "id" | "name" | "color">[];
}

export function QuickAddProvider({ projects }: QuickAddProviderProps) {
  const [open, setOpen] = useState(false);

  // In-app Cmd/Ctrl+K shortcut
  const hotkeys = useMemo(
    () => [{ key: "k", cmdOrCtrl: true, handler: () => setOpen(true) }],
    []
  );
  useHotkeys(hotkeys);

  // Listen for Tauri global shortcut event (Cmd+Shift+T from any app)
  useEffect(() => {
    const unlisten = listen("global-shortcut-triggered", () => {
      setOpen(true);
    });
    // Also listen for tray menu "New Task" action
    const unlistenTray = listen("open-quick-add", () => {
      setOpen(true);
    });
    return () => {
      unlisten.then((fn) => fn());
      unlistenTray.then((fn) => fn());
    };
  }, []);

  return (
    <QuickAddBar
      projects={projects}
      open={open}
      onClose={() => setOpen(false)}
    />
  );
}
