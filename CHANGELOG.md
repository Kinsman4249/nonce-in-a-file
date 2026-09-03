# Changelog

All notable changes to this project are documented in this file.

The format follows [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- Planned (not yet built): email integrations - an Outlook (Microsoft 365) Office.js add-in ("Protect attachments" task-pane that runs the builder logic client-side, swaps the attachment for the self-decrypting .html, and stamps an internet header such as `X-NonceInAFile-V`, wired to `OnMessageSend` auto-protect and `OnMessageDecrypt` for add-in-equipped recipients), a Gmail path (Chrome/Edge extension content-script button or a Google Workspace add-on via Apps Script), and local auto-protect heuristics that offer to protect before send when an attachment filename looks sensitive (confidential, salary, ssn, pan, draft). Deciding "attachment vs hosted link" requires the cloud-infra bucket.
- Planned (not yet built), cloud-infra roadmap: recovery-key escrow and emergency access (needs accounts, server key management, storage); hosted share links (a site-side counter Worker plus Pages-hosted outputs with expiry/revocation, max-open / burn-after-read, manual burn, download receipts, email notifications); email delivery of unlock links with read receipts and audit logs; one-time unlock codes over email/SMS with no password out of band; server-side rate limiting and abuse controls, download counting, optional geofencing and a WebAuthn bot-shield on the hosted unlock page; and accounts with cross-device keyring sync.
- Planned (not yet built): an optional, off-by-default ad-supported build mode. When enabled at build time it adds a distinctly styled "Sponsor" region; ads never appear in decrypted content, the mode requires an external network tag so it must stay opt-in and be documented in `PRIVACY.md`, and it needs an ad-slot and provider decision before any implementation.

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
- Planned (not yet built): an auto-protect workflow - like SafeGuard's Outlook add-in that auto-detects external attachments and offers to password-protect them - as a natural integration for a Gmail / Outlook Online production build, so a sender never ships an unencrypted attachment by accident.
- Planned (not yet built): a multi-language UI (English plus German/Spanish/French for the builder and generated files), a plaintext SHA-256 fingerprint shown on the unlock page, a printable handout, browser "Send via Web Share" for the generated file, and an optional CLI wrapper artifact.
- Planned (not yet built), cloud-infra roadmap: Outlook (Microsoft 365) Office.js and Gmail integrations, hosted share links with expiry/revocation and burn-after-read, recovery-key escrow and emergency access, unlock links via email or SMS, access and read-receipt logging, and accounts with cross-device keyring sync.
- Planned (not yet built): an optional, off-by-default ad-supported build mode. When enabled at build time it adds a distinctly styled sponsor region that requires an external network tag, so it is never on by default and is documented in `PRIVACY.md` as the one case where a protected page can make a background request.

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

## [2.0.0] - 2026-08-05

### Added

- Added `.github/workflows/lint-ascii.yml`, a CI workflow that scans every tracked markdown file for em dashes, smart quotes, and emoji on push, pull request, and manual dispatch, and fails the build if any are found. It ships to every downstream repo scaffolded from this template the same way `release.yml` does, and is documented in `_template/CLAUDE.md` alongside the release workflow section.
- Added `.gitattributes`, marking `_template/`, `.github/`, and `.gitattributes` itself as `export-ignore` so `git archive` (and by extension the release workflow) leaves template-only scaffolding and CI configuration out of the source `.tar.gz`/`.zip` attached to a release.
- Added a "prepare" job to the release workflow that stamps release metadata into the tagged commit before the build and publish jobs run. When a `LICENSE` file with a `Change Date:` line is present (Business Source License 1.1), it rolls the date forward to four years out, bumps the copyright year, commits the change, and force-moves the tag onto the amended commit so the stamped values ship inside the release archive; repos without a BSL license skip the step silently. The job also supports optionally stamping a version constant into a configured file and verifies the tag points at the default branch tip before amending anything.
- Added `_template/CLAUDE.md`, `_template/PROJECT_CLAUDE.md`, and `_template/README.md`: a maintenance guide for the template library itself, an optional starter `CLAUDE.md` a downstream project can rename and keep, and a full index of the library's layout and docs.
- Added 15 topic-specific reference docs under `_template/docs/` (`new-project`, `vscode-setup`, `troubleshooting`, `release-workflow`, `release-languages`, `release-hardening`, `versioning`, `changelog-format`, and seven git-related topics covering setup, daily flow, PRs, merging, tags/releases, recovery, and aliases), each kept to roughly 120 lines, replacing the handful of large reference files that previously lived at the repo root.

### Changed

- Reorganized the repository into a `_template/` split: the root now holds only what a real project keeps (README stub, `CHANGELOG.md` stub, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, issue/PR templates, `.gitignore`, `.gitattributes`, and the single `release.yml`), while everything specific to maintaining this template library moved under `_template/`. Starting a real project from this template is now "delete `_template/`" and nothing else.
- Consolidated two near-duplicate release workflows into a single `.github/workflows/release.yml`, rebased on the more evolved of the two, with a default single-OS matrix, an always-on source bundle step, and per-language build blocks kept commented out and additive rather than mutually exclusive.
- Rewrote the root `README.md` as a fill-in-the-placeholders project stub (install, usage, configuration, development, releases, license, community sections) followed by a deletable template-index section that links out to every doc now under `_template/`, replacing the previous README that was only a templates index.
- Replaced the old round-based numbered changelog format with Keep a Changelog 1.1.0 across `CHANGELOG.md`, `_template/CHANGELOG.md`, `_template/docs/changelog-format.md`, `CONTRIBUTING.md`, `.github/PULL_REQUEST_TEMPLATE.md`, and `_template/docs/git-tags-releases.md`.

### Removed

- Deleted `.github/workflow-templates/`, since GitHub only surfaces workflow templates from an organization's public `.github` repository and this repo is a personal, private one, so the picker never showed them.
- Deleted `GIT_GITHUB_CHEATSHEET.md`, `VSCODE_QUICKSTART.md`, `RELEASE_TEMPLATE_README.md`, and `CHANGELOG_TEMPLATE.md` once their content had fully landed in `_template/docs/`.

### Fixed

- Fixed release archive filenames for this repository. `github.event.repository.name` resolves to `.github-private`; used verbatim, the archive filename became a dotfile, which `ls -l` does not list and `actions/upload-artifact`'s `dist/**` glob does not match by default, so the build step silently produced no uploadable artifacts. The workflow now strips a leading dot before building the archive name and lists build output with `ls -la` so this class of failure is visible next time.
