# Feature Thread: Host macOS App

- **Feature:** Host macOS App for Public Download
- **Goal:** Enable anyone to download and install the TaskFlow macOS app
- **Priority/Target:** P0 / 2026-03-01
- **Links:** Repo: celomedrado/Claude, App: taskflow-desktop/
- **Owners:** PM / ARCH / FE / BE / QA / DM
- **Status:** Kickoff
- **Risks:** Code signing required for Gatekeeper, Apple Developer account needed ($99/yr), CI build time for universal binaries
- **Decisions needed:** Distribution channel (GitHub Releases vs custom site vs Homebrew), code signing strategy

---

## Agents Plan

### Feature Brief (PM)

**Ack:** Feature Brief requested for hosting macOS app for public download.

**Summary:** Set up a distribution pipeline so that anyone can download, install, and run TaskFlow.app on macOS without Gatekeeper warnings. The app binary should be built automatically via CI, signed, notarized, and published to a publicly accessible download location.

**Problem / Opportunity:** The macOS app is fully built (Tauri v2 + React SPA + Rust backend) but lives only as source code. Users cannot install it — there is no compiled binary, no download page, no CI pipeline, and no code signing. Without notarization, macOS Gatekeeper will block the app entirely.

**Goals:**
- Automated CI/CD pipeline that builds the macOS app on every release tag
- Code-signed and notarized `.dmg` installer
- Universal binary (Intel + Apple Silicon)
- Public download page or release URL anyone can access
- Auto-updater so existing users get new versions

**Non-goals:**
- Mac App Store submission (future effort)
- Windows/Linux builds (separate feature)
- Custom landing page / marketing site (out of scope for P0)

**User Stories:**
1. As a user, I visit a URL, download a `.dmg`, drag TaskFlow to Applications, and it opens without Gatekeeper warnings.
2. As a developer, I push a version tag and CI automatically builds, signs, notarizes, and publishes the release.
3. As an existing user, the app notifies me when an update is available and I can install it in-app.

**Acceptance Criteria:**
- **Given** a version tag is pushed, **when** CI runs, **then** a signed+notarized `.dmg` is published to GitHub Releases.
- **Given** a user downloads the `.dmg`, **when** they open the app, **then** macOS does not show an "unidentified developer" warning.
- **Given** the app is running, **when** a new release is published, **then** the app shows an update prompt.
- **Given** no Apple Developer account, **when** we build, **then** we document the unsigned fallback (user right-clicks → Open).

**Edge Cases:**
- Building without code signing (dev/testing) — must still produce a working `.dmg`
- Users on macOS 12 or older — Tauri v2 requires macOS 10.13+ but we target 13+
- Failed notarization — CI should fail the release, not publish unsigned
- Network timeout during notarization — retry logic in CI
- Quarantine attribute on downloaded `.dmg` — notarization handles this

**NFRs:**
- CI build time < 15 minutes (universal binary)
- `.dmg` size < 25MB (Tauri is ~5-10MB app + DMG overhead)
- Download available within 5 minutes of tag push
- HTTPS download URL

**Dependencies:**
- Apple Developer account (for signing + notarization)
- GitHub Actions (CI/CD)
- Tauri's bundler (already configured for `.dmg` target)
- `tauri-plugin-updater` (for auto-update — not yet in Cargo.toml)

**Analytics / Success Metrics:**
- Number of downloads (GitHub Releases download count)
- Successful installs (no Gatekeeper rejections)
- Auto-update adoption rate

**Rollout Plan:**
- Phase 1: GitHub Actions workflow for unsigned build (validate pipeline)
- Phase 2: Add code signing + notarization (requires Apple Developer certs)
- Phase 3: Add auto-updater to the app + update manifest hosting

**Open Questions:**
- Do you have an Apple Developer account? (Required for signing/notarization)
- Do you want Homebrew Cask distribution in addition to GitHub Releases?
- Should we set up a simple landing page (GitHub Pages) with download button?

---

### Architecture Direction + ADR (ARCH)

**Ack:** Reviewing architecture for macOS app distribution.

**Output — ADR: macOS App Distribution Strategy**

#### Context
TaskFlow is a Tauri v2 macOS app. It needs to be distributed so non-technical users can install it. macOS requires code signing + notarization for apps to bypass Gatekeeper. We need CI/CD to automate builds.

#### Decision: **GitHub Releases + GitHub Actions + Tauri Action**

#### Options Considered

| | GitHub Releases | Custom S3/CDN | Mac App Store | Homebrew Cask |
|---|---|---|---|---|
| **Setup effort** | Low (Tauri Action exists) | Medium | High (review process) | Medium (PR to homebrew-cask) |
| **Cost** | Free | $5-20/mo | $99/yr + review time | Free |
| **Discoverability** | Low (need to share URL) | Low | High (App Store search) | Medium (brew install) |
| **Auto-update** | Yes (tauri-plugin-updater) | Yes | Yes (built-in) | Yes (brew upgrade) |
| **Code signing req** | Recommended, not required | Same | Mandatory | Recommended |
| **User trust** | Medium | Low | High | Medium |

**Recommendation: GitHub Releases** because:
1. **Fastest to ship** — `tauri-apps/tauri-action` GitHub Action handles build + publish in one step
2. **Free** — no hosting costs
3. **Auto-updater compatible** — Tauri's updater reads from GitHub Releases API
4. **Universal binary support** — the Action builds for both Intel + Apple Silicon
5. **Iterate later** — can add Homebrew Cask and App Store as future layers

#### Architecture

```
Developer pushes tag (v1.0.0)
         │
         ▼
GitHub Actions workflow triggers
         │
         ▼
┌─────────────────────────────┐
│  tauri-apps/tauri-action    │
│  - npm install + build      │
│  - cargo build (Rust)       │
│  - Bundle .app + .dmg       │
│  - Sign (if certs present)  │
│  - Notarize (if certs)      │
│  - Create GitHub Release    │
│  - Upload .dmg artifact     │
│  - Upload update manifest   │
└─────────────────────────────┘
         │
         ▼
GitHub Releases page
(public download URL)
         │
         ▼
Users download .dmg → drag to /Applications → run
         │
         ▼
App checks GitHub Releases API for updates
(tauri-plugin-updater)
```

#### Code Signing Strategy

**With Apple Developer account ($99/yr):**
- Store certs as GitHub Secrets: `APPLE_CERTIFICATE`, `APPLE_CERTIFICATE_PASSWORD`, `APPLE_SIGNING_IDENTITY`, `APPLE_ID`, `APPLE_PASSWORD`, `APPLE_TEAM_ID`
- `tauri-action` handles signing + notarization automatically
- Result: users double-click → app opens without warnings

**Without Apple Developer account (fallback):**
- Build unsigned `.dmg`
- Users must right-click → Open → confirm "Open" in dialog
- Document this in README/download page
- Still fully functional, just an extra step

#### Consequences
- Must add `tauri-plugin-updater` to Cargo.toml + configure update endpoint
- Must create `.github/workflows/release.yml`
- Must configure `tauri.conf.json` with updater settings
- Code signing secrets must be configured in GitHub repo settings (when available)

#### Rollback
- Delete the GitHub Release to remove download
- Revert tag to re-trigger a fixed build

---

### API Contract (FE + BE)

**Ack:** This feature is primarily CI/CD + config. Minimal code changes needed.

**Frontend changes:**
- None for distribution itself
- For auto-updater: add update check UI in settings or app shell

**Backend (Rust) changes:**
- Add `tauri-plugin-updater` to `Cargo.toml`
- Register updater plugin in `lib.rs`
- Optionally: add an IPC command to check for updates manually

```typescript
// New IPC command (optional)
invoke("check_for_updates") → { available: boolean, version?: string, url?: string }
```

**Config changes (tauri.conf.json):**
```json
{
  "plugins": {
    "updater": {
      "endpoints": [
        "https://github.com/celomedrado/Claude/releases/latest/download/latest.json"
      ],
      "pubkey": "<PUBLIC_KEY>"
    }
  }
}
```

---

### Test Plan (QA)

**Ack:** Test plan for macOS app distribution pipeline.

**Scope:** CI/CD pipeline, built artifact, installation flow, auto-updater.

**P0 (must pass):**
- [ ] GitHub Actions workflow triggers on version tag push
- [ ] CI builds successfully (no compile errors)
- [ ] `.dmg` artifact is produced and uploaded to GitHub Releases
- [ ] `.dmg` can be downloaded from the public release URL
- [ ] User can mount `.dmg`, drag app to Applications, and launch it
- [ ] App runs correctly after install (tasks CRUD, UI renders)

**P1 (should pass):**
- [ ] Universal binary works on both Intel and Apple Silicon Macs
- [ ] Code-signed app opens without Gatekeeper warning (when certs configured)
- [ ] Notarized app passes `spctl --assess` check
- [ ] Auto-updater detects new version and prompts user
- [ ] `.dmg` size is under 25MB
- [ ] Release notes are included in GitHub Release

**P2 (nice to have):**
- [ ] Build completes in under 15 minutes
- [ ] Unsigned build includes clear instructions for bypassing Gatekeeper
- [ ] Old versions remain downloadable from GitHub Releases

**Data/Env Needs:**
- macOS runner (GitHub-hosted `macos-latest` or `macos-14`)
- Apple Developer certs (for signing tests) — or test unsigned path
- Test Mac machines: Intel + Apple Silicon

**Automation Plan:**
- CI itself is the automation — workflow validates build succeeds
- Post-build: download artifact and verify it's a valid `.dmg` (hdiutil verify)
- Signing check: `codesign --verify` and `spctl --assess` in CI

---

### Release Plan (DM)

**Ack:** Release plan for macOS app hosting.

**Milestones:**

| Phase | Scope | Effort |
|---|---|---|
| **Phase 1** | GitHub Actions workflow (unsigned build + release) | Small — 1-2 hours |
| **Phase 2** | Code signing + notarization (when Apple Developer certs available) | Medium — half day |
| **Phase 3** | Auto-updater integration (`tauri-plugin-updater`) | Medium — half day |

**Risks:**
- **No Apple Developer account** — app will trigger Gatekeeper without signing. Mitigate: document the right-click → Open workaround, proceed with unsigned builds first.
- **CI build time** — macOS builds on GitHub Actions can be slow (~10-15 min). Mitigate: cache Cargo registry + target directory.
- **Tauri Action compatibility** — ensure `tauri-apps/tauri-action@v0` supports Tauri v2. It does (v0.5+).

**Rollout:**
1. Merge GitHub Actions workflow to main
2. Push a `v1.0.0` tag to trigger first release
3. Verify download + install on a clean Mac
4. Share the release URL

**Rollback:** Delete the GitHub Release + tag. Users with existing installs are unaffected.

**Monitoring:** GitHub Releases download count, CI workflow success rate.

**DoR Checklist:**
- [x] PM posted Feature Brief
- [x] ARCH posted design direction + ADR (GitHub Releases + Tauri Action)
- [x] FE/BE posted contract (minimal — updater config)
- [x] QA posted test plan
- [x] DM confirmed milestones/risks

**Signoff commands to run:**
- `/signoff PM DoR`
- `/signoff QA DoR`
- `/signoff ARCH DoR`
- `/signoff DM DoR`

---

## Solo (CTO) Plan

### Assessment

This is a **straightforward CI/CD + config task**, not a code refactor. We need:
1. A GitHub Actions workflow that builds the Tauri app and publishes to GitHub Releases
2. Config changes for the updater plugin
3. Optionally, code signing (depends on Apple Developer account)

### Cursor Discovery Prompt

```
I need to set up automated distribution for a Tauri v2 macOS app. Please investigate and report:

1. TAURI CONFIG — Read taskflow-desktop/src-tauri/tauri.conf.json:
   - Current bundle targets
   - Any existing updater config
   - App identifier and version

2. RUST DEPENDENCIES — Read taskflow-desktop/src-tauri/Cargo.toml:
   - Is tauri-plugin-updater present?
   - Current Tauri version and features

3. APP SETUP — Read taskflow-desktop/src-tauri/src/lib.rs:
   - How are plugins registered?
   - Where would updater plugin be added?

4. EXISTING CI — Check .github/workflows/ for any existing workflows

5. PACKAGE.JSON — Read taskflow-desktop/package.json:
   - Build scripts available
   - @tauri-apps/cli version

Report: file paths, current values, and what needs to change.
```

### Phase 1 — GitHub Actions Release Workflow (1 of 2)

```
PHASE 1: Create GitHub Actions workflow for Tauri macOS build + release

CONTEXT:
- Tauri v2 app at taskflow-desktop/
- No existing CI/CD workflows
- Target: build .dmg and publish to GitHub Releases on tag push
- Use tauri-apps/tauri-action for build + publish

TASKS:

1. Create .github/workflows/release.yml:
   - Trigger: push tags matching "v*" (e.g., v1.0.0)
   - Runner: macos-latest (or macos-14 for Apple Silicon)
   - Steps:
     a. Checkout code
     b. Setup Node.js 20
     c. Setup Rust toolchain (stable)
     d. Install frontend dependencies (npm ci in taskflow-desktop/)
     e. Run tauri-apps/tauri-action@v0:
        - projectPath: taskflow-desktop
        - tagName: ${{ github.ref_name }}
        - releaseName: "TaskFlow ${{ github.ref_name }}"
        - releaseBody: "Download TaskFlow.dmg below to install."
        - releaseDraft: false
        - prerelease: false
     f. Add Cargo cache (actions/cache for ~/.cargo and target/)
   - Environment variables for signing (optional, from secrets):
     - APPLE_CERTIFICATE
     - APPLE_CERTIFICATE_PASSWORD
     - APPLE_SIGNING_IDENTITY
     - APPLE_ID
     - APPLE_PASSWORD
     - APPLE_TEAM_ID
   - For universal binary (Intel + Apple Silicon):
     - args: --target universal-apple-darwin

2. Update tauri.conf.json:
   - Verify bundle targets include "dmg"
   - Add macOS signing identity placeholder (reads from env)

3. Add build matrix for both architectures (if not using universal binary):
   - aarch64-apple-darwin (Apple Silicon)
   - x86_64-apple-darwin (Intel)
   Or use --target universal-apple-darwin for a single fat binary.

DO NOT implement auto-updater yet — that's Phase 2.

Return a STATUS REPORT listing every file created/modified.
```

### Phase 2 — Auto-Updater Integration (2 of 2)

```
PHASE 2: Add auto-updater to the Tauri app

CONTEXT:
- Phase 1 set up CI to build and publish .dmg to GitHub Releases
- Now we add tauri-plugin-updater so the app can self-update

TASKS:

1. Add updater dependency:
   - In Cargo.toml: tauri-plugin-updater = "2"
   - In package.json: @tauri-apps/plugin-updater

2. Register updater plugin in src/lib.rs:
   - Add .plugin(tauri_plugin_updater::Builder::new().build())

3. Generate updater key pair:
   - Run: npx @tauri-apps/cli signer generate -w ~/.tauri/taskflow.key
   - The public key goes in tauri.conf.json
   - The private key is stored as TAURI_SIGNING_PRIVATE_KEY GitHub secret

4. Configure tauri.conf.json:
   - Add updater config:
     {
       "plugins": {
         "updater": {
           "endpoints": [
             "https://github.com/celomedrado/Claude/releases/latest/download/latest.json"
           ],
           "pubkey": "<generated-public-key>"
         }
       }
     }

5. Update the GitHub Actions workflow:
   - Add TAURI_SIGNING_PRIVATE_KEY and TAURI_SIGNING_PRIVATE_KEY_PASSWORD
     as environment variables from secrets
   - tauri-action automatically generates the update manifest (latest.json)

6. (Optional) Add UI for update check:
   - In settings page or app shell, check for updates on launch
   - Show toast notification when update available

Return a STATUS REPORT listing every file created/modified.
```

---

## Comparison

| Dimension | Agents Plan | Solo (CTO) Plan |
|---|---|---|
| **Scope** | Full artifact set (brief, ADR, contract, test plan, release plan) | Discovery + 2-phase Cursor prompts |
| **Architecture** | Detailed ADR with 4-option comparison table | Same recommendation, inline |
| **Phases** | 3 phases (workflow → signing → updater) | 2 phases (workflow → updater) — signing is config, not a separate phase |
| **Code signing** | Covered as Phase 2 with full secret list | Covered as env vars in Phase 1 workflow |
| **Testing** | Detailed P0/P1/P2 matrix | Implicit in CI |
| **Risk coverage** | Gatekeeper, CI time, Action compatibility | Same risks, less structured |
| **Effort** | ~1-2 days total | ~2-4 hours total |
| **Execution speed** | Slower (artifact review) | Faster (just build the workflow) |

### Recommendation

**Use the Solo Plan for execution — this is a small, well-understood task.**

Unlike the original macOS app conversion (large architectural refactor), hosting is straightforward CI/CD work. The Agents Plan artifacts are useful as reference but the Solo Plan's 2 phases are all you need:
1. **Phase 1:** Create the GitHub Actions workflow — this gets you to "anyone can download"
2. **Phase 2:** Add auto-updater — this keeps users current

**Critical question before starting:** Do you have an Apple Developer account? This determines whether the app will be signed (clean install) or unsigned (requires right-click → Open).
