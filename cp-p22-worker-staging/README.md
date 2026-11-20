# PAE-05 CP-P22 R01 — Cloudflare Worker synthetic read-only staging

**STATUS: SOURCE-ONLY DRAFT / NOT DEPLOYED / NOT LIVE / SECURITY NO-GO / RELEASE NO-GO.**

Pinned base: `13118049776f58635714a2aff374b51dc487c4ad`. Current GitHub Pages TEST v0.5.0 remains unchanged.

## Scope

- One candidate Worker and existing static `p16-editor/` assets on one future HTTPS origin.
- All existing `p16-editor` files remain byte-for-byte unchanged. Staging Worker injects one additional opt-in panel *into a served HTML response*, not into the GitHub file.
- API: GET `/api/session`, GET `/api/notes`, GET `/api/notes/:synthetic-id`; POST `/api/session` creates a public guest demo cookie, POST `/api/logout` clears the cookie. No real notes writes.
- Three immutable fabricated notes; all read responses say `SYNTHETIC_NOT_SYNCED`, `peerConfirmed:false`. Local IndexedDB editor, backup and wikilinks stay unchanged.

## Constraints / security warning

- The Worker returns 503 unless a future environment binding `PAE05_P22_SYNTHETIC_SESSION_KEY` is set. Its name is in source; **no secret is created, committed or requested here**. Further provisioning requires owner approval.
- The 10-minute HMAC guest cookie is **not owner authentication**. Anybody on a hypothetical deployed test origin can get one. It can only authorize fixed public invented notes.
- HTTPS API, same-origin POST Origin/Fetch-Site, explicit demo header, Secure/HttpOnly/SameSite=Strict cookie, no-store JSON, same-origin CSP. No CORS or sensitive client secrets.
- Logout is browser cookie cleanup, **not server-side token revocation**. A stolen stateless cookie may remain valid until expiry: unsuitable for Vault, user files, or confidential data.
- No Dropbox, iCloud, Gateway S5 writer/journal, AI, production auth, real Vault, medical data, billing, cloud credentials, Cloudflare account edits or live deployment.

## Before any future deployment (separate approval required)

1. Independent review of pinned source, paths, SHA, changed-file allowlist, and Node tests.
2. Review Cloudflare Free plan/account, exact staging hostname, binding, CSP and worker logs.
3. Confirm static asset placement: manifest/icon references `../icons/` may not resolve in isolated `p16-editor` directory. Do not silently include unrelated root assets.
4. Only after explicit separate authorization, deploy a *new dedicated synthetic TEST origin* and run physical iPhone Mac-OFF read-only acceptance.
5. Existing CP-P22/S5 integration contract remains the sole roadmap: https://github.com/mastyukov-cyber/pae-sandbox/issues/53#issuecomment-7052775961. Do not create a second production Gateway or writer.

**Rollback:** leave the Draft PR unmerged. Deployed v0.5.0 does not change. No deletion required.


## CP-P22 R02 — narrowly scoped staging assets (source only, NOT RUN)

- The ONLY staging assets destination is `cp-p22-worker-staging/.staging-assets/` (ignored by Git). Wrangler points to this generated directory; it **does not** publish the repository root.
- At an independently authorized checkpoint with **Node.js 26**, run once from the repository root: `node cp-p22-worker-staging/prepare-assets.mjs`.
- The prepare script requires **12 exact Git-blob SHA-1 pins**: 9 allowlisted PWA source files and exactly 3 ORIGINAL icon PNGs. It fails before writing if any source differs, and refuses to overwrite a pre-existing staging directory. No automatic cleanup/deletion.
- All copies retain their original bytes **except the staged index.html only**: its Apple-touch link uses the pre-approved original 192px icon, because the exact owner scope allows only 3 icons. The published `p16-editor/index.html` and `manifest.webmanifest` are NOT edited.
- The staged document and manifest are served at the staging origin root. Their original `../icons/...png` paths resolve to `/icons/...png`, which is now inside the staged asset root. Only the derived Apple-touch HTML link changes.
- The staging script creates files ONLY under the ignored `.staging-assets/` directory, writes with `wx`, verifies its write readback, and does not deploy Worker, invoke wrangler/CI, create secrets, touch Dropbox, change Vault, or run the 14 Node tests.
- This is packaging SOURCE_READY only. **Actual Node26 packaging run, Cloudflare binding/configuration, iPhone HTTPS, Security Gate and release remain NOT RUN / NO-GO.** Publication requires separate owner approval.
