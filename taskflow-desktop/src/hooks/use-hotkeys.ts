import { useEffect, useCallback } from "react";

interface HotkeyConfig {
  /** The keyboard key to listen for (e.g. "k", "Escape") */
  key: string;
  /** Whether Cmd (Mac) / Ctrl (Windows/Linux) must be held */
  cmdOrCtrl?: boolean;
  /** Callback to fire when the hotkey is triggered */
  handler: () => void;
}

/**
 * Global keyboard shortcut hook.
 *
 * Skips when the user is focused on an input, textarea, select, or
 * contentEditable element — so typing in forms never triggers shortcuts.
 */
export function useHotkeys(hotkeys: HotkeyConfig[]) {
  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Skip when user is typing in a form element
      const tag = (e.target as HTMLElement)?.tagName;
      const isEditable = (e.target as HTMLElement)?.isContentEditable;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || isEditable) {
        // Still allow shortcuts with modifiers (Cmd/Ctrl) inside inputs
        const hasModifier = e.metaKey || e.ctrlKey;
        if (!hasModifier) return;
      }

      for (const hotkey of hotkeys) {
        const keyMatch = e.key.toLowerCase() === hotkey.key.toLowerCase();
        const modifierMatch = hotkey.cmdOrCtrl
          ? e.metaKey || e.ctrlKey
          : !e.metaKey && !e.ctrlKey;

        if (keyMatch && modifierMatch) {
          e.preventDefault();
          hotkey.handler();
          return;
        }
      }
    },
    [hotkeys]
  );

  useEffect(() => {
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onKeyDown]);
}
