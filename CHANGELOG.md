# Changelog

All notable changes to this project are documented in this file.

The format follows [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [1.12.0] - 2026-09-04

### Changed

- All action buttons in the builder, including the mini actions, the recipient
  delete buttons, and the logo and lock-icon file pickers, now use the project's
  signature pink-purple-blue gradient with white, centred text instead of a
  plain bordered style.
- The "Custom button text colour" toggle is gone. The button text colour
  picker is always shown, grouped with the banner gradient and page background
  colour pickers, and the chosen colour (which defaults to the page background)
  is always applied to the unlock button's text in generated files.
- The colour picker row stays five across on normal screens and only wraps to
  one per line at very low resolutions.

### Fixed

- The logo and lock-icon file-upload buttons no longer render their label in
  dark grey; their text is now white.

## [1.11.0] - 2026-09-04

### Added

- The Branding card gains a "Custom button text colour" toggle and a colour
  picker. When the toggle is off, a generated file's unlock-button label
  follows the page's text colour so it stays readable against the chosen
  background; when on, the picked colour is used instead, and the live contrast
  notes in the builder reflect the override.
- The File card's native file picker is replaced with a styled "Choose files"
  button that shows the selected file names, or how many were selected, after a
  selection or a drag and drop.

## [1.10.0] - 2026-09-04

### Changed

- Signed files no longer display the 8-byte key fingerprint on the received
  page. Instead, recipients must type back the fingerprint the sender gave them
  out-of-band, and the badge turns green only when the entered value matches.
  The fingerprint is never rendered in the file, so an intercepted page cannot
  surface a fingerprint for someone to confirm against.
- The Links card in the builder is now hidden entirely, because the legal,
  privacy, and learn-more links are fixed to the deployment and cannot be edited
  in the UI.

## [1.9.1] - 2026-09-04

### Changed

- The builder was refactored from one monolithic `builder/index.html` (2,575
  lines) into a multi-file static app: the deploy-time config stays inline in
  `builder/index.html`, the base64 crypto bundles moved to `builder/js/ar2-b64.js`
  and `builder/js/qr-b64.js`, and the logic is now split into ordered classic
  `<script>` modules under `builder/js/` (one per UI card plus shared core
  modules). No build step, no dependencies, and the Cloudflare Pages deploy is
  unchanged: `test/run.js` was updated for the new file homes and a new
  `test/load-builder.js` asserts the modules load in order without throwing.

## [1.9.0] - 2026-09-04

### Changed

- The Signing card moved below Links and now opens expanded by default (still optional, labelled recommended), and a "Copy signing key" button sits next to the key generate button.
- The post-build key fingerprint is now shown as a clickable value that copies itself to the clipboard on click.

## [1.8.0] - 2026-09-04

### Added

- The builder now shows live WCAG-style contrast recommendations in the Branding card as the banner and page colours are edited, and appends any shortfall to the build-time warnings.
- The generated page's accents, links, button colours, borders, and text are now derived from the banner gradient and the page background (mapped to the chosen palette), each picked for a readable contrast ratio against its background.

### Changed

- The coloured shield logo on generated files is now centred and rendered larger, and its gradient always follows the banner colours instead of a fixed theme.

## [1.7.0] - 2026-09-04

### Changed

- Reworked sender authenticity in signed files: a verified signature is no longer shown as a green "Signed and verified" badge on its own. Signed files now open with an amber "integrity OK" notice and show the file's 8-byte key fingerprint; it turns green only after the recipient confirms that fingerprint with the sender out-of-band and ticks the confirmation box.
- The builder now reports the recipient-visible 8-byte key fingerprint after building a signed file so the sender knows what to communicate out-of-band.
- A signing private key that is not a usable ECDSA P-256 key is now rejected with a targeted error message instead of failing the build generically.
- Updated documentation and the builder signing UI to explain that a verified signature proves integrity, not sender identity, and that the key fingerprint must be shared through a channel separate from the file.
- Added tests covering the signed-file badge states (amber until confirmed, green after confirmation, revert to amber, red for tampered files, hidden for unsigned files).

## [1.6.0] - 2026-09-04

### Added

- A protected written message now decrypts and displays inline in the browser
  inside a scrollable box with a Download button, instead of force-downloading
  a text file.
- The Branding card gains a "Share / QR code" toggle. When turned off, generated
  files omit the "Share this file" button, the QR code, the runtime share logic,
  and the embedded QR encoder entirely.
- The builder now shows a live banner preview at the top of the page that
  reflects the Branding card's gradient colour inputs and its show toggle,
  rendering exactly the banner the protected file will embed.
- The builder page now carries a favicon that stays in sync with the top-left
  logo mark.

### Changed

- The Branding card now defaults to expanded instead of collapsed.

### Fixed

- Generated files mark their three inline scripts (Argon2id, the QR encoder,
  and the decryptor runtime) with `data-cfasync="false"` so Cloudflare Rocket
  Loader leaves them untouched. Rocket Loader was retyping and deferring them,
  and the file's CSP blocked its own loader script, so the decryptor and the
  "Share this file" QR never ran over https.
- Deploy-injected values (`BUILDER_TITLE`, `LOGO_URL`, `LEARN_MORE_URL`,
  `LEGAL_URL`, `PRIVACY_URL`) are now JSON-encoded, so a value containing an
  apostrophe or other quote no longer produces invalid JS that silently kills
  the whole builder script.
- The deploy workflow now downloads `LOGO_URL` in the runner and injects it as
  a self-contained data URI, so the logo renders even when its host sends no
  `Access-Control-Allow-Origin` header; if the download fails, the build keeps
  the default padlock and emits a warning.
- The "Share this file" QR panel now collapses correctly when hidden instead of
  remaining visible.

## [1.4.0] - 2026-09-03

### Added

- Generated files now offer a "Share this file" toggle when opened over a
  hosted `http(s)` URL. Expanding it renders a QR code of that page's URL,
  generated fully offline with an embedded MIT-licensed encoder and drawn as
  inline SVG (no network request, no external service), so a visitor can open
  the file on a phone by scanning it. The share toggle is hidden entirely for
  a `file://` view, which has no shareable URL. The QR encoder was vendored as
  a permissive-MIT bundle (`builder/vendor/qrcode.js`) and is inlined into
  every output as a base64 constant with a pinned SHA-256, mirroring the
  existing Argon2 bundle; `jsqr` (Apache-2.0) was added as a test-only decoder
  and never ships in outputs. See `THIRD_PARTY_NOTICES.md`.
- The Legal and Privacy buttons in every generated file are now fixed and
  always included, exactly like the "Learn more" button, and can no longer be
  toggled or overridden by the builder's user. Their destinations are
  hardcoded in `builder/index.html` (`LEGAL_URL`/`PRIVACY_URL`) and default to
  this project's own LICENSE and PRIVACY pages on GitHub; the deploy workflow
  can override them via optional `LEGAL_URL`/`PRIVACY_URL` GitHub Actions
  variables (applied only when set, never fails the deploy). The builder's
  Links card now shows these fixed destinations instead of editable fields,
  and the Legal and Privacy cards are never turned off in the UI.

### Changed

- The optional builder cards (Recipients, Signing, Branding, Links, Custom
  CSS) now render with Branding and Links above Recipients and Signing, so the
  frequently-used branding controls sit closer to the required File section.
- The collapsible-card toggle is now bound directly to each card header
  (instead of a single delegated document listener), so clicking any header
  reliably expands or collapses its own card.

## [1.3.0] - 2026-09-03

### Added

- Every generated file now shows a visible, clickable "Built by the nonce-in-a-file builder" provenance line. When the builder page is served over http(s), the line links to that deployment's origin, auto-detected at build time from `location.origin`; a local file:// copy renders the same line as plain text because there is no hosting origin. This provenance is separate from the always-on Learn-more link.
- Generated files now ship the top-left logo (remote `LOGO_URL` or embedded default) as an inline data favicon, so no separate icon file travels with the output. The inline data favicon also stops Firefox from auto-fetching `/favicon.ico` from the origin, which would otherwise log an `img-src data:` CSP violation.
- The remote `LOGO_URL` logo is now fetched at build time and embedded into every generated file as a data URI (SVG as inline text, other images as base64), so generated files stay fully self-contained and render the logo under their `img-src data:` CSP instead of a blocked remote request. If the logo server does not allow cross-origin fetch, the build warns and falls back to the padlock mark.
- Added an optional `BUILDER_TITLE` GitHub Actions repository variable that changes the builder page's browser-tab title at deploy time; the committed default title is used when the variable is unset. It works like `LEARN_MORE_URL`/`LOGO_URL` (staged in `builder-dist`, never aborts the deploy).
- The optional builder cards (Recipients, Signing, Branding, Links, Custom CSS) are now collapsible and start collapsed, so the required File section stays front and centre; clicking a card header expands or collapses it.
- Added a live match check for the confirm-password field that tints the box green when it matches the password and red with a message when it does not, so a recipient typo is caught before the file is built.

### Changed

- The ECDSA signature now binds the signer label into the signed message and includes it on verify, so an edited label reads as an unverified signature instead of a spoofed badge.
- The signed badge now shows the signer's public-key fingerprint (SHA-256, first 8 bytes) so a recipient can confirm it with the sender out of band, and an unverified signature is noted as non-fatal but its contents untrusted.
- The decryptor now surfaces an Argon2-engine load failure explicitly instead of a wrong-password message, and the builder warns when the KDF downgrades to PBKDF2 for a session.

### Fixed

- The inline Argon2 bundle in generated files is now verified against a pinned SHA-256 before it is loaded, so a corrupted or tampered bundle is refused rather than executed.
- Generated files now embed a Content-Security-Policy meta tag (`default-src 'none'`, `img-src data:`, `script-src 'unsafe-inline' 'wasm-unsafe-eval'`, `connect-src 'none'`, `base-uri 'none'`, `form-action 'none'`).
- Added a 100 MiB total-size guard to the builder so very large selections cannot crash the browser tab.
- The signature fingerprint in generated files is now deterministic: the key digest and the signature verify run in a single `Promise.all` chain, so the "Signed and verified" badge can never render with an empty key fingerprint when the digest resolves after the verification.

## [1.2.0] - 2026-09-03

### Added

- Added an optional public-key mode: encrypt to a recipient's ECDH P-256 public key instead of a password, so a sender never transmits the secret out of band. The builder ships an ephemeral key pair per recipient and wraps the data key under the shared secret; the built file's unlock page accepts a private key to recover it.
- Added a recipients / key ring: one encrypted file can carry a per-recipient wrapped copy of the data key, mixing passwords and public keys, so any recipient in the ring can open the same file. The primary password is always recipient 1; extra passwords or public keys are added in a dedicated builder card.
- Added optional sender authenticity: the builder can sign the ciphertext with an ECDSA P-256 key (provided, or generated per build). The built file embeds the signature and the signer's public key and shows a verified "Signed and verified" badge on load, instead of treating the Learn-more link as provenance. The Learn-more link stays always-on alongside it.
- Encrypts the original filename and MIME type inside the payload alongside the document instead of shipping them as cleartext metadata, so a generated file no longer reveals what the document is called (e.g. `Layoffs_Draft_Q3.docx`) to anyone holding it without the password.
- Sanitizes uploaded custom CSS before inlining: every `<` character is removed (CSS has no use for it), so an uploaded stylesheet can no longer close the `<style>` tag early and inject markup or script into a generated file. External requests (`@import`, `url(http...)`) were already stripped for offline use.
- Validates footer link URLs (Legal, Privacy, and the fixed Learn-more link) at build time: they must be `http://` or `https://` with no spaces, quotes, or angle brackets, so a `javascript:` value can never reach an `href`.
- Enforces a stronger password policy: at least 12 characters, an estimated-entropy floor of ~64 bits, and rejection of a built-in list of well-known passwords. The builder shows a live strength estimate under the password field.
- Added a random strong-password generator (drawn with `crypto.getRandomValues` from a mixed 20-character pool, roughly 120 bits) with a copy-to-clipboard button; it pre-fills both the password and its confirmation.
- Added drag and drop: dropping files onto the File card selects them.
- Added a multi-file bundle mode: select several files to produce one protected file that, once unlocked, renders a file list with a per-file download button plus a "Download all" action. Bundles raise the format version to 4 and carry the manifest encrypted inside the envelope; a single-file build still uses the v3-style header so existing recipients open it unchanged.
- Added a secret/note mode: protect a pasted written message instead of choosing a file; it is bundled as a `text/plain` document named `note.txt`.
- Added an opt-in local ECDH address book kept only in the browser: save, import, and export public keys and add a saved public key as a recipient. It stores public material only and never leaves the device except through an explicit export download.
- Added progress feedback during a build: an indeterminate bar with an elapsed-seconds readout and a note that compression and Argon2id can take a moment on large files.

### Changed

- Moved password key derivation from PBKDF2-HMAC-SHA256 to Argon2id by default (3 passes, 64 MiB, 1 lane), which resists GPU/ASIC offline cracking far better because it is memory-hard. Argon2id runs in the browser via the vetted, self-contained argon2-browser WASM bundle, embedded inline in every generated file so recipients still need no network.
- Retained PBKDF2-HMAC-SHA256 (600,000 iterations) as a labeled FIPS/compat mode selectable in the recipient card, for use cases that require a FIPS-listed KDF.
- Made the payload header crypto-agile: each password recipient now stores its KDF and exact parameters (`t`/`m`/`p` for Argon2id, `iters`/`hash` for PBKDF2), and the embedded decryptor reads those values instead of assuming a hardcoded iteration count. Raising the work factor or switching KDF later no longer silently breaks previously generated files. Payload format version bumped to 3.
- Added a key-commitment step to every recipient wrap: each wrapped key ships a SHA-256 commitment over the recipient's commit key and the wrapped bytes, verified constant-time before unwrap. This closes the partition-oracle / key-commitment gap that matters now that one file can have several recipients (passwords and ECDH).
- Padded the compressed plaintext envelope to 4 KiB buckets with random bytes before encryption, so ciphertext length reveals only a coarse size range rather than exactly how compressible the file was.
- The Business Source License's Change License clause now converts to GPL-3.0-only after the Change Date instead of Apache License 2.0.
- The builder now round-trips every build through the decrypt-side primitives before offering a download and aborts with an explicit "internal verification failed" message if any recipient cannot recover the plaintext, so a regression in envelope padding, the compression flag, wrap layout, or the format is caught at authoring time rather than in the recipient's browser.
- The embedded decryptor now distinguishes a corrupted or modified file from a wrong secret: when a recipient's key-commitment matches but the content decrypt fails, it reports that the file appears corrupted or was modified instead of blaming the password or private key.
- The embedded decryptor now hard-caps attacker-controllable KDF parameters (Argon2id time <= 16, memory <= 256 MiB, parallelism <= 4; PBKDF2 iterations <= 8,000,000 with the hash pinned to SHA-256) and requires the 64-byte wrap/commit hashLen, so a crafted file can no longer freeze the tab or corrupt the commitment key; out-of-range recipient entries are skipped.
- The optional ECDSA signature now covers the IV concatenated with the ciphertext rather than the ciphertext alone, so a corrupted IV reads as a signature failure instead of a bogus "verified" badge followed by a failed decrypt.
- Added a password confirmation field, applied the same entropy and common-list policy to extra password recipients (plus a 1024-character cap for every password), deduplicated identical password recipients so Argon2id is never run twice on the same secret, and capped the recipient ring at 50 entries.
- Importing an ECDH public key now validates the base64 transport and the key shape up front and reports a readable reason (not valid base64, wrong key length, not a P-256 public key) instead of a bare Web Crypto error.
- The inline Argon2id bundle in generated files now escapes any `</script` into `<\/script`, so a future vendor bundle can never prematurely close the script tag and break an output file.

### Fixed

- Fixed an HTML injection vulnerability (XSS) in generated files: a crafted CSS upload containing `</style><script>...` could close the inline style block early and execute a live script in the recipient's browser before the password was entered.
- Fixed an off-by-one in the 4 KiB envelope bucket padding: when the padding count crossed a digit boundary (10/100/1000), the final envelope could land one byte off a bucket boundary and leak the exact length mod 4096. Padding is now computed to a fixpoint and the builder asserts the total lands exactly on a bucket boundary.

## [1.1.0] - 2026-09-03

### Added

- Added `PRIVACY.md`, documenting that the builder and generated output files collect no data and make no network requests beyond optional footer links.
- Generated files now gzip-compress plaintext before encryption using the browser's standard Compression Streams API, shrinking text-heavy documents. Incompressible input (e.g. already-compressed media) is stored uncompressed automatically.

### Changed

- The "Learn more" button is now always included in every generated output file and cannot be turned off in the builder, so no protected file can omit the link back to the project origin.
- Default footer links in the builder now point at this repository's docs: the Legal button defaults to `LICENSE` and the Privacy button defaults to `PRIVACY.md` instead of `example.com` placeholders.
- The generated-file lock icon now defaults to the coloured lock instead of the grey outline, matching the banner mark.

## [1.0.0] - 2026-09-03

### Added

- Added `builder/index.html`, the client-side protected-file builder. It reads a user file and password, derives a key via PBKDF2-HMAC-SHA256 (600,000 iterations) and encrypts with AES-256-GCM using only the browser's native Web Crypto API, then generates a single self-contained, self-decrypting HTML file for download. Every branding element (logo, banner/colors, heading, description, lock icon, legal/privacy/learn-more buttons, custom CSS) has an independent per-build on/off toggle. Nothing is uploaded at any point.
- Added the generated output-file template inside `builder/index.html` (the decrypt-and-download page Part 2 describes). It contains only decryption logic and an off-line, branding-aware locked screen; there is no encryption code path in the artifact. All parameters (ciphertext, salt, IV, filename, mime type, branded assets, theme, link labels/URLs) are baked in at generation time.
- Added `.github/workflows/deploy-builder.yml`, a Cloudflare Pages CI workflow for the builder using `cloudflare/wrangler-action@v4`, running on every push to `main` instead of on a version tag, authenticated via repository secrets. It is kept separate from `release.yml`.
- Added `LICENSE` (Business Source License 1.1) with a Change Date of 2030-09-03 and a change to Apache License 2.0.
- Rewrote `README.md` into real project documentation: artifact overview, security model, usage, Cloudflare Pages deployment, and plain-step instructions for creating the `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` secrets in GitHub.
