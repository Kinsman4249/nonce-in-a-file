'use strict';

// -------------------------------------------------------------------------
// Argon2id WASM engine. The vetted argon2-browser bundle (self-contained
// - its WASM is embedded as base64) is stored in the constant AR2_B64 and
// materialized into a real script element at runtime. The builder loads it
// once to encrypt; every generated file embeds the same decoded source
// inline (see makeOutput below) so the recipient needs no network. Loading
// is idempotent and returns a Promise of the global `argon2` object. The
// MIT license for argon2-browser and the reference-implementation note are
// in THIRD_PARTY_NOTICES.md, and every generated file carries the full text
// in an HTML comment (see the THIRD_PARTY_NOTICE constant below).
// -------------------------------------------------------------------------
// In-memory, build-scoped verification hints collected while recipients are
// wrapped, so the builder can round-trip each recipient right after building
// (in-memory only; never serialized into the output). Reset per encryptFile.
// Password hints carry the sender's password; ECDH hints carry the ephemeral
// private key (which wrapForEcdh normally drops) and the recipient public key.
var _selfVerifyHints = [];

var _ar2Promise = null;
function loadArgon2() {
  if (typeof window !== 'undefined' && window.argon2) { return Promise.resolve(window.argon2); }
  if (_ar2Promise) { return _ar2Promise; }
  _ar2Promise = new Promise(function (resolve, reject) {
    var raw;
    try { raw = b64ToBytes(AR2_B64); } catch (e) { reject(new Error('Argon2 library is corrupted.')); return; }
    crypto.subtle.digest('SHA-256', raw).then(function (d) {
      var b = new Uint8Array(d), h = '';
      for (var i = 0; i < b.length; i++) { h += ('0' + b[i].toString(16)).slice(-2); }
      if (h !== AR2_SHA256) { reject(new Error('Argon2 library hash mismatch; refusing to load.')); return; }
      var s = document.createElement('script');
      s.textContent = new TextDecoder().decode(raw);
      document.head.appendChild(s);
      var tries = 0;
      (function poll() {
        if (window.argon2) { return resolve(window.argon2); }
        if (++tries > 200) { return reject(new Error('Argon2 WASM failed to initialize.')); }
        setTimeout(poll, 25);
      })();
    });
  });
  return _ar2Promise;
}

// Decode the embedded Argon2 WASM bundle back to its raw script source so it
// can be inlined verbatim into a generated file (keeps outputs offline).
function argon2LibSource() {
  return new TextDecoder().decode(b64ToBytes(AR2_B64));
}

// Decode the embedded qrcode-generator bundle back to its raw script source
// so it can be inlined verbatim into a generated file (keeps outputs and the
// runtime share QR fully offline). Mirrors argon2LibSource().
function qrLibSource() {
  return new TextDecoder().decode(b64ToBytes(QR_B64));
}

// Derive the 64 bytes a KDF produces for a password recipient: the first 32
// become the AES-GCM wrap key, the last 32 the key-commitment tag key.
function derivePasswordBytes(scheme, password, salt) {
  if (scheme === 'argon2id') {
    return loadArgon2().then(function () {
      return argon2.hash({
        pass: new TextEncoder().encode(password),
        salt: salt,
        time: AR2.t,
        mem: AR2.m,
        parallelism: AR2.p,
        hashLen: AR2.hashLen,
        type: argon2.ArgonType.Argon2id
      });
    }).then(function (r) { return new Uint8Array(r.hash); });
  }
  // PBKDF2-HMAC-SHA256 (FIPS/compat). deriveBits can emit 64 bytes by
  // chaining blocks internally, so this mirrors the Argon2id 64-byte layout.
  return crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']
  ).then(function (km) {
    return crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt: salt, iterations: PBKDF2_ITERS, hash: PBKDF2_HASH },
      km,
      512
    );
  }).then(function (ab) { return new Uint8Array(ab); });
}

// Expand a 256-bit ECDH shared secret to the same 64-byte key structure as
// the password KDFs (32-byte wrap key + 32-byte commit key) via HKDF-SHA256.
function expandEcdhSecret(ss, hkdfSalt) {
  return crypto.subtle.importKey('raw', ss, 'HKDF', false, ['deriveBits'])
    .then(function (ikm) {
      return crypto.subtle.deriveBits(
        { name: 'HKDF', hash: 'SHA-256', salt: hkdfSalt, info: new TextEncoder().encode('nonce-in-a-file:ecdh-wrap:v' + CIPHER_VERSION) },
        ikm,
        512
      );
    }).then(function (ab) { return new Uint8Array(ab); });
}

// -------------------------------------------------------------------------
// Build-time round-trip self-verification (the #1 decryption safeguard).
// Right after building, before any download, the builder re-derives the data
// key through every recipient exactly the way the embedded decryptor will
// (derive 64-byte KB, check the key commitment, unwrap, then AES-GCM decrypt
// the ciphertext) and asserts the recovered bytes equal the plaintext
// envelope in memory. A regression in any of padding / compression flag /
// wrap layout / envelope format is caught here at authoring time instead of
// in the recipient's browser.
// -------------------------------------------------------------------------
function commitMatchesBytes(commBytes, wrappedBytes, expectB64) {
  return crypto.subtle.digest('SHA-256', concatBytes(commBytes, wrappedBytes)).then(function (d) {
    var dg = new Uint8Array(d);
    var e = b64ToBytes(expectB64);
    if (dg.length !== e.length) { return false; }
    var diff = 0;
    for (var j = 0; j < dg.length; j++) { diff |= dg[j] ^ e[j]; }
    return diff === 0;
  }).catch(function () { return false; });
}

// Mirror of the decryptor's rawKeyToDataKey: re-check the commitment, unwrap
// the data key under the 32-byte wrap half of KB, resolving to a Uint8Array.
function builderUnwrapDataKey(r, kb) {
  var wrapped = b64ToBytes(r.wrapped);
  return commitMatchesBytes(kb.subarray(32), wrapped, r.commit).then(function (ok) {
    if (!ok) { throw new Error('commit mismatch during self-verification'); }
    return crypto.subtle.importKey('raw', kb.subarray(0, 32), { name: 'AES-GCM', length: 256 }, false, ['unwrapKey']);
  }).then(function (wk) {
    return crypto.subtle.unwrapKey(
      'raw', wrapped, wk, { name: 'AES-GCM', iv: b64ToBytes(r.wrapIv) },
      { name: 'AES-GCM', length: 256 }, false, ['decrypt']
    );
  });
}

// Re-derive the ECDH 64-byte KB using the captured ephemeral private key and
// the recipient's public key, mirroring the decryptor's deriveEcdh.
function builderDeriveEcdh(r, privKey, recipientPublic, v) {
  return crypto.subtle.deriveBits({ name: 'ECDH', public: recipientPublic }, privKey, 256)
    .then(function (ss) { return expandEcdhSecret(ss, b64ToBytes(r.hkdfSalt)); });
}

function selfVerify(payload, envelope) {
  var hints = _selfVerifyHints;
  var idx = 0;
  function step(r, hint) {
    var kbP;
    if (r.type === 'password') {
      kbP = derivePasswordBytes(r.kdf === 'pbkdf2' ? 'pbkdf2' : 'argon2id', hint.pw, b64ToBytes(r.salt));
    } else {
      kbP = importEcdhPublic(hint.pubText).then(function (pub) {
        return builderDeriveEcdh(r, hint.priv, pub, payload.v);
      });
    }
    return kbP
      .then(function (kb) { return builderUnwrapDataKey(r, kb); })
      .then(function (dk) { return crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64ToBytes(payload.iv) }, dk, b64ToBytes(payload.ct)); })
      .then(function (ab) {
        var pt = new Uint8Array(ab);
        if (pt.length !== envelope.length) { return false; }
        for (var j = 0; j < pt.length; j++) { if (pt[j] !== envelope[j]) { return false; } }
        return true;
      });
  }
  function next() {
    if (idx >= payload.recipients.length) { return Promise.resolve(false); }
    var r = payload.recipients[idx];
    var hint = hints[idx];
    idx++;
    return step(r, hint).then(function (ok) {
      return ok || next();
    }).catch(function () { return next(); });
  }
  return next().then(function (matched) {
    if (!matched) {
      throw new Error('Internal verification failed - this build is not decryptable; do not send it.');
    }
  });
}

// -------------------------------------------------------------------------
// Recipient key-wrapping helpers. One random AES-256-GCM "data key" encrypts
// the document; a per-recipient copy of that data key is wrapped in the
// header (under a password-derived key, or under an ECDH shared secret), so
// any single recipient can unwrap it and decrypt the same ciphertext.
// -------------------------------------------------------------------------
// Wrap the data key under a 32-byte AES-GCM wrap key and return the wrapped
// bytes plus a key-commitment tag. commit = SHA-256(commitKey || wrapped):
// it binds the KDF output (and so the password/recipient) to the ciphertext,
// which is what defeats the AES-GCM partition oracle when several recipients
// share one file (C3). A recipient only proceeds if the tag they recompute
// from their own derived key matches the stored one.
function wrapKeyForDataKey(dataKey, encBytes, commBytes, wrapIv) {
  return crypto.subtle.importKey('raw', encBytes, { name: 'AES-GCM', length: 256 }, false, ['wrapKey']
  ).then(function (wk) {
    return crypto.subtle.wrapKey('raw', dataKey, wk, { name: 'AES-GCM', iv: wrapIv });
  }).then(function (wrappedBuf) {
    var wrapped = new Uint8Array(wrappedBuf);
    return crypto.subtle.digest('SHA-256', concatBytes(commBytes, wrapped)).then(function (dig) {
      return {
        wrapped: bytesToB64(wrapped),
        commit: bytesToB64(new Uint8Array(dig))
      };
    });
  });
}

// Wrap the data key for a password recipient. The chosen KDF (Argon2id by
// default, PBKDF2-SHA256 in FIPS/compat mode) yields 64 bytes; every
// algorithm and parameter is stored beside the ciphertext so the decryptor
// reads them instead of assuming them (crypto agility, C2).
function wrapForPassword(dataKey, password, scheme) {
  _selfVerifyHints.push({ kind: 'password', pw: password });
  var salt = randomBytes(SALT_LEN);
  var wrapIv = randomBytes(IV_LEN);
  return derivePasswordBytes(scheme, password, salt).then(function (kb) {
    return wrapKeyForDataKey(dataKey, kb.subarray(0, 32), kb.subarray(32), wrapIv)
      .then(function (res) {
        var entry = {
          type: 'password',
          kdf: scheme,
          salt: bytesToB64(salt),
          wrapIv: bytesToB64(wrapIv),
          commit: res.commit,
          wrapped: res.wrapped
        };
        if (scheme === 'argon2id') {
          entry.t = AR2.t; entry.m = AR2.m; entry.p = AR2.p; entry.hashLen = AR2.hashLen;
        } else {
          entry.iters = PBKDF2_ITERS; entry.hash = PBKDF2_HASH;
        }
        return entry;
      });
  });
}

// ECDH P-256: the builder generates a fresh ephemeral key pair, derives a
// shared secret with the recipient's public key, expands it (HKDF) into the
// wrap/commit keys, and wraps the data key. The ephemeral public key and the
// HKDF salt ride in the header so the recipient can re-derive everything.
function wrapForEcdh(dataKey, recipientPublicText) {
  _selfVerifyHints.push({ kind: 'ecdh', pubText: recipientPublicText });
  var wrapIv = randomBytes(IV_LEN);
  var hkdfSalt = randomBytes(SALT_LEN);
  var ephemeral;
  return crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, false, ['deriveBits']
  ).then(function (eph) {
    ephemeral = eph;
    _selfVerifyHints[_selfVerifyHints.length - 1].priv = eph.privateKey;
    return importEcdhPublic(recipientPublicText);
  }).then(function (recipientPublic) {
    return crypto.subtle.deriveBits({ name: 'ECDH', public: recipientPublic }, ephemeral.privateKey, 256);
  }).then(function (ss) {
    return expandEcdhSecret(ss, hkdfSalt).then(function (kb) {
      return wrapKeyForDataKey(dataKey, kb.subarray(0, 32), kb.subarray(32), wrapIv).then(function (res) {
        return crypto.subtle.exportKey('raw', ephemeral.publicKey).then(function (ephPub) {
          return {
            type: 'ecdh',
            wrapIv: bytesToB64(wrapIv),
            wrapped: res.wrapped,
            commit: res.commit,
            ephemeral: bytesToB64(new Uint8Array(ephPub)),
            hkdfSalt: bytesToB64(hkdfSalt),
            hash: 'SHA-256'
          };
        });
      });
    });
  });
}

function wrapRecipients(dataKey, recipients, scheme) {
  var out = [];
  var chain = Promise.resolve(null);
  recipients.forEach(function (r) {
    chain = chain.then(function () {
      var p = (r.kind === 'password' ? wrapForPassword(dataKey, r.value, scheme) : wrapForEcdh(dataKey, r.value));
      return p.then(function (entry) { out.push(entry); });
    });
  });
  return chain.then(function () { return out; });
}

// -------------------------------------------------------------------------
// ECDSA P-256 detached signing over the ciphertext.
// -------------------------------------------------------------------------
function generateSignKeypair() {
  return crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign']).then(function (kp) {
    return crypto.subtle.exportKey('pkcs8', kp.privateKey).then(function (priv) {
      return { priv: bytesToB64(new Uint8Array(priv)) };
    });
  });
}

// Recover an ECDSA/ECDH public SPKI (base64) from a private key: a JWK export
// of an EC private key carries the public point (x, y), which is re-imported
// as a public key and exported as SPKI. Lets a signer drop in only their
// private key and still ship a verifiable public key.
function spkiFromPrivate(privKey) {
  return crypto.subtle.exportKey('jwk', privKey).then(function (jwk) {
    var pubJwk = { kty: 'EC', crv: 'P-256', x: jwk.x, y: jwk.y, ext: true };
    return crypto.subtle.importKey('jwk', pubJwk, { name: 'ECDSA', namedCurve: 'P-256' }, true, ['verify'])
      .then(function (pub) {
        return crypto.subtle.exportKey('spki', pub).then(function (sp) { return bytesToB64(new Uint8Array(sp)); });
      });
  });
}

function signCiphertext(ctIv, ctBytes, label, privB64) {
  // Bind the signature to the IV as well as the ciphertext: sign
  // iv-bytes || ct-bytes so a corrupted IV field reads as a signature
  // failure instead of a bogus "verified" plus a failed decrypt.
  var labelBytes = new TextEncoder().encode('label:' + (label || '') + '\n');
  var ivCt = concatBytes(ctIv, ctBytes);
  var data = concatBytes(labelBytes, ivCt);
  return importSignKey(privB64).then(function (privKey) {
    return Promise.all([
      spkiFromPrivate(privKey),
      crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, privKey, data).then(function (s) { return bytesToB64(new Uint8Array(s)); })
    ]);
  }).then(function (ar) {
    return { label: label, pub: ar[0], sig: ar[1] };
  });
}

// Import a signing private key (base64 or PEM) as an ECDSA P-256 sign key.
// Throws a targeted error so a typo in the box is reported as a bad key,
// not as a generic build failure.
function importSignKey(privB64) {
  return crypto.subtle.importKey('pkcs8', b64ToBytes(stripPem(privB64)), { name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign']
  ).catch(function () {
    return Promise.reject(new Error('The signing private key is not a usable ECDSA P-256 key. Check it is a valid PKCS#8 base64/PEM private key, or clear the box to generate a fresh one.'));
  });
}

// -------------------------------------------------------------------------
// Crypto (Part 3): a random AES-256-GCM data key encrypts the content and
// is then wrapped once per recipient - under a key derived by Argon2id
// (default) or PBKDF2-HMAC-SHA256 (FIPS/compat mode) for passwords, and
// under an ECDH P-256 shared secret for public keys. Every wrap carries a
// key-commitment tag. Optionally ECDSA-P256 signs the ciphertext for sender
// authenticity. Nonce/hash primitives come from Web Crypto; Argon2id comes
// from the embedded argon2-browser WASM bundle.
// -------------------------------------------------------------------------
function encryptFiles(sourceList, password, extraRecipients, sign, scheme) {
  var dataIv = randomBytes(IV_LEN);
  // Prepare every source (read + compress-when-worthwhile) up front so the
  // envelope can be a single-file v3 envelope when there is exactly one
  // source, or a multi-file bundle (v4) when there is more than one.
  return Promise.all(sourceList.map(function (src) {
    // Compress in the browser with the standard Compression Streams API.
    // Use the compressed copy only if it actually saved space; incompressible
    // input (already-compressed media) keeps the original bytes instead.
    return readBytes(src.file).then(function (bytes) {
      return compressBytes(bytes).then(function (compressed) {
        return {
          bytes: compressed.length < bytes.length ? compressed : bytes,
          z: compressed.length < bytes.length ? 1 : 0,
          name: src.name || '',
          type: src.type || ''
        };
      });
    });
  })).then(function (entries) {
      // The original filenames and MIME types ride inside the encrypted
      // envelope, not in cleartext metadata: a protected file must not leak
      // its own names (e.g. "Layoffs_Draft_Q3.docx") to anyone holding it
      // without the password.
      var envelope = entries.length > 1
        ? buildEnvelopeMulti(entries)
        : buildEnvelope(entries[0].bytes, entries[0].name, entries[0].type, entries[0].z);
      return crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'wrapKey', 'unwrapKey']
      ).then(function (dataKey) {
        return crypto.subtle.encrypt({ name: 'AES-GCM', iv: dataIv }, dataKey, envelope)
          .then(function (ctBuf) {
            var ct = bytesToB64(new Uint8Array(ctBuf));
            var ctBytes = new Uint8Array(ctBuf);
            var recipients = [];
            if (password) { recipients.push({ kind: 'password', value: password }); }
            recipients = recipients.concat(extraRecipients || []);
            _selfVerifyHints = [];
            return wrapRecipients(dataKey, recipients, scheme).then(function (wrapped) {
              var sigPromise = (sign && sign.enabled)
                ? (sign.priv ? Promise.resolve(sign.priv) : generateSignKeypair().then(function (p) { return p.priv; }))
                    .then(function (privB64) { return signCiphertext(dataIv, ctBytes, sign.label, privB64); })
                : Promise.resolve(null);
              return sigPromise.then(function (sig) {
                var payload = {
                  v: CIPHER_VERSION,
                  iv: bytesToB64(dataIv),
                  ct: ct,
                  recipients: wrapped,
                  sign: sig
                };
                // Fight every future regression now, before a single file is
                // offered for download: round-trip the ciphertext through the
                // exact decrypt-side primitives and abort if any recipient
                // does not recover the in-memory envelope intact.
                return selfVerify(payload, envelope).then(function () { return payload; });
              });
            });
          });
      });
  });
}
