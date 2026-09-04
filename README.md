# nonce-in-a-file

Client-side file encryption that produces a downloadable, self-decrypting HTML
document. Run the builder in your browser, pick a file and a password, and it
returns a single self-contained HTML file that can be hosted or sent directly:
a visitor enters the password and the page decrypts and downloads the original
file to their device. Everything happens locally - nothing is ever uploaded.

## What this repository contains

Two separate static, serverless artifacts:

- `builder/` - the file owner's tool, a multi-file static app with no build
  step and no dependencies. `builder/index.html` holds the markup, styles, and
  the deploy-time config; the logic lives in ordered classic `<script>` modules
  under `builder/js/` (helpers, theme, envelope, the embedded crypto bundles,
  crypto, output, and one file per UI card). Lets you pick a file (or a pasted
  note), set a password or add a public-key recipient, configure branding
  (logo, colors, headings, link buttons, custom CSS), and generate one output
  file. This directory is the only artifact deployed by CI.
- The generated output files - a single self-contained HTML file per protected
  document. Each contains decrypt-and-download logic only; there is no code
  path that can encrypt new content or produce another protected file.

Both are pure static HTML/CSS/JS. No backend, no API routes, no database, no
Cloudflare Worker, and no paid Cloudflare feature is required. The builder
deploys to Cloudflare Pages; generated output files also work when simply
double-clicked from local disk.

## How it works (security model)

- Key derivation: Argon2id by default (3 passes, 64 MiB, 1 lane - a memory-hard
  KDF that resists the GPU/ASIC offline-cracking that PBKDF2 cannot). Argon2id
  runs in the browser via the vetted, offline-embedded
  [argon2-browser](https://www.npmjs.com/package/argon2-browser) WASM bundle,
  so generated files need no network. A labeled PBKDF2-HMAC-SHA256 (600,000
  iterations) mode is retained for FIPS/compliance requirements; both derive
  64 bytes per recipient.
- Crypto agility: every password recipient records the exact KDF and its
  parameters (`t`/`m`/`p` for Argon2id, `iters`/`hash` for PBKDF2) in the
  payload header, and the embedded decryptor reads those values rather than
  assuming a hardcoded scheme. Raising the work factor or switching KDF later
never breaks previously generated files. Files carry a format version
   (`"v": 4`); multi-file bundles use v4, while a single-file build keeps the
   v3-style encrypted envelope so existing files and recipients open unchanged.
- Key commitment: each wrapped copy of the data key ships with a commitment
  tag (SHA-256 of the recipient's commit key + the wrapped key). A recipient
  only proceeds if the tag they recompute from their own key matches, which
  defeats the AES-GCM partition oracle when a file has several recipients
  (the ECDH public-key path derives the same wrap+commit keys from an HKDF
  expansion of the shared secret).
- Recipients: a protected file can carry a key ring of several recipients,
  each an independently wrapped copy of the data key under its own secret.
  Recipient one is always the primary password; further recipients are extra
  passwords or ECDH P-256 public keys, so any recipient in the ring can open
  the same file. The key ring is capped at 50 entries and identical password
  recipients are deduplicated so Argon2id runs once per distinct secret.
- Optional sender authenticity: the builder can sign the ciphertext with an
  ECDSA P-256 key (one you provide, or generated per build). The signature
  proves the file has not been altered since signing and also covers the IV,
  so a corrupted IV reads as a signature failure rather than a silent one.
  But because the signer's public key ships inside the same file, a signature
  that verifies does NOT by itself prove who sent it - anyone can re-sign
  with their own key. So the generated file does not show a green "Signed and
  verified" badge on its own: it shows an amber "integrity OK" notice until
  the recipient confirms the file's 8-byte key fingerprint **out-of-band**
  (e.g. chat, phone, a pre-shared key page) and ticks a confirmation box. The
  sender must communicate that fingerprint through a channel separate from
  the file. This is optional and independent of the always-on Learn-more link.
- Encryption: AES-256-GCM (authenticated encryption, so tampering is detected)
  with a fresh random 12-byte nonce per file.
- Compression: plaintext is gzip-compressed first using the browser's native
  Compression Streams API, then encrypted. Truly incompressible input (like
  already-compressed media) is stored uncompressed automatically. After
  compression the encrypted envelope is padded to a 4 KiB bucket with random
  bytes, so the ciphertext length reveals only a coarse size range, never
  exactly how compressible the file was.
- All cryptography uses the browser's native Web Crypto API plus a single
  vendored Argon2id WASM engine. No custom cipher or KDF code.
- The password is used only in the visitor's browser to derive the key. It is
  never stored or embedded. There is no recovery mechanism, so the owner must
  keep a copy of any password they use.
- Filenames and MIME types are private too: they are encrypted alongside the
  document inside the payload. A generated file reveals nothing about what the
  document is called (e.g. `Layoffs_Draft_Q3.docx`) until the password is
  entered.
- Custom CSS is sanitized before it is inlined. External references are stripped
  so the output keeps working offline, and every `<` character is removed so an
  uploaded stylesheet cannot close the built-in style block and inject markup or
  script into the generated file.
- A build is self-verified before download: the builder re-derives each
  recipient's key and decrypts the ciphertext with the same primitives the
  decryptor uses, and aborts if the plaintext does not come back intact. The
  generated decryptor also hard-caps attacker-controlled KDF parameters,
  distinguishes a corrupted file from a wrong password, and signs the IV
  together with the ciphertext.

Every generated file carries two separate destinations:

- A fixed footer of three links - "Legal", "Privacy", and "Learn more" - is
  included in every output file and cannot be turned off or overridden by any
  user input or upload. Their destinations are hardcoded in `builder/index.html`
  (`LEGAL_URL`/`PRIVACY_URL`/`LEARN_MORE_URL`) and may be overridden at deploy
  time from the matching GitHub Actions repository **variables**. This fixed
  set is the single origin a recipient can check to confirm a file really came
  from this project, and a fork can point it at its own project page. To change
  any of the three destinations, edit the corresponding variable; no source
  change or commit is required.
- A visible "Built by the nonce-in-a-file builder" line at the bottom of every
  output. When the builder page is served over http(s) (for example from
  Cloudflare Pages), this line links to that deployment's origin, so a
  recipient can see which infrastructure produced the file. When the builder is
  opened from local disk (file://), the same line renders as plain text,
  noting the file was built by a local copy. This provenance is auto-detected
  at build time (`location.origin`) and is separate from the fixed footer links.

The top-left banner mark defaults to a grey padlock. If you keep a logo on your
own site or CDN, set the optional `LOGO_URL` GitHub Actions **variable** to its
URL and every generated file will use it instead of the padlock - no image is
committed to the repo. The deploy workflow downloads the logo in the runner and
injects it as a fully self-contained data URI, so the builder just embeds it
into each file (an SVG is embedded as inline text, any other image as base64);
the built file never references the remote URL. The logo is also used as the
generated page's favicon (as an embedded data URI), so no separate icon file
travels with the output. Because the logo is fetched server-side at deploy time,
the host does not need to allow cross-origin fetches - any publicly reachable
logo URL works; if the download fails during deploy, the build keeps the
padlock. Leave `LOGO_URL` unset (or empty) to keep the padlock.

## Usage

### Creating a protected file

1. Open the builder page in a browser.
2. Choose one or more files to protect (or drop them onto the File card) and
   set a password, confirming it exactly. A "Generate strong password" button
   fills a strong password and its confirmation for you. The page requires at
   least 12 characters, an estimated ~64 bits of entropy, and rejects
   well-known passwords; there is no way to recover it. You can also switch to
   secret/note mode to protect a pasted message instead of a file.
3. Password recipients are derived with Argon2id by default. Only if you need a
   FIPS-listed KDF, and have no password of your own to derive against, switch
   the "Key derivation" selector on the recipients card to PBKDF2 mode. Saved
   public keys from the optional local address book can be added as recipients
   without pasting them again.
4. Adjust branding as needed. The optional cards (Recipients, Signing,
   Branding, Links, Custom CSS) start collapsed; click a card header to expand
   it. Every element (logo, banner, heading, description, lock icon, the
   "Share this file" button and its QR code, custom CSS) has an independent
   on/off toggle applied at generation time. Turning off "Share / QR code"
   omits the share button, the QR code, and the embedded QR encoder entirely,
   so the built file carries no share/QR footprint. The Legal, Privacy, and
   Learn more buttons are always included and cannot be turned off.
5. Click "Build protected file". The page downloads a `.html` file that,
   when the correct password is entered, downloads your original file - or, for
   a multi-file bundle, shows a file list with per-file download buttons and a
   "Download all" action. During a build an indeterminate progress bar with an
   elapsed-seconds readout is shown, since compression and Argon2id can take a
   moment on large files.

#### Signing, and proving who sent a file

Optional sender authenticity lives on the "Signing" card. To use it:

1. Tick "Sign this file". Either paste your ECDSA P-256 private key
   (base64 or PEM) or click "Generate a signing private key". Leave the box
   blank to auto-generate a one-off key, but **reuse the same key across
   builds** so recipients recognise you by a stable fingerprint. The builder
   rejects a private key that is not a usable ECDSA P-256 key instead of
   silently continuing.
2. Set a signer display name (shows to recipients as the stated sender).
   Remember this label is not authenticated by itself - see below.
3. Build, then note the 8-byte **key fingerprint** the builder reports after
   the build. That fingerprint is what lets a recipient actually confirm you
   are the sender.

The signature only proves the file was not altered since signing. Because the
signer's public key ships inside the same file, verifying it does **not** prove
who sent it. A recipient only sees a green "Signed and verified" badge after
they confirm that fingerprint **out-of-band** - through a channel separate from
the file itself (a chat message, a phone call, a pre-shared key page) - and tick
a confirmation box. Send the fingerprint by one of those channels; never rely on
the file to vouch for itself. If you do not share the fingerprint, recipients
will see an amber "integrity OK - sender not yet confirmed" notice instead of a
green badge, which is the safe default.

### Sending or hosting a protected file

Share the generated `.html` however you like - file attachment, WeTransfer,
or static hosting such as Cloudflare Pages. The page works fully offline once
loaded; the only network requests are the legal/privacy/learn-more links,
which the visitor may or may not click.

When an output file is opened over a hosted `http(s)` URL (not from local
disk), it shows a collapsed "Share this file" toggle beneath the lock. Opening
it renders a QR code of that page's URL, generated fully offline and embedded
inline as SVG (no network, no external service), so a phone can scan it to
open the file. The share toggle is hidden entirely for `file://` views, where
there is no shareable URL. The QR encodes `location.href` as-is, so never host
a file at a URL that carries a token, query parameter, or other secret - the
QR exposes whatever is in the address bar.

When a signed file is opened, recipients see a signature notice beneath the
lock. It is amber unless they confirm the sender: it reads "integrity OK" and
shows the file's 8-byte key fingerprint, with a "I verified this key fingerprint
with the sender out-of-band" tick box. Only after the recipient ticks it does
the notice turn green "Signed and verified". Recipients should treat an amber
notice as the normal, safe state and only tick the box after verifying the
fingerprint through a channel independent of the file - never because the file
looks self-consistent.

Generated files reconstruct a download in-browser (JavaScript Blob + download
attribute). This matches MITRE ATT&CK T1027.006 and will be flagged/quarantined
by AV, EDR, and mail filters. For managed environments, prefer a hosted
decryptor page plus a separate encrypted blob.

Generated output files are produced locally and uploaded by hand whenever a
new protected document is needed. They do not need automation, so they are
never deployed by CI.

## Deployment

### The builder (automated)

The builder is deployed to Cloudflare Pages by
`.github/workflows/deploy-builder.yml` on every push to `main`, using
Cloudflare's `wrangler-action`. Output files live in a separate Pages project;
this workflow never touches them and vice versa. The deploy workflow must fail
if `LEARN_MORE_URL` is unset; the committed `PROJECT_OWNER` fallback is a
placeholder and must never ship.

#### Before the first deploy

1. Set the fixed "Learn more" origin as a GitHub Actions **variable**:
   - Repository > Settings > Secrets and variables > Actions > Variables >
     New repository variable.
   - Name: `LEARN_MORE_URL`, value: this project's canonical repository URL.
   - This is a variable, not a secret - it is not sensitive, and a variable
     makes it trivial to change later without editing or committing source.
   - The deploy workflow injects it into the deployed builder on every push to
     `main`. If the variable is missing, the deploy aborts rather than ship a
     placeholder destination. Set it before the first push.
   - Optional: add another variable named `LOGO_URL` (a URL) to replace the
     default grey padlock banner mark with your hosted logo. It is applied
     only when set; the deploy never fails over it, and no logo file is
     committed to the repo. The logo also becomes the generated page's
     favicon.
   - Optional: add another variable named `BUILDER_TITLE` (text) to change
     the builder page's browser-tab title. Applied only when set; the deploy
     never fails over it, and the committed default title is used otherwise.
   - Optional: add variables named `LEGAL_URL` and `PRIVACY_URL` (URLs) to
     point the fixed Legal and Privacy footer buttons at your own
     LICENSE/PRIVACY pages. They are applied only when set; when unset, the
     committed defaults (this project's own LICENSE and PRIVACY.md on GitHub)
     are used unchanged, and the deploy never fails over them.

2. Create a Cloudflare API token (a secret, unlike the variable above) with the
   least privilege needed:
   - In the Cloudflare dashboard go to My Profile > API Tokens > Create Token,
     choose "Custom token".
   - Permissions: Account > Cloudflare Pages > Edit.
   - Do not grant anything broader. The token scope is never narrower than
     the deployment needs.

3. Find your account ID: Cloudflare dashboard, right sidebar or the Account
   Home; it is a 32-character hex string.

4. Add the two values as GitHub Actions repository secrets:
   - Repository > Settings > Secrets and variables > Actions > New repository
     secret.
   - `CLOUDFLARE_API_TOKEN` - the token from step 2.
   - `CLOUDFLARE_ACCOUNT_ID` - the account ID from step 3.
   - Never commit these values to the repository.

Once the secrets exist, any push to `main` deploys `builder/` to the
`nonce-in-a-file-builder` Pages project. The Pages project must already exist
or be created for the first wrangler deploy to target.

### The output files (manual)

Upload generated `.html` files to your chosen Pages project (or any static
host) by hand whenever you publish a new protected document. Because they are
static and infrequently changed, there is nothing to automate.

## Development

The artifacts are plain HTML/CSS/JS with no build step and no bundler. The
builder is split into ordered classic `<script>` modules under `builder/js/`
loaded from `builder/index.html` (still `file://`-safe, so no ES modules). To
run the builder locally, serve `builder/` (`python3 -m http.server 8000` in the
repo root and open http://localhost:8000/builder/) or just open
`builder/index.html`.

See [CONTRIBUTING.md](./CONTRIBUTING.md) for the contribution workflow.

## Releases

Push a tag matching `vX.Y.Z` to `main`
(`git tag -a vX.Y.Z -m "Release vX.Y.Z" && git push origin vX.Y.Z`). CI builds
and publishes the GitHub Release automatically and, because this repo uses the
Business Source License, rolls the Change Date and copyright year forward in
the tagged commit. This is independent of the builder deployment workflow,
which runs on every push to `main`, not on tags.

## License

Licensed under the Business Source License 1.1. See [LICENSE](LICENSE). Before
the Change Date, the work is free to use, modify, and redistribute except as a
paid, hosted service to third parties; after the Change Date it becomes
GPL-3.0-only.

## Community

- [CONTRIBUTING.md](./CONTRIBUTING.md) - how to report bugs, propose features,
  and submit changes.
- [SECURITY.md](./SECURITY.md) - how to report a vulnerability.
- [PRIVACY.md](./PRIVACY.md) - what data the project does and does not collect.
- [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md) - the standards this project
  holds contributors to.
