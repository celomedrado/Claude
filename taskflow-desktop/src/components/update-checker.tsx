import { useState, useEffect, useRef } from "react";
import { check, type Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { Download, X } from "lucide-react";

export function UpdateChecker() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [version, setVersion] = useState("");
  const [installing, setInstalling] = useState(false);
  const [error, setError] = useState("");
  const [dismissed, setDismissed] = useState(false);
  const updateRef = useRef<Update | null>(null);

  useEffect(() => {
    check()
      .then((update) => {
        if (update) {
          updateRef.current = update;
          setUpdateAvailable(true);
          setVersion(update.version);
        }
      })
      .catch(() => {
        // Silently ignore — no update server configured yet or offline
      });
  }, []);

  if (!updateAvailable || dismissed) return null;

  async function handleUpdate() {
    setInstalling(true);
    setError("");
    try {
      const update = updateRef.current;
      if (update) {
        await update.downloadAndInstall();
        await relaunch();
      }
    } catch {
      setInstalling(false);
      setError("Update failed — try again");
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3 shadow-lg">
      <Download className="h-4 w-4 text-indigo-600" />
      <span className="text-sm text-indigo-900">
        TaskFlow {version} is available
      </span>
      {error && <span className="text-xs text-red-600">{error}</span>}
      <button
        onClick={handleUpdate}
        disabled={installing}
        className="rounded-md bg-indigo-600 px-3 py-1 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        {installing ? "Installing..." : "Update now"}
      </button>
      <button onClick={() => setDismissed(true)} aria-label="Dismiss update notification" className="text-indigo-400 hover:text-indigo-600">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
