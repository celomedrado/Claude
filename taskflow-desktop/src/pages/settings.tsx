/**
 * Settings page — desktop-only, manages app preferences.
 *
 * Settings: OpenAI API key, auto-launch, notifications, global hotkey,
 * data import from web app.
 */

import { useState, useEffect } from "react";
import { getSettings, updateSettings, importFromWeb } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Settings, Key, Bell, Keyboard, Upload, CheckCircle2 } from "lucide-react";
import type { AppSettings } from "@/lib/types";

export function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [importPath, setImportPath] = useState("");
  const [importResult, setImportResult] = useState("");

  useEffect(() => {
    getSettings().then((s) => {
      setSettings(s);
      setApiKey(s.openaiApiKey || "");
    });
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      const updated = await updateSettings({
        openaiApiKey: apiKey || null,
        autoLaunch: settings?.autoLaunch,
        notificationsEnabled: settings?.notificationsEnabled,
      });
      setSettings(updated);
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(key: "autoLaunch" | "notificationsEnabled") {
    if (!settings) return;
    const updated = await updateSettings({ [key]: !settings[key] });
    setSettings(updated);
  }

  async function handleImport() {
    if (!importPath.trim()) return;
    try {
      const result = await importFromWeb(importPath.trim());
      setImportResult(result);
    } catch (err) {
      setImportResult(err instanceof Error ? err.message : "Import failed");
    }
  }

  if (!settings) return <div className="text-sm text-gray-400">Loading...</div>;

  return (
    <div className="max-w-2xl">
      <h2 className="text-xl font-semibold text-gray-900">Settings</h2>
      <p className="mt-1 text-sm text-gray-500 mb-6">Configure your TaskFlow desktop app</p>

      <div className="space-y-6">
        {/* OpenAI API Key */}
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Key className="h-4 w-4 text-gray-500" />
            <h3 className="text-sm font-semibold text-gray-700">OpenAI API Key</h3>
          </div>
          <p className="text-xs text-gray-500 mb-3">
            Required for AI features (task extraction, document generation).
            Get a key at <span className="text-indigo-600">platform.openai.com/api-keys</span>
          </p>
          <div className="flex gap-2">
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
              className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>

        {/* Auto-launch */}
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4 text-gray-500" />
              <div>
                <h3 className="text-sm font-semibold text-gray-700">Auto-launch on login</h3>
                <p className="text-xs text-gray-500">Start TaskFlow when you log in to your Mac</p>
              </div>
            </div>
            <button
              onClick={() => handleToggle("autoLaunch")}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.autoLaunch ? "bg-indigo-600" : "bg-gray-200"}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.autoLaunch ? "translate-x-6" : "translate-x-1"}`} />
            </button>
          </div>
        </div>

        {/* Notifications */}
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-gray-500" />
              <div>
                <h3 className="text-sm font-semibold text-gray-700">Overdue notifications</h3>
                <p className="text-xs text-gray-500">Get notified when tasks are past due</p>
              </div>
            </div>
            <button
              onClick={() => handleToggle("notificationsEnabled")}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.notificationsEnabled ? "bg-indigo-600" : "bg-gray-200"}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.notificationsEnabled ? "translate-x-6" : "translate-x-1"}`} />
            </button>
          </div>
        </div>

        {/* Global hotkey info */}
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Keyboard className="h-4 w-4 text-gray-500" />
            <h3 className="text-sm font-semibold text-gray-700">Keyboard shortcuts</h3>
          </div>
          <div className="space-y-1 text-xs text-gray-600">
            <div className="flex justify-between">
              <span>Quick-add (in-app)</span>
              <kbd className="rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 font-mono text-[10px]">Cmd+K</kbd>
            </div>
            <div className="flex justify-between">
              <span>Quick-add (global)</span>
              <kbd className="rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 font-mono text-[10px]">Cmd+Shift+T</kbd>
            </div>
          </div>
        </div>

        {/* Data import */}
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Upload className="h-4 w-4 text-gray-500" />
            <h3 className="text-sm font-semibold text-gray-700">Import from web app</h3>
          </div>
          <p className="text-xs text-gray-500 mb-3">
            Import tasks and projects from the TaskFlow web app's SQLite database file.
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={importPath}
              onChange={(e) => setImportPath(e.target.value)}
              placeholder="/path/to/taskflow/data/taskflow.db"
              className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <Button variant="outline" onClick={handleImport}>Import</Button>
          </div>
          {importResult && (
            <div className="mt-2 flex items-center gap-1 text-xs text-green-600">
              <CheckCircle2 className="h-3 w-3" />{importResult}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
