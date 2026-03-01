"use client";

import { useState, useMemo } from "react";
import { useHotkeys } from "@/hooks/use-hotkeys";
import { QuickAddBar } from "./quick-add-bar";

interface QuickAddProviderProps {
  projects: { id: string; name: string; color: string }[];
}

/**
 * Client component that manages the quick-add command bar state
 * and binds the global Cmd/Ctrl+K shortcut.
 */
export function QuickAddProvider({ projects }: QuickAddProviderProps) {
  const [open, setOpen] = useState(false);

  const hotkeys = useMemo(
    () => [{ key: "k", cmdOrCtrl: true, handler: () => setOpen(true) }],
    []
  );

  useHotkeys(hotkeys);

  return (
    <QuickAddBar
      projects={projects}
      open={open}
      onClose={() => setOpen(false)}
    />
  );
}
