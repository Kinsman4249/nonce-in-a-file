# nonce-in-a-file

Client-side file encryption that produces a downloadable, self-decrypting HTML
document. Run the builder in your browser, pick a file and a password, and it
returns a single self-contained HTML file that can be hosted or sent directly:
a visitor enters the password and the page decrypts and downloads the original
file to their device. Everything happens locally - nothing is ever uploaded.

## What this repository contains

Two separate static, serverless artifacts:

- `builder/index.html` - the file owner's tool. Lets you pick a file, set a
  password, configure branding (logo, colors, headings, link buttons, custom
  CSS), and generate one output file. This is the only bundle deployed by CI.
- The generated output files - a single self-contained HTML file per protected
  document. Each contains decrypt-and-download logic only; there is no code
  path that can encrypt new content or produce another protected file.

Both are pure static HTML/CSS/JS. No backend, no API routes, no database, no
Cloudflare Worker, and no paid Cloudflare feature is required. The builder
deploys to Cloudflare Pages; generated output files also work when simply
double-clicked from local disk.

## How it works (security model)

- Key derivation: PBKDF2-HMAC-SHA256 with 600,000 iterations (the iteration
  count OWASP's Password Storage Cheat Sheet recommends) and a fresh random
  16-byte salt per file.
- Encryption: AES-256-GCM (authenticated encryption, so tampering is detected)
  with a fresh random 12-byte nonce per file.
- Compression: plaintext is gzip-compressed first using the browser's native
  Compression Streams API, then encrypted. Truly incompressible input (like
  already-compressed media) is stored uncompressed automatically.
- All cryptography uses the browser's native Web Crypto API. No bundled crypto
  libraries, no custom cipher or KDF code.
- The password is used only in the visitor's browser to derive the key. It is
  never stored or embedded. There is no recovery mechanism, so the owner must
  keep a copy of any password they use.

The "Learn more" button is included in every output file and cannot be turned
off. Its destination is fixed in the builder (see `LEARN_MORE_URL` in
`builder/index.html`) and injected at deploy time from the GitHub Actions
repository **variable** named `LEARN_MORE_URL`; it can never be overridden by
any user input or upload - this is the single origin a recipient can check to
confirm a file really came from this project. To change that origin, edit the
`LEARN_MORE_URL` variable; no source change or commit is required.

The top-left banner mark defaults to a grey padlock. If you keep a logo on your
own site or CDN, set the optional `LOGO_URL` GitHub Actions **variable** to its
URL and every generated file will use it instead of the padlock - no image is
committed to the repo. Leave `LOGO_URL` unset (or empty) to keep the padlock.

## Usage

### Creating a protected file

1. Open the builder page in a browser.
2. Choose the file to protect and set a password (the page recommends at least
   8 characters and there is no way to recover it).
3. Adjust branding as needed. Every element (logo, banner, heading,
   description, lock icon, legal/privacy buttons, custom CSS) has an
   independent on/off toggle applied at generation time. The Learn more button
   is always included and cannot be turned off.
4. Click "Build protected file". The page downloads a `.html` file that
   decrypts and downloads your original when the correct password is entered.

### Sending or hosting a protected file

Share the generated `.html` however you like - file attachment, WeTransfer,
or static hosting such as Cloudflare Pages. The page works fully offline once
loaded; the only network requests are the legal/privacy/learn-more links,
which the visitor may or may not click.

Generated output files are produced locally and uploaded by hand whenever a
new protected document is needed. They do not need automation, so they are
never deployed by CI.

## Deployment

### The builder (automated)

The builder is deployed to Cloudflare Pages by
`.github/workflows/deploy-builder.yml` on every push to `main`, using
Cloudflare's `wrangler-action`. Output files live in a separate Pages project;
this workflow never touches them and vice versa.

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
     committed to the repo.

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

The artifacts are plain HTML/CSS/JS with no build step. To run the builder
locally, serve `builder/` (`python3 -m http.server 8000` in the repo root and
open http://localhost:8000/builder/) or just open `builder/index.html`.

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
Apache License 2.0. Source code is at
<REPO_URL>/blob/main/LICENSE.

## Community

- [CONTRIBUTING.md](./CONTRIBUTING.md) - how to report bugs, propose features,
  and submit changes.
- [SECURITY.md](./SECURITY.md) - how to report a vulnerability.
- [PRIVACY.md](./PRIVACY.md) - what data the project does and does not collect.
- [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md) - the standards this project
  holds contributors to.