import { useState, useEffect } from "react";
import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { Download, X } from "lucide-react";

export function UpdateChecker() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [version, setVersion] = useState("");
  const [installing, setInstalling] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    check()
      .then((update) => {
        if (update) {
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
    try {
      const update = await check();
      if (update) {
        await update.downloadAndInstall();
        await relaunch();
      }
    } catch {
      setInstalling(false);
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3 shadow-lg">
      <Download className="h-4 w-4 text-indigo-600" />
      <span className="text-sm text-indigo-900">
        TaskFlow {version} is available
      </span>
      <button
        onClick={handleUpdate}
        disabled={installing}
        className="rounded-md bg-indigo-600 px-3 py-1 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        {installing ? "Installing..." : "Update now"}
      </button>
      <button onClick={() => setDismissed(true)} className="text-indigo-400 hover:text-indigo-600">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
