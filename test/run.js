'use strict';
/*
 * Reusable e2e / conformance tests for the runtime "Share this file" QR feature.
 *
 * Run with:  node test/run.js   (no npm install; Node >= 16 for core crypto)
 *
 * What it verifies without a browser, DOM, or WebCrypto:
 *
 *   A) QR round-trips: the exact qrcode-generator invocation the generated
 *      file uses (qrcode(0,"M"); addData(url,"Byte"); make(); isDark) produces
 *      a matrix that the independent jsqr decoder reads back to the original
 *      URL. This is the standards-conformance check that the QR a recipient
 *      scans will actually open the page.
 *
 *   B) Embedded-copy integrity: the base64 QR bundle embedded in the builder
 *      (QR_B64 / QR_SHA256) decodes to byte-for-byte the vendored source at
 *      builder/vendor/qrcode.js, so the copy shipped inside every generated
 *      file can never drift from the reviewed, arm's-length vendored file.
 *
 * Both libraries are permissive (MIT encoder, Apache-2.0 decoder) and live in
 * the repo (builder/vendor/, test/vendor/) with their licenses - no BUSL change.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
const qrcode = require(path.join(ROOT, 'builder', 'vendor', 'qrcode.js'));
const jsQR = require(path.join(ROOT, 'test', 'vendor', 'jsqr.js'));

const SAMPLE_URLS = [
  'https://example.com/',
  'https://example.com/share/123',
  'https://files.example.org/docs/memo.pdf?ver=2&lang=en',
  'https://some.domain.tld:8443/deep/path/segment/one/two/three/four?paramA=1&paramB=two&flag',
  'https://repo.localhost/packages/nonce-in-a-file/blob/main/README.md',
];

function pass(name) { console.log('  ok  ' + name); }
function fail(name, detail) {
  console.error('  FAIL ' + name + (detail ? '\n       ' + detail : ''));
  process.exitCode = 1;
}

function rasterize(q, scale, quiet) {
  const n = q.getModuleCount();
  const W = (n + 2 * quiet) * scale;
  const data = new Uint8ClampedArray(W * W * 4).fill(255);
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    if (!q.isDark(r, c)) continue;
    for (let dy = 0; dy < scale; dy++) for (let dx = 0; dx < scale; dx++) {
      const px = ((r + quiet) * scale + dy) * W + ((c + quiet) * scale + dx);
      data[px * 4] = 0; data[px * 4 + 1] = 0; data[px * 4 + 2] = 0;
    }
  }
  return { data, width: W, height: W };
}

console.log('\n[A] QR round-trip (Arase encoder -> jsqr decoder)');
for (const url of SAMPLE_URLS) {
  const q = qrcode(0, 'M');
  q.addData(url, 'Byte');
  q.make();
  const img = rasterize(q, 4, 4);
  const res = jsQR(img.data, img.width, img.height);
  if (res && res.data === url) pass('decodes "' + url + '" (module count ' + q.getModuleCount() + ')');
  else fail('decodes "' + url + '"', 'got ' + (res && res.data));
}

console.log('\n[B] Embedded-copy integrity (builder QR_B64/QR_SHA256 vs vendor)');
const builderHtml = fs.readFileSync(path.join(ROOT, 'builder', 'index.html'), 'utf8');
const shaMatch = builderHtml.match(/var QR_SHA256 = '([0-9a-f]{64})';/);
const b64Match = builderHtml.match(/var QR_B64 = '([^']+)';/);
const vendor = fs.readFileSync(path.join(ROOT, 'builder', 'vendor', 'qrcode.js'), 'utf8');

if (!b64Match || !shaMatch) { fail('builder carries QR_B64 / QR_SHA256 constants', 'constants not found'); }
else {
  const decoded = Buffer.from(b64Match[1], 'base64').toString('utf8');
  if (decoded === vendor) pass('QR_B64 decodes to builder/vendor/qrcode.js byte-for-byte');
  else fail('QR_B64 decodes to builder/vendor/qrcode.js', 'embedded bundle differs from vendored source');

  const actualSha = crypto.createHash('sha256').update(decoded).digest('hex');
  if (actualSha === shaMatch[1]) pass('QR_B64 SHA-256 matches recorded QR_SHA256');
  else fail('QR_B64 SHA-256 matches recorded QR_SHA256', actualSha);
}

console.log('\n[C] Vendored sources carry permissive licenses');
const encHeader = vendor.slice(0, 300);
if (/MIT/i.test(encHeader)) pass('qrcode-generator headers contains MIT');
else fail('qrcode-generator header contains MIT', 'header: ' + encHeader.slice(0, 80));
const decHeader = fs.readFileSync(path.join(ROOT, 'test', 'vendor', 'jsqr.js'), 'utf8').slice(0, 300);
if (/Apache License/i.test(decHeader) || /cozmo|jsQR/i.test(decHeader)) pass('jsqr appears to be Apache-2.0 (jscozmo/jsQR)');
else fail('jsqr license header present', decHeader.slice(0, 80));

console.log('\n[C.5] Output inline scripts carry data-cfasync="false" (Rocket Loader)');
// Cloudflare Rocket Loader defers and retypes inline scripts it picks up; when the
// file's CSP then blocks Rocket Loader's own loader, those deferred scripts never
// run and the decryptor (and its "Share this file" QR) stays dead. Every output
// inline <script> must therefore opt out so Rocket Loader leaves it alone.
const cfasync = (builderHtml.match(/<script data-cfasync="false">/g) || []).length;
if (cfasync >= 3) pass('all output inline scripts declare data-cfasync="false" (' + cfasync + ' found)');
else fail('all output inline scripts declare data-cfasync="false"', 'found ' + cfasync + ' of 3');

console.log('\n[D] Runtime share UI (DOM stub: hosted vs file://)');
// Extract the generated fiel decayptor body (OUTPUT_JS) and boot it under a
// minimal DOM stub to confirm: served over http(s) the toggle reveals a QR
// SVG; opened from disk it stays hidden.
function makeEl(id) {
  const el = { id, hidden: true, value: '', className: '', disabled: false,
    textContent: '', innerHTML: '', children: [], _handlers: {},
    addEventListener(n, fn) { this._handlers[n] = fn; }, setAttribute(k, v) { this[k] = v; },
    appendChild(c) { this.children.push(c); }, focus() {}, click() {} };
  return el;
}
function bootDecryptor(href) {
  const s = fs.readFileSync(path.join(ROOT, 'builder', 'index.html'), 'utf8');
  const start = s.indexOf('var OUTPUT_JS = [');
  const join = s.indexOf('].join', start);
  const arrText = s.slice(start + 'var OUTPUT_JS = ['.length, join).replace(/,\s*([,\]])/g, '$1');
  const outjs = new Function('return [' + arrText + ']')().join('\n');
  const els = {};
  global.document = { getElementById(id) { return els[id] || (els[id] = makeEl(id)); }, createElement() { return makeEl('a'); } };
  global.location = { protocol: /^https:/.test(href) ? 'https:' : 'file:', href };
  global.atob = (s2) => Buffer.from(s2, 'base64').toString('binary');
  global.window = global;
  global.qrcode = qrcode;
  const config = JSON.stringify({ payload: { v: 4, recipients: [], iv: '', ct: '', sign: null } }).replace(/</g, '\\u003c');
  new Function(outjs.replace('__CONFIG__', config))();
  return els;
}
{
  const els = bootDecryptor('https://example.com/files/doc.html');
  const toggle = els['shareToggle'], pan = els['sharePan'];
  const okRevealed = els['share'].hidden === false;
  toggle._handlers.click();
  const qr = els['shareQr'];
  const okSvg = qr && qr.innerHTML.indexOf('<svg') === 0 && qr.innerHTML.indexOf('</svg>') > -1;
  const okOpened = pan.hidden === false;
  if (okRevealed && okSvg && okOpened) pass('hosted: toggle reveals a QR SVG and opens the panel');
  else fail('hosted: toggle reveals a QR SVG and opens the panel', JSON.stringify({ okRevealed, okSvg, okOpened }));
  delete global.document; delete global.location; delete global.atob; delete global.window;
}
{
  const els = bootDecryptor('file:///home/u/doc.html');
  if (els['share'].hidden === true) pass('file:// : share block stays hidden (no shareable URL)');
  else fail('file:// : share block stays hidden (no shareable URL)');
  delete global.document; delete global.location; delete global.atob; delete global.window;
}

console.log('\nDone.');