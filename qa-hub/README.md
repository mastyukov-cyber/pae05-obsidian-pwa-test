# PAE-05 · PAE QA HUB v1.0 · Codespaces adapter

**Status: PREPARED / NOT RUN / NO DEPLOY.** This is a new isolated branch from exact
`13118049776f58635714a2aff374b51dc487c4ad`. The source app is `p16-editor/` TEST v0.5.0 (CP-P20).

## Boundaries
- One new TEST branch, only five new configuration/QA files; zero existing files modified.
- The adapter only serves SHA-1 Git-blob verified `p16-editor/` assets and their allowlisted icons.
- The application has three synthetic notes. Browser tests may create other **synthetic** notes in a fresh Codespace browser context only.
- Browser storage is isolated per Playwright context, including a separate **empty** IndexedDB for safe backup restore; re-import into a nonempty database must be refused.
- No real Vault, Gateway, Cloudflare, iCloud, Dropbox, API keys, paid API, personal data or production services.
- No Service Worker in this version. **Offline is not a PASS gate for this candidate**; it is marked `NOT_APPLICABLE_NO_SERVICE_WORKER`.
- Linux WebKit is useful synthetic QA; **it does not equal physical iPhone Safari acceptance**.
- A Codespace will clone this public synthetic repository; the preview HTTP server itself serves **only** the explicitly allowlisted synthetic UI assets, never arbitrary repo files.
- Keep forwarded port **8767 PRIVATE**. Never select Public. The devcontainer file cannot prove or enforce port privacy on its own.
- No `postCreateCommand`, no GitHub workflows, no automatic QA runner, no Pages/PR/main changes.
- Logs from a future authorized run stay only in the Codespace `qa-hub/.run/` (gitignored); no cloud upload is configured.

## Future use (requires SEPARATE approval)
Only after approving a new 2-core Codespace and a terminal command in that Codespace:
1. Verify the selected repo, pilot branch and SHA; check remaining free quota and confirm forwarded port visibility PRIVATE.
2. In `qa-hub/`, manually install exact `playwright@1.65.1` without install scripts; no dependency installation runs now.
3. Run `npm run verify` for byte-pinned source validation, then exactly one `npm run qa` Chromium → WebKit fail-fast test (create, confirm save, reload, edit, history, backup, isolated restore, re-import refusal).
4. Read the immutable JSON report under `qa-hub/.run/` before any extra attempt. An unexpected FAIL is STOP_FIRST, no retries.
5. Optional `npm run preview` offers a localhost server on 8767; after explicit visibility check, an authenticated Private Codespaces forwarded link may be used for manual TEST.
6. Stop the Codespace once the planned QA is complete. Any new server/automation/publish/merge requires a distinct owner approval.

QA execution, authentication through an external ChatGPT connector, iPhone Safari and release readiness: **NOT VERIFIED**.
