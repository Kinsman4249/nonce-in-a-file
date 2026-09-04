# TODO

Enterprise and mail-integration roadmap for nonce-in-a-file.

This project is deliberately static and serverless: crypto happens in the
recipient's browser, nothing is uploaded, and generated files are
self-contained. Every item below must preserve that model or explicitly
document how it changes it. Items that necessarily require a backend are
marked **[backend]**; everything else should stay client-side.

Legend: `[x]` done, `[ ]` open. Items are grouped by theme, not priority.
Check items off as they land and add a line to `CHANGELOG.md` under
`[Unreleased]` when you finish them.

## Gmail / Outlook integration

- [ ] Audit the mail-delivery blocker: generated files are `.html` with
      Blob download (MITRE ATT&CK T1027.006) and are flagged/quarantined by
      mail filters. Document the recommended hosted-decryptor + encrypted
      blob pattern as the first-class path.
- [ ] Add sharing metadata each generated file can carry: `subject`/`body`
      seed for a Gmail and Outlook compose link, so a sender can open a
      draft from the built page.
- [ ] Add an explicit "explain the attachment pattern to the recipient"
      card in the builder so recipients know to whitelist the sender/host.
- [ ] Consider a stripped "no-JS" receipt page (shows fingerprint + HSA lookups
      only) for environments where macros/script are fully blocked.
- [ ] **[backend]** Optional: document a reference mail bridge (e.g. a GitHub
      Action that attaches the built file to a scheduled send) so evolution:
      prioritize documenting over building by default.

## Chrome / Edge extension

- [ ] Sketch the extension as a thin wrapper over the existing builder logic
      (reuse `builder/index.html`'s encrypt path, Web Crypto + vendored
      Argon2id), so users can build/decrypt a protected file without opening
      the web page.
- [ ] Decide the extension surface: toolbar popup with File picker and
      password, and optionally a context-menu "Encrypt with nonce-in-a-file"
      action on file downloads.
- [ ] Decide sharing of a generated file: popup produces the same
      self-contained `.html` download (keeps the model identical) OR uses the
      hosted-decryptor + blob pattern to sidestep mail/AV filtering.
- [ ] Local-only storage: persist recipients / the ECDH address book in
      `chrome.storage.local`, never sync an address book to the cloud without
      an explicit export (mirror the browser-only address-book promise).
- [ ] Grant [`downloads`](https://developer.chrome.com/docs/extensions/reference/api/downloads)
      permission so the extension can trigger the file download from a
      background/service worker context.
- [ ] Versioned for both Chromium (Chrome) and Edge via the WebExtensions
      API so one codebase ships to both Web Stores.
- [ ] Publish both the Chrome Web Store and Edge Add-ons listings, each
      linking back to this project's bounty/hosting pattern.
- [ ] Add end-to-end tests: page object drives the popup, encrypts a fixture,
      decrypts the output, and asserts byte-for-byte round-trip (reuse the
      existing `test/` engine-level assertions).
- [ ] Host the extension source so it can be built from the repo without a
      separate codebase.

## Single sign-on (SSO)

- [ ] Decide whether SSO is authenticator-only (identity proof, no key
      material) or key-recovery (server-derived key from the SSO session).
      The project has no backend; SSO cannot happen without one. Options:
      - Authenticator mode: SSO adds an optional recipient whose wrap key is
        derived from a server-held secret tied to the SSO session. The server
        never sees the file or the plaintext. **[backend]**
      - SAML/OIDC: define the IdP handshake the server would perform and
        document the required claims.
- [ ] Publish a threat note on why SSO does not weaken the client-side model:
      the server only ever issues a wrapped key for a named recipient.
- [ ] Add OIDC/SAML flow docs and a reference IdP (Entra/Azure AD) config
      example.
- [ ] Add test vectors for deriving a recipient wrap key from an SSO-issued
      token (deterministic, using the stdlib HKDF) so the server and the
      browser produce identical wraps.

## Microsoft Entra (Azure AD) integration

- [ ] Add Entra as a documented OIDC provider for the SSO authenticator mode
      above, including a full tenant-setup walkthrough (app registration,
      scopes, redirect URI, token validation).
- [ ] Add Entra group-based policy hooks: an org policy object stating which
      recipients / fingerprints are allowed to open a given file.
- [ ] Decision needed: does an Entra identity map to an existing local
      address-book entry, or create a new one tied to the OIDC `sub` claim?
- [ ] **[backend]** Document a reference enforcement point
      (Cloudflare Access or a Worker) that fronts a hosted file store and
      applies Entra group policy before serving a blob.

## Key escrow

- [ ] Define the escrow model explicitly and in writing: the project's core
      promise is "no recovery mechanism, password never stored". Escrow must
      be strictly opt-in and clearly boxed off from the default flow.
- [ ] Design the escrow envelope: a separate wrapped copy of the data key
      (never the password, never the plaintext) held by the escrow service
      and only decryptable by an org-approved key. **[backend]**
- [ ] Specify escrow access control: who may request retrieval, what
      approval/quorum is required, and how retrieval is audited (rotation,
      why/when/who).
- - Full audit trail required by security review: every escrow request and
      release must be logged, immutable, and retained.
- [ ] Define the escrow key lifecycle (generation, HSMs if used, rotation,
      multiple escrow agents so one compromise does not unlock the file).
- [ ] Build the split-knowledge / m-of-n option so a single escrow agent
      cannot decrypt on its own.
- [ ] Add builder UI: an explicit, gated "Enable key escrow" toggle that
      appears only in org/enterprise builds and requires confirmation.
- [ ] Document the full threat model of escrow in `SECURITY.md`, including
      the residual risk that escrow introduces.

## Enterprise / org policies

- [ ] Add a policy-manifest format (JSON) an org can embed in the builder so
      builds enforce org rules client-side, e.g. min password entropy,
      PBKDF2 disabled, key fingerprint whitelist, allowed recipients.
- [ ] Add a signed-policy chain: org policy is signed with the org's key and
      verified before a build proceeds (reuse the existing ECDSA P-256
      signature path).
- [ ] Add an org-level recipient allow-list so builds cannot add recipients
      outside the org.
- [ ] Add audit/build provenance: record `version`, policy hash, and build
      time in the envelope header (no PII) so an org can prove a file was
      built under a given policy.
- [ ] Identity/authorization: decide whether "identity" is a managed
      (SSO/Entra) account, a public key in the address book, or both, and
      document one canonical model before building identity features.

## Sharing / hosted volume

- [ ] Provide an optional hosted-file-store reference (contrast with the
      current manual Blob-download) so orgs can host protected blobs behind
      an access layer instead of emailing `.html` attachments. **[backend]**
- [ ] Add a hosted-decryptor page (the existing builder already contains the
      decrypt logic; extract a standalone hosted decryptor that loads a
      separate encrypted blob rather than opening a self-contained file).
- [ ] Add share-link lineage/expiry: a generated hosted link should be able
      to carry expiry and a recipient allow-list so a leaked link does not
      stay valid forever. **[backend]**

## Advertising the builder

- [ ] Add a share/QR affordance to the builder page itself so a happy user can
      promote it (the generated files already carry a QR encoder; reuse the
      embedded MIT encoder to render the builder's own URL).
- [ ] Write a one-page "why it's different" summary (client-side only, no
      upload, self-decrypting, unrecoverable-by-design) as a canonical
      blurb for releases, the extensions, and outreach.
- [ ] Add a badge/banner SVG (reuse the default padlock mark) users can drop
      on their sites to link back to the builder.
- [ ] Keep a changelog-visible "Built by the nonce-in-a-file builder"
      provenance line working as free promotion on every generated file, and
      audit it after each output-format change.
- [ ] Publish the extension and mail/sharing docs from one landing URL so
      every advertising channel (Web Stores, QR, badge) points at one origin.

## Advertising on the builder page

- [ ] Decide which ad inventory to run on the builder page (e.g. Google AdSense,
      Amazon Associates, or a direct/branded sponsor slot) and get project
      sign-off on the trade-off against the current zero-ad, zero-tracker
      privacy promise.
- [ ] Add an ad unit slot in a deliberate, fixed position on the builder page
      (not interstitials; the builder flow must stay fast and uninterruptible).
- [ ] Keep ad scripts out of the generated output files: the self-contained,
      offline decryptor must never carry an ad tag, tracker, or external
      request. Ads live only on the builder page.
- [ ] Isolate the ad network's script so it cannot re-type or defer the
      builder's inline scripts (guard against the existing Rocket Loader
      class of issue) and so the CSP allows it without widening the
      generated-file CSP.
- [ ] Update `PRIVACY.md`: state what ad network is used, what it may collect
      on the builder page, and that generated files remain tracker-free.
- [ ] Confirm `LEARN_MORE_URL` / fixed footer links are unaffected, and that
      the ad unit does not sit over or replace the provenance line.
- [ ] Re-run the builder regression tests with ads disabled (test) and enabled
      (staging) to confirm build path integrity is unchanged.

## Observability / audit (enterprise)

- [ ] Define what, if anything, an enterprise deployment may log. Default
      stays zero-data; any org logging is opt-in, local, and documented in
      `PRIVACY.md`.
- [ ] Add an org-audit log format (event, actor fingerprint, action) that is
      written only to the org's own store, never to the project.

## Cross-cutting

- [ ] Keep every feature off by default; the default build must remain
      self-contained, offline, and unrecoverable-by-design.
- [ ] Add tests for each new crypto path (escrow envelope wrap/unwrap, policy
      signature, SSO-derived wrap key) reusing the existing engine-level test
      style in `test/`.
- [ ] Update `README.md`, `SECURITY.md`, and `PRIVACY.md` for every item that
      lands.
- [ ] Re-run the existing regression suite after any change to the envelope
      header or recipient layout.