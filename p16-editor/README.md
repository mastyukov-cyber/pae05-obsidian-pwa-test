# PAE-05 CP-P19 — iPhone synthetic local backup pilot · TEST v0.4.0

Source: exact CP-P17 ZIP SHA256 33d64dbca58714decd3af29947805826747dfaf23da6b625431bd838a808bf65.

**NOT PUBLISHED.** Root CP-P15 and current `/p16-editor/` TEST v0.3.0 are unchanged.

Adds only `backup-tools.js` plus minimal Settings controls / version metadata. Existing `mock-store.js` and `app.css` are byte-identical to CP-P17.

**Synthetic-only, no personal data.** User-initiated export of IndexedDB committed records to unencrypted JSON, iOS Share Sheet if available, browser download fallback. No automatic upload or proof of completed Save to Files. Restore explicitly confirmed, only to database without persisted custom records, atomic readwrite transaction; reject file >1 MiB, >100 notes, malformed, duplicate IDs, invalid/unsorted history. No network (`connect-src 'none'`), no Dropbox, no real Gateway, no iPad flow. No live Vault read/write.

Backups are not encrypted; Safari may evict IndexedDB. Do not treat export as a successful backup until physical iPhone Files readback. iPhone share/file-picker runtime NOT RUN.
