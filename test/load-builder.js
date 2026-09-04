'use strict';
/*
 * Static load/conformance tests for the split builder: verifies the builder now
 * ships as the inline deploy-config block plus the ordered js/*.js modules, that
 * every module parses and evaluates top-to-bottom in a minimal DOM stub without
 * throwing (catching undefined-variable errors at load time), and that the
 * embedded Argon2 bundle's integrity constant is truthful.
 *
 * Run with:  node test/load-builder.js   (no npm install; Node >= 16)
 *
 * A real browser exercises far more (WebCrypto, Compression Streams, drag &
 * drop, downloads); this file is a cheap regression net for the split itself.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
const BUILDER = path.join(ROOT, 'builder');

const LOAD_ORDER = [
  'js/helpers.js',
  'js/theme.js',
  'js/envelope.js',
  'js/ar2-b64.js',
  'js/qr-b64.js',
  'js/crypto.js',
  'js/output.js',
  'js/ui-file.js',
  'js/ui-branding.js',
  'js/ui-recipients.js',
  'js/ui-signing.js',
  'js/ui-build.js',
];

let exitCode = 0;
function pass(name) { console.log('  ok  ' + name); }
function fail(name, detail) {
  console.error('  FAIL ' + name + (detail ? '\n       ' + detail : ''));
  exitCode = 1;
}

console.log('\n[A] index.html loads the modules in order with data-cfasync="false"');
{
  const html = fs.readFileSync(path.join(BUILDER, 'index.html'), 'utf8');
  const tags = (html.match(/<script[^>]*><\/script>/g) || []).map(function (t) {
    return t.match(/src="([^"]+)"/)[1];
  });
  if (JSON.stringify(tags) === JSON.stringify(LOAD_ORDER)) {
    pass('all ' + LOAD_ORDER.length + ' module <script> tags present and in documented order');
  } else {
    fail('module <script> tags in documented order', 'got ' + JSON.stringify(tags));
  }
  const misTagged = (html.match(/<script src="js\/[^"]+"(?!\s+data-cfasync="false")[^>]*>/g) || []).length;
  if (misTagged === 0) pass('every module script tag carries data-cfasync="false"');
  else fail('every module script tag carries data-cfasync="false"', misTagged + ' missing the attribute');

  const inline = html.match(/<script data-cfasync="false">([\s\S]*?)<\/script>/);
  if (inline && /\bBUILDER_TITLE = /.test(inline[1]) && /\bLOGO_URL = /.test(inline[1]) &&
      /\bLEARN_MORE_URL = /.test(inline[1]) && /\bLEGAL_URL = /.test(inline[1]) &&
      /\bPRIVACY_URL = /.test(inline[1])) {
    pass('inline config block keeps the deploy-injectable markers');
  } else {
    fail('inline config block keeps the deploy-injectable markers');
  }
}

console.log('\n[B] Argon2 bundle integrity (AR2_SHA256 vs decode(AR2_B64))');
{
  const src = fs.readFileSync(path.join(BUILDER, 'js', 'ar2-b64.js'), 'utf8');
  const b64 = src.match(/var AR2_B64 = '([^']+)';/);
  const sha = src.match(/var AR2_SHA256 = '([0-9a-f]{64})';/);
  if (!b64 || !sha) { fail('ar2-b64.js carries AR2_B64 / AR2_SHA256'); }
  else {
    const actual = crypto.createHash('sha256').update(Buffer.from(b64[1], 'base64')).digest('hex');
    if (actual === sha[1]) pass('AR2_B64 SHA-256 matches recorded AR2_SHA256');
    else fail('AR2_B64 SHA-256 matches recorded AR2_SHA256', actual);
  }
}

console.log('\n[C] All modules load in order under a minimal DOM stub (no top-level throw)');
{
  const webcrypto = crypto.webcrypto;
  function makeEl() {
    return {
      id: '', hidden: true, value: '', checked: false, className: '', disabled: false,
      textContent: '', innerHTML: '', files: [], style: {}, title: '',
      classList: { add() {}, remove() {}, toggle() { return true; } },
      addEventListener() {}, removeEventListener() {},
      setAttribute() {}, getAttribute() { return null; },
      appendChild() {}, removeChild() {}, closest() { return null; },
      focus() {}, click() {}, querySelector() { return makeEl(); },
    };
  }
  const els = {};
  const sandbox = {
    document: {
      getElementById(id) { return els[id] || (els[id] = makeEl()); },
      querySelector() { return makeEl(); },
      querySelectorAll() { return []; },
      createElement() { return makeEl(); },
      head: { appendChild() {} },
      body: { appendChild() {} },
    },
    location: { protocol: 'http:', origin: 'http://localhost:8000', href: 'http://localhost:8000/' },
    localStorage: { getItem() { return null; }, setItem() {} },
    navigator: { clipboard: { writeText() { return Promise.resolve(); } } },
    atob: global.atob, btoa: global.btoa,
    TextEncoder: global.TextEncoder, TextDecoder: global.TextDecoder,
    URL: global.URL, Blob: global.Blob, File: global.File, Response: global.Response,
    Uint8Array: global.Uint8Array, Uint32Array: global.Uint32Array,
    crypto: {
      getRandomValues: function (u) { return webcrypto.getRandomValues(u); },
      // Never resolve so loadArgon2's poll loop cannot spin during the stub run.
      subtle: { digest: function () { return new Promise(function () {}); } },
    },
    console: console,
    // setInterval/setTimeout are no-ops so background polling can't keep the
    // stub "busy"; nothing here needs a timer to settle for the load to succeed.
    setTimeout: function () { return 0; },
    clearTimeout: function () {},
    setInterval: function () { return 0; },
    clearInterval: function () {},
    // crypto.subtle.digest is the only WebCrypto call any module reaches at
    // top level (inside loadArgon2). Everything else runs on user actions.
  };
  sandbox.window = sandbox;
  sandbox.self = sandbox;
  const ctx = vm.createContext(sandbox);

  // Inline deploy-config block first, then each module in load order.
  const html = fs.readFileSync(path.join(BUILDER, 'index.html'), 'utf8');
  const inline = html.match(/<script data-cfasync="false">([\s\S]*?)<\/script>/);
  let threw = null;
  const firstThrow = { file: null, err: null };
  try {
    if (inline) vm.runInContext(inline[1], ctx, { filename: 'index.html:inline-config' });
    else throw new Error('no inline config block found');
  } catch (e) {
    firstThrow.file = 'index.html:inline-config';
    firstThrow.err = e;
  }
  if (!firstThrow.file) {
    for (const rel of LOAD_ORDER) {
      const code = fs.readFileSync(path.join(BUILDER, rel), 'utf8');
      try {
        vm.runInContext(code, ctx, { filename: rel });
      } catch (e) {
        firstThrow.file = rel;
        firstThrow.err = e;
        break;
      }
    }
  }

  if (firstThrow.file) {
    fail('no module throws at top-level load', firstThrow.file + ': ' + ((firstThrow.err && firstThrow.err.message) || firstThrow.err));
  } else {
    pass('inline config + all ' + LOAD_ORDER.length + ' modules evaluated without throwing');
  }

  const symbols = ['encryptFiles', 'makeOutput', 'loadArgon2', 'gatherRecipients', 'generatePassword'];
  const missing = symbols.filter(function (s) { return typeof ctx[s] !== 'function'; });
  if (missing.length === 0) pass('key symbols exposed after load (' + symbols.join(', ') + ')');
  else fail('key symbols exposed after load', 'missing: ' + missing.join(', '));

  // Cross-module globals must be defined exactly once each (no namespace
  // pollution from removing the IIFE).
  const counts = {};
  for (const rel of LOAD_ORDER) {
    const code = fs.readFileSync(path.join(BUILDER, rel), 'utf8');
    const re = /^(?:function (([A-Za-z_$][\w$]*)|var ([A-Za-z_$][\w$]*)))/gm;
    let m;
    while ((m = re.exec(code)) !== null) {
      const name = m[1] || m[2];
      counts[name] = (counts[name] || 0) + 1;
    }
  }
  const dupes = Object.keys(counts).filter(function (k) { return counts[k] > 1; });
  if (dupes.length === 0) pass('no top-level name is defined more than once');
  else fail('no top-level name is defined more than once', 'duplicates: ' + dupes.join(', '));
}

if (exitCode === 0) console.log('\nDone.');
process.exitCode = exitCode;