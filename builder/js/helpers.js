'use strict';

// -------------------------------------------------------------------------
// Key-derivation settings. The file format is crypto-agile (see C2): every
// password recipient carries the full algorithm + parameters it was derived
// with, so the embedded decryptor never assumes a hardcoded scheme. New
// files default to Argon2id, which is memory-hard and resists GPU/ASIC
// offline cracking far better than PBKDF2. PBKDF2-HMAC-SHA256 remains wired
// as a labeled FIPS/compat mode and shares the exact same commit-and-wrap
// construction, so raising costs is a one-line change that stays forward and
// backward compatible.
// -------------------------------------------------------------------------

// Default KDF for new builds. 'argon2id' or 'pbkdf2'.
var KDF_SCHEME = 'argon2id';

// Argon2id parameters (OWASP Argon2id guidance, memory-heavy on purpose):
// 3 passes, 64 MiB (memorySize is in KiB), 1 lane. hashLen is 64 bytes so a
// single KDF call yields both the wrap key and the key-commitment tag.
var AR2 = { t: 3, m: 65536, p: 1, hashLen: 64 };

// PBKDF2 FIPS/compat mode: the iteration count OWASP's Password Storage
// Cheat Sheet recommends for PBKDF2-HMAC-SHA256. Reading `iters` from the
// header (not assuming it) is what makes raising it safe for old files.
var PBKDF2_ITERS = 600000;
var PBKDF2_HASH = 'SHA-256';

var SALT_LEN = 16;
var IV_LEN = 12;           // AES-GCM standard nonce size
var CIPHER_VERSION = 4;

// Plaintext is padded (after compression) so the ciphertext length only
// reveals a coarse bucket size, not exactly how compressible the data was
// (C4). 4096-byte buckets keep the leak to "between N and N+4 KiB".
var PAD_BUCKET = 4096;
// -------------------------------------------------------------------------
// Default mark and lock icon (inline SVG data URIs), used when the owner
// does not upload their own or disables uploads but keeps the element shown.
// -------------------------------------------------------------------------
function svgUri(svg) {
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}
// -------------------------------------------------------------------------
// Small helpers
// -------------------------------------------------------------------------
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function safeName(name) {
  var base = String(name || 'document')
    .replace(/\.[^.]+$/, '')
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'document';
  return base + '.html';
}

var MIN_PASSWORD_LEN = 12;
var MIN_PASSWORD_BITS = 64;
var MAX_PASSWORD_LEN = 1024;

// Hard cap on recipients per file. Argon2id costs 64 MiB per run, so running
// it many times serially would make a build impractically slow (and a crafted
// multi-recipient file heavy to unlock). Clear limit keeps the builder usable.
var MAX_RECIPIENTS = 50;

// A small list of the most common/known-weak passwords. The entropy estimate
// below overstates real strength (people do not choose randomly), so this
// catches the worst offenders length alone would let through.
var COMMON_PASSWORDS = {
  '123456': 1, 'password': 1, '12345678': 1, 'qwerty': 1, '123456789': 1,
  '12345': 1, '1234': 1, '111111': 1, '1234567': 1, 'dragon': 1,
  '123123': 1, 'baseball': 1, 'abc123': 1, 'football': 1, 'monkey': 1,
  'letmein': 1, 'shadow': 1, 'master': 1, '666666': 1, 'qwertyuiop': 1,
  '123321': 1, 'mustang': 1, '1234567890': 1, 'michael': 1, '654321': 1,
  'superman': 1, '1qaz2wsx': 1, '7777777': 1, '121212': 1, '000000': 1,
  'qazwsx': 1, '123qwe': 1, 'killer': 1, 'trustno1': 1, 'jordan': 1,
  'jennifer': 1, 'zxcvbnm': 1, 'asdfgh': 1, 'hunter': 1, 'buster': 1,
  'soccer': 1, 'harley': 1, 'batman': 1, 'andrew': 1, 'tigger': 1,
  'sunshine': 1, 'iloveyou': 1, 'charlie': 1, 'robert': 1, 'thomas': 1,
  'hockey': 1, 'ranger': 1, 'daniel': 1, 'starwars': 1, '112233': 1,
  'george': 1, 'computer': 1, 'michelle': 1, 'jessica': 1, 'pepper': 1,
  '1111': 1, 'zxcvbn': 1, '555555': 1, '11111111': 1, '131313': 1,
  'freedom': 1, '777777': 1, 'pass': 1, 'maggie': 1, '159753': 1,
  'aaaaaa': 1, 'ginger': 1, 'princess': 1, 'joshua': 1, 'cheese': 1,
  'amanda': 1, 'summer': 1, 'love': 1, 'ashley': 1, 'nicole': 1,
  'chelsea': 1, 'biteme': 1, 'matthew': 1, 'access': 1, 'yankees': 1,
  '987654321': 1, 'dallas': 1, 'austin': 1, 'thunder': 1, 'taylor': 1,
  'matrix': 1, 'welcome': 1, 'admin': 1, 'hello': 1, 'apple': 1,
  'secret': 1, 'flower': 1, 'lovely': 1, 'q1w2e3r4': 1, '1q2w3e4r': 1
};

function commonPassword(pw) {
  return Object.prototype.hasOwnProperty.call(COMMON_PASSWORDS, String(pw).toLowerCase());
}

// Rough lower-bound estimate, not a real measurement: it assumes every
// character was chosen at random from the pools the password actually uses,
// which every real password overstates. It is only used to prevent a short or
// single-pool password from passing on length alone.
function estimateBits(pw) {
  var pool = 0;
  if (/[a-z]/.test(pw)) pool += 26;
  if (/[A-Z]/.test(pw)) pool += 26;
  if (/[0-9]/.test(pw)) pool += 10;
  if (/[^A-Za-z0-9]/.test(pw)) pool += 34;
  if (pool === 0) pool = 26;
  return Math.round(String(pw).length * Math.log2(pool));
}

// Footer links accept only http(s), never javascript:, data:, or anything
// with quotes/angle brackets that could escape the href attribute.
function validHttpUrl(u) {
  u = String(u == null ? '' : u).trim();
  return /^https?:\/\/[^\s'"<>]+$/i.test(u);
}

function normColor(v, def) {
  v = String(v == null ? '' : v).trim();
  return /^#[0-9a-fA-F]{6}$/.test(v) ? v : def;
}
// Full attribution block embedded into every generated file. Kept ASCII-only
// to match repo style; must track the bundled argon2-browser version (AR2_B64)
// and the text in THIRD_PARTY_NOTICES.md.
var THIRD_PARTY_NOTICE = [
  'Third-Party Notice',
  'This file embeds argon2-browser (https://github.com/antelle/argon2-browser),',
  'version 1.18.0, MIT license:',
  '',
  'Copyright (c) 2021 Antelle',
  '',
  'Permission is hereby granted, free of charge, to any person obtaining a copy of',
  'this software and associated documentation files (the "Software"), to deal in the',
  'Software without restriction, including without limitation the rights to use,',
  'copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the',
  'Software, and to permit persons to whom the Software is furnished to do so,',
  'subject to the following conditions:',
  '',
  'The above copyright notice and this permission notice shall be included in all',
  'copies or substantial portions of the Software.',
  '',
  'THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR',
  'IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,',
  'FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE',
  'AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER',
  'LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,',
  'OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE',
  'SOFTWARE.',
  '',
  'Argon2 reference implementation (https://github.com/P-H-C/phc-winner-argon2)',
  'is dual-licensed under CC0 1.0 (https://creativecommons.org/publicdomain/zero/1.0/)',
  'and the Apache License 2.0 (https://www.apache.org/licenses/LICENSE-2.0).',
  '',
  'This file also embeds qrcode-generator',
  '(https://github.com/kazuhikoarase/qrcode-generator), MIT license:',
  '',
  'Copyright (c) 2009 Kazuhiko Arase',
  '',
  'Permission is hereby granted, free of charge, to any person obtaining a copy of',
  'this software and associated documentation files (the "Software"), to deal in the',
  'Software without restriction, including without limitation the rights to use,',
  'copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the',
  'Software, and to permit persons to whom the Software is furnished to do so,',
  'subject to the following conditions:',
  '',
  'The above copyright notice and this permission notice shall be included in all',
  'copies or substantial portions of the Software.',
  '',
  'THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR',
  'IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,',
  'FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE',
  'AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER',
  'LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,',
  'OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE',
  'SOFTWARE.'
].join('\n');
