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