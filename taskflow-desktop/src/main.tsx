/**
 * TaskFlow Desktop — React SPA entry point.
 *
 * Sets up React Router with all routes, wrapped in the AppShell layout.
 */

import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppShell } from "./components/app-shell";
import { DashboardPage } from "./pages/dashboard";
import { TasksPage } from "./pages/tasks";
import { ProjectsPage } from "./pages/projects/index";
import { ProjectDetailPage } from "./pages/projects/detail";
import { ExtractPage } from "./pages/extract";
import { GeneratePage } from "./pages/generate";
import { SettingsPage } from "./pages/settings";
import "./globals.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/projects/:id" element={<ProjectDetailPage />} />
          <Route path="/extract" element={<ExtractPage />} />
          <Route path="/generate" element={<GeneratePage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
