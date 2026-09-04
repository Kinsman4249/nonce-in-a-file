'use strict';

// The envelope placed in front of the (compressed) document(s): a JSON header
// (newline-free, because JSON.stringify escapes every control character)
// holding the real filename, MIME type, compression flag and the number of
// trailing padding bytes - or, for a multi-file bundle, a `files` manifest
// carrying per-file name, type, compression flag and on-disk byte length -
// then a single newline, then the document bytes. The whole envelope is what
// gets encrypted, so the recipient only learns filenames after entering the
// password. The envelope is padded with random bytes up to PAD_BUCKET so the
// ciphertext length reveals only a coarse bucket size, never how
// compressible the plaintext was (C4).
//
// The padding uses a fixpoint: the JSON header length depends on the digit
// count of the chosen `pad`, so a naive two-pass guess can land one byte off
// a bucket boundary when `pad` crosses a digit transition (10/100/1000).
// Iterate until recomputing the pad from the header that carries it is
// stable, then assert the total lands exactly on a bucket boundary.
function alignToBucket(headerWith, dataLen, bucket) {
  var head = headerWith(0);
  var pad = (bucket - ((head.length + 1 + dataLen) % bucket)) % bucket;
  for (var iter = 0; iter < 8; iter++) {
    var next = (bucket - ((headerWith(pad).length + 1 + dataLen) % bucket)) % bucket;
    if (next === pad) { break; }
    pad = next;
  }
  head = headerWith(pad);
  var total = head.length + 1 + dataLen + pad;
  // Defensive: the fixpoint must end exactly on a bucket boundary or the
  // padding would leak length mod PAD_BUCKET, which is the whole point of
  // padding. Abort loudly rather than ship a leaky envelope.
  if (total % bucket !== 0) {
    throw new Error('Envelope padding failed to align to a ' + bucket + '-byte bucket.');
  }
  return { head: head, pad: pad, total: total };
}

// Single-file path: header is exactly {n,t,z,pad} (byte-identical to v3).
function buildEnvelope(data, name, type, z) {
  function headerWith(pad) {
    return new TextEncoder().encode(JSON.stringify({ n: name || '', t: type || '', z: z ? 1 : 0, pad: pad }));
  }
  var a = alignToBucket(headerWith, data.length, PAD_BUCKET);
  var out = new Uint8Array(a.total);
  out.set(a.head, 0);
  out[a.head.length] = 10;
  out.set(data, a.head.length + 1);
  crypto.getRandomValues(out.subarray(a.head.length + 1 + data.length));
  return out;
}

// Multi-file path: header is {files:[{n,t,z,len},...], pad}; the body is the
// concatenation of each file's (optionally compressed) bytes in manifest
// order, followed by the aligned trailing padding.
function buildEnvelopeMulti(entries) {
  var bodyLen = 0;
  for (var k = 0; k < entries.length; k++) { bodyLen += entries[k].bytes.length; }
  function headerWith(pad) {
    var files = entries.map(function (en) {
      return { n: en.name || '', t: en.type || '', z: en.z ? 1 : 0, len: en.bytes.length };
    });
    return new TextEncoder().encode(JSON.stringify({ files: files, pad: pad }));
  }
  var a = alignToBucket(headerWith, bodyLen, PAD_BUCKET);
  var out = new Uint8Array(a.total);
  var off = 0;
  out.set(a.head, 0);
  out[a.head.length] = 10;
  off = a.head.length + 1;
  for (var j = 0; j < entries.length; j++) {
    out.set(entries[j].bytes, off);
    off += entries[j].bytes.length;
  }
  crypto.getRandomValues(out.subarray(off));
  return out;
}

function readBytes(file) {
  return new Promise(function (resolve, reject) {
    var r = new FileReader();
    r.onload = function () { resolve(new Uint8Array(r.result)); };
    r.onerror = function () { reject(new Error('Could not read file.')); };
    r.readAsArrayBuffer(file);
  });
}

function bytesToB64(bytes) {
  var s = '';
  var c = new Uint8Array(bytes);
  for (var i = 0; i < c.length; i += 0x8000) {
    s += String.fromCharCode.apply(null, c.subarray(i, i + 0x8000));
  }
  return btoa(s);
}

function imageToDataUri(file) {
  if (!file) return Promise.resolve(null);
  var mime = /^image\/[a-z0-9.+-]+$/i.test(file.type || '') ? file.type : 'application/octet-stream';
  return readBytes(file).then(function (bytes) {
    return 'data:' + mime + ';base64,' + bytesToB64(bytes);
  });
}

// Turn a remote http(s) logo into a fully self-contained data URI so the
// generated file (whose CSP allows only `img-src data:`) can show it with no
// network access. SVGs are embedded as text (`data:image/svg+xml;utf8,`),
// both because that keeps them human-readable in the source and because
// SVG text is small and unaffected by base64 inflation; every other image
// type is embedded as base64. Returns a Promise of a data URI, or null when
// the remote image cannot be fetched (e.g. the server sends no CORS headers).
// Warnings (optional) receive a human-readable note when it falls back.
function remoteToDataUri(url, warnings) {
  var source = String(url || '');
  if (!/^https?:/i.test(source)) return Promise.resolve(null);
  return fetch(source, { credentials: 'omit', mode: 'cors' }).then(function (res) {
    if (!res.ok) throw new Error('HTTP ' + res.status);
    var ct = (res.headers.get('content-type') || '').toLowerCase();
    var looksSvg = ct.indexOf('svg') !== -1 || /\.svg(\?|$)/i.test(source.split('#')[0]);
    if (looksSvg) {
      return res.text().then(function (text) {
        return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(text);
      });
    }
    return res.arrayBuffer().then(function (buf) {
      var mime = /^image\/[a-z0-9.+-]+$/i.test(ct) ? ct : 'image/png';
      return 'data:' + mime + ';base64,' + bytesToB64(new Uint8Array(buf));
    });
  }).catch(function (err) {
    if (warnings) {
      warnings.push('Could not embed the remote logo (' + source + '): ' +
        (err && err.message ? err.message : 'request failed') +
        '. The image could not be fetched, likely because the server blocks cross-origin requests. It will not render in generated files, whose CSP permits only embedded data images.');
    }
    return null;
  });
}

// Compress bytes with the browser's standard Compression Streams API. The
// platform exposes no level knob, so gzip/deflate all use the same deflate
// compressor; gzip is chosen as the widely-supported, framing-stable format.
// Returns a Promise of a Uint8Array (the compressed data).
function compressBytes(bytes) {
  var ds = new CompressionStream('gzip');
  var writer = ds.writable.getWriter();
  writer.write(bytes);
  writer.close();
  return new Response(ds.readable).arrayBuffer().then(function (ab) {
    return new Uint8Array(ab);
  });
}

// -------------------------------------------------------------------------
// Custom CSS sanitization: drop anything that could require a network fetch
// so the output keeps working fully offline.
// -------------------------------------------------------------------------
function sanitizeCss(text, warnings) {
  var s = String(text || '');

  // Raw-text context guard: inside <style> the HTML parser does not decode
  // entity references, so replacing "<" with "&lt;" would not help. CSS has
  // no legitimate use of "<" (it is not an HTML document), so strip every
  // occurrence. "&lt;" would be passed through verbatim to the CSS parser,
  // so stripping is both safe and functional whereas encoding is not.
  if (s.indexOf('<') !== -1) {
    warnings.push('Removed all "<" characters from your CSS: a "<" can close the style block early and inject markup/script into the output. CSS never needs it.');
    s = s.replace(/</g, '');
  }

  var lines = s.split('\n');
  var out = [];
  var external = /url\((['"]?)(https?:)?\/\//i;
  lines.forEach(function (line) {
    var t = line.trim();
    if (/^@import/i.test(t)) {
      warnings.push('Removed @import rule: "' + t + '" (no external requests allowed).');
      return;
    }
    if (external.test(line)) {
      warnings.push('Removed external url() reference: "' + t + '" (must be offline-safe).');
      return;
    }
    out.push(line);
  });
  return out.join('\n');
}

// -------------------------------------------------------------------------
// Reciprocal of bytesToB64 plus a PEM/plain-text normalizer.
// -------------------------------------------------------------------------
function b64ToBytes(b64) {
  var s = atob(b64);
  var u = new Uint8Array(s.length);
  for (var i = 0; i < s.length; i++) { u[i] = s.charCodeAt(i); }
  return u;
}

// Accept a base64 private/public key either bare or wrapped in PEM armor.
function stripPem(t) {
  return String(t || '').replace(/-----BEGIN [^-]*-----/g, '')
    .replace(/-----END [^-]*-----/g, '')
    .replace(/\s+/g, '');
}

// Import an ECDH P-256 public key shared by a recipient: accepts a raw
// uncompressed point (65 bytes) or an SPKI DER document, in base64 or PEM.
// Validates the transport encoding and shape up front so the recipient gets a
// readable reason instead of a Web Crypto DOMException when they paste a bad
// key.
function importEcdhPublic(text) {
  var t = String(text == null ? '' : text).trim();
  if (!t) { return Promise.reject(new Error('Public key is empty.')); }
  var body = /-----BEGIN/.test(t) ? stripPem(t) : t;
  var u;
  try {
    u = b64ToBytes(body);
  } catch (e) {
    return Promise.reject(new Error('Public key is not valid base64.'));
  }
  var params = { name: 'ECDH', namedCurve: 'P-256' };
  if (u.length === 65) {
    return crypto.subtle.importKey('raw', u, params, false, []).catch(function () {
      return Promise.reject(new Error('That is not a valid P-256 public key.'));
    });
  }
  // Any other length is taken as an SPKI DER document; let Web Crypto decide
  // whether it is really a P-256 public key and surface a readable failure.
  return crypto.subtle.importKey('spki', u, params, false, []).catch(function () {
    return Promise.reject(new Error('That is not a valid P-256 public key (needs a 65-byte uncompressed point or an SPKI DER document).'));
  });
}

function randomBytes(n) { return crypto.getRandomValues(new Uint8Array(n)); }
function concatBytes(a, b) {
  var out = new Uint8Array(a.length + b.length);
  out.set(a, 0);
  out.set(b, a.length);
  return out;
}
